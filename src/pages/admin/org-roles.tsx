import { useEffect, useState, useCallback } from "react";
import {
  Building2, Users, Plus, Search, RefreshCw, Loader2, MoreVertical,
  Edit, Trash2, AlertCircle, Shield, ChevronDown, ChevronRight,
  FileKey2, ArrowRightLeft, Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  adminApi,
  AdminOrgRole,
  AdminOrganization,
  AdminPermissionGroup,
  AdminPermission,
  AdminRoleTemplate,
} from "@/lib/api/admin";

export default function OrgRolesPage() {
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [roles, setRoles] = useState<AdminOrgRole[]>([]);
  const [templates, setTemplates] = useState<AdminRoleTemplate[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<AdminPermissionGroup[]>([]);
  const [allPermissions, setAllPermissions] = useState<AdminPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [error, setError] = useState("");

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [applyTemplateDialogOpen, setApplyTemplateDialogOpen] = useState(false);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AdminOrgRole | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Permissions management state
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());
  const [selectedAuthorityIds, setSelectedAuthorityIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [permSaving, setPermSaving] = useState(false);

  // Apply template state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // Reassign state
  const [targetRoleId, setTargetRoleId] = useState<string>("");
  const [reassignResult, setReassignResult] = useState<string>("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  // Load initial data (organizations, templates, permission groups)
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [orgsData, templatesData, groupsData, permsData] = await Promise.all([
        adminApi.getOrganizations({ limit: 100 }),
        adminApi.getRoleTemplates(),
        adminApi.getPermissionGroups(),
        adminApi.getPermissions(),
      ]);
      setOrganizations(orgsData?.data || []);
      setTemplates(templatesData || []);
      setPermissionGroups(groupsData || []);
      setAllPermissions(permsData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Load roles when org changes
  const fetchRoles = useCallback(async () => {
    if (!selectedOrgId) {
      setRoles([]);
      return;
    }
    setIsLoadingRoles(true);
    setError("");
    try {
      const rolesData = await adminApi.getOrgRoles(selectedOrgId);
      setRoles(rolesData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rollarni yuklashda xatolik");
    } finally {
      setIsLoadingRoles(false);
    }
  }, [selectedOrgId]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const resetForm = () => {
    setFormData({ name: "", description: "" });
    setFormError("");
  };

  const openAddDialog = () => {
    resetForm();
    setAddDialogOpen(true);
  };

  const openEditDialog = (role: AdminOrgRole) => {
    setSelectedRole(role);
    setFormData({ name: role.name, description: role.description || "" });
    setFormError("");
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (role: AdminOrgRole) => {
    setSelectedRole(role);
    setDeleteDialogOpen(true);
  };

  const openManageDialog = (role: AdminOrgRole) => {
    setSelectedRole(role);
    setSelectedPermIds(new Set((role.permissions || []).map((p) => p.permissionId || p.permission?.id || p.id)));
    setSelectedAuthorityIds(new Set(role.canManageRoleIds || []));
    setExpandedGroups(new Set((permissionGroups || []).map((g) => g.id)));
    setManageDialogOpen(true);
  };

  const openApplyTemplateDialog = () => {
    setSelectedTemplateId("");
    setApplyTemplateDialogOpen(true);
  };

  const openReassignDialog = (role: AdminOrgRole) => {
    setSelectedRole(role);
    setTargetRoleId("");
    setReassignResult("");
    setReassignDialogOpen(true);
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      setFormError("Rol nomini kiriting");
      return;
    }
    setIsSubmitting(true);
    setFormError("");
    try {
      await adminApi.createOrgRole(selectedOrgId, {
        name: formData.name,
        description: formData.description || undefined,
      });
      setAddDialogOpen(false);
      fetchRoles();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedRole) return;
    setIsSubmitting(true);
    setFormError("");
    try {
      await adminApi.updateOrgRole(selectedOrgId, selectedRole.id, {
        name: formData.name || undefined,
        description: formData.description || undefined,
      });
      setEditDialogOpen(false);
      fetchRoles();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRole) return;
    setIsSubmitting(true);
    try {
      await adminApi.deleteOrgRole(selectedOrgId, selectedRole.id);
      setDeleteDialogOpen(false);
      fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "O'chirishda xatolik yuz berdi");
      setDeleteDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (role: AdminOrgRole) => {
    try {
      await adminApi.updateOrgRole(selectedOrgId, role.id, { isActive: !role.isActive });
      fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setPermSaving(true);
    try {
      await adminApi.updateOrgRolePermissions(selectedOrgId, selectedRole.id, Array.from(selectedPermIds));
      await adminApi.updateOrgRoleAuthority(selectedOrgId, selectedRole.id, Array.from(selectedAuthorityIds));
      setManageDialogOpen(false);
      fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saqlashda xatolik");
    } finally {
      setPermSaving(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplateId) return;
    setIsSubmitting(true);
    try {
      await adminApi.applyTemplateToOrg(selectedOrgId, selectedTemplateId);
      setApplyTemplateDialogOpen(false);
      fetchRoles();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Shablonni qo'llashda xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReassign = async () => {
    if (!selectedRole || !targetRoleId) return;
    setIsSubmitting(true);
    setReassignResult("");
    try {
      const result = await adminApi.reassignOrgRoleUsers(selectedOrgId, selectedRole.id, targetRoleId);
      setReassignResult(`Muvaffaqiyatli: ${result.reassigned} ta foydalanuvchi ko'chirildi`);
      fetchRoles();
    } catch (err) {
      setReassignResult(err instanceof Error ? err.message : "Ko'chirishda xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const togglePermission = (permId: string) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const toggleGroupAll = (group: AdminPermissionGroup) => {
    const groupPermIds = (group.permissions || []).map((p) => p.permissionId || p.permission?.id || p.id);
    const allSelected = groupPermIds.every((id) => selectedPermIds.has(id));
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        groupPermIds.forEach((id) => next.delete(id));
      } else {
        groupPermIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleAuthority = (roleId: string) => {
    setSelectedAuthorityIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  };

  const filteredRoles = roles.filter(
    (r) =>
      !searchQuery ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId);

  // Permissions not in any group
  const groupedPermIds = new Set((permissionGroups || []).flatMap((g) => (g.permissions || []).map((p) => p.permissionId || p.permission?.id || p.id)));
  const ungroupedPermissions = (allPermissions || []).filter((p) => !groupedPermIds.has(p.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6" />
            Tashkilot rollari
          </h1>
          <p className="text-muted-foreground">Tashkilotlar uchun rollarni boshqaring</p>
        </div>
        {selectedOrgId && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={openApplyTemplateDialog}>
              <FileKey2 className="h-4 w-4 mr-2" />
              Shablon qo'llash
            </Button>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Rol qo'shish
            </Button>
          </div>
        )}
      </div>

      {/* Organization Selector */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Label className="text-sm mb-2 block">Tashkilotni tanlang</Label>
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tashkilotni tanlang..." />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {org.name}
                      {!org.isActive && (
                        <span className="text-xs text-muted-foreground">(nofaol)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedOrgId && (
            <>
              <div className="relative flex-1">
                <Label className="text-sm mb-2 block">Qidirish</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Rol nomi bo'yicha qidirish..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-muted/50 border-0"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <Button variant="outline" size="icon" onClick={fetchRoles} disabled={isLoadingRoles}>
                  <RefreshCw className={`h-4 w-4 ${isLoadingRoles ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </>
          )}
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
      ) : !selectedOrgId ? (
        <Card className="p-8 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Tashkilotni tanlang</h3>
          <p className="text-muted-foreground">Rollarni ko'rish uchun yuqoridan tashkilotni tanlang</p>
        </Card>
      ) : isLoadingRoles ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredRoles.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Rollar topilmadi</h3>
          <p className="text-muted-foreground mb-4">
            {selectedOrg?.name} uchun hozircha rollar yo'q
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={openApplyTemplateDialog}>
              <FileKey2 className="h-4 w-4 mr-2" />
              Shablondan yaratish
            </Button>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Yangi rol qo'shish
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomi</TableHead>
                <TableHead>Shablon</TableHead>
                <TableHead>Foydalanuvchilar</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead>Ruxsatlar</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.map((role) => (
                <TableRow
                  key={role.id}
                  className="cursor-pointer"
                  onClick={() => openManageDialog(role)}
                >
                  <TableCell>
                    <div>
                      <span className="font-medium">{role.name}</span>
                      {role.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {role.templateName ? (
                      <Badge variant="outline" className="text-xs">
                        <FileKey2 className="h-3 w-3 mr-1" />
                        {role.templateName}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      <Users className="h-3 w-3 mr-1" />
                      {role.userCount}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Switch
                        checked={role.isActive}
                        onCheckedChange={() => handleToggleActive(role)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {role.isActive ? "Faol" : "Nofaol"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{(role.permissions || []).length} ta</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(role); }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Tahrirlash
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openManageDialog(role); }}>
                          <Shield className="h-4 w-4 mr-2" />
                          Ruxsatlar va vakolat
                        </DropdownMenuItem>
                        {role.userCount > 0 && (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openReassignDialog(role); }}>
                            <ArrowRightLeft className="h-4 w-4 mr-2" />
                            Foydalanuvchilarni ko'chirish
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          disabled={role.userCount > 0}
                          onClick={(e) => { e.stopPropagation(); openDeleteDialog(role); }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          O'chirish
                          {role.userCount > 0 && (
                            <span className="text-xs ml-1">(foydalanuvchilar bor)</span>
                          )}
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

      {/* Add Role Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi rol</DialogTitle>
            <DialogDescription>{selectedOrg?.name} uchun yangi rol yarating</DialogDescription>
          </DialogHeader>
          {formError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{formError}</div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nomi *</Label>
              <Input
                placeholder="Rol nomi"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tavsif</Label>
              <Input
                placeholder="Qisqacha tavsif"
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={isSubmitting}>
              Bekor qilish
            </Button>
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Qo'shilmoqda...
                </>
              ) : (
                "Qo'shish"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rolni tahrirlash</DialogTitle>
            <DialogDescription>Rol ma'lumotlarini yangilang</DialogDescription>
          </DialogHeader>
          {formError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{formError}</div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nomi</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tavsif</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSubmitting}>
              Bekor qilish
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
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

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rolni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Haqiqatan ham <strong>{selectedRole?.name}</strong> rolini o'chirmoqchimisiz?
              {selectedRole && selectedRole.userCount > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  Bu rolga {selectedRole.userCount} ta foydalanuvchi tayinlangan. Avval ularni boshqa rolga ko'chiring.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting || (selectedRole?.userCount ?? 0) > 0}
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

      {/* Manage Permissions & Authority Dialog */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {selectedRole?.name} — Sozlamalar
            </DialogTitle>
            <DialogDescription>
              Ruxsatlar va vakolat darajasini boshqaring
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="permissions">
            <TabsList>
              <TabsTrigger value="permissions">
                <Shield className="h-4 w-4 mr-1" />
                Ruxsatlar ({selectedPermIds.size})
              </TabsTrigger>
              <TabsTrigger value="authority">
                <Users className="h-4 w-4 mr-1" />
                Vakolat ({selectedAuthorityIds.size})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="permissions">
              <div className="overflow-y-auto max-h-[50vh] space-y-2 pr-2">
                {(permissionGroups || [])
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((group) => {
                    const isExpanded = expandedGroups.has(group.id);
                    const groupPermIdsList = (group.permissions || []).map((p) => p.permissionId || p.permission?.id || p.id);
                    const selectedCount = groupPermIdsList.filter((id) => selectedPermIds.has(id)).length;
                    const allSelected = groupPermIdsList.length > 0 && selectedCount === groupPermIdsList.length;

                    return (
                      <div key={group.id} className="border rounded-lg">
                        <div
                          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => toggleGroupExpand(group.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={() => toggleGroupAll(group)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <span className="font-medium text-sm">{group.name}</span>
                            {group.description && (
                              <span className="text-xs text-muted-foreground ml-2">{group.description}</span>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {selectedCount}/{groupPermIdsList.length}
                          </Badge>
                        </div>
                        {isExpanded && (group.permissions || []).length > 0 && (
                          <div className="border-t px-3 pb-3 pt-2 space-y-1">
                            {(group.permissions || []).map((perm) => {
                              const permId = perm.permissionId || perm.permission?.id || perm.id;
                              return (
                              <div
                                key={permId}
                                className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/30 transition-colors"
                              >
                                <Checkbox
                                  checked={selectedPermIds.has(permId)}
                                  onCheckedChange={() => togglePermission(permId)}
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm">{perm.permission?.name || perm.name}</span>
                                  <Badge variant="outline" className="text-xs font-mono ml-2">
                                    {perm.permission?.key || perm.key}
                                  </Badge>
                                  {(perm.permission?.description || perm.description) && (
                                    <p className="text-xs text-muted-foreground">{perm.permission?.description || perm.description}</p>
                                  )}
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                {/* Ungrouped permissions */}
                {ungroupedPermissions.length > 0 && (
                  <div className="border rounded-lg">
                    <div className="p-3">
                      <span className="font-medium text-sm text-muted-foreground">Guruhsiz ruxsatlar</span>
                    </div>
                    <div className="border-t px-3 pb-3 pt-2 space-y-1">
                      {ungroupedPermissions.map((perm) => (
                        <div
                          key={perm.id}
                          className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/30 transition-colors"
                        >
                          <Checkbox
                            checked={selectedPermIds.has(perm.id)}
                            onCheckedChange={() => togglePermission(perm.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm">{perm.name}</span>
                            <Badge variant="outline" className="text-xs font-mono ml-2">
                              {perm.key}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="authority">
              <div className="overflow-y-auto max-h-[50vh] space-y-1 pr-2">
                <p className="text-sm text-muted-foreground mb-3">
                  Bu rol qaysi boshqa rollarni boshqarishi mumkinligini tanlang:
                </p>
                {roles
                  .filter((r) => r.id !== selectedRole?.id)
                  .map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedAuthorityIds.has(r.id)}
                        onCheckedChange={() => toggleAuthority(r.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{r.name}</span>
                          <Badge variant={r.isActive ? "default" : "secondary"} className="text-xs">
                            {r.isActive ? "Faol" : "Nofaol"}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {r.userCount}
                          </Badge>
                        </div>
                        {r.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                {roles.filter((r) => r.id !== selectedRole?.id).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Boshqa rollar mavjud emas
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageDialogOpen(false)} disabled={permSaving}>
              Bekor qilish
            </Button>
            <Button onClick={handleSavePermissions} disabled={permSaving}>
              {permSaving ? (
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

      {/* Apply Template Dialog */}
      <Dialog open={applyTemplateDialogOpen} onOpenChange={setApplyTemplateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileKey2 className="h-5 w-5" />
              Shablon qo'llash
            </DialogTitle>
            <DialogDescription>
              {selectedOrg?.name} uchun shablondan yangi rol yarating
            </DialogDescription>
          </DialogHeader>
          {formError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{formError}</div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Shablonni tanlang</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Shablon tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  {templates
                    .filter((t) => t.isActive)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <div className="flex items-center gap-2">
                          {t.name}
                          {t.isSystem && (
                            <Badge className="bg-blue-500/10 text-blue-600 text-xs">Tizimli</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            ({(t.permissions || []).length} ruxsat)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyTemplateDialogOpen(false)} disabled={isSubmitting}>
              Bekor qilish
            </Button>
            <Button onClick={handleApplyTemplate} disabled={isSubmitting || !selectedTemplateId}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Qo'llanmoqda...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Qo'llash
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Users Dialog */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Foydalanuvchilarni ko'chirish
            </DialogTitle>
            <DialogDescription>
              <strong>{selectedRole?.name}</strong> rolidan ({selectedRole?.userCount} foydalanuvchi) boshqa rolga ko'chiring
            </DialogDescription>
          </DialogHeader>
          {reassignResult && (
            <div
              className={`p-3 rounded-lg text-sm ${
                reassignResult.includes("Muvaffaqiyatli")
                  ? "bg-green-500/10 text-green-600"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {reassignResult}
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Maqsad rolni tanlang</Label>
              <Select value={targetRoleId} onValueChange={setTargetRoleId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Rolni tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  {roles
                    .filter((r) => r.id !== selectedRole?.id && r.isActive)
                    .map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        <div className="flex items-center gap-2">
                          {r.name}
                          <span className="text-xs text-muted-foreground">
                            ({r.userCount} foydalanuvchi)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignDialogOpen(false)} disabled={isSubmitting}>
              Yopish
            </Button>
            <Button onClick={handleReassign} disabled={isSubmitting || !targetRoleId}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ko'chirilmoqda...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Ko'chirish
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
