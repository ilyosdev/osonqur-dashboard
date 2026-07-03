import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Package, DollarSign, CheckCircle, Clock, ChevronLeft, ChevronRight,
  AlertTriangle, History, Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useApi, useMutation } from "@/hooks/use-api";
import { useAuth } from "@/lib/auth";
import { requestsApi, PurchaseRequest } from "@/lib/api/requests";

const C = {
  blue:    "#185fa5",
  blueBg:  "#e6f1fb",
  border:  "#daeaf8",
  text:    "#0c447c",
  muted:   "#85b7eb",
  th:      "#378add",
  green:   "#166534",
  greenBg: "#dcfce7",
  yellow:  "#b45309",
  yellowBg:"#fef9c3",
};

function fmt(n: number) { return n.toLocaleString("uz-UZ"); }
function fmtMoney(n: number) { return n.toLocaleString("uz-UZ") + " so'm"; }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("uz-UZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function groupByBatch(reqs: PurchaseRequest[]) {
  const map = new Map<string, PurchaseRequest[]>();
  for (const req of reqs) {
    const key = req.batchId || req.id;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(req);
  }
  return Array.from(map.values());
}

type Tab = "pending" | "history";

export default function ModeratorPage() {
  const { hasPermission } = useAuth();
  const canView     = hasPermission("moderator:view_pending");
  const canFinalize = hasPermission("moderator:finalize");

  const [searchParams] = useSearchParams();
  const tab: Tab = (searchParams.get("tab") as Tab) || "pending";
  const [historyFilter, setHistoryFilter] = useState<"bugun" | "hafta" | "oy" | "barchasi">("barchasi");

  // Separate state for each tab's selected batch
  const [pendingBatchDetail, setPendingBatchDetail] = useState<PurchaseRequest[] | null>(null);
  const [historyBatchDetail, setHistoryBatchDetail] = useState<PurchaseRequest[] | null>(null);

  const selectedBatch = tab === "pending" ? pendingBatchDetail : historyBatchDetail;

  // Single item finalize
  const [finalizeReq, setFinalizeReq]   = useState<PurchaseRequest | null>(null);
  const [unitPrice, setUnitPrice]       = useState("");
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  // Batch finalize
  const [finalizeBatch, setFinalizeBatch]   = useState<PurchaseRequest[] | null>(null);
  const [batchPrices, setBatchPrices]       = useState<Record<string, string>>({});

  const { data: pendingRes, loading: pendingLoading, refetch: refetchPending } =
    useApi(() => requestsApi.getAll({ status: "RECEIVED", limit: 100 }), []);

  const { data: finalizedRes, loading: finalizedLoading, refetch: refetchFinalized } =
    useApi(() => requestsApi.getAll({ status: "FINALIZED", limit: 200 }), []);

  const { mutate: finalize, loading: finalizing } = useMutation(
    (d: { id: string; finalAmount: number; finalUnitPrice: number }) =>
      requestsApi.finalize(d.id, { finalAmount: d.finalAmount, finalUnitPrice: d.finalUnitPrice })
  );

  const pendingReqs: PurchaseRequest[]   = pendingRes?.data || [];
  const finalizedReqs: PurchaseRequest[] = finalizedRes?.data || [];

  const now = new Date();
  const filteredFinalized = finalizedReqs.filter(r => {
    if (historyFilter === "barchasi") return true;
    const d = new Date(r.updatedAt);
    if (historyFilter === "bugun") return d.toDateString() === now.toDateString();
    const days = historyFilter === "hafta" ? 7 : 30;
    return (now.getTime() - d.getTime()) < days * 86400000;
  });

  const pendingBatches = groupByBatch(pendingReqs).sort(
    (a, b) => new Date(b[0].updatedAt).getTime() - new Date(a[0].updatedAt).getTime()
  );
  const historyBatches = groupByBatch(filteredFinalized).sort(
    (a, b) => new Date(b[0].updatedAt).getTime() - new Date(a[0].updatedAt).getTime()
  );

  const openFinalizeSingle = (req: PurchaseRequest) => {
    setFinalizeReq(req);
    setUnitPrice(String(req.smetaItem?.unitPrice || ""));
    setFinalizeError(null);
  };

  const openFinalizeBatch = (batch: PurchaseRequest[]) => {
    const prices: Record<string, string> = {};
    batch.forEach(r => { prices[r.id] = String(r.smetaItem?.unitPrice || ""); });
    setFinalizeBatch(batch);
    setBatchPrices(prices);
    setFinalizeError(null);
  };

  const handleFinalizeSingle = async () => {
    if (!finalizeReq) return;
    const price = Number(unitPrice);
    if (!price || price <= 0) { setFinalizeError("Narx 0 dan katta bo'lishi kerak"); return; }
    const qty = finalizeReq.receivedQty ?? finalizeReq.requestedQty;
    setFinalizeError(null);
    try {
      await finalize({ id: finalizeReq.id, finalAmount: price * qty, finalUnitPrice: price });
      setFinalizeReq(null);
      // Pending batch detail dan o'sha reqni olib tashlash
      if (pendingBatchDetail) {
        const updated = pendingBatchDetail.filter(r => r.id !== finalizeReq.id);
        setPendingBatchDetail(updated.length === 0 ? null : updated);
      }
      refetchPending(); refetchFinalized();
    } catch (e: any) { setFinalizeError(e?.message || "Yakunlashda xatolik"); }
  };

  const handleFinalizeBatch = async () => {
    if (!finalizeBatch) return;
    setFinalizeError(null);
    try {
      for (const req of finalizeBatch) {
        const price = Number(batchPrices[req.id] || 0);
        const qty = req.receivedQty ?? req.requestedQty;
        await finalize({ id: req.id, finalAmount: price * qty, finalUnitPrice: price });
      }
      setFinalizeBatch(null);
      setPendingBatchDetail(null);
      refetchPending(); refetchFinalized();
    } catch (e: any) { setFinalizeError(e?.message || "Yakunlashda xatolik"); }
  };

  if (!canView) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
        <p style={{ fontSize: 14 }}>Bu sahifaga kirish ruxsati yo'q.</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}>

      {/* Header — har doim ko'rinadi */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 20, fontWeight: 700, color: C.text }}>Moderatsiya</p>
        <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Narx kiritish va tarix</p>
      </div>

      {/* Stat cards — faqat detail yo'q bo'lganda */}
      {!selectedBatch && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: C.yellow, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
              <Clock size={13} color={C.yellow} /> Narx kutilmoqda
            </div>
            <p style={{ fontSize: 30, fontWeight: 700, color: C.text, lineHeight: 1 }}>{pendingReqs.length}</p>
          </div>
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
              <CheckCircle size={13} color={C.green} /> Bugun yakunlangan
            </div>
            <p style={{ fontSize: 30, fontWeight: 700, color: C.text, lineHeight: 1 }}>
              {finalizedReqs.filter(r => new Date(r.updatedAt).toDateString() === now.toDateString()).length}
            </p>
          </div>
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
              <History size={13} color={C.blue} /> Jami yakunlangan
            </div>
            <p style={{ fontSize: 30, fontWeight: 700, color: C.text, lineHeight: 1 }}>{finalizedReqs.length}</p>
          </div>
        </div>
      )}

      {/* ── PENDING TAB — LIST ── */}
      {tab === "pending" && !pendingBatchDetail && (
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", minHeight: "calc(100vh - 380px)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: `1px solid #f0f7ff`, background: "#f8fbff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={15} color={C.th} />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Narx kiritish kerak</span>
            </div>
            <span style={{ fontSize: 12, color: C.muted }}>{pendingBatches.length} ta zayavka</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 40px", padding: "10px 20px", background: "#f8fbff", borderBottom: `1px solid #f0f7ff` }}>
            {["Zayavka", "So'rovchi", "Mahsulotlar", "Sana", ""].map((h, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 700, color: C.th, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
            ))}
          </div>

          {pendingLoading ? (
            <div style={{ padding: 16 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 56, background: "#f0f7ff", borderRadius: 8, marginBottom: 8, animation: "pulse 1.5s infinite" }} />)}
            </div>
          ) : pendingBatches.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 64, color: C.muted }}>
              <CheckCircle size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ fontSize: 13 }}>Narx kiritish kerak bo'lgan mahsulot yo'q</p>
            </div>
          ) : pendingBatches.map((batch, i) => {
            const first = batch[0];
            const batchKey = first.batchId || first.id;
            return (
              <div key={batchKey}
                onClick={() => setPendingBatchDetail(batch)}
                style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 40px", padding: "14px 20px", borderBottom: i < pendingBatches.length - 1 ? `1px solid #f5f9fe` : "none", alignItems: "center", cursor: "pointer" }}
                className="hover:bg-[#f8fbff] transition-colors"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: C.yellowBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <DollarSign size={15} color={C.yellow} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Zayavka #{first.requestNumber || batchKey.slice(0, 6)}</p>
                    <p style={{ fontSize: 11, color: C.muted }}>{batch.length} ta mahsulot</p>
                  </div>
                </div>
                <span style={{ fontSize: 13, color: C.text }}>{first.requestedBy?.name || "—"}</span>
                <span style={{ fontSize: 12, color: C.muted }}>
                  {batch.slice(0, 2).map(r => r.smetaItem?.name).filter(Boolean).join(", ")}
                  {batch.length > 2 ? "..." : ""}
                </span>
                <span style={{ fontSize: 12, color: C.muted }}>{fmtDate(first.updatedAt)}</span>
                <ChevronRight size={15} color={C.muted} />
              </div>
            );
          })}
        </div>
      )}

      {/* ── PENDING BATCH DETAIL ── */}
      {tab === "pending" && pendingBatchDetail && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <button onClick={() => setPendingBatchDetail(null)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
              border: "none", borderRadius: 10, background: C.blueBg, color: C.blue,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
              <ChevronLeft size={14} /> Orqaga
            </button>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
                Zayavka #{pendingBatchDetail[0].requestNumber}
              </p>
              <p style={{ fontSize: 12, color: C.muted }}>
                {pendingBatchDetail[0].requestedBy?.name && `So'rovchi: ${pendingBatchDetail[0].requestedBy.name} · `}
                {fmtDate(pendingBatchDetail[0].updatedAt)}
              </p>
            </div>
          </div>

          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
            {pendingBatchDetail.map((req, i) => {
              const qty = req.receivedQty ?? req.requestedQty;
              return (
                <div key={req.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: i < pendingBatchDetail.length - 1 ? `1px solid #f5f9fe` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: C.blueBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Package size={15} color={C.blue} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{req.smetaItem?.name || "Noma'lum"}</p>
                      <p style={{ fontSize: 11, color: C.muted }}>
                        {fmt(qty)} {req.smetaItem?.unit || ""}
                        {req.smetaItem?.unitPrice ? ` · Smeta: ${fmtMoney(req.smetaItem.unitPrice)}` : ""}
                      </p>
                    </div>
                  </div>
                  {canFinalize && (
                    <button onClick={() => openFinalizeSingle(req)} style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                      borderRadius: 9, border: "none", background: C.blue, color: "#fff",
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}>
                      <DollarSign size={13} /> Narx kiritish
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {canFinalize && pendingBatchDetail.length > 1 && (
            <button onClick={() => openFinalizeBatch(pendingBatchDetail)} style={{
              width: "100%", padding: "14px", border: "none", borderRadius: 12,
              background: C.blue, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <Calculator size={16} /> Barchasini yakunlash ({pendingBatchDetail.length} ta)
            </button>
          )}
        </div>
      )}

      {/* ── HISTORY TAB — LIST ── */}
      {tab === "history" && !historyBatchDetail && (
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", minHeight: "calc(100vh - 380px)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: `1px solid #f0f7ff`, background: "#f8fbff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <History size={15} color={C.th} />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Yakunlangan zayavkalar</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {(["bugun", "hafta", "oy", "barchasi"] as const).map(p => (
                <button key={p} onClick={() => setHistoryFilter(p)} style={{
                  padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: "pointer",
                  border: `1px solid ${historyFilter === p ? C.blue : C.border}`,
                  background: historyFilter === p ? C.blue : "#fff",
                  color: historyFilter === p ? "#fff" : C.muted,
                  transition: "all .15s",
                }}>
                  {p === "bugun" ? "Bugun" : p === "hafta" ? "Hafta" : p === "oy" ? "Oy" : "Hammasi"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 40px", padding: "10px 20px", background: "#f8fbff", borderBottom: `1px solid #f0f7ff` }}>
            {["Zayavka", "So'rovchi", "Jami summa", "Sana", ""].map((h, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 700, color: C.th, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
            ))}
          </div>

          {finalizedLoading ? (
            <div style={{ padding: 16 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 56, background: "#f0f7ff", borderRadius: 8, marginBottom: 8 }} />)}
            </div>
          ) : historyBatches.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 64, color: C.muted }}>
              <History size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ fontSize: 13 }}>Tarix bo'sh</p>
            </div>
          ) : historyBatches.map((batch, i) => {
            const first = batch[0];
            const batchKey = first.batchId || first.id;
            const total = batch.reduce((s, r) => s + (r.finalAmount || 0), 0);
            return (
              <div key={batchKey}
                onClick={() => setHistoryBatchDetail(batch)}
                style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 40px", padding: "14px 20px", borderBottom: i < historyBatches.length - 1 ? `1px solid #f5f9fe` : "none", alignItems: "center", cursor: "pointer" }}
                className="hover:bg-[#f8fbff] transition-colors"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: C.greenBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <CheckCircle size={15} color={C.green} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Zayavka #{first.requestNumber || batchKey.slice(0, 6)}</p>
                    <p style={{ fontSize: 11, color: C.muted }}>{batch.length} ta mahsulot</p>
                  </div>
                </div>
                <span style={{ fontSize: 13, color: C.text }}>{first.requestedBy?.name || "—"}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{total > 0 ? fmtMoney(total) : "—"}</span>
                <span style={{ fontSize: 12, color: C.muted }}>{fmtDate(first.updatedAt)}</span>
                <ChevronRight size={15} color={C.muted} />
              </div>
            );
          })}
        </div>
      )}

      {/* ── HISTORY BATCH DETAIL ── */}
      {tab === "history" && historyBatchDetail && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <button onClick={() => setHistoryBatchDetail(null)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
              border: "none", borderRadius: 10, background: C.blueBg, color: C.blue,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
              <ChevronLeft size={14} /> Orqaga
            </button>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
                Zayavka #{historyBatchDetail[0].requestNumber}
              </p>
              <p style={{ fontSize: 12, color: C.muted }}>
                {historyBatchDetail[0].requestedBy?.name && `So'rovchi: ${historyBatchDetail[0].requestedBy.name} · `}
                {fmtDate(historyBatchDetail[0].updatedAt)}
              </p>
            </div>
          </div>

          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
            {historyBatchDetail.map((req, i) => {
              const qty = req.receivedQty ?? req.requestedQty;
              return (
                <div key={req.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: i < historyBatchDetail.length - 1 ? `1px solid #f5f9fe` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: C.blueBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Package size={15} color={C.blue} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{req.smetaItem?.name || "Noma'lum"}</p>
                      <p style={{ fontSize: 11, color: C.muted }}>
                        {fmt(qty)} {req.smetaItem?.unit || ""}
                        {req.finalUnitPrice ? ` · ${fmtMoney(req.finalUnitPrice)}/${req.smetaItem?.unit}` : ""}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    {req.finalAmount ? (
                      <p style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{fmtMoney(req.finalAmount)}</p>
                    ) : null}
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.green, background: C.greenBg, borderRadius: 999, padding: "2px 8px" }}>Yakunlandi</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: C.muted }}>Jami</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
              {fmtMoney(historyBatchDetail.reduce((s, r) => s + (r.finalAmount || 0), 0))}
            </span>
          </div>
        </div>
      )}

      {/* ── SINGLE FINALIZE DIALOG ── */}
      <Dialog open={!!finalizeReq} onOpenChange={() => { setFinalizeReq(null); setFinalizeError(null); }}>
        <DialogContent className="max-w-[420px] rounded-[16px] border border-[#dbe7f3] p-0 shadow-xl">
          <DialogHeader className="border-b border-[#dbe7f3] px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-[18px] font-semibold text-[#0c447c]">
              <DollarSign className="h-5 w-5 text-[#185fa5]" /> Narx kiritish
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            {finalizeReq && (
              <div style={{ padding: "12px 16px", borderRadius: 10, background: C.blueBg, border: `1px solid ${C.border}` }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{finalizeReq.smetaItem?.name}</p>
                <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                  {fmt(finalizeReq.receivedQty ?? finalizeReq.requestedQty)} {finalizeReq.smetaItem?.unit}
                  {finalizeReq.smetaItem?.unitPrice ? ` · Smeta: ${fmtMoney(finalizeReq.smetaItem.unitPrice)}` : ""}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-[#0c447c]">
                1 {finalizeReq?.smetaItem?.unit || "dona"} uchun narx (so'm) *
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#85b7eb]" />
                <Input
                  type="number" min={0} autoFocus
                  className="h-11 rounded-[10px] border-[#dbe7f3] pl-9 shadow-none"
                  value={unitPrice}
                  onChange={e => setUnitPrice(e.target.value)}
                  placeholder="Narxni kiriting..."
                />
              </div>
              {finalizeReq?.smetaItem?.unitPrice && unitPrice && Number(unitPrice) !== finalizeReq.smetaItem.unitPrice && (
                <div className="flex items-center gap-1 text-[12px] text-[#b45309]">
                  <AlertTriangle size={12} />
                  Smeta narxidan farq: {fmtMoney(Number(unitPrice) - finalizeReq.smetaItem.unitPrice)}
                </div>
              )}
              {unitPrice && finalizeReq && (
                <div style={{ padding: "10px 14px", borderRadius: 9, background: "#f0f7ff", border: `1px solid ${C.border}` }}>
                  <p style={{ fontSize: 11, color: C.muted }}>Jami summa</p>
                  <p style={{ fontSize: 17, fontWeight: 700, color: C.blue }}>
                    {fmtMoney(Number(unitPrice) * (finalizeReq.receivedQty ?? finalizeReq.requestedQty))}
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="border-t border-[#dbe7f3] px-6 py-4 flex-col gap-2">
            {finalizeError && <p className="text-sm text-red-600 w-full">{finalizeError}</p>}
            <div className="flex gap-2 w-full justify-end">
              <Button variant="outline" className="h-11 rounded-[10px]" onClick={() => { setFinalizeReq(null); setFinalizeError(null); }}>Bekor qilish</Button>
              <Button className="h-11 rounded-[10px]" onClick={handleFinalizeSingle} disabled={finalizing || !unitPrice}>
                {finalizing ? "Saqlanmoqda..." : "Saqlash"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── BATCH FINALIZE DIALOG ── */}
      <Dialog open={!!finalizeBatch} onOpenChange={() => { setFinalizeBatch(null); setFinalizeError(null); }}>
        <DialogContent className="max-w-[500px] rounded-[16px] border border-[#dbe7f3] p-0 shadow-xl">
          <DialogHeader className="border-b border-[#dbe7f3] px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-[18px] font-semibold text-[#0c447c]">
              <Calculator className="h-5 w-5 text-[#185fa5]" /> Barchasini yakunlash
            </DialogTitle>
            {finalizeBatch && (
              <p className="text-[12px] text-[#85b7eb] mt-1">{finalizeBatch.length} ta mahsulot uchun narx kiriting</p>
            )}
          </DialogHeader>
          <div className="px-6 py-4 space-y-3 max-h-[400px] overflow-y-auto">
            {finalizeBatch?.map((req) => {
              const qty = req.receivedQty ?? req.requestedQty;
              const price = Number(batchPrices[req.id] || 0);
              return (
                <div key={req.id} style={{ borderRadius: 10, border: `1px solid ${C.border}`, background: "#f8fbff", padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: C.blueBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Package size={13} color={C.blue} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{req.smetaItem?.name}</p>
                      <p style={{ fontSize: 11, color: C.muted }}>{fmt(qty)} {req.smetaItem?.unit}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ position: "relative", flex: 1 }}>
                      <DollarSign size={13} color={C.muted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                      <Input
                        type="number" min={0}
                        className="h-9 rounded-[8px] border-[#dbe7f3] text-[13px] shadow-none pl-8"
                        value={batchPrices[req.id] || ""}
                        onChange={e => setBatchPrices(p => ({ ...p, [req.id]: e.target.value }))}
                        placeholder="Narx (so'm)"
                      />
                    </div>
                    {price > 0 && (
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.blue, whiteSpace: "nowrap" }}>
                        = {fmtMoney(price * qty)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {finalizeBatch && Object.keys(batchPrices).every(k => batchPrices[k]) && (
            <div style={{ margin: "0 24px 16px", padding: "12px 16px", borderRadius: 10, background: "#f0f7ff", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: C.muted }}>Jami</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.blue }}>
                {fmtMoney(finalizeBatch.reduce((s, r) => s + Number(batchPrices[r.id] || 0) * (r.receivedQty ?? r.requestedQty), 0))}
              </span>
            </div>
          )}
          <DialogFooter className="border-t border-[#dbe7f3] px-6 py-4 flex-col gap-2">
            {finalizeError && <p className="text-sm text-red-600 w-full">{finalizeError}</p>}
            <div className="flex gap-2 w-full justify-end">
              <Button variant="outline" className="h-11 rounded-[10px]" onClick={() => { setFinalizeBatch(null); setFinalizeError(null); }}>Bekor qilish</Button>
              <Button className="h-11 rounded-[10px]" onClick={handleFinalizeBatch}
                disabled={finalizing || !finalizeBatch?.every(r => batchPrices[r.id])}>
                {finalizing ? "Saqlanmoqda..." : "Barchasini saqlash"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
