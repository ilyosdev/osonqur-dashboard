import { useState, useMemo } from "react";
import {
  Car,
  Package,
  Clock,
  CheckCircle,
  Truck,
  MapPin,
  User,
  Calendar,
  ArrowRight,
  History,
  Layers,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApi, useMutation } from "@/hooks/use-api";
import { driversApi, DriverDelivery } from "@/lib/api/drivers";
import { StatsSkeleton } from "@/components/ui/table-skeleton";
import { ErrorMessage } from "@/components/ui/error-message";

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

// Batch grouping for requests created together
interface RequestBatch {
  batchId: string | null;
  requests: DriverDelivery[];
  prorabName: string;
  totalQty: number;
}

function groupRequestsByBatch(requests: DriverDelivery[]): RequestBatch[] {
  const batchMap = new Map<string, RequestBatch>();
  for (const req of requests) {
    const key = req.batchId || `single_${req.id}`;
    if (!batchMap.has(key)) {
      batchMap.set(key, {
        batchId: req.batchId || null,
        requests: [],
        prorabName: req.requestedBy?.name || "Noma'lum",
        totalQty: 0,
      });
    }
    const group = batchMap.get(key)!;
    group.requests.push(req);
    group.totalQty += req.requestedQty;
  }
  return Array.from(batchMap.values());
}

