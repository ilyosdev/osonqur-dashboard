import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  FolderKanban,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Clock,
  Package,
  Percent,
  DollarSign,
  Calculator,
  Wallet,
  CalendarDays,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { DebtsSection } from "@/components/dashboard/debts-section";
import { WarehouseSection } from "@/components/dashboard/warehouse-section";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { usePermission } from "@/hooks";
import { useApi } from "@/hooks/use-api";
import { projectsApi, requestsApi, analyticsApi } from "@/lib/api";
import { StatsSkeleton } from "@/components/ui/table-skeleton";
import { ErrorMessage } from "@/components/ui/error-message";
import { useProject } from "@/lib/project-context";

function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + " mlrd";
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + " mln";
  }
  return num.toLocaleString("uz-UZ");
}

type Period = "all" | "today" | "week" | "month" | "last_month";

function getDateRange(period: Period): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case "today":
      return {
        dateFrom: startOfDay.toISOString(),
        dateTo: new Date(startOfDay.getTime() + 86400000).toISOString(),
      };
    case "week": {
      const weekAgo = new Date(startOfDay.getTime() - 7 * 86400000);
      return { dateFrom: weekAgo.toISOString(), dateTo: new Date(startOfDay.getTime() + 86400000).toISOString() };
    }
    case "month": {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { dateFrom: monthStart.toISOString(), dateTo: new Date(startOfDay.getTime() + 86400000).toISOString() };
    }
    case "last_month": {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { dateFrom: lastMonthStart.toISOString(), dateTo: thisMonthStart.toISOString() };
    }
    default:
      return {};
  }
}

const PERIOD_LABELS: Record<Period, string> = {
  all: "Barchasi",
  today: "Bugun",
  week: "Hafta",
  month: "Bu oy",
  last_month: "O'tgan oy",
};

