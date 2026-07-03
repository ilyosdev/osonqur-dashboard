import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { Clock, CheckCircle, History, Wallet, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { requestsApi, cashRegistersApi } from "@/lib/api";

function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + " mlrd";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " mln";
  return n.toLocaleString("uz-UZ");
}

const C = { blue: "#185fa5", lightBlue: "#dbe7f3", green: "#22c55e", red: "#ef4444", amber: "#f59e0b" };

export function ModeratorDashboard() {
  const { data: pendingRes } = useApi(() => requestsApi.getAll({ status: "RECEIVED", limit: 100 }), []);
  const { data: finalizedRes } = useApi(() => requestsApi.getAll({ status: "FINALIZED", limit: 200 }), []);
  const { data: koshelok, loading: kLoad } = useApi(() => cashRegistersApi.getMyKoshelok(), []);

  const pending = pendingRes?.data || [];
  const finalized = finalizedRes?.data || [];

  const now = new Date();
  const todayFinalized = finalized.filter(r => new Date(r.updatedAt).toDateString() === now.toDateString()).length;

  // Oxirgi 7 kun bo'yicha yakunlangan
  const byDay: Record<string, number> = {};
  finalized.forEach(r => {
    const d = new Date(r.updatedAt);
    if (now.getTime() - d.getTime() < 7 * 86400000) {
      const key = d.toLocaleDateString("uz-UZ", { day: "numeric", month: "short" });
      byDay[key] = (byDay[key] || 0) + 1;
    }
  });
  const weekBar = Object.entries(byDay).map(([name, count]) => ({ name, count }));

  // Umumiy summa bo'yicha (finalized)
  const totalSum = finalized.reduce((s, r) => s + (r.finalAmount || 0), 0);

  // Status pie
  const piData = [
    { name: "Kutilmoqda", value: pendingRes?.total || 0, color: C.amber },
    { name: "Yakunlangan", value: finalizedRes?.total || 0, color: C.green },
  ];

  // Koshelok bar
  const koshelokBar = [
    { name: "Kirim", summa: koshelok?.totalIn || 0, fill: C.green },
    { name: "Chiqim", summa: koshelok?.totalOut || 0, fill: C.red },
    { name: "Balans", summa: koshelok?.balance || 0, fill: C.blue },
  ];

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
              <p className="text-sm font-medium text-muted-foreground">Narx kutilmoqda</p>
              <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-500">{pendingRes?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">ta zayavka</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Bugun yakunlangan</p>
              <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-green-600">{todayFinalized}</p>
            <p className="text-xs text-muted-foreground mt-1">ta zayavka</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Jami yakunlangan summa</p>
              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: C.lightBlue }}>
                <DollarSign className="h-4 w-4" style={{ color: C.blue }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: C.blue }}>{fmt(totalSum)}</p>
            <p className="text-xs text-muted-foreground mt-1">so'm</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Haftalik yakunlangan bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <History className="h-4 w-4" style={{ color: C.blue }} />
              Oxirgi 7 kun (yakunlangan)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weekBar.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Ma'lumot yo'q</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weekBar} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [v + " ta", "Yakunlangan"]} />
                  <Bar dataKey="count" fill={C.green} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" style={{ color: C.blue }} />
              Zayavkalar holati
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={piData.filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" stroke="none">
                    {piData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 flex-1">
                {piData.map(d => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                      <span className="text-sm text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: d.color }}>{d.value}</span>
                  </div>
                ))}
                <div className="border-t pt-1 flex justify-between text-xs text-muted-foreground">
                  <span>Jami</span>
                  <span className="font-semibold text-foreground">{piData.reduce((s, d) => s + d.value, 0)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Koshelok bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Wallet className="h-4 w-4" style={{ color: C.blue }} />
            Koshelok holati
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={koshelokBar} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1_000_000 ? (v / 1_000_000).toFixed(0) + "M" : String(v)} />
              <Tooltip formatter={(v) => [fmt(Number(v)) + " so'm"]} />
              <Bar dataKey="summa" radius={[6, 6, 0, 0]}>
                {koshelokBar.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
            <span style={{ color: C.green }}>+{fmt(koshelok?.totalIn || 0)}</span>
            <span style={{ color: C.red }}>−{fmt(koshelok?.totalOut || 0)}</span>
            <span style={{ color: C.blue }} className="font-semibold">{fmt(koshelok?.balance || 0)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Kutayotgan zayavkalar */}
      {pending.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Narx kiritish kerak
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.slice(0, 5).map(r => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 border border-amber-100">
                <div>
                  <p className="text-sm font-medium">{r.smetaItem?.name || "Noma'lum"}</p>
                  <p className="text-xs text-muted-foreground">{r.requestedQty} {r.smetaItem?.unit} · {r.requestedBy?.name || "—"}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">Kutmoqda</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
