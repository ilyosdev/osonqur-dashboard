import { useState } from "react";
import {
  ClipboardList,
  Users,
  Package,
  HandCoins,
  PlusCircle,
  Briefcase,
  CheckCircle,
  Clock,
  DollarSign,
  UserPlus,
  FileText,
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApi, useMutation } from "@/hooks/use-api";
import { useAuth } from "@/lib/auth";
import { workersApi, WorkLog, Worker } from "@/lib/api/workers";
import { requestsApi, PurchaseRequest } from "@/lib/api/requests";
import { cashRequestsApi, CashRequest } from "@/lib/api/finance";
import { projectsApi } from "@/lib/api/projects";
import { smetaItemsApi, SmetaItem } from "@/lib/api/smeta-items";
import { StatsSkeleton } from "@/components/ui/table-skeleton";
import { ErrorMessage } from "@/components/ui/error-message";

function formatMoney(num: number): string {
  return num.toLocaleString("uz-UZ");
}

type ActiveView = "worklogs" | "workers" | "requests" | "cash";

export default function ForemanPage() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<ActiveView>("worklogs");

  // Dialog states
  const [workLogDialogOpen, setWorkLogDialogOpen] = useState(false);
  const [addWorkerDialogOpen, setAddWorkerDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [materialRequestDialogOpen, setMaterialRequestDialogOpen] = useState(false);
  const [cashRequestDialogOpen, setCashRequestDialogOpen] = useState(false);

  // Date filter for work logs
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Work logs
  const {
    data: workLogsData,
    loading: workLogsLoading,
    error: workLogsError,
    refetch: refetchWorkLogs,
  } = useApi(() => workersApi.getWorkLogs({
    limit: 50,
    ...(dateFrom && { startDate: dateFrom }),
    ...(dateTo && { endDate: dateTo }),
  }), [dateFrom, dateTo]);

  // Workers
  const {
    data: workersData,
    loading: workersLoading,
    refetch: refetchWorkers,
  } = useApi(() => workersApi.getAll({ limit: 100 }), []);

  // My requests
  const {
    data: requestsData,
    loading: requestsLoading,
    refetch: refetchRequests,
  } = useApi(() => requestsApi.getAll({ limit: 50 }), []);

  // Cash requests
  const {
    data: cashRequestsData,
    loading: cashRequestsLoading,
    refetch: refetchCashRequests,
  } = useApi(() => cashRequestsApi.getAll({ limit: 50 }), []);

  const workLogs = workLogsData?.data || [];
  const workers = workersData?.data || [];
  const requests = requestsData?.data || [];
  const cashRequests = cashRequestsData?.data || [];

  // Stats
  const totalWorkLogs = workLogsData?.total || 0;
  const validatedWorkLogs = workLogs.filter(w => w.isValidated).length;
  const pendingRequests = requests.filter(r => r.status === "PENDING").length;
  const pendingCashRequests = cashRequests.filter(r => r.status === "PENDING").length;

  if (workLogsError) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Prorab</h1>
          <p className="text-muted-foreground">Ish boshqaruvi</p>
        </div>
        <ErrorMessage error={workLogsError} onRetry={refetchWorkLogs} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Prorab</h1>
        <p className="text-muted-foreground">
          Xush kelibsiz, {user?.name || "Prorab"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Ish jurnallari"
          value={totalWorkLogs}
          subtitle={`${validatedWorkLogs} tasdiqlangan`}
          icon={ClipboardList}
          variant="primary"
          className="animate-slide-up stagger-1"
        />
        <StatsCard
          title="Ishchilar"
          value={workers.length}
          subtitle="ta ro'yxatda"
          icon={Users}
          variant="success"
          className="animate-slide-up stagger-2"
        />
        <StatsCard
          title="Material so'rovlari"
          value={pendingRequests}
          subtitle="ta kutilmoqda"
          icon={Package}
          variant="warning"
          className="animate-slide-up stagger-3"
        />
        <StatsCard
          title="Pul so'rovlari"
          value={pendingCashRequests}
          subtitle="ta kutilmoqda"
          icon={HandCoins}
          variant="default"
          className="animate-slide-up stagger-4"
        />
      </div>

      {/* Action buttons */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
        <ActionButton
          icon={ClipboardList}
          label="Ish jurnali"
          active={activeView === "worklogs"}
          onClick={() => setActiveView("worklogs")}
        />
        <ActionButton
          icon={PlusCircle}
          label="Ish qo'shish"
          onClick={() => setWorkLogDialogOpen(true)}
        />
        <ActionButton
          icon={Users}
          label="Ishchilar"
          active={activeView === "workers"}
          onClick={() => setActiveView("workers")}
        />
        <ActionButton
          icon={UserPlus}
          label="Ishchi qo'shish"
          onClick={() => setAddWorkerDialogOpen(true)}
        />
        <ActionButton
          icon={Package}
          label="Zayavkalar"
          active={activeView === "requests"}
          onClick={() => setActiveView("requests")}
        />
        <ActionButton
          icon={FileText}
          label="Zayavka qo'shish"
          onClick={() => setMaterialRequestDialogOpen(true)}
        />
        <ActionButton
          icon={HandCoins}
          label="Pul so'rovlari"
          active={activeView === "cash"}
          onClick={() => setActiveView("cash")}
        />
        <ActionButton
          icon={DollarSign}
          label="Pul so'rash"
          onClick={() => setCashRequestDialogOpen(true)}
        />
      </div>

      {/* Date filters for work logs */}
      {activeView === "worklogs" && (
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
                onClick={() => { setDateFrom(""); setDateTo(""); }}
              >
                Tozalash
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content sections */}
      {activeView === "worklogs" && (
        <WorkLogsSection
          workLogs={workLogs}
          loading={workLogsLoading}
        />
      )}
      {activeView === "workers" && (
        <WorkersSection
          workers={workers}
          loading={workersLoading}
          onPayment={() => setPaymentDialogOpen(true)}
        />
      )}
      {activeView === "requests" && (
        <MaterialRequestsSection
          requests={requests}
          loading={requestsLoading}
        />
      )}
      {activeView === "cash" && (
        <CashRequestsSection
          requests={cashRequests}
          loading={cashRequestsLoading}
        />
      )}

      {/* Dialogs */}
      <AddWorkLogDialog
        open={workLogDialogOpen}
        onOpenChange={setWorkLogDialogOpen}
        workers={workers}
        onSuccess={() => {
          setWorkLogDialogOpen(false);
          refetchWorkLogs();
        }}
      />

      <AddWorkerDialog
        open={addWorkerDialogOpen}
        onOpenChange={setAddWorkerDialogOpen}
        onSuccess={() => {
          setAddWorkerDialogOpen(false);
          refetchWorkers();
        }}
      />

      <WorkerPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        workers={workers}
        onSuccess={() => {
          setPaymentDialogOpen(false);
          refetchWorkers();
        }}
      />

      <MaterialRequestDialog
        open={materialRequestDialogOpen}
        onOpenChange={setMaterialRequestDialogOpen}
        onSuccess={() => {
          setMaterialRequestDialogOpen(false);
          refetchRequests();
        }}
      />

      <CashRequestDialog
        open={cashRequestDialogOpen}
        onOpenChange={setCashRequestDialogOpen}
        onSuccess={() => {
          setCashRequestDialogOpen(false);
          refetchCashRequests();
        }}
      />
    </div>
  );
}

// --- Sub-components ---

function ActionButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      className="h-auto py-3 flex flex-col gap-1.5 items-center"
      onClick={onClick}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs">{label}</span>
    </Button>
  );
}

