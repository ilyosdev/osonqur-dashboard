import React, { useEffect, useState } from "react";
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent style={{ maxWidth: "90vw", width: "90vw", maxHeight: "90vh", overflowY: "auto" }}>
          <DialogHeader>
            <DialogTitle>Yangi zayavka yaratish</DialogTitle>
            <DialogDescription>Materiallarni kiriting</DialogDescription>
          </DialogHeader>
          {createOpen && (
            <InlineCreateRequest
              projectId={selectedProjectId}
              onClose={() => setCreateOpen(false)}
              onSuccess={() => setCreateOpen(false)}
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

function InlineCreateRequest({ projectId, onClose: _onClose, onSuccess }: { projectId: string | null; onClose: () => void; onSuccess: () => void }) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedItem[] | null>(null);
  const [error, setError] = useState("");
  const [parsing, setParsing] = useState(false);
  const [selectedSmetaId, setSelectedSmetaId] = useState<string>("__none__");
  const [smetaItems, setSmetaItems] = useState<SmetaItem[]>([]);
  const [smetaItemSearch, setSmetaItemSearch] = useState<Record<number, string>>({});

  const { selectedBuildingId, buildings } = useBuilding();
  const [smetas, setSmetas] = useState<{ id: string; name: string; buildingId?: string }[]>([]);
  useEffect(() => {
    if (!projectId) return;
    smetasApi.getAll({ projectId, limit: 100 }).then(res => setSmetas(res.data ?? [])).catch(() => {});
  }, [projectId]);

  // Filter smetas by selected building
  const visibleSmetas = selectedBuildingId
    ? smetas.filter(s => s.buildingId === selectedBuildingId)
    : smetas;

  const handleSmetaChange = async (smetaId: string) => {
    setSelectedSmetaId(smetaId);
    setSmetaItems([]);
    if (!smetaId || smetaId === "__none__") return;
    try {
      const res = await smetaItemsApi.getAll({ smetaId, limit: 500 });
      setSmetaItems(res.data);
    } catch { /* ignore */ }
  };

  const { mutate: submit, loading, error: submitError } = useMutation(async () => {
    if (!projectId) throw new Error("Loyiha tanlanmagan");
    if (!parsed || parsed.length === 0) throw new Error("Material topilmadi");
    await requestsApi.submitText(projectId, parsed);
    onSuccess();
  });

  const handleParse = async () => {
    setError("");
    setParsing(true);
    try {
      let items: ParsedItem[] = [];
      try {
        const result = await requestsApi.parseText(text);
        if (!result.items || result.items.length === 0) {
          setError("Material topilmadi. Masalan: \"Sement 100 qop, armatura 500 kg\"");
          return;
        }
        items = result.items;
      } catch {
        items = parseText(text);
        if (items.length === 0) {
          setError("Material topilmadi. Masalan: \"Sement 100 qop, armatura 500 kg\"");
          return;
        }
      }

      // Auto-match against selected smeta items
      if (selectedSmetaId && selectedSmetaId !== "__none__" && smetaItems.length > 0) {
        items = items.map(item => {
          const q = item.name.toLowerCase().trim();
          const match = smetaItems.find(si => {
            const n = si.name.toLowerCase().trim();
            return n === q || n.includes(q) || q.includes(n);
          });
          return match ? { ...item, smetaItemId: match.id } : item;
        });
      }

      setParsed(items);
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
              <Label>Smeta (ixtiyoriy)</Label>
              <Select value={selectedSmetaId} onValueChange={handleSmetaChange}>
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue placeholder="Smeta tanlang — elementlar avtomatik aniqlanadi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-[12px] text-muted-foreground">— Smetasiz</SelectItem>
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
              {selectedSmetaId && smetaItems.length > 0 && (
                <p className="text-[11px] text-[#378add]">✓ {smetaItems.length} ta element yuklandi</p>
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
                  <TableHead className="w-[35%] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Material</TableHead>
                  <TableHead className="w-[25%] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Miqdor</TableHead>
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
                        <Select
                          value={item.smetaItemId ?? "__none__"}
                          onValueChange={(val) => setParsed(parsed.map((p, idx) => idx === i ? { ...p, smetaItemId: val === "__none__" ? undefined : val } : p))}
                        >
                          <SelectTrigger className="h-8 text-[12px]">
                            <SelectValue placeholder="Element (ixtiyoriy)" />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="px-2 py-1 border-b border-[#dbe7f3]">
                              <input
                                placeholder="Qidirish..."
                                value={smetaItemSearch[i] ?? ""}
                                onChange={e => setSmetaItemSearch(s => ({ ...s, [i]: e.target.value }))}
                                onKeyDown={e => e.stopPropagation()}
                                style={{ width: "100%", border: "1px solid #dbe7f3", borderRadius: 6, padding: "3px 8px", fontSize: 12, outline: "none" }}
                              />
                            </div>
                            <SelectItem value="__none__" className="text-[12px] text-muted-foreground">— Elementisiz</SelectItem>
                            {smetaItems
                              .filter(si => {
                                const q = (smetaItemSearch[i] ?? "").toLowerCase();
                                return !q || si.name.toLowerCase().includes(q);
                              })
                              .map(si => (
                                <SelectItem key={si.id} value={si.id} className="text-[12px]">
                                  {si.name} ({si.unit})
                                  {item.smetaItemId === si.id && " ✓"}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
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
            <Button variant="outline" onClick={() => setParsed(null)}>Tahrirlash</Button>
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
