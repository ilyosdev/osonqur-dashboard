import { useState } from "react";
import {
  Store, ShoppingCart, CreditCard, History, Plus, DollarSign,
  CheckCircle, Clock, Truck, ChevronRight, ArrowLeft, Phone,
  Package, Search, AlertCircle, Loader2, ChevronLeft,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useApi, useMutation } from "@/hooks/use-api";
import { useAuth } from "@/lib/auth";
import { requestsApi, PurchaseRequest } from "@/lib/api/requests";
import { suppliersApi, Supplier, SupplierDebt } from "@/lib/api/suppliers";
import { smetaItemsApi, SmetaItem } from "@/lib/api/smeta-items";
import { analyticsApi } from "@/lib/api/analytics";
import { StatsSkeleton } from "@/components/ui/table-skeleton";
import { ErrorMessage } from "@/components/ui/error-message";
import { useProject } from "@/lib/project-context";

function fmt(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + " mln";
  return num.toLocaleString("uz-UZ");
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("uz-UZ", { day: "numeric", month: "short" });
}

type Period = "bugun" | "hafta" | "oy" | "barchasi";
type View = "main" | "supplier-detail";

function getPeriodDates(period: Period) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (period === "bugun") { const t = iso(now); return { startDate: t, endDate: t }; }
  if (period === "hafta") { const f = new Date(now); f.setDate(now.getDate() - 7); return { startDate: iso(f), endDate: iso(now) }; }
  if (period === "oy") { const f = new Date(now); f.setDate(now.getDate() - 30); return { startDate: iso(f), endDate: iso(now) }; }
  return {};
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING:    { label: "Kutilmoqda",    className: "bg-yellow-100 text-yellow-700" },
  PROCESSING: { label: "Jarayonda",     className: "bg-blue-100 text-blue-700" },
  COMPLETED:  { label: "Bajarildi",     className: "bg-green-100 text-green-700" },
  DELIVERED:  { label: "Yetkazildi",    className: "bg-green-100 text-green-700" },
  CANCELLED:  { label: "Bekor qilindi", className: "bg-red-100 text-red-700" },
};

