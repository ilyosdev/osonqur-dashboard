import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Package, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight,
  Plus, Minus, Search, Warehouse, Boxes, Truck, CheckCircle,
  ChevronLeft, ChevronRight, History, Clock, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/shared/table-pagination";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useApi, useMutation } from "@/hooks/use-api";
import { warehousesApi, Warehouse as WarehouseType, WarehouseItem, WarehouseLog } from "@/lib/api/warehouses";
import { requestsApi, PurchaseRequest } from "@/lib/api/requests";
import { smetaItemsApi, SmetaItem } from "@/lib/api/smeta-items";
import { usePermission } from "@/hooks";

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
  red:     "#991b1b",
  redBg:   "#fee2e2",
  purple:  "#7c3aed",
  purpleBg:"#f3e8ff",
};

function fmt(n: number) { return n.toLocaleString("uz-UZ"); }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("uz-UZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

type Tab = "deliveries" | "inventory" | "history" | "warehouses";
type DialogType = "add" | "remove" | "transfer" | "receive" | null;
const ITEMS_PER_PAGE = 20;

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "deliveries", label: "Yetkazmalar",  icon: Truck },
  { id: "inventory",  label: "Ombor",         icon: Boxes },
  { id: "history",    label: "Tarix",          icon: History },
  { id: "warehouses", label: "Omborlar",       icon: Warehouse },
];

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: LucideIcon; color: string }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
        <Icon size={13} color={color} /> {label}
      </div>
      <p style={{ fontSize: 30, fontWeight: 700, color: C.text, lineHeight: 1 }}>{value}</p>
    </div>
  );
}