export default function DriverPage() {
  const [activeTab, setActiveTab] = useState("assigned");
  const [collectDialog, setCollectDialog] = useState<DriverDelivery | null>(null);
  const [deliverDialog, setDeliverDialog] = useState<DriverDelivery | null>(null);
  const [collectedQty, setCollectedQty] = useState("");
  const [deliveredQty, setDeliveredQty] = useState("");
  const [note, setNote] = useState("");

  // Fetch assigned deliveries (APPROVED status, assigned to this driver)
  const {
    data: assignedResponse,
    loading: assignedLoading,
    error: assignedError,
    refetch: refetchAssigned,
  } = useApi(() => driversApi.getMyDeliveries({ status: "APPROVED" }), []);

  // Fetch in-transit deliveries
  const {
    data: inTransitResponse,
    loading: inTransitLoading,
    refetch: refetchInTransit,
  } = useApi(() => driversApi.getMyDeliveries({ status: "IN_TRANSIT" }), []);

  // Fetch completed deliveries (history)
  const {
    data: completedResponse,
    loading: completedLoading,
  } = useApi(() => driversApi.getHistory(), []);

  // Mutations for marking collected/delivered
  const { mutate: markCollected, loading: collectingId } = useMutation(
    (data: { id: string; collectedQty: number; note?: string }) =>
      driversApi.collectDelivery(data.id, { collectedQty: data.collectedQty, note: data.note })
  );

  const { mutate: markDelivered, loading: deliveringId } = useMutation(
    (data: { id: string; deliveredQty: number; note?: string }) =>
      driversApi.deliverDelivery(data.id, { deliveredQty: data.deliveredQty, note: data.note })
  );

  const loading = assignedLoading || inTransitLoading || completedLoading;
  const error = assignedError;

  const assignedRequests = assignedResponse?.data || [];
  const inTransitRequests = inTransitResponse?.data || [];
  const completedRequests = completedResponse?.data || [];

  // Group requests by batchId
  const assignedBatches = useMemo(() => groupRequestsByBatch(assignedRequests), [assignedRequests]);
  const inTransitBatches = useMemo(() => groupRequestsByBatch(inTransitRequests), [inTransitRequests]);

  const handleCollect = async () => {
    if (!collectDialog || !collectedQty) return;
    try {
      await markCollected({
        id: collectDialog.id,
        collectedQty: Number(collectedQty),
        note: note || undefined,
      });
      setCollectDialog(null);
      setCollectedQty("");
      setNote("");
      refetchAssigned();
      refetchInTransit();
    } catch {
      // Error handled by mutation
    }
  };

  const handleDeliver = async () => {
    if (!deliverDialog || !deliveredQty) return;
    try {
      await markDelivered({
        id: deliverDialog.id,
        deliveredQty: Number(deliveredQty),
        note: note || undefined,
      });
      setDeliverDialog(null);
      setDeliveredQty("");
      setNote("");
      refetchInTransit();
    } catch {
      // Error handled by mutation
    }
  };

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Yetkazish</h1>
          <p className="text-muted-foreground">Haydovchi uchun yetkazmalar boshqaruvi</p>
        </div>
        <ErrorMessage error={error} onRetry={refetchAssigned} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Yetkazish</h1>
        <p className="text-muted-foreground">Haydovchi uchun yetkazmalar boshqaruvi</p>
      </div>

      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatsCard
            title="Tayinlangan"
            value={assignedRequests.length}
            subtitle="ta so'rov"
            icon={Package}
            variant="warning"
            className="animate-slide-up stagger-1"
          />
          <StatsCard
            title="Yo'lda"
            value={inTransitRequests.length}
            subtitle="ta yetkazma"
            icon={Truck}
            variant="primary"
            className="animate-slide-up stagger-2"
          />
          <StatsCard
            title="Yetkazilgan"
            value={completedRequests.length}
            subtitle="ta bugun"
            icon={CheckCircle}
            variant="success"
            className="animate-slide-up stagger-3"
          />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="assigned" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Tayinlangan
            {assignedRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {assignedRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="in-transit" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Yo'lda
            {inTransitRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {inTransitRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Tarix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assigned" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-warning" />
                Tayinlangan so'rovlar
              </CardTitle>
              <CardDescription>Olib kelish kerak bo'lgan materiallar</CardDescription>
            </CardHeader>
            <CardContent>
              {assignedLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : assignedBatches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Tayinlangan so'rovlar yo'q</p>
                  <p className="text-sm mt-1">Yangi so'rovlar tayinlanganda ko'rsatiladi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignedBatches.map((batch) => {
                    const isBatch = batch.requests.length > 1;
                    const firstRequest = batch.requests[0];
                    return (
                      <div
                        key={batch.batchId || firstRequest.id}
                        className="p-4 rounded-lg border bg-card space-y-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {isBatch ? (
                              <>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="gap-1">
                                    <Layers className="h-3 w-3" />
                                    {batch.requests.length} ta material
                                  </Badge>
                                </div>
                                <p className="font-medium text-sm text-muted-foreground">
                                  {batch.requests.map((r) => r.smetaItem?.name || "Material").join(", ")}
                                </p>
                              </>
                            ) : (
                              <p className="font-medium truncate">
                                {firstRequest.smetaItem?.name || "Material"}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>{batch.prorabName}</span>
                            </div>
                          </div>
                          {!isBatch && (
                            <Badge variant="outline" className="shrink-0">
                              {formatNumber(firstRequest.requestedQty)} {firstRequest.smetaItem?.unit || "ta"}
                            </Badge>
                          )}
                        </div>
                        {isBatch && (
                          <div className="space-y-2 border-t pt-2">
                            {batch.requests.map((req) => (
                              <div key={req.id} className="flex items-center justify-between text-sm">
                                <span>{req.smetaItem?.name || "Material"}</span>
                                <Badge variant="secondary">
                                  {formatNumber(req.requestedQty)} {req.smetaItem?.unit || "ta"}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                        {firstRequest.note && !isBatch && (
                          <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                            {firstRequest.note}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(firstRequest.createdAt)}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => {
                              // For batch, use the first request (in real app would handle batch)
                              setCollectDialog(firstRequest);
                              setCollectedQty(String(firstRequest.requestedQty));
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {isBatch ? "Barchasini oldim" : "Olib bo'ldim"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="in-transit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                Yo'ldagi yetkazmalar
              </CardTitle>
              <CardDescription>Yetkazib berish kerak</CardDescription>
            </CardHeader>
            <CardContent>
              {inTransitLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : inTransitBatches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Yo'ldagi yetkazmalar yo'q</p>
                  <p className="text-sm mt-1">Material olinganda bu yerda ko'rsatiladi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inTransitBatches.map((batch) => {
                    const isBatch = batch.requests.length > 1;
                    const firstRequest = batch.requests[0];
                    return (
                      <div
                        key={batch.batchId || firstRequest.id}
                        className="p-4 rounded-lg border bg-primary/5 border-primary/20 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {isBatch ? (
                              <>
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="gap-1">
                                    <Layers className="h-3 w-3" />
                                    {batch.requests.length} ta material
                                  </Badge>
                                </div>
                                <p className="font-medium text-sm text-muted-foreground">
                                  {batch.requests.map((r) => r.smetaItem?.name || "Material").join(", ")}
                                </p>
                              </>
                            ) : (
                              <p className="font-medium truncate">
                                {firstRequest.smetaItem?.name || "Material"}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>Yetkazish manzili</span>
                            </div>
                          </div>
                          <Badge className="shrink-0 bg-primary/10 text-primary">
                            <Truck className="h-3 w-3 mr-1" />
                            Yo'lda
                          </Badge>
                        </div>
                        {isBatch && (
                          <div className="space-y-2 border-t pt-2">
                            {batch.requests.map((req) => (
                              <div key={req.id} className="flex items-center justify-between text-sm">
                                <span>{req.smetaItem?.name || "Material"}</span>
                                <Badge variant="secondary">
                                  {formatNumber(req.collectedQty || req.requestedQty)} {req.smetaItem?.unit || "ta"}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                        {!isBatch && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Olingan:</span>
                            <span className="font-medium">
                              {formatNumber(firstRequest.collectedQty || firstRequest.requestedQty)} {firstRequest.smetaItem?.unit || "ta"}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Olingan: {firstRequest.collectedAt ? formatDate(firstRequest.collectedAt) : formatDate(firstRequest.createdAt)}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => {
                              setDeliverDialog(firstRequest);
                              setDeliveredQty(String(firstRequest.collectedQty || firstRequest.requestedQty));
                            }}
                          >
                            <ArrowRight className="h-4 w-4 mr-1" />
                            {isBatch ? "Barchasini yetkazdim" : "Yetkazib berdim"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <History className="h-4 w-4 text-success" />
                Yetkazish tarixi
              </CardTitle>
              <CardDescription>Tugallangan yetkazmalar</CardDescription>
            </CardHeader>
            <CardContent>
              {completedLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : completedRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Tarix hali bo'sh</p>
                  <p className="text-sm mt-1">Yetkazilgan materiallar bu yerda ko'rsatiladi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="p-3 rounded-lg border bg-success/5 border-success/10"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {request.smetaItem?.name || "Material"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatNumber(request.deliveredQty || request.requestedQty)} {request.smetaItem?.unit || "ta"}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="bg-success/10 text-success">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Yetkazildi
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {request.deliveredAt ? formatDate(request.deliveredAt) : formatDate(request.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Collect Dialog */}
      <Dialog open={!!collectDialog} onOpenChange={() => setCollectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Materialni oldim</DialogTitle>
            <DialogDescription>
              {collectDialog?.smetaItem?.name} - olingan miqdorni kiriting
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Olingan miqdor ({collectDialog?.smetaItem?.unit || "ta"})</Label>
              <Input
                type="number"
                min={1}
                value={collectedQty}
                onChange={(e) => setCollectedQty(e.target.value)}
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
            <Button variant="outline" onClick={() => setCollectDialog(null)}>
              Bekor qilish
            </Button>
            <Button onClick={handleCollect} disabled={!!collectingId || !collectedQty}>
              {collectingId ? "Saqlanmoqda..." : "Tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deliver Dialog */}
      <Dialog open={!!deliverDialog} onOpenChange={() => setDeliverDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yetkazib berdim</DialogTitle>
            <DialogDescription>
              {deliverDialog?.smetaItem?.name} - yetkazilgan miqdorni kiriting
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Yetkazilgan miqdor ({deliverDialog?.smetaItem?.unit || "ta"})</Label>
              <Input
                type="number"
                min={1}
                value={deliveredQty}
                onChange={(e) => setDeliveredQty(e.target.value)}
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
            <Button variant="outline" onClick={() => setDeliverDialog(null)}>
              Bekor qilish
            </Button>
            <Button onClick={handleDeliver} disabled={!!deliveringId || !deliveredQty}>
              {deliveringId ? "Saqlanmoqda..." : "Tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
