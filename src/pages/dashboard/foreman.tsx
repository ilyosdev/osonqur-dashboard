import React, { useEffect, useRef, useState } from "react";
import { ClipboardList, Plus, ChevronLeft, ChevronRight, Clock, CheckCircle, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApi, useMutation } from "@/hooks/use-api";
import { requestsApi, PurchaseRequest } from "@/lib/api/requests";
import { smetaItemsApi, SmetaItem } from "@/lib/api/smeta-items";
import { smetasApi } from "@/lib/api/smetas";
import { useProject } from "@/lib/project-context";
import { useBuilding } from "@/lib/building-context";
import { TablePagination } from "@/components/shared/table-pagination";

type View = "menu" | "history" | "detail" | "create";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Snabjeniya tasdig'ini kutmoqda",
  APPROVED: "Tasdiqlandi, snabjeniyada",
  REJECTED: "Rad etildi",
  IN_TRANSIT: "Haydovchida, yo'lda",
  DELIVERED: "Haydovchi yetkazdi, skladda",
  RECEIVED: "Skladchi qabul qildi",
  FINALIZED: "Yakunlandi",
};

const STATUS_VARIANT: Record<string, "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  APPROVED: "outline",
  REJECTED: "destructive",
  IN_TRANSIT: "outline",
  DELIVERED: "outline",
  RECEIVED: "outline",
  FINALIZED: "outline",
};

const PAGE_SIZE = 10;

