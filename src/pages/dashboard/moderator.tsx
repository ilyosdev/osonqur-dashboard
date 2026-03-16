import { useState } from "react";
import {
  Shield,
  Package,
  Clock,
  CheckCircle,
  DollarSign,
  Calculator,
  History,
  AlertTriangle,
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
import { requestsApi, PurchaseRequest } from "@/lib/api/requests";
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
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface FinalizeData {
  finalUnitPrice: string;
  finalAmount: string;
  note: string;
}

export default function ModeratorPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [finalizeDialog, setFinalizeDialog] = useState<PurchaseRequest | null>(null);
  const [finalizeData, setFinalizeData] = useState<FinalizeData>({
    finalUnitPrice: "",
    finalAmount: "",
    note: "",
  });

  // Fetch requests pending finalization (RECEIVED status)
  const {
    data: pendingResponse,
    loading: pendingLoading,
    error: pendingError,
    refetch: refetchPending,
  } = useApi(() => requestsApi.getAll({ status: "RECEIVED", limit: 50 }), []);

  // Fetch finalized requests
  const {
    data: finalizedResponse,
    loading: finalizedLoading,
  } = useApi(() => requestsApi.getAll({ status: "FINALIZED", limit: 50 }), []);

  // Mutation for finalizing
  const { mutate: finalize, loading: finalizing } = useMutation(
    (data: { id: string; finalAmount: number; finalUnitPrice: number }) =>
      requestsApi.finalize(data.id, { finalAmount: data.finalAmount, finalUnitPrice: data.finalUnitPrice })
  );

  const loading = pendingLoading || finalizedLoading;
  const error = pendingError;

  const pendingRequests = pendingResponse?.data || [];
  const finalizedRequests = finalizedResponse?.data || [];

  const openFinalizeDialog = (request: PurchaseRequest) => {
    const estimatedUnitPrice = request.smetaItem?.unitPrice || 0;
    const estimatedAmount = request.requestedAmount || estimatedUnitPrice * request.requestedQty;
    setFinalizeDialog(request);
    setFinalizeData({
      finalUnitPrice: String(estimatedUnitPrice),
      finalAmount: String(estimatedAmount),
      note: "",
    });
  };

  const handleUnitPriceChange = (value: string) => {
    const unitPrice = Number(value) || 0;
    const qty = finalizeDialog?.requestedQty || 0;
    setFinalizeData({
      ...finalizeData,
      finalUnitPrice: value,
      finalAmount: String(unitPrice * qty),
    });
  };

  const handleFinalize = async () => {
    if (!finalizeDialog) return;
    try {
      await finalize({
        id: finalizeDialog.id,
        finalAmount: Number(finalizeData.finalAmount),
        finalUnitPrice: Number(finalizeData.finalUnitPrice),
      });
      setFinalizeDialog(null);
      setFinalizeData({ finalUnitPrice: "", finalAmount: "", note: "" });
      refetchPending();
    } catch {
      // Error handled by mutation
    }
  };

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Moderatsiya</h1>
          <p className="text-muted-foreground">Yetkazmalarni yakunlash va narxlarni tasdiqlash</p>
        </div>
        <ErrorMessage error={error} onRetry={refetchPending} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Moderatsiya</h1>
        <p className="text-muted-foreground">Yetkazmalarni yakunlash va narxlarni tasdiqlash</p>
      </div>

      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatsCard
            title="Yakunlash kutilmoqda"
            value={pendingRequests.length}
            subtitle="ta so'rov"
            icon={Clock}
            variant="warning"
            className="animate-slide-up stagger-1"
          />
          <StatsCard
            title="Bugun yakunlangan"
            value={finalizedRequests.filter(r =>
              new Date(r.updatedAt).toDateString() === new Date().toDateString()
            ).length}
            subtitle="ta so'rov"
            icon={CheckCircle}
            variant="success"
            className="animate-slide-up stagger-2"
          />
          <StatsCard
            title="Jami yakunlangan"
            value={finalizedRequests.length}
            subtitle="ta so'rov"
            icon={Shield}
            variant="primary"
            className="animate-slide-up stagger-3"
          />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Yakunlash kerak
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Yakunlangan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-warning" />
                Yakunlash kutayotgan yetkazmalar
              </CardTitle>
              <CardDescription>Qabul qilingan, lekin hali yakunlanmagan materiallar</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Yakunlash kerak bo'lgan yetkazmalar yo'q</p>
                  <p className="text-sm mt-1">Qabul qilingan materiallar bu yerda ko'rsatiladi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((request) => {
                    const estimatedUnitPrice = request.smetaItem?.unitPrice || 0;
                    const estimatedAmount = request.requestedAmount || estimatedUnitPrice * request.requestedQty;

                    return (
                      <div
                        key={request.id}
                        className="p-4 rounded-lg border bg-card space-y-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {request.smetaItem?.name || "Material"}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <Package className="h-3 w-3" />
                              <span>
                                {formatNumber(request.requestedQty)} {request.smetaItem?.unit || "ta"}
                              </span>
                            </div>
                          </div>
                          <Badge variant="outline" className="shrink-0 bg-warning/10 text-warning">
                            <Clock className="h-3 w-3 mr-1" />
                            Kutilmoqda
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-muted/30">
                          <div>
                            <p className="text-xs text-muted-foreground">Smeta narxi</p>
                            <p className="font-medium">
                              {formatMoney(estimatedUnitPrice)} / {request.smetaItem?.unit || "ta"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Taxminiy summa</p>
                            <p className="font-medium">{formatMoney(estimatedAmount)}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Qabul qilingan: {formatDate(request.updatedAt)}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => openFinalizeDialog(request)}
                          >
                            <Calculator className="h-4 w-4 mr-1" />
                            Yakunlash
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
                <CheckCircle className="h-4 w-4 text-success" />
                Yakunlangan yetkazmalar
              </CardTitle>
              <CardDescription>Narxlari tasdiqlangan materiallar</CardDescription>
            </CardHeader>
            <CardContent>
              {finalizedLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : finalizedRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Tarix hali bo'sh</p>
                  <p className="text-sm mt-1">Yakunlangan yetkazmalar bu yerda ko'rsatiladi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {finalizedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="p-3 rounded-lg border bg-success/5 border-success/10"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {request.smetaItem?.name || "Material"}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>{formatNumber(request.requestedQty)} {request.smetaItem?.unit || "ta"}</span>
                            <span className="text-success font-medium">
                              {formatMoney(request.requestedAmount)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className="bg-success/10 text-success">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Yakunlandi
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(request.updatedAt)}
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

      {/* Finalize Dialog */}
      <Dialog open={!!finalizeDialog} onOpenChange={() => setFinalizeDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yetkazmani yakunlash</DialogTitle>
            <DialogDescription>
              {finalizeDialog?.smetaItem?.name} - yakuniy narx va summa kiriting
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Comparison info */}
            {finalizeDialog?.smetaItem && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Smeta narxi:</span>
                  <span className="font-medium">
                    {formatMoney(finalizeDialog.smetaItem.unitPrice)} / {finalizeDialog.smetaItem.unit}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Miqdor:</span>
                  <span className="font-medium">
                    {formatNumber(finalizeDialog.requestedQty)} {finalizeDialog.smetaItem.unit}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Yakuniy narx (so'm / {finalizeDialog?.smetaItem?.unit || "ta"})</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  min={0}
                  className="pl-9"
                  value={finalizeData.finalUnitPrice}
                  onChange={(e) => handleUnitPriceChange(e.target.value)}
                  placeholder="Narxni kiriting"
                />
              </div>
              {finalizeDialog?.smetaItem && Number(finalizeData.finalUnitPrice) !== finalizeDialog.smetaItem.unitPrice && (
                <div className="flex items-center gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3 text-warning" />
                  <span className="text-warning">
                    Smeta narxidan farq: {formatMoney(Number(finalizeData.finalUnitPrice) - finalizeDialog.smetaItem.unitPrice)}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Jami summa (so'm)</Label>
              <div className="relative">
                <Calculator className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  min={0}
                  className="pl-9"
                  value={finalizeData.finalAmount}
                  onChange={(e) => setFinalizeData({ ...finalizeData, finalAmount: e.target.value })}
                  placeholder="Summani kiriting"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Izoh (ixtiyoriy)</Label>
              <Textarea
                value={finalizeData.note}
                onChange={(e) => setFinalizeData({ ...finalizeData, note: e.target.value })}
                placeholder="Qo'shimcha ma'lumot..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizeDialog(null)}>
              Bekor qilish
            </Button>
            <Button
              onClick={handleFinalize}
              disabled={finalizing || !finalizeData.finalAmount}
            >
              {finalizing ? "Saqlanmoqda..." : "Yakunlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
