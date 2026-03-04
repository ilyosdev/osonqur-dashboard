import { useState } from "react";
import {
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Plus,
  Minus,
  History,
  Search,
  Warehouse,
  Boxes,
  Truck,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApi, useMutation } from "@/hooks/use-api";
import { warehousesApi, Warehouse as WarehouseType, WarehouseTransfer, WarehouseItem } from "@/lib/api/warehouses";
import { requestsApi, PurchaseRequest } from "@/lib/api/requests";
import { smetaItemsApi, SmetaItem } from "@/lib/api/smeta-items";
import { StatsSkeleton } from "@/components/ui/table-skeleton";
import { ErrorMessage } from "@/components/ui/error-message";
import { useAuth, hasRole } from "@/lib/auth";

function formatNumber(num: number): string {
  return num.toLocaleString("uz-UZ");
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type DialogType = "add" | "remove" | "transfer" | "receive" | null;
const ITEMS_PER_PAGE = 30;

export default function WarehousePage() {
  const { user } = useAuth();
  const isSklad = hasRole(user?.role, ["SKLAD", "DIREKTOR"]);

  const [activeTab, setActiveTab] = useState("warehouses");
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventorySearch, setInventorySearch] = useState("");
  const [selectedInventoryWarehouse, setSelectedInventoryWarehouse] = useState<string>("");

  // Dialog form state
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [targetWarehouse, setTargetWarehouse] = useState("");
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");

  // Receive delivery state
  const [selectedDelivery, setSelectedDelivery] = useState<PurchaseRequest | null>(null);
  const [receivedQty, setReceivedQty] = useState("");
  const [receiveNote, setReceiveNote] = useState("");

  // Fetch warehouses
  const {
    data: warehousesResponse,
    loading: warehousesLoading,
    error: warehousesError,
    refetch: refetchWarehouses,
  } = useApi(() => warehousesApi.getAll({ limit: 100 }), []);

  // Fetch transfers
  const {
    data: transfersResponse,
    loading: transfersLoading,
    refetch: refetchTransfers,
  } = useApi(() => warehousesApi.getTransfers({ limit: 50 }), []);

  // Fetch pending deliveries (DELIVERED status - ready to receive)
  const {
    data: deliveredRequestsResponse,
    loading: deliveredRequestsLoading,
    refetch: refetchDeliveredRequests,
  } = useApi(() => requestsApi.getAll({ status: "DELIVERED", limit: 50 }), []);

  // Fetch in-transit requests
  const {
    data: inTransitRequestsResponse,
    loading: inTransitRequestsLoading,
  } = useApi(() => requestsApi.getAll({ status: "IN_DELIVERY", limit: 50 }), []);

  // Fetch warehouse items for inventory
  const {
    data: warehouseItemsResponse,
    loading: warehouseItemsLoading,
    refetch: refetchInventory,
  } = useApi(
    () => warehousesApi.getAllItems({
      warehouseId: selectedInventoryWarehouse || undefined,
      search: inventorySearch || undefined,
      page: inventoryPage,
      limit: ITEMS_PER_PAGE,
    }),
    [selectedInventoryWarehouse, inventorySearch, inventoryPage],
    { enabled: activeTab === "inventory" }
  );

  // Fetch smeta items for add item dialog
  const {
    data: smetaItemsResponse,
    loading: smetaItemsLoading,
  } = useApi(
    () => smetaItemsApi.getAll({ limit: 500 }),
    [],
    { enabled: activeDialog === "add" || activeDialog === "transfer" || activeDialog === "remove" }
  );

  // Mutations
  const { mutate: addItem, loading: addingItem } = useMutation(
    (data: { warehouseId: string; smetaItemId: string; quantity: number; note?: string }) =>
      warehousesApi.addItem(data.warehouseId, data)
  );

  const { mutate: removeItem, loading: removingItem } = useMutation(
    (data: { warehouseId: string; smetaItemId: string; quantity: number; reason: string }) =>
      warehousesApi.removeItem(data.warehouseId, data)
  );

  const { mutate: createTransfer, loading: creatingTransfer } = useMutation(
    (data: { fromWarehouseId: string; toWarehouseId: string; smetaItemId: string; quantity: number; transferDate: string }) =>
      warehousesApi.createTransfer(data)
  );

  const { mutate: receiveDelivery, loading: receivingDelivery } = useMutation(
    (data: { requestId: string; receivedQty: number; note?: string }) =>
      warehousesApi.receiveDelivery(data.requestId, { receivedQty: data.receivedQty, note: data.note })
  );

  const loading = warehousesLoading || transfersLoading;
  const error = warehousesError;

  const warehouses = warehousesResponse?.data || [];
  const allTransfers = transfersResponse?.data || [];
  const pendingTransfers = allTransfers.filter((t) => t.status === "PENDING");
  const completedTransfers = allTransfers.filter((t) => t.status === "COMPLETED");
  const deliveredRequests = deliveredRequestsResponse?.data || [];
  const inTransitRequests = inTransitRequestsResponse?.data || [];
  const smetaItems = smetaItemsResponse?.data || [];
  const warehouseItems = warehouseItemsResponse?.data || [];
  const totalInventoryItems = warehouseItemsResponse?.total || 0;
  const totalInventoryPages = Math.ceil(totalInventoryItems / ITEMS_PER_PAGE);

  // Filter smeta items by search
  const filteredSmetaItems = smetaItems.filter((item: SmetaItem) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetDialog = () => {
    setActiveDialog(null);
    setSelectedWarehouse("");
    setTargetWarehouse("");
    setSelectedItem("");
    setQuantity("");
    setNote("");
    setSearchQuery("");
    setSelectedDelivery(null);
    setReceivedQty("");
    setReceiveNote("");
  };

  const handleAddItem = async () => {
    if (!selectedWarehouse || !selectedItem || !quantity) return;
    try {
      await addItem({
        warehouseId: selectedWarehouse,
        smetaItemId: selectedItem,
        quantity: Number(quantity),
        note: note || undefined,
      });
      resetDialog();
      refetchWarehouses();
      refetchInventory();
    } catch {
      // Error handled by mutation
    }
  };

  const handleRemoveItem = async () => {
    if (!selectedWarehouse || !selectedItem || !quantity || !note) return;
    try {
      await removeItem({
        warehouseId: selectedWarehouse,
        smetaItemId: selectedItem,
        quantity: Number(quantity),
        reason: note,
      });
      resetDialog();
      refetchWarehouses();
      refetchInventory();
    } catch {
      // Error handled by mutation
    }
  };

  const handleTransfer = async () => {
    if (!selectedWarehouse || !targetWarehouse || !selectedItem || !quantity) return;
    try {
      await createTransfer({
        fromWarehouseId: selectedWarehouse,
        toWarehouseId: targetWarehouse,
        smetaItemId: selectedItem,
        quantity: Number(quantity),
        transferDate: new Date().toISOString(),
      });
      resetDialog();
      refetchTransfers();
    } catch {
      // Error handled by mutation
    }
  };

  const handleReceiveDelivery = async () => {
    if (!selectedDelivery || !receivedQty) return;
    try {
      await receiveDelivery({
        requestId: selectedDelivery.id,
        receivedQty: Number(receivedQty),
        note: receiveNote || undefined,
      });
      resetDialog();
      refetchDeliveredRequests();
      refetchInventory();
    } catch {
      // Error handled by mutation
    }
  };

  const openReceiveDialog = (request: PurchaseRequest) => {
    setSelectedDelivery(request);
    setReceivedQty(String(request.requestedQty));
    setActiveDialog("receive");
  };

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Ombor</h1>
          <p className="text-muted-foreground">Materiallar va inventar holati</p>
        </div>
        <ErrorMessage error={error} onRetry={refetchWarehouses} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Ombor</h1>
          <p className="text-muted-foreground">Materiallar va inventar holati</p>
        </div>
        {isSklad && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setActiveDialog("add")}>
              <Plus className="h-4 w-4 mr-1" />
              Material qo'shish
            </Button>
            <Button size="sm" variant="outline" onClick={() => setActiveDialog("remove")}>
              <Minus className="h-4 w-4 mr-1" />
              Material chiqarish
            </Button>
            <Button size="sm" variant="outline" onClick={() => setActiveDialog("transfer")}>
              <ArrowLeftRight className="h-4 w-4 mr-1" />
              O'tkazma
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Jami omborlar"
            value={warehouses.length}
            subtitle="ta"
            icon={Warehouse}
            variant="primary"
            className="animate-slide-up stagger-1"
          />
          <StatsCard
            title="Kutilayotgan yetkazma"
            value={deliveredRequests.length + inTransitRequests.length}
            subtitle="ta"
            icon={Truck}
            variant="warning"
            className="animate-slide-up stagger-2"
          />
          <StatsCard
            title="Kutilayotgan o'tkazma"
            value={pendingTransfers.length}
            subtitle="ta"
            icon={ArrowLeftRight}
            variant="default"
            className="animate-slide-up stagger-3"
          />
          <StatsCard
            title="Bugun kirim"
            value={0}
            subtitle="ta yetkazma"
            icon={ArrowDownToLine}
            variant="success"
            className="animate-slide-up stagger-4"
          />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="warehouses" className="flex items-center gap-2">
            <Warehouse className="h-4 w-4" />
            Omborlar
          </TabsTrigger>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Boxes className="h-4 w-4" />
            Inventar
          </TabsTrigger>
          <TabsTrigger value="deliveries" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Yetkazmalar
            {deliveredRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1 bg-warning/10 text-warning">
                {deliveredRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="operations" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Operatsiyalar
            {pendingTransfers.length > 0 && (
              <Badge variant="secondary" className="ml-1 bg-warning/10 text-warning">
                {pendingTransfers.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="warehouses" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-primary" />
                Omborlar ro'yxati
              </CardTitle>
              <CardDescription>Mavjud omborlar</CardDescription>
            </CardHeader>
            <CardContent>
              {warehousesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : warehouses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Hozircha omborlar yo'q</p>
                  <p className="text-sm mt-1">Yangi ombor qo'shish uchun sozlamalarga o'ting</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {warehouses.map((warehouse: WarehouseType) => (
                    <div key={warehouse.id} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{warehouse.name}</p>
                          {warehouse.location && (
                            <p className="text-sm text-muted-foreground">{warehouse.location}</p>
                          )}
                        </div>
                        <Badge variant="outline">
                          {formatDate(warehouse.createdAt)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-primary" />
                    Inventar
                  </CardTitle>
                  <CardDescription>Barcha ombordagi materiallar</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedInventoryWarehouse} onValueChange={setSelectedInventoryWarehouse}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Barcha omborlar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Barcha omborlar</SelectItem>
                      {warehouses.map((w: WarehouseType) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9 w-[200px]"
                      placeholder="Qidirish..."
                      value={inventorySearch}
                      onChange={(e) => {
                        setInventorySearch(e.target.value);
                        setInventoryPage(1);
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {warehouseItemsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : warehouseItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Boxes className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Inventar ma'lumotlari topilmadi</p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead>Ombor</TableHead>
                          <TableHead className="text-right">Miqdor</TableHead>
                          <TableHead className="text-right">Yangilangan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {warehouseItems.map((item: WarehouseItem & { name?: string; unit?: string }) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.name || item.smetaItemId.slice(0, 8)}
                            </TableCell>
                            <TableCell>
                              {warehouses.find((w: WarehouseType) => w.id === item.warehouseId)?.name || item.warehouseId.slice(0, 8)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatNumber(item.quantity)} {item.unit || ''}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatDate(item.updatedAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Pagination */}
                  {totalInventoryPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        {totalInventoryItems} ta elementdan {(inventoryPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(inventoryPage * ITEMS_PER_PAGE, totalInventoryItems)} ko'rsatilmoqda
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setInventoryPage(p => Math.max(1, p - 1))}
                          disabled={inventoryPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Oldingi
                        </Button>
                        <span className="text-sm">
                          {inventoryPage} / {totalInventoryPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setInventoryPage(p => Math.min(totalInventoryPages, p + 1))}
                          disabled={inventoryPage === totalInventoryPages}
                        >
                          Keyingi
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliveries" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Qabul qilishga tayyor
                </CardTitle>
                <CardDescription>Yetkazilgan materiallar</CardDescription>
              </CardHeader>
              <CardContent>
                {deliveredRequestsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : deliveredRequests.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Qabul qilish uchun yetkazma yo'q</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deliveredRequests.map((request: PurchaseRequest) => (
                      <div key={request.id} className="p-4 rounded-lg border bg-success/5 border-success/20">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{request.smetaItem?.name || "Noma'lum"}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatNumber(request.requestedQty)} {request.smetaItem?.unit || ""}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(request.createdAt)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => openReceiveDialog(request)}
                          >
                            <ArrowDownToLine className="h-4 w-4 mr-1" />
                            Qabul qilish
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Truck className="h-4 w-4 text-warning" />
                  Yo'lda
                </CardTitle>
                <CardDescription>Yetkazilayotgan materiallar</CardDescription>
              </CardHeader>
              <CardContent>
                {inTransitRequestsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : inTransitRequests.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Truck className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Yo'ldagi yetkazma yo'q</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {inTransitRequests.map((request: PurchaseRequest) => (
                      <div key={request.id} className="p-4 rounded-lg border bg-warning/5 border-warning/20">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{request.smetaItem?.name || "Noma'lum"}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {formatNumber(request.requestedQty)} {request.smetaItem?.unit || ""}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(request.createdAt)}
                            </p>
                          </div>
                          <Badge variant="secondary" className="bg-warning/10 text-warning">
                            <Clock className="h-3 w-3 mr-1" />
                            Yo'lda
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-warning" />
                  Kutilayotgan o'tkazmalar
                </CardTitle>
                <CardDescription>Tasdiqlash kerak</CardDescription>
              </CardHeader>
              <CardContent>
                {transfersLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : pendingTransfers.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <ArrowLeftRight className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Kutilayotgan o'tkazma yo'q</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingTransfers.map((transfer: WarehouseTransfer) => (
                      <div key={transfer.id} className="p-3 rounded-lg border bg-warning/5 border-warning/20">
                        <div className="flex items-center gap-2 text-sm mb-2">
                          <Badge variant="outline">#{transfer.fromWarehouseId.slice(0, 6)}</Badge>
                          <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                          <Badge variant="outline">#{transfer.toWarehouseId.slice(0, 6)}</Badge>
                        </div>
                        <p className="font-medium text-sm">Item: {transfer.smetaItemId.slice(0, 8)}...</p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(transfer.quantity)} ta
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(transfer.transferDate)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <History className="h-4 w-4 text-success" />
                  Tugallangan operatsiyalar
                </CardTitle>
                <CardDescription>Oxirgi o'tkazmalar</CardDescription>
              </CardHeader>
              <CardContent>
                {transfersLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : completedTransfers.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Tugallangan o'tkazma yo'q</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {completedTransfers.slice(0, 5).map((transfer: WarehouseTransfer) => (
                      <div key={transfer.id} className="p-3 rounded-lg border bg-success/5 border-success/10">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {formatNumber(transfer.quantity)} ta
                          </span>
                          <Badge variant="secondary" className="bg-success/10 text-success text-xs">
                            Tugallandi
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(transfer.transferDate)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Item Dialog */}
      <Dialog open={activeDialog === "add"} onOpenChange={() => resetDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Material qo'shish</DialogTitle>
            <DialogDescription>Omborga yangi material qo'shing</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Ombor</Label>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger>
                  <SelectValue placeholder="Omborni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w: WarehouseType) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Material</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger>
                  <SelectValue placeholder="Materialni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSmetaItems.slice(0, 20).map((item: SmetaItem) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Miqdor</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Miqdorni kiriting"
              />
            </div>

            <div className="space-y-2">
              <Label>Izoh (ixtiyoriy)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Qo'shimcha ma'lumot..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetDialog}>
              Bekor qilish
            </Button>
            <Button
              onClick={handleAddItem}
              disabled={addingItem || !selectedWarehouse || !selectedItem || !quantity}
            >
              {addingItem ? "Saqlanmoqda..." : "Qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Item Dialog */}
      <Dialog open={activeDialog === "remove"} onOpenChange={() => resetDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Material chiqarish</DialogTitle>
            <DialogDescription>Ombordan material chiqarish</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Ombor</Label>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger>
                  <SelectValue placeholder="Omborni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w: WarehouseType) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Material</Label>
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger>
                  <SelectValue placeholder="Materialni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {smetaItems.slice(0, 20).map((item: SmetaItem) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Miqdor</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Miqdorni kiriting"
              />
            </div>

            <div className="space-y-2">
              <Label>Sabab *</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Chiqarish sababi..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetDialog}>
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveItem}
              disabled={removingItem || !selectedWarehouse || !selectedItem || !quantity || !note}
            >
              {removingItem ? "Chiqarilmoqda..." : "Chiqarish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={activeDialog === "transfer"} onOpenChange={() => resetDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>O'tkazma</DialogTitle>
            <DialogDescription>Bir ombordan boshqasiga o'tkazish</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Qayerdan</Label>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger>
                  <SelectValue placeholder="Manba omborni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w: WarehouseType) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Qayerga</Label>
              <Select value={targetWarehouse} onValueChange={setTargetWarehouse}>
                <SelectTrigger>
                  <SelectValue placeholder="Maqsad omborni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses
                    .filter((w: WarehouseType) => w.id !== selectedWarehouse)
                    .map((w: WarehouseType) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Material</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger>
                  <SelectValue placeholder="Materialni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSmetaItems.slice(0, 20).map((item: SmetaItem) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Miqdor</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Miqdorni kiriting"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetDialog}>
              Bekor qilish
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={creatingTransfer || !selectedWarehouse || !targetWarehouse || !selectedItem || !quantity}
            >
              {creatingTransfer ? "Saqlanmoqda..." : "O'tkazish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Delivery Dialog */}
      <Dialog open={activeDialog === "receive"} onOpenChange={() => resetDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yetkazmani qabul qilish</DialogTitle>
            <DialogDescription>
              {selectedDelivery?.smetaItem?.name || "Material"}ni omborga qabul qiling
            </DialogDescription>
          </DialogHeader>
          {selectedDelivery && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Material:</span>
                  <span className="font-medium">{selectedDelivery.smetaItem?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">So'ralgan miqdor:</span>
                  <span className="font-medium">
                    {formatNumber(selectedDelivery.requestedQty)} {selectedDelivery.smetaItem?.unit}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Qabul qilingan miqdor</Label>
                <Input
                  type="number"
                  min={1}
                  value={receivedQty}
                  onChange={(e) => setReceivedQty(e.target.value)}
                  placeholder="Miqdorni kiriting"
                />
                {Number(receivedQty) !== selectedDelivery.requestedQty && receivedQty && (
                  <p className="text-xs text-warning flex items-center gap-1">
                    <ArrowUpFromLine className="h-3 w-3" />
                    So'ralgan miqdordan farq: {Number(receivedQty) - selectedDelivery.requestedQty}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Izoh (ixtiyoriy)</Label>
                <Textarea
                  value={receiveNote}
                  onChange={(e) => setReceiveNote(e.target.value)}
                  placeholder="Qo'shimcha ma'lumot, farq sababi..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={resetDialog}>
              Bekor qilish
            </Button>
            <Button
              onClick={handleReceiveDelivery}
              disabled={receivingDelivery || !receivedQty}
            >
              {receivingDelivery ? "Qabul qilinmoqda..." : "Qabul qilish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
