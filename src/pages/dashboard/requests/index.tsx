import { useState, useEffect, useCallback } from "react";
import {
  ClipboardList,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  PencilLine,
  Trash2,
  Package,
  Truck,
  User,
} from "lucide-react";
import type { PurchaseRequest } from "@/lib/api/requests";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/shared/table-pagination";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requestsApi, GetPurchaseRequestsParams } from "@/lib/api/requests";
import { projectsApi, Project } from "@/lib/api/projects";
import { usersApi } from "@/lib/api/users";
import { suppliersApi } from "@/lib/api/suppliers";
import { useApi } from "@/hooks/use-api";
import { useProject } from "@/lib/project-context";

const statusOptions = [
  { value: "all", label: "Barcha holatlar" },
  { value: "PENDING", label: "Kutmoqda" },
  { value: "APPROVED", label: "Tasdiqlangan" },
  { value: "REJECTED", label: "Rad etilgan" },
];

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    PENDING: "border border-[#f8e6bd] bg-[#fff6df] text-[#c88716]",
    APPROVED: "border border-[#c8efd8] bg-[#ecfbf1] text-[#1d9e75]",
    REJECTED: "border border-[#ffd5d5] bg-[#fff0f0] text-[#ef4444]",
    IN_TRANSIT: "border border-[#e9d5ff] bg-[#f5f3ff] text-[#7c3aed]",
    DELIVERED: "border border-[#c8efd8] bg-[#ecfbf1] text-[#1d9e75]",
    RECEIVED: "border border-[#c8efd8] bg-[#ecfbf1] text-[#166534]",
    COMPLETED: "border border-[#cfe2ff] bg-[#f0f7ff] text-[#185fa5]",
  };
  const labels: Record<string, string> = {
    PENDING: "Kutmoqda",
    APPROVED: "Tasdiqlangan",
    REJECTED: "Rad etilgan",
    IN_TRANSIT: "Yo'lda",
    DELIVERED: "Yetkazildi",
    RECEIVED: "Qabul qilindi",
    FINALIZED: "Yakunlandi",
    COMPLETED: "Bajarildi",
  };
  return (
    <Badge className={`rounded-full px-[10px] py-1 text-[11px] font-medium shadow-none ${styles[status] || "border border-[#dbe7f3] bg-[#f8fbff] text-[#64748b]"}`}>
      {labels[status] || status}
    </Badge>
  );
};

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  return num.toLocaleString("uz-UZ");
}

function getBatchRequestNumber(batch: PurchaseRequest[]): number | null {
  const nums = batch
    .map((r) => r.batchRequestNumber ?? r.requestNumber)
    .filter((n): n is number => typeof n === "number" && n > 0);
  return nums.length > 0 ? Math.min(...nums) : null;
}

