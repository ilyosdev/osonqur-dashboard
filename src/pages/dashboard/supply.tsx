import { useState } from "react";
import {
  Package,
  ShoppingCart,
  CreditCard,
  History,
  Plus,
  DollarSign,
  CheckCircle,
  Clock,
  Truck,
  AlertTriangle,
  Calendar,
  User,
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
import { suppliersApi, Supplier, SupplierOrder, SupplierDebt } from "@/lib/api/suppliers";
import { smetaItemsApi, SmetaItem } from "@/lib/api/smeta-items";
import { analyticsApi } from "@/lib/api/analytics";
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

type ActiveView = "orders" | "new-order" | "debts" | "history";

export default function SupplyPage() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<ActiveView>("orders");

  // Dialog states
  const [createOrderDialogOpen, setCreateOrderDialogOpen] = useState(false);
  const [payDebtDialogOpen, setPayDebtDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<SupplierDebt | null>(null);
  const [supplierDebtsDialogOpen, setSupplierDebtsDialogOpen] = useState(false);
  const [selectedSupplierForDebts, setSelectedSupplierForDebts] = useState<{ id: string; name: string } | null>(null);
  const [assignSupplierDialogOpen, setAssignSupplierDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);

  // New order form state
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedSmetaItem, setSelectedSmetaItem] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("");
  const [orderUnitPrice, setOrderUnitPrice] = useState("");
  const [orderNote, setOrderNote] = useState("");

  // Fetch approved requests (ready for supply action)
  const {
    data: approvedRequestsData,
    loading: approvedRequestsLoading,
    error: approvedRequestsError,
    refetch: refetchApprovedRequests,
  } = useApi(() => requestsApi.getAll({ status: "APPROVED", limit: 50 }), []);

  // Fetch suppliers
  const {
    data: suppliersData,
    loading: suppliersLoading,
  } = useApi(() => suppliersApi.getAll({ limit: 100 }), []);

  // Fetch supplier orders
  const {
    data: ordersData,
    loading: ordersLoading,
    refetch: refetchOrders,
  } = useApi(() => suppliersApi.getOrders({ limit: 50 }), []);

  // Fetch supplier debts from analytics
  const {
    data: supplierDebtsData,
    loading: supplierDebtsLoading,
    refetch: refetchDebts,
  } = useApi(() => analyticsApi.getSupplierDebts(), []);

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

  // Fetch smeta items for new order
  const {
    data: smetaItemsData,
    loading: smetaItemsLoading,
  } = useApi(
    () => smetaItemsApi.getAll({ limit: 500, itemType: "MATERIAL" }),
    [],
    { enabled: createOrderDialogOpen }
  );

  // Fetch today's payments
  const {
    data: todayPaymentsData,
  } = useApi(() => analyticsApi.getTodayPayments(), []);

  // Mutations
  const { mutate: createOrder, loading: creatingOrder } = useMutation(
    (data: {
      supplierId: string;
      smetaItemId: string;
      quantity: number;
      unitPrice: number;
      orderDate: string;
    }) => suppliersApi.createOrder(data)
  );

  const { mutate: payDebt, loading: payingDebt } = useMutation(
    (id: string) => suppliersApi.payDebt(id)
  );

  const approvedRequests = approvedRequestsData?.data || [];
  const suppliers = suppliersData?.data || [];
  const allOrders = ordersData?.data || [];
  const supplierDebts = supplierDebtsData?.suppliers || [];
  const smetaItems = smetaItemsData?.data || [];

  // Filter orders
  const pendingOrders = allOrders.filter(o => o.status === "PENDING" || o.status === "PROCESSING");
  const completedOrders = allOrders.filter(o => o.status === "COMPLETED" || o.status === "DELIVERED");

  // Today's payments from API
  const todayPayments = todayPaymentsData?.count || 0;
  const todayPaymentsAmount = todayPaymentsData?.totalAmount || 0;

  const loading = approvedRequestsLoading || suppliersLoading || ordersLoading || supplierDebtsLoading;
  const error = approvedRequestsError;

  const handleCreateOrder = async () => {
    if (!selectedSupplier || !selectedSmetaItem || !orderQuantity || !orderUnitPrice) return;
    try {
      await createOrder({
        supplierId: selectedSupplier,
        smetaItemId: selectedSmetaItem,
        quantity: Number(orderQuantity),
        unitPrice: Number(orderUnitPrice),
        orderDate: new Date().toISOString(),
      });
      setCreateOrderDialogOpen(false);
      resetOrderForm();
      refetchOrders();
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

  const resetOrderForm = () => {
    setSelectedSupplier("");
    setSelectedSmetaItem("");
    setOrderQuantity("");
    setOrderUnitPrice("");
    setOrderNote("");
  };

  const selectedItem = smetaItems.find((i: SmetaItem) => i.id === selectedSmetaItem);
  const totalOrderAmount = Number(orderQuantity) * Number(orderUnitPrice);

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Ta'minot</h1>
          <p className="text-muted-foreground">Material ta'minoti boshqaruvi</p>
        </div>
        <ErrorMessage error={error} onRetry={refetchApprovedRequests} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Ta'minot</h1>
        <p className="text-muted-foreground">
          Xush kelibsiz, {user?.name || "Ta'minotchi"}
        </p>
      </div>

      {/* Stats */}
      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Faol buyurtmalar"
            value={pendingOrders.length}
            subtitle="ta buyurtma"
            icon={ShoppingCart}
            variant="primary"
            className="animate-slide-up stagger-1"
          />
          <StatsCard
            title="Kutilayotgan yetkazma"
            value={approvedRequests.length}
            subtitle="ta so'rov"
            icon={Package}
            variant="warning"
            className="animate-slide-up stagger-2"
          />
          <StatsCard
            title="Yetkazuvchi qarzlar"
            value={formatMoney(supplierDebtsData?.totalDebt || 0)}
            subtitle={`${supplierDebts.length} ta yetkazuvchi`}
            icon={CreditCard}
            variant="danger"
            className="animate-slide-up stagger-3"
          />
          <StatsCard
            title="Bugun to'lovlar"
            value={formatMoney(todayPayments)}
            subtitle="so'm"
            icon={DollarSign}
            variant="success"
            className="animate-slide-up stagger-4"
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <ActionButton
          icon={Package}
          label="Buyurtmalar"
          active={activeView === "orders"}
          onClick={() => setActiveView("orders")}
          badge={approvedRequests.length}
        />
        <ActionButton
          icon={Plus}
          label="Yangi buyurtma"
          active={activeView === "new-order"}
          onClick={() => setCreateOrderDialogOpen(true)}
        />
        <ActionButton
          icon={CreditCard}
          label="Qarzlar"
          active={activeView === "debts"}
          onClick={() => setActiveView("debts")}
          badge={supplierDebts.length > 0 ? supplierDebts.length : undefined}
        />
        <ActionButton
          icon={History}
          label="Tarix"
          active={activeView === "history"}
          onClick={() => setActiveView("history")}
        />
      </div>

      {/* Content sections */}
      {activeView === "orders" && (
        <OrdersSection
          approvedRequests={approvedRequests}
          pendingOrders={pendingOrders}
          loading={approvedRequestsLoading || ordersLoading}
          suppliers={suppliers}
          onAssignSupplier={(req) => {
            setSelectedRequest(req);
            setAssignSupplierDialogOpen(true);
          }}
        />
      )}
      {activeView === "debts" && (
        <DebtsSection
          supplierDebts={supplierDebts}
          loading={supplierDebtsLoading}
          onViewSupplierDebts={(supplierId, supplierName) => {
            setSelectedSupplierForDebts({ id: supplierId, name: supplierName });
            setSupplierDebtsDialogOpen(true);
          }}
          totalDebt={supplierDebtsData?.totalDebt || 0}
        />
      )}
      {activeView === "history" && (
        <HistorySection
          completedOrders={completedOrders}
          loading={ordersLoading}
        />
      )}

      {/* Create Order Dialog */}
      <Dialog open={createOrderDialogOpen} onOpenChange={setCreateOrderDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Yangi buyurtma</DialogTitle>
            <DialogDescription>
              Yetkazuvchiga yangi buyurtma yarating
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Yetkazuvchi</Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
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
              <Label>Material</Label>
              <Select value={selectedSmetaItem} onValueChange={(value) => {
                setSelectedSmetaItem(value);
                const item = smetaItems.find((i: SmetaItem) => i.id === value);
                if (item) {
                  setOrderUnitPrice(String(item.unitPrice));
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Materialni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {smetaItems.map((item: SmetaItem) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Miqdor {selectedItem ? `(${selectedItem.unit})` : ""}</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Miqdorni kiriting"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Birlik narxi (so'm)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Narxni kiriting"
                  value={orderUnitPrice}
                  onChange={(e) => setOrderUnitPrice(e.target.value)}
                />
              </div>
            </div>

            {orderQuantity && orderUnitPrice && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Jami summa:</p>
                <p className="text-lg font-bold text-primary">
                  {formatMoney(totalOrderAmount)} so'm
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Izoh (ixtiyoriy)</Label>
              <Textarea
                placeholder="Qo'shimcha ma'lumot..."
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCreateOrderDialogOpen(false);
              resetOrderForm();
            }}>
              Bekor qilish
            </Button>
            <Button
              onClick={handleCreateOrder}
              disabled={creatingOrder || !selectedSupplier || !selectedSmetaItem || !orderQuantity || !orderUnitPrice}
            >
              {creatingOrder ? "Saqlanmoqda..." : "Buyurtma berish"}
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

      {/* Assign Supplier Dialog */}
      <Dialog open={assignSupplierDialogOpen} onOpenChange={setAssignSupplierDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yetkazuvchi tayinlash</DialogTitle>
            <DialogDescription>
              {selectedRequest?.smetaItem?.name || "Material"} uchun yetkazuvchi tanlang
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Material:</span>
                  <span className="font-medium">{selectedRequest.smetaItem?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Miqdor:</span>
                  <span className="font-medium">
                    {formatMoney(selectedRequest.requestedQty)} {selectedRequest.smetaItem?.unit}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Summa:</span>
                  <span className="font-bold text-primary">
                    {formatMoney(selectedRequest.requestedAmount)} so'm
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Yetkazuvchi</Label>
                <Select>
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
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignSupplierDialogOpen(false)}>
              Bekor qilish
            </Button>
            <Button>
              Tayinlash
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

function OrdersSection({
  approvedRequests,
  pendingOrders,
  loading,
  suppliers,
  onAssignSupplier,
}: {
  approvedRequests: PurchaseRequest[];
  pendingOrders: SupplierOrder[];
  loading: boolean;
  suppliers: Supplier[];
  onAssignSupplier: (req: PurchaseRequest) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Package className="h-4 w-4 text-warning" />
            Tasdiqlangan so'rovlar
          </CardTitle>
          <CardDescription>Yetkazuvchiga tayinlash kerak</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : approvedRequests.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Kutilayotgan so'rov yo'q</p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvedRequests.map((request) => (
                <div
                  key={request.id}
                  className="p-4 rounded-lg border bg-warning/5 border-warning/20"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{request.smetaItem?.name || "Noma'lum"}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatMoney(request.requestedQty)} {request.smetaItem?.unit || ""} •{" "}
                        {formatMoney(request.requestedAmount)} so'm
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{request.requestedBy?.name || "Noma'lum"}</span>
                        <span>•</span>
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(request.createdAt)}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onAssignSupplier(request)}
                    >
                      <Truck className="h-4 w-4 mr-1" />
                      Tayinlash
                    </Button>
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
            <ShoppingCart className="h-4 w-4 text-primary" />
            Faol buyurtmalar
          </CardTitle>
          <CardDescription>Yetkazilishi kutilmoqda</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Faol buyurtma yo'q</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">Buyurtma #{order.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatMoney(order.quantity)} dona • {formatMoney(order.totalPrice)} so'm
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(order.orderDate)}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        order.status === "PROCESSING"
                          ? "bg-warning/10 text-warning"
                          : "bg-primary/10 text-primary"
                      }
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {order.status === "PROCESSING" ? "Jarayonda" : "Kutilmoqda"}
                    </Badge>
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

function DebtsSection({
  supplierDebts,
  loading,
  onViewSupplierDebts,
  totalDebt,
}: {
  supplierDebts: { supplierId: string; supplierName: string; totalDebt: number; unpaidCount: number }[];
  loading: boolean;
  onViewSupplierDebts: (supplierId: string, supplierName: string) => void;
  totalDebt: number;
}) {
  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-destructive" />
          Yetkazuvchi qarzlar
        </CardTitle>
        <CardDescription>
          Jami: {formatMoney(totalDebt)} so'm
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : supplierDebts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Qarzlar yo'q</p>
            <p className="text-sm mt-1">Barcha qarzlar to'langan</p>
          </div>
        ) : (
          <div className="space-y-3">
            {supplierDebts.map((debt) => (
              <div
                key={debt.supplierId}
                className="p-4 rounded-lg border bg-destructive/5 border-destructive/20"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{debt.supplierName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {debt.unpaidCount} ta to'lanmagan qarz
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-destructive">
                      {formatMoney(debt.totalDebt)} so'm
                    </p>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => onViewSupplierDebts(debt.supplierId, debt.supplierName)}
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
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
  );
}

function HistorySection({
  completedOrders,
  loading,
}: {
  completedOrders: SupplierOrder[];
  loading: boolean;
}) {
  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <History className="h-4 w-4 text-success" />
          Buyurtma tarixi
        </CardTitle>
        <CardDescription>Tugallangan buyurtmalar</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : completedOrders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Tugallangan buyurtmalar yo'q</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-lg border bg-success/5 border-success/20"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Buyurtma #{order.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatMoney(order.quantity)} dona • {formatMoney(order.totalPrice)} so'm
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="bg-success/10 text-success">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Tugallandi
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">
                      {order.deliveryDate ? formatDate(order.deliveryDate) : formatDate(order.orderDate)}
                    </p>
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
