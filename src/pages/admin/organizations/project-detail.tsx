import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FolderOpen, Plus, Search, RefreshCw, Loader2, MoreVertical,
  Edit, Trash2, AlertCircle, ArrowLeft, FileSpreadsheet, Users, Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { adminApi, AdminOrgProject, AdminProjectSmeta, AdminProjectUser, AdminSmetaType, AdminOrgUser } from "@/lib/api/admin";

const SMETA_TYPES: { value: AdminSmetaType; label: string }[] = [
  { value: "CONSTRUCTION", label: "Qurilish" },
  { value: "ELECTRICAL", label: "Elektr" },
  { value: "PLUMBING", label: "Santexnika" },
  { value: "HVAC", label: "Isitish/Sovutish" },
  { value: "FINISHING", label: "Pardozlash" },
  { value: "OTHER", label: "Boshqa" },
];

export default function ProjectDetailPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const [project, setProject] = useState<AdminOrgProject | null>(null);
  const [smetas, setSmetas] = useState<AdminProjectSmeta[]>([]);
  const [users, setUsers] = useState<AdminProjectUser[]>([]);
  const [smetaTotal, setSmetaTotal] = useState(0);
  const [smetaPage, setSmetaPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Smeta dialogs
  const [addSmetaDialogOpen, setAddSmetaDialogOpen] = useState(false);
  const [editSmetaDialogOpen, setEditSmetaDialogOpen] = useState(false);
  const [deleteSmetaDialogOpen, setDeleteSmetaDialogOpen] = useState(false);
  const [selectedSmeta, setSelectedSmeta] = useState<AdminProjectSmeta | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // User assignment state
  const [assignUserDialogOpen, setAssignUserDialogOpen] = useState(false);
  const [allOrgUsers, setAllOrgUsers] = useState<AdminOrgUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  const [smetaFormData, setSmetaFormData] = useState({
    name: "",
    type: "CONSTRUCTION" as AdminSmetaType,
    description: "",
    budget: "",
    deadline: "",
    overheadPercent: "17.27",
  });

  const fetchProject = useCallback(async () => {
    if (!orgId || !projectId) return;
    // Get project from the projects list (we don't have a single project endpoint)
    try {
      const result = await adminApi.getOrgProjects(orgId, { page: 1, limit: 100 });
      const proj = result.data.find((p) => p.id === projectId);
      if (proj) setProject(proj);
    } catch {}
  }, [orgId, projectId]);

  const fetchSmetas = useCallback(async () => {
    if (!orgId || !projectId) return;
    setIsLoading(true);
    setError("");
    try {
      const result = await adminApi.getProjectSmetas(orgId, projectId, {
        page: smetaPage,
        limit: 20,
        search: searchQuery || undefined,
      });
      setSmetas(result.data);
      setSmetaTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  }, [orgId, projectId, smetaPage, searchQuery]);

  const fetchUsers = useCallback(async () => {
    if (!orgId || !projectId) return;
    try {
      const result = await adminApi.getProjectUsers(orgId, projectId);
      setUsers(result);
    } catch {}
  }, [orgId, projectId]);

  useEffect(() => { fetchProject(); }, [fetchProject]);
  useEffect(() => { fetchSmetas(); }, [fetchSmetas]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const resetSmetaForm = () => {
    setSmetaFormData({
      name: "",
      type: "CONSTRUCTION",
      description: "",
      budget: "",
      deadline: "",
      overheadPercent: "17.27",
    });
    setFormError("");
  };

  const openAddSmetaDialog = () => {
    resetSmetaForm();
    setAddSmetaDialogOpen(true);
  };

  const openEditSmetaDialog = (smeta: AdminProjectSmeta) => {
    setSelectedSmeta(smeta);
    setSmetaFormData({
      name: smeta.name,
      type: smeta.type,
      description: smeta.description || "",
      budget: smeta.budget?.toString() || "",
      deadline: smeta.deadline ? smeta.deadline.split("T")[0] : "",
      overheadPercent: smeta.overheadPercent?.toString() || "17.27",
    });
    setFormError("");
    setEditSmetaDialogOpen(true);
  };

  const openDeleteSmetaDialog = (smeta: AdminProjectSmeta) => {
    setSelectedSmeta(smeta);
    setDeleteSmetaDialogOpen(true);
  };

  const handleAddSmeta = async () => {
    if (!orgId || !projectId || !smetaFormData.name.trim()) {
      setFormError("Smeta nomi kiritilishi kerak");
      return;
    }
    setIsSubmitting(true);
    setFormError("");
    try {
      await adminApi.createProjectSmeta(orgId, projectId, {
        name: smetaFormData.name,
        type: smetaFormData.type,
        description: smetaFormData.description || undefined,
        budget: smetaFormData.budget ? parseFloat(smetaFormData.budget) : undefined,
        deadline: smetaFormData.deadline || undefined,
        overheadPercent: smetaFormData.overheadPercent ? parseFloat(smetaFormData.overheadPercent) : undefined,
      });
      setAddSmetaDialogOpen(false);
      fetchSmetas();
      fetchProject();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSmeta = async () => {
    if (!orgId || !projectId || !selectedSmeta) return;
    setIsSubmitting(true);
    setFormError("");
    try {
      await adminApi.updateProjectSmeta(orgId, projectId, selectedSmeta.id, {
        name: smetaFormData.name || undefined,
        type: smetaFormData.type,
        description: smetaFormData.description || undefined,
        budget: smetaFormData.budget ? parseFloat(smetaFormData.budget) : undefined,
        deadline: smetaFormData.deadline || undefined,
        overheadPercent: smetaFormData.overheadPercent ? parseFloat(smetaFormData.overheadPercent) : undefined,
      });
      setEditSmetaDialogOpen(false);
      fetchSmetas();
      fetchProject();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSmeta = async () => {
    if (!orgId || !projectId || !selectedSmeta) return;
    setIsSubmitting(true);
    try {
      await adminApi.deleteProjectSmeta(orgId, projectId, selectedSmeta.id);
      setDeleteSmetaDialogOpen(false);
      fetchSmetas();
      fetchProject();
    } catch {} finally {
      setIsSubmitting(false);
    }
  };

  const openAssignUserDialog = async () => {
    setAssignUserDialogOpen(true);
    setSelectedUserId("");
    if (!orgId) return;
    try {
      const result = await adminApi.getOrgUsers(orgId, { limit: 100 });
      setAllOrgUsers(result.data);
    } catch {}
  };

  const handleAssignUser = async () => {
    if (!orgId || !projectId || !selectedUserId) return;
    try {
      await adminApi.assignUserToProject(orgId, selectedUserId, projectId);
      setSelectedUserId("");
      fetchUsers();
    } catch {}
  };

  const handleUnassignUser = async (userId: string) => {
    if (!orgId || !projectId) return;
    try {
      await adminApi.unassignUserFromProject(orgId, userId, projectId);
      fetchUsers();
    } catch {}
  };

  const formatMoney = (val: number) => {
    return val.toLocaleString("uz-UZ") + " so'm";
  };

  const getSmetaTypeLabel = (type: string) => {
    return SMETA_TYPES.find((t) => t.value === type)?.label || type;
  };

  const smetaTotalPages = Math.ceil(smetaTotal / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/admin/organizations/${orgId}/projects`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FolderOpen className="h-6 w-6" />
            {project?.name || "..."}
          </h1>
          <p className="text-muted-foreground">Loyiha ma'lumotlari va smetalar</p>
        </div>
      </div>

      {/* Project Info Card */}
      {project && (
        <Card className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Manzil:</span>
              <p className="font-medium">{project.address || "-"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Qavatlar:</span>
              <p className="font-medium">{project.floors || "-"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Smetalar soni:</span>
              <p className="font-medium">{project.smetaCount}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Jami byudjet:</span>
              <p className="font-medium">{formatMoney(project.smetaBudgetTotal)}</p>
            </div>
          </div>
        </Card>
      )}

      <Tabs defaultValue="smetas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="smetas" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Smetalar ({smetaTotal})
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Xodimlar ({users.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="smetas" className="space-y-4">
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Nomi bo'yicha qidirish..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSmetaPage(1); }}
                  className="pl-9 bg-muted/50 border-0"
                />
              </div>
              <Button variant="outline" size="icon" onClick={fetchSmetas} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
              <Button onClick={openAddSmetaDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Smeta qo'shish
              </Button>
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
              <Button onClick={openAddSmetaDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Birinchi smetani qo'shing
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {smetas.map((smeta) => (
                <Card key={smeta.id} className="overflow-hidden transition-all duration-200 hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <Link to={`/smetas/${smeta.id}`} className="font-semibold text-lg hover:text-primary transition-colors">
                        {smeta.name}
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditSmetaDialog(smeta)}>
                            <Edit className="h-4 w-4 mr-2" />Tahrirlash
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => openDeleteSmetaDialog(smeta)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />O'chirish
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <Badge variant="secondary">{getSmetaTypeLabel(smeta.type)}</Badge>
                      {smeta.description && (
                        <p className="line-clamp-2">{smeta.description}</p>
                      )}
                      <div className="pt-2 border-t">
                        <div className="flex justify-between">
                          <span>Byudjet:</span>
                          <span className="font-medium text-foreground">{formatMoney(smeta.grandTotal || 0)}</span>
                        </div>
                      </div>
                      {smeta.deadline && (
                        <div className="flex items-center gap-1 pt-2">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(smeta.deadline).toLocaleDateString("uz-UZ")}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {smetaTotalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">Jami: {smetaTotal}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={smetaPage <= 1} onClick={() => setSmetaPage((p) => p - 1)}>
                  Oldingi
                </Button>
                <span className="text-sm">{smetaPage} / {smetaTotalPages}</span>
                <Button variant="outline" size="sm" disabled={smetaPage >= smetaTotalPages} onClick={() => setSmetaPage((p) => p + 1)}>
                  Keyingi
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openAssignUserDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Xodim biriktirish
            </Button>
          </div>
          {users.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Xodimlar topilmadi</h3>
              <p className="text-muted-foreground">Bu loyihaga hali xodimlar biriktirilmagan</p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((user) => (
                <Card key={user.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.phone}</p>
                    </div>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.role}
                    </Badge>
                    <Button variant="ghost" size="sm" className="text-destructive h-7"
                      onClick={() => handleUnassignUser(user.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Smeta Dialog */}
      <Dialog open={addSmetaDialogOpen} onOpenChange={setAddSmetaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi smeta</DialogTitle>
            <DialogDescription>Loyihaga yangi smeta qo'shing</DialogDescription>
          </DialogHeader>
          {formError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{formError}</div>}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nomi *</Label>
              <Input
                placeholder="Smeta nomi"
                value={smetaFormData.name}
                onChange={(e) => setSmetaFormData((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Turi</Label>
              <Select
                value={smetaFormData.type}
                onValueChange={(v) => setSmetaFormData((p) => ({ ...p, type: v as AdminSmetaType }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SMETA_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tavsif</Label>
              <Input
                placeholder="Qisqacha tavsif"
                value={smetaFormData.description}
                onChange={(e) => setSmetaFormData((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Byudjet</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={smetaFormData.budget}
                  onChange={(e) => setSmetaFormData((p) => ({ ...p, budget: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Muddat</Label>
                <Input
                  type="date"
                  value={smetaFormData.deadline}
                  onChange={(e) => setSmetaFormData((p) => ({ ...p, deadline: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSmetaDialogOpen(false)} disabled={isSubmitting}>
              Bekor qilish
            </Button>
            <Button onClick={handleAddSmeta} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Yaratilmoqda...</> : "Yaratish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Smeta Dialog */}
      <Dialog open={editSmetaDialogOpen} onOpenChange={setEditSmetaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Smetani tahrirlash</DialogTitle>
            <DialogDescription>Smeta ma'lumotlarini yangilang</DialogDescription>
          </DialogHeader>
          {formError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{formError}</div>}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nomi</Label>
              <Input
                value={smetaFormData.name}
                onChange={(e) => setSmetaFormData((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Turi</Label>
              <Select
                value={smetaFormData.type}
                onValueChange={(v) => setSmetaFormData((p) => ({ ...p, type: v as AdminSmetaType }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SMETA_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tavsif</Label>
              <Input
                value={smetaFormData.description}
                onChange={(e) => setSmetaFormData((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Byudjet</Label>
                <Input
                  type="number"
                  value={smetaFormData.budget}
                  onChange={(e) => setSmetaFormData((p) => ({ ...p, budget: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Muddat</Label>
                <Input
                  type="date"
                  value={smetaFormData.deadline}
                  onChange={(e) => setSmetaFormData((p) => ({ ...p, deadline: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSmetaDialogOpen(false)} disabled={isSubmitting}>
              Bekor qilish
            </Button>
            <Button onClick={handleEditSmeta} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saqlanmoqda...</> : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Smeta Dialog */}
      <AlertDialog open={deleteSmetaDialogOpen} onOpenChange={setDeleteSmetaDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smetani o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Haqiqatan ham <strong>{selectedSmeta?.name}</strong> smetasini o'chirmoqchimisiz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSmeta}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />O'chirilmoqda...</> : "O'chirish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign User to Project Dialog */}
      <Dialog open={assignUserDialogOpen} onOpenChange={setAssignUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Xodim biriktirish</DialogTitle>
            <DialogDescription>Loyihaga xodim tayinlang</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Xodim tanlang" /></SelectTrigger>
                <SelectContent>
                  {allOrgUsers
                    .filter((u) => !users.some((pu) => pu.id === u.id))
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAssignUser} disabled={!selectedUserId}>Tayinlash</Button>
            </div>
            {users.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Tayinlangan xodimlar:</p>
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{u.name}</span>
                      <Badge variant="outline" className="text-[10px]">{u.role}</Badge>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive h-7"
                      onClick={() => handleUnassignUser(u.id)}>
                      Olib tashlash
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
