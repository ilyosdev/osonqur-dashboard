import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileSpreadsheet,
  Search,
  Plus,
  Building2,
  Calendar,
  Loader2,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Banknote,
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
import { smetasApi, Smeta, SmetaType, GetSmetasParams } from "@/lib/api/smetas";
import { projectsApi, Project } from "@/lib/api/projects";
import { ProgressBar } from "@/components/dashboard/progress-bar";

const SMETA_TYPE_LABELS: Record<SmetaType, string> = {
  CONSTRUCTION: "Qurilish",
  ELECTRICAL: "Elektr",
  PLUMBING: "Santexnika",
  HVAC: "HVAC",
  FINISHING: "Pardozlash",
  OTHER: "Boshqa",
};

const SMETA_TYPE_COLORS: Record<SmetaType, string> = {
  CONSTRUCTION: "bg-blue-100 text-blue-700",
  ELECTRICAL: "bg-yellow-100 text-yellow-700",
  PLUMBING: "bg-cyan-100 text-cyan-700",
  HVAC: "bg-purple-100 text-purple-700",
  FINISHING: "bg-green-100 text-green-700",
  OTHER: "bg-gray-100 text-gray-700",
};

function formatNumber(num: number): string {
  return num.toLocaleString("uz-UZ");
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("uz-UZ");
}

export default function SmetasPage() {
  const navigate = useNavigate();
  const [smetas, setSmetas] = useState<Smeta[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

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

  const fetchSmetas = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: GetSmetasParams = {
        page,
        limit: 10,
      };
      if (searchQuery) params.search = searchQuery;
      if (projectFilter !== "all") params.projectId = projectFilter;
      if (typeFilter !== "all") params.type = typeFilter as SmetaType;

      const response = await smetasApi.getAll(params);
      setSmetas(response.data);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Smetalarni yuklashda xatolik");
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, projectFilter, typeFilter]);

  useEffect(() => {
    fetchSmetas();
  }, [fetchSmetas]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, projectFilter, typeFilter]);

  const getProgressPercent = (smeta: Smeta) => {
    if (smeta.budget === 0) return 0;
    return Math.min(100, Math.round((smeta.grandTotal / smeta.budget) * 100));
  };

  const isOverBudget = (smeta: Smeta) => {
    return smeta.grandTotal > smeta.budget && smeta.budget > 0;
  };

  const isDeadlineSoon = (smeta: Smeta) => {
    if (!smeta.deadline) return false;
    const deadline = new Date(smeta.deadline);
    const now = new Date();
    const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  };

  const isDeadlinePassed = (smeta: Smeta) => {
    if (!smeta.deadline) return false;
    return new Date(smeta.deadline) < new Date();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            Smetalar
          </h1>
          <p className="text-muted-foreground">Barcha smetalarni boshqaring va kuzating</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
          onClick={() => navigate("/smetas/new")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Smeta qo'shish
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Smeta nomi bo'yicha qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 border-0"
            />
          </div>
          <div className="flex gap-2">
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[180px] bg-muted/50 border-0">
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
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px] bg-muted/50 border-0">
                <SelectValue placeholder="Turi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha turlar</SelectItem>
                {(Object.keys(SMETA_TYPE_LABELS) as SmetaType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {SMETA_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchSmetas} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
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
      ) : smetas.length === 0 ? (
        <Card className="p-8 text-center">
          <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Smetalar topilmadi</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || projectFilter !== "all" || typeFilter !== "all"
              ? "Qidiruv mezonlariga mos smetalar topilmadi"
              : "Hozircha smetalar yo'q"}
          </p>
          <Button onClick={() => navigate("/smetas/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Birinchi smetani qo'shing
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {smetas.map((smeta, index) => (
            <Link
              key={smeta.id}
              to={`/smetas/${smeta.id}`}
              className="block"
            >
              <Card
                className="overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/50 animate-slide-up cursor-pointer"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{smeta.name}</h3>
                        <Badge className={SMETA_TYPE_COLORS[smeta.type]}>
                          {SMETA_TYPE_LABELS[smeta.type]}
                        </Badge>
                        {isOverBudget(smeta) && (
                          <Badge variant="destructive">Byudjetdan oshdi</Badge>
                        )}
                        {isDeadlinePassed(smeta) && (
                          <Badge variant="destructive">Muddat o'tdi</Badge>
                        )}
                        {isDeadlineSoon(smeta) && !isDeadlinePassed(smeta) && (
                          <Badge variant="outline" className="border-warning text-warning">
                            Muddat yaqin
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {smeta.projectName || "Loyiha"}
                        </span>
                        {smeta.deadline && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(smeta.deadline)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-6">
                      <div className="space-y-1 min-w-[200px]">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Banknote className="h-3.5 w-3.5" />
                            Byudjet
                          </span>
                          <span className="font-medium">
                            {formatNumber(smeta.budget)} so'm
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="h-3.5 w-3.5" />
                            Haqiqiy
                          </span>
                          <span className={`font-medium ${isOverBudget(smeta) ? "text-destructive" : ""}`}>
                            {formatNumber(smeta.grandTotal)} so'm
                          </span>
                        </div>
                      </div>

                      <div className="w-full sm:w-[150px] space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Bajarildi</span>
                          <span>{getProgressPercent(smeta)}%</span>
                        </div>
                        <ProgressBar
                          value={smeta.grandTotal}
                          max={smeta.budget || 1}
                          size="sm"
                          variant={isOverBudget(smeta) ? "destructive" : "default"}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-4">
        <p className="text-sm text-muted-foreground">Jami: {total} smeta</p>
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
