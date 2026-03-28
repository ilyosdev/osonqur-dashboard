import { useState } from "react";
import { UserCircle, Wallet, ClipboardList, AlertTriangle, UserPlus, Loader2 } from "lucide-react";
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
import { workersApi } from "@/lib/api/workers";
import { analyticsApi } from "@/lib/api/analytics";
import { StatsSkeleton } from "@/components/ui/table-skeleton";
import { ErrorMessage } from "@/components/ui/error-message";

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  return num.toLocaleString("uz-UZ");
}

export default function WorkersPage() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ firstName: "", lastName: "", phone: "", position: "" });

  const {
    data: workersResponse,
    loading: workersLoading,
    error: workersError,
    refetch: refetchWorkers,
  } = useApi(() => workersApi.getAll({ limit: 100 }), []);

  const {
    data: workLogsResponse,
    loading: workLogsLoading,
  } = useApi(() => workersApi.getWorkLogs({ limit: 10 }), []);

  const {
    data: workerDebtsData,
  } = useApi(() => analyticsApi.getWorkerDebts(), []);

  const loading = workersLoading || workLogsLoading;
  const error = workersError;

  const workers = workersResponse?.data || [];
  const recentWorkLogs = workLogsResponse?.data || [];

  const todayStr = new Date().toISOString().split('T')[0];
  const todayWorkLogs = recentWorkLogs.filter((l) => l.date.startsWith(todayStr));

  const handleAddWorker = async () => {
    if (!addForm.firstName.trim() || !addForm.lastName.trim()) {
      setCreateError("Ism va familiya kiritilishi shart");
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    try {
      await workersApi.create({
        firstName: addForm.firstName.trim(),
        lastName: addForm.lastName.trim(),
        phone: addForm.phone.trim() || undefined,
        position: addForm.position.trim() || undefined,
      });
      setShowAddDialog(false);
      setAddForm({ firstName: "", lastName: "", phone: "", position: "" });
      refetchWorkers();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Usta qo'shishda xatolik");
    } finally {
      setIsCreating(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Ustalar</h1>
          <p className="text-muted-foreground">Ustalar va ish hisoboti</p>
        </div>
        <ErrorMessage error={error} onRetry={refetchWorkers} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Ustalar</h1>
        <p className="text-muted-foreground">Ustalar va ish hisoboti</p>
      </div>

      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Jami ustalar"
            value={workers.length}
            subtitle="faol"
            icon={UserCircle}
            variant="primary"
            className="animate-slide-up stagger-1"
          />
          <StatsCard
            title="Jami qarz"
            value={formatNumber(workerDebtsData?.totalDebt ?? 0)}
            subtitle="to'lanmagan"
            icon={Wallet}
            variant="danger"
            className="animate-slide-up stagger-2"
          />
          <StatsCard
            title="Qarzdorlar"
            value={workerDebtsData?.workerCount ?? 0}
            subtitle="ta usta"
            icon={AlertTriangle}
            variant="warning"
            className="animate-slide-up stagger-3"
          />
          <StatsCard
            title="Bugungi ishlar"
            value={todayWorkLogs.length}
            subtitle="ta hisobot"
            icon={ClipboardList}
            variant="success"
            className="animate-slide-up stagger-4"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserCircle className="h-4 w-4 text-primary" />
                Ustalar ro'yxati
              </CardTitle>
              <CardDescription>Barcha ustalar</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowAddDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Yangi usta
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {workersLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : workers.length > 0 ? (
              workers.map((worker) => (
                <div key={worker.id} className="p-4 rounded-lg border bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{worker.firstName} {worker.lastName}</p>
                      <p className="text-xs text-muted-foreground">{worker.position || "Usta"}</p>
                    </div>
                    {worker.salary ? (
                      <Badge variant="secondary">{formatNumber(worker.salary)} so'm/kun</Badge>
                    ) : (
                      <Badge variant="outline">Maosh ko'rsatilmagan</Badge>
                    )}
                  </div>
                  {worker.phone && (
                    <p className="text-xs text-muted-foreground">Tel: {worker.phone}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Hozircha ustalar yo'q
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-success" />
              Oxirgi ishlar
            </CardTitle>
            <CardDescription>Bajarilgan ishlar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {workLogsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recentWorkLogs.length > 0 ? (
              recentWorkLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm">{log.worker?.name || log.loggedBy.name}</p>
                    <Badge variant="secondary" className="bg-muted text-[10px]">
                      {log.quantity} {log.unit}
                    </Badge>
                  </div>
                  {log.workType && (
                    <p className="text-sm text-muted-foreground truncate">{log.workType}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.date).toLocaleDateString("uz-UZ")}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Hozircha ish hisoboti yo'q
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Worker Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Yangi usta qo'shish
            </DialogTitle>
          </DialogHeader>

          {createError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {createError}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Ism *</Label>
                <Input
                  id="firstName"
                  placeholder="Ism"
                  value={addForm.firstName}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Familiya *</Label>
                <Input
                  id="lastName"
                  placeholder="Familiya"
                  value={addForm.lastName}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workerPhone">Telefon</Label>
              <Input
                id="workerPhone"
                placeholder="+998 __ ___ __ __"
                value={addForm.phone}
                onChange={(e) => setAddForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Lavozim</Label>
              <Input
                id="position"
                placeholder="Masalan: Gʻishtchi"
                value={addForm.position}
                onChange={(e) => setAddForm((prev) => ({ ...prev, position: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={isCreating}>
              Bekor qilish
            </Button>
            <Button onClick={handleAddWorker} disabled={isCreating}>
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
