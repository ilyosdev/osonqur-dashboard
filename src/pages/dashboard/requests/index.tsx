import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  Search,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  AlertCircle,
  RefreshCw,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requestsApi, GetPurchaseRequestsParams } from "@/lib/api/requests";
import { projectsApi, Project } from "@/lib/api/projects";
import { useApi } from "@/hooks/use-api";
import { StatsCard } from "@/components/dashboard/stats-card";

const statusOptions = [
  { value: "all", label: "Barcha holatlar" },
  { value: "PENDING", label: "Kutmoqda" },
  { value: "APPROVED", label: "Tasdiqlangan" },
  { value: "REJECTED", label: "Rad etilgan" },
];

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    PENDING: "bg-warning/10 text-warning",
    APPROVED: "bg-success/10 text-success",
    REJECTED: "bg-destructive/10 text-destructive",
    COMPLETED: "bg-primary/10 text-primary",
  };
  const labels: Record<string, string> = {
    PENDING: "Kutmoqda",
    APPROVED: "Tasdiqlangan",
    REJECTED: "Rad etilgan",
    COMPLETED: "Bajarilgan",
  };
  return (
    <Badge className={styles[status] || "bg-muted text-muted-foreground"}>
      {labels[status] || status}
    </Badge>
  );
};

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  return num.toLocaleString("uz-UZ");
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<import("@/lib/api/requests").PurchaseRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Fetch stats counts from separate API calls
  const { data: pendingCount } = useApi(() => requestsApi.getAll({ status: "PENDING", limit: 1 }), []);
  const { data: approvedCount } = useApi(() => requestsApi.getAll({ status: "APPROVED", limit: 1 }), []);
  const { data: rejectedCount } = useApi(() => requestsApi.getAll({ status: "REJECTED", limit: 1 }), []);

  const stats = {
    pending: pendingCount?.total ?? 0,
    approved: approvedCount?.total ?? 0,
    rejected: rejectedCount?.total ?? 0,
  };

  // Fetch projects for filter dropdown
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await projectsApi.getAll({ limit: 100 });
        setProjects(response.data);
      } catch (err) {
        console.error("Error fetching projects:", err);
      }
    };
    fetchProjects();
  }, []);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: GetPurchaseRequestsParams = {
        page,
        limit: 10,
      };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== "all") params.status = statusFilter;
      if (projectFilter !== "all") params.projectId = projectFilter;

      const response = await requestsApi.getAll(params);
      setRequests(response.data);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "So'rovlarni yuklashda xatolik");
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, statusFilter, projectFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, projectFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            So'rovlar
          </h1>
          <p className="text-muted-foreground">Barcha material so'rovlarini ko'ring</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/requests/pending">
              <Clock className="h-4 w-4 mr-2" />
              Kutayotganlar ({stats.pending})
            </Link>
          </Button>
          <Button asChild>
            <Link to="/requests/pending">
              <Plus className="h-4 w-4 mr-2" />
              Yangi so'rov
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          title="Kutmoqda"
          value={stats.pending}
          subtitle="ta so'rov"
          icon={Clock}
          variant="warning"
        />
        <StatsCard
          title="Tasdiqlangan"
          value={stats.approved}
          subtitle="ta so'rov"
          icon={CheckCircle}
          variant="success"
        />
        <StatsCard
          title="Rad etilgan"
          value={stats.rejected}
          subtitle="ta so'rov"
          icon={XCircle}
          variant="danger"
        />
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3">
          {/* Project filter */}
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full sm:w-[250px] bg-muted/50 border-0">
                <SelectValue placeholder="Loyiha tanlang" />
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
          </div>

          {/* Search and status filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Material nomi bo'yicha qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/50 border-0"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] bg-muted/50 border-0">
                  <SelectValue placeholder="Holat" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchRequests} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {error && (
        <Card className="p-4 border-destructive bg-destructive/10">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : requests.length === 0 ? (
        <Card className="p-8 text-center">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">So'rovlar topilmadi</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || statusFilter !== "all"
              ? "Qidiruv mezonlariga mos so'rovlar topilmadi"
              : "Hozircha so'rovlar yo'q"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request, index) => (
            <Card
              key={request.id}
              className="overflow-hidden transition-all duration-200 hover:shadow-md animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">
                        #{request.id.slice(0, 8)}
                      </span>
                      {getStatusBadge(request.status)}
                      {request.isOverrun && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Smeta oshdi
                        </Badge>
                      )}
                      {request.source === "TELEGRAM" && (
                        <Badge variant="outline" className="text-xs">
                          Telegram
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold">
                      {request.smetaItem?.name || "Noma'lum material"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {formatNumber(request.requestedQty)} {request.smetaItem?.unit || ""}
                      {request.smetaItem?.unitPrice && (
                        <span> x {formatNumber(request.smetaItem.unitPrice)} so'm</span>
                      )}
                    </p>
                    {request.requestedBy && (
                      <p className="text-xs text-muted-foreground">
                        So'rovchi: {request.requestedBy.name}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">
                      {formatNumber(request.requestedAmount)} so'm
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(request.createdAt).toLocaleDateString("uz-UZ")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-4">
        <p className="text-sm text-muted-foreground">Jami: {total} so'rov</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Oldingi
          </Button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              variant="outline"
              size="sm"
              className={page === p ? "bg-primary text-white hover:bg-primary/90" : ""}
              onClick={() => setPage(p)}
            >
              {p}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Keyingi
          </Button>
        </div>
      </div>
    </div>
  );
}
