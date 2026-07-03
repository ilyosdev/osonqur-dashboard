import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FolderOpen, Plus, Search, RefreshCw, Loader2, MoreVertical,
  Edit, Trash2, AlertCircle, ArrowLeft, MapPin, Users, FileSpreadsheet, UserPlus, Eye, EyeOff,
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
import { adminApi, AdminOrgProject, AdminOrganization, AdminOrgUser, AdminOrgRole } from "@/lib/api/admin";
import { TablePagination } from "@/components/shared/table-pagination";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uploadApi } from "@/lib/api/upload";

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
    name: "", address: "", budget: "", status: "ACTIVE", startDate: "", endDate: "",
  });
  const [smetaFile, setSmetaFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState("");

  const [users, setUsers] = useState<AdminOrgUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const USER_PAGE_SIZE = 10;
  const [orgRoles, setOrgRoles] = useState<AdminOrgRole[]>([]);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminOrgUser | null>(null);
  const [isUserSubmitting, setIsUserSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userFormData, setUserFormData] = useState({ name: "", phone: "", password: "", role: "", telegramId: "", allowedRoles: [] as string[], orgRoleId: "" });
  const [userFormError, setUserFormError] = useState("");

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

  const fetchUsers = useCallback(async () => {
    if (!orgId) return;
    try {
      const result = await adminApi.getOrgUsers(orgId, { page: 1, limit: 100 });
      setUsers(result.data);
    } catch {}
  }, [orgId]);

  const fetchOrgRoles = useCallback(async () => {
    if (!orgId) return;
    try { setOrgRoles(await adminApi.getOrgRoles(orgId)); } catch {}
  }, [orgId]);

  const openEditUserDialog = (u: AdminOrgUser) => {
    setSelectedUser(u);
    setUserFormData({ name: u.name, phone: (u.phone || "").replace("+998", ""), password: "", role: u.role, telegramId: u.telegramId || "", allowedRoles: u.allowedRoles || [], orgRoleId: u.orgRoleId || "" });
    setUserFormError("");
    setShowPassword(false);
    setEditUserDialogOpen(true);
  };

  const openDeleteUserDialog = (u: AdminOrgUser) => { setSelectedUser(u); setDeleteUserDialogOpen(true); };

  const handleEditUser = async () => {
    if (!orgId || !selectedUser) return;
    setIsUserSubmitting(true);
    setUserFormError("");
    try {
      const data: Record<string, unknown> = {};
      if (userFormData.name.trim()) data.name = userFormData.name;
      if (userFormData.phone.trim()) data.phone = "+998" + userFormData.phone.replace(/\s/g, "");
      if (userFormData.password.trim()) data.password = userFormData.password;
      data.telegramId = userFormData.telegramId.trim() || null;
      if (userFormData.orgRoleId) { data.orgRoleId = userFormData.orgRoleId; data.role = userFormData.role; }
      data.allowedRoles = userFormData.allowedRoles;
      await adminApi.updateOrgUser(orgId, selectedUser.id, data);
      setEditUserDialogOpen(false);
      fetchUsers();
    } catch (err) {
      setUserFormError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setIsUserSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!orgId || !selectedUser) return;
    setIsUserSubmitting(true);
    try {
      await adminApi.deleteOrgUser(orgId, selectedUser.id);
      setDeleteUserDialogOpen(false);
      fetchUsers();
    } catch {} finally {
      setIsUserSubmitting(false);
    }
  };

  const formatPhone = (v: string) => v.replace(/\D/g, "").slice(0, 9);

  useEffect(() => { fetchOrg(); fetchOrgRoles(); }, [fetchOrg, fetchOrgRoles]);
  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const resetForm = () => {
    setFormData({ name: "", address: "", budget: "", status: "ACTIVE", startDate: "", endDate: "" });
    setFormError("");
    setSmetaFile(null);
    setUploadProgress("");
  };

  const openAddDialog = () => { resetForm(); setAddDialogOpen(true); };

  const openEditDialog = (p: AdminOrgProject) => {
    setSelectedProject(p);
    setFormData({
      name: p.name,
      address: p.address || "",
      budget: p.budget?.toString() || "",
      status: p.status || "PLANNING",
      startDate: p.startDate || "",
      endDate: p.endDate || "",
    });
    setFormError("");
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (p: AdminOrgProject) => { setSelectedProject(p); setDeleteDialogOpen(true); };

  const handleAdd = async () => {
    if (!orgId || !formData.name.trim()) { setFormError("Loyiha nomi kiritilishi kerak"); return; }
    setIsSubmitting(true);
    setFormError("");
    setUploadProgress("");
    try {
      // 1. Create the project
      setUploadProgress("Loyiha yaratilmoqda...");
      const project = await adminApi.createOrgProject(orgId, {
        name: formData.name,
        address: formData.address || undefined,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
      });

      // 2. If smeta file was provided, create smeta and import items
      if (smetaFile && project?.id) {
        try {
          setUploadProgress("Smeta yaratilmoqda...");
          const smeta = await adminApi.createProjectSmeta(orgId, project.id, {
            name: smetaFile.name.replace(/\.(xlsx|xls|csv)$/i, ''),
            type: 'CONSTRUCTION',
          });

          setUploadProgress("Smeta fayldan yuklanmoqda...");
          await uploadApi.directImport(smeta.id, smetaFile, 'auto');
          setUploadProgress("");
        } catch (uploadErr) {
          // Project created successfully but smeta upload failed - don't block
          console.error("Smeta upload failed:", uploadErr);
          setFormError("Loyiha yaratildi, lekin smeta yuklanmadi: " + (uploadErr instanceof Error ? uploadErr.message : "Xatolik"));
          fetchProjects();
          setIsSubmitting(false);
          return;
        }
      }

      setAddDialogOpen(false);
      fetchProjects();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setIsSubmitting(false);
      setUploadProgress("");
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
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        status: formData.status || undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
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



  const filteredUsers = users.filter(u => !userSearch.trim() || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.phone?.includes(userSearch));
  const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / USER_PAGE_SIZE));
  const pagedUsers = filteredUsers.slice((userPage - 1) * USER_PAGE_SIZE, userPage * USER_PAGE_SIZE);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="rounded-[10px] bg-white border border-[#dbe7f3] shadow-none hover:bg-[#f0f7ff] h-9 w-9">
          <Link to="/admin/organizations"><ArrowLeft className="h-4 w-4 text-[#185fa5]" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-[22px] font-bold text-[#0c447c] flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-[#378add]" />
            {orgInfo?.name || "..."}
          </h1>
          <p className="text-[13px] text-[#64748b]">Kompaniya loyihalari va xodimlari</p>
        </div>
      </div>

      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList className="w-full bg-white border border-[#dbe7f3] rounded-[10px] p-1 gap-1 shadow-none">
          <TabsTrigger value="projects" className="flex-1 flex items-center justify-center gap-1.5 rounded-[8px] text-[13px] data-[state=active]:bg-[#f0f7ff] data-[state=active]:text-[#185fa5] data-[state=active]:shadow-none text-[#64748b]">
            <FolderOpen className="h-3.5 w-3.5" />
            Loyihalar ({total})
          </TabsTrigger>
          <TabsTrigger value="users" className="flex-1 flex items-center justify-center gap-1.5 rounded-[8px] text-[13px] data-[state=active]:bg-[#f0f7ff] data-[state=active]:text-[#185fa5] data-[state=active]:shadow-none text-[#64748b]">
            <Users className="h-3.5 w-3.5" />
            Xodimlar ({users.length})
          </TabsTrigger>
        </TabsList>

        {/* Loyihalar tab */}
        <TabsContent value="projects">
          <Card className="overflow-hidden rounded-[12px] border border-[#dbe7f3] py-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#dbe7f3] bg-white px-5 py-3">
              <CardTitle className="flex items-center gap-2 text-[14px] font-semibold text-[#0c447c]">
                <FolderOpen className="h-4 w-4 text-[#185fa5]" /> Loyihalar ro'yxati
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[#378add]" />
                  <Input placeholder="Qidirish..." value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    className="h-9 w-[180px] rounded-[8px] border border-[#dbe7f3] bg-white pl-9 text-[13px] text-[#0c447c] shadow-none placeholder:text-[#94a3b8]" />
                </div>
                <Button variant="outline" size="icon" onClick={fetchProjects} disabled={isLoading} className="h-9 w-9 rounded-[8px] border-[#dbe7f3] text-[#378add] shadow-none hover:bg-[#f0f7ff]">
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </Button>
                <Button onClick={openAddDialog} className="h-9 rounded-[8px] bg-[#185fa5] px-3 text-[13px] font-medium text-white hover:bg-[#144f8f]">
                  <Plus className="h-4 w-4 mr-1" /> Loyiha qo'shish
                </Button>
              </div>
            </CardHeader>
            <div className="divide-y divide-[#eef2f7]">
              {isLoading ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#378add]" /></div>
              ) : projects.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f0f7ff]">
                    <FolderOpen className="h-6 w-6 text-[#378add]" />
                  </div>
                  <p className="text-[14px] font-semibold text-[#0c447c] mb-1">Loyihalar topilmadi</p>
                  <p className="text-[13px] text-[#94a3b8] mb-4">Hali loyiha qo'shilmagan</p>
                  <Button onClick={openAddDialog} className="h-10 rounded-[8px] bg-[#185fa5] px-5 text-[13px] text-white hover:bg-[#144f8f]">
                    <Plus className="h-4 w-4 mr-1.5" /> Loyiha qo'shish
                  </Button>
                </div>
              ) : projects.map((project) => (
                <Link key={project.id} to={`/admin/organizations/${orgId}/projects/${project.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[#f8fbff] transition-colors" style={{ textDecoration: "none", display: "flex" }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#f0f7ff]">
                      <FolderOpen className="h-4 w-4 text-[#185fa5]" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[14px] font-semibold text-[#0c447c] truncate block">{project.name}</span>
                      <div className="flex items-center gap-3 mt-0.5 text-[12px] text-[#94a3b8]">
                        {project.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{project.address}</span>}
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{project.userCount || 0} xodim</span>
                        <span className="flex items-center gap-1"><FileSpreadsheet className="h-3 w-3" />{project.smetaCount || 0} smeta</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.preventDefault()}>
                    {getStatusBadge(project.status)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#94a3b8] hover:bg-[#f0f7ff]"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(project)}><Edit className="h-4 w-4 mr-2" />Tahrirlash</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openDeleteDialog(project)}><Trash2 className="h-4 w-4 mr-2" />O'chirish</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Link>
              ))}
            </div>
            {totalPages > 1 && <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} summary={`Sahifa ${page} / ${totalPages} (${total} ta)`} />}
          </Card>
        </TabsContent>

        {/* Xodimlar tab */}
        <TabsContent value="users">
          <Card className="overflow-hidden rounded-[12px] border border-[#dbe7f3] py-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#dbe7f3] bg-white px-5 py-3 md:px-6">
              <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle className="flex items-center gap-2 text-[14px] font-semibold tracking-tight text-[#0c447c]">
                  <Users className="h-4 w-4 text-[#185fa5]" /> Xodimlar ro'yxati
                </CardTitle>
                <div className="flex w-full flex-col gap-3 lg:max-w-2xl lg:flex-row lg:items-center lg:justify-end">
                  <div className="relative min-w-[200px] flex-1 lg:max-w-xs">
                    <Search className="absolute left-3 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-[#378add]" />
                    <Input placeholder="Xodim qidirish..." value={userSearch} onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                      spellCheck={false}
                      className="h-10 rounded-[8px] border border-[#dbe7f3] bg-white pl-9 text-[13px] text-[#0c447c] shadow-none placeholder:text-[#94a3b8]" />
                  </div>
                  <Button asChild className="h-10 rounded-[8px] bg-[#185fa5] px-4 text-[13px] font-medium text-white hover:bg-[#144f8f]">
                    <Link to={`/admin/organizations/${orgId}/users`}>
                      <UserPlus className="h-4 w-4 mr-1.5" /> Xodim biriktirish
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {pagedUsers.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f0f7ff]">
                    <Users className="h-6 w-6 text-[#378add]" />
                  </div>
                  <p className="text-[14px] font-semibold text-[#0c447c] mb-1">Xodimlar topilmadi</p>
                  <p className="text-[13px] text-[#94a3b8]">Bu kompaniyaga hali xodimlar qo'shilmagan</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white hover:bg-white">
                      <TableHead className="h-12 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Xodim</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Telefon</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Rol</TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#378add]">Holat</TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedUsers.map((user) => (
                      <TableRow key={user.id} className="h-20 border-b border-[#eef2f7] last:border-b-0 hover:bg-[#f8fafc]">
                        <TableCell className="py-4">
                          <div className="font-medium text-[#0c447c]">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.role}</div>
                        </TableCell>
                        <TableCell className="py-4 text-sm text-muted-foreground">{user.phone || "—"}</TableCell>
                        <TableCell className="py-4">
                          <Badge className="rounded-full border border-[#cfe2ff] bg-[#f0f7ff] px-[10px] py-1 text-[11px] font-medium text-[#185fa5] shadow-none">
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge className={`rounded-full px-[10px] py-1 text-[11px] font-medium shadow-none ${user.isActive ? "border border-[#c8efd8] bg-[#ecfbf1] text-[#1d9e75]" : "border border-[#dbe7f3] bg-[#f8fbff] text-[#64748b]"}`}>
                            {user.isActive ? "Faol" : "Nofaol"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#94a3b8] hover:text-[#185fa5] hover:bg-[#f0f7ff]" onClick={() => openEditUserDialog(user)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#94a3b8] hover:text-[#ef4444] hover:bg-[#fff0f0]" onClick={() => openDeleteUserDialog(user)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {userTotalPages > 1 && <TablePagination page={userPage} totalPages={userTotalPages} onPageChange={setUserPage} summary={`Sahifa ${userPage} / ${userTotalPages} (${filteredUsers.length} ta)`} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Xodimni tahrirlash</DialogTitle>
            <DialogDescription>Xodim ma'lumotlarini yangilang</DialogDescription>
          </DialogHeader>
          {userFormError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{userFormError}</div>}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ism</Label>
              <Input value={userFormData.name} onChange={(e) => setUserFormData(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Telefon raqam</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">+998</span>
                <Input className="pl-14" value={userFormData.phone} onChange={(e) => setUserFormData(p => ({ ...p, phone: formatPhone(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Yangi parol (ixtiyoriy)</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="O'zgartirish uchun kiriting"
                  value={userFormData.password} onChange={(e) => setUserFormData(p => ({ ...p, password: e.target.value }))} className="pr-10" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full w-10 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={userFormData.orgRoleId} onValueChange={(v) => {
                const role = orgRoles.find(r => r.id === v);
                setUserFormData(p => ({ ...p, orgRoleId: v, role: role?.name || p.role }));
              }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Rolni tanlang..." /></SelectTrigger>
                <SelectContent>
                  {orgRoles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Telegram ID (ixtiyoriy)</Label>
              <Input placeholder="123456789" value={userFormData.telegramId} onChange={(e) => setUserFormData(p => ({ ...p, telegramId: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserDialogOpen(false)} disabled={isUserSubmitting}>Bekor qilish</Button>
            <Button onClick={handleEditUser} disabled={isUserSubmitting}>
              {isUserSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saqlanmoqda...</> : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xodimni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Haqiqatan ham <strong>{selectedUser?.name}</strong> xodimini o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUserSubmitting}>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={isUserSubmitting} className="bg-destructive hover:bg-destructive/90">
              {isUserSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              O'chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <div className="space-y-2">
              <Label>Byudjet (so'm)</Label>
              <Input type="number" placeholder="1000000" value={formData.budget} onChange={(e) => setFormData(p => ({ ...p, budget: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Boshlanish sanasi</Label>
                <Input type="date" value={formData.startDate} onChange={(e) => setFormData(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Tugash sanasi</Label>
                <Input type="date" value={formData.endDate} onChange={(e) => setFormData(p => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2 border-t pt-4">
              <Label className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Smeta fayl (ixtiyoriy)
              </Label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setSmetaFile(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
              {smetaFile && (
                <p className="text-xs text-muted-foreground">
                  {smetaFile.name} ({(smetaFile.size / 1024).toFixed(0)} KB)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={isSubmitting}>Bekor qilish</Button>
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{uploadProgress || "Yaratilmoqda..."}</> : "Yaratish"}
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
            <div className="space-y-2">
              <Label>Byudjet (so'm)</Label>
              <Input type="number" value={formData.budget} onChange={(e) => setFormData(p => ({ ...p, budget: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Boshlanish sanasi</Label>
                <Input type="date" value={formData.startDate} onChange={(e) => setFormData(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Tugash sanasi</Label>
                <Input type="date" value={formData.endDate} onChange={(e) => setFormData(p => ({ ...p, endDate: e.target.value }))} />
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