export default function SupplyPage() {
  const { user, hasPermission } = useAuth();
  const { selectedProjectId } = useProject();

  const canViewOrders    = hasPermission("order:view");
  const canViewSuppliers = hasPermission("supplier:view");
  const canViewDebts     = hasPermission("supplier_debt:view") || hasPermission("debt:view");
  const canPayDebts      = hasPermission("supplier_debt:pay");
  const canCreateSupplier = hasPermission("supplier:create");

  // View state
  const [view, setView] = useState<View>("main");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Active section inside main
  type Section = "zayavkalar" | "buyurtmalar" | "postavshiklar" | "qarzlar" | "tarix";
  const defaultSection: Section = canViewOrders ? "zayavkalar" : canViewSuppliers ? "postavshiklar" : "qarzlar";
  const [section, setSection] = useState<Section>(defaultSection);

  // Filters
  const [orderPeriod, setOrderPeriod] = useState<Period>("hafta");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [debtPage, setDebtPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);

  // Add supplier dialog
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", phone: "", contactPerson: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Yangi buyurtma dialog
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [orderForm, setOrderForm] = useState({ supplierId: "", smetaItemId: "", quantity: "", unitPrice: "" });
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Assign supplier dialog
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignRequest, setAssignRequest] = useState<PurchaseRequest | null>(null);
  const [assignSupplierId, setAssignSupplierId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  // Pay debt dialog
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payDebt, setPayDebt] = useState<SupplierDebt | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // --- Data ---
  const { data: approvedData, loading: approvedLoading, refetch: refetchApproved } =
    useApi(() => requestsApi.getAll({ status: "APPROVED", limit: 50 }), [], { enabled: canViewOrders });

  const { data: suppliersData, loading: suppliersLoading, refetch: refetchSuppliers } =
    useApi(() => suppliersApi.getAll({ limit: 200 }), [], { enabled: canViewSuppliers || canViewDebts });

  const periodDates = getPeriodDates(orderPeriod);
  const { data: ordersData, loading: ordersLoading, refetch: refetchOrders } =
    useApi(
      () => suppliersApi.getOrders({ limit: 100 }),
      [orderPeriod],
      { enabled: canViewOrders }
    );

  const { data: debtsAnalytics, loading: debtsLoading, refetch: refetchDebts } =
    useApi(() => analyticsApi.getSupplierDebts(selectedProjectId || undefined), [selectedProjectId], { enabled: canViewDebts });

  const { data: smetaItemsData } =
    useApi(() => smetaItemsApi.getAll({ limit: 500, itemType: "MATERIAL" }), [], { enabled: showOrderDialog });

  // Supplier detail debts
  const { data: supplierDebtsData, loading: supplierDebtsLoading, refetch: refetchSupplierDebts } =
    useApi(
      () => selectedSupplier ? suppliersApi.getDebts(selectedSupplier.id, { isPaid: false, limit: 50 }) : Promise.resolve(null),
      [selectedSupplier?.id],
      { enabled: !!selectedSupplier }
    );

  const approved    = approvedData?.data || [];
  const suppliers   = suppliersData?.data || [];
  const allOrders   = ordersData?.data || [];
  const debtSuppliers = debtsAnalytics?.suppliers || [];
  const smetaItems  = smetaItemsData?.data || [];

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    (s.phone || "").includes(supplierSearch)
  );

  // Period filter for orders (client-side since API doesn't support dateFrom yet)
  const now = new Date();
  const filteredOrders = allOrders.filter(o => {
    if (orderPeriod === "barchasi") return true;
    const d = new Date(o.createdAt);
    if (orderPeriod === "bugun") return d.toDateString() === now.toDateString();
    const days = orderPeriod === "hafta" ? 7 : 30;
    return (now.getTime() - d.getTime()) < days * 86400000;
  });

  const pendingOrders   = filteredOrders.filter(o => o.status === "PENDING" || o.status === "PROCESSING");
  const completedOrders = filteredOrders.filter(o => o.status === "COMPLETED" || o.status === "DELIVERED");

  const totalDebt = debtsAnalytics?.totalDebt || 0;

  const loading = approvedLoading || suppliersLoading || ordersLoading || debtsLoading;

  // --- Handlers ---
  const handleAddSupplier = async () => {
    if (!addForm.name.trim()) return;
    setAddLoading(true);
    setAddError(null);
    try {
      await suppliersApi.create({ name: addForm.name, phone: addForm.phone || undefined, contactPerson: addForm.contactPerson || undefined });
      setShowAddSupplier(false);
      setAddForm({ name: "", phone: "", contactPerson: "" });
      refetchSuppliers();
    } catch (e: any) {
      setAddError(e?.message || "Xatolik yuz berdi");
    } finally {
      setAddLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!orderForm.supplierId || !orderForm.smetaItemId || !orderForm.quantity || !orderForm.unitPrice) return;
    setOrderLoading(true);
    setOrderError(null);
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
    } catch (e: any) {
      setOrderError(e?.message || "Xatolik yuz berdi");
    } finally {
      setOrderLoading(false);
    }
  };

  const handleAssignSupplier = async () => {
    if (!assignRequest || !assignSupplierId) return;
    setAssignLoading(true);
    try {
      await requestsApi.assignSupplier(assignRequest.id, assignSupplierId);
      setShowAssignDialog(false);
      setAssignRequest(null);
      setAssignSupplierId("");
      refetchApproved();
    } catch {
    } finally {
      setAssignLoading(false);
    }
  };

  const handlePayDebt = async () => {
    if (!payDebt) return;
    setPayLoading(true);
    setPayError(null);
    try {
      await suppliersApi.payDebt(payDebt.id);
      setShowPayDialog(false);
      setPayDebt(null);
      refetchDebts();
      refetchSupplierDebts();
    } catch (e: any) {
      setPayError(e?.message || "Xatolik yuz berdi");
    } finally {
      setPayLoading(false);
    }
  };

  // --- Supplier detail view ---
  if (view === "supplier-detail" && selectedSupplier) {
    const debtList = supplierDebtsData?.data || [];
    const supplierDebtInfo = debtSuppliers.find(d => d.supplierId === selectedSupplier.id);

    return (
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setView("main"); setSelectedSupplier(null); }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{selectedSupplier.name}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              {selectedSupplier.phone && <><Phone className="h-3 w-3" /> {selectedSupplier.phone}</>}
              {selectedSupplier.contactPerson && <span className="ml-2">• {selectedSupplier.contactPerson}</span>}
            </p>
          </div>
        </div>

        {/* Debt summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-destructive/30">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Umumiy qarz</p>
              <p className="text-xl font-bold text-destructive">{fmt(supplierDebtInfo?.totalDebt || 0)} so'm</p>
            </CardContent>
          </Card>
          <Card className="border-green-200">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-1">Jami buyurtmalar</p>
              <p className="text-xl font-bold text-green-700">{supplierDebtInfo ? "Mavjud" : "—"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Unpaid debts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-destructive" />
              To'lanmagan qarzlar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {supplierDebtsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />)}
              </div>
            ) : debtList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-30 text-green-500" />
                <p className="text-sm">Qarzlar yo'q</p>
              </div>
            ) : (
              debtList.map(debt => (
                <div key={debt.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div>
                    <p className="font-semibold">{fmt(debt.amount)} so'm</p>
                    {debt.description && <p className="text-xs text-muted-foreground">{debt.description}</p>}
                    <p className="text-xs text-muted-foreground">{fmtDate(debt.createdAt)}</p>
                  </div>
                  {canPayDebts && (
                    <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/5"
                      onClick={() => { setPayDebt(debt); setShowPayDialog(true); }}>
                      To'lash
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Main view ---
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ta'minot</h1>
        <p className="text-sm text-muted-foreground">Xush kelibsiz, {user?.name || "Ta'minotchi"}</p>
      </div>

      {/* Stats */}
      {loading ? <StatsSkeleton /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {canViewOrders && (
            <StatsCard
              title="Zayavkalar"
              value={approved.length}
              subtitle="ta tasdiqlangan"
              icon={ShoppingCart}
              variant="warning"
              className="animate-slide-up stagger-1"
            />
          )}
          {canViewOrders && (
            <StatsCard
              title="Faol buyurtmalar"
              value={pendingOrders.length}
              subtitle="ta bajarilmoqda"
              icon={Package}
              variant="primary"
              className="animate-slide-up stagger-2"
            />
          )}
          {canViewSuppliers && (
            <StatsCard
              title="Postavshiklar"
              value={suppliers.length}
              subtitle="ta yetkazuvchi"
              icon={Store}
              variant="default"
              className="animate-slide-up stagger-3"
            />
          )}
          {canViewDebts && (
            <StatsCard
              title="Umumiy qarz"
              value={fmt(totalDebt)}
              subtitle="so'm"
              icon={CreditCard}
              variant="danger"
              className="animate-slide-up stagger-4"
            />
          )}
        </div>
      )}

      {/* Menu buttons — bot uslubida */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {canViewOrders && (
          <MenuButton
            icon={ShoppingCart}
            label="Zayavkalar"
            description="Prorabdan kelgan"
            badge={approved.length > 0 ? approved.length : undefined}
            active={section === "zayavkalar"}
            onClick={() => setSection("zayavkalar")}
          />
        )}
        {canViewOrders && (
          <MenuButton
            icon={Package}
            label="Buyurtmalar"
            description="Yuborilgan buyurtmalar"
            active={section === "buyurtmalar"}
            onClick={() => setSection("buyurtmalar")}
          />
        )}
        {canViewSuppliers && (
          <MenuButton
            icon={Store}
            label="Postavshiklar"
            description="Ro'yxat va qarzlar"
            active={section === "postavshiklar"}
            onClick={() => setSection("postavshiklar")}
          />
        )}
        {canViewDebts && (
          <MenuButton
            icon={CreditCard}
            label="Qarzlar"
            description="To'lanmagan qarzlar"
            badge={debtSuppliers.filter(d => d.totalDebt > 0).length || undefined}
            active={section === "qarzlar"}
            onClick={() => setSection("qarzlar")}
          />
        )}
        {canViewOrders && (
          <MenuButton
            icon={History}
            label="Tarix"
            description="Bajarilgan buyurtmalar"
            active={section === "tarix"}
            onClick={() => setSection("tarix")}
          />
        )}
        {canViewOrders && (
          <MenuButton
            icon={Plus}
            label="Yangi buyurtma"
            description="Buyurtma berish"
            active={false}
            onClick={() => setShowOrderDialog(true)}
          />
        )}
      </div>

      {/* === SECTION: ZAYAVKALAR === */}
      {section === "zayavkalar" && canViewOrders && (
        <Card className="animate-slide-up">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-amber-500" />
              Zayavkalar (Prorabdan)
              {approved.length > 0 && (
                <Badge className="ml-1 bg-amber-100 text-amber-700 text-xs">{approved.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {approvedLoading ? (
              <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse"/>)}</div>
            ) : approved.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-30 text-green-500" />
                <p className="text-sm">Barcha zayavkalar ko'rib chiqilgan</p>
              </div>
            ) : approved.map(req => (
              <div key={req.id} className="p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{req.smetaItem?.name || "Material"}</p>
                    <p className="text-xs text-muted-foreground">
                      {req.requestedQty} {req.smetaItem?.unit || "birlik"} • {fmtDate(req.createdAt)}
                    </p>
                    {req.requestedBy && (
                      <p className="text-xs text-muted-foreground">Prorab: {req.requestedBy.name}</p>
                    )}
                  </div>
                  <Badge className="bg-green-100 text-green-700 shrink-0">Tasdiqlangan</Badge>
                </div>
                <Button size="sm" variant="outline" className="w-full"
                  onClick={() => { setAssignRequest(req); setShowAssignDialog(true); }}>
                  <Truck className="h-3 w-3 mr-1.5" />
                  Postavshik biriktirish
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* === SECTION: BUYURTMALAR === */}
      {section === "buyurtmalar" && canViewOrders && (
        <Card className="animate-slide-up">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Faol buyurtmalar
            </CardTitle>
            {/* Period filter */}
            <div className="flex gap-2 flex-wrap pt-2">
              {(["bugun","hafta","oy","barchasi"] as Period[]).map(p => (
                <button key={p}
                  onClick={() => setOrderPeriod(p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    orderPeriod === p ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {p === "bugun" ? "Bugun" : p === "hafta" ? "Hafta" : p === "oy" ? "Oy" : "Hammasi"}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {ordersLoading ? (
              <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse"/>)}</div>
            ) : pendingOrders.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Faol buyurtmalar yo'q</p>
              </div>
            ) : pendingOrders.map(order => {
              const st = STATUS_LABELS[order.status] || STATUS_LABELS["PENDING"];
              return (
                <div key={order.id} className="p-4 rounded-lg border bg-card space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{fmt(order.totalPrice)} so'm</p>
                    <Badge className={`text-xs ${st.className}`}>{st.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {order.quantity} birlik • {fmtDate(order.orderDate)}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* === SECTION: POSTAVSHIKLAR === */}
      {section === "postavshiklar" && canViewSuppliers && (
        <Card className="animate-slide-up">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
                Postavshiklar
              </span>
              {canCreateSupplier && (
                <Button size="sm" variant="outline" onClick={() => setShowAddSupplier(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Qo'shish
                </Button>
              )}
            </CardTitle>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Qidirish..."
                className="pl-9 h-9 text-sm"
                value={supplierSearch}
                onChange={e => setSupplierSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {suppliersLoading ? (
              <div className="space-y-2">{[1,2,3,4].map(i=><div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse"/>)}</div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Store className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{supplierSearch ? "Topilmadi" : "Postavshiklar yo'q"}</p>
              </div>
            ) : filteredSuppliers.map(supplier => {
              const debtInfo = debtSuppliers.find(d => d.supplierId === supplier.id);
              return (
                <div key={supplier.id}
                  className="flex items-center justify-between p-3.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => { setSelectedSupplier(supplier); setView("supplier-detail"); }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{supplier.name}</p>
                    {supplier.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" /> {supplier.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {debtInfo && debtInfo.totalDebt > 0 ? (
                      <span className="text-sm font-semibold text-destructive">{fmt(debtInfo.totalDebt)} so'm</span>
                    ) : (
                      <Badge className="bg-green-100 text-green-700 text-xs">Qarzsiz</Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* === SECTION: QARZLAR === */}
      {section === "qarzlar" && canViewDebts && (
        <Card className="animate-slide-up">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-destructive" />
              Postavshik qarzlari
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {debtsLoading ? (
              <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse"/>)}</div>
            ) : debtSuppliers.filter(d => d.totalDebt > 0).length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-30 text-green-500" />
                <p className="text-sm">Barcha postavshiklar bilan hisob-kitob qilingan</p>
              </div>
            ) : debtSuppliers.filter(d => d.totalDebt > 0).map(d => {
              const supplier = suppliers.find(s => s.id === d.supplierId);
              return (
                <div key={d.supplierId}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => {
                    if (supplier) { setSelectedSupplier(supplier); setView("supplier-detail"); }
                  }}>
                  <div>
                    <p className="font-medium text-sm">{d.supplierName}</p>
                    {supplier?.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {supplier.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-destructive">{fmt(d.totalDebt)} so'm</p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* === SECTION: TARIX === */}
      {section === "tarix" && canViewOrders && (
        <Card className="animate-slide-up">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              Buyurtmalar tarixi
            </CardTitle>
            <div className="flex gap-2 flex-wrap pt-2">
              {(["bugun","hafta","oy","barchasi"] as Period[]).map(p => (
                <button key={p}
                  onClick={() => setOrderPeriod(p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    orderPeriod === p ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"
                  }`}
                >
                  {p === "bugun" ? "Bugun" : p === "hafta" ? "Hafta" : p === "oy" ? "Oy" : "Hammasi"}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {ordersLoading ? (
              <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse"/>)}</div>
            ) : completedOrders.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Bu davrda bajarilgan buyurtmalar yo'q</p>
              </div>
            ) : completedOrders.map(order => {
              const st = STATUS_LABELS[order.status] || STATUS_LABELS["COMPLETED"];
              return (
                <div key={order.id} className="p-4 rounded-lg border bg-card space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{fmt(order.totalPrice)} so'm</p>
                    <Badge className={`text-xs ${st.className}`}>{st.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {order.quantity} birlik • {fmtDate(order.orderDate)}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* === DIALOGS === */}

      {/* Postavshik qo'shish */}
      <Dialog open={showAddSupplier} onOpenChange={setShowAddSupplier}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" /> Postavshik qo'shish
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nomi <span className="text-destructive">*</span></Label>
              <Input placeholder="Kompaniya yoki ism" value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input placeholder="+998 __ ___ __ __" value={addForm.phone}
                onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Mas'ul shaxs</Label>
              <Input placeholder="Aloqa uchun ism" value={addForm.contactPerson}
                onChange={e => setAddForm(f => ({ ...f, contactPerson: e.target.value }))} />
            </div>
            {addError && <p className="text-sm text-destructive">{addError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSupplier(false)}>Bekor</Button>
            <Button onClick={handleAddSupplier} disabled={addLoading || !addForm.name.trim()}>
              {addLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Yangi buyurtma */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" /> Yangi buyurtma
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Postavshik <span className="text-destructive">*</span></Label>
              <Select value={orderForm.supplierId} onValueChange={v => setOrderForm(f => ({ ...f, supplierId: v }))}>
                <SelectTrigger><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Material <span className="text-destructive">*</span></Label>
              <Select value={orderForm.smetaItemId} onValueChange={v => {
                const item = smetaItems.find((i: SmetaItem) => i.id === v);
                setOrderForm(f => ({ ...f, smetaItemId: v, unitPrice: item ? String(item.unitPrice) : f.unitPrice }));
              }}>
                <SelectTrigger><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                <SelectContent>
                  {smetaItems.map((i: SmetaItem) => (
                    <SelectItem key={i.id} value={i.id}>{i.name} ({i.unit})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Miqdor <span className="text-destructive">*</span></Label>
                <Input type="number" min={1} placeholder="0" value={orderForm.quantity}
                  onChange={e => setOrderForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Narx (so'm) <span className="text-destructive">*</span></Label>
                <Input type="number" min={0} placeholder="0" value={orderForm.unitPrice}
                  onChange={e => setOrderForm(f => ({ ...f, unitPrice: e.target.value }))} />
              </div>
            </div>
            {orderForm.quantity && orderForm.unitPrice && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Jami summa</p>
                <p className="text-lg font-bold text-primary">
                  {fmt(Number(orderForm.quantity) * Number(orderForm.unitPrice))} so'm
                </p>
              </div>
            )}
            {orderError && <p className="text-sm text-destructive">{orderError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrderDialog(false)}>Bekor</Button>
            <Button onClick={handleCreateOrder}
              disabled={orderLoading || !orderForm.supplierId || !orderForm.smetaItemId || !orderForm.quantity || !orderForm.unitPrice}>
              {orderLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Buyurtma berish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Postavshik biriktirish */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" /> Postavshik biriktirish
            </DialogTitle>
          </DialogHeader>
          {assignRequest && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="font-medium">{assignRequest.smetaItem?.name || "Material"}</p>
                <p className="text-sm text-muted-foreground">
                  {assignRequest.requestedQty} {assignRequest.smetaItem?.unit || "birlik"}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Postavshikni tanlang <span className="text-destructive">*</span></Label>
                <Select value={assignSupplierId} onValueChange={setAssignSupplierId}>
                  <SelectTrigger><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Bekor</Button>
            <Button onClick={handleAssignSupplier} disabled={assignLoading || !assignSupplierId}>
              {assignLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Biriktirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Qarzni to'lash */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" /> Qarzni to'lash
            </DialogTitle>
          </DialogHeader>
          {payDebt && (
            <div className="py-3 space-y-3">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Summa</span>
                  <span className="font-bold text-lg">{fmt(payDebt.amount)} so'm</span>
                </div>
                {payDebt.description && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">Izoh</span>
                    <span className="text-sm">{payDebt.description}</span>
                  </div>
                )}
              </div>
              {payError && <p className="text-sm text-destructive">{payError}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>Bekor</Button>
            <Button onClick={handlePayDebt} disabled={payLoading}>
              {payLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              To'lash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- MenuButton component ---
function MenuButton({
  icon: Icon, label, description, badge, active, onClick
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  badge?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-start gap-1.5 p-4 rounded-xl border text-left transition-all duration-200 w-full
        ${active
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-card hover:bg-muted/50 hover:border-muted-foreground/30"
        }`}
    >
      {badge !== undefined && (
        <span className="absolute top-2.5 right-2.5 min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
          {badge}
        </span>
      )}
      <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
      <div>
        <p className={`text-sm font-semibold leading-tight ${active ? "text-primary" : "text-foreground"}`}>{label}</p>
        <p className="text-xs text-muted-foreground leading-tight mt-0.5">{description}</p>
      </div>
    </button>
  );
}
