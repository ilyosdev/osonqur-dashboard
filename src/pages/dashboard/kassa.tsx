import { useEffect, useState } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  History,
  HandCoins,
  PlusCircle,
  Eye,
  Users,
  XCircle,
  Clock,
  User,
  DollarSign,
  ArrowDownCircle,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  type LucideIcon,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApi, useMutation } from "@/hooks/use-api";
import { useAuth } from "@/lib/auth";
import { usePermission } from "@/hooks";
import { useProject } from "@/lib/project-context";
import { TablePagination } from "@/components/shared/table-pagination";
import {
  cashRegistersApi,
  cashRequestsApi,
  CashTransaction,
  incomesApi,
  accountsApi,
} from "@/lib/api/finance";
import { StatsSkeleton } from "@/components/ui/table-skeleton";
import { ErrorMessage } from "@/components/ui/error-message";

function formatMoney(num: number): string {
  return new Intl.NumberFormat("uz-UZ").format(Math.abs(num));
}

function formatShortDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("uz-UZ", { month: "short", day: "numeric" });
}

function getFlowChartData(transactions: CashTransaction[]) {
  const byDay: Record<string, { name: string; kirim: number; chiqim: number; ts: number }> = {};
  for (const tx of transactions) {
    const dayKey = new Date(tx.createdAt).toISOString().slice(0, 10);
    if (!byDay[dayKey]) {
      byDay[dayKey] = { name: formatShortDate(tx.createdAt), kirim: 0, chiqim: 0, ts: new Date(tx.createdAt).getTime() };
    }
    if (tx.type === "IN") byDay[dayKey].kirim += tx.amount;
    else byDay[dayKey].chiqim += tx.amount;
  }

  return Object.values(byDay)
    .sort((a, b) => a.ts - b.ts)
    .slice(-7)
    .map(({ name, kirim, chiqim }) => ({ name, kirim, chiqim }));
}

function getBalanceTrendData(transactions: CashTransaction[]) {
  const sorted = [...transactions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  let running = 0;
  return sorted.slice(-12).map((tx) => {
    running += tx.type === "IN" ? tx.amount : -tx.amount;
    return {
      name: formatShortDate(tx.createdAt),
      balans: running,
    };
  });
}

function getExpenseSplitData(transactions: CashTransaction[]) {
  const expenses = transactions.filter((tx) => tx.type === "OUT");
  const total = expenses.reduce((sum, tx) => sum + tx.amount, 0);
  if (total === 0) return [];

  const workerKeywords = ["usta", "ustaga", "ishchi", "maosh", "oylik", "to'lov", "tolov"];
  let workerExpense = 0;
  let otherExpense = 0;

  for (const tx of expenses) {
    const note = (tx.note || "").toLowerCase();
    const isWorkerExpense = workerKeywords.some((word) => note.includes(word));
    if (isWorkerExpense) workerExpense += tx.amount;
    else otherExpense += tx.amount;
  }

  return [
    {
      name: "Ustaga ketgan",
      value: workerExpense,
      percent: Math.round((workerExpense / total) * 100),
      color: "#185fa5",
    },
    {
      name: "Boshqa rasxod",
      value: otherExpense,
      percent: Math.round((otherExpense / total) * 100),
      color: "#c0392b",
    },
  ].filter((item) => item.value > 0);
}

type ActiveView = "balance" | "history" | "expenses" | "requests" | "incomes" | "employees";
type PeriodFilter = "all" | "today" | "week" | "month";

const PERIOD_LABELS: { label: string; value: PeriodFilter }[] = [
  { label: "Hammasi", value: "all" },
  { label: "Bugun", value: "today" },
  { label: "Oxirgi hafta", value: "week" },
  { label: "Oxirgi oy", value: "month" },
];

const TABS = [
  { id: "balance" as ActiveView, label: "Balans", icon: Wallet },
  { id: "history" as ActiveView, label: "Koshelok tarixi", icon: History },
  { id: "expenses" as ActiveView, label: "Rasxod ko'rish", icon: Eye },
];

function getPeriodDates(p: PeriodFilter): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = iso(now);
  if (p === "today") return { dateFrom: today, dateTo: today };
  if (p === "week") { const f = new Date(now); f.setDate(now.getDate() - 7); return { dateFrom: iso(f), dateTo: today }; }
  if (p === "month") { const f = new Date(now); f.setDate(now.getDate() - 30); return { dateFrom: iso(f), dateTo: today }; }
  return { dateFrom: "", dateTo: "" };
}

// ─── Shared modal wrapper (shadcn Dialog, workers.tsx style) ─────────────────
function Modal({ title, subtitle, onClose, children }: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-[520px] rounded-[16px] border border-[#dbe7f3] p-0 shadow-xl">
        <DialogHeader className="border-b border-[#dbe7f3] px-6 py-4">
          <DialogTitle className="text-[20px] font-semibold text-[#0c447c]">{title}</DialogTitle>
          {subtitle && <DialogDescription className="text-[13px] text-[#85b7eb]">{subtitle}</DialogDescription>}
        </DialogHeader>
        <div className="px-6 py-5">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: "#0c447c", marginBottom: 6 }}>{label}</p>
      {children}
    </div>
  );
}

const inpStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #daeaf8",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 13,
  color: "#0c447c",
  background: "#fff",
  outline: "none",
};

const inp2Style: React.CSSProperties = {
  ...inpStyle,
  minHeight: 92,
  resize: "vertical",
};

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, bg }: {
  icon: LucideIcon;
  label: string; value: string; color: string; bg: string;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #daeaf8", borderRadius: 14, padding: "18px 22px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 46, height: 46, borderRadius: 13, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 11, color: "#85b7eb", fontWeight: 500, marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 22, fontWeight: 700, color }}>{value}</p>
      </div>
    </div>
  );
}

// ─── Transaction row ──────────────────────────────────────────────────────────
function TxRow({ tx }: { tx: CashTransaction }) {
  const isIn = tx.type === "IN";
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "13px 20px", borderBottom: "1px solid #f5f9fe",
      background: isIn ? "#f6fbf4" : "#fff8f8",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: isIn ? "#EAF3DE" : "#FDECEA",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {isIn ? <ArrowUpRight size={16} color="#3B6D11" /> : <ArrowDownRight size={16} color="#A32D2D" />}
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: "#0c447c" }}>{tx.note || (isIn ? "Kirim" : "Chiqim")}</p>
          <p style={{ fontSize: 11, color: "#85b7eb", marginTop: 2 }}>
            {new Date(tx.createdAt).toLocaleString("uz-UZ")}
          </p>
        </div>
      </div>
      <p style={{ fontSize: 14, fontWeight: 700, color: isIn ? "#3B6D11" : "#A32D2D" }}>
        {isIn ? "+" : "-"}{formatMoney(tx.amount)} so'm
      </p>
    </div>
  );
}

