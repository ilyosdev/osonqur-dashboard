import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Users, Plus, Search, RefreshCw, Loader2, MoreVertical,
  Edit, Trash2, AlertCircle, ArrowLeft, Eye, EyeOff, FolderOpen,
} from "lucide-react";
import { Card } from "@/components/ui/card";
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { adminApi, AdminOrgUser, AdminOrganization, AdminOrgRole, UserProjectAssignment, AdminOrgProject } from "@/lib/api/admin";

export default function OrgUsersPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [orgInfo, setOrgInfo] = useState<AdminOrganization | null>(null);
  const [users, setUsers] = useState<AdminOrgUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [orgRoles, setOrgRoles] = useState<AdminOrgRole[]>([]);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectsDialogOpen, setProjectsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminOrgUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Project assignment state
  const [userProjects, setUserProjects] = useState<UserProjectAssignment[]>([]);
  const [allProjects, setAllProjects] = useState<AdminOrgProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [formData, setFormData] = useState({
    name: "", phone: "", password: "", role: "PRORAB", telegramId: "", allowedRoles: [] as string[], orgRoleId: "",
  });

  const fetchOrg = useCallback(async () => {
    if (!orgId) return;
    try {
      const data = await adminApi.getOrganization(orgId);
      setOrgInfo(data);
    } catch {}
  }, [orgId]);

  const fetchUsers = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    setError("");
    try {
      const result = await adminApi.getOrgUsers(orgId, { page, limit: 20, search: searchQuery || undefined });
      setUsers(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  }, [orgId, page, searchQuery]);

  const fetchOrgRoles = useCallback(async () => {
    if (!orgId) return;
    try {
      const roles = await adminApi.getOrgRoles(orgId);
      setOrgRoles(roles);
    } catch {}
  }, [orgId]);

  useEffect(() => { fetchOrg(); fetchOrgRoles(); }, [fetchOrg, fetchOrgRoles]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const resetForm = () => {
    setFormData({ name: "", phone: "", password: "", role: "PRORAB", telegramId: "", allowedRoles: [], orgRoleId: "" });
    setFormError("");
    setShowPassword(false);
  };

  const openAddDialog = () => { resetForm(); setAddDialogOpen(true); };

  const openEditDialog = (u: AdminOrgUser) => {
    setSelectedUser(u);
    setFormData({
      name: u.name,
      phone: (u.phone || "").replace("+998", ""),
      password: "",
      role: u.role,
      telegramId: u.telegramId || "",
      allowedRoles: u.allowedRoles || [],
      orgRoleId: u.orgRoleId || "",
    });
    setFormError("");
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (u: AdminOrgUser) => { setSelectedUser(u); setDeleteDialogOpen(true); };

  const openProjectsDialog = async (u: AdminOrgUser) => {
    setSelectedUser(u);
    setProjectsDialogOpen(true);
    setSelectedProjectId("");
    if (!orgId) return;
    try {
      const [projects, assigned] = await Promise.all([
        adminApi.getOrgProjects(orgId, { limit: 100 }),
        adminApi.getUserProjects(orgId, u.id),
      ]);
      setAllProjects(projects.data);
      setUserProjects(assigned);
    } catch {}
  };

  const handleAdd = async () => {
    if (!orgId || !formData.name.trim() || !formData.phone.trim() || !formData.password.trim()) {
      setFormError("Ism, telefon va parol kiritilishi kerak");
      return;
    }
    if (formData.password.length < 6) {
      setFormError("Parol kamida 6 ta belgi bo'lishi kerak");
      return;
    }
    setIsSubmitting(true);
    setFormError("");
    try {
      await adminApi.createOrgUser(orgId, {
        name: formData.name,
        phone: "+998" + formData.phone.replace(/\s/g, ""),
        password: formData.password,
        role: formData.role,
        telegramId: formData.telegramId || undefined,
        allowedRoles: formData.allowedRoles.length > 0 ? formData.allowedRoles : undefined,
        orgRoleId: formData.orgRoleId || undefined,
      });
      setAddDialogOpen(false);
      fetchUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!orgId || !selectedUser) return;
    setIsSubmitting(true);
    setFormError("");
    try {
      const data: Record<string, string | boolean | string[] | undefined> = {};
      if (formData.name.trim()) data.name = formData.name;
      if (formData.phone.trim()) data.phone = "+998" + formData.phone.replace(/\s/g, "");
      if (formData.password.trim()) data.password = formData.password;
      if (formData.role) data.role = formData.role;
      if (formData.telegramId !== undefined) data.telegramId = formData.telegramId || undefined;
      if (formData.orgRoleId) data.orgRoleId = formData.orgRoleId;
      // Always send allowedRoles (empty array clears them)
      data.allowedRoles = formData.allowedRoles;
      await adminApi.updateOrgUser(orgId, selectedUser.id, data);
      setEditDialogOpen(false);
      fetchUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!orgId || !selectedUser) return;
    setIsSubmitting(true);
    try {
      await adminApi.deleteOrgUser(orgId, selectedUser.id);
      setDeleteDialogOpen(false);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "O'chirishda xatolik yuz berdi");
      setDeleteDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignProject = async () => {
    if (!orgId || !selectedUser || !selectedProjectId) return;
    try {
      await adminApi.assignUserToProject(orgId, selectedUser.id, selectedProjectId);
      const assigned = await adminApi.getUserProjects(orgId, selectedUser.id);
      setUserProjects(assigned);
      setSelectedProjectId("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Tayinlashda xatolik");
    }
  };

  const handleUnassignProject = async (projectId: string) => {
    if (!orgId || !selectedUser) return;
    try {
      await adminApi.unassignUserFromProject(orgId, selectedUser.id, projectId);
      const assigned = await adminApi.getUserProjects(orgId, selectedUser.id);
      setUserProjects(assigned);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Bekor qilishda xatolik");
    }
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 9);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
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
            <Users className="h-6 w-6" />
            {orgInfo?.name || "..."} — Xodimlar
          </h1>
          <p className="text-muted-foreground">Kompaniya xodimlarini boshqaring</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Xodim qo'shish
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Ism bo'yicha qidirish..." value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} className="pl-9 bg-muted/50 border-0" />
          </div>
          <Button variant="outline" size="icon" onClick={fetchUsers} disabled={isLoading}>
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
      ) : users.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Xodimlar topilmadi</h3>
          <Button onClick={openAddDialog}><Plus className="h-4 w-4 mr-2" />Birinchi xodimni qo'shing</Button>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ism</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Telegram ID</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.phone || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline">{u.role}</Badge>
                      {u.allowedRoles && u.allowedRoles.length > 1 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5">
                          +{u.allowedRoles.length - 1}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.telegramId || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? "default" : "secondary"}
                      className={u.isActive ? "bg-green-500/10 text-green-600" : ""}>
                      {u.isActive ? "Faol" : "Nofaol"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(u)}>
                          <Edit className="h-4 w-4 mr-2" />Tahrirlash
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openProjectsDialog(u)}>
                          <FolderOpen className="h-4 w-4 mr-2" />Loyihalar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openDeleteDialog(u)}>
                          <Trash2 className="h-4 w-4 mr-2" />O'chirish
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
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
            <DialogTitle>Yangi xodim</DialogTitle>
            <DialogDescription>Kompaniyaga yangi xodim qo'shing</DialogDescription>
          </DialogHeader>
          {formError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{formError}</div>}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ism *</Label>
              <Input placeholder="Xodim ismi" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Telefon raqam *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">+998</span>
                <Input className="pl-14" placeholder="__ ___ __ __" value={formData.phone}
                  onChange={(e) => setFormData(p => ({ ...p, phone: formatPhone(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Parol *</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="Kamida 6 belgi"
                  value={formData.password} onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))} className="pr-10" />
                <Button type="button" variant="ghost" size="icon"
                  className="absolute right-0 top-0 h-full w-10 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rol *</Label>
              <Select value={formData.orgRoleId} onValueChange={(v) => {
                const role = orgRoles.find(r => r.id === v);
                setFormData(p => ({ ...p, orgRoleId: v, role: role?.name || p.role }));
              }}>
                <SelectTrigger><SelectValue placeholder="Rolni tanlang..." /></SelectTrigger>
                <SelectContent>
                  {orgRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Telegram ID (ixtiyoriy)</Label>
              <Input placeholder="123456789" value={formData.telegramId}
                onChange={(e) => setFormData(p => ({ ...p, telegramId: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={isSubmitting}>Bekor qilish</Button>
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Qo'shilmoqda...</> : "Qo'shish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Xodimni tahrirlash</DialogTitle>
            <DialogDescription>Xodim ma'lumotlarini yangilang</DialogDescription>
          </DialogHeader>
          {formError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{formError}</div>}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ism</Label>
              <Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Telefon raqam</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">+998</span>
                <Input className="pl-14" value={formData.phone}
                  onChange={(e) => setFormData(p => ({ ...p, phone: formatPhone(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Yangi parol (ixtiyoriy)</Label>
              <Input type="password" placeholder="O'zgartirish uchun kiriting"
                value={formData.password} onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={formData.orgRoleId} onValueChange={(v) => {
                const role = orgRoles.find(r => r.id === v);
                setFormData(p => ({ ...p, orgRoleId: v, role: role?.name || p.role }));
              }}>
                <SelectTrigger><SelectValue placeholder="Rolni tanlang..." /></SelectTrigger>
                <SelectContent>
                  {orgRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Telegram ID</Label>
              <Input value={formData.telegramId} onChange={(e) => setFormData(p => ({ ...p, telegramId: e.target.value }))} />
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

      {/* Projects Assignment Dialog */}
      <Dialog open={projectsDialogOpen} onOpenChange={setProjectsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedUser?.name} — Loyihalar</DialogTitle>
            <DialogDescription>Foydalanuvchiga loyihalarni tayinlang</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Loyiha tanlang" /></SelectTrigger>
                <SelectContent>
                  {allProjects
                    .filter((p) => !userProjects.some((up) => up.projectId === p.id))
                    .map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={handleAssignProject} disabled={!selectedProjectId}>Tayinlash</Button>
            </div>
            {userProjects.length > 0 ? (
              <div className="space-y-2">
                {userProjects.map((up) => (
                  <div key={up.projectId} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">{up.projectName}</span>
                    <Button variant="ghost" size="sm" className="text-destructive h-7"
                      onClick={() => handleUnassignProject(up.projectId)}>
                      Olib tashlash
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Loyihalar tayinlanmagan</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xodimni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Haqiqatan ham <strong>{selectedUser?.name}</strong> xodimini o'chirmoqchimisiz?
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
