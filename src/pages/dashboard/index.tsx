import { Link } from "react-router-dom";
import {
  FolderKanban,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Clock,
  Package,
  Percent,
  DollarSign,
  Calculator,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { DebtsSection } from "@/components/dashboard/debts-section";
import { WarehouseSection } from "@/components/dashboard/warehouse-section";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth, RoleGuard, useRoleAccess } from "@/lib/auth";
import { useApi } from "@/hooks/use-api";
import { projectsApi, requestsApi, analyticsApi } from "@/lib/api";
import { StatsSkeleton, CardSkeleton } from "@/components/ui/table-skeleton";
import { ErrorMessage } from "@/components/ui/error-message";

function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + " mlrd";
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + " mln";
  }
  return num.toLocaleString("uz-UZ");
}

export default function HomePage() {
  const { user } = useAuth();
  const isBoss = user?.role === 'BOSS';
  const canSeeActions = useRoleAccess(['DIREKTOR', 'BUGALTERIYA', 'PTO', 'SNABJENIYA', 'SKLAD', 'PRORAB']);

  // Analytics summary
  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useApi(() => analyticsApi.getDashboardSummary(), []);

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

  // Recent projects
  const {
    data: projectsResponse,
    loading: projectsLoading,
    error: projectsError,
    refetch: refetchProjects,
  } = useApi(() => projectsApi.getAll({ limit: 5 }), []);

  // Pending requests
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
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Bosh sahifa</h1>
        <p className="text-muted-foreground">Tizimga xush kelibsiz, {user?.name || "Foydalanuvchi"}</p>
      </div>

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

      {/* Debt Summary Cards */}
      <RoleGuard allowedRoles={["BOSS", "DIREKTOR", "BUGALTERIYA"]}>
        {!summaryLoading && summary && (
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
        )}
      </RoleGuard>

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

        {/* Pending Requests Section - BOSS excluded (view-only role) */}
        <RoleGuard allowedRoles={["DIREKTOR"]}>
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
        </RoleGuard>
      </div>

      {/* Debts Section - Full width for BOSS/DIREKTOR/BUGALTERIYA */}
      <RoleGuard allowedRoles={["BOSS", "DIREKTOR", "BUGALTERIYA"]}>
        <DebtsSection className="animate-slide-up" />
      </RoleGuard>

      {/* Warehouse Section - Full width for BOSS/DIREKTOR/SKLAD */}
      <RoleGuard allowedRoles={["BOSS", "DIREKTOR", "SKLAD", "SNABJENIYA"]}>
        <WarehouseSection className="animate-slide-up" />
      </RoleGuard>
    </div>
  );
}
