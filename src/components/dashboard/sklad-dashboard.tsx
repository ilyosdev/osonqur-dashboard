import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Package, Clock, Wallet, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { warehousesApi, requestsApi, cashRegistersApi } from "@/lib/api";
import type { WarehouseItem } from "@/lib/api/warehouses";
import { Link } from "react-router-dom";

function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + " mlrd";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " mln";
  return n.toLocaleString("uz-UZ");
}

const C = { blue: "#185fa5", lightBlue: "#dbe7f3", green: "#22c55e", red: "#ef4444", amber: "#f59e0b", gray: "#e5e7eb", purple: "#a855f7" };

export function SkladDashboard() {
  const { data: warehousesRes } = useApi(() => warehousesApi.getAll({ limit: 20 }), []);
  const { data: itemsRes } = useApi(() => warehousesApi.getAllItems({ limit: 100 }), []);
  const { data: pendingRes } = useApi(() => requestsApi.getAll({ limit: 1, status: "PENDING" }), []);
  const { data: approvedRes } = useApi(() => requestsApi.getAll({ limit: 1, status: "APPROVED" }), []);
  const { data: koshelok, loading: kLoad } = useApi(() => cashRegistersApi.getMyKoshelok(), []);

  const items = (itemsRes?.data || []) as WarehouseItem[];

  // Top materiallar miqdori bo'yicha (real nom bilan)
  const topItems = [...items]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 7)
    .map(item => ({
      name: (item.name || "Noma'lum").slice(0, 14),
      Miqdor: item.quantity,
      unit: item.unit || "",
    }));

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
              <p className="text-sm font-medium text-muted-foreground">Omborlar</p>
              <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: C.lightBlue }}>
                <Package className="h-4 w-4" style={{ color: C.blue }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: C.blue }}>{warehousesRes?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">ta ombor</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Material turlari</p>
              <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center">
                <Package className="h-4 w-4 text-purple-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-purple-600">{itemsRes?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">ta tur</p>
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
            <p className="text-2xl font-bold text-amber-500">{pendingRes?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">ta zayavka</p>
          </CardContent>
        </Card>
      </div>

      {/* Materiallar jadvali — yuqorida, aniq */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" style={{ color: C.blue }} />
              Sklad
            </CardTitle>
            <span className="text-xs text-muted-foreground">{itemsRes?.total ?? 0} ta material</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Material yo'q</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Material</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Miqdor</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 8).map(item => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium truncate max-w-[250px]">
                      {item.name || "Noma'lum"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="font-semibold" style={{ color: C.blue }}>{item.quantity}</span>
                      <span className="text-muted-foreground ml-1 text-xs">{item.unit || ""}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {items.length > 8 && (
                <tfoot>
                  <tr>
                    <td colSpan={2} className="px-4 py-2 text-center">
                      <Link to="/warehouse" className="text-xs" style={{ color: C.blue }}>
                        Hammasi ko'rish ({itemsRes?.total}) →
                      </Link>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Materiallar miqdori bar (real nomlar bilan) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" style={{ color: C.blue }} />
              Materiallar miqdori
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Material yo'q</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topItems} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v, _, props) => [`${v} ${props.payload?.unit || ""}`, "Miqdor"]} />
                  <Bar dataKey="Miqdor" fill={C.blue} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
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
              <span style={{ color: C.green }}>+{fmt(koshelok?.totalIn || 0)}</span>
              <span style={{ color: C.red }}>−{fmt(koshelok?.totalOut || 0)}</span>
              <span style={{ color: C.blue }} className="font-semibold">{fmt(koshelok?.balance || 0)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
