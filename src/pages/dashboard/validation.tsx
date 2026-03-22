import { useState } from "react";
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  DollarSign,
  Calculator,
  MessageSquare,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApi, useMutation } from "@/hooks/use-api";
import { useAuth } from "@/lib/auth";
import { workersApi, WorkLog } from "@/lib/api/workers";
import { smetaItemsApi, SmetaItem } from "@/lib/api/smeta-items";
import { analyticsApi, SmetaMonitoringSummary } from "@/lib/api/analytics";
import { StatsSkeleton } from "@/components/ui/table-skeleton";
import { ErrorMessage } from "@/components/ui/error-message";

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  return num.toLocaleString("uz-UZ");
}

function formatMoney(num: number): string {
  return num.toLocaleString("uz-UZ") + " so'm";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "short",
  });
}

interface SmetaAlert {
  id: string;
  name: string;
  usedPercentage: number;
  usedQuantity: number;
  quantity: number;
  unit: string;
}

interface PriceAdjustmentData {
  unitPrice: string;
  totalAmount: string;
}

export default function ValidationPage() {
  const { user } = useAuth();
  const isReadOnly = user?.role === "BOSS";

  const [activeTab, setActiveTab] = useState("validation");
  const [priceDialog, setPriceDialog] = useState<WorkLog | null>(null);
  const [rejectDialog, setRejectDialog] = useState<WorkLog | null>(null);
  const [priceData, setPriceData] = useState<PriceAdjustmentData>({
    unitPrice: "",
    totalAmount: "",
  });
  const [rejectReason, setRejectReason] = useState("");

  // Fetch unvalidated (pending) work logs
  const {
    data: pendingWorkLogsResponse,
    loading: pendingLoading,
    error: pendingError,
    refetch: refetchPending,
  } = useApi(() => workersApi.getUnvalidatedWorkLogs({ limit: 50 }), []);

  // Fetch all work logs to filter validated ones from today
  const todayStr = new Date().toISOString().split("T")[0];
  const {
    data: allWorkLogsResponse,
    loading: allWorkLogsLoading,
  } = useApi(() => workersApi.getWorkLogs({ limit: 100 }), []);

  // Fetch smeta items to calculate alerts (items near budget threshold)
  const {
    data: smetaItemsResponse,
    loading: smetaItemsLoading,
    error: smetaItemsError,
    refetch: refetchSmetaItems,
  } = useApi(() => smetaItemsApi.getAll({ limit: 500 }), []);

  // Fetch smeta monitoring for project progress tab
  const {
    data: smetaMonitoringData,
    loading: smetaMonitoringLoading,
  } = useApi(() => analyticsApi.getSmetaMonitoring(), [], { enabled: activeTab === "progress" });

  // Mutation for validating work logs
  const { mutate: approveWorkLog, loading: approvingId } = useMutation(
    ({ id, unitPrice, totalAmount }: { id: string; unitPrice?: number; totalAmount?: number }) =>
      workersApi.validateWithPrice(id, { unitPrice: unitPrice || 0, totalAmount: totalAmount || 0 })
  );

  // Mutation for rejecting work logs
  const { mutate: rejectWorkLogMutation, loading: rejectingId } = useMutation(
    ({ id, reason }: { id: string; reason?: string }) =>
      workersApi.rejectWorkLog(id, { reason })
  );

  const validatingId = approvingId || rejectingId;

  const loading = pendingLoading || allWorkLogsLoading || smetaItemsLoading;
  const error = pendingError || smetaItemsError;

  const pendingWorkLogs = pendingWorkLogsResponse?.data || [];
  const allWorkLogs = allWorkLogsResponse?.data || [];
  const smetaItems = smetaItemsResponse?.data || [];

  // Filter work logs validated today
  const validatedToday = allWorkLogs.filter(
    (log) => log.isValidated && log.validatedAt && log.validatedAt.startsWith(todayStr)
  );

  // Filter work logs rejected today
  const rejectedToday = allWorkLogs.filter(
    (log) => log.isRejected && log.validatedAt && log.validatedAt.startsWith(todayStr)
  );

  // Count approved (validated) and rejected
  const approvedCount = validatedToday.length;
  const rejectedCount = rejectedToday.length;

  // Calculate smeta alerts - items where usedQuantity/quantity >= 80%
  const smetaAlerts: SmetaAlert[] = smetaItems
    .filter((item: SmetaItem) => {
      const usedPercentage = item.quantity > 0 ? (item.usedQuantity / item.quantity) * 100 : 0;
      return usedPercentage >= 80;
    })
    .map((item: SmetaItem) => ({
      id: item.id,
      name: item.name,
      usedPercentage: item.quantity > 0 ? Math.round((item.usedQuantity / item.quantity) * 100) : 0,
      usedQuantity: item.usedQuantity,
      quantity: item.quantity,
      unit: item.unit,
    }))
    .sort((a, b) => b.usedPercentage - a.usedPercentage);

  // Find smeta item for a work log
  const getSmetaItem = (log: WorkLog): SmetaItem | undefined => {
    if (log.smetaItem) {
      return smetaItems.find((item: SmetaItem) => item.id === log.smetaItem?.id);
    }
    // Try to match by work type name
    return smetaItems.find((item: SmetaItem) =>
      item.name.toLowerCase().includes(log.workType.toLowerCase())
    );
  };

  const handleValidate = async (workLog: WorkLog) => {
    try {
      const smetaItem = getSmetaItem(workLog);
      await approveWorkLog({
        id: workLog.id,
        unitPrice: workLog.unitPrice || smetaItem?.unitPrice || 0,
        totalAmount: workLog.totalAmount || (workLog.quantity * (smetaItem?.unitPrice || 0)),
      });
      refetchPending();
    } catch (err) {
      console.error("Failed to validate work log:", err);
    }
  };

  const openPriceDialog = (log: WorkLog) => {
    const smetaItem = getSmetaItem(log);
    setPriceDialog(log);
    setPriceData({
      unitPrice: String(log.unitPrice || smetaItem?.unitPrice || 0),
      totalAmount: String(log.totalAmount || (log.quantity * (smetaItem?.unitPrice || 0))),
    });
  };

  const handleUnitPriceChange = (value: string) => {
    const unitPrice = Number(value) || 0;
    const qty = priceDialog?.quantity || 0;
    setPriceData({
      unitPrice: value,
      totalAmount: String(unitPrice * qty),
    });
  };

  const handleValidateWithPrice = async () => {
    if (!priceDialog) return;
    try {
      await approveWorkLog({
        id: priceDialog.id,
        unitPrice: Number(priceData.unitPrice) || 0,
        totalAmount: Number(priceData.totalAmount) || 0,
      });
      setPriceDialog(null);
      setPriceData({ unitPrice: "", totalAmount: "" });
      refetchPending();
    } catch (err) {
      console.error("Failed to validate work log:", err);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog || !rejectReason.trim()) return;
    try {
      await rejectWorkLogMutation({ id: rejectDialog.id, reason: rejectReason });
      setRejectDialog(null);
      setRejectReason("");
      refetchPending();
    } catch (err) {
      console.error("Failed to reject work log:", err);
    }
  };

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Tekshirish</h1>
          <p className="text-muted-foreground">Ish hisobotlari va smeta nazorati</p>
        </div>
        <ErrorMessage
          error={error}
          onRetry={() => {
            refetchPending();
            refetchSmetaItems();
          }}
        />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Tekshirish</h1>
          <p className="text-muted-foreground">Ish hisobotlari va smeta nazorati</p>
        </div>

        {loading ? (
          <StatsSkeleton />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Kutilmoqda"
              value={pendingWorkLogs.length}
              subtitle="ta hisobot"
              icon={Clock}
              variant="warning"
              className="animate-slide-up stagger-1"
            />
            <StatsCard
              title="Bugun tasdiqlandi"
              value={approvedCount}
              subtitle="ta hisobot"
              icon={CheckCircle}
              variant="success"
              className="animate-slide-up stagger-2"
            />
            <StatsCard
              title="Rad etildi"
              value={rejectedCount}
              subtitle="ta hisobot"
              icon={XCircle}
              variant="danger"
              className="animate-slide-up stagger-3"
            />
            <StatsCard
              title="Smeta ogohlantirishlari"
              value={smetaAlerts.length}
              subtitle="ta material"
              icon={AlertTriangle}
              variant="warning"
              className="animate-slide-up stagger-4"
            />
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="validation" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Tekshirish
              {pendingWorkLogs.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-warning/10 text-warning text-xs">
                  {pendingWorkLogs.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Loyiha bajarilishi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="validation" className="mt-4">
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                Tekshirish kutayotgan ishlar
              </CardTitle>
              <CardDescription>Prorablar hisobotlari</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : pendingWorkLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Hozircha tekshirish kerak bo'lgan ishlar yo'q</p>
                  <p className="text-sm mt-1">
                    Prorablar hisobot yuborganda bu yerda ko'rsatiladi
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingWorkLogs.map((log) => {
                    const smetaItem = getSmetaItem(log);
                    const smetaPrice = smetaItem?.unitPrice || 0;
                    const enteredPrice = log.unitPrice || 0;
                    const priceDiff = enteredPrice > 0 ? enteredPrice - smetaPrice : 0;
                    const hasPriceDiff = priceDiff !== 0 && smetaPrice > 0;

                    return (
                      <div
                        key={log.id}
                        className="p-4 rounded-lg border bg-card space-y-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{log.workType}</p>
                              {hasPriceDiff && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="secondary"
                                      className={`shrink-0 ${
                                        priceDiff > 0
                                          ? "bg-destructive/10 text-destructive"
                                          : "bg-success/10 text-success"
                                      }`}
                                    >
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      {priceDiff > 0 ? "+" : ""}
                                      {formatNumber(priceDiff)}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Smeta narxi: {formatMoney(smetaPrice)}</p>
                                    <p>Kiritilgan narx: {formatMoney(enteredPrice)}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>{log.worker?.name || log.loggedBy.name}</span>
                              {log.project && (
                                <>
                                  <span className="text-muted-foreground/50">|</span>
                                  <span>{log.project.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="shrink-0">
                            {formatDate(log.date)}
                          </Badge>
                        </div>

                        {/* Smeta comparison info */}
                        {smetaItem && (
                          <div className="p-2 rounded bg-muted/30 text-xs flex items-center justify-between">
                            <span className="text-muted-foreground">
                              Smeta: {formatNumber(smetaItem.quantity)} {smetaItem.unit} x {formatMoney(smetaItem.unitPrice)}
                            </span>
                            <span className="font-medium">
                              = {formatMoney(smetaItem.totalAmount)}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            <span className="text-muted-foreground">
                              {log.quantity} {log.unit}
                            </span>
                            {log.totalAmount !== null && log.totalAmount !== undefined && (
                              <span className="font-medium">
                                {formatNumber(log.totalAmount)} so'm
                              </span>
                            )}
                          </div>
                          {!isReadOnly && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setRejectDialog(log)}
                                disabled={!!validatingId}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Rad etish
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPriceDialog(log)}
                                disabled={!!validatingId}
                              >
                                <DollarSign className="h-4 w-4 mr-1" />
                                Narx bilan
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleValidate(log)}
                                disabled={!!validatingId}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Tasdiqlash
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Smeta ogohlantirishlari
                </CardTitle>
                <CardDescription>Chegaraga yaqin materiallar</CardDescription>
              </CardHeader>
              <CardContent>
                {smetaItemsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : smetaAlerts.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Hozircha ogohlantirish yo'q</p>
                    <p className="text-xs mt-1">
                      Materiallar chegaraga yaqinlashganda ko'rsatiladi
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {smetaAlerts.slice(0, 5).map((alert) => (
                      <div
                        key={alert.id}
                        className="p-3 rounded-lg border bg-card space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm truncate flex-1">
                            {alert.name}
                          </p>
                          <Badge
                            variant={alert.usedPercentage >= 100 ? "destructive" : "secondary"}
                            className={alert.usedPercentage >= 100 ? "" : "bg-warning/10 text-warning"}
                          >
                            {alert.usedPercentage}%
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {formatNumber(alert.usedQuantity)} / {formatNumber(alert.quantity)} {alert.unit}
                          </span>
                          {alert.usedPercentage >= 100 && (
                            <span className="text-destructive font-medium">
                              Chegara oshdi!
                            </span>
                          )}
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              alert.usedPercentage >= 100
                                ? "bg-destructive"
                                : "bg-warning"
                            }`}
                            style={{ width: `${Math.min(alert.usedPercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {smetaAlerts.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        +{smetaAlerts.length - 5} ta boshqa ogohlantirish
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="animate-slide-up" style={{ animationDelay: "0.4s" }}>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-success" />
                  Bugun tekshirilganlar
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allWorkLogsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : validatedToday.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Bugun tekshirilgan ishlar yo'q</p>
                    <p className="text-xs mt-1">
                      Ishlar tasdiqlanishi yoki rad etilganda ko'rsatiladi
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {validatedToday.slice(0, 5).map((log) => (
                      <div
                        key={log.id}
                        className="p-3 rounded-lg border bg-card space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">
                            {log.workType}
                          </p>
                          <Badge variant="secondary" className="bg-success/10 text-success shrink-0">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Tasdiqlandi
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{log.worker?.name || log.loggedBy.name}</span>
                          <span>
                            {log.quantity} {log.unit}
                          </span>
                        </div>
                      </div>
                    ))}
                    {validatedToday.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        +{validatedToday.length - 5} ta boshqa
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
          </TabsContent>

          <TabsContent value="progress" className="mt-4">
            <ProjectProgressSection
              data={smetaMonitoringData || []}
              loading={smetaMonitoringLoading}
            />
          </TabsContent>
        </Tabs>

        {/* Price Adjustment Dialog */}
        <Dialog open={!!priceDialog} onOpenChange={() => setPriceDialog(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Narx bilan tasdiqlash</DialogTitle>
              <DialogDescription>
                {priceDialog?.workType} - narx va summa kiriting
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Current info */}
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ish turi:</span>
                  <span className="font-medium">{priceDialog?.workType}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Miqdor:</span>
                  <span className="font-medium">
                    {priceDialog?.quantity} {priceDialog?.unit}
                  </span>
                </div>
                {priceDialog && getSmetaItem(priceDialog) && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Smeta narxi:</span>
                    <span className="font-medium">
                      {formatMoney(getSmetaItem(priceDialog)?.unitPrice || 0)}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Birlik narxi (so'm)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min={0}
                    className="pl-9"
                    value={priceData.unitPrice}
                    onChange={(e) => handleUnitPriceChange(e.target.value)}
                    placeholder="Narxni kiriting"
                  />
                </div>
                {priceDialog && getSmetaItem(priceDialog) && Number(priceData.unitPrice) !== getSmetaItem(priceDialog)?.unitPrice && (
                  <div className="flex items-center gap-1 text-xs">
                    <AlertTriangle className="h-3 w-3 text-warning" />
                    <span className="text-warning">
                      Smeta narxidan farq: {formatMoney(Number(priceData.unitPrice) - (getSmetaItem(priceDialog)?.unitPrice || 0))}
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
                    value={priceData.totalAmount}
                    onChange={(e) => setPriceData({ ...priceData, totalAmount: e.target.value })}
                    placeholder="Summani kiriting"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPriceDialog(null)}>
                Bekor qilish
              </Button>
              <Button
                onClick={handleValidateWithPrice}
                disabled={!!validatingId || !priceData.totalAmount}
              >
                {validatingId ? "Saqlanmoqda..." : "Tasdiqlash"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Ishni rad etish</DialogTitle>
              <DialogDescription>
                {rejectDialog?.workType} - rad etish sababini kiriting
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Current info */}
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ish turi:</span>
                  <span className="font-medium">{rejectDialog?.workType}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ishchi:</span>
                  <span className="font-medium">
                    {rejectDialog?.worker?.name || rejectDialog?.loggedBy.name}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Miqdor:</span>
                  <span className="font-medium">
                    {rejectDialog?.quantity} {rejectDialog?.unit}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rad etish sababi *</Label>
                <div className="relative">
                  <Textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Nima uchun rad etilayotganini yozing..."
                    rows={3}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Sabab ishchi va prorabga yuboriladi
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialog(null)}>
                Bekor qilish
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!!validatingId || !rejectReason.trim()}
              >
                <XCircle className="h-4 w-4 mr-1" />
                {validatingId ? "Saqlanmoqda..." : "Rad etish"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// --- Project Progress Section ---

function ProjectProgressSection({
  data,
  loading,
}: {
  data: SmetaMonitoringSummary[];
  loading: boolean;
}) {
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-destructive";
    if (percentage >= 80) return "bg-warning";
    return "bg-success";
  };

  const getProgressTextColor = (percentage: number) => {
    if (percentage >= 100) return "text-destructive";
    if (percentage >= 80) return "text-warning";
    return "text-success";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Loyiha bajarilishi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Loyiha bajarilishi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Loyiha ma'lumotlari topilmadi</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {data.map((project) => (
        <Card key={project.projectId} className="animate-slide-up">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  {project.projectName}
                </CardTitle>
                <CardDescription>
                  Umumiy: {formatMoney(project.totalUsedAmount)} / {formatMoney(project.totalSmetaAmount)}
                </CardDescription>
              </div>
              <div className="text-right">
                <Badge
                  variant="secondary"
                  className={`text-lg px-3 py-1 ${getProgressTextColor(project.overallUsagePercentage)}`}
                >
                  {project.overallUsagePercentage.toFixed(1)}%
                </Badge>
                {project.itemsOverrun > 0 && (
                  <p className="text-xs text-destructive mt-1">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    {project.itemsOverrun} ta oshgan
                  </p>
                )}
              </div>
            </div>
            {/* Overall progress bar */}
            <div className="mt-3">
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${getProgressColor(project.overallUsagePercentage)}`}
                  style={{ width: `${Math.min(project.overallUsagePercentage, 100)}%` }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nomi</TableHead>
                    <TableHead className="text-center">Smeta</TableHead>
                    <TableHead className="text-center">Ishlatilgan</TableHead>
                    <TableHead className="text-center">Qoldiq</TableHead>
                    <TableHead className="text-right">Bajarilish</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.items.slice(0, 20).map((item) => (
                    <TableRow
                      key={item.smetaItemId}
                      className={item.isOverrun ? "bg-destructive/5" : ""}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {item.name}
                          {item.isOverrun && (
                            <Badge variant="destructive" className="text-[10px]">
                              <AlertTriangle className="h-3 w-3 mr-0.5" />
                              +{item.overrunQuantity.toFixed(1)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm">
                          {formatNumber(item.smetaQuantity)} {item.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-sm font-medium ${item.isOverrun ? "text-destructive" : ""}`}>
                          {formatNumber(item.usedQuantity)} {item.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-sm ${item.remainingQuantity < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                          {formatNumber(item.remainingQuantity)} {item.unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getProgressColor(item.usagePercentage)}`}
                              style={{ width: `${Math.min(item.usagePercentage, 100)}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium w-12 text-right ${getProgressTextColor(item.usagePercentage)}`}>
                            {item.usagePercentage.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {project.items.length > 20 && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                +{project.items.length - 20} ta boshqa element
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
