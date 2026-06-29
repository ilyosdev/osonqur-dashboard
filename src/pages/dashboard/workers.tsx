import { useState } from "react";
import {
  UserCircle, Wallet, ClipboardList, AlertTriangle, UserPlus, Loader2,
  ArrowLeft, ChevronRight, Phone, Briefcase, Banknote,
  HardHat, Building2, DollarSign, ClipboardCheck, Search, CheckCircle, Clock,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { TablePagination } from "@/components/shared/table-pagination";
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
import { useApi } from "@/hooks/use-api";
import { workersApi, Worker } from "@/lib/api/workers";
import { projectsApi } from "@/lib/api/projects";
import { analyticsApi } from "@/lib/api/analytics";
import { StatsSkeleton } from "@/components/ui/table-skeleton";
import { ErrorMessage } from "@/components/ui/error-message";

function fmt(num: number): string {
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
  const [mainPage, setMainPage] = useState(1);
  const [workerSearch, setWorkerSearch] = useState("");
  const [mainPeriod, setMainPeriod] = useState<Period>("bugun");

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
  const [showPayForm, setShowPayForm] = useState(false);

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

  // Worker detail tab
  type DetailTab = "ishlar" | "tolov";
  const [detailTab, setDetailTab] = useState<DetailTab>("ishlar");
  const [ishlarPage, setIshlarPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const ISHLAR_PAGE_SIZE = 10;

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
  const mainPeriodDates = getPeriodDates(mainPeriod);
  const { data: mainWorkLogsResp } = useApi(
    () => workersApi.getWorkLogs({ limit: 500, ...mainPeriodDates }),
    [mainPeriod]
  );
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
  const { data: workerUnpaidResp, loading: workerUnpaidLoading, refetch: refetchUnpaid } = useApi(
    () => view === "worker-detail" && ihWorker
      ? workersApi.getWorkLogs({ workerId: ihWorker.id, limit: 50, isPaid: false })
      : Promise.resolve(null),
    [view, ihWorker?.id]
  );

  // Worker detail to'lovlar tarixi
  const { data: workerPaymentsResp, loading: workerPaymentsLoading, refetch: refetchWorkerPayments } = useApi(
    () => view === "worker-detail" && ihWorker
      ? workersApi.getPayments({ workerId: ihWorker.id, limit: 20 })
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
  const filteredWorkers = workers.filter((worker) => {
    const query = workerSearch.trim();
    if (!query) return true;
    return (worker.phone || "").toLowerCase().includes(query.toLowerCase());
  });
  const mainTotalPages = Math.max(1, Math.ceil(filteredWorkers.length / PAGE));
  const mainWorkers = filteredWorkers.slice((mainPage - 1) * PAGE, mainPage * PAGE);
  const mainFillerRowCount = Math.max(0, PAGE - mainWorkers.length);

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
      refetchUnpaid();
      refetchWorkers();
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

        {ihWorkers.length > 0 && (
          <TablePagination page={ihPage} totalPages={ihTotalPages} onPageChange={setIhPage} summary={`Sahifa ${ihPage} / ${ihTotalPages}`} />
        )}
      </div>
    );
  }

  // ===================== WORKER DETAIL =====================
  if (view === "worker-detail" && ihWorker) {
    const unpaidLogs = workerUnpaidResp?.data || [];
    const payments = workerPaymentsResp?.data || [];
    const paymentsTotalPages = Math.max(1, Math.ceil(payments.length / PAGE));
    const pagedPayments = payments.slice((paymentsPage - 1) * PAGE, paymentsPage * PAGE);
    const totalDebt = ihWorker.balance ?? 0;
    const totalEarned = (ihWorker as any).totalEarned ?? 0;
    const totalPaid = (ihWorker as any).totalPaid ?? 0;
    const initials = ihWorker.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

    const handleDetailPay = async () => {
      const amount = parseFloat(detailPayAmount);
      if (!detailPayAmount || isNaN(amount) || amount <= 0) { setDetailPayError("Summani kiriting"); return; }
      setDetailPayLoading(true); setDetailPayError(null);
      try {
        await workersApi.createPayment({ workerId: ihWorker!.id, amount });
        setDetailPaySuccess(true);
        setDetailPayAmount("");
        refetchWorkerPayments();
        refetchWorkers();
      } catch (err) {
        setDetailPayError(err instanceof Error ? err.message : "Xatolik yuz berdi");
      } finally { setDetailPayLoading(false); }
    };

    return (
      <>
      <div className="animate-fade-in -mx-3 md:-mx-4 xl:-mx-5 2xl:-mx-6 -mt-4" style={{ background: "#fff", minHeight: "calc(100vh - 4rem)" }}>

        {/* Body: sidebar + main */}
        <div className="flex" style={{ background: "#fff", minHeight: "calc(100vh - 4rem)", alignItems: "stretch" }}>

          {/* LEFT SIDEBAR */}
          <div className="w-[260px] xl:w-[300px] shrink-0 bg-white border-r border-[#daeaf8] p-6 flex flex-col gap-6 hidden md:flex">
            {/* Back button */}
            <button
              onClick={() => setView("main")}
              className="self-start flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12px] font-medium bg-[#e6f1fb] text-[#185fa5] hover:bg-[#d4e8f8] transition-colors"
            >
              ← Ustalar
            </button>

            {/* Avatar + name */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-br from-[#378add] to-[#0c447c] mx-auto mb-3">
                <div className="w-full h-full rounded-full bg-[#185fa5] flex items-center justify-center text-white text-xl font-semibold">
                  {initials}
                </div>
              </div>
              <p className="text-[16px] font-semibold text-[#0c447c]">{ihWorker.name}</p>
              <p className="text-[12px] text-[#378add] mt-0.5">{ihWorker.specialty || "Usta"}</p>
              <div className="inline-flex items-center gap-1.5 mt-2 text-[11px] text-[#3B6D11] bg-[#EAF3DE] px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3B6D11]" />
                Faol usta
              </div>
            </div>

            {/* Info rows */}
            <div className="flex flex-col gap-2.5">
              {ihWorker.phone && (
                <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[#f8fbff] rounded-[10px] border border-[#edf4fb]">
                  <div className="w-7 h-7 rounded-lg bg-[#e6f1fb] text-[#185fa5] flex items-center justify-center shrink-0">
                    <Phone className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#85b7eb] font-medium">Telefon</p>
                    <p className="text-[12px] text-[#0c447c] font-medium">{ihWorker.phone}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[#f8fbff] rounded-[10px] border border-[#edf4fb]">
                <div className="w-7 h-7 rounded-lg bg-[#e6f1fb] text-[#185fa5] flex items-center justify-center shrink-0">
                  <Briefcase className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[10px] text-[#85b7eb] font-medium">Mutaxassislik</p>
                  <p className="text-[12px] text-[#0c447c] font-medium">{ihWorker.specialty || "—"}</p>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT MAIN */}
          <div className="flex-1 p-5 flex flex-col gap-4" style={{ height: "100vh" }}>

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-[14px] bg-white border border-[#daeaf8] p-4">
                <p className="text-[22px] font-semibold text-[#0c447c] leading-none">{unpaidLogs.length}</p>
                <p className="text-[11px] text-[#85b7eb] mt-1">To'lanmagan ishlar</p>
                <p className="text-[11px] text-[#85b7eb] mt-0.5">{payments.length} to'lov amalga oshirilgan</p>
              </div>
              <div className="rounded-[14px] bg-white border border-[#daeaf8] p-4">
                <p className="text-[22px] font-semibold text-[#0c447c] leading-none">{fmt(totalPaid)}</p>
                <p className="text-[11px] text-[#85b7eb] mt-1">To'langan (so'm)</p>
                <p className="text-[11px] text-[#3B6D11] mt-0.5">↑ Barcha to'lovlar</p>
              </div>
              <div className={`rounded-[14px] border p-4 ${totalDebt > 0 ? "bg-[#fff5f5] border-[#fecaca]" : "bg-white border-[#daeaf8]"}`}>
                <p className={`text-[22px] font-semibold leading-none ${totalDebt > 0 ? "text-[#dc2626]" : "text-[#0c447c]"}`}>
                  {fmt(totalDebt)}
                </p>
                <p className="text-[11px] text-[#85b7eb] mt-1">To'lanmagan (so'm)</p>
                <p className={`text-[11px] mt-0.5 ${totalDebt > 0 ? "text-[#ef4444]" : "text-[#85b7eb]"}`}>
                  {unpaidLogs.length} ta ish kutmoqda
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1 bg-white rounded-[10px] p-1 border border-[#daeaf8] w-fit">
                {(["ishlar", "tolov"] as DetailTab[]).map((t, i) => (
                  <button
                    key={t}
                    onClick={() => setDetailTab(t)}
                    className={`px-4 py-1.5 rounded-[7px] text-[12px] font-medium transition-all ${
                      detailTab === t ? "bg-[#185fa5] text-white" : "text-[#85b7eb] hover:text-[#185fa5]"
                    }`}
                  >
                    {["Ishlar tarixi", "To'lov tarixi"][i]}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setShowWorklogDialog(true); setWorklogError(null); setWorklogForm({ projectId: "", workType: "", quantity: "", unit: "m²", unitPrice: "", date: today }); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#185fa5] text-white text-[12px] font-medium hover:bg-[#0c447c] transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Ish hajmi qo'shish
              </button>
            </div>

            {/* Panel */}
            <div className="flex-1 flex flex-col min-h-0">
            {detailTab === "ishlar" && (
              <div className="bg-white rounded-[16px] border border-[#daeaf8] overflow-hidden flex-1">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#f0f7ff]">
                  <span className="text-[12px] font-semibold text-[#0c447c] uppercase tracking-wide flex items-center gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5 text-[#378add]" /> Ishlar tarixi
                  </span>
                  <span className="text-[11px] text-[#85b7eb]">{unpaidLogs.length} ta to'lanmagan</span>
                </div>
                {workerUnpaidLoading ? (
                  <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-[#f8fbff] rounded-lg animate-pulse" />)}</div>
                ) : unpaidLogs.length === 0 ? (
                  <div className="py-10 text-center text-[12px] text-[#85b7eb]">To'lanmagan ishlar yo'q</div>
                ) : (
                  <table className="w-full text-[12px] border-collapse">
                    <thead>
                      <tr className="bg-[#f9fcff]">
                        <th className="px-5 py-2.5 text-left text-[11px] font-medium text-[#85b7eb] uppercase tracking-wide">#</th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-medium text-[#85b7eb] uppercase tracking-wide">Ish nomi</th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-medium text-[#85b7eb] uppercase tracking-wide">Loyiha</th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-medium text-[#85b7eb] uppercase tracking-wide">Miqdor</th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-medium text-[#85b7eb] uppercase tracking-wide">Summa</th>
                        <th className="px-5 py-2.5 text-left text-[11px] font-medium text-[#85b7eb] uppercase tracking-wide">Holat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unpaidLogs.slice((ishlarPage - 1) * ISHLAR_PAGE_SIZE, ishlarPage * ISHLAR_PAGE_SIZE).map((log, i) => {
                        const globalIdx = (ishlarPage - 1) * ISHLAR_PAGE_SIZE + i;
                        return (
                          <tr key={log.id} className="border-t border-[#f5f9fe] hover:bg-[#f8fbff] transition-colors">
                            <td className="px-5 py-3 text-[#85b7eb]">{String(globalIdx + 1).padStart(2, "0")}</td>
                            <td className="px-5 py-3">
                              <p className="font-medium text-[#0c447c] text-[13px]">{log.workType}</p>
                              <p className="text-[11px] text-[#85b7eb] mt-0.5">{new Date(log.date).toLocaleDateString("uz-UZ")}</p>
                            </td>
                            <td className="px-5 py-3 text-[#378add]">{log.project?.name || "—"}</td>
                            <td className="px-5 py-3 text-[#0c447c]">{log.quantity} {log.unit}</td>
                            <td className="px-5 py-3 font-medium text-[#0c447c]">{log.totalAmount ? fmt(log.totalAmount) : "—"}</td>
                            <td className="px-5 py-3">
                              {log.isValidated ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EAF3DE] text-[#3B6D11]">
                                  Tasdiqlangan
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FAEEDA] text-[#854F0B]">
                                  Kutilmoqda
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                {/* Pagination */}
                {unpaidLogs.length > 0 && (
                  <TablePagination
                    page={ishlarPage}
                    totalPages={Math.ceil(unpaidLogs.length / ISHLAR_PAGE_SIZE)}
                    onPageChange={setIshlarPage}
                    summary={`${(ishlarPage - 1) * ISHLAR_PAGE_SIZE + 1}–${Math.min(ishlarPage * ISHLAR_PAGE_SIZE, unpaidLogs.length)} / ${unpaidLogs.length} ta`}
                  />
                )}
              </div>
            )}

            {/* Panel: To'lov tarixi */}
            {detailTab === "tolov" && (
              <div className="bg-white rounded-[16px] border border-[#daeaf8] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#f0f7ff]">
                  <span className="text-[12px] font-semibold text-[#0c447c] uppercase tracking-wide flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5 text-[#378add]" /> To'lov tarixi
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] font-medium text-[#3B6D11]">{fmt(totalPaid)} so'm</span>
                    <button
                      onClick={() => { setShowPayDialog(true); setPayWorkerId(ihWorker!.id); setPayAmount(""); setPayError(null); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#185fa5] text-white text-[12px] font-medium hover:bg-[#0c447c] transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" /> To'lov qo'shish
                    </button>
                  </div>
                </div>
                {workerPaymentsLoading ? (
                  <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-[#f8fbff] rounded-lg animate-pulse" />)}</div>
                ) : payments.length === 0 ? (
                  <div className="py-10 text-center text-[12px] text-[#85b7eb]">To'lovlar yo'q</div>
                ) : (
                  pagedPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between px-5 py-3.5 border-b border-[#f5f9fe] last:border-b-0">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[10px] bg-[#EAF3DE] flex items-center justify-center shrink-0">
                          <Banknote className="h-4 w-4 text-[#3B6D11]" />
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-[#0c447c]">Naqd to'lov</p>
                          {payment.description && <p className="text-[11px] text-[#85b7eb] mt-0.5">{payment.description}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[14px] font-semibold text-[#3B6D11]">+{fmt(payment.amount)}</p>
                        <p className="text-[11px] text-[#85b7eb] mt-0.5">
                          {new Date(payment.createdAt).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                  ))
                )}

                {payments.length > 0 && (
                  <TablePagination
                    page={paymentsPage}
                    totalPages={paymentsTotalPages}
                    onPageChange={setPaymentsPage}
                    summary={`Sahifa ${paymentsPage} / ${paymentsTotalPages}`}
                  />
                )}

              </div>
            )}
            </div>{/* /Panel wrapper */}

          </div>
        </div>
      </div>
      {/* To'lov qo'shish dialog — worker-detail ichida */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-[560px] rounded-[16px] border border-[#dbe7f3] p-0 shadow-xl">
          <DialogHeader className="border-b border-[#dbe7f3] px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-[20px] font-semibold text-[#0c447c]">
              <DollarSign className="h-5 w-5 text-[#185fa5]" />
              To'lov qo'shish
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 px-6 py-5">
            {payError && <div className="rounded-[10px] border border-red-200 bg-red-50 p-3 text-sm text-red-600">{payError}</div>}
            <div className="space-y-2">
              <Label className="text-[14px] font-medium text-[#0c447c]">Usta</Label>
              <div className="h-11 rounded-[10px] border border-[#dbe7f3] bg-[#f8fbff] px-3 flex items-center text-[#0c447c] text-[14px]">
                {ihWorker.name}
              </div>
              {totalDebt > 0 ? (
                <div className="flex items-center justify-between rounded-[10px] border border-red-200 bg-red-50 p-3">
                  <span className="text-xs text-red-600">Jami qarz</span>
                  <span className="text-sm font-semibold text-red-600">{fmt(totalDebt)} so'm</span>
                </div>
              ) : (
                <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 p-3">
                  <span className="text-xs text-emerald-700">Qarz yo'q</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-[14px] font-medium text-[#0c447c]">Summa (so'm) *</Label>
              <Input
                type="number"
                placeholder="500000"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="h-11 rounded-[10px] border border-[#dbe7f3] bg-white text-[15px] text-[#0c447c] shadow-none"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-[#dbe7f3] px-6 py-4">
            <Button variant="outline" className="h-11 rounded-[10px] px-5" onClick={() => setShowPayDialog(false)} disabled={payLoading}>Bekor qilish</Button>
            <Button className="h-11 rounded-[10px] px-5" onClick={handlePayment} disabled={payLoading}>
              {payLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saqlanmoqda...</> : "Tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      </>
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
          <Button size="sm" onClick={() => { setShowWorklogDialog(true); setWorklogError(null); setWorklogForm({ projectId: "", workType: "", quantity: "", unit: "m²", unitPrice: "", date: today }); }}>
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

        {logsTotal > 0 && (
          <TablePagination page={ihLogsPage} totalPages={logsTotalPages} onPageChange={setIhLogsPage} summary={`Sahifa ${ihLogsPage} / ${logsTotalPages} (${logsTotal} ta)`} />
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

  // Har bir worker uchun period bo'yicha ish hajmi
  const workerIshHajmiMap = (mainWorkLogsResp?.data || []).reduce<Record<string, number>>((acc, log) => {
    const wid = log.worker?.id; if (wid) acc[wid] = (acc[wid] || 0) + (log.totalAmount || 0);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in -mx-3 md:-mx-4 xl:-mx-5 2xl:-mx-6 -mt-4 px-3 pt-4 md:px-4 xl:px-5 2xl:px-6" style={{ background: "#fff", minHeight: "calc(100vh - 4rem)" }}>
      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[10px] border border-[#dbe7f3] bg-white px-4 py-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#185fa5]">
              <UserCircle className="h-[13px] w-[13px] text-[#185fa5]" />
              Jami ustalar
            </div>
            <div className="mt-2 text-[30px] font-semibold leading-none text-[#0c447c]">{workers.length}</div>
          </div>
          <div className="rounded-[10px] border border-[#dbe7f3] bg-white px-4 py-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#185fa5]">
              <Wallet className="h-[13px] w-[13px] text-[#ef4444]" />
              Jami qarz
            </div>
            <div className="mt-2 text-[30px] font-semibold leading-none text-[#0c447c]">{fmt(workerDebtsData?.totalDebt ?? 0)}</div>
          </div>
          <div className="rounded-[10px] border border-[#dbe7f3] bg-white px-4 py-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#185fa5]">
              <AlertTriangle className="h-[13px] w-[13px] text-[#f59e0b]" />
              Qarzdorlar
            </div>
            <div className="mt-2 text-[30px] font-semibold leading-none text-[#0c447c]">{workerDebtsData?.workerCount ?? 0}</div>
          </div>
          <div className="rounded-[10px] border border-[#dbe7f3] bg-white px-4 py-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#185fa5]">
              <ClipboardList className="h-[13px] w-[13px] text-[#16a34a]" />
              Bugungi ishlar
            </div>
            <div className="mt-2 text-[30px] font-semibold leading-none text-[#0c447c]">{todayWorkLogs.length}</div>
          </div>
        </div>
      )}

      <div>
        <Card className="overflow-hidden rounded-[12px] border border-[#dbe7f3] py-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between border-b border-[#dbe7f3] bg-white px-5 py-3 md:px-6">
            <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                <CardTitle className="flex items-center gap-2 text-[14px] font-semibold tracking-tight text-[#0c447c]">
                  <UserCircle className="h-4 w-4 text-[#185fa5]" />
                  Ustalar ro'yxati
                </CardTitle>
                <Select value={mainPeriod} onValueChange={(v) => setMainPeriod(v as Period)}>
                  <SelectTrigger className="h-8 w-[140px] rounded-[8px] border border-[#dbe7f3] bg-white text-[12px] text-[#0c447c] shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bugun">Bugun</SelectItem>
                    <SelectItem value="hafta">Oxirgi hafta</SelectItem>
                    <SelectItem value="oy">Oxirgi oy</SelectItem>
                    <SelectItem value="barchasi">Barchasi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-full flex-col gap-3 lg:max-w-4xl lg:flex-row lg:items-center lg:justify-end">
                <div className="relative min-w-[240px] flex-1 lg:max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[#378add]" />
                  <Input
                    value={workerSearch}
                    onChange={(e) => {
                      setWorkerSearch(e.target.value);
                      setMainPage(1);
                    }}
                    placeholder="Telefon bo'yicha qidirish..."
                    spellCheck={false}
                    className="h-10 rounded-[8px] border border-[#dbe7f3] bg-white pl-9 text-[13px] text-[#0c447c] shadow-none placeholder:text-[#94a3b8]"
                  />
                </div>
                <Button variant="outline" size="sm" className="h-10 rounded-[8px]" onClick={() => { setShowPayDialog(true); setPayWorkerId(""); setPayAmount(""); setPayError(null); }}>
                  <DollarSign className="mr-2 h-4 w-4" /> To'lov qo'shish
                </Button>
                <Button variant="outline" size="sm" className="h-10 rounded-[8px]" onClick={() => setShowArchiveDialog(true)}>
                  <ClipboardCheck className="mr-2 h-4 w-4" /> To'lov arxivi
                </Button>
                <Button size="sm" className="h-10 rounded-[8px]" onClick={() => { setShowAddDialog(true); setAddError(null); }}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Usta qo'shish
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            {workersLoading ? (
              <div className="space-y-3 p-5">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />)}</div>
            ) : workers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-white hover:bg-white">
                    <TableHead className="h-12 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Usta</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Telefon</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Mutaxassislik</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Ish hajmi</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Qarz</TableHead>
                    <TableHead className="w-[64px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mainWorkers.map((worker) => (
                    <TableRow
                      key={worker.id}
                      className="h-20 cursor-pointer border-b border-[#eef2f7] transition-colors hover:bg-[#f8fafc] last:border-b-0"
                      onClick={() => { setIhWorker(worker); setView("worker-detail"); }}
                    >
                      <TableCell className="py-4">
                        <div className="space-y-0.5">
                          <div className="font-medium text-[#0c447c]">{worker.name}</div>
                          <div className="text-xs text-muted-foreground">Usta</div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-sm text-muted-foreground">{worker.phone || "—"}</TableCell>
                      <TableCell className="py-4 text-sm text-muted-foreground">{worker.specialty || "—"}</TableCell>
                      <TableCell className="py-4 text-sm">
                        {workerIshHajmiMap[worker.id] > 0
                          ? <span className="font-medium text-[#185fa5]">{fmt(workerIshHajmiMap[worker.id])} so'm</span>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="py-4 text-sm">
                        <span className={worker.balance > 0 ? "font-medium text-red-600" : "text-muted-foreground"}>
                          {worker.balance > 0 ? `${fmt(worker.balance)} so'm` : "0 so'm"}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                  {Array.from({ length: mainFillerRowCount }).map((_, index) => (
                    <TableRow key={`worker-filler-${index}`} className="h-20 hover:bg-transparent">
                      <TableCell colSpan={6} className="border-b border-[#eef2f7] last:border-b-0" />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Hozircha ustalar yo'q</p>
            )}
          </CardContent>
          {workers.length > 0 && (
            <TablePagination page={mainPage} totalPages={mainTotalPages} onPageChange={setMainPage} />
          )}
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
        <DialogContent className="max-w-[560px] rounded-[16px] border border-[#dbe7f3] p-0 shadow-xl">
          <DialogHeader className="border-b border-[#dbe7f3] px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-[20px] font-semibold text-[#0c447c]">
              <DollarSign className="h-5 w-5 text-[#185fa5]" />
              To'lov qo'shish
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 px-6 py-5">
            {payError && <div className="rounded-[10px] border border-red-200 bg-red-50 p-3 text-sm text-red-600">{payError}</div>}
            <div className="space-y-2">
              <Label className="text-[14px] font-medium text-[#0c447c]">Usta *</Label>
              <Select value={payWorkerId} onValueChange={setPayWorkerId} disabled={view === "worker-detail"}>
                <SelectTrigger className="h-11 rounded-[10px] border border-[#dbe7f3] bg-white text-[#0c447c] shadow-none">
                  <SelectValue placeholder="Ustani tanlang..." />
                </SelectTrigger>
                <SelectContent>{workers.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
              {payWorkerId && (() => {
                const w = workers.find(w => w.id === payWorkerId);
                const debt = w?.balance ?? 0;
                return debt > 0 ? (
                  <div className="flex items-center justify-between rounded-[10px] border border-red-200 bg-red-50 p-3">
                    <span className="text-xs text-red-600">Jami qarz</span>
                    <span className="text-sm font-semibold text-red-600">{fmt(debt)} so'm</span>
                  </div>
                ) : (
                  <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 p-3">
                    <span className="text-xs text-emerald-700">Qarz yo'q</span>
                  </div>
                );
              })()}
            </div>
            <div className="space-y-2">
              <Label className="text-[14px] font-medium text-[#0c447c]">Summa (so'm) *</Label>
              <Input
                type="number"
                placeholder="500000"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="h-11 rounded-[10px] border border-[#dbe7f3] bg-white text-[15px] text-[#0c447c] shadow-none placeholder:text-[#94a3b8]"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-[#dbe7f3] px-6 py-4">
            <Button variant="outline" className="h-11 rounded-[10px] px-5" onClick={() => setShowPayDialog(false)} disabled={payLoading}>Bekor qilish</Button>
            <Button className="h-11 rounded-[10px] px-5" onClick={handlePayment} disabled={payLoading}>
              {payLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saqlanmoqda...</> : "Tasdiqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* To'lov arxivi */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent className="max-w-lg rounded-[16px] border border-[#dbe7f3] p-0 shadow-xl">
          <DialogHeader className="border-b border-[#dbe7f3] px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-[20px] font-semibold text-[#0c447c]">
              <ClipboardCheck className="h-5 w-5 text-[#185fa5]" />
              To'lov arxivi
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5">
            {paymentsLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-[10px] bg-muted/50 animate-pulse" />)}</div>
            ) : (paymentsResp?.data || []).length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">To'lovlar yo'q</p>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto">
              {(paymentsResp?.data || []).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-[10px] border border-[#dbe7f3] p-3 text-sm">
                  <div>
                    <p className="font-medium">{fmt(p.amount)} so'm</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.paymentDate).toLocaleDateString("uz-UZ")} — {p.paymentType}</p>
                  </div>
                  <Badge variant="secondary">To'langan</Badge>
                </div>
              ))}
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-[#dbe7f3] px-6 py-4">
            <Button variant="outline" className="h-11 rounded-[10px] px-5" onClick={() => setShowArchiveDialog(false)}>Yopish</Button>
          </DialogFooter>
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