function formatDateIso(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function getDetailStatusBadge(status: string) {
  if (status === "PENDING") {
    return (
      <Badge className="rounded-full border border-[#cfe2ff] bg-[#f0f7ff] px-[10px] py-1 text-[11px] font-medium text-[#185fa5] shadow-none">
        Snabjeniya tasdig'ini kutmoqda
      </Badge>
    );
  }

  return getStatusBadge(status);
}

type EditRow = {
  id: string;
  name: string;
  qty: string;
  unit: string;
  note: string;
};

export default function RequestsPage() {
  const { selectedProjectId } = useProject();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<PurchaseRequest[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [approvingBatchKey, setApprovingBatchKey] = useState<string | null>(null);
  const [deletingBatchKey, setDeletingBatchKey] = useState<string | null>(null);
  const [editingBatch, setEditingBatch] = useState<PurchaseRequest[] | null>(null);
  const [editRows, setEditRows] = useState<EditRow[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [rejectingBatch, setRejectingBatch] = useState<PurchaseRequest[] | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingBatchKey, setRejectingBatchKey] = useState<string | null>(null);
  const [collectingBatchKey, setCollectingBatchKey] = useState<string | null>(null);
  const [deliveringBatchKey, setDeliveringBatchKey] = useState<string | null>(null);

  // Tasdiqlash dialog (2-qadam)
  type ApproveStep = "miqdor" | "haydovchi";
  const [approvingDialog, setApprovingDialog] = useState<PurchaseRequest[] | null>(null);
  const [approveStep, setApproveStep] = useState<ApproveStep>("miqdor");
  const [approvedQty, setApprovedQty] = useState<Record<string, string>>({});
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [approveDialogLoading, setApproveDialogLoading] = useState(false);
  const [approveDialogError, setApproveDialogError] = useState<string | null>(null);

  const { data: driversData } = useApi(
    () => usersApi.getAll({ limit: 100 }),
    [],
    { enabled: !!approvingDialog && approveStep === "haydovchi" }
  );
  const { data: suppliersData } = useApi(
    () => suppliersApi.getAll({ limit: 200 }),
    [],
    { enabled: !!approvingDialog && approveStep === "haydovchi" }
  );
  const drivers = driversData?.data || [];
  const suppliers = suppliersData?.data || [];

  // Fetch stats counts from separate API calls
  const { data: pendingCount } = useApi(() => requestsApi.getAll({ status: "PENDING", limit: 1 }), []);
  const { data: approvedCount } = useApi(() => requestsApi.getAll({ status: "APPROVED", limit: 1 }), []);
  const { data: rejectedCount } = useApi(() => requestsApi.getAll({ status: "REJECTED", limit: 1 }), []);

  const stats = {
    pending: pendingCount?.total ?? 0,
    approved: approvedCount?.total ?? 0,
    rejected: rejectedCount?.total ?? 0,
  };

  // Sync project filter with global project context
  useEffect(() => {
    if (selectedProjectId) {
      setProjectFilter(selectedProjectId);
    }
  }, [selectedProjectId]);

  // Fetch projects for filter dropdown
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await projectsApi.getAll({ limit: 100 });
        setProjects(response.data);
      } catch (err) {
        console.error("Error fetching projects:", err);
      }
    };
    fetchProjects();
  }, []);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: GetPurchaseRequestsParams = {
        page,
        limit: 10,
      };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== "all") params.status = statusFilter;
      if (projectFilter !== "all") params.projectId = projectFilter;

      const response = await requestsApi.getAll(params);
      setRequests(response.data);
      setTotalPages(response.totalPages || Math.max(1, Math.ceil((response.total || response.data.length || 0) / 10)));
      setTotal(response.total ?? response.data.length ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "So'rovlarni yuklashda xatolik");
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, statusFilter, projectFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, projectFilter]);

  // batchId bo'yicha guruhlaymiz
  const batchGroups: PurchaseRequest[][] = Object.values(
    requests.reduce((acc: Record<string, PurchaseRequest[]>, req) => {
      const key = req.batchId || req.id;
      if (!acc[key]) acc[key] = [];
      acc[key].push(req);
      return acc;
    }, {})
  );
  const fillerRowCount = Math.max(0, 10 - batchGroups.length);

  const openEditDialog = (batch: PurchaseRequest[]) => {
    setEditingBatch(batch);
    setEditRows(
      batch.map((req) => ({
        id: req.id,
        name: req.smetaItem?.name || req.note || `Zayavka #${req.requestNumber}`,
        qty: String(req.requestedQty ?? ""),
        unit: req.smetaItem?.unit || "",
        note: req.note || "",
      }))
    );
  };

  const openRejectDialog = (batch: PurchaseRequest[]) => {
    setRejectingBatch(batch);
    setRejectReason("");
  };

  const handleCollectBatch = async (batch: PurchaseRequest[]) => {
    const approvedReqs = batch.filter(r => r.status === "APPROVED");
    if (approvedReqs.length === 0) return;
    const key = batch[0].batchId || batch[0].id;
    setCollectingBatchKey(key);
    setError(null);
    try {
      await Promise.all(approvedReqs.map(r => requestsApi.markCollected(r.id, { collectedQty: r.requestedQty })));
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setCollectingBatchKey(null);
    }
  };

  const handleDeliverBatch = async (batch: PurchaseRequest[]) => {
    const transitReqs = batch.filter(r => r.status === "IN_TRANSIT");
    if (transitReqs.length === 0) return;
    const key = batch[0].batchId || batch[0].id;
    setDeliveringBatchKey(key);
    setError(null);
    try {
      await Promise.all(transitReqs.map(r => requestsApi.markDelivered(r.id, { deliveredQty: r.requestedQty })));
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setDeliveringBatchKey(null);
    }
  };

  const openApproveDialog = (batch: PurchaseRequest[]) => {
    const qtyMap: Record<string, string> = {};
    batch.filter(r => r.status === "PENDING").forEach(r => { qtyMap[r.id] = String(r.requestedQty); });
    setApprovingDialog(batch);
    setApprovedQty(qtyMap);
    setApproveStep("miqdor");
    setSelectedDriverId("");
    setSelectedSupplierId("");
    setApproveDialogError(null);
  };

  const handleApproveDialogFinish = async (selfDeliver: boolean) => {
    if (!approvingDialog) return;
    const pendingReqs = approvingDialog.filter(r => r.status === "PENDING");
    if (pendingReqs.length === 0) return;

    const key = approvingDialog[0].batchId || approvingDialog[0].id;
    setApproveDialogLoading(true);
    setApproveDialogError(null);
    setApprovingBatchKey(key);
    try {
      await requestsApi.batchApprove(pendingReqs.map(r => r.id));
      if (selfDeliver) {
        for (const req of pendingReqs) await requestsApi.assignDriver(req.id, undefined);
      } else if (selectedDriverId) {
        for (const req of pendingReqs) await requestsApi.assignDriver(req.id, selectedDriverId);
      }
      if (selectedSupplierId) {
        for (const req of pendingReqs) await requestsApi.assignSupplier(req.id, selectedSupplierId);
      }
      setApprovingDialog(null);
      await fetchRequests();
    } catch (err) {
      setApproveDialogError(err instanceof Error ? err.message : "Tasdiqlashda xatolik");
    } finally {
      setApproveDialogLoading(false);
      setApprovingBatchKey(null);
    }
  };

  const handleDeleteBatch = async (batch: PurchaseRequest[]) => {
    const confirmed = window.confirm(`${batch.length} ta zayavka o'chirilsinmi?`);
    if (!confirmed) return;

    const key = batch[0].batchId || batch[0].id;
    setDeletingBatchKey(key);
    setError(null);
    try {
      await Promise.all(batch.map((req) => requestsApi.delete(req.id)));
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "O'chirishda xatolik");
    } finally {
      setDeletingBatchKey(null);
    }
  };

  const handleRejectBatch = async () => {
    if (!rejectingBatch || !rejectReason.trim()) return;

    const pendingRequests = rejectingBatch.filter((req) => req.status === "PENDING");
    if (pendingRequests.length === 0) return;

    const key = rejectingBatch[0].batchId || rejectingBatch[0].id;
    setRejectingBatchKey(key);
    setError(null);
    try {
      await Promise.all(pendingRequests.map((req) => requestsApi.reject(req.id, rejectReason.trim())));
      setRejectingBatch(null);
      setRejectReason("");
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rad etishda xatolik");
    } finally {
      setRejectingBatchKey(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingBatch) return;

    setSavingEdit(true);
    setError(null);
    try {
      await Promise.all(
        editRows.map((row) =>
          requestsApi.update(row.id, {
            requestedQty: Number(row.qty) || 0,
            note: row.note.trim() || undefined,
          })
        )
      );
      setEditingBatch(null);
      setEditRows([]);
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tahrirlashda xatolik");
    } finally {
      setSavingEdit(false);
    }
  };

  // Detail view
  if (selectedBatch) {
    const first = selectedBatch[0];
    const batchNumber = getBatchRequestNumber(selectedBatch) ?? first.requestNumber;
    const createdAt = formatDateIso(first.createdAt);
    const fillerRowCount = Math.max(0, 10 - selectedBatch.length);

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedBatch(null)}
            className="rounded-[10px] bg-[#e6f1fb] px-3.5 py-2 text-[12px] font-medium text-[#185fa5] hover:bg-[#d4e8f8] hover:text-[#185fa5]"
          >
            <ArrowLeft className="h-4 w-4" />
            Orqaga
          </Button>
          <h2 className="text-[18px] font-semibold text-[#0c447c]">
            Zayavka #{batchNumber} · {createdAt}
          </h2>
        </div>

        <Card className="flex min-h-[calc(100vh-170px)] flex-col overflow-hidden rounded-[12px] border border-[#dbe7f3] py-0 shadow-none">
          <div className="border-b border-[#dbe7f3] bg-white px-5 py-5 md:px-6">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-[18px] w-[18px] text-[#378add]" />
              <h3 className="text-[20px] font-semibold text-[#0c447c]">Zayavka #{batchNumber}</h3>
            </div>
            <p className="mt-2 text-[13px] font-medium text-[#64748b]">
              {createdAt} · {selectedBatch.length} ta mahsulot
            </p>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden bg-white">
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white hover:bg-white">
                    <TableHead className="h-12 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Material</TableHead>
                    <TableHead className="w-[200px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Miqdor</TableHead>
                    <TableHead className="w-[320px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Holat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="align-top">
                  {selectedBatch.map((req) => (
                    <TableRow key={req.id} className="h-20 border-b border-[#eef2f7] last:border-b-0 hover:bg-[#f8fbff]">
                      <TableCell className="py-[13px]">
                        <div className="text-[13px] font-semibold text-[#0c447c]">
                          {req.smetaItem?.name || req.note || `#${req.requestNumber}`}
                        </div>
                      </TableCell>
                      <TableCell className="py-[13px] text-[13px] text-[#64748b]">
                        {formatNumber(req.requestedQty)} {req.smetaItem?.unit || "birlik"}
                      </TableCell>
                      <TableCell className="py-[13px]">
                        {getDetailStatusBadge(req.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {Array.from({ length: fillerRowCount }).map((_, index) => (
                    <TableRow key={`detail-filler-${index}`} className="h-28 hover:bg-transparent">
                      <TableCell colSpan={3} className="border-b border-[#eef2f7] last:border-b-0" />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          Zayavkalar
        </h1>
      </div>

      <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-[12px] border border-[#dbe7f3] bg-white px-4 py-3 shadow-none">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-[#185fa5]">
                <ClipboardList className="h-[13px] w-[13px] text-[#185fa5]" />
                Jami zayavkalar
              </div>
              <div className="mt-2 text-[30px] font-semibold leading-none text-[#0c447c]">{total}</div>
            </div>
            <div className="rounded-[12px] border border-[#dbe7f3] bg-white px-4 py-3 shadow-none">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-[#185fa5]">
                <Clock className="h-[13px] w-[13px] text-[#ef9f27]" />
                Kutilmoqda
              </div>
              <div className="mt-2 text-[30px] font-semibold leading-none text-[#0c447c]">{stats.pending}</div>
            </div>
            <div className="rounded-[12px] border border-[#dbe7f3] bg-white px-4 py-3 shadow-none">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-[#185fa5]">
                <CheckCircle className="h-[13px] w-[13px] text-[#1d9e75]" />
                Tasdiqlangan
              </div>
              <div className="mt-2 text-[30px] font-semibold leading-none text-[#0c447c]">{stats.approved}</div>
            </div>
            <div className="rounded-[12px] border border-[#dbe7f3] bg-white px-4 py-3 shadow-none">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-[#185fa5]">
                <XCircle className="h-[13px] w-[13px] text-[#ef4444]" />
                Rad etilgan
              </div>
              <div className="mt-2 text-[30px] font-semibold leading-none text-[#0c447c]">{stats.rejected}</div>
            </div>
          </div>

          {error && (
            <Card className="p-4 border-destructive bg-destructive/10">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </Card>
          )}

          <Card className="flex min-h-[calc(100vh-300px)] flex-1 flex-col overflow-hidden rounded-[12px] border border-[#dbe7f3] py-0 shadow-none">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dbe7f3] bg-white px-5 py-3 md:px-6">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-[18px] w-[18px] text-[#378add]" />
                <div>
                  <h3 className="text-[14px] font-semibold tracking-tight text-[#0c447c]">So'rovlar</h3>
                </div>
              </div>
              <div className="flex w-full max-w-5xl flex-col items-stretch justify-end gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[#378add]" />
                  <Input
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
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
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
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
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchRequests}
                  disabled={isLoading}
                  className="h-10 w-10 rounded-[8px] border-[#dbe7f3] text-[#378add] shadow-none hover:bg-[#f0f7ff]"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden bg-white">
              <div className="flex-1 overflow-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-[#378add]" />
                  </div>
                ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white hover:bg-white">
                      <TableHead className="h-12 w-[150px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Zayavka</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Mahsulotlar</TableHead>
                      <TableHead className="w-[160px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">So'rovchi</TableHead>
                      <TableHead className="w-[230px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Holat</TableHead>
                      <TableHead className="w-[150px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Sana</TableHead>
                      <TableHead className="w-[140px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Summa</TableHead>
                      <TableHead className="w-[300px] text-right text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="align-top">
                    {batchGroups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-20 text-center">
                          <div className="flex flex-col items-center gap-2 text-[#85b7eb]">
                            <ClipboardList className="h-10 w-10 opacity-30" />
                            <p className="text-sm">Hozircha zayavkalar yo'q</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : batchGroups.map((batch) => {
                      const first = batch[0];
                      const totalItems = batch.length;
                      const batchAmount = batch.reduce((sum, item) => sum + (item.requestedAmount || 0), 0);
                      const batchKey = first.batchId || first.id;
                      const batchNumber = getBatchRequestNumber(batch) ?? first.requestNumber;
                      const hasPending = batch.some((item) => item.status === "PENDING");
                      const hasApproved = batch.some((item) => item.status === "APPROVED");
                      const hasInTransit = batch.some((item) => item.status === "IN_TRANSIT");
                      const labels = batch
                        .map((r) => r.smetaItem?.name || r.note)
                        .filter(Boolean)
                        .slice(0, 2)
                        .join(", ");

                      return (
                        <TableRow
                          key={first.batchId || first.id}
                          className="h-28 cursor-pointer border-b border-[#eef2f7] last:border-b-0 transition-colors hover:bg-[#f8fbff]"
                          onClick={() => setSelectedBatch(batch)}
                        >
                          <TableCell className="py-[13px]">
                            <div className="space-y-0.5">
                              <div className="text-[13px] font-semibold text-[#0c447c]">#{batchNumber}</div>
                              <div className="text-[11px] text-[#64748b]">{batch.length} ta pozitsiya</div>
                              {first.source === "TELEGRAM" && (
                                <Badge variant="outline" className="w-fit text-[10px]">
                                  Telegram
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-[13px]">
                            <div className="flex max-w-xl flex-col gap-0.5">
                              <span className="text-[13px] font-medium text-[#0c447c]">
                                {totalItems > 1
                                  ? `${totalItems} ta mahsulot`
                                  : (first.smetaItem?.name || first.note || `Zayavka #${first.requestNumber}`)}
                              </span>
                              {totalItems > 1 && (
                                <span className="truncate text-[11px] text-[#64748b]">
                                  {labels}
                                  {totalItems > 2 ? "..." : ""}
                                </span>
                              )}
                              {totalItems === 1 && (
                                <span className="text-[11px] text-[#64748b]">
                                  {formatNumber(first.requestedQty)} {first.smetaItem?.unit || ""}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-[13px] text-[13px] text-[#0c447c]">{first.requestedBy?.name || "—"}</TableCell>
                          <TableCell className="py-[13px]">
                            <div className="flex items-center gap-2 flex-wrap">
                              {getStatusBadge(first.status)}
                              {first.isOverrun && (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Smeta oshdi
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-[13px] text-[13px] text-[#64748b]">
                            {new Date(first.createdAt).toLocaleDateString("uz-UZ")}
                          </TableCell>
                          <TableCell className="py-[13px] text-[13px] font-semibold text-[#2f6bf2]">
                            {formatNumber(batchAmount)} so'm
                          </TableCell>
                          <TableCell className="py-[13px] text-right">
                            <div className="flex items-center justify-end gap-2">
                              {hasPending && (
                                <Button
                                  size="sm"
                                  className="h-8 bg-[#185fa5] px-3 text-xs text-white hover:bg-[#0f4f90]"
                                  disabled={approvingBatchKey === batchKey}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openApproveDialog(batch);
                                  }}
                                >
                                  {approvingBatchKey === batchKey ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle className="mr-1 h-3.5 w-3.5" />
                                  )}
                                  Tasdiqlash
                                </Button>
                              )}
                              {hasPending && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-3 text-xs text-destructive hover:text-destructive"
                                  disabled={rejectingBatchKey === batchKey}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openRejectDialog(batch);
                                  }}
                                >
                                  {rejectingBatchKey === batchKey ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <XCircle className="mr-1 h-3.5 w-3.5" />
                                  )}
                                  Rad
                                </Button>
                              )}
                              {hasInTransit && !hasPending && !hasApproved && (
                                <Button
                                  size="sm"
                                  className="h-8 bg-[#7c3aed] px-2.5 text-xs text-white hover:bg-[#6d28d9]"
                                  disabled={deliveringBatchKey === batchKey}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleDeliverBatch(batch);
                                  }}
                                >
                                  {deliveringBatchKey === batchKey ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Truck className="mr-1 h-3.5 w-3.5" />
                                  )}
                                  Yetkazildi
                                </Button>
                              )}
                              {hasApproved && !hasPending && (
                                <Button
                                  size="sm"
                                  className="h-8 bg-[#166534] px-3 text-xs text-white hover:bg-[#14532d]"
                                  disabled={collectingBatchKey === batchKey}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleCollectBatch(batch);
                                  }}
                                >
                                  {collectingBatchKey === batchKey ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle className="mr-1 h-3.5 w-3.5" />
                                  )}
                                  Olib keldim
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-[#378add]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditDialog(batch);
                                }}
                              >
                                <PencilLine className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                disabled={deletingBatchKey === batchKey}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleDeleteBatch(batch);
                                }}
                              >
                                {deletingBatchKey === batchKey ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {batchGroups.length > 0 && Array.from({ length: fillerRowCount }).map((_, index) => (
                      <TableRow key={`filler-${index}`} className="h-28 hover:bg-transparent">
                        <TableCell colSpan={7} className="border-b border-[#eef2f7] last:border-b-0" />
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                )}
              </div>
            </div>

            <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} summary={`Jami: ${total} so'rov`} />
          </Card>


          <Dialog
            open={!!editingBatch}
            onOpenChange={(open) => {
              if (!open) {
                setEditingBatch(null);
                setEditRows([]);
              }
            }}
          >
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>
                  Zayavka #{editingBatch ? getBatchRequestNumber(editingBatch) ?? editingBatch[0].requestNumber : "—"} tahrirlash
                </DialogTitle>
              </DialogHeader>

              <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                {editRows.map((row, index) => (
                  <div key={row.id} className="rounded-lg border border-[#dbe7f3] p-3">
                    <p className="mb-3 text-sm font-semibold text-[#0c447c]">{row.name}</p>
                    <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
                      <div className="space-y-1.5">
                        <Label>Miqdor {row.unit ? `(${row.unit})` : ""}</Label>
                        <Input
                          type="number"
                          value={row.qty}
                          onChange={(e) => {
                            const next = [...editRows];
                            next[index] = { ...row, qty: e.target.value };
                            setEditRows(next);
                          }}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Izoh</Label>
                        <Textarea
                          value={row.note}
                          onChange={(e) => {
                            const next = [...editRows];
                            next[index] = { ...row, note: e.target.value };
                            setEditRows(next);
                          }}
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingBatch(null);
                    setEditRows([]);
                  }}
                >
                  Bekor qilish
                </Button>
                <Button onClick={handleSaveEdit} disabled={savingEdit}>
                  {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Saqlash
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ── TASDIQLASH DIALOGI (2-qadam) ── */}
          <Dialog open={!!approvingDialog} onOpenChange={v => { if (!v) setApprovingDialog(null); }}>
            <DialogContent className="max-w-[500px] rounded-[16px] border border-[#dbe7f3] p-0 shadow-xl">
              <DialogHeader className="border-b border-[#dbe7f3] px-6 py-4">
                <DialogTitle className="flex items-center gap-2 text-[18px] font-semibold text-[#0c447c]">
                  <CheckCircle className="h-5 w-5 text-[#185fa5]" />
                  {approveStep === "miqdor" ? "Zayavkani tasdiqlash" : "Yetkazuvchini tanlang"}
                </DialogTitle>
              </DialogHeader>

              {/* QADAM 1 */}
              {approveStep === "miqdor" && approvingDialog && (
                <div className="px-6 py-5 space-y-4">
                  <div className="rounded-[10px] border border-[#dbe7f3] bg-[#f0f7ff] px-4 py-3">
                    <p className="text-[12px] text-[#85b7eb]">Prorab: <span className="font-semibold text-[#0c447c]">{approvingDialog[0].requestedBy?.name || "—"}</span></p>
                    <p className="text-[12px] text-[#85b7eb] mt-1">Zayavka #{getBatchRequestNumber(approvingDialog) ?? approvingDialog[0].requestNumber}</p>
                  </div>

                  {approvingDialog.filter(r => r.status === "PENDING").map(req => (
                    <div key={req.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Package className="h-[13px] w-[13px] text-[#85b7eb]" />
                        <span className="text-[13px] font-medium text-[#0c447c]">{req.smetaItem?.name || "Material"}</span>
                        <span className="text-[11px] text-[#85b7eb]">So'ralgan: {req.requestedQty} {req.smetaItem?.unit || ""}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setApprovedQty(q => ({ ...q, [req.id]: String(req.requestedQty) }))}
                          className="rounded-[10px] border-2 py-[10px] text-[13px] font-semibold transition-all"
                          style={{
                            borderColor: approvedQty[req.id] === String(req.requestedQty) ? "#185fa5" : "#dbe7f3",
                            background: approvedQty[req.id] === String(req.requestedQty) ? "#e6f1fb" : "#fff",
                            color: approvedQty[req.id] === String(req.requestedQty) ? "#185fa5" : "#85b7eb",
                          }}
                        >
                          ✓ To'liq ({req.requestedQty})
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={req.requestedQty}
                          placeholder="Boshqa miqdor"
                          value={approvedQty[req.id] !== String(req.requestedQty) ? approvedQty[req.id] : ""}
                          onChange={e => setApprovedQty(q => ({ ...q, [req.id]: e.target.value }))}
                          className="rounded-[10px] border-2 px-3 py-[10px] text-[13px] bg-[#f8fbff] text-[#0c447c] outline-none transition-all"
                          style={{ borderColor: approvedQty[req.id] !== String(req.requestedQty) && approvedQty[req.id] ? "#185fa5" : "#dbe7f3" }}
                        />
                      </div>
                    </div>
                  ))}
                  {approveDialogError && <p className="text-sm text-red-600">{approveDialogError}</p>}
                </div>
              )}

              {/* QADAM 2 */}
              {approveStep === "haydovchi" && (
                <div className="px-6 py-5 space-y-4">

                  {/* Postavshik */}
                  <div>
                    <p className="text-[12px] font-semibold text-[#378add] uppercase tracking-wide mb-2">Postavshik (ixtiyoriy)</p>
                    <div className="rounded-[12px] border-2 overflow-hidden transition-all" style={{ borderColor: selectedSupplierId ? "#185fa5" : "#dbe7f3" }}>
                      <div className="flex items-center gap-3 px-4 py-3" style={{ background: selectedSupplierId ? "#e6f1fb" : "#f8fbff" }}>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-[#e6f1fb]">
                          <Package className="h-[18px] w-[18px] text-[#185fa5]" />
                        </div>
                        <p className="text-[13px] font-semibold text-[#0c447c]">Qaysi postavshikdan?</p>
                      </div>
                      <div className="border-t border-[#dbe7f3] px-4 py-3">
                        <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                          <SelectTrigger className="h-10 rounded-[9px] border-[#dbe7f3]">
                            <SelectValue placeholder="Postavshikni tanlang..." />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Yetkazuvchi */}
                  <div>
                    <p className="text-[12px] font-semibold text-[#378add] uppercase tracking-wide mb-2">Yetkazuvchi</p>
                    <button
                      onClick={() => handleApproveDialogFinish(true)}
                      disabled={approveDialogLoading}
                      className="w-full rounded-[12px] border-2 border-[#dbe7f3] bg-white px-4 py-3 flex items-center gap-3 text-left hover:border-[#185fa5] hover:bg-[#f0f7ff] transition-all"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-[#e6f1fb]">
                        <User className="h-[18px] w-[18px] text-[#185fa5]" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#0c447c]">Haydovchisiz (o'zim yetkazaman)</p>
                        <p className="text-[11px] text-[#85b7eb]">Snabjeniya o'zi olib ketadi</p>
                      </div>
                    </button>

                    <div className="rounded-[12px] border-2 overflow-hidden transition-all mt-2" style={{ borderColor: selectedDriverId ? "#185fa5" : "#dbe7f3" }}>
                      <div className="flex items-center gap-3 px-4 py-3" style={{ background: selectedDriverId ? "#e6f1fb" : "#fff" }}>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-[#e6f1fb]">
                          <Truck className="h-[18px] w-[18px] text-[#185fa5]" />
                        </div>
                        <p className="text-[13px] font-semibold text-[#0c447c]">Haydovchi tayinlash</p>
                      </div>
                      <div className="border-t border-[#dbe7f3] px-4 py-3">
                        <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                          <SelectTrigger className="h-10 rounded-[9px] border-[#dbe7f3]">
                            <SelectValue placeholder="Haydovchini tanlang..." />
                          </SelectTrigger>
                          <SelectContent>
                            {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {approveDialogError && <p className="text-sm text-red-600">{approveDialogError}</p>}
                </div>
              )}

              <DialogFooter className="border-t border-[#dbe7f3] px-6 py-4 gap-2">
                {approveStep === "miqdor" ? (
                  <>
                    <Button variant="outline" className="h-11 rounded-[10px]" onClick={() => setApprovingDialog(null)}>
                      Bekor qilish
                    </Button>
                    <Button className="h-11 rounded-[10px]" onClick={() => setApproveStep("haydovchi")}>
                      Davom etish →
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="h-11 rounded-[10px]" onClick={() => setApproveStep("miqdor")} disabled={approveDialogLoading}>
                      ← Orqaga
                    </Button>
                    <Button
                      className="h-11 rounded-[10px]"
                      onClick={() => handleApproveDialogFinish(false)}
                      disabled={approveDialogLoading || !selectedDriverId}
                    >
                      {approveDialogLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Tasdiqlash
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={!!rejectingBatch}
            onOpenChange={(open) => {
              if (!open) {
                setRejectingBatch(null);
                setRejectReason("");
              }
            }}
          >
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  Zayavka #{rejectingBatch ? getBatchRequestNumber(rejectingBatch) ?? rejectingBatch[0].requestNumber : "—"} rad etish
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-2">
                <Label>Rad etish sababi</Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Sababini kiriting"
                  rows={4}
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectingBatch(null);
                    setRejectReason("");
                  }}
                >
                  Bekor qilish
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRejectBatch}
                  disabled={!rejectReason.trim() || !!rejectingBatchKey}
                >
                  {rejectingBatchKey && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Rad etish
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </div>
    </div>
  );
}
