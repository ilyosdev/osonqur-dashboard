import { Link } from "react-router-dom";
import { Wallet, TrendingUp, TrendingDown, PiggyBank, ArrowRight, DollarSign } from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/use-api";
import { accountsApi, incomesApi, expensesApi, cashRegistersApi } from "@/lib/api/finance";
import { StatsSkeleton, CardSkeleton } from "@/components/ui/table-skeleton";
import { ErrorMessage } from "@/components/ui/error-message";

function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + "B";
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  return num.toLocaleString("uz-UZ");
}

const categoryNames: Record<string, string> = {
  MATERIAL: "Material",
  LABOR: "Ish haqi",
  EQUIPMENT: "Texnika",
  TRANSPORT: "Transport",
  OTHER: "Boshqa",
};

export default function FinancePage() {
  const {
    data: accountsResponse,
    loading: accountsLoading,
    error: accountsError,
    refetch: refetchAccounts,
  } = useApi(() => accountsApi.getAll({ limit: 100 }), []);

  const {
    data: incomesResponse,
    loading: incomesLoading,
  } = useApi(() => incomesApi.getAll({ limit: 5 }), []);

  const {
    data: expensesResponse,
    loading: expensesLoading,
  } = useApi(() => expensesApi.getAll({ limit: 5 }), []);

  const {
    data: cashRegistersResponse,
    loading: cashRegistersLoading,
  } = useApi(() => cashRegistersApi.getAll({ limit: 100 }), []);

  const loading = accountsLoading || incomesLoading || expensesLoading || cashRegistersLoading;
  const error = accountsError;

  const accounts = accountsResponse?.data || [];
  const recentIncomes = incomesResponse?.data || [];
  const recentExpenses = expensesResponse?.data || [];
  const cashRegisters = cashRegistersResponse?.data || [];

  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
  const totalCashBalance = cashRegisters.reduce((sum, c) => sum + (c.balance || 0), 0);
  const totalIncome = recentIncomes.reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = recentExpenses.reduce((sum, e) => sum + e.amount, 0);

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Moliya</h1>
          <p className="text-muted-foreground">Kirim, chiqim va kassalar holati</p>
        </div>
        <ErrorMessage error={error} onRetry={refetchAccounts} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Moliya</h1>
        <p className="text-muted-foreground">Kirim, chiqim va kassalar holati</p>
      </div>

      {loading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Jami kirim"
            value={formatNumber(totalIncome)}
            subtitle="oxirgi"
            icon={TrendingUp}
            variant="success"
            className="animate-slide-up stagger-1"
          />
          <StatsCard
            title="Jami chiqim"
            value={formatNumber(totalExpense)}
            subtitle="oxirgi"
            icon={TrendingDown}
            variant="danger"
            className="animate-slide-up stagger-2"
          />
          <StatsCard
            title="Balans"
            value={formatNumber(totalBalance)}
            subtitle="qoldiq"
            icon={Wallet}
            variant="primary"
            className="animate-slide-up stagger-3"
          />
          <StatsCard
            title="Kassalarda"
            value={formatNumber(totalCashBalance)}
            subtitle="naqd pul"
            icon={PiggyBank}
            variant="warning"
            className="animate-slide-up stagger-4"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                Oxirgi kirimlar
              </CardTitle>
              <CardDescription>Pul tushumlari</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/finance/income" className="flex items-center gap-1">
                Hammasi <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {incomesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recentIncomes.length > 0 ? (
              recentIncomes.map((income) => (
                <div
                  key={income.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/10"
                >
                  <div>
                    <p className="font-medium text-sm">{income.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(income.date).toLocaleDateString("uz-UZ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-success">+{formatNumber(income.amount)} so'm</p>
                    {income.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-32">{income.description}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Hozircha kirimlar yo'q
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Oxirgi chiqimlar
              </CardTitle>
              <CardDescription>Xarajatlar</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/finance/expense" className="flex items-center gap-1">
                Hammasi <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {expensesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recentExpenses.length > 0 ? (
              recentExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10"
                >
                  <div>
                    <p className="font-medium text-sm">{categoryNames[expense.category] || expense.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(expense.date).toLocaleDateString("uz-UZ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-destructive">-{formatNumber(expense.amount)} so'm</p>
                    {expense.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-32">{expense.description}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Hozircha chiqimlar yo'q
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="animate-slide-up" style={{ animationDelay: "0.4s" }}>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-warning" />
            Kassalar holati
          </CardTitle>
          <CardDescription>Prorablar kashlogi</CardDescription>
        </CardHeader>
        <CardContent>
          {cashRegistersLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : cashRegisters.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cashRegisters.map((kassa) => (
                <div key={kassa.id} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{kassa.user?.name || kassa.name}</p>
                    {kassa.user?.role ? (
                      <Badge variant="secondary">{kassa.user.role}</Badge>
                    ) : kassa.location ? (
                      <Badge variant="secondary">{kassa.location}</Badge>
                    ) : null}
                  </div>
                  <p className="text-2xl font-bold text-primary">{formatNumber(kassa.balance)} so'm</p>
                  {(kassa.totalIn !== undefined || kassa.totalOut !== undefined) && (
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-green-600">+{formatNumber(kassa.totalIn || 0)}</span>
                      <span className="text-xs text-red-600">-{formatNumber(kassa.totalOut || 0)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Hozircha kassalar yo'q
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
