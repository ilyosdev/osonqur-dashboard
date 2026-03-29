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
import { useApi, useMutation } from "@/hooks/use-api";
import { useAuth } from "@/lib/auth";
import { requestsApi, PurchaseRequest } from "@/lib/api/requests";
import { suppliersApi, Supplier, SupplierDebt } from "@/lib/api/suppliers";
import { workersApi, WorkLog } from "@/lib/api/workers";
import { analyticsApi } from "@/lib/api/analytics";
import { projectsApi, Project } from "@/lib/api/projects";
import { StatsSkeleton } from "@/components/ui/table-skeleton";
import { ErrorMessage } from "@/components/ui/error-message";

function formatMoney(num: number): string {
  return num.toLocaleString("uz-UZ");
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "short",
  });
}

type ActiveView = "requests" | "debts" | "validation" | "suppliers";

const STORAGE_KEY = "direktor_selected_project";

export default function DirektorPage() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<ActiveView>("requests");

  // Project selection state
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() =>
    localStorage.getItem(STORAGE_KEY) || "all"
  );

  // Persist project selection
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedProjectId);
  }, [selectedProjectId]);

  // Dialog states
  const [addDebtDialogOpen, setAddDebtDialogOpen] = useState(false);
  const [payDebtDialogOpen, setPayDebtDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<SupplierDebt | null>(null);
  const [supplierDebtsDialogOpen, setSupplierDebtsDialogOpen] = useState(false);
  const [selectedSupplierForDebts, setSelectedSupplierForDebts] = useState<{ id: string; name: string } | null>(null);
  const [priceDialog, setPriceDialog] = useState<WorkLog | null>(null);
  const [requestDetailDialog, setRequestDetailDialog] = useState<PurchaseRequest | null>(null);

  // Batch selection for debt creation
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [debtDescription, setDebtDescription] = useState("");

  // Price validation state
  const [unitPrice, setUnitPrice] = useState("");
  const [totalAmount, setTotalAmount] = useState("");

  // Get projectId for API calls (undefined means all projects)
  const projectIdParam = selectedProjectId !== "all" ? selectedProjectId : undefined;

  // Fetch projects list
  const {
    data: projectsData,
    loading: projectsLoading,
  } = useApi(() => projectsApi.getAll({ limit: 100 }), []);

  const projects = projectsData?.data || [];

  // Fetch pending requests
  const {
    data: pendingRequestsData,
    loading: pendingRequestsLoading,
    error: pendingRequestsError,
    refetch: refetchPendingRequests,
  } = useApi(() => requestsApi.getAll({ status: "PENDING", limit: 50, projectId: projectIdParam }), [selectedProjectId]);

  // Fetch finalized requests (for debt creation)
  const {
    data: finalizedRequestsData,
    loading: finalizedRequestsLoading,
    refetch: refetchFinalizedRequests,
  } = useApi(() => requestsApi.getAll({ status: "FINALIZED", limit: 50, projectId: projectIdParam }), [selectedProjectId]);

  // Fetch suppliers
  const {
    data: suppliersData,
    loading: suppliersLoading,
    refetch: refetchSuppliers,
  } = useApi(() => suppliersApi.getAll({ limit: 100 }), []);

  // Fetch supplier debts from analytics
  const {
    data: supplierDebtsData,
    loading: supplierDebtsLoading,
    refetch: refetchDebts,
  } = useApi(() => analyticsApi.getSupplierDebts(projectIdParam), [selectedProjectId]);

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
    { enabled: !!selectedSupplierForDebts }
  );

  // Fetch worker debts from analytics
  const {
    data: workerDebtsData,
    loading: workerDebtsLoading,
  } = useApi(() => analyticsApi.getWorkerDebts(projectIdParam), [selectedProjectId]);

  // Fetch unvalidated work logs
  const {
    data: unvalidatedWorkLogsData,
    loading: unvalidatedWorkLogsLoading,
    refetch: refetchWorkLogs,
  } = useApi(() => workersApi.getUnvalidatedWorkLogs({ limit: 50, projectId: projectIdParam }), [selectedProjectId]);

  // Fetch dashboard summary
  const {
    data: summaryData,
    loading: summaryLoading,
  } = useApi(() => analyticsApi.getDashboardSummary(), []);

  // Mutations
  const { mutate: approveRequest, loading: approving } = useMutation(
    (id: string) => requestsApi.approve(id)
  );

  const { mutate: rejectRequest, loading: rejecting } = useMutation(
    ({ id, reason }: { id: string; reason: string }) =>
      requestsApi.reject(id, reason)
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

  const pendingRequests = pendingRequestsData?.data || [];
  const finalizedRequests = finalizedRequestsData?.data || [];
  const suppliers = suppliersData?.data || [];
  const supplierDebts = supplierDebtsData?.suppliers || [];
  const workerDebts = workerDebtsData?.workers || [];
  const unvalidatedWorkLogs = unvalidatedWorkLogsData?.data || [];

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
          <h1 className="text-2xl font-bold tracking-tight">Direktor</h1>
          <p className="text-muted-foreground">Boshqaruv paneli</p>
        </div>
        <ErrorMessage error={error} onRetry={refetchPendingRequests} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Direktor</h1>
          <p className="text-muted-foreground">
            Xush kelibsiz, {user?.name || "Direktor"}
          </p>
        </div>

        {/* Project Selector */}
        {projects.length > 1 && (
          <div className="w-full sm:w-auto">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <FolderOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Loyihani tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha loyihalar</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Stats */}
      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Kutilayotgan zayavkalar"
            value={pendingRequests.length}
            subtitle="ta so'rov"
            icon={Package}
            variant="warning"
            className="animate-slide-up stagger-1"
          />
          <StatsCard
            title="Yetkazuvchi qarzlar"
            value={formatMoney(supplierDebtsData?.totalDebt || 0)}
            subtitle={`${supplierDebts.length} ta yetkazuvchi`}
            icon={Truck}
            variant="danger"
            className="animate-slide-up stagger-2"
          />
          <StatsCard
            title="Ishchi qarzlar"
            value={formatMoney(workerDebtsData?.totalDebt || 0)}
            subtitle={`${workerDebts.length} ta ishchi`}
            icon={Users}
            variant="danger"
            className="animate-slide-up stagger-3"
          />
          <StatsCard
            title="Tekshirilmagan ishlar"
            value={unvalidatedWorkLogs.length}
            subtitle="ta ish jurnali"
            icon={ClipboardCheck}
            variant="primary"
            className="animate-slide-up stagger-4"
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <ActionButton
          icon={Package}
          label="Zayavkalar"
          active={activeView === "requests"}
          onClick={() => setActiveView("requests")}
          badge={pendingRequests.length}
        />
        <ActionButton
          icon={CreditCard}
          label="Qarzlar"
          active={activeView === "debts"}
          onClick={() => setActiveView("debts")}
        />
        <ActionButton
          icon={ClipboardCheck}
          label="Tasdiqlash"
          active={activeView === "validation"}
          onClick={() => setActiveView("validation")}
          badge={unvalidatedWorkLogs.length}
        />
        <ActionButton
          icon={Building2}
          label="Postavshiklar"
          active={activeView === "suppliers"}
          onClick={() => setActiveView("suppliers")}
        />
      </div>

      {/* Content sections */}
      {activeView === "requests" && (
        <RequestsSection
          requests={pendingRequests}
          loading={pendingRequestsLoading}
          onApprove={handleApproveRequest}
          onReject={handleRejectRequest}
          onViewDetail={(req) => setRequestDetailDialog(req)}
          approving={approving}
          rejecting={rejecting}
        />
      )}
      {activeView === "debts" && (
        <DebtsSection
          supplierDebts={supplierDebts}
          workerDebts={workerDebts}
          loading={supplierDebtsLoading || workerDebtsLoading}
          onAddDebt={() => setAddDebtDialogOpen(true)}
          onViewSupplierDebts={(supplierId, supplierName) => {
            setSelectedSupplierForDebts({ id: supplierId, name: supplierName });
            setSupplierDebtsDialogOpen(true);
          }}
          totalSupplierDebt={supplierDebtsData?.totalDebt || 0}
          totalWorkerDebt={workerDebtsData?.totalDebt || 0}
        />
      )}
      {activeView === "validation" && (
        <ValidationSection
          workLogs={unvalidatedWorkLogs}
          loading={unvalidatedWorkLogsLoading}
          onValidateWithPrice={openPriceDialog}
          onQuickValidate={async (id) => {
            const log = unvalidatedWorkLogs.find(l => l.id === id);
            if (log) {
              await validateWorkLog({
                id,
                data: {
                  unitPrice: log.unitPrice || 0,
                  totalAmount: log.totalAmount || 0,
                },
              });
              refetchWorkLogs();
            }
          }}
          validating={validatingWorkLog}
        />
      )}
      {activeView === "suppliers" && (
        <SuppliersSection
          suppliers={suppliers}
          supplierDebts={supplierDebts}
          loading={suppliersLoading}
        />
      )}

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
              disabled={validatingWorkLog || !totalAmount}
            >
              {validatingWorkLog ? "Saqlanmoqda..." : "Tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Detail Dialog */}
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
