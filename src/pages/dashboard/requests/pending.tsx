import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ClipboardCheck,
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCard } from "@/components/dashboard/alert-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { requestsApi, PurchaseRequest } from "@/lib/api/requests";

// Group requests by batchId for batch display
interface RequestGroup {
  batchId: string | null;
  requests: PurchaseRequest[];
  totalAmount: number;
  prorabName: string;
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  return `${(value / 1000).toFixed(0)}K`;
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("uz-UZ").format(value);
};

export default function PendingApprovalsPage() {
  const { user } = useAuth();
  const isReadOnly = user?.role === "BOSS";

  const [requestGroups, setRequestGroups] = useState<RequestGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<RequestGroup | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchPendingRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await requestsApi.getAll({
        status: "PENDING",
        limit: 100,
      });

      // Group requests by batchId
      const batchMap = new Map<string, RequestGroup>();
      for (const req of response.data) {
        const key = req.batchId || `single_${req.id}`;
        if (!batchMap.has(key)) {
          batchMap.set(key, {
            batchId: req.batchId || null,
            requests: [],
            totalAmount: 0,
            prorabName: req.requestedBy?.name || "Noma'lum",
          });
        }
        const group = batchMap.get(key)!;
        group.requests.push(req);
        group.totalAmount += req.requestedAmount;
      }

      setRequestGroups(Array.from(batchMap.values()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "So'rovlarni yuklashda xatolik");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  const handleApprove = async (group: RequestGroup) => {
    setIsApproving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      // Approve all requests in the group
      for (const request of group.requests) {
        await requestsApi.approve(request.id);
      }
      setSuccessMessage(`${group.requests.length} ta so'rov muvaffaqiyatli tasdiqlandi`);
      setDialogOpen(false);
      fetchPendingRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tasdiqlashda xatolik");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedGroup || !rejectReason.trim()) return;

    setIsRejecting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      // Reject all requests in the group
      for (const request of selectedGroup.requests) {
        await requestsApi.reject(request.id, rejectReason);
      }
      setSuccessMessage(`${selectedGroup.requests.length} ta so'rov rad etildi`);
      setRejectDialogOpen(false);
      setDialogOpen(false);
      setRejectReason("");
      fetchPendingRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rad etishda xatolik");
    } finally {
      setIsRejecting(false);
    }
  };

  const totalPending = requestGroups.reduce((sum, g) => sum + g.requests.length, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/requests">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Orqaga
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            Kutilayotgan tasdiqlar
          </h1>
          <p className="text-muted-foreground">
            {totalPending} ta so'rov ({requestGroups.length} ta guruh) sizning tasdiqingizni kutmoqda
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPendingRequests} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Yangilash
          </Button>
          <Badge className="bg-warning/10 text-warning px-3 py-1.5">
            <Clock className="h-4 w-4 mr-1" />
            {totalPending} ta kutmoqda
          </Badge>
        </div>
      </div>

      {error && (
        <Card className="p-4 border-destructive bg-destructive/10">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {successMessage && (
        <Card className="p-4 border-success bg-success/10">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle className="h-5 w-5" />
            <span>{successMessage}</span>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : requestGroups.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </div>
            <h3 className="text-lg font-semibold">Hech qanday kutilayotgan so'rov yo'q</h3>
            <p className="text-muted-foreground">Barcha so'rovlar ko'rib chiqilgan</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requestGroups.map((group, index) => {
            const isBatch = group.requests.length > 1;
            const hasOverrun = group.requests.some((r) => r.isOverrun);
            const firstRequest = group.requests[0];

            return (
              <Card
                key={group.batchId || firstRequest.id}
                className={`overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer group animate-slide-up ${
                  hasOverrun
                    ? "border-l-4 border-l-warning hover:border-warning/50"
                    : "hover:border-primary/20"
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => {
                  setSelectedGroup(group);
                  setDialogOpen(true);
                }}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {isBatch && (
                              <Badge variant="outline" className="gap-1">
                                <Layers className="h-3 w-3" />
                                {group.requests.length} ta material
                              </Badge>
                            )}
                            {!isBatch && (
                              <span className="text-xs font-mono text-muted-foreground">
                                #{firstRequest.id.slice(0, 8)}
                              </span>
                            )}
                            {hasOverrun && (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Smeta oshdi
                              </Badge>
                            )}
                            {firstRequest.source === "TELEGRAM" && (
                              <Badge variant="outline" className="text-xs">
                                Telegram
                              </Badge>
                            )}
                          </div>
                          {isBatch ? (
                            <>
                              <h3 className="text-lg font-semibold mt-1 group-hover:text-primary transition-colors">
                                Paket so'rov
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {group.requests.map((r) => r.smetaItem?.name || "Noma'lum").join(", ")}
                              </p>
                            </>
                          ) : (
                            <>
                              <h3 className="text-lg font-semibold mt-1 group-hover:text-primary transition-colors">
                                {firstRequest.smetaItem?.name || "Noma'lum material"}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {formatNumber(firstRequest.requestedQty)} {firstRequest.smetaItem?.unit || ""}
                              </p>
                            </>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">
                            {formatCurrency(group.totalAmount)} so'm
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(firstRequest.createdAt).toLocaleDateString("uz-UZ")}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-[10px] font-semibold text-primary">
                              {group.prorabName.split(" ").map((n) => n[0]).join("")}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-xs">{group.prorabName}</p>
                            <p className="text-[10px] text-muted-foreground">Prorab</p>
                          </div>
                        </div>
                        {firstRequest.project && (
                          <>
                            <span className="text-muted-foreground">|</span>
                            <span className="text-muted-foreground">{firstRequest.project.name}</span>
                          </>
                        )}
                      </div>

                      {firstRequest.note && !isBatch && (
                        <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                          "{firstRequest.note}"
                        </p>
                      )}
                    </div>

                    {!isReadOnly && (
                      <div className="lg:w-48 space-y-2">
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedGroup(group);
                              setRejectDialogOpen(true);
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rad
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 bg-success hover:bg-success/90"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(group);
                            }}
                            disabled={isApproving}
                          >
                            {isApproving ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            )}
                            Tasdiqlash
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedGroup && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedGroup.requests.length > 1 ? (
                    <>
                      <Layers className="h-5 w-5" />
                      Paket so'rov ({selectedGroup.requests.length} ta material)
                    </>
                  ) : (
                    <>So'rov #{selectedGroup.requests[0].id.slice(0, 8)}</>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {selectedGroup.prorabName} tomonidan yuborilgan
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {selectedGroup.requests.some((r) => r.isOverrun) && (
                  <AlertCard
                    type="warning"
                    title="Ogohlantirish"
                    description="Ba'zi materiallar smeta chegarasidan oshadi"
                  />
                )}

                {selectedGroup.requests.map((request, i) => (
                  <Card key={request.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{request.smetaItem?.name || "Noma'lum"}</h4>
                          {request.isOverrun && (
                            <Badge variant="destructive" className="mt-1 gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              +{request.overrunPercent}% oshiq
                            </Badge>
                          )}
                        </div>
                        <p className="font-bold text-primary">
                          {formatNumber(request.requestedAmount)} so'm
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Miqdor:</span>
                          <span className="ml-2 font-medium">
                            {formatNumber(request.requestedQty)} {request.smetaItem?.unit || ""}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Birlik narxi:</span>
                          <span className="ml-2 font-medium">
                            {formatNumber(request.smetaItem?.unitPrice || 0)} so'm
                          </span>
                        </div>
                      </div>
                      {request.note && (
                        <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                          "{request.note}"
                        </p>
                      )}
                    </div>
                  </Card>
                ))}

                <div className="text-sm space-y-1 pt-2">
                  <p>
                    <span className="text-muted-foreground">Jami summa:</span>{" "}
                    <span className="font-bold text-primary">
                      {formatNumber(selectedGroup.totalAmount)} so'm
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">So'ragan:</span>{" "}
                    <span className="font-medium">{selectedGroup.prorabName}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Sana:</span>{" "}
                    <span className="font-medium">
                      {new Date(selectedGroup.requests[0].createdAt).toLocaleDateString("uz-UZ")}
                    </span>
                  </p>
                </div>
              </div>

              {!isReadOnly && (
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setRejectDialogOpen(true);
                    }}
                    disabled={isRejecting}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rad etish
                  </Button>
                  <Button
                    className="bg-success hover:bg-success/90"
                    onClick={() => handleApprove(selectedGroup)}
                    disabled={isApproving}
                  >
                    {isApproving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Tasdiqlash
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              So'rovni rad etish
            </DialogTitle>
            <DialogDescription>
              {selectedGroup && (
                selectedGroup.requests.length > 1
                  ? `${selectedGroup.requests.length} ta material rad etiladi`
                  : `${selectedGroup.requests[0].smetaItem?.name || "Noma'lum"}`
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rad etish sababi</label>
              <Textarea
                placeholder="Sabab kiriting..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || isRejecting}
            >
              {isRejecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Rad etish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