// ─── Mini chart for balance view ──────────────────────────────────────────────
function BalanceChart({ transactions }: { transactions: CashTransaction[] }) {
  const data = getFlowChartData(transactions);

  if (data.length === 0) return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: "#85b7eb", fontSize: 13 }}>
      Grafik uchun ma'lumot yo'q
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f7ff" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#85b7eb" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#85b7eb" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v) => [`${formatMoney(Number(v))} so'm`]} contentStyle={{ borderRadius: 8, border: "1px solid #daeaf8", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11, color: "#85b7eb" }} />
        <Bar dataKey="kirim" name="Kirim" fill="#3B6D11" radius={[4, 4, 0, 0]} />
        <Bar dataKey="chiqim" name="Chiqim" fill="#A32D2D" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function AreaBalanceChart({ transactions }: { transactions: CashTransaction[] }) {
  const data = getBalanceTrendData(transactions);

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f7ff" />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#85b7eb" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#85b7eb" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v) => [`${formatMoney(Number(v))} so'm`, "Balans"]} contentStyle={{ borderRadius: 8, border: "1px solid #daeaf8", fontSize: 12 }} />
        <Line type="monotone" dataKey="balans" name="Balans" stroke="#185fa5" strokeWidth={2.5} dot={{ r: 3, fill: "#185fa5" }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ExpenseSplitChart({ transactions }: { transactions: CashTransaction[] }) {
  const data = getExpenseSplitData(transactions);

  if (data.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px", color: "#85b7eb", fontSize: 13 }}>
        Chiqim taqsimoti uchun ma'lumot yo'q
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", alignItems: "center", gap: 24 }}>
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={3}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => [`${formatMoney(Number(v))} so'm`]} contentStyle={{ borderRadius: 8, border: "1px solid #daeaf8", fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>

      <div style={{ display: "grid", gap: 12 }}>
        {data.map((item) => (
          <div key={item.name} style={{ background: "#f8fbff", border: "1px solid #daeaf8", borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 12, height: 12, borderRadius: 999, background: item.color, display: "inline-block" }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0c447c" }}>{item.name}</p>
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, color: item.color }}>{item.percent}%</p>
            </div>
            <p style={{ fontSize: 13, color: "#5d7ea7" }}>{formatMoney(item.value)} so'm</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e4eef8", borderRadius: 16, padding: 18 }}>
      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#0c447c" }}>{title}</p>
        <p style={{ fontSize: 11, color: "#85b7eb", marginTop: 4 }}>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function getRequestStatusMeta(status: string) {
  switch (status) {
    case "APPROVED":
      return { label: "Tasdiqlangan", bg: "#e8f7ee", color: "#166534" };
    case "REJECTED":
      return { label: "Rad etilgan", bg: "#fdecea", color: "#A32D2D" };
    case "FULFILLED":
      return { label: "Bajarilgan", bg: "#e6f1fb", color: "#185fa5" };
    default:
      return { label: "Kutilmoqda", bg: "#fef3c7", color: "#92400e" };
  }
}

const PAGE_SIZE = 10;

function paginate<T>(items: T[], page: number, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    totalPages,
    safePage,
    items: items.slice(start, start + pageSize),
  };
}

const LIST_PANEL_MIN_HEIGHT = "calc(100vh - 280px)";

// ─── Main page ────────────────────────────────────────────────────────────────
export default function KassaPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();
  const canViewKoshelok = hasPermission("kassa:view") || hasPermission("kashlok:view_all");
  const canRequestMoney = usePermission("cash-request:create") || hasPermission("kassa:request_money");
  const isBugalteriya = usePermission("income:view");

  const [activeView, setActiveView] = useState<ActiveView>("balance");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<null | "sorash" | "qosh" | "kirim" | "fill" | "fill-employee">(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedEmployeeCashRegisterId, setSelectedEmployeeCashRegisterId] = useState<string | null>(null);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [expensesPage, setExpensesPage] = useState(1);
  const [incomesPage, setIncomesPage] = useState(1);
  const [requestsPage, setRequestsPage] = useState(1);
  const [employeesPage, setEmployeesPage] = useState(1);

  const { dateFrom, dateTo } = getPeriodDates(periodFilter);

  const { data: koshelok, loading: koshelokLoading, error: koshelokError, refetch: refetchKoshelok } = useApi(
    () => cashRegistersApi.getMyKoshelok(), [], { enabled: canViewKoshelok }
  );

  const { data: historyData, loading: historyLoading, refetch: refetchHistory } = useApi(
    () => cashRegistersApi.getMyTransactions({ limit: 100, ...(dateFrom && { dateFrom }), ...(dateTo && { dateTo }) }),
    [dateFrom, dateTo],
    { enabled: (activeView === "history" || activeView === "balance") && canViewKoshelok }
  );

  const { data: expensesData, loading: expensesLoading, refetch: refetchExpenses } = useApi(
    () => cashRegistersApi.getMyTransactions({ type: "OUT", limit: 50, ...(dateFrom && { dateFrom }), ...(dateTo && { dateTo }) }),
    [dateFrom, dateTo],
    { enabled: activeView === "expenses" && canViewKoshelok }
  );

  const { data: incomesData, loading: incomesLoading, refetch: refetchIncomes } = useApi(
    () => incomesApi.getAll({ limit: 50 }),
    [],
    { enabled: isBugalteriya && activeView === "incomes" }
  );

  const { data: cashRequestsData, loading: cashRequestsLoading, refetch: refetchCashRequests } = useApi(
    () => cashRequestsApi.getAll({ limit: 100, ...(selectedProjectId ? { projectId: selectedProjectId } : {}) }),
    [selectedProjectId],
    { enabled: isBugalteriya || canRequestMoney }
  );

  const { data: allKosheloksData, loading: allKosheloksLoading, refetch: refetchAllKosheloks } = useApi(
    () => cashRegistersApi.getAll({ limit: 100 }),
    [],
    { enabled: isBugalteriya }
  );

  const allKosheloks = allKosheloksData?.data || [];
  const cashRequests = cashRequestsData?.data || [];
  const pendingCashRequests = cashRequests.filter((req) => req.status === "PENDING");
  const incomesList = incomesData?.data || [];

  const { mutate: approveCashRequest, loading: approvingId } = useMutation((id: string) => cashRequestsApi.approve(id));
  const { mutate: rejectCashRequest, loading: rejectingId } = useMutation(
    ({ id, reason }: { id: string; reason: string }) => cashRequestsApi.reject(id, { rejectionReason: reason })
  );

  const handleApprove = async (id: string) => {
    try { await approveCashRequest(id); refetchCashRequests(); } catch {}
  };

  const handleReject = async () => {
    if (!rejectDialogOpen || !rejectReason.trim()) return;
    try {
      await rejectCashRequest({ id: rejectDialogOpen, reason: rejectReason });
      setRejectDialogOpen(null);
      setRejectReason("");
      refetchCashRequests();
    } catch {}
  };

  // filter transactions for tarix/rasxod tabs
  const allTx = historyData?.data ?? [];
  const currentTx = activeView === "expenses" ? (expensesData?.data ?? []) : allTx;
  const visibleTx = currentTx.filter(
    (t) =>
      (t.note || "").toLowerCase().includes(search.toLowerCase())
  );

  const showFilters = activeView === "history" || activeView === "expenses";

  useEffect(() => {
    setHistoryPage(1);
    setExpensesPage(1);
  }, [search, periodFilter]);

  useEffect(() => { setIncomesPage(1); }, [incomesList.length]);
  useEffect(() => { setRequestsPage(1); }, [cashRequests.length, selectedProjectId]);
  useEffect(() => { setEmployeesPage(1); }, [allKosheloks.length]);

  const historyPaged = paginate(visibleTx, historyPage);
  const expensesPaged = paginate(visibleTx, expensesPage);
  const incomesPaged = paginate(incomesList, incomesPage);
  const requestsPaged = paginate(cashRequests, requestsPage);
  const employeesPaged = paginate(allKosheloks, employeesPage);

  // Tabs — build dynamically based on permissions
  const tabs = [
    ...TABS,
    ...((canRequestMoney || isBugalteriya) ? [{ id: "requests" as ActiveView, label: "Pul so'rovlari", icon: HandCoins, badge: pendingCashRequests.length }] : []),
    ...(isBugalteriya ? [
      { id: "incomes" as ActiveView, label: "Kirimlar", icon: TrendingUp },
      { id: "employees" as ActiveView, label: "Xodimlar", icon: Users },
    ] : []),
  ];

  if (koshelokError && canViewKoshelok) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold">Kassa</h1>
        <ErrorMessage error={koshelokError} onRetry={refetchKoshelok} />
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", minHeight: "100vh", padding: "0", fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif", position: "relative" }}>

      {/* ── Stat cards ── */}
      {koshelokLoading ? (
        <div style={{ marginBottom: 16 }}><StatsSkeleton /></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, marginBottom: 16 }}>
          <StatCard icon={Wallet} label="Balans" value={`${formatMoney(koshelok?.balance ?? 0)} so'm`} color="#0c447c" bg="#e6f1fb" />
          <StatCard icon={TrendingUp} label="Jami kirim" value={`${formatMoney(koshelok?.totalIn ?? 0)} so'm`} color="#3B6D11" bg="#EAF3DE" />
          <StatCard icon={TrendingDown} label="Jami chiqim" value={`${formatMoney(koshelok?.totalOut ?? 0)} so'm`} color="#A32D2D" bg="#FDECEA" />
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, gap: 0, background: "#fff", border: "1px solid #daeaf8", borderRadius: 12, padding: 4, marginBottom: 16 }}>
        {tabs.map(({ id, label, icon: Icon, isAction, badge }: any) => {
          const on = !isAction && activeView === id;
          return (
            <button
              key={id}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "9px 8px", borderRadius: 9, border: "none",
                background: on ? "#185fa5" : "transparent",
                color: on ? "#fff" : "#85b7eb",
                fontSize: 12, fontWeight: 500, cursor: "pointer",
                transition: "all .15s", whiteSpace: "nowrap", position: "relative",
                boxShadow: on ? "0 2px 8px rgba(24,95,165,.3)" : "none",
              }}
              onClick={() => {
                if (isAction) { setModal("qosh"); return; }
                setActiveView(id as ActiveView);
              }}
            >
              <Icon size={14} />
              {label}
              {badge > 0 && (
                <span style={{ position: "absolute", top: 4, right: 4, background: "#ef4444", color: "#fff", borderRadius: 999, fontSize: 9, fontWeight: 700, padding: "1px 4px", minWidth: 14, textAlign: "center" }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Filter row ── */}
      {showFilters && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", marginBottom: 14, gap: 10 }}>
          <div style={{ minWidth: 170 }}>
            <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as PeriodFilter)}>
              <SelectTrigger className="h-9 w-[170px] rounded-[10px] border border-[#daeaf8] bg-white text-[12px] font-medium text-[#0c447c] shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
              {PERIOD_LABELS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
              </SelectContent>
            </Select>
          </div>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#378add", pointerEvents: "none" }} />
            <input
              style={{ padding: "8px 10px 8px 30px", border: "1px solid #daeaf8", borderRadius: 9, fontSize: 12, background: "#fff", color: "#0c447c", outline: "none", width: 180 }}
              placeholder="Qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* ── BALANS tab ── */}
      {activeView === "balance" && koshelok && (
        <div style={{ display: "grid", gap: 16 }}>
          {allTx.length > 0 && (
            <div style={{ display: "grid", gap: 16 }}>
              <ChartCard title="Chiqim taqsimoti" subtitle="Ustaga va boshqa rasxodlarga ketgan ulush">
                <ExpenseSplitChart transactions={allTx} />
              </ChartCard>
              <ChartCard title="Balans trendi" subtitle="Operatsiyalar bo‘yicha o‘zgarish">
                <AreaBalanceChart transactions={allTx} />
              </ChartCard>
            </div>
          )}

          {allTx.length === 0 && (
            <div style={{ background: "#fff", border: "1px solid #daeaf8", borderRadius: 16, padding: "32px 20px", textAlign: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#0c447c", marginBottom: 6 }}>Hali operatsiyalar yo‘q</p>
              <p style={{ fontSize: 12, color: "#85b7eb" }}>Diagrammalar ma'lumot paydo bo‘lgach shu yerda chiqadi.</p>
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY / EXPENSES tab ── */}
      {(activeView === "history" || activeView === "expenses") && (
        <div style={{ background: "#fff", border: "1px solid #daeaf8", borderRadius: 16, overflow: "hidden", minHeight: LIST_PANEL_MIN_HEIGHT, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 20px", borderBottom: "1px solid #f0f7ff" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              {activeView === "history" ? <TrendingUp size={15} color="#378add" style={{ marginTop: 2 }} /> : <TrendingDown size={15} color="#A32D2D" style={{ marginTop: 2 }} />}
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0c447c" }}>{activeView === "history" ? "Koshelok tarixi" : "Rasxodlar"}</p>
                <p style={{ fontSize: 11, color: "#85b7eb" }}>{activeView === "history" ? "Barcha operatsiyalar" : "Chiqim operatsiyalari"}</p>
                {activeView === "expenses" && (expensesData?.data ?? []).length > 0 && (
                  <p style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: "#A32D2D" }}>
                    -{formatMoney((expensesData?.data ?? []).reduce((a, t) => a + t.amount, 0))} so'm
                  </p>
                )}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto" }}>
              {activeView === "expenses" && (
                <button
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#185fa5", color: "#fff", border: "none", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                  onClick={() => setModal("qosh")}
                >
                  <PlusCircle size={13} />
                  Rasxod qo'shish
                </button>
              )}
            </div>
          </div>
          {(activeView === "history" ? historyLoading : expensesLoading) ? (
            <div style={{ padding: 20, flex: 1 }}>
              {[1, 2, 3].map((i) => <div key={i} style={{ height: 56, background: "#f0f7ff", borderRadius: 8, marginBottom: 8 }} />)}
            </div>
          ) : visibleTx.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
              <p style={{ textAlign: "center", color: "#85b7eb", fontSize: 13 }}>Operatsiyalar topilmadi</p>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {(activeView === "history" ? historyPaged.items : expensesPaged.items).map((tx) => <TxRow key={tx.id} tx={tx} />)}
              </div>
              <TablePagination
                page={activeView === "history" ? historyPaged.safePage : expensesPaged.safePage}
                totalPages={activeView === "history" ? historyPaged.totalPages : expensesPaged.totalPages}
                onPageChange={activeView === "history" ? setHistoryPage : setExpensesPage}
              />
            </div>
          )}
        </div>
      )}

      {/* ── INCOMES tab (bugalteriya) ── */}
      {activeView === "incomes" && isBugalteriya && (
        <div style={{ background: "#fff", border: "1px solid #daeaf8", borderRadius: 16, overflow: "hidden", minHeight: LIST_PANEL_MIN_HEIGHT, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #f0f7ff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <TrendingUp size={15} color="#3B6D11" />
              <p style={{ fontSize: 14, fontWeight: 600, color: "#0c447c" }}>Kirimlar</p>
            </div>
            <button style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#3B6D11", color: "#fff", border: "none", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer" }} onClick={() => setModal("kirim")}>
              <PlusCircle size={13} /> Kirim qo'shish
            </button>
          </div>
          {incomesLoading ? (
            <div style={{ padding: 20, flex: 1 }}>{[1, 2, 3].map((i) => <div key={i} style={{ height: 56, background: "#f0f7ff", borderRadius: 8, marginBottom: 8 }} />)}</div>
          ) : incomesList.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
              <p style={{ textAlign: "center", color: "#85b7eb", fontSize: 13 }}>Hozircha kirim yo'q</p>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ flex: 1 }}>
                {incomesPaged.items.map((income) => (
                  <div key={income.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 20px", borderBottom: "1px solid #f5f9fe", background: "#f6fbf4" }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "#0c447c" }}>{income.category || "Kirim"}</p>
                      <p style={{ fontSize: 11, color: "#85b7eb", marginTop: 2 }}>{income.description} · {new Date(income.date).toLocaleDateString("uz-UZ")}</p>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#3B6D11" }}>+{formatMoney(income.amount)} so'm</p>
                  </div>
                ))}
              </div>
              <TablePagination page={incomesPaged.safePage} totalPages={incomesPaged.totalPages} onPageChange={setIncomesPage} />
            </div>
          )}
        </div>
      )}

      {/* ── REQUESTS tab ── */}
      {activeView === "requests" && (isBugalteriya || canRequestMoney) && (
        <div style={{ background: "#fff", border: "1px solid #daeaf8", borderRadius: 16, overflow: "hidden", minHeight: LIST_PANEL_MIN_HEIGHT, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 20px", borderBottom: "1px solid #f0f7ff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <HandCoins size={15} color="#378add" />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0c447c" }}>Pul so'rovlari</p>
                <p style={{ fontSize: 11, color: "#85b7eb" }}>So'ralgan summa, status, kimdan va qachon</p>
              </div>
            </div>
            {canRequestMoney && (
              <button style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#185fa5", color: "#fff", border: "none", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer" }} onClick={() => setModal("sorash")}>
                <HandCoins size={13} /> Pul so'rash
              </button>
            )}
          </div>
          {cashRequestsLoading ? (
            <div style={{ padding: 20, flex: 1 }}>{[1, 2, 3].map((i) => <div key={i} style={{ height: 80, background: "#f0f7ff", borderRadius: 8, marginBottom: 8 }} />)}</div>
          ) : cashRequests.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
              <p style={{ textAlign: "center", color: "#85b7eb", fontSize: 13 }}>Hozircha pul so'rovlari yo'q</p>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "grid", gridTemplateColumns: isBugalteriya ? "1.1fr 1fr 1fr 1fr 1fr auto" : "1.2fr 1fr 1fr 1fr 1.2fr", gap: 12, padding: "12px 20px", borderBottom: "1px solid #f0f7ff", background: "#f8fbff", fontSize: 11, fontWeight: 700, color: "#85b7eb", textTransform: "uppercase", letterSpacing: ".04em" }}>
                  <p>Kim</p>
                  <p>Summa</p>
                  <p>Status</p>
                  <p>Kimdan</p>
                  <p>Qachon</p>
                  {isBugalteriya && <p style={{ textAlign: "right" }}>Amal</p>}
                </div>
                {requestsPaged.items.map((req) => {
                  const statusMeta = getRequestStatusMeta(req.status);
                  return (
                    <div key={req.id} style={{ display: "grid", gridTemplateColumns: isBugalteriya ? "1.1fr 1fr 1fr 1fr 1fr auto" : "1.2fr 1fr 1fr 1fr 1.2fr", gap: 12, padding: "14px 20px", borderBottom: "1px solid #f5f9fe", alignItems: "center" }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#0c447c" }}>{req.requestedBy?.name || "Men"}</p>
                        {req.reason && <p style={{ fontSize: 11, color: "#85b7eb", marginTop: 3 }}>{req.reason}</p>}
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#185fa5" }}>{formatMoney(req.amount)} so'm</p>
                      <div>
                        <span style={{ fontSize: 11, background: statusMeta.bg, color: statusMeta.color, borderRadius: 999, padding: "4px 9px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {req.status === "PENDING" && <Clock size={10} />}
                          {statusMeta.label}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: "#0c447c" }}>{req.approvedBy?.name || "-"}</p>
                      <div>
                        <p style={{ fontSize: 12, color: "#0c447c" }}>{new Date(req.createdAt).toLocaleDateString("uz-UZ")}</p>
                        <p style={{ fontSize: 11, color: "#85b7eb", marginTop: 2 }}>{new Date(req.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      {isBugalteriya && (
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          {req.status === "PENDING" ? (
                            <>
                              <button style={{ padding: "7px 14px", border: "1px solid #fdecea", borderRadius: 8, background: "#fdecea", color: "#A32D2D", fontSize: 12, fontWeight: 500, cursor: "pointer" }} onClick={() => setRejectDialogOpen(req.id)} disabled={!!approvingId || !!rejectingId}>
                                Rad etish
                              </button>
                              <button style={{ padding: "7px 14px", border: "none", borderRadius: 8, background: "#185fa5", color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer" }} onClick={() => handleApprove(req.id)} disabled={!!approvingId || !!rejectingId}>
                                Tasdiqlash
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: 12, color: "#85b7eb" }}>Yakunlangan</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={{ flex: 1, minHeight: 0 }} />
              </div>
              <TablePagination page={requestsPaged.safePage} totalPages={requestsPaged.totalPages} onPageChange={setRequestsPage} />
            </div>
          )}
        </div>
      )}

      {/* ── EMPLOYEES tab (bugalteriya) ── */}
      {activeView === "employees" && isBugalteriya && (
        <div style={{ background: "#fff", border: "1px solid #daeaf8", borderRadius: 16, overflow: "hidden", minHeight: LIST_PANEL_MIN_HEIGHT, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 20px", borderBottom: "1px solid #f0f7ff" }}>
            <Users size={15} color="#378add" />
            <p style={{ fontSize: 14, fontWeight: 600, color: "#0c447c" }}>Xodimlar koshelogi</p>
          </div>
          {allKosheloksLoading ? (
            <div style={{ padding: 20, flex: 1 }}>{[1, 2, 3].map((i) => <div key={i} style={{ height: 80, background: "#f0f7ff", borderRadius: 8, marginBottom: 8 }} />)}</div>
          ) : allKosheloks.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
              <p style={{ textAlign: "center", color: "#85b7eb", fontSize: 13 }}>Hozircha xodim koshelogi yo'q</p>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, background: "#fff", padding: 12 }}>
                  {employeesPaged.items.map((k) => (
                    <div key={k.id} style={{ background: "#fff", padding: "16px 20px", border: "1px solid #daeaf8", borderRadius: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <User size={14} color="#85b7eb" />
                          <p style={{ fontSize: 13, fontWeight: 500, color: "#0c447c" }}>{k.user?.name || k.name}</p>
                        </div>
                        {k.user?.orgRoleName && (
                          <span style={{ fontSize: 10, background: "#e6f1fb", color: "#185fa5", borderRadius: 6, padding: "2px 7px", fontWeight: 500 }}>{k.user.orgRoleName}</span>
                        )}
                      </div>
                      <p style={{ fontSize: 20, fontWeight: 700, color: "#185fa5", marginBottom: 4 }}>{formatMoney(k.balance)} so'm</p>
                      <div style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 11 }}>
                        <span style={{ color: "#3B6D11" }}>+{formatMoney(k.totalIn || 0)}</span>
                        <span style={{ color: "#A32D2D" }}>-{formatMoney(k.totalOut || 0)}</span>
                      </div>
                      <button style={{ width: "100%", padding: "7px 0", border: "1px solid #daeaf8", borderRadius: 8, background: "#f8fbff", color: "#185fa5", fontSize: 12, fontWeight: 500, cursor: "pointer" }} onClick={() => { setSelectedEmployeeCashRegisterId(k.id); setSelectedEmployeeName(k.user?.name || k.name); setModal("fill-employee"); }}>
                        Balans to'ldirish
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <TablePagination page={employeesPaged.safePage} totalPages={employeesPaged.totalPages} onPageChange={setEmployeesPage} />
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Pul so'rash ── */}
      {modal === "sorash" && canRequestMoney && (
        <RequestMoneyModalInner onClose={() => { setModal(null); refetchCashRequests(); }} />
      )}

      {/* ── Modal: Rasxod qo'shish ── */}
      {modal === "qosh" && (
        <AddExpenseModalInner koshelokId={koshelok?.id} onClose={() => { setModal(null); refetchKoshelok(); if (activeView === "expenses") refetchExpenses(); }} />
      )}

      {/* ── Modal: Kirim qo'shish ── */}
      {modal === "kirim" && isBugalteriya && (
        <AddIncomeModalInner onClose={() => { setModal(null); if (activeView === "incomes") refetchIncomes(); }} />
      )}

      {/* ── Modal: Balans to'ldirish (own) ── */}
      {modal === "fill" && isBugalteriya && (
        <FillBalanceModalInner koshelokId={koshelok?.id} onClose={() => { setModal(null); refetchKoshelok(); if (activeView === "history") refetchHistory(); }} />
      )}

      {/* ── Modal: Balans to'ldirish (employee) ── */}
      {modal === "fill-employee" && isBugalteriya && (
        <FillBalanceModalInner
          koshelokId={selectedEmployeeCashRegisterId || undefined}
          employeeName={selectedEmployeeName}
          onClose={() => { setModal(null); setSelectedEmployeeCashRegisterId(null); setSelectedEmployeeName(""); refetchAllKosheloks(); }}
        />
      )}

      {/* ── Reject dialog ── */}
      <Dialog open={!!rejectDialogOpen} onOpenChange={() => setRejectDialogOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>So'rovni rad etish</DialogTitle>
            <DialogDescription>Rad etish sababini kiriting</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Sabab *</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Nima uchun rad etilayotganini yozing..." rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(null)}>Bekor qilish</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!!rejectingId || !rejectReason.trim()}>
              <XCircle className="h-4 w-4 mr-1" />
              {rejectingId ? "Saqlanmoqda..." : "Rad etish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Inline modal components ──────────────────────────────────────────────────

function RequestMoneyModalInner({ onClose }: { onClose: () => void }) {
  const { selectedProjectId, selectedProject } = useProject();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const { mutate, loading } = useMutation((data: { projectId: string; amount: number; reason?: string }) => cashRequestsApi.create(data));

  const handleSubmit = async () => {
    if (!amount || !selectedProjectId) return;
    try { await mutate({ projectId: selectedProjectId, amount: Number(amount), reason: reason || undefined }); setAmount(""); setReason(""); onClose(); } catch {}
  };

  return (
    <Modal title="Pul so'rash" subtitle="Yangi pul so'rovi yarating" onClose={onClose}>
      <Field label="Loyiha">
        <div style={{ ...inpStyle, background: "#f0f7ff", color: "#378add", fontWeight: 500 }}>
          {selectedProject ? selectedProject.name : "Avval sidebar dan loyihani tanlang"}
        </div>
      </Field>
      <Field label="Summa (so'm)">
        <input style={inpStyle} type="number" placeholder="Summani kiriting" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label="Sabab">
        <textarea style={inp2Style} placeholder="Sabab (ixtiyoriy)" value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
        <button style={{ padding: "9px 18px", border: "1px solid #daeaf8", borderRadius: 9, background: "#fff", color: "#85b7eb", fontSize: 13, cursor: "pointer" }} onClick={onClose}>Bekor qilish</button>
        <button style={{ padding: "9px 22px", border: "none", borderRadius: 9, background: "#185fa5", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }} onClick={handleSubmit} disabled={loading || !selectedProjectId || !amount}>{loading ? "Yuborilmoqda..." : "Yuborish"}</button>
      </div>
    </Modal>
  );
}

function AddExpenseModalInner({ koshelokId, onClose }: { koshelokId?: string; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const { mutate, loading } = useMutation((data: { type: "OUT"; amount: number; note?: string }) => cashRegistersApi.createMyTransaction(data));

  const handleSubmit = async () => {
    if (!amount) return;
    try { await mutate({ type: "OUT", amount: Number(amount), note: note || undefined }); setAmount(""); setNote(""); onClose(); } catch {}
  };

  return (
    <Modal title="Rasxod qo'shish" subtitle="Yangi chiqim operatsiyasini kiriting" onClose={onClose}>
      <Field label="Summa (so'm)">
        <input style={inpStyle} type="number" placeholder="Summani kiriting" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label="Izoh">
        <textarea style={inp2Style} placeholder="Izoh (ixtiyoriy)" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
        <button style={{ padding: "9px 18px", border: "1px solid #daeaf8", borderRadius: 9, background: "#fff", color: "#85b7eb", fontSize: 13, cursor: "pointer" }} onClick={onClose}>Bekor qilish</button>
        <button style={{ padding: "9px 22px", border: "none", borderRadius: 9, background: "#185fa5", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }} onClick={handleSubmit} disabled={loading || !amount}>{loading ? "Saqlanmoqda..." : "Saqlash"}</button>
      </div>
    </Modal>
  );
}

function AddIncomeModalInner({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState("");

  const { data: accountsData } = useApi(() => accountsApi.getAll({ limit: 100 }), [], { enabled: true });
  const { mutate, loading } = useMutation((data: any) => incomesApi.create(data));

  const handleSubmit = async () => {
    if (!amount || !accountId || !category) return;
    try { await mutate({ accountId, amount: Number(amount), date: new Date().toISOString().split("T")[0], category, description: description || undefined }); onClose(); } catch {}
  };

  return (
    <Modal title="Kirim qo'shish" subtitle="Yangi kirim operatsiyasini kiriting" onClose={onClose}>
      <Field label="Hisob">
        <select style={inpStyle} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">Hisobni tanlang</option>
          {(accountsData?.data ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <Field label="Kategoriya">
        <select style={inpStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Kategoriyani tanlang</option>
          {["Loyiha to'lovi", "Avans", "Qarz qaytarish", "Boshqa"].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Summa (so'm)">
        <input style={inpStyle} type="number" placeholder="Summani kiriting" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label="Izoh">
        <textarea style={inp2Style} placeholder="Izoh (ixtiyoriy)" value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
        <button style={{ padding: "9px 18px", border: "1px solid #daeaf8", borderRadius: 9, background: "#fff", color: "#85b7eb", fontSize: 13, cursor: "pointer" }} onClick={onClose}>Bekor qilish</button>
        <button style={{ padding: "9px 22px", border: "none", borderRadius: 9, background: "#3B6D11", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }} onClick={handleSubmit} disabled={loading || !amount || !accountId || !category}>{loading ? "Saqlanmoqda..." : "Saqlash"}</button>
      </div>
    </Modal>
  );
}

function FillBalanceModalInner({ koshelokId, employeeName, onClose }: { koshelokId?: string; employeeName?: string; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const { mutate, loading } = useMutation((data: { cashRegisterId: string; type: "IN"; amount: number; note?: string }) => cashRegistersApi.createTransaction(data));

  const handleSubmit = async () => {
    if (!koshelokId || !amount) return;
    try { await mutate({ cashRegisterId: koshelokId, type: "IN", amount: Number(amount), note: note || "Balans to'ldirish" }); onClose(); } catch {}
  };

  return (
    <Modal title="Balans to'ldirish" subtitle={employeeName ? `${employeeName} koshelogini to'ldiring` : "Koshelok balansini to'ldiring"} onClose={onClose}>
      <Field label="Summa (so'm)">
        <input style={inpStyle} type="number" placeholder="Summani kiriting" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label="Izoh">
        <textarea style={inp2Style} placeholder="Izoh (ixtiyoriy)" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
        <button style={{ padding: "9px 18px", border: "1px solid #daeaf8", borderRadius: 9, background: "#fff", color: "#85b7eb", fontSize: 13, cursor: "pointer" }} onClick={onClose}>Bekor qilish</button>
        <button style={{ padding: "9px 22px", border: "none", borderRadius: 9, background: "#185fa5", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer" }} onClick={handleSubmit} disabled={loading || !amount || !koshelokId}>{loading ? "To'ldirilmoqda..." : "To'ldirish"}</button>
      </div>
    </Modal>
  );
}
