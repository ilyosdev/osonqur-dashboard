import { useState } from "react";
import { Users, Truck, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApi } from "@/hooks/use-api";
import { analyticsApi, SupplierDebtsSummary, WorkerDebtsSummary } from "@/lib/api/analytics";
import { Skeleton } from "@/components/ui/skeleton";

function formatMoney(num: number): string {
  return num.toLocaleString("uz-UZ");
}

interface DebtsSectionProps {
  className?: string;
}

export function DebtsSection({ className }: DebtsSectionProps) {
  const [activeTab, setActiveTab] = useState<"suppliers" | "workers">("suppliers");

  const {
    data: supplierDebts,
    loading: supplierLoading,
  } = useApi(() => analyticsApi.getSupplierDebts(), []);

  const {
    data: workerDebts,
    loading: workerLoading,
  } = useApi(() => analyticsApi.getWorkerDebts(), []);

  const loading = activeTab === "suppliers" ? supplierLoading : workerLoading;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          Qarzlar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "suppliers" | "workers")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="suppliers" className="gap-2">
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Postavshiklar</span>
              <span className="sm:hidden">P.</span>
              {supplierDebts && supplierDebts.supplierCount > 0 && (
                <span className="ml-1 text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">
                  {supplierDebts.supplierCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="workers" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Ishchilar</span>
              <span className="sm:hidden">I.</span>
              {workerDebts && workerDebts.workerCount > 0 && (
                <span className="ml-1 text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">
                  {workerDebts.workerCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers" className="space-y-2 mt-0">
            {supplierLoading ? (
              <DebtsSkeleton />
            ) : (
              <SupplierDebtsList data={supplierDebts ?? undefined} />
            )}
          </TabsContent>

          <TabsContent value="workers" className="space-y-2 mt-0">
            {workerLoading ? (
              <DebtsSkeleton />
            ) : (
              <WorkerDebtsList data={workerDebts ?? undefined} />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function DebtsSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

function SupplierDebtsList({ data }: { data?: SupplierDebtsSummary }) {
  if (!data || data.suppliers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Qarz yo'q</p>
        <p className="text-sm mt-1">Barcha postavshiklar bilan hisob-kitob qilingan</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between px-3 py-2 bg-destructive/5 rounded-lg mb-3">
        <span className="text-sm font-medium">Jami qarz:</span>
        <span className="text-lg font-bold text-destructive">
          {formatMoney(data.totalDebt)} so'm
        </span>
      </div>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {data.suppliers.map((supplier) => (
          <div
            key={supplier.supplierId}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
          >
            <div>
              <p className="font-medium text-sm">{supplier.supplierName}</p>
              <p className="text-xs text-muted-foreground">
                {supplier.unpaidCount} ta to'lanmagan
              </p>
            </div>
            <p className="font-semibold text-destructive">
              {formatMoney(supplier.totalDebt)} so'm
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

function WorkerDebtsList({ data }: { data?: WorkerDebtsSummary }) {
  if (!data || data.workers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Qarz yo'q</p>
        <p className="text-sm mt-1">Barcha ishchilar bilan hisob-kitob qilingan</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between px-3 py-2 bg-destructive/5 rounded-lg mb-3">
        <span className="text-sm font-medium">Jami qarz:</span>
        <span className="text-lg font-bold text-destructive">
          {formatMoney(data.totalDebt)} so'm
        </span>
      </div>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {data.workers.map((worker) => (
          <div
            key={worker.workerId}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
          >
            <div>
              <p className="font-medium text-sm">{worker.workerName}</p>
              <p className="text-xs text-muted-foreground">
                Ishlagan: {formatMoney(worker.totalEarned)} | To'langan: {formatMoney(worker.totalPaid)}
              </p>
            </div>
            <p className="font-semibold text-destructive">
              {formatMoney(worker.debt)} so'm
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
