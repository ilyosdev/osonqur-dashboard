import { useState, useEffect } from "react";
import {
  Package,
  Users,
  CreditCard,
  ClipboardCheck,
  Building2,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Truck,
  ChevronLeft,
  ChevronRight,
  Eye,
  FolderOpen,
  Search,
  RefreshCw,
  Loader2,
  PencilLine,
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
import { TablePagination } from "@/components/shared/table-pagination";
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
import { requestsApi, PurchaseRequest } from "@/lib/api/requests";
import { suppliersApi, Supplier, SupplierDebt } from "@/lib/api/suppliers";
import { workersApi, WorkLog } from "@/lib/api/workers";
import { analyticsApi } from "@/lib/api/analytics";
import { projectsApi, Project } from "@/lib/api/projects";
import { smetasApi, Smeta } from "@/lib/api/smetas";
import { StatsSkeleton } from "@/components/ui/table-skeleton";
import { ErrorMessage } from "@/components/ui/error-message";
import { useProject } from "@/lib/project-context";

function formatMoney(num: number): string {
  return num.toLocaleString("uz-UZ");
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "short",
  });
}

function formatDateFull(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("uz-UZ");
}

function getWorkLogStatusBadge(log: WorkLog) {
  if (log.isRejected) {
    return (
      <Badge className="rounded-full border border-[#ffd5d5] bg-[#fff0f0] px-[10px] py-1 text-[11px] font-medium text-[#ef4444] shadow-none">
        Rad etilgan
      </Badge>
    );
  }

  if (log.isValidated) {
    return (
      <Badge className="rounded-full border border-[#c8efd8] bg-[#ecfbf1] px-[10px] py-1 text-[11px] font-medium text-[#1d9e75] shadow-none">
        Tasdiqlangan
      </Badge>
    );
  }

  return (
    <Badge className="rounded-full border border-[#f8e6bd] bg-[#fff6df] px-[10px] py-1 text-[11px] font-medium text-[#c88716] shadow-none">
      Kutmoqda
    </Badge>
  );
}

type ActiveView = "requests" | "debts" | "validation" | "suppliers";

const STORAGE_KEY = "direktor_selected_project";