export default function WarehousePage() {
  const canReceive  = usePermission("warehouse:receive");
  const canTransfer = usePermission("warehouse:transfer");
  const canManage   = usePermission("warehouse:view");

  const location = useLocation();
  const urlTab = (new URLSearchParams(location.search).get("tab") as Tab) || "deliveries";
  const [tab, setTab] = useState<Tab>(urlTab);

  useEffect(() => { setTab(urlTab); }, [urlTab]);
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventorySearch, setInventorySearch] = useState("");
  const [selectedInventoryWarehouse, setSelectedInventoryWarehouse] = useState("");

  // Dialog form
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [targetWarehouse, setTargetWarehouse]     = useState("");
  const [selectedItem, setSelectedItem]           = useState("");
  const [quantity, setQuantity]                   = useState("");
  const [note, setNote]                           = useState("");

  // Batch receive
  const [receiveBatch, setReceiveBatch]           = useState<PurchaseRequest[] | null>(null);
  const [batchQtys, setBatchQtys]                 = useState<Record<string, string>>({});
  const [batchNote, setBatchNote]                 = useState("");
  const [batchReceiving, setBatchReceiving]       = useState(false);

  // Detail
  const [selectedBatch, setSelectedBatch] = useState<PurchaseRequest[] | null>(null);
  const [receivingBatchKey, setReceivingBatchKey] = useState<string | null>(null);
  const [deliveriesPage, setDeliveriesPage] = useState(1);
  const DELIVERIES_PER_PAGE = 10;

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: warehousesRes, loading: whLoading, refetch: refetchWh } =
    useApi(() => warehousesApi.getAll({ limit: 100 }), []);

  const { data: deliveredRes, loading: deliveredLoading, refetch: refetchDelivered } =
    useApi(() => requestsApi.getAll({ status: "DELIVERED", limit: 50 }), []);

  const { data: inTransitRes, loading: transitLoading, refetch: refetchTransit } =
    useApi(() => requestsApi.getAll({ status: "IN_TRANSIT", limit: 50 }), []);

  const { data: itemsRes, loading: itemsLoading, refetch: refetchItems } =
    useApi(
      () => warehousesApi.getAllItems({
        warehouseId: selectedInventoryWarehouse && selectedInventoryWarehouse !== "all" ? selectedInventoryWarehouse : undefined,
        search: inventorySearch || undefined,
        page: inventoryPage,
        limit: ITEMS_PER_PAGE,
      }),
      [selectedInventoryWarehouse, inventorySearch, inventoryPage],
      { enabled: tab === "inventory" }
    );

  const { data: logsRes, loading: logsLoading } =
    useApi(() => warehousesApi.getLogs({ page: 1, limit: 50 }), [], { enabled: tab === "history" });

  const { data: receivedReqsRes, loading: receivedLoading } =
    useApi(() => requestsApi.getAll({ status: "RECEIVED", limit: 100 }), [], { enabled: tab === "history" });

  const { data: finalizedReqsRes, loading: finalizedLoading } =
    useApi(() => requestsApi.getAll({ status: "FINALIZED", limit: 100 }), [], { enabled: tab === "history" });

  const { data: smetaItemsRes } =
    useApi(() => smetaItemsApi.getAll({ limit: 500 }), [], { enabled: !!activeDialog && activeDialog !== "receive" });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const { mutate: addItem,      loading: addingItem }      = useMutation((d: any) => warehousesApi.addItem(d.warehouseId, d));
  const { mutate: removeItem,   loading: removingItem }    = useMutation((d: any) => warehousesApi.removeItem(d.warehouseId, d));
  const { mutate: createTransfer, loading: transferring }  = useMutation((d: any) => warehousesApi.createTransfer(d));

  const warehouses   = warehousesRes?.data || [];
  const delivered    = deliveredRes?.data || [];
  const inTransit    = inTransitRes?.data || [];
  const warehouseItems = itemsRes?.data || [];
  const totalItems   = itemsRes?.total || 0;
  const totalPages   = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const smetaItems   = smetaItemsRes?.data || [];
  const logs         = logsRes?.data || [];

  const allPending = [...inTransit, ...delivered];
  const batchMap = new Map<string, PurchaseRequest[]>();
  for (const req of allPending) {
    const key = req.batchId || req.id;
    if (!batchMap.has(key)) batchMap.set(key, []);
    batchMap.get(key)!.push(req);
  }
  const batches = Array.from(batchMap.values());

  const filteredSmeta = smetaItems.filter((i: SmetaItem) =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetDialog = () => {
    setActiveDialog(null);
    setSelectedWarehouse(""); setTargetWarehouse(""); setSelectedItem("");
    setQuantity(""); setNote(""); setSearchQuery("");
    setReceiveBatch(null); setBatchQtys({}); setBatchNote("");
  };

  const openReceive = (batch: PurchaseRequest[]) => {
    const qtys: Record<string, string> = {};
    batch.forEach(r => { qtys[r.id] = String(r.deliveredQty ?? r.requestedQty); });
    setReceiveBatch(batch); setBatchQtys(qtys); setActiveDialog("receive");
  };

  const handleBatchReceive = async () => {
    if (!receiveBatch || batchReceiving) return;
    setBatchReceiving(true);
    try {
      for (const req of receiveBatch) {
        const qty = Number(batchQtys[req.id] || req.requestedQty);
        // IN_TRANSIT bo'lsa avval DELIVERED ga o'tkazamiz
        if (req.status === "IN_TRANSIT") {
          await requestsApi.markDelivered(req.id, { deliveredQty: qty });
        }
        await requestsApi.confirmReceipt(req.id, { receivedQty: qty, note: batchNote || undefined });
      }
      resetDialog(); setSelectedBatch(null);
      refetchDelivered(); refetchTransit(); refetchItems();
    } catch (e) { console.error("handleBatchReceive error:", e); }
    finally { setBatchReceiving(false); }
  };

  const handleAdd = async () => {
    if (!selectedWarehouse || !selectedItem || !quantity) return;
    await addItem({ warehouseId: selectedWarehouse, smetaItemId: selectedItem, quantity: Number(quantity), note: note || undefined });
    resetDialog(); refetchWh(); refetchItems();
  };

  const handleRemove = async () => {
    if (!selectedWarehouse || !selectedItem || !quantity || !note) return;
    await removeItem({ warehouseId: selectedWarehouse, smetaItemId: selectedItem, quantity: Number(quantity), reason: note });
    resetDialog(); refetchWh(); refetchItems();
  };

  const handleQuickReceive = async (batch: PurchaseRequest[], batchKey: string) => {
    setReceivingBatchKey(batchKey);
    try {
      for (const req of batch) {
        if (req.status === "IN_TRANSIT") {
          await requestsApi.markDelivered(req.id, { deliveredQty: req.requestedQty });
        }
      }
      for (const req of batch) {
        await requestsApi.confirmReceipt(req.id, { receivedQty: req.requestedQty });
      }
      refetchDelivered(); refetchTransit(); refetchItems();
    } catch (e: any) {
      alert(e?.message || "Qabul qilishda xatolik yuz berdi");
    } finally { setReceivingBatchKey(null); }
  };

  const handleTransfer = async () => {
    if (!selectedWarehouse || !targetWarehouse || !selectedItem || !quantity) return;
    await createTransfer({ fromWarehouseId: selectedWarehouse, toWarehouseId: targetWarehouse, smetaItemId: selectedItem, quantity: Number(quantity), transferDate: new Date().toISOString() });
    resetDialog(); refetchWh(); refetchItems();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}>

      {/* Header */}
      {!selectedBatch && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 20, fontWeight: 700, color: C.text }}>Ombor</p>
              <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Materiallar va yetkazmalar</p>
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
            <StatCard label="Omborlar" value={warehouses.length} icon={Warehouse} color={C.blue} />
            <StatCard label="Yo'ldagi yetkazmalar" value={inTransit.length} icon={Truck} color={C.purple} />
            <StatCard label="Qabul kutmoqda" value={delivered.length} icon={Clock} color={C.yellow} />
            <StatCard label="Bugun qabul" value={delivered.filter(r => new Date(r.updatedAt).toDateString() === new Date().toDateString()).length} icon={ArrowDownToLine} color={C.green} />
          </div>
        </>
      )}


      {/* ── YETKAZMALAR ── */}
      {tab === "deliveries" && !selectedBatch && (
        <div className="flex min-h-[calc(100vh-300px)] flex-col overflow-hidden rounded-[12px] border border-[#dbe7f3] bg-white shadow-none">
          {/* Card header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dbe7f3] bg-white px-5 py-3 md:px-6">
            <div className="flex items-center gap-2">
              <Truck className="h-[18px] w-[18px] text-[#378add]" />
              <h3 className="text-[14px] font-semibold tracking-tight text-[#0c447c]">Kutilayotgan yetkazmalar</h3>
            </div>
            <span className="text-[12px] text-[#85b7eb]">{batches.length} ta zayavka</span>
          </div>

          {/* Table header */}
          <div className="grid border-b border-[#f0f7ff] bg-[#f8fbff] px-5 py-[11px]" style={{ gridTemplateColumns: "2fr 1.5fr 1fr 1fr 80px 140px" }}>
            {["Zayavka", "Yetkazuvchi", "Mahsulotlar", "Holat", "Sana", ""].map((h, i) => (
              <span key={i} className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#378add]">{h}</span>
            ))}
          </div>

          <div className="flex-1">
            {(deliveredLoading || transitLoading) ? (
              <div className="p-4 space-y-2">
                {[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-lg bg-[#f0f7ff]" />)}
              </div>
            ) : batches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#85b7eb]">
                <Truck className="mb-3 h-9 w-9 opacity-30" />
                <p className="text-[13px]">Kutilayotgan yetkazma yo'q</p>
              </div>
            ) : batches.slice((deliveriesPage - 1) * DELIVERIES_PER_PAGE, deliveriesPage * DELIVERIES_PER_PAGE).map((batch, i) => {
              const first = batch[0];
              const allDelivered = batch.every(r => r.status === "DELIVERED");
              const hasDelivered = batch.some(r => r.status === "DELIVERED");
              const hasInTransit = batch.some(r => r.status === "IN_TRANSIT");
              const canReceiveBatch = hasDelivered || hasInTransit;
              const batchKey = first.batchId || first.id;
              const statusColor = allDelivered ? C.green : hasDelivered ? C.yellow : C.purple;
              const statusBg    = allDelivered ? C.greenBg : hasDelivered ? C.yellowBg : C.purpleBg;
              const statusLabel = allDelivered ? "Yetkazildi" : hasDelivered ? "Qisman" : "Yo'lda";
              const isReceiving = receivingBatchKey === batchKey;

              return (
                <div key={batchKey}
                  className="grid w-full items-center px-5 py-[14px] transition-colors hover:bg-[#f8fbff]"
                  style={{ gridTemplateColumns: "2fr 1.5fr 1fr 1fr 80px 140px", borderBottom: i < batches.length - 1 ? "1px solid #eef2f7" : "none", cursor: "default" }}
                >
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedBatch(batch)}>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: allDelivered ? C.greenBg : C.purpleBg }}>
                      {allDelivered ? <CheckCircle size={16} color={C.green} /> : <Truck size={16} color={C.purple} />}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[#0c447c]">#{first.requestNumber || batchKey.slice(0, 6)}</p>
                      <p className="text-[11px] text-[#85b7eb]">{batch.length} ta pozitsiya</p>
                    </div>
                  </div>
                  <span className="text-[13px] text-[#0c447c]">
                    {first.assignedDriver?.name || (first.isSelfDelivery ? "O'zim olib keldi" : "—")}
                  </span>
                  <span className="text-[13px] text-[#85b7eb]">
                    {batch.map(r => r.smetaItem?.name).filter(Boolean).slice(0,2).join(", ")}
                    {batch.length > 2 ? "..." : ""}
                  </span>
                  <span className="inline-flex w-fit items-center rounded-full px-[10px] py-1 text-[11px] font-semibold"
                    style={{ color: statusColor, background: statusBg }}>
                    {statusLabel}
                  </span>
                  <span className="text-[12px] text-[#85b7eb]">{new Date(first.updatedAt).toLocaleDateString("uz-UZ")}</span>
                  <div className="flex justify-end">
                    {canReceive && canReceiveBatch && (
                      <button onClick={(e) => { e.stopPropagation(); openReceive(batch); }}
                        className="flex items-center gap-1.5 rounded-[8px] border-none px-3 py-[6px] text-[12px] font-semibold text-white"
                        style={{ background: C.green, cursor: "pointer" }}>
                        <ArrowDownToLine size={13} />
                        Qabul qilish
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <TablePagination
            page={deliveriesPage}
            totalPages={Math.max(1, Math.ceil(batches.length / DELIVERIES_PER_PAGE))}
            onPageChange={setDeliveriesPage}
            summary={`Jami: ${batches.length} ta yetkazma`}
          />
        </div>
      )}

      {/* ── BATCH DETAIL ── */}
      {tab === "deliveries" && selectedBatch && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <button onClick={() => setSelectedBatch(null)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
              border: "none", borderRadius: 10, background: C.blueBg, color: C.blue,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
              <ChevronLeft size={14} /> Orqaga
            </button>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
                Zayavka #{selectedBatch[0].requestNumber}
              </p>
              <p style={{ fontSize: 12, color: C.muted }}>
                {selectedBatch[0].requestedBy?.name && `So'rovchi: ${selectedBatch[0].requestedBy.name} · `}
                {fmtDate(selectedBatch[0].createdAt)}
              </p>
            </div>
          </div>

          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
            {selectedBatch.map((req, i) => {
              const qty = req.status === "DELIVERED" ? (req.deliveredQty ?? req.requestedQty) : (req.collectedQty ?? req.requestedQty);
              const statusColor = req.status === "DELIVERED" ? C.green : C.purple;
              const statusBg    = req.status === "DELIVERED" ? C.greenBg : C.purpleBg;
              const statusLabel = req.status === "DELIVERED" ? "Yetkazildi" : "Yo'lda";
              return (
                <div key={req.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: i < selectedBatch.length - 1 ? `1px solid #f5f9fe` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: C.blueBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Package size={15} color={C.blue} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{req.smetaItem?.name || "Noma'lum"}</p>
                      <p style={{ fontSize: 11, color: C.muted }}>{fmt(qty)} {req.smetaItem?.unit || ""}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: statusColor, background: statusBg, borderRadius: 999, padding: "3px 10px" }}>{statusLabel}</span>
                </div>
              );
            })}
          </div>

          {selectedBatch.some(r => r.status === "DELIVERED" || r.status === "IN_TRANSIT") && canReceive && (
            <button onClick={() => openReceive(selectedBatch.filter(r => r.status === "DELIVERED" || r.status === "IN_TRANSIT"))} style={{
              width: "100%", padding: "14px", border: "none", borderRadius: 12,
              background: C.blue, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <ArrowDownToLine size={16} />
              Qabul qilish ({selectedBatch.filter(r => r.status === "DELIVERED" || r.status === "IN_TRANSIT").length} ta material)
            </button>
          )}
        </div>
      )}

      {/* ── INVENTORY ── */}
      {tab === "inventory" && (
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", minHeight: "calc(100vh - 320px)", display: "flex", flexDirection: "column" }}>
          {/* Card header with action buttons */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: `1px solid #f0f7ff`, background: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Boxes size={16} color={C.th} />
              <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Ombordagi materiallar</span>
            </div>
            {canManage && (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setActiveDialog("add")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 13px", borderRadius: 9, border: "none", background: C.blue, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  <Plus size={13} /> Kirim
                </button>
                <button onClick={() => setActiveDialog("remove")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 13px", borderRadius: 9, border: `1px solid ${C.border}`, background: "#fff", color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  <Minus size={13} /> Chiqim
                </button>
                <button onClick={() => setActiveDialog("transfer")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 13px", borderRadius: 9, border: `1px solid ${C.border}`, background: "#fff", color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  <ArrowLeftRight size={13} /> Ko'chirish
                </button>
              </div>
            )}
          </div>

          {/* Search & filter */}
          <div style={{ display: "flex", gap: 10, padding: "14px 20px", borderBottom: `1px solid #f0f7ff` }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={13} color={C.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <input placeholder="Qidirish..." value={inventorySearch}
                onChange={e => { setInventorySearch(e.target.value); setInventoryPage(1); }}
                style={{ width: "100%", padding: "8px 12px 8px 32px", border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 13, color: C.text, background: "#f8fbff", outline: "none", boxSizing: "border-box" }} />
            </div>
            <select value={selectedInventoryWarehouse} onChange={e => setSelectedInventoryWarehouse(e.target.value)}
              style={{ padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 13, color: C.text, background: "#f8fbff", outline: "none", minWidth: 160 }}>
              <option value="">Barcha omborlar</option>
              {warehouses.map((w: WarehouseType) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "40px 2fr 1fr 1fr 1fr", padding: "10px 20px", background: "#f8fbff", borderBottom: `1px solid #f0f7ff` }}>
            {["#", "Material", "Ombor", "Miqdor", "Yangilangan"].map((h, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 700, color: C.th, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
            ))}
          </div>

          {itemsLoading ? (
            <div style={{ padding: 16 }}>
              {[1,2,3,4,5].map(i => <div key={i} style={{ height: 48, background: "#f0f7ff", borderRadius: 8, marginBottom: 8 }} />)}
            </div>
          ) : warehouseItems.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.muted, padding: 48 }}>
              <Boxes size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ fontSize: 13 }}>Inventar bo'sh</p>
            </div>
          ) : (
            <>
              {warehouseItems.map((item: WarehouseItem & { name?: string; unit?: string }, i: number) => {
                const rowNum = (inventoryPage - 1) * ITEMS_PER_PAGE + i + 1;
                return (
                <div key={item.id} style={{ display: "grid", gridTemplateColumns: "40px 2fr 1fr 1fr 1fr", padding: "12px 20px", borderBottom: i < warehouseItems.length - 1 ? `1px solid #f5f9fe` : "none", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{rowNum}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: C.blueBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Package size={13} color={C.blue} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{item.name || "—"}</span>
                  </div>
                  <span style={{ fontSize: 13, color: C.muted }}>{warehouses.find((w: WarehouseType) => w.id === item.warehouseId)?.name || "—"}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{fmt(item.quantity)} {item.unit || ""}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{fmtDate(item.updatedAt)}</span>
                </div>
                );
              })}
              <div style={{ flex: 1 }} />
              {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: `1px solid #f0f7ff` }}>
                  <span style={{ fontSize: 12, color: C.muted }}>{totalItems} ta element</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setInventoryPage(p => Math.max(1, p - 1))} disabled={inventoryPage === 1}
                      style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: C.text, fontSize: 12, cursor: "pointer", opacity: inventoryPage === 1 ? 0.4 : 1 }}>
                      <ChevronLeft size={14} />
                    </button>
                    <span style={{ padding: "6px 12px", fontSize: 12, color: C.text }}>{inventoryPage} / {totalPages}</span>
                    <button onClick={() => setInventoryPage(p => Math.min(totalPages, p + 1))} disabled={inventoryPage === totalPages}
                      style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: C.text, fontSize: 12, cursor: "pointer", opacity: inventoryPage === totalPages ? 0.4 : 1 }}>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TARIX ── */}
      {tab === "history" && (() => {
        const receivedReqs: PurchaseRequest[] = receivedReqsRes?.data || [];
        const finalizedReqs: PurchaseRequest[] = finalizedReqsRes?.data || [];
        const allReceivedReqs = [...receivedReqs, ...finalizedReqs].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        const histLoading = logsLoading || receivedLoading || finalizedLoading;
        const hasData = logs.length > 0 || allReceivedReqs.length > 0;

        return (
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", minHeight: "calc(100vh - 320px)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", background: "#f8fbff", borderBottom: `1px solid #f0f7ff` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <History size={15} color={C.th} />
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Ombor tarixi</span>
              </div>
              <span style={{ fontSize: 12, color: C.muted }}>{allReceivedReqs.length + logs.length} ta yozuv</span>
            </div>

            {histLoading ? (
              <div style={{ padding: 16 }}>
                {[1,2,3,4].map(i => <div key={i} style={{ height: 56, background: "#f0f7ff", borderRadius: 8, marginBottom: 8 }} />)}
              </div>
            ) : !hasData ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 56, color: C.muted }}>
                <History size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
                <p style={{ fontSize: 13 }}>Tarix bo'sh</p>
              </div>
            ) : (
              <>
                {/* Zayavka orqali qabul qilinganlar */}
                {allReceivedReqs.length > 0 && (
                  <>
                    <div style={{ padding: "8px 20px 6px", background: "#f0f7ff", borderBottom: `1px solid #e6f1fb` }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.th, textTransform: "uppercase", letterSpacing: "0.04em" }}>Zayavka orqali qabul</span>
                    </div>
                    {allReceivedReqs.map((req, i) => {
                      const isFinalized = req.status === "FINALIZED";
                      const qty = req.receivedQty ?? req.requestedQty;
                      return (
                        <div key={req.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", padding: "13px 20px", borderBottom: `1px solid #f5f9fe`, alignItems: "center", gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 9, background: isFinalized ? C.blueBg : C.greenBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <ArrowDownToLine size={15} color={isFinalized ? C.blue : C.green} />
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                              Qabul #{req.requestNumber}
                              {(req as any).receivedBy?.name ? ` · ${(req as any).receivedBy.name}` : ""}
                            </p>
                            <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                              {req.smetaItem?.name || "Noma'lum"} · {fmt(qty)} {req.smetaItem?.unit || ""}
                              {(req as any).supplier?.name ? ` · ${(req as any).supplier.name}` : ""}
                            </p>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: isFinalized ? C.blue : C.green, background: isFinalized ? C.blueBg : C.greenBg, borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>
                            {isFinalized ? "Yakunlandi" : "Qabul qilindi"}
                          </span>
                          <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>{fmtDate(req.updatedAt)}</span>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Qo'lda kirim/chiqim loglari */}
                {logs.length > 0 && (
                  <>
                    <div style={{ padding: "8px 20px 6px", background: "#f0f7ff", borderBottom: `1px solid #e6f1fb` }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.th, textTransform: "uppercase", letterSpacing: "0.04em" }}>Qo'lda kirim / chiqim</span>
                    </div>
                    {logs.map((log: WarehouseLog, i: number) => {
                      const isIn = log.type === "IN";
                      const summary = log.items.map(it => `${it.itemName} ${fmt(it.quantity)} ${it.unit}`).join(", ");
                      const by = log.items[0]?.createdBy?.name;
                      return (
                        <div key={log.batchId} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", padding: "13px 20px", borderBottom: i < logs.length - 1 ? `1px solid #f5f9fe` : "none", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 9, background: isIn ? C.greenBg : C.redBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {isIn ? <ArrowDownToLine size={15} color={C.green} /> : <ArrowUpFromLine size={15} color={C.red} />}
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{isIn ? "Kirim" : "Chiqim"}{by ? ` · ${by}` : ""}</p>
                            <p style={{ fontSize: 11, color: C.muted, marginTop: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: 400 }}>{summary}</p>
                          </div>
                          <span style={{ fontSize: 12, color: C.muted }}>{fmtDate(log.createdAt)}</span>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
        );
      })()}

      {/* ── OMBORLAR ── */}
      {tab === "warehouses" && (
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", minHeight: "calc(100vh - 320px)" }}>
          {whLoading ? (
            <div style={{ padding: 16 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 56, background: "#f0f7ff", borderRadius: 8, marginBottom: 8 }} />)}
            </div>
          ) : warehouses.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 56, color: C.muted }}>
              <Warehouse size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ fontSize: 13 }}>Omborlar yo'q</p>
            </div>
          ) : warehouses.map((wh: WarehouseType, i: number) => (
            <div key={wh.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: i < warehouses.length - 1 ? `1px solid #f5f9fe` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: C.blueBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Warehouse size={16} color={C.blue} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{wh.name}</p>
                  {wh.location && <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{wh.location}</p>}
                </div>
              </div>
              <span style={{ fontSize: 11, color: C.muted }}>{fmtDate(wh.createdAt)}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── KIRIM DIALOGI ── */}
      <Dialog open={activeDialog === "add"} onOpenChange={resetDialog}>
        <DialogContent className="max-w-[460px] rounded-[16px] border border-[#dbe7f3] p-0 shadow-xl">
          <DialogHeader className="border-b border-[#dbe7f3] px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-[18px] font-semibold text-[#0c447c]">
              <ArrowDownToLine className="h-5 w-5 text-[#185fa5]" /> Material kirim
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-[#0c447c]">Ombor *</Label>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger className="h-11 rounded-[10px] border-[#dbe7f3]"><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                <SelectContent>{warehouses.map((w: WarehouseType) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-[#0c447c]">Material *</Label>
              <div className="relative mb-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#85b7eb]" />
                <Input placeholder="Qidirish..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-9 rounded-[9px] border-[#dbe7f3] pl-9 text-[13px] shadow-none" />
              </div>
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger className="h-11 rounded-[10px] border-[#dbe7f3]"><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                <SelectContent>{filteredSmeta.slice(0, 30).map((i: SmetaItem) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.unit})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[13px] font-medium text-[#0c447c]">Miqdor *</Label>
                <Input type="number" min={1} placeholder="0" value={quantity} onChange={e => setQuantity(e.target.value)} className="h-11 rounded-[10px] border-[#dbe7f3] shadow-none" />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-medium text-[#0c447c]">Izoh</Label>
                <Input placeholder="Ixtiyoriy" value={note} onChange={e => setNote(e.target.value)} className="h-11 rounded-[10px] border-[#dbe7f3] shadow-none" />
              </div>
            </div>
          </div>
          <DialogFooter className="border-t border-[#dbe7f3] px-6 py-4">
            <Button variant="outline" className="h-11 rounded-[10px]" onClick={resetDialog}>Bekor qilish</Button>
            <Button className="h-11 rounded-[10px]" onClick={handleAdd} disabled={addingItem || !selectedWarehouse || !selectedItem || !quantity}>
              {addingItem ? "Saqlanmoqda..." : "Kirim qilish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CHIQIM DIALOGI ── */}
      <Dialog open={activeDialog === "remove"} onOpenChange={resetDialog}>
        <DialogContent className="max-w-[460px] rounded-[16px] border border-[#dbe7f3] p-0 shadow-xl">
          <DialogHeader className="border-b border-[#dbe7f3] px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-[18px] font-semibold text-[#0c447c]">
              <ArrowUpFromLine className="h-5 w-5 text-[#991b1b]" /> Material chiqim
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-[#0c447c]">Ombor *</Label>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger className="h-11 rounded-[10px] border-[#dbe7f3]"><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                <SelectContent>{warehouses.map((w: WarehouseType) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-[#0c447c]">Material *</Label>
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger className="h-11 rounded-[10px] border-[#dbe7f3]"><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                <SelectContent>{smetaItems.slice(0, 30).map((i: SmetaItem) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.unit})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-[#0c447c]">Miqdor *</Label>
              <Input type="number" min={1} placeholder="0" value={quantity} onChange={e => setQuantity(e.target.value)} className="h-11 rounded-[10px] border-[#dbe7f3] shadow-none" />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-[#0c447c]">Sabab *</Label>
              <Textarea placeholder="Chiqim sababi..." value={note} onChange={e => setNote(e.target.value)} className="rounded-[10px] border-[#dbe7f3] shadow-none" rows={2} />
            </div>
          </div>
          <DialogFooter className="border-t border-[#dbe7f3] px-6 py-4">
            <Button variant="outline" className="h-11 rounded-[10px]" onClick={resetDialog}>Bekor qilish</Button>
            <Button variant="destructive" className="h-11 rounded-[10px]" onClick={handleRemove} disabled={removingItem || !selectedWarehouse || !selectedItem || !quantity || !note}>
              {removingItem ? "Chiqarilmoqda..." : "Chiqim qilish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── KO'CHIRISH DIALOGI ── */}
      <Dialog open={activeDialog === "transfer"} onOpenChange={resetDialog}>
        <DialogContent className="max-w-[460px] rounded-[16px] border border-[#dbe7f3] p-0 shadow-xl">
          <DialogHeader className="border-b border-[#dbe7f3] px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-[18px] font-semibold text-[#0c447c]">
              <ArrowLeftRight className="h-5 w-5 text-[#185fa5]" /> Omborlar arasi ko'chirish
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[13px] font-medium text-[#0c447c]">Qayerdan *</Label>
                <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                  <SelectTrigger className="h-11 rounded-[10px] border-[#dbe7f3]"><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                  <SelectContent>{warehouses.map((w: WarehouseType) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-medium text-[#0c447c]">Qayerga *</Label>
                <Select value={targetWarehouse} onValueChange={setTargetWarehouse}>
                  <SelectTrigger className="h-11 rounded-[10px] border-[#dbe7f3]"><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                  <SelectContent>{warehouses.filter((w: WarehouseType) => w.id !== selectedWarehouse).map((w: WarehouseType) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-[#0c447c]">Material *</Label>
              <div className="relative mb-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#85b7eb]" />
                <Input placeholder="Qidirish..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-9 rounded-[9px] border-[#dbe7f3] pl-9 text-[13px] shadow-none" />
              </div>
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger className="h-11 rounded-[10px] border-[#dbe7f3]"><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                <SelectContent>{filteredSmeta.slice(0, 30).map((i: SmetaItem) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.unit})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-[#0c447c]">Miqdor *</Label>
              <Input type="number" min={1} placeholder="0" value={quantity} onChange={e => setQuantity(e.target.value)} className="h-11 rounded-[10px] border-[#dbe7f3] shadow-none" />
            </div>
          </div>
          <DialogFooter className="border-t border-[#dbe7f3] px-6 py-4">
            <Button variant="outline" className="h-11 rounded-[10px]" onClick={resetDialog}>Bekor qilish</Button>
            <Button className="h-11 rounded-[10px]" onClick={handleTransfer} disabled={transferring || !selectedWarehouse || !targetWarehouse || !selectedItem || !quantity}>
              {transferring ? "Ko'chirilmoqda..." : "Ko'chirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── QABUL QILISH DIALOGI ── */}
      <Dialog open={activeDialog === "receive"} onOpenChange={resetDialog}>
        <DialogContent className="max-w-[500px] rounded-[16px] border border-[#dbe7f3] p-0 shadow-xl">
          <DialogHeader className="border-b border-[#dbe7f3] px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-[18px] font-semibold text-[#0c447c]">
              <ArrowDownToLine className="h-5 w-5 text-[#166534]" /> Mahsulotlarni qabul qilish
            </DialogTitle>
            {receiveBatch && (
              <p className="text-[12px] text-[#85b7eb] mt-1">{receiveBatch.length} ta mahsulot · miqdorlarni tekshiring</p>
            )}
          </DialogHeader>
          <div className="px-6 py-4 space-y-2 max-h-[400px] overflow-y-auto">
            {receiveBatch?.map((req, i) => {
              const isDelivered = req.status === "DELIVERED";
              const statusColor = isDelivered ? C.green : C.purple;
              const statusBg    = isDelivered ? C.greenBg : C.purpleBg;
              const statusLabel = isDelivered ? "Yetkazildi" : "Yo'lda";
              return (
                <div key={req.id} className="rounded-[10px] border border-[#dbe7f3] bg-[#f8fbff] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]" style={{ background: C.blueBg }}>
                        <Package size={13} color={C.blue} />
                      </div>
                      <p className="text-[13px] font-semibold text-[#0c447c]">{req.smetaItem?.name || "Noma'lum"}</p>
                    </div>
                    <span className="text-[10px] font-semibold rounded-full px-2 py-0.5" style={{ color: statusColor, background: statusBg }}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pl-9">
                    <span className="text-[12px] text-[#85b7eb] shrink-0 w-16">Miqdor:</span>
                    <Input
                      type="number" min={0}
                      className="h-8 rounded-[8px] border-[#dbe7f3] text-[13px] shadow-none"
                      value={batchQtys[req.id] ?? String(req.requestedQty)}
                      onChange={e => setBatchQtys(p => ({ ...p, [req.id]: e.target.value }))}
                    />
                    <span className="text-[12px] text-[#85b7eb] shrink-0 w-10">{req.smetaItem?.unit || ""}</span>
                  </div>
                  {req.requestedQty && (
                    <p className="text-[11px] text-[#85b7eb] pl-9 mt-1">So'ralgan: {req.requestedQty} {req.smetaItem?.unit || ""}</p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="px-6 pb-4 space-y-2">
            <Label className="text-[13px] font-medium text-[#0c447c]">Izoh (ixtiyoriy)</Label>
            <Textarea placeholder="Qo'shimcha ma'lumot..." value={batchNote} onChange={e => setBatchNote(e.target.value)} className="rounded-[10px] border-[#dbe7f3] shadow-none" rows={2} />
          </div>
          <DialogFooter className="border-t border-[#dbe7f3] px-6 py-4">
            <Button variant="outline" className="h-11 rounded-[10px]" onClick={resetDialog}>Bekor qilish</Button>
            <Button className="h-11 rounded-[10px] bg-[#166534] hover:bg-[#14532d]" onClick={handleBatchReceive} disabled={batchReceiving}>
              {batchReceiving ? "Qabul qilinmoqda..." : `Hammasini qabul qilish (${receiveBatch?.length ?? 0})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
