import { useEffect, useState, useCallback } from "react";
import {
  Shield, Plus, Search, RefreshCw, Loader2, MoreVertical,
  Edit, Trash2, AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { adminApi, AdminPermissionGroup, AdminPermission } from "@/lib/api/admin";

export default function PermissionGroupsPage() {
  const [groups, setGroups] = useState<AdminPermissionGroup[]>([]);
  const [allPermissions, setAllPermissions] = useState<AdminPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<AdminPermissionGroup | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [permSearchQuery, setPermSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sortOrder: 0,
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [groupsData, permsData] = await Promise.all([
        adminApi.getPermissionGroups(),
        adminApi.getPermissions(),
      ]);
      setGroups(groupsData);
      setAllPermissions(permsData);
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
    setFormData({ name: "", description: "", sortOrder: 0 });
    setFormError("");
  };

  const openAddDialog = () => {
    resetForm();
    setAddDialogOpen(true);
  };

  const openEditDialog = (group: AdminPermissionGroup) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || "",
      sortOrder: group.sortOrder,
    });
    setFormError("");
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (group: AdminPermissionGroup) => {
    setSelectedGroup(group);
    setDeleteDialogOpen(true);
  };

  const openPermissionsDialog = (group: AdminPermissionGroup) => {
    setSelectedGroup(group);
    setPermSearchQuery("");
    setPermissionsDialogOpen(true);
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      setFormError("Guruh nomini kiriting");
      return;
    }
    setIsSubmitting(true);
    setFormError("");
    try {
      await adminApi.createPermissionGroup({
        name: formData.name,
        description: formData.description || undefined,
        sortOrder: formData.sortOrder,
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
    if (!selectedGroup) return;
    setIsSubmitting(true);
    setFormError("");
    try {
      await adminApi.updatePermissionGroup(selectedGroup.id, {
        name: formData.name || undefined,
        description: formData.description || undefined,
        sortOrder: formData.sortOrder,
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
    if (!selectedGroup) return;
    setIsSubmitting(true);
    try {
      await adminApi.deletePermissionGroup(selectedGroup.id);
      setDeleteDialogOpen(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "O'chirishda xatolik yuz berdi");
      setDeleteDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePermission = async (group: AdminPermissionGroup, permission: AdminPermission) => {
    const isInGroup = group.permissions.some((p) => p.id === permission.id);
    try {
      if (isInGroup) {
        await adminApi.removePermissionFromGroup(group.id, permission.id);
      } else {
        await adminApi.addPermissionToGroup(group.id, permission.id);
      }
      // Refresh groups to get updated permissions
      const updatedGroups = await adminApi.getPermissionGroups();
      setGroups(updatedGroups);
      // Update selected group if it's the one we're managing
      if (selectedGroup?.id === group.id) {
        const updated = updatedGroups.find((g) => g.id === group.id);
        if (updated) setSelectedGroup(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    }
  };

  const filteredGroups = groups.filter(
    (g) =>
      !searchQuery ||
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPermissions = allPermissions.filter(
    (p) =>
      !permSearchQuery ||
      p.key.toLowerCase().includes(permSearchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(permSearchQuery.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(permSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Ruxsat guruhlari
          </h1>
          <p className="text-muted-foreground">Ruxsatlarni guruhlarga ajrating va boshqaring</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Guruh qo'shish
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Guruh nomi bo'yicha qidirish..."
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
      ) : !error && filteredGroups.length === 0 ? (
        <Card className="p-8 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Guruhlar topilmadi</h3>
          <p className="text-muted-foreground mb-4">Hozircha ruxsat guruhlari yo'q</p>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Birinchi guruhni qo'shing
          </Button>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomi</TableHead>
                <TableHead>Tavsif</TableHead>
                <TableHead>Ruxsatlar soni</TableHead>
                <TableHead>Tartib</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((group) => (
                  <TableRow
                    key={group.id}
                    className="cursor-pointer"
                    onClick={() => openPermissionsDialog(group)}
                  >
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {group.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{group.permissions.length} ta</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {group.sortOrder}
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
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(group); }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Tahrirlash
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openPermissionsDialog(group); }}>
                            <Shield className="h-4 w-4 mr-2" />
                            Ruxsatlarni boshqarish
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => { e.stopPropagation(); openDeleteDialog(group); }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            O'chirish
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

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi ruxsat guruhi</DialogTitle>
            <DialogDescription>Yangi ruxsat guruhini yarating</DialogDescription>
          </DialogHeader>
          {formError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{formError}</div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nomi *</Label>
              <Input
                placeholder="Guruh nomi"
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
            <div className="space-y-2">
              <Label>Tartib raqami</Label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData((p) => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))}
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
            <DialogTitle>Guruhni tahrirlash</DialogTitle>
            <DialogDescription>Guruh ma'lumotlarini yangilang</DialogDescription>
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
            <div className="space-y-2">
              <Label>Tartib raqami</Label>
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData((p) => ({ ...p, sortOrder: parseInt(e.target.value) || 0 }))}
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
            <AlertDialogTitle>Guruhni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Haqiqatan ham <strong>{selectedGroup?.name}</strong> guruhini o'chirmoqchimisiz?
              Bu guruhga tegishli barcha ruxsat bog'lanishlari ham o'chiriladi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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

      {/* Permissions Management Dialog */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {selectedGroup?.name} — Ruxsatlar
            </DialogTitle>
            <DialogDescription>
              Guruhga ruxsatlarni qo'shing yoki olib tashlang
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Ruxsat nomi bo'yicha qidirish..."
              value={permSearchQuery}
              onChange={(e) => setPermSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 border-0"
            />
          </div>
          <div className="overflow-y-auto max-h-[50vh] space-y-1 pr-2">
            {filteredPermissions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Ruxsatlar topilmadi</p>
            ) : (
              filteredPermissions.map((perm) => {
                const isInGroup = selectedGroup?.permissions.some((p) => p.id === perm.id) ?? false;
                return (
                  <div
                    key={perm.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={isInGroup}
                      onCheckedChange={() => {
                        if (selectedGroup) handleTogglePermission(selectedGroup, perm);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{perm.name}</span>
                        <Badge variant="outline" className="text-xs font-mono">
                          {perm.key}
                        </Badge>
                      </div>
                      {perm.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{perm.description}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionsDialogOpen(false)}>
              Yopish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