function WorkLogsSection({
  workLogs,
  loading,
}: {
  workLogs: WorkLog[];
  loading: boolean;
}) {
  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          Ish jurnallari
        </CardTitle>
        <CardDescription>Bajarilgan ishlar ro'yxati</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : workLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Hozircha ish jurnali yo'q</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workLogs.map((log) => (
              <div
                key={log.id}
                className={`p-4 rounded-lg border ${
                  log.isValidated
                    ? "bg-success/5 border-success/20"
                    : "bg-warning/5 border-warning/20"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{log.workType}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {log.worker?.name || "Noma'lum"} • {log.quantity} {log.unit}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.date).toLocaleDateString("uz-UZ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={log.isValidated ? "default" : "secondary"}
                      className={log.isValidated ? "bg-success text-white" : ""}
                    >
                      {log.isValidated ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Tasdiqlangan
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          Kutilmoqda
                        </>
                      )}
                    </Badge>
                    {log.totalAmount && (
                      <p className="text-sm font-semibold mt-2">
                        {formatMoney(log.totalAmount)} so'm
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WorkersSection({
  workers,
  loading,
  onPayment,
}: {
  workers: Worker[];
  loading: boolean;
  onPayment: () => void;
}) {
  return (
    <Card className="animate-slide-up">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Ishchilar
          </CardTitle>
          <CardDescription>Ro'yxatdagi ishchilar</CardDescription>
        </div>
        <Button size="sm" onClick={onPayment}>
          <DollarSign className="h-4 w-4 mr-1" />
          To'lov
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : workers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Hozircha ishchi yo'q</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ism</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Mutaxassislik</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.map((worker) => (
                  <TableRow key={worker.id}>
                    <TableCell className="font-medium">
                      {worker.firstName} {worker.lastName}
                    </TableCell>
                    <TableCell>{worker.phone || "-"}</TableCell>
                    <TableCell>{worker.position || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MaterialRequestsSection({
  requests,
  loading,
}: {
  requests: PurchaseRequest[];
  loading: boolean;
}) {
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PENDING: { label: "Kutilmoqda", className: "bg-warning/10 text-warning" },
      APPROVED: { label: "Tasdiqlangan", className: "bg-success/10 text-success" },
      REJECTED: { label: "Rad etilgan", className: "bg-destructive/10 text-destructive" },
      FINALIZED: { label: "Tugallangan", className: "bg-primary/10 text-primary" },
    };
    const config = statusMap[status] || statusMap.PENDING;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          Material zayavkalari
        </CardTitle>
        <CardDescription>Yuborilgan so'rovlar</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Hozircha zayavka yo'q</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div>
                  <p className="font-medium">{request.smetaItem?.name || "Noma'lum"}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatMoney(request.requestedQty)} {request.smetaItem?.unit || ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(request.createdAt).toLocaleDateString("uz-UZ")}
                  </p>
                </div>
                {getStatusBadge(request.status)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CashRequestsSection({
  requests,
  loading,
}: {
  requests: CashRequest[];
  loading: boolean;
}) {
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PENDING: { label: "Kutilmoqda", className: "bg-warning/10 text-warning" },
      APPROVED: { label: "Tasdiqlangan", className: "bg-success/10 text-success" },
      REJECTED: { label: "Rad etilgan", className: "bg-destructive/10 text-destructive" },
      FINALIZED: { label: "Bajarilgan", className: "bg-primary/10 text-primary" },
    };
    const config = statusMap[status] || statusMap.PENDING;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <HandCoins className="h-4 w-4 text-primary" />
          Pul so'rovlari
        </CardTitle>
        <CardDescription>Yuborilgan pul so'rovlari</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <HandCoins className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Hozircha pul so'rovi yo'q</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div>
                  <p className="text-lg font-bold text-primary">
                    {formatMoney(request.amount)} so'm
                  </p>
                  {request.reason && (
                    <p className="text-sm text-muted-foreground">{request.reason}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(request.createdAt).toLocaleDateString("uz-UZ")}
                  </p>
                </div>
                {getStatusBadge(request.status)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Dialog Components ---

function AddWorkLogDialog({
  open,
  onOpenChange,
  workers,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workers: Worker[];
  onSuccess: () => void;
}) {
  const [workerId, setWorkerId] = useState("");
  const [workType, setWorkType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [projectId, setProjectId] = useState("");

  const { data: projectsData } = useApi(
    () => projectsApi.getAll({ limit: 100 }),
    [],
    { enabled: open }
  );

  const { mutate, loading } = useMutation(
    (data: { workerId: string; projectId: string; date: string; hoursWorked: number; description?: string }) =>
      workersApi.createWorkLog(data)
  );

  const handleSubmit = async () => {
    if (!workerId || !projectId || !quantity || !workType) return;
    try {
      await mutate({
        workerId,
        projectId,
        date,
        hoursWorked: Number(quantity),
        description: `${workType} - ${quantity} ${unit}`,
      });
      setWorkerId("");
      setWorkType("");
      setQuantity("");
      setUnit("");
      setProjectId("");
      onSuccess();
    } catch {
      // error handled by useMutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ish qo'shish</DialogTitle>
          <DialogDescription>
            Yangi bajarilgan ishni yozing
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
            <Label>Ishchi</Label>
            <Select value={workerId} onValueChange={setWorkerId}>
              <SelectTrigger>
                <SelectValue placeholder="Ishchini tanlang" />
              </SelectTrigger>
              <SelectContent>
                {workers.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.firstName} {w.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ish turi</Label>
            <Input
              placeholder="Masalan: Suvoq ishi"
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Miqdori</Label>
              <Input
                type="number"
                min={1}
                placeholder="Miqdor"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>O'lchov birligi</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Birlik" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="m²">m²</SelectItem>
                  <SelectItem value="m³">m³</SelectItem>
                  <SelectItem value="dona">dona</SelectItem>
                  <SelectItem value="p.m">p.m</SelectItem>
                  <SelectItem value="soat">soat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Sana</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !workerId || !projectId || !workType || !quantity}
          >
            {loading ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddWorkerDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");

  const { mutate, loading } = useMutation(
    (data: { firstName: string; lastName: string; phone?: string; position?: string }) =>
      workersApi.create(data)
  );

  const handleSubmit = async () => {
    if (!firstName || !lastName) return;
    try {
      await mutate({
        firstName,
        lastName,
        phone: phone || undefined,
        position: position || undefined,
      });
      setFirstName("");
      setLastName("");
      setPhone("");
      setPosition("");
      onSuccess();
    } catch {
      // error handled by useMutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ishchi qo'shish</DialogTitle>
          <DialogDescription>
            Yangi ishchi ma'lumotlarini kiriting
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ism *</Label>
              <Input
                placeholder="Ism"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Familiya *</Label>
              <Input
                placeholder="Familiya"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Telefon</Label>
            <Input
              placeholder="+998 90 123 45 67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Mutaxassislik</Label>
            <Input
              placeholder="Masalan: Suvokchi"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !firstName || !lastName}
          >
            {loading ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WorkerPaymentDialog({
  open,
  onOpenChange,
  workers,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workers: Worker[];
  onSuccess: () => void;
}) {
  const [workerId, setWorkerId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentType, setPaymentType] = useState("CASH");

  const { mutate, loading } = useMutation(
    (data: { workerId: string; amount: number; paymentDate: string; paymentType: string; description?: string }) =>
      workersApi.createPayment(data)
  );

  const handleSubmit = async () => {
    if (!workerId || !amount) return;
    try {
      await mutate({
        workerId,
        amount: Number(amount),
        paymentDate: new Date().toISOString().split("T")[0],
        paymentType,
        description: description || undefined,
      });
      setWorkerId("");
      setAmount("");
      setDescription("");
      onSuccess();
    } catch {
      // error handled by useMutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ishchiga to'lov</DialogTitle>
          <DialogDescription>
            Ishchiga to'lov ma'lumotlarini kiriting
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Ishchi</Label>
            <Select value={workerId} onValueChange={setWorkerId}>
              <SelectTrigger>
                <SelectValue placeholder="Ishchini tanlang" />
              </SelectTrigger>
              <SelectContent>
                {workers.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.firstName} {w.lastName}
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
            <Label>To'lov turi</Label>
            <Select value={paymentType} onValueChange={setPaymentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Naqd</SelectItem>
                <SelectItem value="CARD">Karta</SelectItem>
                <SelectItem value="TRANSFER">O'tkazma</SelectItem>
              </SelectContent>
            </Select>
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
            disabled={loading || !workerId || !amount}
          >
            {loading ? "Saqlanmoqda..." : "To'lash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MaterialRequestDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [smetaItemId, setSmetaItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [projectId, setProjectId] = useState("");

  const { data: projectsData } = useApi(
    () => projectsApi.getAll({ limit: 100 }),
    [],
    { enabled: open }
  );

  const { data: smetaItemsData } = useApi(
    () => smetaItemsApi.getAll({ limit: 200, itemType: "MATERIAL" }),
    [],
    { enabled: open }
  );

  const { mutate, loading } = useMutation(
    (data: { smetaItemId: string; requestedQty: number; requestedAmount: number; note?: string }) =>
      requestsApi.create(data)
  );

  const selectedItem = smetaItemsData?.data?.find(i => i.id === smetaItemId);

  const handleSubmit = async () => {
    if (!smetaItemId || !quantity) return;
    const item = smetaItemsData?.data?.find(i => i.id === smetaItemId);
    if (!item) return;

    try {
      await mutate({
        smetaItemId,
        requestedQty: Number(quantity),
        requestedAmount: Number(quantity) * item.unitPrice,
        note: note || undefined,
      });
      setSmetaItemId("");
      setQuantity("");
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
          <DialogTitle>Material so'rovi</DialogTitle>
          <DialogDescription>
            Kerakli materialni so'rang
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Material</Label>
            <Select value={smetaItemId} onValueChange={setSmetaItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Materialni tanlang" />
              </SelectTrigger>
              <SelectContent>
                {(smetaItemsData?.data ?? []).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name} ({item.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Miqdori {selectedItem ? `(${selectedItem.unit})` : ""}</Label>
            <Input
              type="number"
              min={1}
              placeholder="Miqdorni kiriting"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          {selectedItem && quantity && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Taxminiy summa:</p>
              <p className="text-lg font-bold text-primary">
                {formatMoney(Number(quantity) * selectedItem.unitPrice)} so'm
              </p>
            </div>
          )}
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
            disabled={loading || !smetaItemId || !quantity}
          >
            {loading ? "Yuborilmoqda..." : "Yuborish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CashRequestDialog({
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

  const { mutate, loading } = useMutation(
    (data: { projectId: string; amount: number; reason?: string }) =>
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
      // error handled by useMutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pul so'rash</DialogTitle>
          <DialogDescription>
            Yangi pul so'rovini yarating
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
              placeholder="Nima uchun kerak..."
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
