import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FolderOpen, Plus, Search, RefreshCw, Loader2, MoreVertical,
  Edit, Trash2, AlertCircle, ArrowLeft, MapPin, Users, FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { adminApi, AdminOrgProject, AdminOrganization } from "@/lib/api/admin";

const STATUS_OPTIONS = [
  { value: "PLANNING", label: "Rejalashtirish", color: "bg-blue-500/10 text-blue-600" },
  { value: "ACTIVE", label: "Faol", color: "bg-green-500/10 text-green-600" },
  { value: "ON_HOLD", label: "To'xtatilgan", color: "bg-yellow-500/10 text-yellow-600" },
  { value: "COMPLETED", label: "Tugallangan", color: "bg-gray-500/10 text-gray-600" },
];

export default function OrgProjectsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [orgInfo, setOrgInfo] = useState<AdminOrganization | null>(null);
  const [projects, setProjects] = useState<AdminOrgProject[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<AdminOrgProject | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    name: "", address: "", floors: "", budget: "", status: "ACTIVE",
  });

  const fetchOrg = useCallback(async () => {
    if (!orgId) return;
    try { setOrgInfo(await adminApi.getOrganization(orgId)); } catch {}
  }, [orgId]);

  const fetchProjects = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    setError("");
    try {
      const result = await adminApi.getOrgProjects(orgId, { page, limit: 20, search: searchQuery || undefined });
      setProjects(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  }, [orgId, page, searchQuery]);

  useEffect(() => { fetchOrg(); }, [fetchOrg]);
  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const resetForm = () => {
    setFormData({ name: "", address: "", floors: "", budget: "", status: "ACTIVE" });
    setFormError("");
  };

  const openAddDialog = () => { resetForm(); setAddDialogOpen(true); };

  const openEditDialog = (p: AdminOrgProject) => {
    setSelectedProject(p);
    setFormData({
      name: p.name,
      address: p.address || "",
      floors: p.floors?.toString() || "",
      budget: p.budget?.toString() || "",
      status: p.status || "PLANNING",
    });
    setFormError("");
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (p: AdminOrgProject) => { setSelectedProject(p); setDeleteDialogOpen(true); };

  const handleAdd = async () => {
    if (!orgId || !formData.name.trim()) { setFormError("Loyiha nomi kiritilishi kerak"); return; }
    setIsSubmitting(true);
    setFormError("");
    try {
      await adminApi.createOrgProject(orgId, {
        name: formData.name,
        address: formData.address || undefined,
        floors: formData.floors ? parseInt(formData.floors) : undefined,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
      });
      setAddDialogOpen(false);
      fetchProjects();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!orgId || !selectedProject) return;
    setIsSubmitting(true);
    setFormError("");
    try {
      await adminApi.updateOrgProject(orgId, selectedProject.id, {
        name: formData.name || undefined,
        address: formData.address || undefined,
        floors: formData.floors ? parseInt(formData.floors) : undefined,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        status: formData.status || undefined,
      });
      setEditDialogOpen(false);
      fetchProjects();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!orgId || !selectedProject) return;
    setIsSubmitting(true);
    try {
      await adminApi.deleteOrgProject(orgId, selectedProject.id);
      setDeleteDialogOpen(false);
      fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "O'chirishda xatolik yuz berdi");
      setDeleteDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find((o) => o.value === status);
    return <Badge variant="secondary" className={opt?.color || ""}>{opt?.label || status}</Badge>;
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/organizations"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FolderOpen className="h-6 w-6" />
            {orgInfo?.name || "..."} — Loyihalar
          </h1>
          <p className="text-muted-foreground">Kompaniya loyihalarini boshqaring</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Loyiha qo'shish
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Nomi bo'yicha qidirish..." value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} className="pl-9 bg-muted/50 border-0" />
          </div>
          <Button variant="outline" size="icon" onClick={fetchProjects} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </Card>

      {error && (
        <Card className="p-4 border-destructive bg-destructive/10">
          <div className="flex items-center gap-2 text-destructive"><AlertCircle className="h-5 w-5" /><span>{error}</span></div>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : projects.length === 0 ? (
        <Card className="p-8 text-center">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Loyihalar topilmadi</h3>
          <Button onClick={openAddDialog}><Plus className="h-4 w-4 mr-2" />Birinchi loyihani qo'shing</Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="overflow-hidden transition-all duration-200 hover:shadow-md group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-lg">{project.name}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(project)}>
                        <Edit className="h-4 w-4 mr-2" />Tahrirlash
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openDeleteDialog(project)}>
                        <Trash2 className="h-4 w-4 mr-2" />O'chirish
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {project.address && (
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /><span>{project.address}</span></div>
                  )}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{project.userCount || 0} xodim</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>{project.smetaCount || 0} smeta</span>
                    </div>
                  </div>
                  {project.smetaBudgetTotal > 0 && (
                    <div>Byudjet: {project.smetaBudgetTotal.toLocaleString()} so'm</div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  {getStatusBadge(project.status)}
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/admin/organizations/${orgId}/projects/${project.id}`}>Batafsil</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">Jami: {total}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Oldingi</Button>
            <span className="text-sm">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Keyingi</Button>
          </div>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi loyiha</DialogTitle>
            <DialogDescription>Yangi loyiha yarating</DialogDescription>
          </DialogHeader>
          {formError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{formError}</div>}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nomi *</Label>
              <Input placeholder="Loyiha nomi" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Manzil</Label>
              <Input placeholder="Joylashuv" value={formData.address} onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Qavatlar</Label>
                <Input type="number" placeholder="9" value={formData.floors} onChange={(e) => setFormData(p => ({ ...p, floors: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Byudjet</Label>
                <Input type="number" placeholder="1000000" value={formData.budget} onChange={(e) => setFormData(p => ({ ...p, budget: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={isSubmitting}>Bekor qilish</Button>
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Yaratilmoqda...</> : "Yaratish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Loyihani tahrirlash</DialogTitle>
            <DialogDescription>Loyiha ma'lumotlarini yangilang</DialogDescription>
          </DialogHeader>
          {formError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{formError}</div>}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nomi</Label>
              <Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Manzil</Label>
              <Input value={formData.address} onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Qavatlar</Label>
                <Input type="number" value={formData.floors} onChange={(e) => setFormData(p => ({ ...p, floors: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Byudjet</Label>
                <Input type="number" value={formData.budget} onChange={(e) => setFormData(p => ({ ...p, budget: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Holat</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSubmitting}>Bekor qilish</Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saqlanmoqda...</> : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Loyihani o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Haqiqatan ham <strong>{selectedProject?.name}</strong> loyihasini o'chirmoqchimisiz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />O'chirilmoqda...</> : "O'chirish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
