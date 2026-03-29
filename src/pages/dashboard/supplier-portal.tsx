import { useState } from "react";
import {
  Store,
  Package,
  Clock,
  CheckCircle,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Calendar,
  FileText,
  DollarSign,
  CreditCard,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApi } from "@/hooks/use-api";
import { suppliersApi, SupplierOrder, SupplierDebt } from "@/lib/api/suppliers";
import { StatsSkeleton } from "@/components/ui/table-skeleton";
import { ErrorMessage } from "@/components/ui/error-message";

function formatNumber(num: number): string {
  return num.toLocaleString("uz-UZ");
}

function formatMoney(num: number): string {
  return num.toLocaleString("uz-UZ") + " so'm";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function SupplierPortalPage() {
  const [activeTab, setActiveTab] = useState("orders");

  // Fetch orders for this supplier (user-specific)
  const {
    data: ordersResponse,
    loading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useApi(() => suppliersApi.getMyOrders({ limit: 100 }), []);

  // Fetch unpaid debts for this supplier
  const {
    data: debtsResponse,
    loading: debtsLoading,
  } = useApi(() => suppliersApi.getMyDebts({ isPaid: false, limit: 100 }), []);

  // Fetch payments (paid debts) for this supplier
  const {
    data: paymentsResponse,
    loading: paymentsLoading,
  } = useApi(() => suppliersApi.getMyPayments({ limit: 100 }), []);

  const loading = ordersLoading || debtsLoading || paymentsLoading;
  const error = ordersError;

  const orders = ordersResponse?.data || [];

  // Calculate totals
  const totalSupplied = orders.reduce((sum, order) => sum + order.totalPrice, 0);
  const pendingOrders = orders.filter((order) => order.status === "PENDING").length;
  const completedOrders = orders.filter((order) => order.status === "DELIVERED").length;

  // Real debts and payments from API
  const unpaidDebts: SupplierDebt[] = debtsResponse?.data || [];
  const paidDebts: SupplierDebt[] = paymentsResponse?.data || [];

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Ta'minotchi portali</h1>
          <p className="text-muted-foreground">Buyurtmalar va qarzlar</p>
        </div>
        <ErrorMessage error={error} onRetry={refetchOrders} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Ta'minotchi portali</h1>
        <p className="text-muted-foreground">Buyurtmalar va qarzlar</p>
      </div>

      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Jami ta'minlangan"
            value={formatMoney(totalSupplied)}
            icon={TrendingUp}
            variant="success"
            className="animate-slide-up stagger-1"
          />
          <StatsCard
            title="Kutilayotgan"
            value={pendingOrders}
            subtitle="ta buyurtma"
            icon={Clock}
            variant="warning"
            className="animate-slide-up stagger-2"
          />
          <StatsCard
            title="Yetkazilgan"
            value={completedOrders}
            subtitle="ta buyurtma"
            icon={CheckCircle}
            variant="primary"
            className="animate-slide-up stagger-3"
          />
          <StatsCard
            title="To'lanmagan qarz"
            value={formatMoney(unpaidDebts.reduce((sum, d) => sum + d.amount, 0))}
            icon={AlertTriangle}
            variant={unpaidDebts.length > 0 ? "danger" : "default"}
            className="animate-slide-up stagger-4"
          />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Buyurtmalar
            {pendingOrders > 0 && (
              <Badge variant="secondary" className="ml-1 bg-warning/10 text-warning">
                {pendingOrders}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="debts" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Qarzlar
            {unpaidDebts.length > 0 && (
              <Badge variant="secondary" className="ml-1 bg-destructive/10 text-destructive">
                {unpaidDebts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            To'lovlar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Buyurtmalar ro'yxati
              </CardTitle>
              <CardDescription>Tashkilotdan kelgan buyurtmalar</CardDescription>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Hozircha buyurtmalar yo'q</p>
                  <p className="text-sm mt-1">Yangi buyurtmalar bu yerda ko'rsatiladi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-destructive" />
                Qarzlar
              </CardTitle>
              <CardDescription>To'lanmagan summalar</CardDescription>
            </CardHeader>
            <CardContent>
              {unpaidDebts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50 text-success" />
                  <p>Hozircha qarz yo'q</p>
                  <p className="text-sm mt-1">Barcha to'lovlar amalga oshirilgan</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unpaidDebts.map((debt) => (
                    <DebtCard key={debt.id} debt={debt} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Wallet className="h-4 w-4 text-success" />
                To'lovlar tarixi
              </CardTitle>
              <CardDescription>Sizga to'langan summalar</CardDescription>
            </CardHeader>
            <CardContent>
              {paidDebts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>To'lovlar tarixi bo'sh</p>
                  <p className="text-sm mt-1">To'lovlar bu yerda ko'rsatiladi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paidDebts.map((debt) => (
                    <div
                      key={debt.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-success/5 border-success/10"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {debt.description || "To'lov"}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{debt.paidAt ? formatDate(debt.paidAt) : "-"}</span>
                        </div>
                      </div>
                      <p className="font-semibold text-success">
                        +{formatMoney(debt.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OrderCard({ order }: { order: SupplierOrder }) {
  const getStatusBadge = () => {
    switch (order.status) {
      case "PENDING":
        return (
          <Badge variant="secondary" className="bg-warning/10 text-warning">
            <Clock className="h-3 w-3 mr-1" />
            Kutilmoqda
          </Badge>
        );
      case "DELIVERED":
        return (
          <Badge variant="secondary" className="bg-success/10 text-success">
            <CheckCircle className="h-3 w-3 mr-1" />
            Yetkazildi
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="secondary" className="bg-destructive/10 text-destructive">
            Bekor qilindi
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {order.status}
          </Badge>
        );
    }
  };

  return (
    <div className="p-4 rounded-lg border bg-card space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">
            Buyurtma #{order.id.slice(0, 8)}
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formatNumber(order.quantity)} {/* unit would come from smeta item */}
          </p>
        </div>
        {getStatusBadge()}
      </div>
      <div className="grid grid-cols-3 gap-4 p-3 rounded-lg bg-muted/30">
        <div>
          <p className="text-xs text-muted-foreground">Narx</p>
          <p className="font-medium text-sm">{formatMoney(order.unitPrice)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Miqdor</p>
          <p className="font-medium text-sm">{formatNumber(order.quantity)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Jami</p>
          <p className="font-medium text-sm text-primary">{formatMoney(order.totalPrice)}</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Buyurtma: {formatDate(order.orderDate)}
        </span>
        {order.deliveryDate && (
          <span className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            Yetkazish: {formatDate(order.deliveryDate)}
          </span>
        )}
      </div>
    </div>
  );
}

function DebtCard({ debt }: { debt: SupplierDebt }) {
  const isOverdue = debt.dueDate && new Date(debt.dueDate) < new Date();

  return (
    <div className={`p-4 rounded-lg border ${isOverdue ? "bg-destructive/5 border-destructive/20" : "bg-warning/5 border-warning/20"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium">{debt.description || "Qarz"}</p>
          {debt.dueDate && (
            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Muddati: {formatDate(debt.dueDate)}</span>
              {isOverdue && (
                <Badge variant="destructive" className="ml-2 text-xs">
                  Muddati o'tgan
                </Badge>
              )}
            </div>
          )}
        </div>
        <p className={`font-semibold text-lg ${isOverdue ? "text-destructive" : "text-warning"}`}>
          {formatMoney(debt.amount)}
        </p>
      </div>
    </div>
  );
}