function getStatusTone(status?: string) {
  switch (status) {
    case "PENDING":
      return "bg-[#eff6ff] text-[#185fa5] ring-1 ring-[#bfdbfe]";
    case "APPROVED":
    case "RECEIVED":
    case "FINALIZED":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "REJECTED":
      return "bg-red-50 text-red-700 ring-1 ring-red-200";
    case "IN_TRANSIT":
    case "DELIVERED":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getBatchRequestNumber(batch: PurchaseRequest[]): number | null {
  const nums = batch
    .map((r) => r.batchRequestNumber ?? r.requestNumber)
    .filter((n): n is number => typeof n === "number" && n > 0);
  if (nums.length === 0) return null;
  return Math.min(...nums);
}

export default function ForemanPage() {
  const { selectedProjectId } = useProject();
  const [view, setView] = useState<View>("menu");
  const [selectedBatch, setSelectedBatch] = useState<PurchaseRequest[] | null>(null);
  const [detailBackView, setDetailBackView] = useState<"menu" | "history">("menu");
  const [createOpen, setCreateOpen] = useState(false);
  const [createParsed, setCreateParsed] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
      {view === "menu" && (
        <MenuView
          onSelect={setView}
          onCreateClick={() => setCreateOpen(true)}
          onOpenBatch={(batch) => {
            setSelectedBatch(batch);
            setDetailBackView("menu");
            setView("detail");
          }}
          projectId={selectedProjectId}
        />
      )}
      {view === "history" && (
        <HistoryView
          onBack={() => setView("menu")}
          onOpenBatch={(batch) => {
            setSelectedBatch(batch);
            setDetailBackView("history");
            setView("detail");
          }}
          projectId={selectedProjectId}
        />
      )}
      {view === "detail" && selectedBatch && (
        <BatchDetailView
          batch={selectedBatch}
          onBack={() => setView(detailBackView)}
        />
      )}

      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setCreateParsed(false); }}>
        <DialogContent style={{ maxWidth: createParsed ? 1100 : 560, width: "95vw", maxHeight: "90vh", overflowY: "auto" }}>
          <DialogHeader>
            <DialogTitle>Yangi zayavka yaratish</DialogTitle>
            <DialogDescription>Materiallarni kiriting</DialogDescription>
          </DialogHeader>
          {createOpen && (
            <InlineCreateRequest
              projectId={selectedProjectId}
              onClose={() => { setCreateOpen(false); setCreateParsed(false); }}
              onSuccess={() => { setCreateOpen(false); setCreateParsed(false); }}
              onParsed={() => setCreateParsed(true)}
              onBack={() => setCreateParsed(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MenuView({
  onSelect,
  onCreateClick,
  onOpenBatch,
  projectId,
}: {
  onSelect: (v: View) => void;
  onCreateClick: () => void;
  onOpenBatch: (batch: PurchaseRequest[]) => void;
  projectId: string | null;
}) {
  const { data, refetch } = useApi(
    () => requestsApi.getAll({ projectId: projectId || undefined, limit: 100 }),
    [projectId],
    { enabled: !!projectId }
  );
  const requests = data?.data || [];
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const total = requests.length;
  const pending = requests.filter(r => r.status === "PENDING").length;
  const approved = requests.filter(r => ["APPROVED", "IN_TRANSIT", "DELIVERED", "RECEIVED", "FINALIZED"].includes(r.status)).length;
  const allBatches = Array.from(
    requests.reduce((acc, req) => {
      const key = req.batchId || req.id;
      if (!acc.has(key)) acc.set(key, []);
      acc.get(key)!.push(req);
      return acc;
    }, new Map<string, PurchaseRequest[]>())
  )
    .map(([, batch]) => batch)
    .sort((a, b) => new Date(b[0].createdAt).getTime() - new Date(a[0].createdAt).getTime());
  const recentBatches = allBatches.filter((batch) => {
    if (!searchQuery.trim()) return true;
    const first = batch[0];
    const query = searchQuery.trim().toLowerCase();
    const statusText = STATUS_LABEL[first.status]?.toLowerCase() || "";
    const itemText = batch
      .map((r) => r.smetaItem?.name || r.note || "")
      .join(" ")
      .toLowerCase();

    return (
      String(first.requestNumber || "").includes(query) ||
      String(first.batchRequestNumber || "").includes(query) ||
      statusText.includes(query) ||
      itemText.includes(query)
    );
  });
  const totalPages = Math.max(1, Math.ceil(recentBatches.length / PAGE_SIZE));
  const pageBatches = recentBatches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const fillerRowCount = Math.max(0, PAGE_SIZE - pageBatches.length);

  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-col gap-4 animate-fade-in">
      {projectId && (
        <div className="grid min-w-0 gap-3 md:grid-cols-4">
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
            <div className="mt-2 text-[30px] font-semibold leading-none text-[#0c447c]">{pending}</div>
          </div>
          <div className="rounded-[12px] border border-[#dbe7f3] bg-white px-4 py-3 shadow-none">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#185fa5]">
              <CheckCircle className="h-[13px] w-[13px] text-[#1d9e75]" />
              Tasdiqlangan
            </div>
            <div className="mt-2 text-[30px] font-semibold leading-none text-[#0c447c]">{approved}</div>
          </div>
          <div className="rounded-[12px] border border-[#dbe7f3] bg-white px-4 py-3 shadow-none">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#185fa5]">
              <CheckCircle className="h-[13px] w-[13px] text-[#ef4444]" />
              Rad etilgan
            </div>
            <div className="mt-2 text-[30px] font-semibold leading-none text-[#0c447c]">{requests.filter(r => r.status === "REJECTED").length}</div>
          </div>
        </div>
      )}

      <Card className="flex min-h-[calc(100vh-260px)] flex-1 flex-col overflow-hidden rounded-[12px] border border-[#dbe7f3] py-0 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dbe7f3] bg-white px-5 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-[18px] w-[18px] text-[#378add]" />
            <div>
              <h3 className="text-[14px] font-semibold tracking-tight text-[#0c447c]">So'rovlar</h3>
            </div>
          </div>
          <div className="flex w-full max-w-3xl flex-col items-stretch justify-end gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[#378add]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                type="search"
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                className="h-10 rounded-[8px] border border-[#dbe7f3] bg-white pl-9 text-[13px] text-[#0c447c] shadow-none placeholder:text-[#94a3b8]"
              />
            </div>
            <Button
              onClick={onCreateClick}
              className="h-10 rounded-[8px] bg-[#185fa5] px-4 text-[13px] font-medium text-white hover:bg-[#144f8f]"
            >
              + Yangi zayavka
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col overflow-hidden bg-white">
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white hover:bg-white">
                    <TableHead className="h-12 w-[180px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Zayavka</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Mahsulotlar</TableHead>
                    <TableHead className="w-[240px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Holat</TableHead>
                    <TableHead className="w-[160px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Sana</TableHead>
                    <TableHead className="w-[72px]" />
                  </TableRow>
                </TableHeader>
                <TableBody className="align-top">
                  {pageBatches.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-2 text-[#85b7eb]">
                          <ClipboardList className="h-10 w-10 opacity-30" />
                          <p className="text-sm">Hozircha zayavkalar yo'q</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : pageBatches.map((batch) => {
                    const first = batch[0];
                    const batchRequestNumber = getBatchRequestNumber(batch);
                    const statusCounts = batch.reduce((acc, r) => {
                      acc[r.status] = (acc[r.status] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);
                    const dominantStatus = Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
                    const names = batch.map((r) => r.smetaItem?.name || r.note).filter(Boolean);
                    const primaryLabel = names[0] || "Mahsulot kiritilmagan";
                    const extraCount = Math.max(0, names.length - 1);

                    return (
                      <TableRow key={first.batchId || first.id} className="h-20 cursor-pointer border-b border-[#eef2f7] last:border-b-0 transition-colors hover:bg-[#f8fbff]" onClick={() => onOpenBatch(batch)}>
                        <TableCell className="py-[13px]">
                          <div className="space-y-0.5">
                            <div className="text-[13px] font-semibold text-[#0c447c]">#{batchRequestNumber ?? first.requestNumber ?? "—"}</div>
                            <div className="text-[11px] text-[#64748b]">
                              {batch.length} ta pozitsiya
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-[13px]">
                          <div className="flex max-w-xl flex-col gap-0.5">
                            <span className="text-[13px] font-medium text-[#0c447c]">{batch.length} ta mahsulot</span>
                            <span className="truncate text-[11px] text-[#64748b]">
                              {primaryLabel.length > 34 ? `${primaryLabel.slice(0, 34)}...` : primaryLabel}
                              {extraCount > 0 ? ` +${extraCount} mahsulot` : ""}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-[13px]">
                          <Badge
                            variant={STATUS_VARIANT[dominantStatus] || "secondary"}
                            className={`rounded-full px-[10px] py-1 text-[11px] font-medium shadow-none ${getStatusTone(dominantStatus)}`}
                          >
                            {STATUS_LABEL[dominantStatus] || dominantStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-[13px] text-[13px] text-[#64748b]">
                          {new Date(first.createdAt).toLocaleDateString("uz-UZ")}
                        </TableCell>
                        <TableCell className="py-[13px] text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-[7px] border border-[#dbe7f3] text-[#378add] hover:bg-[#f0f7ff]"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenBatch(batch);
                            }}
                          >
                            <ChevronRight className="h-[13px] w-[13px]" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {pageBatches.length > 0 && Array.from({ length: fillerRowCount }).map((_, index) => (
                    <TableRow key={`filler-${index}`} className="h-20 hover:bg-transparent">
                      <TableCell colSpan={5} className="border-b border-[#eef2f7] last:border-b-0" />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
        <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </Card>

    </div>
  );
}

const BATCH_PAGE_SIZE = 20;

function BatchDetailView({ batch, onBack }: { batch: PurchaseRequest[]; onBack: () => void }) {
  const batchNumber = getBatchRequestNumber(batch);
  const createdAt = new Date(batch[0].createdAt);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(batch.length / BATCH_PAGE_SIZE));
  const paged = batch.slice((page - 1) * BATCH_PAGE_SIZE, page * BATCH_PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="rounded-[10px] bg-[#e6f1fb] px-3.5 py-2 text-[12px] font-medium text-[#185fa5] hover:bg-[#d4e8f8] hover:text-[#185fa5]">
          <ChevronLeft className="h-4 w-4" />
          Orqaga
        </Button>
        <h2 className="text-[18px] font-semibold text-[#0c447c]">
          Zayavka #{batchNumber ?? "—"} · {createdAt.toLocaleDateString("uz-UZ")}
        </h2>
      </div>

      <Card className="flex min-h-[calc(100vh-220px)] flex-col overflow-hidden rounded-[12px] border border-[#dbe7f3] py-0 shadow-none">
        <div className="flex items-center justify-between gap-4 border-b border-[#dbe7f3] bg-white px-5 py-4 md:px-6">
          <div>
            <div className="flex items-center gap-2">
            <ClipboardList className="h-[18px] w-[18px] text-[#378add]" />
              <h3 className="text-[18px] font-semibold text-[#0c447c]">Zayavka #{batchNumber ?? "—"}</h3>
            </div>
            <p className="mt-1 text-[13px] text-[#64748b]">
              {createdAt.toLocaleDateString("uz-UZ")} · {batch.length} ta mahsulot
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col bg-white">
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-white hover:bg-white">
                  <TableHead className="h-12 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Material</TableHead>
                  <TableHead className="w-[140px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Miqdor</TableHead>
                  <TableHead className="w-[240px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Holat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="align-top">
                {paged.map((req) => (
                  <TableRow key={req.id} className="h-20 border-b border-[#eef2f7] transition-colors hover:bg-[#f8fbff] last:border-b-0">
                    <TableCell className="py-4 pr-6 text-[14px] font-semibold text-[#0c447c]">
                      {req.smetaItem?.name || req.note?.split(" | ")[0] || "Noma'lum"}
                    </TableCell>
                    <TableCell className="py-4 whitespace-nowrap text-[14px] text-[#64748b]">
                      {req.requestedQty} {req.smetaItem?.unit || ""}
                    </TableCell>
                    <TableCell className="py-4 whitespace-nowrap">
                      <Badge
                        variant={STATUS_VARIANT[req.status] || "secondary"}
                        className={`rounded-full px-[10px] py-1 text-[11px] font-medium shadow-none ${getStatusTone(req.status)}`}
                      >
                        {STATUS_LABEL[req.status] || req.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {batch.length > 0 && (
            <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
          )}
        </div>
      </Card>
    </div>
  );
}

function InlineCreateRequest({ projectId, onClose: _onClose, onSuccess, onParsed, onBack: _onBack }: { projectId: string | null; onClose: () => void; onSuccess: () => void; onParsed?: () => void; onBack?: () => void }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedItem[] | null>(null);
  const [error, setError] = useState("");
  const [parsing, setParsing] = useState(false);
  const [selectedSmetaId, setSelectedSmetaId] = useState<string>("__none__");
  const selectedSmetaIdRef = useRef<string>("__none__");
  const [smetaItems, setSmetaItems] = useState<SmetaItem[]>([]);
  const [smetaItemSearch, setSmetaItemSearch] = useState<Record<number, string>>({});
  const [smetaItemResults, setSmetaItemResults] = useState<Record<number, SmetaItem[]>>({});

  const { selectedBuildingId, buildings } = useBuilding();
  const [smetas, setSmetas] = useState<{ id: string; name: string; buildingId?: string }[]>([]);

  // Show all smetas (building filter only groups them visually, doesn't hide)
  const visibleSmetas = smetas;

  const handleSmetaChange = async (smetaId: string) => {
    setSelectedSmetaId(smetaId);
    selectedSmetaIdRef.current = smetaId;
    setSmetaItems([]);
    setSmetaItemResults({});
    setSmetaItemSearch({});
    if (!smetaId || smetaId === "__none__") return;
    try {
      const res = await smetaItemsApi.getAll({ smetaId, limit: 200 });
      setSmetaItems(res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!projectId) return;
    smetasApi.getAll({ projectId, limit: 100 }).then(async res => {
      const data = res.data ?? [];
      setSmetas(data);
      if (data.length >= 1) {
        const firstId = data[0].id;
        setSelectedSmetaId(firstId);
        selectedSmetaIdRef.current = firstId;
        try {
          const r = await smetaItemsApi.getAll({ smetaId: firstId, limit: 200 });
          setSmetaItems(r.data);
        } catch { /* ignore */ }
      }
    }).catch(() => {});
  }, [projectId]);

  const { mutate: submit, loading, error: submitError } = useMutation(async () => {
    if (!projectId) throw new Error("Loyiha tanlanmagan");
    if (!parsed || parsed.length === 0) throw new Error("Material topilmadi");
    await requestsApi.submitText(projectId, parsed);
    onSuccess();
  });

  const handleParse = async () => {
    setError("");
    // Use current state value (always fresh at call time), fallback to first smeta
    const activeSmetaId = (selectedSmetaId && selectedSmetaId !== "__none__")
      ? selectedSmetaId
      : (smetas.length > 0 ? smetas[0].id : null);
    // If project has smetas, smeta selection is required
    if (smetas.length > 0 && !activeSmetaId) {
      setError("Loyihada smeta mavjud — iltimos smeta tanlang");
      return;
    }
    setParsing(true);
    console.log('[PARSE] activeSmetaId:', activeSmetaId, 'selectedSmetaId:', selectedSmetaId, 'smetas.length:', smetas.length);
    try {
      let items: ParsedItem[] = [];
      try {
        // Pass smetaId to backend — it will parse AND auto-match in one request
        const result = await requestsApi.parseText(text, activeSmetaId ?? undefined);
        console.log('[PARSE] response matched:', result.items?.filter(i => i.smetaItemId).length, '/', result.items?.length);
        if (!result.items || result.items.length === 0) {
          setError("Material topilmadi. Masalan: \"Sement 100 qop, armatura 500 kg\"");
          return;
        }
        items = result.items;
        // Pre-populate smetaItemResults so SmetaItemPicker can display matched names
        const preloaded: Record<number, { id: string; name: string; unit: string }[]> = {};
        result.items.forEach((item, idx) => {
          if (item.smetaItemId && item.smetaItemName) {
            preloaded[idx] = [{ id: item.smetaItemId, name: item.smetaItemName, unit: item.smetaItemUnit ?? '' }];
          }
        });
        if (Object.keys(preloaded).length > 0) setSmetaItemResults(preloaded);
      } catch {
        items = parseText(text);
        if (items.length === 0) {
          setError("Material topilmadi. Masalan: \"Sement 100 qop, armatura 500 kg\"");
          return;
        }
      }

      setParsed(items);
      onParsed?.();
    } finally {
      setParsing(false);
    }
  };

  return (
    <div className="space-y-4 px-5 py-4 md:px-6">
      {!projectId && (
        <div className="text-sm text-amber-600">Avval loyihani tanlang</div>
      )}

      {!parsed ? (
        <div className="space-y-4">
          {visibleSmetas.length > 0 && (
            <div className="space-y-2">
              <Label>Smeta {visibleSmetas.length > 0 ? <span className="text-destructive">*</span> : <span className="text-muted-foreground text-xs">(ixtiyoriy)</span>}</Label>
              <Select value={selectedSmetaId} onValueChange={handleSmetaChange}>
                <SelectTrigger className="h-10 text-[14px] w-full">
                  <SelectValue placeholder="Smeta tanlang — elementlar avtomatik aniqlanadi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-[12px] text-muted-foreground">— Smeta tanlang</SelectItem>
                  {/* If no building selected — group by buildings */}
                  {!selectedBuildingId && buildings.length > 0 ? (
                    <>
                      {buildings.map(b => {
                        const bSmetas = visibleSmetas.filter(s => s.buildingId === b.id);
                        if (bSmetas.length === 0) return null;
                        return (
                          <SelectGroup key={b.id}>
                            <SelectLabel className="text-[11px] text-[#185fa5] font-semibold">🏢 {b.name}</SelectLabel>
                            {bSmetas.map(s => (
                              <SelectItem key={s.id} value={s.id} className="text-[13px] pl-6">{s.name}</SelectItem>
                            ))}
                          </SelectGroup>
                        );
                      })}
                      {visibleSmetas.filter(s => !s.buildingId).length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-[11px] text-muted-foreground font-semibold">📋 Binoga biriktirilmagan</SelectLabel>
                          {visibleSmetas.filter(s => !s.buildingId).map(s => (
                            <SelectItem key={s.id} value={s.id} className="text-[13px] pl-6">{s.name}</SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </>
                  ) : (
                    visibleSmetas.map(s => (
                      <SelectItem key={s.id} value={s.id} className="text-[13px]">{s.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedSmetaId && selectedSmetaId !== "__none__" && smetaItems.length > 0 && (
                <p className="text-[11px] text-emerald-600">✓ Smeta tanlandi</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Materiallar</Label>
            <Textarea
              placeholder={"Masalan:\nSement 100 qop, armatura 500 kg, rozetka 20 dona"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="text-sm"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end">
            <Button onClick={handleParse} disabled={!text.trim() || !projectId || parsing}>
              {parsing ? "Tahlil qilinmoqda..." : "Davom etish"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#0c447c]">Tasdiqlashdan oldingi ko'rinish</p>
            <p className="text-sm text-[#85b7eb]">Jami: {parsed.length} ta pozitsiya</p>
          </div>

          <div className="rounded-[10px] border border-[#dbe7f3] overflow-auto max-h-[55vh]">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow className="bg-white hover:bg-white">
                  <TableHead className="w-[28%] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Material</TableHead>
                  <TableHead className="w-[18%] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Miqdor</TableHead>
                  {smetaItems.length > 0 && (
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Smeta elementi</TableHead>
                  )}
                  <TableHead className="w-[90px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsed.map((item, i) => (
                  <TableRow key={`${item.name}-${i}`} className="border-b border-[#eef2f7] last:border-b-0">
                    <TableCell>
                      <input
                        value={item.name}
                        onChange={e => setParsed(parsed.map((p, idx) => idx === i ? { ...p, name: e.target.value } : p))}
                        style={{ width: "100%", border: "1px solid #dbe7f3", borderRadius: 6, padding: "4px 8px", fontSize: 13, fontWeight: 500, color: "#0c447c", outline: "none", background: "#fff" }}
                      />
                    </TableCell>
                    <TableCell>
                      <div style={{ display: "flex", gap: 4 }}>
                        <input
                          type="number"
                          value={item.qty}
                          onChange={e => setParsed(parsed.map((p, idx) => idx === i ? { ...p, qty: parseFloat(e.target.value) || 0 } : p))}
                          style={{ width: 64, border: "1px solid #dbe7f3", borderRadius: 6, padding: "4px 8px", fontSize: 13, color: "#185fa5", outline: "none" }}
                        />
                        <input
                          value={item.unit}
                          onChange={e => setParsed(parsed.map((p, idx) => idx === i ? { ...p, unit: e.target.value } : p))}
                          style={{ width: 52, border: "1px solid #dbe7f3", borderRadius: 6, padding: "4px 8px", fontSize: 13, color: "#64748b", outline: "none" }}
                        />
                      </div>
                    </TableCell>
                    {smetaItems.length > 0 && (
                      <TableCell>
                        <SmetaItemPicker
                          smetaId={selectedSmetaId}
                          smetaItems={smetaItemResults[i] ?? smetaItems}
                          value={item.smetaItemId}
                          search={smetaItemSearch[i] ?? ""}
                          onSearch={async (q, results) => {
                            setSmetaItemSearch(s => ({ ...s, [i]: q }));
                            setSmetaItemResults(r => ({ ...r, [i]: results }));
                          }}
                          onChange={val => setParsed(parsed.map((p, idx) => idx === i ? { ...p, smetaItemId: val } : p))}
                        />
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      <Button
                        variant="ghost" size="sm" className="text-destructive"
                        onClick={() => {
                          const next = parsed.filter((_, idx) => idx !== i);
                          setParsed(next.length ? next : null);
                        }}
                      >O'chirish</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {submitError && <p className="text-sm text-destructive">{String(submitError)}</p>}

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => { setParsed(null); _onBack?.(); }}>Tahrirlash</Button>
            <Button onClick={() => submit(undefined)} disabled={loading}>
              {loading ? "Yuborilmoqda..." : "Tasdiqlash"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

type ParsedItem = { name: string; qty: number; unit: string; smetaItemId?: string };

function parseText(text: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  // Split by comma or newline
  const parts = text.split(/[,\n]+/).map(p => p.trim()).filter(Boolean);
  for (const part of parts) {
    // Match: "NAME UNIT QTY" like "ТРОЙНИК ... ШТ 1,00" or "NAME QTY UNIT" like "Sement 100 qop"
    const m1 = part.match(/^(.+?)\s+(ШТ|шт|dona|kg|кг|м|m|т|ton|qop|litr|л)\s+([\d,\.]+)\s*$/i);
    const m2 = part.match(/^(.+?)\s+([\d,\.]+)\s*(ШТ|шт|dona|kg|кг|м|m|т|ton|qop|litr|л|штук|шт\.?)?\s*$/i);
    if (m1) {
      const qty = parseFloat(m1[3].replace(',', '.'));
      if (!isNaN(qty) && qty > 0) items.push({ name: m1[1].trim(), qty, unit: m1[2] });
    } else if (m2) {
      const qty = parseFloat(m2[2].replace(',', '.'));
      if (!isNaN(qty) && qty > 0) items.push({ name: m2[1].trim(), qty, unit: m2[3] || "dona" });
    } else if (part.length > 2) {
      items.push({ name: part, qty: 1, unit: "dona" });
    }
  }
  return items;
}

type Period = "today" | "week" | "month" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Bugun",
  week: "Oxirgi hafta",
  month: "Oxirgi oy",
  all: "Barchasi",
};

function getDateRange(period: Period): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "today") return { dateFrom: startOfDay.toISOString(), dateTo: new Date(startOfDay.getTime() + 86400000).toISOString() };
  if (period === "week") return { dateFrom: new Date(startOfDay.getTime() - 7 * 86400000).toISOString() };
  if (period === "month") return { dateFrom: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() };
  return {};
}

function HistoryView({
  onBack,
  onOpenBatch,
  projectId,
}: {
  onBack: () => void;
  onOpenBatch: (batch: PurchaseRequest[]) => void;
  projectId: string | null;
}) {
  const [period, setPeriod] = useState<Period>("week");
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const dateRange = getDateRange(period);
  const { data, loading } = useApi(
    () => requestsApi.getAll({ projectId: projectId || undefined, limit: 200, ...dateRange }),
    [period, projectId],
  );

  const requests = data?.data || [];

  const batchMap = new Map<string, PurchaseRequest[]>();
  for (const req of requests) {
    const key = req.batchId || `single_${req.id}`;
    if (!batchMap.has(key)) batchMap.set(key, []);
    batchMap.get(key)!.push(req);
  }
  const batches = Array.from(batchMap.values()).sort(
    (a, b) => new Date(b[0].createdAt).getTime() - new Date(a[0].createdAt).getTime()
  );
  const filteredBatches = batches.filter((batch) => {
    if (!searchQuery.trim()) return true;
    const first = batch[0];
    const batchRequestNumber = getBatchRequestNumber(batch);
    const query = searchQuery.trim().toLowerCase();
    const statusText = STATUS_LABEL[first.status]?.toLowerCase() || "";
    const requesterText = first.requestedBy?.name?.toLowerCase() || "";
    const itemText = batch
      .map((r) => r.smetaItem?.name || r.note || "")
      .join(" ")
      .toLowerCase();

    return (
      String(batchRequestNumber ?? first.requestNumber ?? "").includes(query) ||
      statusText.includes(query) ||
      requesterText.includes(query) ||
      itemText.includes(query)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredBatches.length / PAGE_SIZE));
  const pageBatches = filteredBatches.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const fillerRowCount = Math.max(0, PAGE_SIZE - pageBatches.length);

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(0, totalPages - 1)));
  }, [totalPages]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, period]);

  const total = batches.length;
  const pending = batches.filter((batch) => batch[0].status === "PENDING").length;
  const approved = batches.filter((batch) => ["APPROVED", "IN_TRANSIT", "DELIVERED", "RECEIVED", "FINALIZED"].includes(batch[0].status)).length;
  const rejected = batches.filter((batch) => batch[0].status === "REJECTED").length;

  return (
    <div className="flex min-h-[calc(100vh-120px)] flex-col gap-4 animate-fade-in">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-[12px] border border-[#dbe7f3] bg-white px-4 py-3 shadow-none">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#185fa5]">
            <ClipboardList className="h-[13px] w-[13px] text-[#378add]" />
            Jami zayavkalar
          </div>
          <div className="mt-2 text-[30px] font-semibold leading-none text-[#0c447c]">{total}</div>
        </div>
        <div className="rounded-[12px] border border-[#dbe7f3] bg-white px-4 py-3 shadow-none">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#185fa5]">
            <Clock className="h-[13px] w-[13px] text-[#ef9f27]" />
            Kutilmoqda
          </div>
          <div className="mt-2 text-[30px] font-semibold leading-none text-[#0c447c]">{pending}</div>
        </div>
        <div className="rounded-[12px] border border-[#dbe7f3] bg-white px-4 py-3 shadow-none">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#185fa5]">
            <CheckCircle className="h-[13px] w-[13px] text-[#1d9e75]" />
            Tasdiqlangan
          </div>
          <div className="mt-2 text-[30px] font-semibold leading-none text-[#0c447c]">{approved}</div>
        </div>
        <div className="rounded-[12px] border border-[#dbe7f3] bg-white px-4 py-3 shadow-none">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#185fa5]">
            <CheckCircle className="h-[13px] w-[13px] text-[#ef4444]" />
            Rad etilgan
          </div>
          <div className="mt-2 text-[30px] font-semibold leading-none text-[#0c447c]">{rejected}</div>
        </div>
      </div>

      <Card className="flex min-h-[calc(100vh-260px)] flex-1 flex-col overflow-hidden rounded-[12px] border border-[#dbe7f3] py-0 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dbe7f3] bg-white px-5 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-[18px] w-[18px] text-[#378add]" />
            <div>
              <h3 className="text-[14px] font-semibold tracking-tight text-[#0c447c]">Zayavka tarixi</h3>
              <p className="text-[12px] text-[#85b7eb]">Yuborilgan material so'rovlarini jadval ko'rinishida kuzating</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-[240px]">
              <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
                <SelectTrigger className="h-10 w-full rounded-[8px] border border-[#dbe7f3] bg-white text-[13px] text-[#0c447c] shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PERIOD_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative w-full min-w-[260px] flex-1">
              <Search className="absolute left-3 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[#378add]" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Zayavka, material yoki xodim bo'yicha qidirish..."
                type="search"
                className="h-10 rounded-[8px] border border-[#dbe7f3] bg-white pl-9 text-[13px] text-[#0c447c] shadow-none placeholder:text-[#94a3b8]"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col bg-white">
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center py-16 text-sm text-[#85b7eb]">
                Yuklanmoqda...
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="flex h-full items-center justify-center py-16">
                <div className="flex flex-col items-center gap-2 text-[#85b7eb]">
                  <ClipboardList className="h-10 w-10 opacity-30" />
                  <p className="text-sm">Bu davrda zayavkalar topilmadi.</p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-white hover:bg-white">
                    <TableHead className="h-12 w-[180px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Zayavka</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Mahsulotlar</TableHead>
                    <TableHead className="w-[180px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">So'rovchi</TableHead>
                    <TableHead className="w-[240px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Holat</TableHead>
                    <TableHead className="w-[160px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Sana</TableHead>
                    <TableHead className="w-[72px]" />
                  </TableRow>
                </TableHeader>
                <TableBody className="align-top">
                  {pageBatches.map((batch) => {
                    const first = batch[0];
                    const batchRequestNumber = getBatchRequestNumber(batch);
                    const statusCounts = batch.reduce((acc, r) => {
                      acc[r.status] = (acc[r.status] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);
                    const dominantStatus = Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
                    const names = batch.map((r) => r.smetaItem?.name || r.note).filter(Boolean);
                    const primaryLabel = names[0] || "Mahsulot kiritilmagan";
                    const extraCount = Math.max(0, names.length - 1);
                    const createdAt = new Date(first.createdAt);

                    return (
                      <TableRow
                        key={first.batchId || first.id}
                        className="h-20 cursor-pointer border-b border-[#eef2f7] last:border-b-0 transition-colors hover:bg-[#f8fbff]"
                        onClick={() => onOpenBatch(batch)}
                      >
                        <TableCell className="py-[13px]">
                          <div className="space-y-0.5">
                            <div className="text-[13px] font-semibold text-[#0c447c]">#{batchRequestNumber ?? first.requestNumber ?? "—"}</div>
                            <div className="text-[11px] text-[#64748b]">
                              {batch.length} ta pozitsiya
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-[13px]">
                          <div className="flex max-w-xl flex-col gap-0.5">
                            <span className="text-[13px] font-medium text-[#0c447c]">{batch.length} ta mahsulot</span>
                            <span className="truncate text-[11px] text-[#64748b]">
                              {primaryLabel.length > 34 ? `${primaryLabel.slice(0, 34)}...` : primaryLabel}
                              {extraCount > 0 ? ` +${extraCount} mahsulot` : ""}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-[13px] text-[13px] text-[#64748b]">
                          {first.requestedBy?.name || "—"}
                        </TableCell>
                        <TableCell className="py-[13px]">
                          <Badge
                            variant={STATUS_VARIANT[dominantStatus] || "secondary"}
                            className={`rounded-full px-[10px] py-1 text-[11px] font-medium shadow-none ${getStatusTone(dominantStatus)}`}
                          >
                            {STATUS_LABEL[dominantStatus] || dominantStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-[13px] text-[13px] text-[#64748b]">
                          {createdAt.toLocaleDateString("uz-UZ")}
                        </TableCell>
                        <TableCell className="py-[13px] text-right">
                          <ChevronRight className="inline-block h-4 w-4 text-[#85b7eb]" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {pageBatches.length > 0 && Array.from({ length: fillerRowCount }).map((_, index) => (
                    <TableRow key={`history-filler-${index}`} className="h-20 hover:bg-transparent">
                      <TableCell colSpan={6} className="border-b border-[#eef2f7] last:border-b-0" />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <TablePagination
          page={page + 1}
          totalPages={totalPages}
          onPageChange={(nextPage) => setPage(nextPage - 1)}
          summary={`Sahifa ${page + 1} / ${totalPages}`}
        />
      </Card>
    </div>
  );
}

// Lotin → Kirill va Kirill → Lotin transliteration (O'zbek)
const LT: Record<string, string> = {
  a:"а",b:"б",d:"д",e:"е",f:"ф",g:"г",h:"х",i:"и",j:"ж",k:"к",l:"л",m:"м",
  n:"н",o:"о",p:"п",q:"қ",r:"р",s:"с",t:"т",u:"у",v:"в",x:"х",y:"й",z:"з",
  ch:"ч",sh:"ш",ng:"нг",yo:"ё",yu:"ю",ya:"я",gh:"ғ",
};
const CT: Record<string, string> = Object.fromEntries(Object.entries(LT).map(([l,c])=>[c,l]));

function translitBoth(s: string): string[] {
  const lo = s.toLowerCase();
  // try latin→cyrillic
  let cy = ""; let i = 0;
  while (i < lo.length) {
    if (LT[lo[i]+lo[i+1]]) { cy += LT[lo[i]+lo[i+1]]; i+=2; }
    else if (LT[lo[i]]) { cy += LT[lo[i]]; i++; }
    else { cy += lo[i]; i++; }
  }
  // try cyrillic→latin
  let lat = ""; i = 0;
  while (i < lo.length) {
    if (CT[lo[i]+lo[i+1]]) { lat += CT[lo[i]+lo[i+1]]; i+=2; }
    else if (CT[lo[i]]) { lat += CT[lo[i]]; i++; }
    else { lat += lo[i]; i++; }
  }
  return [lo, cy, lat].filter((v,idx,arr) => arr.indexOf(v)===idx);
}

function SmetaItemPicker({
  smetaId, smetaItems, value, search, onSearch, onChange,
}: {
  smetaId: string;
  smetaItems: { id: string; name: string; unit: string }[];
  value?: string;
  search: string;
  onSearch: (q: string, results: { id: string; name: string; unit: string }[]) => void;
  onChange: (id: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [serverResults, setServerResults] = useState<{ id: string; name: string; unit: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setServerResults([]);
      onSearch("", []);
      return;
    }
    onSearch(q, serverResults);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const variants = translitBoth(q);
        // Search all variants, merge results
        const all: { id: string; name: string; unit: string }[] = [];
        for (const v of variants) {
          const res = await smetaItemsApi.getAll({ smetaId, search: v, limit: 50 });
          for (const item of res.data) {
            if (!all.find(a => a.id === item.id)) all.push(item);
          }
        }
        setServerResults(all);
        onSearch(q, all);
      } catch { /* ignore */ } finally {
        setSearching(false);
      }
    }, 300);
  };

  const selected = smetaItems.find(si => si.id === value) ?? serverResults.find(si => si.id === value);
  const displayItems = search ? serverResults : smetaItems.slice(0, 80);

  return (
    <div ref={ref} className="relative w-full max-w-[320px]">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex h-9 w-full items-center justify-between rounded-md border border-[#dbe7f3] bg-white px-3 text-[13px] text-left hover:border-[#185fa5] transition-colors"
      >
        <span className={`truncate ${selected ? "text-[#0c447c]" : "text-[#94a3b8]"}`}>
          {selected ? selected.name : "Element tanlang..."}
        </span>
        <span className="ml-2 text-[#94a3b8] shrink-0">▾</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-[420px] rounded-[10px] border border-[#dbe7f3] bg-white shadow-lg overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-[#dbe7f3] px-3 py-2">
            {searching
              ? <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-[#185fa5] border-t-transparent" />
              : <Search className="h-3.5 w-3.5 text-[#94a3b8] shrink-0" />}
            <input
              ref={inputRef}
              placeholder="Qidirish (lotin yoki kirill)..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              className="flex-1 text-[13px] outline-none placeholder:text-[#94a3b8]"
            />
            {search && (
              <button onClick={() => { handleSearch(""); setServerResults([]); }} className="text-[#94a3b8] hover:text-[#64748b]">✕</button>
            )}
          </div>

          {/* Clear option */}
          <button
            type="button"
            onClick={() => { onChange(undefined); setOpen(false); onSearch(""); }}
            className="w-full px-3 py-2 text-left text-[12px] text-[#94a3b8] hover:bg-[#f8fafc] border-b border-[#f1f5f9]"
          >
            — Elementisiz
          </button>

          {/* List */}
          <div className="max-h-[260px] overflow-y-auto">
            {displayItems.length === 0 ? (
              <div className="px-3 py-4 text-center text-[12px] text-[#94a3b8]">{searching ? "Qidirilmoqda..." : "Topilmadi"}</div>
            ) : (
              displayItems.map(si => (
                <button
                  key={si.id}
                  type="button"
                  onClick={() => { onChange(si.id); setOpen(false); onSearch(""); }}
                  className={`w-full px-3 py-2 text-left hover:bg-[#eff6ff] transition-colors flex items-center justify-between gap-2 ${si.id === value ? "bg-[#eff6ff]" : ""}`}
                >
                  <span className="text-[12px] text-[#1e293b] leading-snug">{si.name}</span>
                  <span className="text-[11px] text-[#94a3b8] shrink-0 rounded bg-[#f1f5f9] px-1.5 py-0.5">{si.unit}</span>
                </button>
              ))
            )}
          </div>
          {!search && smetaItems.length > 80 && (
            <div className="px-3 py-1.5 text-center text-[11px] text-[#94a3b8] border-t border-[#f1f5f9]">
              Qidiruv orqali aniqlang ({smetaItems.length} ta element)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
