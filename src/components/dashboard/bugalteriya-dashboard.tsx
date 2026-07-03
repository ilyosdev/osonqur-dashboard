import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { incomesApi, expensesApi, cashRegistersApi } from "@/lib/api";

function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + " mlrd";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " mln";
  return n.toLocaleString("uz-UZ");
}

const C = { blue: "#185fa5", lightBlue: "#dbe7f3", green: "#22c55e", red: "#ef4444", amber: "#f59e0b", gray: "#e5e7eb" };

function groupByMonth(items: { amount: number; date?: string; createdAt: string }[]) {
  const months: Record<string, number> = {};
  items.forEach(item => {
    const d = new Date(item.date || item.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months[key] = (months[key] || 0) + item.amount;
  });
  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, amount]) => ({ month: month.slice(5), amount }));
}

export function BugalteriyaDashboard() {
  const { data: incomesRes } = useApi(() => incomesApi.getAll({ limit: 200 }), []);
  const { data: expensesRes } = useApi(() => expensesApi.getAll({ limit: 200 }), []);
  const { data: koshelok, loading: kLoad } = useApi(() => cashRegistersApi.getMyKoshelok(), []);

  const incomes = incomesRes?.data || [];
  const expenses = expensesRes?.data || [];

  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const balance = totalIncome - totalExpense;

  // Monthly area chart data
  const incomeByMonth = groupByMonth(incomes);
  const expenseByMonth = groupByMonth(expenses);
  const allMonths = [...new Set([...incomeByMonth.map(d => d.month), ...expenseByMonth.map(d => d.month)])].sort().slice(-6);
  const areaData = allMonths.map(month => ({
    month,
    Kirim: incomeByMonth.find(d => d.month === month)?.amount || 0,
    Chiqim: expenseByMonth.find(d => d.month === month)?.amount || 0,
  }));

  // Income by category pie
  const incomeCategories: Record<string, number> = {};
  incomes.forEach(i => { incomeCategories[i.category || "Boshqa"] = (incomeCategories[i.category || "Boshqa"] || 0) + i.amount; });
  const COLORS = [C.blue, C.green, C.amber, "#8b5cf6", "#06b6d4"];
  const incomePie = Object.entries(incomeCategories)
    .sort(([, a], [, b]) => b - a).slice(0, 5)
    .map(([name, value], i) => ({ name, value, color: COLORS[i] }));

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Mening koshelogim</p>
              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: C.lightBlue }}>
                <Wallet className="h-4 w-4" style={{ color: C.blue }} />
              </div>
            </div>
            {kLoad ? <div className="h-7 w-24 bg-muted/50 rounded animate-pulse" /> : (
              <>
                <p className="text-2xl font-bold" style={{ color: C.blue }}>{fmt(koshelok?.balance || 0)} <span className="text-sm font-normal text-muted-foreground">so'm</span></p>
                <div className="flex gap-3 mt-1 text-xs">
                  <span style={{ color: C.green }}>+{fmt(koshelok?.totalIn || 0)}</span>
                  <span style={{ color: C.red }}>−{fmt(koshelok?.totalOut || 0)}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Jami kirim</p>
              <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center"><TrendingUp className="h-4 w-4 text-green-500" /></div>
            </div>
            <p className="text-2xl font-bold text-green-600">{fmt(totalIncome)}</p>
            <p className="text-xs text-muted-foreground mt-1">so'm</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Jami chiqim</p>
              <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center"><TrendingDown className="h-4 w-4 text-red-500" /></div>
            </div>
            <p className="text-2xl font-bold text-red-500">{fmt(totalExpense)}</p>
            <p className="text-xs text-muted-foreground mt-1">so'm</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Balans</p>
              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: balance >= 0 ? "#f0fdf4" : "#fef2f2" }}>
                <DollarSign className="h-4 w-4" style={{ color: balance >= 0 ? C.green : C.red }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: balance >= 0 ? C.green : C.red }}>{fmt(Math.abs(balance))}</p>
            <p className="text-xs text-muted-foreground mt-1">{balance >= 0 ? "foyda" : "zarar"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Kirim/Chiqim area chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" style={{ color: C.blue }} />
              Oylik kirim / chiqim
            </CardTitle>
          </CardHeader>
          <CardContent>
            {areaData.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Ma'lumot yo'q</p> : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={areaData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorKirim" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.green} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorChiqim" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.red} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={C.red} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1_000_000 ? (v / 1_000_000).toFixed(0) + "M" : String(v)} />
                  <Tooltip formatter={(v) => [fmt(Number(v)) + " so'm"]} />
                  <Area type="monotone" dataKey="Kirim" stroke={C.green} fill="url(#colorKirim)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Chiqim" stroke={C.red} fill="url(#colorChiqim)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Kirim kategoriyalar pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" style={{ color: C.blue }} />
              Kirim manbalari
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incomePie.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Kirim yo'q</p> : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={130} height={130}>
                  <PieChart>
                    <Pie data={incomePie} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" stroke="none">
                      {incomePie.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 flex-1 min-w-0">
                  {incomePie.map(d => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <span className="text-xs text-muted-foreground truncate">{d.name}</span>
                      </div>
                      <span className="text-xs font-semibold ml-1">{fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
