import { useState, useMemo } from "react";
import { ProrabDashboard } from "@/components/dashboard/prorab-dashboard";
import { SnabjeniyaDashboard } from "@/components/dashboard/snabjeniya-dashboard";
import { SkladDashboard } from "@/components/dashboard/sklad-dashboard";
import { BugalteriyaDashboard } from "@/components/dashboard/bugalteriya-dashboard";
import { HaydovchiDashboard } from "@/components/dashboard/haydovchi-dashboard";
import { ModeratorDashboard } from "@/components/dashboard/moderator-dashboard";
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
  CheckCircle,
  XCircle,
  Users,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { DebtsSection } from "@/components/dashboard/debts-section";
import { WarehouseSection } from "@/components/dashboard/warehouse-section";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { usePermission } from "@/hooks";
import { useApi } from "@/hooks/use-api";
import { projectsApi, requestsApi, analyticsApi, cashRegistersApi, warehousesApi, driversApi, workersApi, smetasApi } from "@/lib/api";
import { StatsSkeleton } from "@/components/ui/table-skeleton";
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
  const { user, hasPermission } = useAuth();
  const { projects: allProjects, selectedProject, selectedProjectId, selectProject } = useProject();
  const canSeeActions = usePermission('dashboard:view');
  const canViewFinance = usePermission('income:view');
  const canViewStats = hasPermission('statistics:view');
  const canViewWarehouse = usePermission('warehouse:view');
  const canViewRequests = hasPermission('request:view_all') || hasPermission('request:approve');
  const canViewProjects = hasPermission('project:view');
  const [period, setPeriod] = useState<Period>("all");

  const dateRange = useMemo(() => getDateRange(period), [period]);

  // Analytics summary — only if user has statistics permission
  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useApi(() => analyticsApi.getDashboardSummary(dateRange), [period], { enabled: canViewStats });

  // Work completion
  const {
    data: workCompletion,
    loading: workLoading,
  } = useApi(() => analyticsApi.getWorkCompletion(), [], { enabled: canViewStats });

  // Profit/Loss
  const {
    data: profitLoss,
    loading: profitLoading,
  } = useApi(() => analyticsApi.getProfitLoss(), [], { enabled: canViewStats });

  // Cash register balance
  const {
    data: accountBalances,
  } = useApi(() => analyticsApi.getAccountBalances(), [], { enabled: canViewFinance });

  // Recent projects
  const {
    data: projectsResponse,
    loading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects,
  } = useApi(() => projectsApi.getAll({ limit: 5 }), [], { enabled: canViewProjects });

  // Pending requests
  const {
    data: requestsResponse,
    loading: requestsLoading,
  } = useApi(() => requestsApi.getAll({ limit: 5, status: "PENDING" }), [], { enabled: canViewRequests });

  // Role detection
  const orgRole = user?.orgRoleName?.toUpperCase() ?? "";
  const isProrab = orgRole === "PRORAB";
  const isSnab = orgRole === "SNABJENIYA";
  const isSklad = orgRole === "SKLAD";
  const isDirektor = orgRole === "DIREKTOR" || orgRole === "BOSS";
  const isBugalteriya = orgRole === "BUGALTERIYA";
  const isHaydovchi = orgRole === "HAYDOVCHI";
  const isModerator = orgRole === "MODERATOR";
  const hasRoleStats = isProrab || isSnab || isSklad || isBugalteriya || isHaydovchi || isModerator;

  const canViewKoshelok = hasPermission('cash_register:view') || hasPermission('cash_register:manage');

  const { data: myKoshelok, loading: koshelokLoading } = useApi(
    () => cashRegistersApi.getMyKoshelok(),
    [],
    { enabled: canViewKoshelok }
  );

  // PRORAB: workers count, smetas count, pending requests
  const { data: workersRes } = useApi(
    () => workersApi.getAll({ limit: 1 }),
    [],
    { enabled: isProrab }
  );
  const { data: smetasRes } = useApi(
    () => smetasApi.getAll({ limit: 1 }),
    [],
    { enabled: isProrab }
  );

  // SNABJENIYA: pending + approved requests
  const { data: approvedRequestsRes } = useApi(
    () => requestsApi.getAll({ limit: 1, status: "APPROVED" }),
    [],
    { enabled: isSnab || isProrab }
  );
  const { data: rejectedRequestsRes } = useApi(
    () => requestsApi.getAll({ limit: 1, status: "REJECTED" }),
    [],
    { enabled: isSnab }
  );

  // SKLAD: warehouse items total
  const { data: warehousesRes } = useApi(
    () => warehousesApi.getAll({ limit: 100 }),
    [],
    { enabled: isSklad }
  );
  const { data: warehouseItemsRes } = useApi(
    () => warehousesApi.getAllItems({ limit: 1 }),
    [],
    { enabled: isSklad }
  );

  // HAYDOVCHI: pending + delivered deliveries
  const { data: pendingDeliveriesRes } = useApi(
    () => driversApi.getMyDeliveries({ status: "PENDING" }),
    [],
    { enabled: isHaydovchi }
  );
  const { data: deliveredRes } = useApi(
    () => driversApi.getMyDeliveries({ status: "DELIVERED" }),
    [],
    { enabled: isHaydovchi }
  );

  const projects = projectsResponse?.data || [];
  const pendingRequests = requestsResponse?.data || [];

  return (
    <div className="space-y-6 animate-fade-in">
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Bosh sahifa</h1>
          <p className="text-muted-foreground">Tizimga xush kelibsiz, {user?.name || "Foydalanuvchi"}</p>
        </div>

        {/* Period Selector */}
        {canViewStats && (
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground mr-1" />
            <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
              <SelectTrigger className="h-9 w-[170px] rounded-[10px] border border-input bg-background text-sm shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {PERIOD_LABELS[p]}
                </SelectItem>
              ))}
              </SelectContent>
            </Select>
          </div>
        )}
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
      {canViewStats && (
        summaryLoading ? (
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
        )
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

      {/* Role-specific dashboards with charts */}
      {isProrab && <ProrabDashboard />}
      {isSnab && <SnabjeniyaDashboard />}
      {isSklad && <SkladDashboard />}
      {isBugalteriya && <BugalteriyaDashboard />}
      {isHaydovchi && <HaydovchiDashboard />}
      {isModerator && <ModeratorDashboard />}

      {/* Generic stats for unrecognized roles */}
      {!isProrab && !isSnab && !isSklad && !isBugalteriya && !isHaydovchi && !isModerator && (hasRoleStats || (canViewKoshelok && !canViewStats) || (canViewStats && canViewKoshelok && isDirektor)) && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* KOSHELOK — shown for all roles that have it */}
          {canViewKoshelok && (
            <Card className="animate-slide-up">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">Mening koshelogim</p>
                  <div className="h-9 w-9 rounded-lg bg-[#dbe7f3] flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-[#185fa5]" />
                  </div>
                </div>
                {koshelokLoading ? (
                  <div className="h-7 w-24 bg-muted/50 rounded animate-pulse" />
                ) : (
                  <>
                    <p className="text-2xl font-bold text-[#185fa5]">
                      {formatNumber(myKoshelok?.balance || 0)} <span className="text-sm font-normal text-muted-foreground">so'm</span>
                    </p>
                    <div className="flex gap-3 mt-2 text-xs">
                      <span className="text-green-600">+{formatNumber(myKoshelok?.totalIn || 0)}</span>
                      <span className="text-red-500">−{formatNumber(myKoshelok?.totalOut || 0)}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* PRORAB: kutayotgan zayavkalar, ustalar, smetalar */}
          {isProrab && (
            <>
              <Card className="animate-slide-up">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground">Kutayotgan zayavkalar</p>
                    <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-amber-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{requestsResponse?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">ta zayavka</p>
                </CardContent>
              </Card>
              <Card className="animate-slide-up">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground">Ustalar</p>
                    <div className="h-9 w-9 rounded-lg bg-[#dbe7f3] flex items-center justify-center">
                      <Users className="h-4 w-4 text-[#185fa5]" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{workersRes?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">ta usta</p>
                </CardContent>
              </Card>
              <Card className="animate-slide-up">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground">Smetalar</p>
                    <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Calculator className="h-4 w-4 text-purple-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{smetasRes?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">ta smeta</p>
                </CardContent>
              </Card>
            </>
          )}

          {/* SNABJENIYA: kutayotgan, tasdiqlangan, rad etilgan */}
          {isSnab && (
            <>
              <Card className="animate-slide-up">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground">Kutayotgan</p>
                    <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-amber-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{requestsResponse?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">zayavka</p>
                </CardContent>
              </Card>
              <Card className="animate-slide-up">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground">Tasdiqlangan</p>
                    <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{approvedRequestsRes?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">zayavka</p>
                </CardContent>
              </Card>
              <Card className="animate-slide-up">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground">Rad etilgan</p>
                    <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center">
                      <XCircle className="h-4 w-4 text-red-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-red-500">{rejectedRequestsRes?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">zayavka</p>
                </CardContent>
              </Card>
            </>
          )}

          {/* SKLAD: omborlar soni, materiallar soni */}
          {isSklad && (
            <>
              <Card className="animate-slide-up">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground">Omborlar</p>
                    <div className="h-9 w-9 rounded-lg bg-[#dbe7f3] flex items-center justify-center">
                      <Package className="h-4 w-4 text-[#185fa5]" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{warehousesRes?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">ta ombor</p>
                </CardContent>
              </Card>
              <Card className="animate-slide-up">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground">Materiallar</p>
                    <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Package className="h-4 w-4 text-purple-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{warehouseItemsRes?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">ta material</p>
                </CardContent>
              </Card>
              <Card className="animate-slide-up">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground">Kutayotgan zayavkalar</p>
                    <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-amber-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{requestsResponse?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">zayavka</p>
                </CardContent>
              </Card>
            </>
          )}

          {/* BUGALTERIYA: kirim, chiqim */}
          {isBugalteriya && (
            <>
              <Card className="animate-slide-up">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground">Kirim</p>
                    <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{formatNumber(summary?.totalIncome || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">so'm</p>
                </CardContent>
              </Card>
              <Card className="animate-slide-up">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground">Chiqim</p>
                    <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-red-500">{formatNumber(summary?.totalExpense || 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">so'm</p>
                </CardContent>
              </Card>
              <Card className="animate-slide-up">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground">Balans</p>
                    <div className="h-9 w-9 rounded-lg bg-[#dbe7f3] flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-[#185fa5]" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-[#185fa5]">{formatNumber((summary?.totalIncome || 0) - (summary?.totalExpense || 0))}</p>
                  <p className="text-xs text-muted-foreground mt-1">so'm</p>
                </CardContent>
              </Card>
            </>
          )}

          {/* HAYDOVCHI: kutayotgan, yetkazilgan */}
          {isHaydovchi && (
            <>
              <Card className="animate-slide-up">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground">Kutayotgan yuklatmalar</p>
                    <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-amber-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{(pendingDeliveriesRes as { data?: unknown[] })?.data?.length ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">ta yuklatma</p>
                </CardContent>
              </Card>
              <Card className="animate-slide-up">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-muted-foreground">Yetkazilganlar</p>
                    <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{(deliveredRes as { data?: unknown[] })?.data?.length ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">ta yetkazildi</p>
                </CardContent>
              </Card>
            </>
          )}

        </div>
      )}

      {/* Main Content Grid */}
      {(canViewProjects || canViewRequests) && !isProrab && !isSnab && !isSklad && !isBugalteriya && !isHaydovchi && !isModerator && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Projects Section */}
          {canViewProjects && (
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
          )}

          {/* Pending Requests Section */}
          {canViewRequests && (
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
      )}

      {/* Debts Section - Full width for finance viewers */}
      {canViewFinance && <DebtsSection className="animate-slide-up" />}

      {/* Warehouse Section - Full width for warehouse viewers */}
      {canViewWarehouse && <WarehouseSection className="animate-slide-up" />}
    </div>
  );
}