export default function DirektorPage() {
  const { user, hasPermission } = useAuth();
  const { selectedProjectId: globalProjectId, selectProject: globalSelectProject } = useProject();

  const canApproveRequests = hasPermission("request:approve") || hasPermission("request:view_all");
  const canViewDebts = hasPermission("debt:view");
  const canValidate = hasPermission("worklog:validate") || hasPermission("smeta:validate");
  const canViewSuppliers = hasPermission("supplier:view");
  const canViewStats = hasPermission("statistics:view");

  const firstView: ActiveView =
    canApproveRequests ? "requests"
    : canViewDebts ? "debts"
    : canValidate ? "validation"
    : canViewSuppliers ? "suppliers"
    : "requests";

  const [activeView, setActiveView] = useState<ActiveView>(firstView);

  // Project selection state - synced with global context
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() =>
    globalProjectId || localStorage.getItem(STORAGE_KEY) || "all"
  );

  // Sync from global context
  useEffect(() => {
    if (globalProjectId) {
      setSelectedProjectId(globalProjectId);
    }
  }, [globalProjectId]);

  // Persist project selection and sync back to global context
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedProjectId);
    if (selectedProjectId !== "all") {
      globalSelectProject(selectedProjectId);
    }
  }, [selectedProjectId]);

  // Dialog states
  const [addDebtDialogOpen, setAddDebtDialogOpen] = useState(false);
  const [payDebtDialogOpen, setPayDebtDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<SupplierDebt | null>(null);
  const [supplierDebtsDialogOpen, setSupplierDebtsDialogOpen] = useState(false);
  const [selectedSupplierForDebts, setSelectedSupplierForDebts] = useState<{ id: string; name: string } | null>(null);
  const [priceDialog, setPriceDialog] = useState<WorkLog | null>(null);
  const [rejectWorkLogDialog, setRejectWorkLogDialog] = useState<WorkLog | null>(null);
  const [requestDetailDialog, setRequestDetailDialog] = useState<PurchaseRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Batch selection for debt creation
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [debtDescription, setDebtDescription] = useState("");

  // Price validation state
  const [unitPrice, setUnitPrice] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [directorRejectId, setDirectorRejectId] = useState<string | null>(null);
  const [directorRejectReason, setDirectorRejectReason] = useState("");
  const [directorApproveReq, setDirectorApproveReq] = useState<{ id: string; projectId?: string } | null>(null);
  const [directorApproveSmetaId, setDirectorApproveSmetaId] = useState<string>("");

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, selectedProjectId]);

  // Get projectId for API calls (undefined means all projects)
  const projectIdParam = selectedProjectId !== "all" ? selectedProjectId : undefined;

  // Fetch projects list
  const {
    data: projectsData,
    loading: projectsLoading,
  } = useApi(() => projectsApi.getAll({ limit: 100 }), []);

  const projects = projectsData?.data || [];

  const canDirectorApprove = hasPermission("request:director_approve");

  // Fetch requests awaiting director approval
  const {
    data: directorPendingData,
    loading: directorPendingLoading,
    refetch: refetchDirectorPending,
  } = useApi(() => requestsApi.getAll({ status: "PENDING_DIRECTOR", limit: 50, projectId: projectIdParam }), [selectedProjectId], { enabled: canDirectorApprove });

  // Fetch pending requests
  const {
    data: pendingRequestsData,
    loading: pendingRequestsLoading,
    error: pendingRequestsError,
    refetch: refetchPendingRequests,
  } = useApi(() => requestsApi.getAll({ status: "PENDING", limit: 50, projectId: projectIdParam }), [selectedProjectId], { enabled: canApproveRequests });

  // Fetch finalized requests (for debt creation)
  const {
    data: finalizedRequestsData,
    loading: finalizedRequestsLoading,
    refetch: refetchFinalizedRequests,
  } = useApi(() => requestsApi.getAll({ status: "FINALIZED", limit: 50, projectId: projectIdParam }), [selectedProjectId], { enabled: canViewDebts });

  // Fetch suppliers
  const {
    data: suppliersData,
    loading: suppliersLoading,
    refetch: refetchSuppliers,
  } = useApi(() => suppliersApi.getAll({ limit: 100 }), [], { enabled: canViewSuppliers });

  // Fetch supplier debts from analytics
  const {
    data: supplierDebtsData,
    loading: supplierDebtsLoading,
    refetch: refetchDebts,
  } = useApi(() => analyticsApi.getSupplierDebts(projectIdParam), [selectedProjectId], { enabled: canViewDebts });

  // Fetch individual debts for selected supplier
  const {
    data: selectedSupplierDebtsData,
    loading: selectedSupplierDebtsLoading,
    refetch: refetchSelectedSupplierDebts,
  } = useApi(
    () => selectedSupplierForDebts
      ? suppliersApi.getDebts(selectedSupplierForDebts.id, { isPaid: false, limit: 50 })
      : Promise.resolve({ data: [] as SupplierDebt[], total: 0, page: 1, limit: 50, totalPages: 0 }),
    [selectedSupplierForDebts?.id],
    { enabled: !!selectedSupplierForDebts && canViewDebts }
  );

  // Fetch worker debts from analytics
  const {
    data: workerDebtsData,
    loading: workerDebtsLoading,
  } = useApi(() => analyticsApi.getWorkerDebts(projectIdParam), [selectedProjectId], { enabled: canViewDebts });

  // Fetch unvalidated work logs
  const {
    data: unvalidatedWorkLogsData,
    loading: unvalidatedWorkLogsLoading,
    refetch: refetchWorkLogs,
  } = useApi(() => workersApi.getUnvalidatedWorkLogs({ limit: 50, projectId: projectIdParam }), [selectedProjectId], { enabled: canValidate });

  // Fetch dashboard summary
  const {
    data: summaryData,
    loading: summaryLoading,
  } = useApi(() => analyticsApi.getDashboardSummary(), [], { enabled: canViewStats });

  // Mutations
  const { mutate: approveRequest, loading: approving } = useMutation(
    (id: string) => requestsApi.approve(id)
  );

  const { mutate: rejectRequest, loading: rejecting } = useMutation(
    ({ id, reason }: { id: string; reason: string }) =>
      requestsApi.reject(id, reason)
  );

  const { mutate: directorApprove, loading: directorApproving } = useMutation(
    async ({ id, smetaId }: { id: string; smetaId?: string }) => {
      await requestsApi.directorApprove(id, smetaId);
      refetchDirectorPending();
      refetchPendingRequests();
    }
  );

  const { data: approveSmetas } = useApi(
    () => directorApproveReq?.projectId
      ? smetasApi.getAll({ projectId: directorApproveReq.projectId, limit: 50 })
      : Promise.resolve({ data: [] as Smeta[], total: 0, page: 1, limit: 50 }),
    [directorApproveReq?.projectId],
    { enabled: !!directorApproveReq }
  );

  const { mutate: directorReject, loading: directorRejecting } = useMutation(
    async ({ id, reason }: { id: string; reason: string }) => { await requestsApi.directorReject(id, reason); refetchDirectorPending(); }
  );

  const { mutate: createDebt, loading: creatingDebt } = useMutation(
    (data: { supplierId: string; amount: number; description?: string }) =>
      suppliersApi.createDebt(data)
  );

  const { mutate: payDebt, loading: payingDebt } = useMutation(
    (id: string) => suppliersApi.payDebt(id)
  );

  const { mutate: validateWorkLog, loading: validatingWorkLog } = useMutation(
    ({ id, data }: { id: string; data: { unitPrice: number; totalAmount: number } }) =>
      workersApi.validateWithPrice(id, data)
  );

  const { mutate: rejectWorkLog, loading: rejectingWorkLog } = useMutation(
    ({ id, reason }: { id: string; reason?: string }) =>
      workersApi.rejectWorkLog(id, { reason })
  );

  const directorPendingRequests = directorPendingData?.data || [];
  const pendingRequests = pendingRequestsData?.data || [];
  const finalizedRequests = finalizedRequestsData?.data || [];
  const suppliers = suppliersData?.data || [];
  const supplierDebts = supplierDebtsData?.suppliers || [];
  const workerDebts = workerDebtsData?.workers || [];
  const unvalidatedWorkLogs = unvalidatedWorkLogsData?.data || [];
  const pageSize = 4;
  const filteredWorkLogs = unvalidatedWorkLogs.filter((log) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || [
      log.workType,
      log.worker?.name,
      log.loggedBy?.name,
      log.project?.name,
      String(log.quantity),
      log.unit,
    ].some((value) => String(value || "").toLowerCase().includes(query));
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "PENDING" && !log.isValidated && !log.isRejected) ||
      (statusFilter === "APPROVED" && log.isValidated) ||
      (statusFilter === "REJECTED" && log.isRejected);
    return matchesSearch && matchesStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filteredWorkLogs.length / pageSize));
  const paginatedWorkLogs = filteredWorkLogs.slice((page - 1) * pageSize, page * pageSize);
  const pendingWorkLogCount = unvalidatedWorkLogs.filter((log) => !log.isValidated && !log.isRejected).length;
  const approvedWorkLogCount = unvalidatedWorkLogs.filter((log) => log.isValidated).length;
  const rejectedWorkLogCount = unvalidatedWorkLogs.filter((log) => log.isRejected).length;

  // Group finalized requests by batchId
  const batchGroups = finalizedRequests.reduce((acc, req) => {
    const batchId = req.batchId || req.id;
    if (!acc[batchId]) {
      acc[batchId] = [];
    }
    acc[batchId].push(req);
    return acc;
  }, {} as Record<string, PurchaseRequest[]>);

  const loading = pendingRequestsLoading || suppliersLoading || supplierDebtsLoading || unvalidatedWorkLogsLoading || summaryLoading;
  const error = pendingRequestsError;

  const handleApproveRequest = async (id: string) => {
    try {
      await approveRequest(id);
      refetchPendingRequests();
    } catch {
      // Error handled by useMutation
    }
  };

  const handleRejectRequest = async (id: string) => {
    const reason = prompt("Rad etish sababini kiriting:");
    if (!reason) return;
    try {
      await rejectRequest({ id, reason });
      refetchPendingRequests();
    } catch {
      // Error handled by useMutation
    }
  };

  const handleCreateDebt = async () => {
    if (!selectedSupplierId || !debtAmount) return;
    try {
      await createDebt({
        supplierId: selectedSupplierId,
        amount: Number(debtAmount),
        description: debtDescription || (selectedBatchId ? `Batch: ${selectedBatchId}` : undefined),
      });
      setAddDebtDialogOpen(false);
      setSelectedBatchId(null);
      setSelectedSupplierId("");
      setDebtAmount("");
      setDebtDescription("");
      refetchDebts();
    } catch {
      // Error handled by useMutation
    }
  };

  const handlePayDebt = async () => {
    if (!selectedDebt) return;
    try {
      await payDebt(selectedDebt.id);
      setPayDebtDialogOpen(false);
      setSelectedDebt(null);
      refetchDebts();
    } catch {
      // Error handled by useMutation
    }
  };

  const handleValidateWorkLog = async () => {
    if (!priceDialog || !unitPrice || !totalAmount) return;
    try {
      await validateWorkLog({
        id: priceDialog.id,
        data: {
          unitPrice: Number(unitPrice),
          totalAmount: Number(totalAmount),
        },
      });
      setPriceDialog(null);
      setUnitPrice("");
      setTotalAmount("");
      refetchWorkLogs();
    } catch {
      // Error handled by useMutation
    }
  };

  const handleRejectWorkLog = async () => {
    if (!rejectWorkLogDialog) return;
    try {
      await rejectWorkLog({
        id: rejectWorkLogDialog.id,
        reason: rejectReason.trim() || undefined,
      });
      setRejectWorkLogDialog(null);
      setRejectReason("");
      refetchWorkLogs();
    } catch {
      // Error handled by useMutation
    }
  };

  const openPriceDialog = (log: WorkLog) => {
    setPriceDialog(log);
    setUnitPrice(String(log.unitPrice || 0));
    setTotalAmount(String(log.totalAmount || log.quantity * (log.unitPrice || 0)));
  };

  const handleUnitPriceChange = (value: string) => {
    const price = Number(value) || 0;
    const qty = priceDialog?.quantity || 0;
    setUnitPrice(value);
    setTotalAmount(String(price * qty));
  };

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Tasdiqlash</h1>
          <p className="text-muted-foreground">Usta ishlari tasdiqlash navbati</p>
        </div>
        <ErrorMessage error={error} onRetry={refetchWorkLogs} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          Tasdiqlash
        </h1>
      </div>

      {/* Director Approval Section */}
      {canDirectorApprove && (directorPendingLoading || directorPendingRequests.length > 0) && (
        <div className="rounded-[12px] border border-[#f8e6bd] bg-[#fffbf0] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-[#c88716]" />
            <h3 className="text-[14px] font-semibold text-[#0c447c]">
              Direktor tasdiqlashi kerak
            </h3>
            {directorPendingRequests.length > 0 && (
              <span className="ml-auto rounded-full bg-[#f8e6bd] px-2 py-0.5 text-[11px] font-semibold text-[#c88716]">
                {directorPendingRequests.length} ta
              </span>
            )}
          </div>
          {directorPendingLoading ? (
            <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-14 bg-[#f8e6bd]/40 rounded-lg animate-pulse" />)}</div>
          ) : (
            <div className="space-y-2">
              {directorPendingRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#f8e6bd] bg-white p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#0c447c] truncate">{req.note || "Material"}</p>
                    <p className="text-[11px] text-[#64748b] mt-0.5">
                      {req.requestedQty} {req.smetaItem?.unit || "dona"} •{" "}
                      {req.requestedBy?.name || "Prorab"} • {new Date(req.createdAt).toLocaleDateString("uz-UZ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-destructive hover:text-destructive border-destructive/30"
                      disabled={directorRejecting}
                      onClick={() => { setDirectorRejectId(req.id); setDirectorRejectReason(""); }}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 bg-[#185fa5] hover:bg-[#0c447c]"
                      disabled={directorApproving}
                      onClick={() => { setDirectorApproveReq({ id: req.id, projectId: selectedProjectId !== "all" ? selectedProjectId : undefined }); setDirectorApproveSmetaId(""); }}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      Tasdiqlash
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {unvalidatedWorkLogsLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[12px] border border-[#dbe7f3] bg-white px-4 py-3 shadow-none">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#185fa5]">
              <ClipboardCheck className="h-[13px] w-[13px] text-[#185fa5]" />
              Jami ishlar
            </div>
            <div className="mt-2 text-[30px] font-semibold leading-none text-[#0c447c]">{unvalidatedWorkLogs.length}</div>
          </div>
          <div className="rounded-[12px] border border-[#dbe7f3] bg-white px-4 py-3 shadow-none">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#185fa5]">
              <Clock className="h-[13px] w-[13px] text-[#ef9f27]" />
              Kutmoqda
            </div>
            <div className="mt-2 text-[30px] font-semibold leading-none text-[#0c447c]">{pendingWorkLogCount}</div>
          </div>
          <div className="rounded-[12px] border border-[#dbe7f3] bg-white px-4 py-3 shadow-none">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#185fa5]">
              <CheckCircle className="h-[13px] w-[13px] text-[#1d9e75]" />
              Tasdiqlangan
            </div>
            <div className="mt-2 text-[30px] font-semibold leading-none text-[#0c447c]">{approvedWorkLogCount}</div>
          </div>
          <div className="rounded-[12px] border border-[#dbe7f3] bg-white px-4 py-3 shadow-none">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#185fa5]">
              <XCircle className="h-[13px] w-[13px] text-[#ef4444]" />
              Rad etilgan
            </div>
            <div className="mt-2 text-[30px] font-semibold leading-none text-[#0c447c]">{rejectedWorkLogCount}</div>
          </div>
        </div>
      )}

      <Card className="flex min-h-[calc(100vh-220px)] flex-col overflow-hidden rounded-[12px] border border-[#dbe7f3] py-0 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dbe7f3] bg-white px-5 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-[18px] w-[18px] text-[#378add]" />
            <div>
              <h3 className="text-[14px] font-semibold tracking-tight text-[#0c447c]">Usta ishlari</h3>
            </div>
          </div>
          <div className="flex w-full max-w-5xl flex-col items-stretch justify-end gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[#378add]" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                type="search"
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                className="h-10 rounded-[8px] border border-[#dbe7f3] bg-white pl-9 text-[13px] text-[#0c447c] shadow-none placeholder:text-[#94a3b8]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-full rounded-[8px] border-[#dbe7f3] bg-white text-[13px] text-[#0c447c] shadow-none lg:w-[170px]">
                <SelectValue placeholder="Holat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha holatlar</SelectItem>
                <SelectItem value="PENDING">Kutmoqda</SelectItem>
                <SelectItem value="APPROVED">Tasdiqlangan</SelectItem>
                <SelectItem value="REJECTED">Rad etilgan</SelectItem>
              </SelectContent>
            </Select>
            {projects.length > 1 && (
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="h-10 w-full rounded-[8px] border-[#dbe7f3] bg-white text-[13px] text-[#0c447c] shadow-none lg:w-[110px]">
                  <SelectValue placeholder="Loyiha" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha loyihalar</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={refetchWorkLogs}
              disabled={unvalidatedWorkLogsLoading}
              className="h-10 w-10 rounded-[8px] border-[#dbe7f3] text-[#378add] shadow-none hover:bg-[#f0f7ff]"
            >
              <RefreshCw className={`h-4 w-4 ${unvalidatedWorkLogsLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-auto">
            {unvalidatedWorkLogsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-[#378add]" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-white hover:bg-white">
                    <TableHead className="h-12 w-[150px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Ish</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Usta</TableHead>
                    <TableHead className="w-[130px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Loyiha</TableHead>
                    <TableHead className="w-[140px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Miqdor</TableHead>
                    <TableHead className="w-[140px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Summa</TableHead>
                    <TableHead className="w-[180px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Holat</TableHead>
                    <TableHead className="w-[140px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Sana</TableHead>
                    <TableHead className="w-[260px] text-right text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="align-top">
                  {paginatedWorkLogs.length === 0 ? (
                    <>
                      <TableRow className="h-20 border-b border-[#eef2f7] hover:bg-transparent">
                        <TableCell colSpan={8} className="text-center text-[13px] text-[#85b7eb]">
                          <div className="flex flex-col items-center gap-2">
                            <ClipboardCheck className="h-8 w-8 opacity-30" />
                            <p>Hozircha tasdiqlash kerak bo'lgan ishlar yo'q</p>
                          </div>
                        </TableCell>
                      </TableRow>
                      {Array.from({ length: pageSize - 1 }).map((_, index) => (
                        <TableRow key={`empty-filler-${index}`} className="h-20 border-b border-[#eef2f7] hover:bg-transparent last:border-b-0">
                          <TableCell colSpan={8} />
                        </TableRow>
                      ))}
                    </>
                  ) : paginatedWorkLogs.map((log) => {
                    const amount = log.totalAmount || (log.quantity * (log.unitPrice || 0));
                    return (
                      <TableRow
                        key={log.id}
                        className="h-20 border-b border-[#eef2f7] last:border-b-0 transition-colors hover:bg-[#f8fbff]"
                      >
                        <TableCell className="py-[13px]">
                          <div className="space-y-0.5">
                            <div className="text-[13px] font-semibold text-[#0c447c]">{log.workType}</div>
                            <div className="text-[11px] text-[#64748b]">{formatDateFull(log.date)}</div>
                          </div>
                        </TableCell>
                        <TableCell className="py-[13px] text-[13px] font-medium text-[#0c447c]">
                          {log.worker?.name || log.loggedBy?.name || "—"}
                        </TableCell>
                        <TableCell className="py-[13px] text-[13px] text-[#64748b]">
                          {log.project?.name || "—"}
                        </TableCell>
                        <TableCell className="py-[13px] text-[13px] text-[#64748b]">
                          {formatMoney(log.quantity).replace(" so'm", "")} {log.unit}
                        </TableCell>
                        <TableCell className="py-[13px] text-[13px] font-semibold text-[#2f6bf2]">
                          {formatMoney(amount)}
                        </TableCell>
                        <TableCell className="py-[13px]">
                          {getWorkLogStatusBadge(log)}
                        </TableCell>
                        <TableCell className="py-[13px] text-[13px] text-[#64748b]">
                          {formatDateFull(log.date)}
                        </TableCell>
                        <TableCell className="py-[13px] text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              className="h-8 bg-[#185fa5] px-3 text-xs text-white hover:bg-[#0f4f90]"
                              disabled={validatingWorkLog || log.isValidated || log.isRejected}
                              onClick={() => openPriceDialog(log)}
                            >
                              <CheckCircle className="mr-1 h-3.5 w-3.5" />
                              Tasdiqlash
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 text-xs text-destructive hover:text-destructive"
                              disabled={rejectingWorkLog || log.isValidated || log.isRejected}
                              onClick={() => setRejectWorkLogDialog(log)}
                            >
                              <XCircle className="mr-1 h-3.5 w-3.5" />
                              Rad
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 text-[#378add]"
                              disabled={log.isValidated || log.isRejected}
                              onClick={() => openPriceDialog(log)}
                            >
                              <PencilLine className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {paginatedWorkLogs.length < pageSize && Array.from({ length: pageSize - paginatedWorkLogs.length }).map((_, index) => (
                    <TableRow key={`worklog-filler-${index}`} className="h-20 border-b border-[#eef2f7] hover:bg-transparent last:border-b-0">
                      <TableCell colSpan={8} />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <TablePagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          summary={`Jami: ${filteredWorkLogs.length} ta ish`}
        />
      </Card>

      {/* Add Debt Dialog */}
      <Dialog open={addDebtDialogOpen} onOpenChange={setAddDebtDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Qarz qo'shish</DialogTitle>
            <DialogDescription>
              Tugallangan batch'dan yoki qo'lda qarz qo'shing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Batch selection */}
            {Object.keys(batchGroups).length > 0 && !selectedBatchId && (
              <div className="space-y-2">
                <Label>Batch tanlang (ixtiyoriy)</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(batchGroups).map(([batchId, items]) => (
                    <div
                      key={batchId}
                      className="p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        setSelectedBatchId(batchId);
                        const totalAmount = items.reduce((sum, item) => sum + item.requestedAmount, 0);
                        setDebtAmount(String(totalAmount));
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">Batch #{batchId.slice(0, 8)}</span>
                        <Badge variant="outline">{items.length} ta material</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Jami: {formatMoney(items.reduce((sum, item) => sum + item.requestedAmount, 0))} so'm
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedBatchId && (
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tanlangan batch:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedBatchId(null);
                      setDebtAmount("");
                    }}
                  >
                    Bekor qilish
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">#{selectedBatchId.slice(0, 8)}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Yetkazuvchi</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Yetkazuvchini tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Qarz summasi (so'm)</Label>
              <Input
                type="number"
                min={1}
                placeholder="Summani kiriting"
                value={debtAmount}
                onChange={(e) => setDebtAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Izoh (ixtiyoriy)</Label>
              <Textarea
                placeholder="Qarz tavsifi..."
                value={debtDescription}
                onChange={(e) => setDebtDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDebtDialogOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              onClick={handleCreateDebt}
              disabled={creatingDebt || !selectedSupplierId || !debtAmount}
            >
              {creatingDebt ? "Saqlanmoqda..." : "Qarz qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Debt Dialog */}
      <Dialog open={payDebtDialogOpen} onOpenChange={setPayDebtDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Qarzni to'lash</DialogTitle>
            <DialogDescription>
              Qarzni to'lashni tasdiqlaysizmi?
            </DialogDescription>
          </DialogHeader>
          {selectedDebt && (
            <div className="py-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Summa:</span>
                  <span className="font-bold text-lg">{formatMoney(selectedDebt.amount)} so'm</span>
                </div>
                {selectedDebt.description && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Izoh:</span>
                    <span>{selectedDebt.description}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDebtDialogOpen(false)}>
              Bekor qilish
            </Button>
            <Button onClick={handlePayDebt} disabled={payingDebt}>
              {payingDebt ? "To'lanmoqda..." : "To'lash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Debts Dialog */}
      <Dialog open={supplierDebtsDialogOpen} onOpenChange={(open) => {
        setSupplierDebtsDialogOpen(open);
        if (!open) setSelectedSupplierForDebts(null);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Qarzlar - {selectedSupplierForDebts?.name}</DialogTitle>
            <DialogDescription>
              Har bir qarzni alohida to'lang
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-3 py-2">
            {selectedSupplierDebtsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (selectedSupplierDebtsData?.data || []).length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">To'lanmagan qarzlar yo'q</p>
              </div>
            ) : (
              (selectedSupplierDebtsData?.data || []).map((debt) => (
                <div
                  key={debt.id}
                  className="p-3 rounded-lg border bg-card space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-lg">{formatMoney(debt.amount)} so'm</p>
                      {debt.description && (
                        <p className="text-sm text-muted-foreground">{debt.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(debt.createdAt).toLocaleDateString("uz-UZ")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          await payDebt(debt.id);
                          refetchSelectedSupplierDebts();
                          refetchDebts();
                        } catch {
                          // Error handled by mutation
                        }
                      }}
                      disabled={payingDebt}
                    >
                      {payingDebt ? "..." : "To'lash"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSupplierDebtsDialogOpen(false);
              setSelectedSupplierForDebts(null);
            }}>
              Yopish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price Validation Dialog */}
      <Dialog open={!!priceDialog} onOpenChange={() => setPriceDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Narx bilan tasdiqlash</DialogTitle>
            <DialogDescription>
              {priceDialog?.workType}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Ish turi:</span>
                <span className="font-medium">{priceDialog?.workType}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Miqdor:</span>
                <span className="font-medium">
                  {priceDialog?.quantity} {priceDialog?.unit}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Ishchi:</span>
                <span className="font-medium">{priceDialog?.worker?.name || "Noma'lum"}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Birlik narxi (so'm)</Label>
              <Input
                type="number"
                min={0}
                value={unitPrice}
                onChange={(e) => handleUnitPriceChange(e.target.value)}
                placeholder="Narxni kiriting"
              />
            </div>

            <div className="space-y-2">
              <Label>Jami summa (so'm)</Label>
              <Input
                type="number"
                min={0}
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="Summani kiriting"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceDialog(null)}>
              Bekor qilish
            </Button>
            <Button
              onClick={handleValidateWorkLog}
              disabled={validatingWorkLog || Number(totalAmount) <= 0}
            >
              {validatingWorkLog ? "Saqlanmoqda..." : "Tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Work Log Dialog */}
      <Dialog open={!!rejectWorkLogDialog} onOpenChange={() => {
        setRejectWorkLogDialog(null);
        setRejectReason("");
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ishni rad etish</DialogTitle>
            <DialogDescription>
              {rejectWorkLogDialog?.workType}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Usta:</span>
                <span className="font-medium">
                  {rejectWorkLogDialog?.worker?.name || rejectWorkLogDialog?.loggedBy?.name || "Noma'lum"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Miqdor:</span>
                <span className="font-medium">
                  {rejectWorkLogDialog?.quantity} {rejectWorkLogDialog?.unit}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rad etish sababi</Label>
              <Textarea
                placeholder="Sababini kiriting..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectWorkLogDialog(null);
              setRejectReason("");
            }}>
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectWorkLog}
              disabled={rejectingWorkLog}
            >
              {rejectingWorkLog ? "Rad etilmoqda..." : "Rad etish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Detail Dialog */}
      {/* Director Approve Dialog */}
      <Dialog open={!!directorApproveReq} onOpenChange={(o) => { if (!o) setDirectorApproveReq(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Zayavkani tasdiqlash</DialogTitle>
            <DialogDescription>Mahsulot qaysi smetaga qo'shilsin?</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <select
              className="w-full rounded-lg border border-[#dbe7f3] p-2.5 text-sm outline-none focus:border-[#185fa5] bg-white"
              value={directorApproveSmetaId}
              onChange={e => setDirectorApproveSmetaId(e.target.value)}
            >
              <option value="">— Smetaga qo'shmasdan tasdiqlash</option>
              {(approveSmetas?.data || []).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDirectorApproveReq(null)}>Bekor</Button>
              <Button
                size="sm"
                className="bg-[#185fa5] hover:bg-[#0c447c]"
                disabled={directorApproving}
                onClick={async () => {
                  if (directorApproveReq) {
                    await directorApprove({ id: directorApproveReq.id, smetaId: directorApproveSmetaId || undefined });
                    setDirectorApproveReq(null);
                  }
                }}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Tasdiqlash
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Director Reject Dialog */}
      <Dialog open={!!directorRejectId} onOpenChange={(o) => { if (!o) setDirectorRejectId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rad etish sababi</DialogTitle>
            <DialogDescription>Prorabga izoh qoldiring</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <textarea
              className="w-full rounded-lg border border-[#dbe7f3] p-3 text-sm outline-none focus:border-[#185fa5] resize-none"
              rows={3}
              placeholder="Sabab yozing..."
              value={directorRejectReason}
              onChange={e => setDirectorRejectReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDirectorRejectId(null)}>Bekor</Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={directorRejecting}
                onClick={async () => {
                  if (directorRejectId) {
                    await directorReject({ id: directorRejectId, reason: directorRejectReason });
                    setDirectorRejectId(null);
                  }
                }}
              >Rad etish</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!requestDetailDialog} onOpenChange={() => setRequestDetailDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>So'rov tafsilotlari</DialogTitle>
          </DialogHeader>
          {requestDetailDialog && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Material:</span>
                  <span className="font-medium">{requestDetailDialog.smetaItem?.name || "Noma'lum"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Miqdor:</span>
                  <span className="font-medium">
                    {formatMoney(requestDetailDialog.requestedQty)} {requestDetailDialog.smetaItem?.unit || ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Summa:</span>
                  <span className="font-bold text-primary">
                    {formatMoney(requestDetailDialog.requestedAmount)} so'm
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">So'ragan:</span>
                  <span>{requestDetailDialog.requestedBy?.name || "Noma'lum"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sana:</span>
                  <span>{formatDate(requestDetailDialog.createdAt)}</span>
                </div>
                {requestDetailDialog.note && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground text-sm">Izoh:</span>
                    <p className="mt-1">{requestDetailDialog.note}</p>
                  </div>
                )}
                {requestDetailDialog.isOverrun && (
                  <Badge variant="destructive" className="mt-2">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Smeta chegarasidan oshgan: {requestDetailDialog.overrunPercent}%
                  </Badge>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDetailDialog(null)}>
              Yopish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
          variant="secondary"
          className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-destructive text-destructive-foreground text-[10px]"
        >
          {badge}
        </Badge>
      )}
    </Button>
  );
}

function RequestsSection({
  requests,
  loading,
  onApprove,
  onReject,
  onViewDetail,
  approving,
  rejecting,
}: {
  requests: PurchaseRequest[];
  loading: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onViewDetail: (req: PurchaseRequest) => void;
  approving: boolean;
  rejecting: boolean;
}) {
  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Package className="h-4 w-4 text-warning" />
          Kutilayotgan zayavkalar
        </CardTitle>
        <CardDescription>Prorablardan kelgan material so'rovlari</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Hozircha kutilayotgan zayavka yo'q</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className={`p-4 rounded-lg border bg-card ${
                  request.isOverrun ? "border-destructive/50 bg-destructive/5" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{request.smetaItem?.name || "Noma'lum"}</p>
                      {request.isOverrun && (
                        <Badge variant="destructive" className="text-[10px]">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Oshgan
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatMoney(request.requestedQty)} {request.smetaItem?.unit || ""} •{" "}
                      {formatMoney(request.requestedAmount)} so'm
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {request.requestedBy?.name || "Noma'lum"} • {formatDate(request.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onViewDetail(request)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onReject(request.id)}
                      disabled={rejecting}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onApprove(request.id)}
                      disabled={approving}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
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

function DebtsSection({
  supplierDebts,
  workerDebts,
  loading,
  onAddDebt,
  onViewSupplierDebts,
  totalSupplierDebt,
  totalWorkerDebt,
}: {
  supplierDebts: { supplierId: string; supplierName: string; totalDebt: number; unpaidCount: number }[];
  workerDebts: { workerId: string; workerName: string; debt: number }[];
  loading: boolean;
  onAddDebt: () => void;
  onViewSupplierDebts: (supplierId: string, supplierName: string) => void;
  totalSupplierDebt: number;
  totalWorkerDebt: number;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="animate-slide-up">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Truck className="h-4 w-4 text-destructive" />
              Yetkazuvchi qarzlar
            </CardTitle>
            <CardDescription>
              Jami: {formatMoney(totalSupplierDebt)} so'm
            </CardDescription>
          </div>
          <Button size="sm" onClick={onAddDebt}>
            <DollarSign className="h-4 w-4 mr-1" />
            Qarz qo'shish
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : supplierDebts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Yetkazuvchi qarzlari yo'q</p>
            </div>
          ) : (
            <div className="space-y-3">
              {supplierDebts.map((debt) => (
                <div
                  key={debt.supplierId}
                  className="p-3 rounded-lg border bg-destructive/5 border-destructive/20"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{debt.supplierName}</p>
                      <p className="text-xs text-muted-foreground">
                        {debt.unpaidCount} ta to'lanmagan qarz
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-destructive">
                        {formatMoney(debt.totalDebt)} so'm
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-1"
                        onClick={() => onViewSupplierDebts(debt.supplierId, debt.supplierName)}
                      >
                        To'lash
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-destructive" />
            Ishchi qarzlar
          </CardTitle>
          <CardDescription>
            Jami: {formatMoney(totalWorkerDebt)} so'm
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : workerDebts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Ishchi qarzlari yo'q</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workerDebts.filter(w => w.debt > 0).map((debt) => (
                <div
                  key={debt.workerId}
                  className="p-3 rounded-lg border bg-destructive/5 border-destructive/20"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{debt.workerName}</p>
                    <p className="font-bold text-destructive">
                      {formatMoney(debt.debt)} so'm
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ValidationSection({
  workLogs,
  loading,
  onValidateWithPrice,
  onQuickValidate,
  validating,
}: {
  workLogs: WorkLog[];
  loading: boolean;
  onValidateWithPrice: (log: WorkLog) => void;
  onQuickValidate: (id: string) => void;
  validating: boolean;
}) {
  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          Tekshirilmagan ishlar
        </CardTitle>
        <CardDescription>Prorablar hisobotlari</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : workLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Hozircha tekshirish kerak bo'lgan ishlar yo'q</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-lg border bg-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{log.workType}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {log.worker?.name || log.loggedBy.name} • {log.quantity} {log.unit}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {log.project?.name || "Noma'lum loyiha"} • {formatDate(log.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onValidateWithPrice(log)}
                      disabled={validating}
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Narx bilan
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onQuickValidate(log.id)}
                      disabled={validating}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Tasdiqlash
                    </Button>
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

function SuppliersSection({
  suppliers,
  supplierDebts,
  loading,
}: {
  suppliers: Supplier[];
  supplierDebts: { supplierId: string; supplierName: string; totalDebt: number }[];
  loading: boolean;
}) {
  const debtMap = supplierDebts.reduce((acc, debt) => {
    acc[debt.supplierId] = debt.totalDebt;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Yetkazuvchilar
        </CardTitle>
        <CardDescription>Barcha yetkazuvchilar ro'yxati</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Hozircha yetkazuvchilar yo'q</p>
          </div>
        ) : (
          <div className="space-y-3">
            {suppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{supplier.name}</p>
                    {supplier.phone && (
                      <p className="text-sm text-muted-foreground">{supplier.phone}</p>
                    )}
                    {supplier.contactPerson && (
                      <p className="text-xs text-muted-foreground">{supplier.contactPerson}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {debtMap[supplier.id] > 0 ? (
                      <Badge variant="destructive">
                        Qarz: {formatMoney(debtMap[supplier.id])} so'm
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-success/10 text-success">
                        Qarzsiz
                      </Badge>
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
