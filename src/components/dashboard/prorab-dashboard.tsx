import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Wallet, Users, FileText, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { workersApi, smetasApi, cashRegistersApi, requestsApi } from "@/lib/api";
import { Link } from "react-router-dom";

function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + " mlrd";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " mln";
  return n.toLocaleString("uz-UZ");
}

const C = {
  blue: "#185fa5",
  lightBlue: "#dbe7f3",
  green: "#22c55e",
  red: "#ef4444",
  amber: "#f59e0b",
  purple: "#a855f7",
  gray: "#e5e7eb",
};

export function ProrabDashboard() {
  const { data: workersRes } = useApi(() => workersApi.getAll({ limit: 50 }), []);
  const { data: smetasRes } = useApi(() => smetasApi.getAll({ limit: 50 }), []);
  const { data: koshelok, loading: kLoad } = useApi(() => cashRegistersApi.getMyKoshelok(), []);
  const { data: pendingReqs } = useApi(() => requestsApi.getAll({ limit: 1, status: "PENDING" }), []);
  const { data: approvedReqs } = useApi(() => requestsApi.getAll({ limit: 1, status: "APPROVED" }), []);

  const workers = workersRes?.data || [];
  const smetas = smetasRes?.data || [];

  // Koshelok pie data
  const koshelokPie = [
    { name: "Kirim", value: koshelok?.totalIn || 0, color: C.green },
    { name: "Chiqim", value: koshelok?.totalOut || 0, color: C.red },
  ];

  // Workers bar data (top 6 by debt)
  const workersBar = workers
    .map(w => ({
      name: w.name.split(" ")[0],
      Qarz: Math.max(0, w.totalEarned - w.totalPaid),
      Toʻlangan: w.totalPaid,
    }))
    .sort((a, b) => b.Qarz - a.Qarz)
    .slice(0, 6);

  // Smetas progress
  const smetasWithProgress = smetas
    .map(s => ({
      ...s,
      percent: s.grandTotal > 0 ? Math.min(100, (s.totalUsedAmount / s.grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 5);

  const totalWorkerDebt = workers.reduce((acc, w) => acc + Math.max(0, w.totalEarned - w.totalPaid), 0);

  return (
    <div className="space-y-4">
      {/* Top stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Mening koshelogim</p>
              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: C.lightBlue }}>
                <Wallet className="h-4 w-4" style={{ color: C.blue }} />
              </div>
            </div>
            {kLoad ? (
              <div className="h-7 w-24 bg-muted/50 rounded animate-pulse" />
            ) : (
              <>
                <p className="text-2xl font-bold" style={{ color: C.blue }}>
                  {fmt(koshelok?.balance || 0)} <span className="text-sm font-normal text-muted-foreground">so'm</span>
                </p>
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
              <p className="text-sm font-medium text-muted-foreground">Ustalar qarzi</p>
              <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center">
                <Users className="h-4 w-4 text-red-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-red-500">{fmt(totalWorkerDebt)}</p>
            <p className="text-xs text-muted-foreground mt-1">{workers.length} ta usta</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Kutayotgan zayavkalar</p>
              <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-500">{pendingReqs?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">ta zayavka</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Tasdiqlangan</p>
              <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
                <FileText className="h-4 w-4 text-green-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-green-600">{approvedReqs?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">ta zayavka</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Koshelok pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4" style={{ color: C.blue }} />
              Koshelok balansi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(koshelok?.totalIn || 0) + (koshelok?.totalOut || 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Ma'lumot yo'q</p>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={koshelokPie} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" stroke="none">
                      {koshelokPie.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: C.green }} />
                      <span className="text-sm text-muted-foreground">Kirim</span>
                    </div>
                    <span className="text-sm font-semibold text-green-600">+{fmt(koshelok?.totalIn || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: C.red }} />
                      <span className="text-sm text-muted-foreground">Chiqim</span>
                    </div>
                    <span className="text-sm font-semibold text-red-500">−{fmt(koshelok?.totalOut || 0)}</span>
                  </div>
                  <div className="border-t pt-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Balans</span>
                    <span className="text-sm font-bold" style={{ color: C.blue }}>{fmt(koshelok?.balance || 0)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Workers bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" style={{ color: C.blue }} />
              Ustalar qarzi
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workersBar.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Ustalar yo'q</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={workersBar} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1_000_000 ? (v / 1_000_000).toFixed(0) + "M" : String(v)} />
                  <Tooltip formatter={(v) => [fmt(Number(v)) + " so'm"]} />
                  <Bar dataKey="Qarz" fill={C.red} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Toʻlangan" fill={C.green} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Smetas progress */}
      {smetasWithProgress.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" style={{ color: C.blue }} />
                Smetalar bajarilishi
              </CardTitle>
              <Link to="/smetas" className="text-xs" style={{ color: C.blue }}>Hammasi →</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {smetasWithProgress.map(s => (
              <Link to={`/smetas/${s.id}`} key={s.id} className="block hover:opacity-80 transition-opacity">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate max-w-[200px]">{s.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{s.percent.toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: C.gray }}>
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${s.percent}%`,
                      background: s.percent >= 80 ? C.green : s.percent >= 40 ? C.blue : C.amber,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                  <span>{fmt(s.totalUsedAmount)} so'm ishlatilgan</span>
                  <span>{fmt(s.grandTotal)} so'm jami</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Workers list */}
      {workers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" style={{ color: C.blue }} />
                Ustalar ro'yxati
              </CardTitle>
              <Link to="/workers" className="text-xs" style={{ color: C.blue }}>Hammasi →</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {workers.slice(0, 6).map(w => {
              const debt = Math.max(0, w.totalEarned - w.totalPaid);
              const pct = w.totalEarned > 0 ? (w.totalPaid / w.totalEarned) * 100 : 100;
              return (
                <div key={w.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: C.blue }}>
                    {w.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{w.name}</span>
                      <span className="text-xs ml-2" style={{ color: debt > 0 ? C.red : C.green }}>
                        {debt > 0 ? `−${fmt(debt)}` : "✓"}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full mt-1" style={{ background: C.gray }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: pct >= 100 ? C.green : C.blue }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
