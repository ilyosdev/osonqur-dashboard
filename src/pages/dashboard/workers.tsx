import { useState } from "react";
import {
  UserCircle, Wallet, ClipboardList, AlertTriangle, UserPlus, Loader2,
  ArrowLeft, ChevronLeft, ChevronRight, Phone, Briefcase, AlertCircle, Banknote,
  HardHat, Building2, DollarSign, ClipboardCheck,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApi } from "@/hooks/use-api";
import { workersApi, Worker } from "@/lib/api/workers";
import { projectsApi } from "@/lib/api/projects";
import { analyticsApi } from "@/lib/api/analytics";
import { StatsSkeleton } from "@/components/ui/table-skeleton";
import { ErrorMessage } from "@/components/ui/error-message";

function fmt(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  return num.toLocaleString("uz-UZ");
}

type Period = "bugun" | "hafta" | "oy" | "barchasi";
// Views: main → ish-hajmi-list → worker-detail → ish-hajmi-logs
type View = "main" | "ish-hajmi-list" | "worker-detail" | "ish-hajmi-logs";

function getPeriodDates(period: Period): { startDate?: string; endDate?: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (period === "bugun") { const t = iso(now); return { startDate: t, endDate: t }; }
  if (period === "hafta") { const f = new Date(now); f.setDate(now.getDate() - 7); return { startDate: iso(f), endDate: iso(now) }; }
  if (period === "oy") { const f = new Date(now); f.setDate(now.getDate() - 30); return { startDate: iso(f), endDate: iso(now) }; }
  return {};
}

const today = new Date().toISOString().split("T")[0];
const PAGE = 10;

