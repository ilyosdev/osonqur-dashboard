import { useState } from "react";
import { Plus, History, Package, Loader2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/use-api";
import { useAuth } from "@/lib/auth";
import { suppliersApi, Supplier } from "@/lib/api/suppliers";
import { smetaItemsApi, SmetaItem } from "@/lib/api/smeta-items";

function fmt(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + " mln";
  return num.toLocaleString("uz-UZ");
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("uz-UZ", { day: "numeric", month: "short", year: "numeric" });
}

type Period = "bugun" | "hafta" | "oy" | "barchasi";

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: "Kutilmoqda",    color: "#b45309", bg: "#fef9c3" },
  APPROVED:   { label: "Tasdiqlangan",  color: "#185fa5", bg: "#e6f1fb" },
  IN_TRANSIT: { label: "Yo'lda",        color: "#7c3aed", bg: "#f3e8ff" },
  DELIVERED:  { label: "Yetkazildi",    color: "#166534", bg: "#dcfce7" },
  RECEIVED:   { label: "Qabul qilindi", color: "#166534", bg: "#dcfce7" },
  FINALIZED:  { label: "Yakunlandi",    color: "#374151", bg: "#f3f4f6" },
  REJECTED:   { label: "Rad etildi",    color: "#991b1b", bg: "#fee2e2" },
  COMPLETED:  { label: "Bajarildi",     color: "#166534", bg: "#dcfce7" },
};

const C = {
  blue:   "#185fa5",
  blueBg: "#e6f1fb",
  border: "#daeaf8",
  text:   "#0c447c",
  muted:  "#85b7eb",
  th:     "#378add",
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] || { label: status, color: "#374151", bg: "#f3f4f6" };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

