import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Clock, CheckCircle, XCircle, Wallet, Package, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { requestsApi, cashRegistersApi } from "@/lib/api";
import { Link } from "react-router-dom";

function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + " mlrd";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " mln";
  return n.toLocaleString("uz-UZ");
}

const C = { blue: "#185fa5", lightBlue: "#dbe7f3", green: "#22c55e", red: "#ef4444", amber: "#f59e0b", gray: "#e5e7eb" };

export function SnabjeniyaDashboard() {
  const { data: pendingRes } = useApi(() => requestsApi.getAll({ limit: 50, status: "PENDING" }), []);
  const { data: approvedRes } = useApi(() => requestsApi.getAll({ limit: 50, status: "APPROVED" }), []);
  const { data: rejectedRes } = useApi(() => requestsApi.getAll({ limit: 50, status: "REJECTED" }), []);
  const { data: koshelok, loading: kLoad } = useApi(() => cashRegistersApi.getMyKoshelok(), []);

  const pending = pendingRes?.data || [];
  const approved = approvedRes?.data || [];

  // Pie — always show all 3 statuses (even 0)
  const piData = [
    { name: "Kutayotgan", value: pendingRes?.total || 0, color: C.amber },
    { name: "Tasdiqlangan", value: approvedRes?.total || 0, color: C.green },
    { name: "Rad etilgan", value: rejectedRes?.total || 0, color: C.red },
  ];
  const totalReqs = piData.reduce((s, d) => s + d.value, 0);

  // Koshelok bar (kirim vs chiqim)
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
              <p className="text-sm font-medium text-muted-foreground">Kutayotgan</p>
              <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center"><Clock className="h-4 w-4 text-amber-500" /></div>
            </div>
            <p className="text-2xl font-bold text-amber-500">{pendingRes?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">zayavka</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Tasdiqlangan</p>
              <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center"><CheckCircle className="h-4 w-4 text-green-500" /></div>
            </div>
            <p className="text-2xl font-bold text-green-600">{approvedRes?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">zayavka</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Rad etilgan</p>
              <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center"><XCircle className="h-4 w-4 text-red-500" /></div>
            </div>
            <p className="text-2xl font-bold text-red-500">{rejectedRes?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">zayavka</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Zayavkalar status pie — always all 3 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" style={{ color: C.blue }} />
              Zayavkalar holati
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div style={{ width: 140, height: 140, position: "relative" }}>
                {totalReqs === 0 ? (
                  <div className="w-full h-full rounded-full border-8 border-gray-100 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">0</span>
                  </div>
                ) : (
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie data={piData.filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" stroke="none">
                        {piData.filter(d => d.value > 0).map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="space-y-2 flex-1">
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
                  <span className="font-semibold text-foreground">{totalReqs}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Koshelok bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4" style={{ color: C.blue }} />
              Koshelok holati
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={koshelokBar} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1_000_000 ? (v / 1_000_000).toFixed(0) + "M" : String(v)} />
                <Tooltip formatter={(v) => [fmt(Number(v)) + " so'm"]} />
                <Bar dataKey="summa" radius={[6, 6, 0, 0]}>
                  {koshelokBar.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
              <span className="text-green-600">+{fmt(koshelok?.totalIn || 0)}</span>
              <span className="text-red-500">−{fmt(koshelok?.totalOut || 0)}</span>
              <span style={{ color: C.blue }} className="font-semibold">{fmt(koshelok?.balance || 0)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending requests list */}
      {pending.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Kutayotgan zayavkalar
              </CardTitle>
              <Link to="/requests/pending" className="text-xs" style={{ color: C.blue }}>Hammasi →</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.slice(0, 5).map(r => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 border border-amber-100">
                <div>
                  <p className="text-sm font-medium">{r.smetaItem?.name || "Noma'lum"}</p>
                  <p className="text-xs text-muted-foreground">{r.requestedQty} {r.smetaItem?.unit}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">Kutmoqda</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Approved requests list */}
      {approved.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Tasdiqlangan zayavkalar
              </CardTitle>
              <Link to="/requests" className="text-xs" style={{ color: C.blue }}>Hammasi →</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {approved.slice(0, 5).map(r => (
              <div key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-green-50/50 border border-green-100">
                <div>
                  <p className="text-sm font-medium">{r.smetaItem?.name || "Noma'lum"}</p>
                  <p className="text-xs text-muted-foreground">{r.requestedQty} {r.smetaItem?.unit}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Tasdiqlangan</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
