import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  Edit,
  Trash2,
  Phone,
  MessageCircle,
  UserPlus,
  Shield,
  Loader2,
  AlertCircle,
  RefreshCw,
  Building2,
  FolderKanban,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { usersApi, User, UserProject, CreateUserRequest, UpdateUserRequest, GetUsersParams } from "@/lib/api/users";
import { projectsApi, Project } from "@/lib/api/projects";

const roles = [
  { value: "ADMIN", label: "Admin", description: "Kompaniya admini" },
  { value: "DIREKTOR", label: "Direktor", description: "Loyihalarni kuzatish va tasdiqlash" },
  { value: "PRORAB", label: "Prorab", description: "Zayavka berish va ishlarni boshqarish" },
  { value: "SNABJENIYA", label: "Snabjenets", description: "Material sotib olish va yetkazish" },
  { value: "SKLAD", label: "Skladchi", description: "Ombor va materiallarni boshqarish" },
  { value: "BUGALTERIYA", label: "Buxgalter", description: "Moliyaviy hisobotlar va tahlillar" },
  { value: "PTO", label: "PTO", description: "Texnik nazorat va tekshirish" },
];

const getRoleBadge = (role: string) => {
  const roleInfo = roles.find((r) => r.value === role);
  const colors: Record<string, string> = {
    ADMIN: "bg-red-100 text-red-700",
    DIREKTOR: "bg-purple-100 text-purple-700",
    PRORAB: "bg-blue-100 text-blue-700",
    SNABJENIYA: "bg-warning/10 text-warning",
    SKLAD: "bg-success/10 text-success",
    BUGALTERIYA: "bg-primary/10 text-primary",
    PTO: "bg-muted text-muted-foreground",
  };
  return (
    <Badge className={colors[role] || "bg-muted text-muted-foreground"}>
      {roleInfo?.label || role}
    </Badge>
  );
};

const formatPhoneDisplay = (phone: string) => {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  return phone;
};

const formatPhoneInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
};

interface UserFormData {
  name: string;
  phone: string;
  role: string;
  allowedRoles: string[];
  password: string;
  projectIds: string[];
}