export default function SupplyPage() {
  const { hasPermission } = useAuth();
  const canCreateOrder = hasPermission("order:edit");

  const [period, setPeriod] = useState<Period>("hafta");
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [orderForm, setOrderForm] = useState({ supplierId: "", smetaItemId: "", quantity: "", unitPrice: "" });
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const { data: ordersData, loading: ordersLoading, refetch: refetchOrders } =
    useApi(() => suppliersApi.getOrders({ limit: 200 }), []);

  const { data: suppliersData } =
    useApi(() => suppliersApi.getAll({ limit: 200 }), [], { enabled: showOrderDialog });

  const { data: smetaItemsData } =
    useApi(() => smetaItemsApi.getAll({ limit: 500, itemType: "MATERIAL" }), [], { enabled: showOrderDialog });

  const allOrders = ordersData?.data || [];
  const suppliers: Supplier[] = suppliersData?.data || [];
  const smetaItems: SmetaItem[] = smetaItemsData?.data || [];

  const now = new Date();
  const filteredOrders = allOrders.filter(o => {
    if (period === "barchasi") return true;
    const d = new Date(o.createdAt);
    if (period === "bugun") return d.toDateString() === now.toDateString();
    const days = period === "hafta" ? 7 : 30;
    return (now.getTime() - d.getTime()) < days * 86400000;
  });

  const handleCreateOrder = async () => {
    if (!orderForm.supplierId || !orderForm.smetaItemId || !orderForm.quantity || !orderForm.unitPrice) return;
    setOrderLoading(true); setOrderError(null);
    try {
      await suppliersApi.createOrder({
        supplierId: orderForm.supplierId,
        smetaItemId: orderForm.smetaItemId,
        quantity: Number(orderForm.quantity),
        unitPrice: Number(orderForm.unitPrice),
        orderDate: new Date().toISOString(),
      });
      setShowOrderDialog(false);
      setOrderForm({ supplierId: "", smetaItemId: "", quantity: "", unitPrice: "" });
      refetchOrders();
    } catch (e: any) { setOrderError(e?.message || "Xatolik"); }
    finally { setOrderLoading(false); }
  };

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 20, fontWeight: 700, color: C.text }}>Buyurtmalar</p>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{filteredOrders.length} ta buyurtma</p>
        </div>
        {canCreateOrder && (
          <button onClick={() => setShowOrderDialog(true)} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "9px 18px", border: "none", borderRadius: 10,
            background: C.blue, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 2px 8px rgba(24,95,165,.25)",
          }}>
            <Plus size={15} /> Buyurtma yaratish
          </button>
        )}
      </div>

      {/* Period filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(["bugun", "hafta", "oy", "barchasi"] as Period[]).map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: "pointer",
            border: `1px solid ${period === p ? C.blue : C.border}`,
            background: period === p ? C.blue : "#fff",
            color: period === p ? "#fff" : C.muted,
          }}>
            {p === "bugun" ? "Bugun" : p === "hafta" ? "Hafta" : p === "oy" ? "Oy" : "Hammasi"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", minHeight: "calc(100vh - 220px)", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 1fr 1fr", padding: "11px 20px", background: "#f8fbff", borderBottom: `1px solid #f0f7ff` }}>
          {["Postavshik", "Material", "Miqdor", "Narx", "Jami", "Sana", "Holat"].map((h, i) => (
            <span key={i} style={{ fontSize: 11, fontWeight: 700, color: C.th, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
          ))}
        </div>

        {ordersLoading ? (
          <div style={{ padding: 16 }}>
            {[1,2,3,4,5].map(i => <div key={i} style={{ height: 52, background: "#f0f7ff", borderRadius: 8, marginBottom: 8 }} />)}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.muted, padding: 56 }}>
            <History size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ fontSize: 13 }}>Bu davrda buyurtmalar yo'q</p>
          </div>
        ) : filteredOrders.map((order, i) => {
          const supplier = suppliers.find(s => s.id === order.supplierId);
          const smetaItem = smetaItems.find(si => si.id === order.smetaItemId);
          return (
            <div key={order.id} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 1fr 1fr", padding: "13px 20px", borderBottom: i < filteredOrders.length - 1 ? `1px solid #f5f9fe` : "none", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: C.blueBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Store size={14} color={C.blue} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{supplier?.name || "—"}</span>
              </div>
              <span style={{ fontSize: 13, color: C.text }}>{smetaItem?.name || "—"}</span>
              <span style={{ fontSize: 13, color: C.text }}>{order.quantity} {smetaItem?.unit || ""}</span>
              <span style={{ fontSize: 13, color: C.text }}>{fmt(order.unitPrice)} so'm</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{fmt(order.totalPrice)} so'm</span>
              <span style={{ fontSize: 12, color: C.muted }}>{fmtDate(order.orderDate || order.createdAt)}</span>
              <StatusBadge status={order.status} />
            </div>
          );
        })}
      </div>

      {/* Buyurtma yaratish dialogi */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-[480px] rounded-[16px] border border-[#dbe7f3] p-0 shadow-xl">
          <DialogHeader className="border-b border-[#dbe7f3] px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-[18px] font-semibold text-[#0c447c]">
              <Package className="h-5 w-5 text-[#185fa5]" /> Yangi buyurtma
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-[#0c447c]">Postavshik *</Label>
              <Select value={orderForm.supplierId} onValueChange={v => setOrderForm(f => ({ ...f, supplierId: v }))}>
                <SelectTrigger className="h-11 rounded-[10px] border-[#dbe7f3]"><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-[#0c447c]">Material *</Label>
              <Select value={orderForm.smetaItemId} onValueChange={v => {
                const item = smetaItems.find(i => i.id === v);
                setOrderForm(f => ({ ...f, smetaItemId: v, unitPrice: item ? String(item.unitPrice) : f.unitPrice }));
              }}>
                <SelectTrigger className="h-11 rounded-[10px] border-[#dbe7f3]"><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                <SelectContent>{smetaItems.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.unit})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-[13px] font-medium text-[#0c447c]">Miqdor *</Label>
                <Input type="number" min={1} placeholder="0" value={orderForm.quantity}
                  onChange={e => setOrderForm(f => ({ ...f, quantity: e.target.value }))}
                  className="h-11 rounded-[10px] border-[#dbe7f3] bg-white shadow-none" />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-medium text-[#0c447c]">Narx (so'm) *</Label>
                <Input type="number" min={0} placeholder="0" value={orderForm.unitPrice}
                  onChange={e => setOrderForm(f => ({ ...f, unitPrice: e.target.value }))}
                  className="h-11 rounded-[10px] border-[#dbe7f3] bg-white shadow-none" />
              </div>
            </div>
            {orderForm.quantity && orderForm.unitPrice && (
              <div style={{ padding: "12px 16px", borderRadius: 10, background: "#f0f7ff", border: `1px solid ${C.border}` }}>
                <p style={{ fontSize: 11, color: C.muted }}>Jami summa</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: C.blue }}>{fmt(Number(orderForm.quantity) * Number(orderForm.unitPrice))} so'm</p>
              </div>
            )}
            {orderError && <p className="text-sm text-red-600">{orderError}</p>}
          </div>
          <DialogFooter className="border-t border-[#dbe7f3] px-6 py-4">
            <Button variant="outline" className="h-11 rounded-[10px]" onClick={() => setShowOrderDialog(false)}>Bekor qilish</Button>
            <Button className="h-11 rounded-[10px]" onClick={handleCreateOrder}
              disabled={orderLoading || !orderForm.supplierId || !orderForm.smetaItemId || !orderForm.quantity || !orderForm.unitPrice}>
              {orderLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Buyurtma berish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
