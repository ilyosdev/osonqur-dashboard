import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Truck, Clock, CheckCircle, Wallet, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { driversApi, cashRegistersApi } from "@/lib/api";
import type { DriverDelivery } from "@/lib/api";
import { Link } from "react-router-dom";

function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + " mlrd";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " mln";
  return n.toLocaleString("uz-UZ");
}

const C = { blue: "#185fa5", lightBlue: "#dbe7f3", green: "#22c55e", red: "#ef4444", amber: "#f59e0b" };

const STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING:   { label: "Kutayotgan", color: C.amber },
  COLLECTED: { label: "Olingan",    color: C.blue },
  DELIVERED: { label: "Yetkazilgan", color: C.green },
  REJECTED:  { label: "Rad etilgan", color: C.red },
};

export function HaydovchiDashboard() {
  const { data: allDeliveriesRes } = useApi(() => driversApi.getMyDeliveries({}), []);
  const { data: historyRes } = useApi(() => driversApi.getHistory({}), []);
  const { data: koshelok, loading: kLoad } = useApi(() => cashRegistersApi.getMyKoshelok(), []);

  const deliveries: DriverDelivery[] = allDeliveriesRes?.data || [];
  const history: DriverDelivery[] = historyRes?.data || [];

  const pending = deliveries.filter(d => d.status === "PENDING");
  const collected = deliveries.filter(d => d.status === "COLLECTED");
  const delivered = deliveries.filter(d => d.status === "DELIVERED");

  // Status pie
  const statusCounts = Object.entries(STATUS_META)
    .map(([key, meta]) => ({ name: meta.label, value: deliveries.filter(d => d.status === key).length, color: meta.color }))
    .filter(d => d.value > 0);

  // Project bar chart
  const byProject: Record<string, number> = {};
  [...deliveries, ...history].forEach(d => {
    const name = d.project?.name?.slice(0, 12) || "Boshqa";
    byProject[name] = (byProject[name] || 0) + 1;
  });
  const projectBar = Object.entries(byProject).map(([name, count]) => ({ name, Yuklatmalar: count })).slice(0, 6);

  return (
    <div className="space-y-4">
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
            <p className="text-2xl font-bold text-amber-500">{pending.length}</p>
            <p className="text-xs text-muted-foreground mt-1">yuklatma</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Olingan</p>
              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: C.lightBlue }}>
                <Package className="h-4 w-4" style={{ color: C.blue }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: C.blue }}>{collected.length}</p>
            <p className="text-xs text-muted-foreground mt-1">yuklatma</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Yetkazilgan</p>
              <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center"><CheckCircle className="h-4 w-4 text-green-500" /></div>
            </div>
            <p className="text-2xl font-bold text-green-600">{delivered.length}</p>
            <p className="text-xs text-muted-foreground mt-1">yuklatma</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Truck className="h-4 w-4" style={{ color: C.blue }} />
              Yuklatmalar holati
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusCounts.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Yuklatma yo'q</p> : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={statusCounts} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" stroke="none">
                      {statusCounts.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {statusCounts.map(d => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                        <span className="text-sm text-muted-foreground">{d.name}</span>
                      </div>
                      <span className="text-sm font-semibold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Truck className="h-4 w-4" style={{ color: C.blue }} />
              Loyiha bo'yicha yuklatmalar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projectBar.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Ma'lumot yo'q</p> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={projectBar} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="Yuklatmalar" fill={C.blue} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {pending.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Kutayotgan yuklatmalar
              </CardTitle>
              <Link to="/foreman" className="text-xs" style={{ color: C.blue }}>Hammasi →</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.slice(0, 5).map(d => (
              <div key={d.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 border border-amber-100">
                <div>
                  <p className="text-sm font-medium">{d.smetaItem?.name || "Noma'lum"}</p>
                  <p className="text-xs text-muted-foreground">{d.project?.name} · {d.requestedQty} {d.smetaItem?.unit}</p>
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
