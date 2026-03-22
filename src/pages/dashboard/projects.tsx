import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  FolderKanban,
  Search,
  Plus,
  MapPin,
  Calendar,
  Building2,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { projectsApi, Project, CreateProjectRequest, UpdateProjectRequest, GetProjectsParams } from "@/lib/api/projects";

const statusOptions = [
  { value: "all", label: "Barcha holatlar" },
  { value: "ACTIVE", label: "Faol" },
  { value: "COMPLETED", label: "Tugallangan" },
  { value: "ON_HOLD", label: "To'xtatilgan" },
];

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    ACTIVE: "bg-success/10 text-success",
    COMPLETED: "bg-primary/10 text-primary",
    ON_HOLD: "bg-warning/10 text-warning",
  };
  const labels: Record<string, string> = {
    ACTIVE: "Faol",
    COMPLETED: "Tugallangan",
    ON_HOLD: "To'xtatilgan",
  };
  return (
    <Badge className={styles[status] || "bg-muted text-muted-foreground"}>
      {labels[status] || status}
    </Badge>
  );
};

interface ProjectFormData {
  name: string;
  address: string;
  description: string;
}

const initialFormData: ProjectFormData = {
  name: "",
  address: "",
  description: "",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: GetProjectsParams = {
        page,
        limit: 10,
      };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== "all") params.status = statusFilter;

      const response = await projectsApi.getAll(params);
      setProjects(response.data);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Loyihalarni yuklashda xatolik");
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, statusFilter]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  const handleAddProject = async () => {
    if (!formData.name.trim()) {
      setFormError("Loyiha nomini kiriting");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload: CreateProjectRequest = {
        name: formData.name.trim(),
        address: formData.address.trim() || undefined,
        description: formData.description.trim() || undefined,
      };

      await projectsApi.create(payload);
      setAddDialogOpen(false);
      setFormData(initialFormData);
      fetchProjects();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Loyiha qo'shishda xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProject = async () => {
    if (!selectedProject) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload: UpdateProjectRequest = {
        name: formData.name.trim() || undefined,
        address: formData.address.trim() || undefined,
        description: formData.description.trim() || undefined,
      };

      await projectsApi.update(selectedProject.id, payload);
      setEditDialogOpen(false);
      setSelectedProject(null);
      setFormData(initialFormData);
      fetchProjects();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Loyihani tahrirlashda xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    setIsSubmitting(true);
    try {
      await projectsApi.delete(selectedProject.id);
      setDeleteDialogOpen(false);
      setSelectedProject(null);
      fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Loyihani o'chirishda xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (project: Project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name || "",
      address: project.address || "",
      description: project.description || "",
    });
    setFormError(null);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (project: Project) => {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  const openAddDialog = () => {
    setFormData(initialFormData);
    setFormError(null);
    setAddDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-primary" />
            Loyihalar
          </h1>
          <p className="text-muted-foreground">Barcha qurilish loyihalarini boshqaring</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
          onClick={openAddDialog}
        >
          <Plus className="h-4 w-4 mr-2" />
          Yangi loyiha
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Loyiha nomi bo'yicha qidirish..."
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
            <Button variant="outline" size="icon" onClick={fetchProjects} disabled={isLoading}>
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
      ) : projects.length === 0 ? (
        <Card className="p-8 text-center">
          <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Loyihalar topilmadi</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || statusFilter !== "all"
              ? "Qidiruv mezonlariga mos loyihalar topilmadi"
              : "Hozircha loyihalar yo'q"}
          </p>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Birinchi loyihani qo'shing
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, index) => (
            <Card
              key={project.id}
              className="overflow-hidden transition-all duration-200 hover:shadow-md animate-slide-up group"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <Link to={`/projects/${project.id}`} className="flex-1">
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(project)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Tahrirlash
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => openDeleteDialog(project)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        O'chirish
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  {project.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{project.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(project.createdAt).toLocaleDateString("uz-UZ")}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  {getStatusBadge(project.status || "ACTIVE")}
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/projects/${project.id}`}>
                      Batafsil
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-4">
        <p className="text-sm text-muted-foreground">Jami: {total} loyiha</p>
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

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Yangi loyiha
            </DialogTitle>
            <DialogDescription>Yangi qurilish loyihasini qo'shing</DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Loyiha nomi *</Label>
              <Input
                id="name"
                placeholder="Masalan: Navoiy 108-uy"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Joylashuv</Label>
              <Input
                id="address"
                placeholder="Masalan: Toshkent sh., Chilonzor tumani"
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Tavsif</Label>
              <Textarea
                id="description"
                placeholder="Loyiha haqida qisqacha ma'lumot"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={isSubmitting}>
              Bekor qilish
            </Button>
            <Button onClick={handleAddProject} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Qo'shilmoqda...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Qo'shish
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Loyihani tahrirlash
            </DialogTitle>
            <DialogDescription>Loyiha ma'lumotlarini yangilang</DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Loyiha nomi</Label>
              <Input
                id="editName"
                placeholder="Loyiha nomi"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editAddress">Joylashuv</Label>
              <Input
                id="editAddress"
                placeholder="Joylashuv"
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editDescription">Tavsif</Label>
              <Textarea
                id="editDescription"
                placeholder="Tavsif"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSubmitting}>
              Bekor qilish
            </Button>
            <Button onClick={handleEditProject} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saqlanmoqda...
                </>
              ) : (
                "Saqlash"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Loyihani o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Haqiqatan ham <strong>{selectedProject?.name}</strong> loyihasini o'chirmoqchimisiz?
              Bu amalni bekor qilib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  O'chirilmoqda...
                </>
              ) : (
                "O'chirish"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