const initialFormData: UserFormData = {
  name: "",
  phone: "",
  role: "PRORAB",
  allowedRoles: ["PRORAB"],
  password: "",
  projectIds: [],
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [userProjects, setUserProjects] = useState<Record<string, UserProject[]>>({});
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch projects for assignment dropdown
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

  const fetchUserProjects = useCallback(async (userIds: string[]) => {
    const projectsMap: Record<string, UserProject[]> = {};
    await Promise.all(
      userIds.map(async (userId) => {
        try {
          const response = await usersApi.getUserProjects(userId);
          projectsMap[userId] = response.projects;
        } catch {
          projectsMap[userId] = [];
        }
      })
    );
    setUserProjects(projectsMap);
  }, []);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: GetUsersParams = {
        page,
        limit: 10,
      };
      if (searchQuery) params.search = searchQuery;
      if (roleFilter !== "all") params.role = roleFilter;
      if (statusFilter !== "all") params.isActive = statusFilter === "active";

      const response = await usersApi.getAll(params);
      setUsers(response.data);
      setTotalPages(response.totalPages);
      setTotal(response.total);

      // Fetch projects for all users
      if (response.data.length > 0) {
        await fetchUserProjects(response.data.map((u) => u.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Foydalanuvchilarni yuklashda xatolik");
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery, roleFilter, statusFilter, fetchUserProjects]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  const handleAddUser = async () => {
    if (!formData.name.trim() || !formData.phone.trim() || !formData.password.trim()) {
      setFormError("Ism, telefon va parol kiritilishi shart");
      return;
    }

    if (formData.projectIds.length === 0) {
      setFormError("Kamida bitta loyiha tanlash shart");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload: CreateUserRequest = {
        name: formData.name.trim(),
        phone: "+998" + formData.phone.replace(/\s/g, ""),
        role: formData.role,
        allowedRoles: formData.allowedRoles.length > 0 ? formData.allowedRoles : [formData.role],
        password: formData.password,
      };

      const newUser = await usersApi.create(payload);

      // Assign user to selected projects
      for (const projectId of formData.projectIds) {
        await usersApi.assignToProject(newUser.id, projectId);
      }

      setAddDialogOpen(false);
      setFormData(initialFormData);
      fetchUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Foydalanuvchi qo'shishda xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const payload: UpdateUserRequest = {
        name: formData.name.trim() || undefined,
        role: formData.role,
        allowedRoles: formData.allowedRoles.length > 0 ? formData.allowedRoles : [formData.role],
      };

      if (formData.phone.trim()) {
        payload.phone = "+998" + formData.phone.replace(/\s/g, "");
      }

      await usersApi.update(selectedUser.id, payload);
      setEditDialogOpen(false);
      setSelectedUser(null);
      setFormData(initialFormData);
      fetchUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Foydalanuvchini tahrirlashda xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      await usersApi.delete(selectedUser.id);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Foydalanuvchini o'chirishda xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignProject = async (projectId: string) => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      await usersApi.assignToProject(selectedUser.id, projectId);
      // Update local state
      const updatedProjects = [...(userProjects[selectedUser.id] || [])];
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        updatedProjects.push({
          id: project.id,
          name: project.name,
          status: project.status || "ACTIVE",
          budget: project.budget || 0,
        });
      }
      setUserProjects((prev) => ({ ...prev, [selectedUser.id]: updatedProjects }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Loyihaga qo'shishda xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveFromProject = async (projectId: string) => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      await usersApi.removeFromProject(selectedUser.id, projectId);
      // Update local state
      const updatedProjects = (userProjects[selectedUser.id] || []).filter((p) => p.id !== projectId);
      setUserProjects((prev) => ({ ...prev, [selectedUser.id]: updatedProjects }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Loyihadan o'chirishda xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    const phoneDigits = user.phone?.replace(/\D/g, "").slice(-9) || "";
    setFormData({
      name: user.name || "",
      phone: formatPhoneInput(phoneDigits),
      role: user.role,
      allowedRoles: user.allowedRoles || [user.role],
      password: "",
      projectIds: [],
    });
    setFormError(null);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const openProjectDialog = (user: User) => {
    setSelectedUser(user);
    setFormError(null);
    setProjectDialogOpen(true);
  };

  const openAddDialog = () => {
    setFormData(initialFormData);
    setFormError(null);
    setAddDialogOpen(true);
  };

  const getUserDisplayName = (user: User) => {
    return user.name || user.phone || "Noma'lum";
  };

  const getUserInitials = (user: User) => {
    const name = getUserDisplayName(user);
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Xodimlar
          </h1>
          <p className="text-muted-foreground">Barcha foydalanuvchilarni boshqaring</p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
          onClick={openAddDialog}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Xodim qo'shish
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Ism bo'yicha qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 border-0"
            />
          </div>
          <div className="flex gap-2">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px] bg-muted/50 border-0">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha rollar</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] bg-muted/50 border-0">
                <SelectValue placeholder="Holat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barchasi</SelectItem>
                <SelectItem value="active">Faol</SelectItem>
                <SelectItem value="inactive">Nofaol</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchUsers} disabled={isLoading}>
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
      ) : users.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Xodimlar topilmadi</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || roleFilter !== "all" || statusFilter !== "all"
              ? "Qidiruv mezonlariga mos xodimlar topilmadi"
              : "Hozircha xodimlar yo'q"}
          </p>
          <Button onClick={openAddDialog}>
            <UserPlus className="h-4 w-4 mr-2" />
            Birinchi xodimni qo'shing
          </Button>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ism</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Loyiha</TableHead>
                <TableHead>Telegram ID</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead className="w-[100px]">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const userProjectsList = userProjects[user.id] || [];
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-primary/10">
                          <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-white font-semibold text-sm">
                            {getUserInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{getUserDisplayName(user)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatPhoneDisplay(user.phone || "")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {getRoleBadge(user.role)}
                        {user.allowedRoles && user.allowedRoles.length > 1 && (
                          <Badge variant="outline" className="text-xs">
                            +{user.allowedRoles.length - 1}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {userProjectsList.length > 0 ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => openProjectDialog(user)}
                                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                                >
                                  <FolderKanban className="h-3.5 w-3.5" />
                                  {userProjectsList[0].name}
                                  {userProjectsList.length > 1 && (
                                    <Badge variant="outline" className="text-xs ml-1">
                                      +{userProjectsList.length - 1}
                                    </Badge>
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Loyihalarni boshqarish uchun bosing</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <button
                            onClick={() => openProjectDialog(user)}
                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Loyiha qo'shish
                          </button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.telegramId || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          user.isActive
                            ? "border-success text-success"
                            : "border-muted-foreground text-muted-foreground"
                        }
                      >
                        {user.isActive ? "Faol" : "Nofaol"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditDialog(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Tahrirlash</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => openDeleteDialog(user)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>O'chirish</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <div className="flex items-center justify-between pt-4">
        <p className="text-sm text-muted-foreground">Jami: {total} xodim</p>
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

      {/* Add User Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Xodim qo'shish
            </DialogTitle>
            <DialogDescription>Yangi xodimni tizimga qo'shing</DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Ism *</Label>
              <Input
                id="name"
                placeholder="To'liq ism (masalan: Aliyev Vali)"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon raqam *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  +998
                </span>
                <Input
                  id="phone"
                  placeholder="__ ___ __ __"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: formatPhoneInput(e.target.value) }))
                  }
                  className="pl-14"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Parol *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Kamida 6 ta belgi"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Rollar (bir nechta tanlash mumkin)</Label>
              <Card className="p-3 bg-muted/50">
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((role) => (
                    <label
                      key={role.value}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-muted rounded p-1"
                    >
                      <Checkbox
                        checked={formData.allowedRoles.includes(role.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            const newRoles = [...formData.allowedRoles, role.value];
                            setFormData((prev) => ({
                              ...prev,
                              allowedRoles: newRoles,
                              role: newRoles[0],
                            }));
                          } else {
                            const newRoles = formData.allowedRoles.filter((r) => r !== role.value);
                            if (newRoles.length > 0) {
                              setFormData((prev) => ({
                                ...prev,
                                allowedRoles: newRoles,
                                role: newRoles[0],
                              }));
                            }
                          }
                        }}
                      />
                      <span className="text-sm">{role.label}</span>
                    </label>
                  ))}
                </div>
              </Card>
            </div>

            <div className="space-y-2">
              <Label>Loyihalar *</Label>
              <Card className="p-3 bg-muted/50">
                <div className="space-y-2 max-h-40 overflow-auto">
                  {projects.map((project) => (
                    <label
                      key={project.id}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-muted rounded p-1"
                    >
                      <Checkbox
                        checked={formData.projectIds.includes(project.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData((prev) => ({
                              ...prev,
                              projectIds: [...prev.projectIds, project.id],
                            }));
                          } else {
                            setFormData((prev) => ({
                              ...prev,
                              projectIds: prev.projectIds.filter((id) => id !== project.id),
                            }));
                          }
                        }}
                      />
                      <span className="text-sm">{project.name}</span>
                    </label>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={isSubmitting}>
              Bekor qilish
            </Button>
            <Button onClick={handleAddUser} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Qo'shilmoqda...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Qo'shish
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Xodimni tahrirlash
            </DialogTitle>
            <DialogDescription>Xodim ma'lumotlarini yangilang</DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Ism</Label>
              <Input
                id="editName"
                placeholder="To'liq ism (masalan: Aliyev Vali)"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editPhone">Telefon raqam</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  +998
                </span>
                <Input
                  id="editPhone"
                  placeholder="__ ___ __ __"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: formatPhoneInput(e.target.value) }))
                  }
                  className="pl-14"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rollar (bir nechta tanlash mumkin)</Label>
              <Card className="p-3 bg-muted/50">
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((role) => (
                    <label
                      key={role.value}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-muted rounded p-1"
                    >
                      <Checkbox
                        checked={formData.allowedRoles.includes(role.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            const newRoles = [...formData.allowedRoles, role.value];
                            setFormData((prev) => ({
                              ...prev,
                              allowedRoles: newRoles,
                              role: newRoles[0],
                            }));
                          } else {
                            const newRoles = formData.allowedRoles.filter((r) => r !== role.value);
                            if (newRoles.length > 0) {
                              setFormData((prev) => ({
                                ...prev,
                                allowedRoles: newRoles,
                                role: newRoles[0],
                              }));
                            }
                          }
                        }}
                      />
                      <span className="text-sm">{role.label}</span>
                    </label>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Bekor qilish
            </Button>
            <Button onClick={handleEditUser} disabled={isSubmitting}>
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

      {/* Manage Projects Dialog */}
      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-primary" />
              Loyihalarni boshqarish
            </DialogTitle>
            <DialogDescription>
              {selectedUser && getUserDisplayName(selectedUser)} uchun loyihalarni tanlang
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {formError}
            </div>
          )}

          <div className="space-y-4">
            {/* Current projects */}
            <div className="space-y-2">
              <Label>Joriy loyihalar</Label>
              {selectedUser && (userProjects[selectedUser.id] || []).length > 0 ? (
                <div className="space-y-2">
                  {(userProjects[selectedUser.id] || []).map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        <FolderKanban className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{project.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveFromProject(project.id)}
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Hech qanday loyiha biriktirilmagan</p>
              )}
            </div>

            {/* Add new project */}
            <div className="space-y-2">
              <Label>Yangi loyiha qo'shish</Label>
              <Select onValueChange={(value) => handleAssignProject(value)} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Loyihani tanlang..." />
                </SelectTrigger>
                <SelectContent>
                  {projects
                    .filter(
                      (p) =>
                        !selectedUser ||
                        !(userProjects[selectedUser.id] || []).some((up) => up.id === p.id)
                    )
                    .map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectDialogOpen(false)}>
              Yopish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xodimni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Haqiqatan ham <strong>{selectedUser && getUserDisplayName(selectedUser)}</strong> ni
              o'chirmoqchimisiz? Bu amalni bekor qilib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
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
