import { useState } from "react";
import {
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileText,
  DollarSign,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApi } from "@/hooks/use-api";
import { workersApi, WorkLog, WorkerPayment } from "@/lib/api/workers";
import { StatsSkeleton } from "@/components/ui/table-skeleton";
import { ErrorMessage } from "@/components/ui/error-message";

function formatNumber(num: number): string {
  return num.toLocaleString("uz-UZ");
}

function formatMoney(num: number): string {
  return num.toLocaleString("uz-UZ") + " so'm";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface WorkerBalance {
  totalEarned: number;
  totalPaid: number;
  netBalance: number;
}

export default function WorkerPortalPage() {
  const [activeTab, setActiveTab] = useState("work-logs");

  // Fetch work logs for this worker (user-specific)
  const {
    data: workLogsResponse,
    loading: workLogsLoading,
    error: workLogsError,
    refetch: refetchWorkLogs,
  } = useApi(() => workersApi.getMyWorkLogs({ limit: 100 }), []);

  // Fetch payments (user-specific)
  const {
    data: paymentsResponse,
    loading: paymentsLoading,
  } = useApi(() => workersApi.getMyPayments({ limit: 100 }), []);

  const loading = workLogsLoading || paymentsLoading;
  const error = workLogsError;

  const workLogs = workLogsResponse?.data || [];
  const payments = paymentsResponse?.data || [];

  // Calculate balance
  const totalEarned = workLogs
    .filter((log) => log.isValidated)
    .reduce((sum, log) => sum + (log.totalAmount || 0), 0);
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const netBalance = totalEarned - totalPaid;

  // Count by status
  const pendingCount = workLogs.filter((log) => !log.isValidated).length;
  const validatedCount = workLogs.filter((log) => log.isValidated).length;

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Mening ishlarim</h1>
          <p className="text-muted-foreground">Ish hisobotlari va to'lovlar</p>
        </div>
        <ErrorMessage error={error} onRetry={refetchWorkLogs} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Mening ishlarim</h1>
        <p className="text-muted-foreground">Ish hisobotlari va to'lovlar</p>
      </div>

      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Jami ishlangan"
            value={formatMoney(totalEarned)}
            icon={TrendingUp}
            variant="success"
            className="animate-slide-up stagger-1"
          />
          <StatsCard
            title="To'langan"
            value={formatMoney(totalPaid)}
            icon={DollarSign}
            variant="primary"
            className="animate-slide-up stagger-2"
          />
          <StatsCard
            title="Qoldiq balans"
            value={formatMoney(netBalance)}
            icon={Wallet}
            variant={netBalance >= 0 ? "success" : "danger"}
            className="animate-slide-up stagger-3"
          />
          <StatsCard
            title="Tasdiqlangan"
            value={validatedCount}
            subtitle={`/ ${workLogs.length} ta hisobot`}
            icon={CheckCircle}
            variant="default"
            className="animate-slide-up stagger-4"
          />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="work-logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Ish hisobotlari
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1 bg-warning/10 text-warning">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            To'lovlar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="work-logs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Ish hisobotlari
              </CardTitle>
              <CardDescription>Bajarilgan ishlar ro'yxati</CardDescription>
            </CardHeader>
            <CardContent>
              {workLogsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : workLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Hozircha ish hisobotlari yo'q</p>
                  <p className="text-sm mt-1">Prorab tomonidan kiritilgan ishlar bu yerda ko'rsatiladi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workLogs.map((log) => (
                    <WorkLogCard key={log.id} log={log} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Wallet className="h-4 w-4 text-success" />
                To'lovlar tarixi
              </CardTitle>
              <CardDescription>Sizga to'langan summalar</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>To'lovlar tarixi bo'sh</p>
                  <p className="text-sm mt-1">To'lovlar bu yerda ko'rsatiladi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <PaymentCard key={payment.id} payment={payment} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WorkLogCard({ log }: { log: WorkLog }) {
  const getStatusBadge = () => {
    if (log.isValidated) {
      return (
        <Badge variant="secondary" className="bg-success/10 text-success">
          <CheckCircle className="h-3 w-3 mr-1" />
          Tasdiqlangan
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-warning/10 text-warning">
        <Clock className="h-3 w-3 mr-1" />
        Kutilmoqda
      </Badge>
    );
  };

  return (
    <div className="p-4 rounded-lg border bg-card space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{log.workType}</p>
          {log.project && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {log.project.name}
            </p>
          )}
        </div>
        {getStatusBadge()}
      </div>
      <div className="grid grid-cols-3 gap-4 p-3 rounded-lg bg-muted/30">
        <div>
          <p className="text-xs text-muted-foreground">Miqdor</p>
          <p className="font-medium text-sm">
            {formatNumber(log.quantity)} {log.unit}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Narx</p>
          <p className="font-medium text-sm">
            {log.unitPrice ? formatMoney(log.unitPrice) : "-"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Summa</p>
          <p className="font-medium text-sm text-success">
            {log.totalAmount ? formatMoney(log.totalAmount) : "-"}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDate(log.date)}
        </span>
        {log.validatedAt && (
          <span className="flex items-center gap-1 text-success">
            <CheckCircle className="h-3 w-3" />
            Tasdiqlangan: {formatDate(log.validatedAt)}
          </span>
        )}
      </div>
    </div>
  );
}

function PaymentCard({ payment }: { payment: WorkerPayment }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-success/5 border-success/10">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">
          {payment.description || "To'lov"}
        </p>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{formatDate(payment.paymentDate)}</span>
          <Badge variant="outline" className="text-xs">
            {payment.paymentType}
          </Badge>
        </div>
      </div>
      <p className="font-semibold text-success">
        +{formatMoney(payment.amount)}
      </p>
    </div>
  );
}
