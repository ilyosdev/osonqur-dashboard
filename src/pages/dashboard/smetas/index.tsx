import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/auth-context";
import {
  FileSpreadsheet,
  Search,
  Building2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { smetasApi, Smeta, SmetaType, GetSmetasParams } from "@/lib/api/smetas";
import { projectsApi, Project } from "@/lib/api/projects";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { useProject } from "@/lib/project-context";
import { TablePagination } from "@/components/shared/table-pagination";

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
  const { hasPermission } = useAuth();
  const canCreate = hasPermission("smeta:edit");
  const { selectedProjectId } = useProject();
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

  // Sync project filter with global project context
  useEffect(() => {
    if (selectedProjectId) {
      setProjectFilter(selectedProjectId);
    }
  }, [selectedProjectId]);

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
      setTotalPages(response.totalPages || Math.max(1, Math.ceil((response.total || response.data.length || 0) / 10)));
      setTotal(response.total ?? response.data.length ?? 0);
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
    if (smeta.grandTotal === 0) return 0;
    return Math.min(100, Math.round((smeta.totalUsedAmount / smeta.grandTotal) * 100));
  };

  const isOverBudget = (smeta: Smeta) => {
    return smeta.totalUsedAmount > smeta.grandTotal && smeta.grandTotal > 0;
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
      {error && (
        <Card className="p-4 border-destructive bg-destructive/10">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      <Card className="flex min-h-[calc(100vh-120px)] flex-col overflow-hidden rounded-[12px] border border-[#dbe7f3] py-0 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#dbe7f3] bg-white px-5 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-[18px] w-[18px] text-[#378add]" />
            <h3 className="text-[14px] font-semibold tracking-tight text-[#0c447c]">Smetalar</h3>
          </div>
          <div className="flex w-full max-w-5xl flex-col items-stretch justify-end gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-[260px] flex-1">
              <Search className="absolute left-3 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[#378add]" />
              <Input
                placeholder="Smeta nomi bo'yicha qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                spellCheck={false}
                className="h-10 rounded-[8px] border border-[#dbe7f3] bg-white pl-9 text-[13px] text-[#0c447c] shadow-none placeholder:text-[#94a3b8]"
              />
            </div>
            {canCreate && (
              <Button
                onClick={() => navigate("/smetas/new")}
                className="h-10 rounded-[8px] bg-[#185fa5] px-4 text-[13px] font-medium text-white hover:bg-[#144f8f]"
              >
                + Yangi smeta
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col overflow-hidden bg-white">
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white hover:bg-white">
                    <TableHead className="h-12 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Smeta</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Loyiha</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Turi</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Byudjet</TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Haqiqiy</TableHead>
                    <TableHead className="w-[180px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Bajarildi</TableHead>
                    <TableHead className="w-[140px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Muddat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="align-top">
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-20 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#378add]" />
                      </TableCell>
                    </TableRow>
                  ) : smetas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-2 text-[#85b7eb]">
                          <FileSpreadsheet className="h-10 w-10 opacity-30" />
                          <p className="text-sm">
                            {searchQuery || projectFilter !== "all" || typeFilter !== "all"
                              ? "Qidiruv mezonlariga mos smetalar topilmadi"
                              : "Hozircha smetalar yo'q"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    smetas.map((smeta) => (
                      <TableRow
                        key={smeta.id}
                        className="h-20 cursor-pointer border-b border-[#eef2f7] last:border-b-0 transition-colors hover:bg-[#f8fbff]"
                        onClick={() => navigate(`/smetas/${smeta.id}`)}
                      >
                        <TableCell className="py-4">
                          <div className="space-y-0.5">
                            <div className="text-[15px] font-semibold text-[#0c447c]">{smeta.name}</div>
                            <div className="text-sm text-[#64748b]">v{smeta.currentVersion}</div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="flex items-center gap-2 text-sm text-[#64748b]">
                            <Building2 className="h-4 w-4 text-[#64748b]" />
                            {smeta.projectName || "Loyiha"}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge className={`${SMETA_TYPE_COLORS[smeta.type]} shadow-none`}>
                            {SMETA_TYPE_LABELS[smeta.type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 font-medium text-[#0c447c]">
                          {formatNumber(smeta.grandTotal)} so'm
                        </TableCell>
                        <TableCell className={`py-4 font-medium ${isOverBudget(smeta) ? "text-destructive" : "text-[#0c447c]"}`}>
                          {formatNumber(smeta.totalUsedAmount)} so'm
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-[#64748b]">
                              <span>{getProgressPercent(smeta)}%</span>
                              {isOverBudget(smeta) && <span className="text-destructive">Oshgan</span>}
                            </div>
                            <ProgressBar
                              value={smeta.totalUsedAmount}
                              max={smeta.grandTotal || 1}
                              size="sm"
                              variant={isOverBudget(smeta) ? "destructive" : "default"}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-sm text-[#64748b]">
                          {smeta.deadline ? formatDate(smeta.deadline) : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} summary={`Sahifa ${page} / ${totalPages}`} />
      </Card>
    </div>
  );
}