export default function HomePage() {
  const { user } = useAuth();
  const { projects: allProjects, selectedProject, selectedProjectId, selectProject } = useProject();
  const canSeeActions = usePermission('dashboard:view');
  const canViewFinance = usePermission('income:view');
  const canViewStats = usePermission('statistics:view');
  const canViewWarehouse = usePermission('warehouse:view');
  const [period, setPeriod] = useState<Period>("all");

  const dateRange = useMemo(() => getDateRange(period), [period]);

  // Analytics summary (with date filtering)
  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useApi(() => analyticsApi.getDashboardSummary(dateRange), [period]);

  // Work completion
  const {
    data: workCompletion,
    loading: workLoading,
  } = useApi(() => analyticsApi.getWorkCompletion(), []);

  // Profit/Loss
  const {
    data: profitLoss,
    loading: profitLoading,
  } = useApi(() => analyticsApi.getProfitLoss(), []);

  // Cash register balance
  const {
    data: accountBalances,
  } = useApi(() => analyticsApi.getAccountBalances(), []);

  // Recent projects
  const {
    data: projectsResponse,
    loading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects,
  } = useApi(() => projectsApi.getAll({ limit: 5 }), []);

  // Pending requests (visible to BOSS + DIREKTOR)
  const {
    data: requestsResponse,
    loading: requestsLoading,
  } = useApi(() => requestsApi.getAll({ limit: 5, status: "PENDING" }), []);

  const loading = summaryLoading || projectsLoading;
  const error = summaryError || projectsError;

  const projects = projectsResponse?.data || [];
  const pendingRequests = requestsResponse?.data || [];

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Bosh sahifa</h1>
          <p className="text-muted-foreground">Tizimga xush kelibsiz, {user?.name || "Foydalanuvchi"}</p>
        </div>
        <ErrorMessage error={error} onRetry={() => { refetchSummary(); refetchProjects(); }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Bosh sahifa</h1>
          <p className="text-muted-foreground">Tizimga xush kelibsiz, {user?.name || "Foydalanuvchi"}</p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1 flex-wrap">
          <CalendarDays className="h-4 w-4 text-muted-foreground mr-1" />
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p)}
              className="text-xs"
            >
              {PERIOD_LABELS[p]}
            </Button>
          ))}
        </div>
      </div>

      {/* Project Selection Prompt */}
      {!selectedProjectId && allProjects.length > 0 && (
        <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
          <CardContent className="py-6">
            <div className="text-center space-y-3">
              <FolderKanban className="h-10 w-10 mx-auto text-primary/60" />
              <div>
                <h3 className="font-semibold text-lg">Loyihani tanlang</h3>
                <p className="text-sm text-muted-foreground">
                  Ishlash uchun loyihani tanlang — barcha ma'lumotlar tanlangan loyiha bo'yicha ko'rsatiladi
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                {allProjects.map((project) => (
                  <Button
                    key={project.id}
                    variant="outline"
                    size="sm"
                    onClick={() => selectProject(project.id)}
                    className="gap-2"
                  >
                    <FolderKanban className="h-3.5 w-3.5" />
                    {project.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Stats */}
      {loading || summaryLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatsCard
            title="Smeta qiymati"
            value={`${formatNumber(summary?.totalBudget || 0)}`}
            subtitle="so'm"
            icon={Calculator}
            variant="primary"
            className="animate-slide-up stagger-1"
          />
          <StatsCard
            title="Kirim"
            value={`${formatNumber(summary?.totalIncome || 0)}`}
            subtitle="so'm"
            icon={TrendingUp}
            variant="success"
            className="animate-slide-up stagger-2"
          />
          <StatsCard
            title="Chiqim"
            value={`${formatNumber(summary?.totalExpense || 0)}`}
            subtitle="so'm"
            icon={TrendingDown}
            variant="danger"
            className="animate-slide-up stagger-3"
          />
          <StatsCard
            title="Sklad qiymati"
            value={`${formatNumber(summary?.totalAccountBalance || 0)}`}
            subtitle="so'm"
            icon={Package}
            variant="default"
            className="animate-slide-up stagger-4"
          />
          <StatsCard
            title="Ish bajarilishi"
            value={`${workLoading ? "..." : (workCompletion?.overallValidationPercentage || 0).toFixed(1)}%`}
            subtitle="tasdiqlangan"
            icon={Percent}
            variant="warning"
            className="animate-slide-up stagger-5"
          />
          <StatsCard
            title="Foyda/Zarar"
            value={`${formatNumber(profitLoading ? 0 : (profitLoss?.netProfitLoss || 0))}`}
            subtitle="so'm"
            icon={DollarSign}
            variant={(profitLoss?.netProfitLoss || 0) >= 0 ? "success" : "danger"}
            className="animate-slide-up stagger-6"
          />
        </div>
      )}

      {/* Debt + Koshelok Summary Cards */}
      {canViewFinance && !summaryLoading && summary && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Postavshik qarzlari</p>
                    <p className="text-2xl font-bold text-destructive">
                      {formatNumber(summary.totalSupplierDebt)} so'm
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="animate-slide-up" style={{ animationDelay: "0.35s" }}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Ishchi qarzlari</p>
                    <p className="text-2xl font-bold text-destructive">
                      {formatNumber(summary.totalWorkerDebt)} so'm
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="animate-slide-up" style={{ animationDelay: "0.4s" }}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Kosheloklar</p>
                    <p className="text-2xl font-bold">
                      {formatNumber(accountBalances?.totalCashRegisterBalance || 0)} so'm
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Projects Section */}
        <Card className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-primary" />
                Loyihalar
              </CardTitle>
              <CardDescription>Faol loyihalar ro'yxati</CardDescription>
            </div>
            {canSeeActions && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/projects" className="flex items-center gap-1">
                  Hammasi <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {projectsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : projects.length > 0 ? (
              projects.slice(0, 5).map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">{project.name}</p>
                    <p className="text-xs text-muted-foreground">{project.address || "Joylashuv ko'rsatilmagan"}</p>
                  </div>
                  <Badge variant="secondary" className="bg-success/10 text-success">
                    Faol
                  </Badge>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Hozircha loyihalar yo'q
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pending Requests Section - visible to those with statistics:view */}
        {canViewStats && (
          <Card className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-warning" />
                  Kutayotgan so'rovlar
                </CardTitle>
                <CardDescription>Tasdiqlash kerak bo'lgan so'rovlar</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/requests/pending" className="flex items-center gap-1">
                  Hammasi <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {requestsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : pendingRequests.length > 0 ? (
                pendingRequests.slice(0, 5).map((request) => (
                  <div
                    key={request.id}
                    className="p-3 rounded-lg border bg-warning/5 border-warning/20"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          #{request.id.slice(0, 6)} - {request.smetaItem?.name || "Noma'lum"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(request.requestedQty)} {request.smetaItem?.unit || ""}
                        </p>
                      </div>
                      <Badge className="bg-warning/10 text-warning">Kutmoqda</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Kutayotgan so'rov yo'q
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Debts Section - Full width for finance viewers */}
      {canViewFinance && <DebtsSection className="animate-slide-up" />}

      {/* Warehouse Section - Full width for warehouse viewers */}
      {canViewWarehouse && <WarehouseSection className="animate-slide-up" />}
    </div>
  );
}
