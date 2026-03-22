import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Building2, Plus, Search, RefreshCw, Loader2, MoreVertical,
  Edit, Trash2, AlertCircle, Users, FolderOpen, Eye, EyeOff, CheckCircle,
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
import { adminApi, AdminOrganization, SubscriptionTier } from "@/lib/api/admin";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";

export default function OrganizationsPage() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<AdminOrganization | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    inn: "",
    address: "",
    responsiblePerson: "",
    password: "",
    subscriptionTier: "ODDIY" as SubscriptionTier,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [createdAdmin, setCreatedAdmin] = useState<{ name: string; phone: string } | null>(null);

  const TIER_LABELS: Record<SubscriptionTier, string> = {
    ODDIY: "Oddiy (1 loyiha)",
    PRO: "Pro (3 loyiha)",
    ENTERPRISE: "Enterprise (10 loyiha)",
  };

  const TIER_COLORS: Record<SubscriptionTier, string> = {
    ODDIY: "bg-gray-500/10 text-gray-600",
    PRO: "bg-blue-500/10 text-blue-600",
    ENTERPRISE: "bg-purple-500/10 text-purple-600",
  };

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const fetchOrgs = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await adminApi.getOrganizations({ page, limit: 20, search: searchQuery || undefined });
      setOrganizations(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      inn: "",
      address: "",
      responsiblePerson: "",
      password: "",
      subscriptionTier: "ODDIY",
    });
    setFormError("");
    setShowPassword(false);
    setCreatedAdmin(null);
  };

  const openAddDialog = () => { resetForm(); setAddDialogOpen(true); };

  const openEditDialog = (org: AdminOrganization) => {
    setSelectedOrg(org);
    setFormData({
      name: org.name,
      phone: (org.phone || "").replace("+998", ""),
      inn: org.inn || "",
      address: org.address || "",
      responsiblePerson: org.responsiblePerson || "",
      password: "",
      subscriptionTier: org.subscriptionTier || "ODDIY",
    });
    setFormError("");
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (org: AdminOrganization) => {
    setSelectedOrg(org);
    setDeleteDialogOpen(true);
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) { setFormError("Kompaniya nomi kiritilishi kerak"); return; }
    if (!formData.responsiblePerson.trim()) { setFormError("Mas'ul shaxs ismi kiritilishi kerak"); return; }
    if (!formData.phone.trim()) { setFormError("Telefon raqami kiritilishi kerak"); return; }
    if (!formData.password.trim()) { setFormError("Parol kiritilishi kerak"); return; }
    if (formData.password.length < 4) { setFormError("Parol kamida 4 ta belgi bo'lishi kerak"); return; }

    setIsSubmitting(true);
    setFormError("");
    try {
      const phone = "+998" + formData.phone.replace(/\s/g, "");
      const result = await adminApi.createOrganization({
        name: formData.name,
        phone,
        responsiblePerson: formData.responsiblePerson,
        password: formData.password,
        subscriptionTier: formData.subscriptionTier,
        inn: formData.inn.trim() || undefined,
        address: formData.address.trim() || undefined,
      });
      setCreatedAdmin({ name: result.adminUser.name, phone: result.adminUser.phone });
      fetchOrgs();
    } catch (err) {
      if (err instanceof Error && err.message.includes("PHONE_ALREADY_EXISTS")) {
        setFormError("Bu telefon raqami allaqachon ro'yxatdan o'tgan");
      } else {
        setFormError(err instanceof Error ? err.message : "Xatolik");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedOrg) return;
    setIsSubmitting(true);
    setFormError("");
    try {
      const data: { name?: string; phone?: string } = {};
      if (formData.name.trim()) data.name = formData.name;
      if (formData.phone.trim()) data.phone = "+998" + formData.phone.replace(/\s/g, "");
      await adminApi.updateOrganization(selectedOrg.id, data);
      setEditDialogOpen(false);
      fetchOrgs();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedOrg) return;
    setIsSubmitting(true);
    try {
      await adminApi.deleteOrganization(selectedOrg.id);
      setDeleteDialogOpen(false);
      fetchOrgs();
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Kompaniyalar
          </h1>
          <p className="text-muted-foreground">Kompaniyalarni boshqaring</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Kompaniya qo'shish
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Nomi bo'yicha qidirish..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-9 bg-muted/50 border-0"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchOrgs} disabled={isLoading}>
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
      ) : organizations.length === 0 ? (
        <Card className="p-8 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Kompaniyalar topilmadi</h3>
          <p className="text-muted-foreground mb-4">Hozircha kompaniyalar yo'q</p>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Birinchi kompaniyani qo'shing
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <Card key={org.id} className="overflow-hidden transition-all duration-200 hover:shadow-md group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <Link to={`/admin/organizations/${org.id}/users`} className="flex-1">
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                      {org.name}
                    </h3>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(org)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Tahrirlash
                      </DropdownMenuItem>
                      {isSuperAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openDeleteDialog(org)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            O'chirish
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  {org.phone && (
                    <div className="flex items-center gap-2">
                      <span>{org.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{org.userCount} xodim</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FolderOpen className="h-4 w-4" />
                      <span>{org.projectCount} loyiha</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <div className="flex gap-2">
                    <Badge variant="outline" className={TIER_COLORS[org.subscriptionTier || "ODDIY"]}>
                      {org.subscriptionTier || "ODDIY"}
                    </Badge>
                    <Badge variant={org.isActive ? "default" : "secondary"}
                      className={org.isActive ? "bg-green-500/10 text-green-600" : ""}>
                      {org.isActive ? "Faol" : "Nofaol"}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/admin/organizations/${org.id}/users`}>Xodimlar</Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/admin/organizations/${org.id}/projects`}>Loyihalar</Link>
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
      <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yangi kompaniya</DialogTitle>
            <DialogDescription>Yangi kompaniya va ADMIN yarating</DialogDescription>
          </DialogHeader>

          {createdAdmin ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 text-green-600 mb-3">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Kompaniya muvaffaqiyatli yaratildi!</span>
                </div>
                <div className="space-y-2 text-sm">
                  <p><strong>ADMIN yaratildi:</strong></p>
                  <p>Ism: {createdAdmin.name}</p>
                  <p>Login: {createdAdmin.phone}</p>
                  <p>Parol: (siz kiritgan)</p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setAddDialogOpen(false)}>Yopish</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              {formError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{formError}</div>}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Kompaniya nomi *</Label>
                  <Input placeholder="Kompaniya nomi" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>INN (ixtiyoriy)</Label>
                    <Input placeholder="123456789" value={formData.inn} onChange={(e) => setFormData(p => ({ ...p, inn: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tarif</Label>
                    <Select value={formData.subscriptionTier} onValueChange={(v) => setFormData(p => ({ ...p, subscriptionTier: v as SubscriptionTier }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ODDIY">{TIER_LABELS.ODDIY}</SelectItem>
                        <SelectItem value="PRO">{TIER_LABELS.PRO}</SelectItem>
                        <SelectItem value="ENTERPRISE">{TIER_LABELS.ENTERPRISE}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Manzil (ixtiyoriy)</Label>
                  <Input placeholder="Toshkent, Mirzo Ulug'bek" value={formData.address} onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))} />
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-3">Mas'ul shaxs (ADMIN sifatida yaratiladi)</p>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Mas'ul shaxs ismi *</Label>
                      <Input placeholder="Ism familiya" value={formData.responsiblePerson} onChange={(e) => setFormData(p => ({ ...p, responsiblePerson: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefon raqami * (ADMIN login)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">+998</span>
                        <Input className="pl-14" placeholder="__ ___ __ __" value={formData.phone}
                          onChange={(e) => setFormData(p => ({ ...p, phone: formatPhone(e.target.value) }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Parol * (ADMIN uchun)</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Kamida 4 ta belgi"
                          value={formData.password}
                          onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={isSubmitting}>Bekor qilish</Button>
                <Button onClick={handleAdd} disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Yaratilmoqda...</> : "Yaratish"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kompaniyani tahrirlash</DialogTitle>
            <DialogDescription>Kompaniya ma'lumotlarini yangilang</DialogDescription>
          </DialogHeader>
          {formError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{formError}</div>}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nomi</Label>
              <Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">+998</span>
                <Input className="pl-14" value={formData.phone}
                  onChange={(e) => setFormData(p => ({ ...p, phone: formatPhone(e.target.value) }))} />
              </div>
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
            <AlertDialogTitle>Kompaniyani o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Haqiqatan ham <strong>{selectedOrg?.name}</strong> kompaniyasini o'chirmoqchimisiz?
              Barcha xodimlar va loyihalar ham o'chiriladi.
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
