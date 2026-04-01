import { useEffect, useState, useCallback } from "react";
import {
  FileKey2, Plus, Search, RefreshCw, Loader2, MoreVertical,
  Edit, Trash2, AlertCircle, Shield, ChevronDown, ChevronRight,
  Users, Zap,
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
  AdminRoleTemplate,
  AdminPermissionGroup,
  AdminPermission,
  AdminOrganization,
} from "@/lib/api/admin";

export default function RoleTemplatesPage() {
  const [templates, setTemplates] = useState<AdminRoleTemplate[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<AdminPermissionGroup[]>([]);
  const [allPermissions, setAllPermissions] = useState<AdminPermission[]>([]);
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AdminRoleTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Permissions management state
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());
  const [selectedAuthorityIds, setSelectedAuthorityIds] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [permSaving, setPermSaving] = useState(false);

  // Sync state
  const [selectedOrgIds, setSelectedOrgIds] = useState<Set<string>>(new Set());
  const [syncResult, setSyncResult] = useState<string>("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [templatesData, groupsData, permsData] = await Promise.all([
        adminApi.getRoleTemplates(),
        adminApi.getPermissionGroups(),
        adminApi.getPermissions(),
      ]);
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
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormData({ name: "", description: "" });
    setFormError("");
  };

  const openAddDialog = () => {
    resetForm();
    setAddDialogOpen(true);
  };

  const openEditDialog = (t: AdminRoleTemplate) => {
    setSelectedTemplate(t);
    setFormData({ name: t.name, description: t.description || "" });
    setFormError("");
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (t: AdminRoleTemplate) => {
    setSelectedTemplate(t);
    setDeleteDialogOpen(true);
  };

  const openManageDialog = (t: AdminRoleTemplate) => {
    setSelectedTemplate(t);
    setSelectedPermIds(new Set((t.permissions || []).map((p) => p.id)));
    setSelectedAuthorityIds(new Set(t.canManageTemplateIds || []));
    // Expand all groups by default
    setExpandedGroups(new Set((permissionGroups || []).map((g) => g.id)));
    setManageDialogOpen(true);
  };

  const openSyncDialog = async (t: AdminRoleTemplate) => {
    setSelectedTemplate(t);
    setSyncResult("");
    setSelectedOrgIds(new Set());
    try {
      const orgsData = await adminApi.getOrganizations({ limit: 1000 });
      setOrganizations(orgsData?.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tashkilotlarni yuklashda xatolik");
    }
    setSyncDialogOpen(true);
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      setFormError("Shablon nomini kiriting");
      return;
    }
    setIsSubmitting(true);
    setFormError("");
    try {
      await adminApi.createRoleTemplate({
        name: formData.name,
        description: formData.description || undefined,
      });
      setAddDialogOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedTemplate) return;
    setIsSubmitting(true);
    setFormError("");
    try {
      await adminApi.updateRoleTemplate(selectedTemplate.id, {
        name: formData.name || undefined,
        description: formData.description || undefined,
      });
      setEditDialogOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;
    setIsSubmitting(true);
    try {
      await adminApi.deleteRoleTemplate(selectedTemplate.id);
      setDeleteDialogOpen(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "O'chirishda xatolik yuz berdi");
      setDeleteDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (t: AdminRoleTemplate) => {
    try {
      await adminApi.updateRoleTemplate(t.id, { isActive: !t.isActive });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedTemplate) return;
    setPermSaving(true);
    try {
      await adminApi.updateRoleTemplatePermissions(selectedTemplate.id, Array.from(selectedPermIds));
      await adminApi.updateRoleTemplateAuthority(selectedTemplate.id, Array.from(selectedAuthorityIds));
      setManageDialogOpen(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saqlashda xatolik");
    } finally {
      setPermSaving(false);
    }
  };

  const handleSync = async () => {
    if (!selectedTemplate || selectedOrgIds.size === 0) return;
    setIsSubmitting(true);
    setSyncResult("");
    try {
      const result = await adminApi.syncRoleTemplate(selectedTemplate.id, Array.from(selectedOrgIds));
      setSyncResult(`Muvaffaqiyatli sinxronlashtirildi: ${result.synced} ta tashkilot`);
    } catch (err) {
      setSyncResult(err instanceof Error ? err.message : "Sinxronlashda xatolik");
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
    const groupPermIds = (group.permissions || []).map((p) => p.id);
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

  const toggleAuthority = (templateId: string) => {
    setSelectedAuthorityIds((prev) => {
      const next = new Set(prev);
      if (next.has(templateId)) next.delete(templateId);
      else next.add(templateId);
      return next;
    });
  };

  const toggleOrgSelection = (orgId: string) => {
    setSelectedOrgIds((prev) => {
      const next = new Set(prev);
      if (next.has(orgId)) next.delete(orgId);
      else next.add(orgId);
      return next;
    });
  };

  const filteredTemplates = templates.filter(
    (t) =>
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Permissions not in any group — show as "Boshqa" (Other) section
  const groupedPermIds = new Set((permissionGroups || []).flatMap((g) => (g.permissions || []).map((p) => p.id)));
  const ungroupedPermissions = (allPermissions || []).filter((p) => !groupedPermIds.has(p.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileKey2 className="h-6 w-6" />
            Rol shablonlari
          </h1>
          <p className="text-muted-foreground">Rol shablonlarini yarating va boshqaring</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Shablon qo'shish
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Shablon nomi bo'yicha qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 border-0"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
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
      ) : !error && filteredTemplates.length === 0 ? (
        <Card className="p-8 text-center">
          <FileKey2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Shablonlar topilmadi</h3>
          <p className="text-muted-foreground mb-4">Hozircha rol shablonlari yo'q</p>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Birinchi shablonni qo'shing
          </Button>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomi</TableHead>
                <TableHead>Turi</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead>Ruxsatlar</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((t) => (
                <TableRow
                  key={t.id}
                  className="cursor-pointer"
                  onClick={() => openManageDialog(t)}
                >
                  <TableCell>
                    <div>
                      <span className="font-medium">{t.name}</span>
                      {t.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {t.isSystem ? (
                      <Badge className="bg-blue-500/10 text-blue-600">Tizimli</Badge>
                    ) : (
                      <Badge variant="secondary">Oddiy</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Switch
                        checked={t.isActive}
                        onCheckedChange={() => handleToggleActive(t)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {t.isActive ? "Faol" : "Nofaol"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{(t.permissions || []).length} ta</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(t.createdAt).toLocaleDateString("uz-UZ")}
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
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(t); }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Tahrirlash
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openManageDialog(t); }}>
                          <Shield className="h-4 w-4 mr-2" />
                          Ruxsatlar va vakolat
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openSyncDialog(t); }}>
                          <Zap className="h-4 w-4 mr-2" />
                          Sinxronlashtirish
                        </DropdownMenuItem>
                        {!t.isSystem && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => { e.stopPropagation(); openDeleteDialog(t); }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              O'chirish
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi rol shabloni</DialogTitle>
            <DialogDescription>Yangi rol shablonini yarating</DialogDescription>
          </DialogHeader>
          {formError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{formError}</div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nomi *</Label>
              <Input
                placeholder="Shablon nomi"
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Shablonni tahrirlash</DialogTitle>
            <DialogDescription>Shablon ma'lumotlarini yangilang</DialogDescription>
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
            <AlertDialogTitle>Shablonni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Haqiqatan ham <strong>{selectedTemplate?.name}</strong> shablonini o'chirmoqchimisiz?
              {selectedTemplate?.isSystem && (
                <span className="block mt-2 text-destructive font-medium">
                  Tizimli shablonlarni o'chirish mumkin emas!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting || selectedTemplate?.isSystem}
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
              <FileKey2 className="h-5 w-5" />
              {selectedTemplate?.name} — Sozlamalar
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
                    const groupPermIds2 = (group.permissions || []).map((p) => p.id);
                    const selectedCount = groupPermIds2.filter((id) => selectedPermIds.has(id)).length;
                    const allSelected = groupPermIds2.length > 0 && selectedCount === groupPermIds2.length;

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
                            onCheckedChange={(e) => {
                              e && typeof e === "object" && "stopPropagation" in e && (e as any).stopPropagation();
                              toggleGroupAll(group);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex-1">
                            <span className="font-medium text-sm">{group.name}</span>
                            {group.description && (
                              <span className="text-xs text-muted-foreground ml-2">{group.description}</span>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {selectedCount}/{groupPermIds2.length}
                          </Badge>
                        </div>
                        {isExpanded && (group.permissions || []).length > 0 && (
                          <div className="border-t px-3 pb-3 pt-2 space-y-1">
                            {(group.permissions || []).map((perm) => (
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
                                  {perm.description && (
                                    <p className="text-xs text-muted-foreground">{perm.description}</p>
                                  )}
                                </div>
                              </div>
                            ))}
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
                  Bu shablon qaysi boshqa shablonlarni boshqarishi mumkinligini tanlang:
                </p>
                {templates
                  .filter((t) => t.id !== selectedTemplate?.id)
                  .map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedAuthorityIds.has(t.id)}
                        onCheckedChange={() => toggleAuthority(t.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{t.name}</span>
                          {t.isSystem && (
                            <Badge className="bg-blue-500/10 text-blue-600 text-xs">Tizimli</Badge>
                          )}
                          <Badge variant={t.isActive ? "default" : "secondary"} className="text-xs">
                            {t.isActive ? "Faol" : "Nofaol"}
                          </Badge>
                        </div>
                        {t.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
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

      {/* Sync Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Shablonni sinxronlashtirish
            </DialogTitle>
            <DialogDescription>
              <strong>{selectedTemplate?.name}</strong> shablonini tanlangan tashkilotlarga sinxronlashtiring
            </DialogDescription>
          </DialogHeader>
          {syncResult && (
            <div
              className={`p-3 rounded-lg text-sm ${
                syncResult.includes("Muvaffaqiyatli")
                  ? "bg-green-500/10 text-green-600"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {syncResult}
            </div>
          )}
          <div className="overflow-y-auto max-h-[50vh] space-y-1 pr-2">
            {organizations.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Tashkilotlar topilmadi</p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedOrgIds.size} ta tanlangan
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (selectedOrgIds.size === organizations.length) {
                        setSelectedOrgIds(new Set());
                      } else {
                        setSelectedOrgIds(new Set(organizations.map((o) => o.id)));
                      }
                    }}
                  >
                    {selectedOrgIds.size === organizations.length ? "Barchasini bekor qilish" : "Barchasini tanlash"}
                  </Button>
                </div>
                {organizations.map((org) => (
                  <div
                    key={org.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedOrgIds.has(org.id)}
                      onCheckedChange={() => toggleOrgSelection(org.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{org.name}</span>
                      <Badge
                        variant={org.isActive ? "default" : "secondary"}
                        className={`ml-2 text-xs ${org.isActive ? "bg-green-500/10 text-green-600" : ""}`}
                      >
                        {org.isActive ? "Faol" : "Nofaol"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncDialogOpen(false)} disabled={isSubmitting}>
              Yopish
            </Button>
            <Button onClick={handleSync} disabled={isSubmitting || selectedOrgIds.size === 0}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sinxronlanmoqda...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Sinxronlashtirish ({selectedOrgIds.size})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
