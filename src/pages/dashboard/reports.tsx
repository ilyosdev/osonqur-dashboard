import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChartBar,
  Calendar,
  Download,
  FileText,
  CheckCircle,
  XCircle,
  TrendingUp,
  Package,
  Loader2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { StatsCard } from "@/components/dashboard/stats-card";
import { projectsApi, requestsApi, PurchaseRequest } from "@/lib/api";

const formatCurrency = (value: number) => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toString();
};

interface Project {
  id: string;
  name: string;
}

interface ReportStats {
  totalRequests: number;
  approved: number;
  rejected: number;
  pending: number;
  totalAmount: number;
}

type TabType = "daily" | "weekly" | "monthly";

// Get date range based on tab and selected date
function getDateRange(tab: TabType, date: string): { start: Date; end: Date } {
  const selectedDate = new Date(date);
  selectedDate.setHours(0, 0, 0, 0);

  switch (tab) {
    case "daily": {
      const end = new Date(selectedDate);
      end.setHours(23, 59, 59, 999);
      return { start: selectedDate, end };
    }
    case "weekly": {
      // Get Monday of the week containing selectedDate
      const dayOfWeek = selectedDate.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const start = new Date(selectedDate);
      start.setDate(start.getDate() + mondayOffset);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case "monthly": {
      const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
  }
}

// Filter requests by date range
function filterByDateRange(requests: PurchaseRequest[], start: Date, end: Date): PurchaseRequest[] {
  return requests.filter(req => {
    const createdAt = new Date(req.createdAt);
    return createdAt >= start && createdAt <= end;
  });
}

// Calculate stats from requests
function calculateStats(requests: PurchaseRequest[]): ReportStats {
  const approved = requests.filter(r => r.status === 'APPROVED' || r.status === 'IN_TRANSIT' || r.status === 'DELIVERED' || r.status === 'RECEIVED' || r.status === 'FINALIZED');
  const rejected = requests.filter(r => r.status === 'REJECTED');
  const pending = requests.filter(r => r.status === 'PENDING');

  // Sum amounts from approved/finalized requests
  const totalAmount = approved.reduce((sum, r) => sum + (r.requestedAmount || 0), 0);

  return {
    totalRequests: requests.length,
    approved: approved.length,
    rejected: rejected.length,
    pending: pending.length,
    totalAmount,
  };
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("daily");
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [allRequests, setAllRequests] = useState<PurchaseRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await projectsApi.getAll({ limit: 100 });
      setProjects(response.data);
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  }, []);

  const fetchReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all requests (we'll filter by date on frontend)
      const params: { limit: number; projectId?: string } = { limit: 10000 };
      if (selectedProject !== "all") {
        params.projectId = selectedProject;
      }

      const response = await requestsApi.getAll(params);
      setAllRequests(response.data);
    } catch (err) {
      console.error("Error fetching report data:", err);
      setAllRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject]);

  // Calculate stats based on active tab and selected date
  const stats = useMemo(() => {
    const { start, end } = getDateRange(activeTab, selectedDate);
    const filtered = filterByDateRange(allRequests, start, end);
    return calculateStats(filtered);
  }, [allRequests, activeTab, selectedDate]);

  // Get date range label
  const dateRangeLabel = useMemo(() => {
    const { start, end } = getDateRange(activeTab, selectedDate);
    const formatDate = (d: Date) => d.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });

    if (activeTab === "daily") {
      return formatDate(start);
    }
    return `${formatDate(start)} - ${formatDate(end)}`;
  }, [activeTab, selectedDate]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ChartBar className="h-6 w-6 text-primary" />
            Hisobotlar
          </h1>
          <p className="text-muted-foreground">Batafsil statistika va tahlillar</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled>
            <FileText className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" disabled>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="daily" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Calendar className="h-4 w-4 mr-2" />
            Kunlik
          </TabsTrigger>
          <TabsTrigger value="weekly" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Calendar className="h-4 w-4 mr-2" />
            Haftalik
          </TabsTrigger>
          <TabsTrigger value="monthly" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Calendar className="h-4 w-4 mr-2" />
            Oylik
          </TabsTrigger>
        </TabsList>

        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full sm:w-[200px] bg-muted/50 border-0">
                <SelectValue placeholder="Loyiha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha loyihalar</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-[180px] bg-muted/50 border-0"
            />
          </div>
        </Card>

        <TabsContent value="daily" className="space-y-6 mt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatsCard
                  title="Jami so'rovlar"
                  value={stats.totalRequests}
                  subtitle="bugun"
                  icon={Package}
                  variant="primary"
                />
                <StatsCard
                  title="Tasdiqlangan"
                  value={stats.approved}
                  icon={CheckCircle}
                  variant="success"
                />
                <StatsCard
                  title="Rad etilgan"
                  value={stats.rejected}
                  icon={XCircle}
                  variant="danger"
                />
                <StatsCard
                  title="Kutilmoqda"
                  value={stats.pending}
                  icon={Clock}
                  variant="warning"
                />
                <StatsCard
                  title="Jami summa"
                  value={formatCurrency(stats.totalAmount)}
                  subtitle="so'm"
                  icon={TrendingUp}
                  variant="default"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Kunlik hisobot</CardTitle>
                  <CardDescription>{dateRangeLabel}</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.totalRequests === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ChartBar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Bu kun uchun ma'lumotlar yo'q</p>
                      <p className="text-sm mt-1">So'rovlar kiritilganda statistika ko'rsatiladi</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm text-muted-foreground">Tasdiqlash darajasi</span>
                        <span className="font-semibold">
                          {stats.totalRequests > 0
                            ? Math.round((stats.approved / stats.totalRequests) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm text-muted-foreground">O'rtacha so'rov summasi</span>
                        <span className="font-semibold">
                          {stats.approved > 0
                            ? formatCurrency(Math.round(stats.totalAmount / stats.approved))
                            : 0} so'm
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="weekly" className="space-y-6 mt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatsCard
                  title="Jami so'rovlar"
                  value={stats.totalRequests}
                  subtitle="bu hafta"
                  icon={Package}
                  variant="primary"
                />
                <StatsCard
                  title="Tasdiqlangan"
                  value={stats.approved}
                  icon={CheckCircle}
                  variant="success"
                />
                <StatsCard
                  title="Rad etilgan"
                  value={stats.rejected}
                  icon={XCircle}
                  variant="danger"
                />
                <StatsCard
                  title="Kutilmoqda"
                  value={stats.pending}
                  icon={Clock}
                  variant="warning"
                />
                <StatsCard
                  title="Jami summa"
                  value={formatCurrency(stats.totalAmount)}
                  subtitle="so'm"
                  icon={TrendingUp}
                  variant="default"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Haftalik statistika</CardTitle>
                  <CardDescription>{dateRangeLabel}</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.totalRequests === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ChartBar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Bu hafta uchun ma'lumotlar yo'q</p>
                      <p className="text-sm mt-1">So'rovlar kiritilganda statistika ko'rsatiladi</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm text-muted-foreground">Tasdiqlash darajasi</span>
                        <span className="font-semibold">
                          {stats.totalRequests > 0
                            ? Math.round((stats.approved / stats.totalRequests) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm text-muted-foreground">O'rtacha so'rov summasi</span>
                        <span className="font-semibold">
                          {stats.approved > 0
                            ? formatCurrency(Math.round(stats.totalAmount / stats.approved))
                            : 0} so'm
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6 mt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatsCard
                  title="Jami so'rovlar"
                  value={stats.totalRequests}
                  subtitle="bu oy"
                  icon={Package}
                  variant="primary"
                />
                <StatsCard
                  title="Tasdiqlangan"
                  value={stats.approved}
                  icon={CheckCircle}
                  variant="success"
                />
                <StatsCard
                  title="Rad etilgan"
                  value={stats.rejected}
                  icon={XCircle}
                  variant="danger"
                />
                <StatsCard
                  title="Kutilmoqda"
                  value={stats.pending}
                  icon={Clock}
                  variant="warning"
                />
                <StatsCard
                  title="Jami summa"
                  value={formatCurrency(stats.totalAmount)}
                  subtitle="so'm"
                  icon={TrendingUp}
                  variant="default"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Oylik statistika</CardTitle>
                  <CardDescription>{dateRangeLabel}</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.totalRequests === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ChartBar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Bu oy uchun ma'lumotlar yo'q</p>
                      <p className="text-sm mt-1">So'rovlar kiritilganda statistika ko'rsatiladi</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm text-muted-foreground">Tasdiqlash darajasi</span>
                        <span className="font-semibold">
                          {stats.totalRequests > 0
                            ? Math.round((stats.approved / stats.totalRequests) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm text-muted-foreground">O'rtacha so'rov summasi</span>
                        <span className="font-semibold">
                          {stats.approved > 0
                            ? formatCurrency(Math.round(stats.totalAmount / stats.approved))
                            : 0} so'm
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
