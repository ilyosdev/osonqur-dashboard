import { useState } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  History,
  HandCoins,
  PlusCircle,
  Eye,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  User,
  DollarSign,
  ArrowDownCircle,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApi, useMutation } from "@/hooks/use-api";
import { useAuth, hasRole } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import {
  cashRegistersApi,
  cashRequestsApi,
  CashTransaction,
  CashRegisterDetailed,
  incomesApi,
} from "@/lib/api/finance";
import { projectsApi } from "@/lib/api/projects";
import { PaginatedResponse } from "@/lib/api/client";
import { StatsSkeleton } from "@/components/ui/table-skeleton";
import { ErrorMessage } from "@/components/ui/error-message";

function formatMoney(num: number): string {
  return num.toLocaleString("uz-UZ");
}

type ActiveView = "balance" | "history" | "expenses" | "requests" | "incomes" | "employees";

export default function KassaPage() {
  const { user } = useAuth();
  const role = user?.role;
  const isReadOnly = role === "BOSS";
  const canRequestMoney = role !== "BUGALTERIYA" && !isReadOnly;
  const isBugalteriya = hasRole(role, ["BUGALTERIYA", "DIREKTOR", "BOSS"]);

  const [activeView, setActiveView] = useState<ActiveView>("balance");
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [fillBalanceDialogOpen, setFillBalanceDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Date filter state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Koshelok data
  const {
    data: koshelok,
    loading: koshelokLoading,
    error: koshelokError,
    refetch: refetchKoshelok,
  } = useApi(() => cashRegistersApi.getMyKoshelok(), []);

  // Transaction history (IN type)
  const {
    data: historyData,
    loading: historyLoading,
    refetch: refetchHistory,
  } = useApi(
    () =>
      koshelok
        ? cashRegistersApi.getTransactions(koshelok.id, {
            type: "IN",
            limit: 50,
            ...(dateFrom && { dateFrom }),
            ...(dateTo && { dateTo }),
          })
        : Promise.resolve({ data: [], total: 0, page: 1, limit: 50, totalPages: 0 } as PaginatedResponse<CashTransaction>),
    [koshelok?.id, dateFrom, dateTo],
    { enabled: activeView === "history" && !!koshelok }
  );

  // Expenses (OUT type)
  const {
    data: expensesData,
    loading: expensesLoading,
    refetch: refetchExpenses,
  } = useApi(
    () =>
      koshelok
        ? cashRegistersApi.getTransactions(koshelok.id, {
            type: "OUT",
            limit: 50,
            ...(dateFrom && { dateFrom }),
            ...(dateTo && { dateTo }),
          })
        : Promise.resolve({ data: [], total: 0, page: 1, limit: 50, totalPages: 0 } as PaginatedResponse<CashTransaction>),
    [koshelok?.id, dateFrom, dateTo],
    { enabled: activeView === "expenses" && !!koshelok }
  );

  // Incomes list (for BUGALTERIYA)
  const {
    data: incomesData,
    loading: incomesLoading,
    refetch: refetchIncomes,
  } = useApi(
    () => incomesApi.getAll({ limit: 50 }),
    [],
    { enabled: isBugalteriya && activeView === "incomes" }
  );

  // Cash requests (for BUGALTERIYA)
  const {
    data: cashRequestsData,
    loading: cashRequestsLoading,
    refetch: refetchCashRequests,
  } = useApi(
    () => cashRequestsApi.getAll({ status: "PENDING", limit: 50 }),
    [],
    { enabled: isBugalteriya && activeView === "requests" }
  );

  // All employee kosheloks (for BUGALTERIYA)
  const {
    data: allKosheloksData,
    loading: allKosheloksLoading,
    refetch: refetchAllKosheloks,
  } = useApi(
    () => cashRegistersApi.getAll({ limit: 100 }),
    [],
    { enabled: isBugalteriya }
  );

  const allKosheloks = allKosheloksData?.data || [];

  // Fill employee balance state
  const [fillEmployeeDialogOpen, setFillEmployeeDialogOpen] = useState(false);
  const [selectedEmployeeCashRegisterId, setSelectedEmployeeCashRegisterId] = useState<string | null>(null);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("");

  // Mutations for approve/reject
  const { mutate: approveCashRequest, loading: approvingId } = useMutation(
    (id: string) => cashRequestsApi.approve(id)
  );

  const { mutate: rejectCashRequest, loading: rejectingId } = useMutation(
    ({ id, reason }: { id: string; reason: string }) =>
      cashRequestsApi.reject(id, { rejectionReason: reason })
  );

  const pendingCashRequests = cashRequestsData?.data || [];
  const incomesList = incomesData?.data || [];

  const handleApprove = async (id: string) => {
    try {
      await approveCashRequest(id);
      refetchCashRequests();
    } catch {
      // Error handled by mutation
    }
  };

  const handleReject = async () => {
    if (!rejectDialogOpen || !rejectReason.trim()) return;
    try {
      await rejectCashRequest({ id: rejectDialogOpen, reason: rejectReason });
      setRejectDialogOpen(null);
      setRejectReason("");
      refetchCashRequests();
    } catch {
      // Error handled by mutation
    }
  };

  if (koshelokError) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Kassa</h1>
          <p className="text-muted-foreground">Shaxsiy koshelok boshqaruvi</p>
        </div>
        <ErrorMessage error={koshelokError} onRetry={refetchKoshelok} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Kassa</h1>
        <p className="text-muted-foreground">Shaxsiy koshelok boshqaruvi</p>
      </div>

      {/* Balance cards */}
      {koshelokLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatsCard
            title="Balans"
            value={`${formatMoney(koshelok?.balance ?? 0)} so'm`}
            icon={Wallet}
            variant="primary"
            className="animate-slide-up stagger-1"
          />
          <StatsCard
            title="Jami kirim"
            value={`${formatMoney(koshelok?.totalIn ?? 0)} so'm`}
            icon={TrendingUp}
            variant="success"
            className="animate-slide-up stagger-2"
          />
          <StatsCard
            title="Jami chiqim"
            value={`${formatMoney(koshelok?.totalOut ?? 0)} so'm`}
            icon={TrendingDown}
            variant="danger"
            className="animate-slide-up stagger-3"
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-8">
        <ActionButton
          icon={Wallet}
          label="Balans"
          active={activeView === "balance"}
          onClick={() => setActiveView("balance")}
        />
        <ActionButton
          icon={History}
          label="Koshelok tarixi"
          active={activeView === "history"}
          onClick={() => setActiveView("history")}
        />
        {canRequestMoney && (
          <ActionButton
            icon={HandCoins}
            label="Pul so'rash"
            onClick={() => setRequestDialogOpen(true)}
          />
        )}
        <ActionButton
          icon={Eye}
          label="Rasxod ko'rish"
          active={activeView === "expenses"}
          onClick={() => setActiveView("expenses")}
        />
        <ActionButton
          icon={PlusCircle}
          label="Rasxod qo'shish"
          onClick={() => setExpenseDialogOpen(true)}
        />
        {isBugalteriya && (
          <>
            <ActionButton
              icon={ArrowDownCircle}
              label="Kirim qo'shish"
              onClick={() => setIncomeDialogOpen(true)}
            />
            <ActionButton
              icon={DollarSign}
              label="Balans to'ldirish"
              onClick={() => setFillBalanceDialogOpen(true)}
            />
            <ActionButton
              icon={Users}
              label="Xodimlar koshelogi"
              active={activeView === "employees"}
              onClick={() => setActiveView("employees")}
            />
            <ActionButton
              icon={HandCoins}
              label="Pul so'rovlari"
              active={activeView === "requests"}
              onClick={() => setActiveView("requests")}
              badge={pendingCashRequests.length > 0 ? pendingCashRequests.length : undefined}
            />
          </>
        )}
      </div>

      {/* Date filters for history/expenses */}
      {(activeView === "history" || activeView === "expenses" || activeView === "incomes") && (
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Boshlanish</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tugash</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Tozalash
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content area */}
      {activeView === "balance" && koshelok && (
        <BalanceView koshelok={koshelok} />
      )}
      {activeView === "history" && (
        <TransactionList
          title="Koshelok tarixi"
          subtitle="Kirim operatsiyalari"
          transactions={historyData?.data ?? []}
          loading={historyLoading}
          type="IN"
        />
      )}
      {activeView === "expenses" && (
        <TransactionList
          title="Rasxodlar"
          subtitle="Chiqim operatsiyalari"
          transactions={expensesData?.data ?? []}
          loading={expensesLoading}
          type="OUT"
        />
      )}
      {activeView === "incomes" && isBugalteriya && (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              Kirimlar
            </CardTitle>
            <CardDescription>Barcha kirim yozuvlari</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {incomesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : incomesList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Hozircha kirim yo'q</p>
              </div>
            ) : (
              incomesList.map((income) => (
                <div
                  key={income.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-success/5 border-success/10"
                >
                  <div>
                    <p className="font-medium text-sm">{income.category || "Kirim"}</p>
                    <p className="text-xs text-muted-foreground">
                      {income.description} • {new Date(income.date).toLocaleDateString("uz-UZ")}
                    </p>
                  </div>
                  <p className="font-semibold text-success">
                    +{formatMoney(income.amount)} so'm
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
      {activeView === "requests" && isBugalteriya && (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-warning" />
              Pul so'rovlari
            </CardTitle>
            <CardDescription>Xodimlardan kelgan so'rovlar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {cashRequestsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : pendingCashRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50 text-success" />
                <p>Hozircha pul so'rovlari yo'q</p>
                <p className="text-sm mt-1">Barcha so'rovlar ko'rib chiqilgan</p>
              </div>
            ) : (
              pendingCashRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 rounded-lg border bg-card space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{request.requestedBy?.name || "Noma'lum"}</p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {request.project?.name || "Loyiha"}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-warning/10 text-warning shrink-0">
                      <Clock className="h-3 w-3 mr-1" />
                      Kutilmoqda
                    </Badge>
                  </div>
                  <div className="p-3 rounded bg-muted/30">
                    <p className="text-2xl font-bold text-primary">
                      {formatMoney(request.amount)} so'm
                    </p>
                    {request.reason && (
                      <p className="text-sm text-muted-foreground mt-1">{request.reason}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(request.createdAt).toLocaleString("uz-UZ")}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setRejectDialogOpen(request.id)}
                        disabled={!!approvingId || !!rejectingId}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rad etish
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(request.id)}
                        disabled={!!approvingId || !!rejectingId}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Tasdiqlash
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Employee kosheloks view */}
      {activeView === "employees" && isBugalteriya && (
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Xodimlar koshelogi
            </CardTitle>
            <CardDescription>Barcha xodimlarning kosheloklari</CardDescription>
          </CardHeader>
          <CardContent>
            {allKosheloksLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : allKosheloks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Hozircha xodim koshelogi yo'q</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {allKosheloks.map((k) => (
                  <div key={k.id} className="p-4 rounded-lg border bg-card space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{k.user?.name || k.name}</p>
                      </div>
                      {k.user?.role && (
                        <Badge variant="secondary" className="text-xs">
                          {k.user.role}
                        </Badge>
                      )}
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {formatMoney(k.balance)} so'm
                      </p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-green-600">
                          +{formatMoney(k.totalIn || 0)}
                        </span>
                        <span className="text-xs text-red-600">
                          -{formatMoney(k.totalOut || 0)}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSelectedEmployeeCashRegisterId(k.id);
                        setSelectedEmployeeName(k.user?.name || k.name);
                        setFillEmployeeDialogOpen(true);
                      }}
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Balans to'ldirish
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reject request dialog */}
      <Dialog open={!!rejectDialogOpen} onOpenChange={() => setRejectDialogOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>So'rovni rad etish</DialogTitle>
            <DialogDescription>
              Rad etish sababini kiriting
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Sabab *</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nima uchun rad etilayotganini yozing..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(null)}>
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!!rejectingId || !rejectReason.trim()}
            >
              <XCircle className="h-4 w-4 mr-1" />
              {rejectingId ? "Saqlanmoqda..." : "Rad etish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request money dialog */}
      {canRequestMoney && (
        <RequestMoneyDialog
          open={requestDialogOpen}
          onOpenChange={setRequestDialogOpen}
          onSuccess={() => {
            setRequestDialogOpen(false);
          }}
        />
      )}

      {/* Add expense dialog */}
      <AddExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        koshelokId={koshelok?.id}
        onSuccess={() => {
          setExpenseDialogOpen(false);
          refetchKoshelok();
          if (activeView === "expenses") refetchExpenses();
        }}
      />

      {/* Add income dialog (for BUGALTERIYA) */}
      {isBugalteriya && (
        <AddIncomeDialog
          open={incomeDialogOpen}
          onOpenChange={setIncomeDialogOpen}
          onSuccess={() => {
            setIncomeDialogOpen(false);
            if (activeView === "incomes") refetchIncomes();
          }}
        />
      )}

      {/* Fill balance dialog (for BUGALTERIYA - own koshelok) */}
      {isBugalteriya && (
        <FillBalanceDialog
          open={fillBalanceDialogOpen}
          onOpenChange={setFillBalanceDialogOpen}
          koshelokId={koshelok?.id}
          onSuccess={() => {
            setFillBalanceDialogOpen(false);
            refetchKoshelok();
            if (activeView === "history") refetchHistory();
          }}
        />
      )}

      {/* Fill employee balance dialog (for BUGALTERIYA) */}
      {isBugalteriya && (
        <FillBalanceDialog
          open={fillEmployeeDialogOpen}
          onOpenChange={(open) => {
            setFillEmployeeDialogOpen(open);
            if (!open) {
              setSelectedEmployeeCashRegisterId(null);
              setSelectedEmployeeName("");
            }
          }}
          koshelokId={selectedEmployeeCashRegisterId || undefined}
          employeeName={selectedEmployeeName}
          onSuccess={() => {
            setFillEmployeeDialogOpen(false);
            setSelectedEmployeeCashRegisterId(null);
            setSelectedEmployeeName("");
            refetchAllKosheloks();
          }}
        />
      )}
    </div>
  );
}

// --- Sub-components ---

function ActionButton({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      className="h-auto py-3 flex flex-col gap-1.5 items-center relative"
      onClick={onClick}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs">{label}</span>
      {badge !== undefined && badge > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-xs"
        >
          {badge}
        </Badge>
      )}
    </Button>
  );
}

function BalanceView({ koshelok }: { koshelok: CashRegisterDetailed }) {
  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          Koshelok ma'lumotlari
        </CardTitle>
        <CardDescription>Shaxsiy kassa holati</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground mb-1">Nomi</p>
            <p className="font-medium">{koshelok.name}</p>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground mb-1">Joriy balans</p>
            <p className="text-2xl font-bold text-primary">
              {formatMoney(koshelok.balance)} so'm
            </p>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground mb-1">Jami kirim</p>
            <p className="text-lg font-semibold text-green-600">
              +{formatMoney(koshelok.totalIn)} so'm
            </p>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground mb-1">Jami chiqim</p>
            <p className="text-lg font-semibold text-red-600">
              -{formatMoney(koshelok.totalOut)} so'm
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionList({
  title,
  subtitle,
  transactions,
  loading,
  type,
}: {
  title: string;
  subtitle: string;
  transactions: CashTransaction[];
  loading: boolean;
  type: "IN" | "OUT";
}) {
  const isIn = type === "IN";

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          {isIn ? (
            <TrendingUp className="h-4 w-4 text-success" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
          {title}
        </CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-muted/50 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : transactions.length > 0 ? (
          transactions.map((t) => (
            <div
              key={t.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                isIn
                  ? "bg-success/5 border-success/10"
                  : "bg-destructive/5 border-destructive/10"
              }`}
            >
              <div>
                <p className="font-medium text-sm">
                  {t.note || (isIn ? "Kirim" : "Chiqim")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(t.createdAt).toLocaleString("uz-UZ")}
                </p>
              </div>
              <p
                className={`font-semibold ${
                  isIn ? "text-success" : "text-destructive"
                }`}
              >
                {isIn ? "+" : "-"}
                {formatMoney(t.amount)} so'm
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Hozircha ma'lumot yo'q
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RequestMoneyDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [projectId, setProjectId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const { data: projectsData } = useApi(
    () => projectsApi.getAll({ limit: 100 }),
    [],
    { enabled: open }
  );

  const { mutate, loading } = useMutation((data: { projectId: string; amount: number; reason?: string }) =>
    cashRequestsApi.create(data)
  );

  const handleSubmit = async () => {
    if (!projectId || !amount) return;
    try {
      await mutate({
        projectId,
        amount: Number(amount),
        reason: reason || undefined,
      });
      setProjectId("");
      setAmount("");
      setReason("");
      onSuccess();
    } catch {
      // error is handled by useMutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pul so'rash</DialogTitle>
          <DialogDescription>
            Yangi pul so'rovi yarating
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Loyiha</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Loyihani tanlang" />
              </SelectTrigger>
              <SelectContent>
                {(projectsData?.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Summa (so'm)</Label>
            <Input
              type="number"
              min={1}
              placeholder="Summani kiriting"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Sabab</Label>
            <Textarea
              placeholder="Sabab (ixtiyoriy)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !projectId || !amount}
          >
            {loading ? "Yuborilmoqda..." : "Yuborish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddExpenseDialog({
  open,
  onOpenChange,
  koshelokId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  koshelokId?: string;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const { mutate, loading } = useMutation(
    (data: { cashRegisterId: string; type: "OUT"; amount: number; note?: string }) =>
      cashRegistersApi.createTransaction(data)
  );

  const handleSubmit = async () => {
    if (!koshelokId || !amount) return;
    try {
      await mutate({
        cashRegisterId: koshelokId,
        type: "OUT",
        amount: Number(amount),
        note: note || undefined,
      });
      setAmount("");
      setNote("");
      onSuccess();
    } catch {
      // error handled by useMutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rasxod qo'shish</DialogTitle>
          <DialogDescription>
            Yangi chiqim operatsiyasini kiriting
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Summa (so'm)</Label>
            <Input
              type="number"
              min={1}
              placeholder="Summani kiriting"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Izoh</Label>
            <Textarea
              placeholder="Izoh (ixtiyoriy)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !amount || !koshelokId}
          >
            {loading ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddIncomeDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState("");

  const { data: accountsData } = useApi(
    () => import("@/lib/api/finance").then(m => m.accountsApi.getAll({ limit: 100 })),
    [],
    { enabled: open }
  );

  const { mutate, loading } = useMutation(
    (data: { accountId: string; amount: number; date: string; category: string; description?: string }) =>
      incomesApi.create(data)
  );

  const handleSubmit = async () => {
    if (!amount || !accountId || !category) return;
    try {
      await mutate({
        accountId,
        amount: Number(amount),
        date: new Date().toISOString().split("T")[0],
        category,
        description: description || undefined,
      });
      setAmount("");
      setCategory("");
      setDescription("");
      setAccountId("");
      onSuccess();
    } catch {
      // error handled by useMutation
    }
  };

  const incomeCategories = [
    "Loyiha to'lovi",
    "Avans",
    "Qarz qaytarish",
    "Boshqa",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kirim qo'shish</DialogTitle>
          <DialogDescription>
            Yangi kirim operatsiyasini kiriting
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Hisob</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Hisobni tanlang" />
              </SelectTrigger>
              <SelectContent>
                {(accountsData?.data ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Kategoriya</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Kategoriyani tanlang" />
              </SelectTrigger>
              <SelectContent>
                {incomeCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Summa (so'm)</Label>
            <Input
              type="number"
              min={1}
              placeholder="Summani kiriting"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Izoh</Label>
            <Textarea
              placeholder="Izoh (ixtiyoriy)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !amount || !accountId || !category}
          >
            {loading ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FillBalanceDialog({
  open,
  onOpenChange,
  koshelokId,
  employeeName,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  koshelokId?: string;
  employeeName?: string;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const { mutate, loading } = useMutation(
    (data: { cashRegisterId: string; type: "IN"; amount: number; note?: string }) =>
      cashRegistersApi.createTransaction(data)
  );

  const handleSubmit = async () => {
    if (!koshelokId || !amount) return;
    try {
      await mutate({
        cashRegisterId: koshelokId,
        type: "IN",
        amount: Number(amount),
        note: note || "Balans to'ldirish",
      });
      setAmount("");
      setNote("");
      onSuccess();
    } catch {
      // error handled by useMutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Balans to'ldirish</DialogTitle>
          <DialogDescription>
            {employeeName ? `${employeeName} koshelogini to'ldiring` : "Koshelok balansini to'ldiring"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Summa (so'm)</Label>
            <Input
              type="number"
              min={1}
              placeholder="Summani kiriting"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Izoh</Label>
            <Textarea
              placeholder="Izoh (ixtiyoriy)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !amount || !koshelokId}
          >
            {loading ? "Saqlanmoqda..." : "To'ldirish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