export default function WorkersPage() {
  const [view, setView] = useState<View>("main");

  // Ish hajmi state
  const [ihPage, setIhPage] = useState(1);
  const [ihWorker, setIhWorker] = useState<Worker | null>(null);
  const [ihPeriod, setIhPeriod] = useState<Period>("bugun");
  const [ihLogsPage, setIhLogsPage] = useState(1);

  // Worker detail to'lov
  const [detailPayAmount, setDetailPayAmount] = useState("");
  const [detailPayLoading, setDetailPayLoading] = useState(false);
  const [detailPayError, setDetailPayError] = useState<string | null>(null);
  const [detailPaySuccess, setDetailPaySuccess] = useState(false);

  // Yangi ish qo'shish dialog
  const [showWorklogDialog, setShowWorklogDialog] = useState(false);
  const [worklogForm, setWorklogForm] = useState({
    projectId: "", workType: "", quantity: "", unit: "m²", unitPrice: "", date: today,
  });
  const [worklogLoading, setWorklogLoading] = useState(false);
  const [worklogError, setWorklogError] = useState<string | null>(null);

  // To'lov qo'shish dialog
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payWorkerId, setPayWorkerId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // To'lov arxivi dialog
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  // Add worker dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", phone: "", specialty: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Main data
  const { data: workersResponse, loading: workersLoading, error: workersError, refetch: refetchWorkers } =
    useApi(() => workersApi.getAll({ limit: 100 }), []);
  const { data: workLogsResponse, loading: workLogsLoading } =
    useApi(() => workersApi.getWorkLogs({ limit: 10 }), []);
  const { data: workerDebtsData } = useApi(() => analyticsApi.getWorkerDebts(), []);
  const { data: projectsResponse } = useApi(() => projectsApi.getAll({ limit: 100 }), []);

  // Ish hajmi: worker list (paginated)
  const { data: ihWorkersResp, loading: ihWorkersLoading } = useApi(
    () => view === "ish-hajmi-list"
      ? workersApi.getAll({ page: ihPage, limit: PAGE })
      : Promise.resolve(null),
    [view, ihPage]
  );

  // Ish hajmi: logs for selected worker + period
  const periodDates = getPeriodDates(ihPeriod);
  const { data: ihLogsResp, loading: ihLogsLoading } = useApi(
    () => view === "ish-hajmi-logs" && ihWorker
      ? workersApi.getWorkLogs({ workerId: ihWorker.id, page: ihLogsPage, limit: PAGE, ...periodDates })
      : Promise.resolve(null),
    [view, ihWorker?.id, ihPeriod, ihLogsPage]
  );

  // Worker detail: to'lanmagan ishlar
  const { data: workerUnpaidResp, loading: workerUnpaidLoading } = useApi(
    () => view === "worker-detail" && ihWorker
      ? workersApi.getWorkLogs({ workerId: ihWorker.id, limit: 50, isPaid: false })
      : Promise.resolve(null),
    [view, ihWorker?.id]
  );

  // To'lov arxivi
  const { data: paymentsResp, loading: paymentsLoading } = useApi(
    () => showArchiveDialog ? workersApi.getPayments({ limit: 20 }) : Promise.resolve(null),
    [showArchiveDialog]
  );

  const workers = workersResponse?.data || [];
  const recentWorkLogs = workLogsResponse?.data || [];
  const projects = projectsResponse?.data || [];
  const todayStr = new Date().toISOString().split("T")[0];
  const todayWorkLogs = recentWorkLogs.filter((l) => l.date.startsWith(todayStr));

  const handleAddWorker = async () => {
    if (!addForm.name.trim()) { setAddError("Ism kiritilishi shart"); return; }
    setAddLoading(true); setAddError(null);
    try {
      await workersApi.create({ name: addForm.name.trim(), phone: addForm.phone.trim() || undefined, specialty: addForm.specialty.trim() || undefined });
      setShowAddDialog(false);
      setAddForm({ name: "", phone: "", specialty: "" });
      refetchWorkers();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally { setAddLoading(false); }
  };

  const handleWorklog = async () => {
    if (!ihWorker) return;
    if (!worklogForm.projectId) { setWorklogError("Loyihani tanlang"); return; }
    if (!worklogForm.workType.trim()) { setWorklogError("Ish turini kiriting"); return; }
    if (!worklogForm.quantity || parseFloat(worklogForm.quantity) <= 0) { setWorklogError("Miqdorni kiriting"); return; }
    setWorklogLoading(true); setWorklogError(null);
    try {
      await workersApi.createWorkLog({
        workerId: ihWorker.id,
        projectId: worklogForm.projectId,
        workType: worklogForm.workType.trim(),
        quantity: parseFloat(worklogForm.quantity),
        unit: worklogForm.unit,
        unitPrice: worklogForm.unitPrice ? parseFloat(worklogForm.unitPrice) : undefined,
        date: new Date(worklogForm.date).toISOString(),
      });
      setShowWorklogDialog(false);
      setWorklogForm({ projectId: "", workType: "", quantity: "", unit: "m²", unitPrice: "", date: today });
    } catch (err) {
      setWorklogError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally { setWorklogLoading(false); }
  };

  const handlePayment = async () => {
    const amount = parseFloat(payAmount);
    if (!payWorkerId) { setPayError("Ustani tanlang"); return; }
    if (!payAmount || isNaN(amount) || amount <= 0) { setPayError("Summani kiriting"); return; }
    setPayLoading(true); setPayError(null);
    try {
      await workersApi.createPayment({ workerId: payWorkerId, amount });
      setShowPayDialog(false); setPayWorkerId(""); setPayAmount("");
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally { setPayLoading(false); }
  };

  if (workersError) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Ustalar</h1>
          <p className="text-muted-foreground">Ustalar va ish hisoboti</p>
        </div>
        <ErrorMessage error={workersError} onRetry={refetchWorkers} />
      </div>
    );
  }

  // ===================== ISH HAJMI: WORKERS LIST =====================
  if (view === "ish-hajmi-list") {
    const ihWorkers = ihWorkersResp?.data || [];
    const ihTotal = ihWorkersResp?.total || 0;
    const ihTotalPages = Math.ceil(ihTotal / PAGE);

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setView("main")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">📐 Ish hajmi</h1>
            <p className="text-muted-foreground">Usta tanlang</p>
          </div>
        </div>

        <Card className="animate-slide-up">
          <CardContent className="pt-4 space-y-2">
            {ihWorkersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />)}
              </div>
            ) : ihWorkers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Ustalar topilmadi</p>
            ) : (
              ihWorkers.map((w) => (
                <button
                  key={w.id}
                  onClick={() => { setIhWorker(w); setView("worker-detail"); }}
                  className="w-full flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
                >
                  <div>
                    <p className="font-medium flex items-center gap-1"><HardHat className="h-3.5 w-3.5 text-muted-foreground" /> {w.name}</p>
                    {w.phone && <p className="text-xs text-muted-foreground">📞 {w.phone}</p>}
                    {w.specialty && <p className="text-xs text-muted-foreground">{w.specialty}</p>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {ihTotalPages > 1 && (
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" disabled={ihPage <= 1} onClick={() => setIhPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">{ihPage} / {ihTotalPages}</span>
            <Button variant="outline" size="sm" disabled={ihPage >= ihTotalPages} onClick={() => setIhPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ===================== WORKER DETAIL =====================
  if (view === "worker-detail") {
    const unpaidLogs = workerUnpaidResp?.data || [];
    const totalDebt = ihWorker.balance ?? 0;

    const handleDetailPay = async () => {
      const amount = parseFloat(detailPayAmount);
      if (!detailPayAmount || isNaN(amount) || amount <= 0) { setDetailPayError("Summani kiriting"); return; }
      setDetailPayLoading(true); setDetailPayError(null);
      try {
        await workersApi.createPayment({ workerId: ihWorker!.id, amount });
        setDetailPaySuccess(true);
        setDetailPayAmount("");
      } catch (err) {
        setDetailPayError(err instanceof Error ? err.message : "Xatolik yuz berdi");
      } finally { setDetailPayLoading(false); }
    };

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setView("ish-hajmi-list")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{ihWorker?.name}</h1>
            <div className="flex items-center gap-3 text-muted-foreground text-sm mt-1">
              {ihWorker?.phone && (
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{ihWorker.phone}</span>
              )}
              {ihWorker?.specialty && (
                <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{ihWorker.specialty}</span>
              )}
            </div>
          </div>
        </div>

        {/* Jami qarz */}
        {totalDebt > 0 && (
          <div className="grid grid-cols-1">
            <div className="p-5 rounded-xl border bg-card flex items-center justify-between shadow-sm">
              <div>
                <p className="text-sm text-muted-foreground">Jami qarz</p>
                <p className="text-2xl font-bold mt-0.5">{fmt(totalDebt)} so'm</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </div>
        )}

        {/* To'lanmagan ishlar */}
        <Card className="animate-slide-up">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              To'lanmagan ishlar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {workerUnpaidLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse"/>)}</div>
            ) : unpaidLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">To'lanmagan ishlar yo'q</p>
            ) : (
              unpaidLogs.map((log) => (
                <div key={log.id} className="p-4 rounded-lg border bg-card space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{log.workType}</p>
                    <Badge variant="secondary">{log.isValidated ? "Tasdiqlangan" : "Kutmoqda"}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{log.quantity} {log.unit}{log.totalAmount ? ` — ${fmt(log.totalAmount)} so'm` : ""}</span>
                    <span>{new Date(log.date).toLocaleDateString("uz-UZ")}</span>
                  </div>
                  {log.project && <p className="text-xs text-muted-foreground">{log.project.name}</p>}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* To'lov qo'shish */}
        <Card className="animate-slide-up">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Banknote className="h-4 w-4 text-primary" />
              To'lov qo'shish
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {detailPaySuccess && (
              <div className="p-3 rounded-lg bg-green-500/10 text-green-600 text-sm font-medium">
                To'lov muvaffaqiyatli qo'shildi!
              </div>
            )}
            {detailPayError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{detailPayError}</div>
            )}
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Summa (so'm)"
                value={detailPayAmount}
                onChange={(e) => { setDetailPayAmount(e.target.value); setDetailPaySuccess(false); }}
                className="flex-1"
              />
              <Button onClick={handleDetailPay} disabled={detailPayLoading}>
                {detailPayLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tasdiqlash"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Ish hajmi ko'rish */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => { setIhPeriod("bugun"); setIhLogsPage(1); setView("ish-hajmi-logs"); }}
        >
          <ClipboardList className="h-4 w-4 mr-2" />
          Ish hajmini ko'rish
        </Button>
      </div>
    );
  }

  // ===================== ISH HAJMI: LOGS =====================
  if (view === "ish-hajmi-logs") {
    const logs = ihLogsResp?.data || [];
    const logsTotal = ihLogsResp?.total || 0;
    const logsTotalPages = Math.ceil(logsTotal / PAGE);
    const periodTotal = logs.reduce((s, l) => s + (l.totalAmount || 0), 0);
    const periods: { label: string; value: Period }[] = [
      { label: "Bugun", value: "bugun" },
      { label: "Oxirgi hafta", value: "hafta" },
      { label: "Oxirgi oy", value: "oy" },
      { label: "Barchasi", value: "barchasi" },
    ];

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setView("worker-detail")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{ihWorker?.name}</h1>
            {ihWorker?.phone && <p className="text-muted-foreground">{ihWorker.phone}</p>}
          </div>
          <Button size="sm" onClick={() => { setShowWorklogDialog(true); setWorklogError(null); }}>
            📐 Yangi ish
          </Button>
        </div>

        {/* Davr tanlash tabs */}
        <div className="flex gap-2 flex-wrap">
          {periods.map((p) => (
            <Button
              key={p.value}
              size="sm"
              variant={ihPeriod === p.value ? "default" : "outline"}
              onClick={() => { setIhPeriod(p.value); setIhLogsPage(1); }}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {periodTotal > 0 && (
          <div className="p-4 rounded-xl border bg-card text-center animate-slide-up">
            <p className="text-xs text-muted-foreground">Davr jami</p>
            <p className="text-2xl font-bold">{fmt(periodTotal)} so'm</p>
          </div>
        )}

        {ihLogsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />)}
          </div>
        ) : logs.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Bu davrda ishlar topilmadi</CardContent></Card>
        ) : (
          <div className="space-y-3 animate-slide-up">
            {logs.map((log) => (
              <div key={log.id} className="p-4 rounded-lg border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium">📌 {log.workType}</p>
                  <Badge variant={log.isValidated ? "default" : "secondary"}>
                    {log.isValidated ? "✓ Tasdiqlangan" : "Kutmoqda"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{log.quantity} {log.unit}{log.totalAmount ? ` = ${fmt(log.totalAmount)} so'm` : ""}</span>
                  <span>📅 {new Date(log.date).toLocaleDateString("uz-UZ")}</span>
                </div>
                {log.project && <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" /> {log.project.name}</p>}
              </div>
            ))}
          </div>
        )}

        {logsTotalPages > 1 && (
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" disabled={ihLogsPage <= 1} onClick={() => setIhLogsPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">{ihLogsPage} / {logsTotalPages} ({logsTotal} ta)</span>
            <Button variant="outline" size="sm" disabled={ihLogsPage >= logsTotalPages} onClick={() => setIhLogsPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <WorklogDialog
          open={showWorklogDialog}
          onClose={() => setShowWorklogDialog(false)}
          worker={ihWorker}
          projects={projects}
          form={worklogForm}
          setForm={setWorklogForm}
          loading={worklogLoading}
          error={worklogError}
          onSubmit={handleWorklog}
        />
      </div>
    );
  }

  // ===================== MAIN VIEW =====================
  const loading = workersLoading || workLogsLoading;

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
          <StatsCard title="Jami ustalar" value={workers.length} subtitle="faol" icon={UserCircle} variant="primary" className="animate-slide-up stagger-1" />
          <StatsCard title="Jami qarz" value={fmt(workerDebtsData?.totalDebt ?? 0)} subtitle="to'lanmagan" icon={Wallet} variant="danger" className="animate-slide-up stagger-2" />
          <StatsCard title="Qarzdorlar" value={workerDebtsData?.workerCount ?? 0} subtitle="ta usta" icon={AlertTriangle} variant="warning" className="animate-slide-up stagger-3" />
          <StatsCard title="Bugungi ishlar" value={todayWorkLogs.length} subtitle="ta hisobot" icon={ClipboardList} variant="success" className="animate-slide-up stagger-4" />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => { setIhPage(1); setView("ish-hajmi-list"); }}>
          📐 Ish hajmi
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setShowPayDialog(true); setPayWorkerId(""); setPayAmount(""); setPayError(null); }}>
          <DollarSign className="h-4 w-4 mr-1" /> To'lov qo'shish
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowArchiveDialog(true)}>
          <ClipboardCheck className="h-4 w-4 mr-1" /> To'lov arxivi
        </Button>
        <Button size="sm" onClick={() => { setShowAddDialog(true); setAddError(null); }}>
          <UserPlus className="h-4 w-4 mr-2" />
          Usta qo'shish
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-primary" />
              Ustalar ro'yxati
            </CardTitle>
            <CardDescription>Barcha ustalar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {workersLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />)}</div>
            ) : workers.length > 0 ? (
              workers.map((worker) => (
                <div
                  key={worker.id}
                  className="p-4 rounded-lg border bg-card cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => { setIhWorker(worker); setView("worker-detail"); }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{worker.name}</p>
                      <p className="text-xs text-muted-foreground">{worker.specialty || "Usta"}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {worker.phone && <p className="text-xs text-muted-foreground mt-1">Tel: {worker.phone}</p>}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Hozircha ustalar yo'q</p>
            )}
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-success" />
              Oxirgi ishlar
            </CardTitle>
            <CardDescription>Bajarilgan ishlar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {workLogsLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />)}</div>
            ) : recentWorkLogs.length > 0 ? (
              recentWorkLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{log.worker?.name || log.loggedBy.name}</p>
                    <Badge variant="secondary" className="text-[10px]">{log.quantity} {log.unit}</Badge>
                  </div>
                  {log.workType && <p className="text-sm text-muted-foreground truncate">{log.workType}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(log.date).toLocaleDateString("uz-UZ")}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Hozircha ish hisoboti yo'q</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usta qo'shish */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-primary" />Yangi usta qo'shish</DialogTitle></DialogHeader>
          {addError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{addError}</div>}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ism *</Label>
              <Input placeholder="Usta ismi" value={addForm.name} onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input placeholder="+998 __ ___ __ __" value={addForm.phone} onChange={(e) => setAddForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Mutaxassislik</Label>
              <Input placeholder="Masalan: G'ishtchi" value={addForm.specialty} onChange={(e) => setAddForm((p) => ({ ...p, specialty: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={addLoading}>Bekor qilish</Button>
            <Button onClick={handleAddWorker} disabled={addLoading}>
              {addLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saqlanmoqda...</> : "Qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* To'lov qo'shish */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> To'lov qo'shish</DialogTitle></DialogHeader>
          {payError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{payError}</div>}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Usta *</Label>
              <Select value={payWorkerId} onValueChange={setPayWorkerId}>
                <SelectTrigger><SelectValue placeholder="Ustani tanlang..." /></SelectTrigger>
                <SelectContent>{workers.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Summa (so'm) *</Label>
              <Input type="number" placeholder="500000" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)} disabled={payLoading}>Bekor qilish</Button>
            <Button onClick={handlePayment} disabled={payLoading}>
              {payLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saqlanmoqda...</> : "Tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* To'lov arxivi */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5" /> To'lov arxivi</DialogTitle></DialogHeader>
          {paymentsLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />)}</div>
          ) : (paymentsResp?.data || []).length === 0 ? (
            <p className="text-center text-muted-foreground py-6">To'lovlar yo'q</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(paymentsResp?.data || []).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border text-sm">
                  <div>
                    <p className="font-medium">{fmt(p.amount)} so'm</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.paymentDate).toLocaleDateString("uz-UZ")} — {p.paymentType}</p>
                  </div>
                  <Badge variant="secondary">To'langan</Badge>
                </div>
              ))}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setShowArchiveDialog(false)}>Yopish</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorklogDialog({
  open, onClose, worker, projects, form, setForm, loading, error, onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  worker: Worker | null;
  projects: { id: string; name: string }[];
  form: { projectId: string; workType: string; quantity: string; unit: string; unitPrice: string; date: string };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  loading: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>📐 Yangi ish qo'shish{worker ? ` — ${worker.name}` : ""}</DialogTitle>
        </DialogHeader>
        {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Loyiha *</Label>
            <Select value={form.projectId} onValueChange={(v) => setForm((p) => ({ ...p, projectId: v }))}>
              <SelectTrigger><SelectValue placeholder="Loyihani tanlang..." /></SelectTrigger>
              <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ish turi *</Label>
            <Input placeholder="Masalan: Suvoq" value={form.workType} onChange={(e) => setForm((p) => ({ ...p, workType: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Miqdor *</Label>
              <Input type="number" placeholder="120" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Birlik</Label>
              <Input placeholder="m², soat, dona" value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Birlik narxi (ixtiyoriy)</Label>
            <Input type="number" placeholder="45000" value={form.unitPrice} onChange={(e) => setForm((p) => ({ ...p, unitPrice: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Sana</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Bekor qilish</Button>
          <Button onClick={onSubmit} disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saqlanmoqda...</> : "Qo'shish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
