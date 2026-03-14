import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileSpreadsheet,
  ArrowLeft,
  Building2,
  Calendar,
  Banknote,
  Loader2,
  AlertCircle,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { smetasApi, SmetaType, CreateSmetaRequest } from "@/lib/api/smetas";
import { projectsApi, Project } from "@/lib/api/projects";

const SMETA_TYPES: { value: SmetaType; label: string; description: string }[] = [
  { value: "CONSTRUCTION", label: "Qurilish", description: "Umumiy qurilish ishlari" },
  { value: "ELECTRICAL", label: "Elektr", description: "Elektr montaj ishlari" },
  { value: "PLUMBING", label: "Santexnika", description: "Santexnika ishlari" },
  { value: "HVAC", label: "HVAC", description: "Isitish, ventilyatsiya va konditsioner" },
  { value: "FINISHING", label: "Pardozlash", description: "Ichki pardozlash ishlari" },
  { value: "OTHER", label: "Boshqa", description: "Boshqa turdagi ishlar" },
];

function parseNumber(value: string): number {
  const cleaned = value.replace(/[^\d]/g, "");
  return parseInt(cleaned, 10) || 0;
}

function formatNumberInput(value: number): string {
  if (value === 0) return "";
  return value.toLocaleString("uz-UZ");
}

export default function NewSmetaPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    projectId: "",
    name: "",
    type: "CONSTRUCTION" as SmetaType,
    description: "",
    budget: 0,
    budgetDisplay: "",
    deadline: "",
    overheadPercent: 17.27,
  });

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await projectsApi.getAll({ limit: 100 });
        setProjects(response.data);
      } catch (err) {
        console.error("Error fetching projects:", err);
      } finally {
        setIsLoadingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  const handleBudgetChange = (value: string) => {
    const numValue = parseNumber(value);
    setFormData((prev) => ({
      ...prev,
      budget: numValue,
      budgetDisplay: formatNumberInput(numValue),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.projectId) {
      setError("Loyihani tanlash shart");
      return;
    }

    if (!formData.name.trim()) {
      setError("Smeta nomini kiriting");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload: CreateSmetaRequest = {
        projectId: formData.projectId,
        name: formData.name.trim(),
        type: formData.type,
        description: formData.description.trim() || undefined,
        budget: formData.budget,
        deadline: formData.deadline || undefined,
        overheadPercent: formData.overheadPercent,
      };

      const smeta = await smetasApi.create(payload);
      navigate(`/smetas/${smeta.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Smeta yaratishda xatolik");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild>
          <Link to="/smetas" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Ortga
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Yangi smeta yaratish
          </CardTitle>
          <CardDescription>
            Loyihaga yangi smeta qo'shing. Keyinchalik smeta elementlarini qo'shishingiz mumkin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="project" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Loyiha *
              </Label>
              {isLoadingProjects ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loyihalar yuklanmoqda...
                </div>
              ) : (
                <Select
                  value={formData.projectId}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, projectId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Loyihani tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Smeta nomi *</Label>
              <Input
                id="name"
                placeholder="Masalan: Poydevor ishlari"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Smeta turi</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value as SmetaType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SMETA_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col">
                        <span>{type.label}</span>
                        <span className="text-xs text-muted-foreground">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Tavsif</Label>
              <Textarea
                id="description"
                placeholder="Smeta haqida qo'shimcha ma'lumot..."
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget" className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Rejalashtirilgan byudjet
                </Label>
                <div className="relative">
                  <Input
                    id="budget"
                    placeholder="0"
                    value={formData.budgetDisplay}
                    onChange={(e) => handleBudgetChange(e.target.value)}
                    className="pr-16"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    so'm
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Muddat
                </Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData((prev) => ({ ...prev, deadline: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="overhead">Qo'shimcha xarajatlar foizi (%)</Label>
              <Input
                id="overhead"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.overheadPercent}
                onChange={(e) => setFormData((prev) => ({ ...prev, overheadPercent: parseFloat(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">
                Standart qiymat: 17.27%
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate("/smetas")}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Yaratilmoqda...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Yaratish
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
