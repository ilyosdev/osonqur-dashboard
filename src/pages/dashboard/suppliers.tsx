import { useState } from "react";
import { Truck, Package, AlertTriangle, Wallet, Plus, Clock, Loader2 } from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useApi } from "@/hooks/use-api";
import { suppliersApi } from "@/lib/api/suppliers";
import { analyticsApi } from "@/lib/api/analytics";
import { StatsSkeleton } from "@/components/ui/table-skeleton";
import { ErrorMessage } from "@/components/ui/error-message";

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  return num.toLocaleString("uz-UZ");
}

export default function SuppliersPage() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ name: "", phone: "", contactPerson: "", address: "" });

  const {
    data: suppliersResponse,
    loading: suppliersLoading,
    error: suppliersError,
    refetch: refetchSuppliers,
  } = useApi(() => suppliersApi.getAll({ limit: 100 }), []);

  const {
    data: ordersResponse,
    loading: ordersLoading,
  } = useApi(() => suppliersApi.getOrders({ status: "PENDING", limit: 10 }), []);

  const {
    data: deliveredOrdersResponse,
    loading: deliveredLoading,
  } = useApi(() => suppliersApi.getOrders({ status: "DELIVERED", limit: 5 }), []);

  const {
    data: supplierDebtsData,
  } = useApi(() => analyticsApi.getSupplierDebts(), []);

  const loading = suppliersLoading || ordersLoading || deliveredLoading;
  const error = suppliersError;

  const suppliers = suppliersResponse?.data || [];
  const pendingOrders = ordersResponse?.data || [];
  const recentDeliveries = deliveredOrdersResponse?.data || [];

  const handleAddSupplier = async () => {
    if (!addForm.name.trim()) {
      setCreateError("Yetkazuvchi nomini kiriting");
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      await suppliersApi.create({
        name: addForm.name.trim(),
        phone: addForm.phone.trim() || undefined,
        contactPerson: addForm.contactPerson.trim() || undefined,
        address: addForm.address.trim() || undefined,
      });
      setShowAddDialog(false);
      setAddForm({ name: "", phone: "", contactPerson: "", address: "" });
      refetchSuppliers();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Yetkazuvchi qo'shishda xatolik");
    } finally {
      setIsCreating(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Yetkazuvchilar</h1>
          <p className="text-muted-foreground">Pastavshiklar va buyurtmalar</p>
        </div>
        <ErrorMessage error={error} onRetry={refetchSuppliers} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Yetkazuvchilar</h1>
        <p className="text-muted-foreground">Pastavshiklar va buyurtmalar</p>
      </div>

      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Yetkazuvchilar"
            value={suppliers.length}
            subtitle="ta faol"
            icon={Truck}
            variant="primary"
            className="animate-slide-up stagger-1"
          />
          <StatsCard
            title="Jami qarz"
            value={formatNumber(supplierDebtsData?.totalDebt ?? 0)}
            subtitle="to'lanmagan"
            icon={Wallet}
            variant="danger"
            className="animate-slide-up stagger-2"
          />
          <StatsCard
            title="Qarzdorlar"
            value={supplierDebtsData?.supplierCount ?? 0}
            subtitle="ta yetkazuvchi"
            icon={AlertTriangle}
            variant="warning"
            className="animate-slide-up stagger-3"
          />
          <StatsCard
            title="Kutilmoqda"
            value={pendingOrders.length}
            subtitle="ta yetkazma"
            icon={Clock}
            variant="default"
            className="animate-slide-up stagger-4"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                Yetkazuvchilar
              </CardTitle>
              <CardDescription>Qarzlar va buyurtmalar</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Yangi
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {suppliersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : suppliers.length > 0 ? (
              suppliers.map((supplier) => (
                <div key={supplier.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div>
                    <p className="font-medium">{supplier.name}</p>
                    <p className="text-xs text-muted-foreground">{supplier.phone || "Telefon ko'rsatilmagan"}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="bg-success/10 text-success">
                      Faol
                    </Badge>
                    {supplier.contactPerson && (
                      <p className="text-xs text-muted-foreground mt-1">{supplier.contactPerson}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Hozircha yetkazuvchilar yo'q
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                Kutilayotgan yetkazmalar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ordersLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : pendingOrders.length > 0 ? (
                pendingOrders.map((order) => (
                  <div key={order.id} className="p-3 rounded-lg border bg-warning/5 border-warning/20">
                    <p className="font-medium text-sm">Order #{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(order.quantity)} x {formatNumber(order.unitPrice)} so'm
                    </p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(order.orderDate).toLocaleDateString("uz-UZ")}
                      </span>
                      <Badge variant="outline">{formatNumber(order.totalPrice)}</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Kutilayotgan yetkazma yo'q
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: "0.4s" }}>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-success" />
                Oxirgi yetkazmalar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {deliveredLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : recentDeliveries.length > 0 ? (
                recentDeliveries.map((delivery) => (
                  <div key={delivery.id} className="p-3 rounded-lg border bg-success/5 border-success/20">
                    <p className="font-medium text-sm">Order #{delivery.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(delivery.quantity)} ta - {formatNumber(delivery.totalPrice)} so'm
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {delivery.deliveryDate
                        ? new Date(delivery.deliveryDate).toLocaleDateString("uz-UZ")
                        : new Date(delivery.orderDate).toLocaleDateString("uz-UZ")}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Oxirgi yetkazma yo'q
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Supplier Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Yangi yetkazuvchi qo'shish
            </DialogTitle>
          </DialogHeader>

          {createError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {createError}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supplierName">Nomi *</Label>
              <Input
                id="supplierName"
                placeholder="Yetkazuvchi nomi"
                value={addForm.name}
                onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierPhone">Telefon</Label>
              <Input
                id="supplierPhone"
                placeholder="+998 __ ___ __ __"
                value={addForm.phone}
                onChange={(e) => setAddForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Kontakt shaxs</Label>
              <Input
                id="contactPerson"
                placeholder="Mas'ul shaxs ismi"
                value={addForm.contactPerson}
                onChange={(e) => setAddForm((prev) => ({ ...prev, contactPerson: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierAddress">Manzil</Label>
              <Input
                id="supplierAddress"
                placeholder="Manzil"
                value={addForm.address}
                onChange={(e) => setAddForm((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={isCreating}>
              Bekor qilish
            </Button>
            <Button onClick={handleAddSupplier} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saqlanmoqda...
                </>
              ) : (
                "Qo'shish"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
