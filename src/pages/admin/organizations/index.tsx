import { useEffect, useState, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  Building2, Plus, Search, RefreshCw, Loader2, MoreVertical,
  Edit, Trash2, AlertCircle, Users, FolderOpen, Eye, EyeOff, CheckCircle, TriangleAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { adminApi, AdminOrganization, AdminRoleTemplate, SubscriptionTier } from "@/lib/api/admin";
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
  const [templates, setTemplates] = useState<AdminRoleTemplate[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());

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
  const isOperator = user?.role === "OPERATOR";
  const isAdminRole = user?.role === "ADMIN";
  const canAddOrg = isSuperAdmin || isOperator;

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

  useEffect(() => {
    adminApi.getRoleTemplates().then((data) => {
      const active = (data || []).filter((t) => t.isActive && t.isSystem);
      setTemplates(active);
      setSelectedTemplateIds(new Set(active.map((t) => t.id)));
    }).catch(() => {});
  }, []);

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
    setSelectedTemplateIds(new Set(templates.map((t) => t.id)));
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
        templateIds: selectedTemplateIds.size > 0 ? Array.from(selectedTemplateIds) : undefined,
      });
      setCreatedAdmin(result.adminUser ? { name: result.adminUser.name, phone: result.adminUser.phone } : { name: formData.responsiblePerson, phone: "+998" + formData.phone.replace(/\s/g, "") });
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

  const handleToggleActive = async (org: AdminOrganization) => {
    try {
      await adminApi.updateOrganization(org.id, { isActive: !org.isActive });
      fetchOrgs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    }
  };

  const handleEdit = async () => {
    if (!selectedOrg) return;
    setIsSubmitting(true);
    setFormError("");
    try {
      const data: { name?: string; phone?: string; inn?: string; address?: string; responsiblePerson?: string; subscriptionTier?: SubscriptionTier } = {};
      if (formData.name.trim()) data.name = formData.name;
      if (formData.phone.trim()) data.phone = "+998" + formData.phone.replace(/\s/g, "");
      data.inn = formData.inn.trim() || undefined;
      data.address = formData.address.trim() || undefined;
      data.responsiblePerson = formData.responsiblePerson.trim() || undefined;
      if (formData.subscriptionTier) data.subscriptionTier = formData.subscriptionTier;
      await adminApi.updateOrganization(selectedOrg.id, data);
      setEditDialogOpen(false);
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

  const handleDelete = async () => {
    if (!selectedOrg) return;
    setIsSubmitting(true);
    try {
      await adminApi.deleteOrganization(selectedOrg.id);
      setDeleteDialogOpen(false);
      fetchOrgs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "O'chirishda xatolik yuz berdi");
      setDeleteDialogOpen(false);
    } finally {
      setIsSubmitting(false);
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

  // ADMIN users should be redirected to their own org
  if (isAdminRole && user?.orgId) {
    return <Navigate to={`/admin/organizations/${user.orgId}/users`} replace />;
  }

  const C = {
    blue: "#185fa5", blueDark: "#0c447c", blueLight: "#eff6ff",
    border: "#dbe7f3", muted: "#64748b", red: "#ef4444", green: "#16a34a",
  };

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: C.blueLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Building2 size={20} color={C.blue} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: C.blueDark, margin: 0 }}>Kompaniyalar</h1>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Kompaniyalarni boshqaring</p>
          </div>
        </div>
        {canAddOrg && (
          <button onClick={openAddDialog} style={{ display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 20px", borderRadius: 10, border: "none", background: C.blue, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
            <Plus size={16} /> Kompaniya qo'shish
          </button>
        )}
      </div>

      {/* Search */}
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <Search size={16} color={C.muted} />
        <input
          placeholder="Nomi bo'yicha qidirish..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: C.blueDark, background: "transparent" }}
        />
        <button onClick={fetchOrgs} disabled={isLoading} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex" }}>
          <RefreshCw size={16} style={{ animation: isLoading ? "spin 1s linear infinite" : "none" }} />
        </button>
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: C.red }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <Loader2 size={32} color={C.blue} style={{ animation: "spin 1s linear infinite" }} />
        </div>
      ) : !error && organizations.length === 0 ? (
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, textAlign: "center" }}>
          <Building2 size={48} color={C.border} style={{ margin: "0 auto 12px" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: C.blueDark, marginBottom: 6 }}>Kompaniyalar topilmadi</p>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Hozircha kompaniyalar yo'q</p>
          {canAddOrg && (
            <button onClick={openAddDialog} style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 38, padding: "0 20px", borderRadius: 10, border: "none", background: C.blue, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
              <Plus size={14} /> Birinchi kompaniyani qo'shing
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
          {organizations.map((org) => (
            <Link key={org.id} to={`/admin/organizations/${org.id}/projects`} style={{ textDecoration: "none", display: "block", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", cursor: "pointer" }}>
              {/* Card header */}
              <div style={{ padding: "16px 20px", background: "#f8fbff", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: C.blueLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Building2 size={18} color={C.blue} />
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: C.blueDark, margin: 0 }}>{org.name}</p>
                    {org.phone && <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{org.phone}</p>}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button onClick={e => e.preventDefault()} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4, borderRadius: 6 }}>
                      <MoreVertical size={16} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(org)}><Edit className="h-4 w-4 mr-2" />Tahrirlash</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleActive(org)}>{org.isActive ? "Nofaol qilish" : "Faol qilish"}</DropdownMenuItem>
                    {isSuperAdmin && (<><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openDeleteDialog(org)}><Trash2 className="h-4 w-4 mr-2" />O'chirish</DropdownMenuItem></>)}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Stats */}
              <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.muted }}>
                  <Users size={14} color={C.blue} />
                  <span><b style={{ color: C.blueDark }}>{org.userCount}</b> xodim</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.muted }}>
                  <FolderOpen size={14} color={C.blue} />
                  <span><b style={{ color: C.blueDark }}>{org.projectCount}</b> loyiha</span>
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: "10px 20px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, border: `1px solid ${C.border}`, color: C.muted }}>{org.subscriptionTier || "ODDIY"}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: org.isActive ? "#dcfce7" : "#f1f5f9", color: org.isActive ? C.green : C.muted }}>
                    {org.isActive ? "Faol" : "Nofaol"}
                  </span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.blue }}>Batafsil →</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
          <span style={{ fontSize: 13, color: C.muted }}>Jami: {total}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ height: 34, padding: "0 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: page <= 1 ? "#f8fafc" : "#fff", fontSize: 13, color: page <= 1 ? "#cbd5e1" : C.blueDark, cursor: page <= 1 ? "not-allowed" : "pointer" }}>← Oldingi</button>
            <span style={{ height: 34, padding: "0 14px", display: "flex", alignItems: "center", fontSize: 13, color: C.muted }}>{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ height: 34, padding: "0 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: page >= totalPages ? "#f8fafc" : "#fff", fontSize: 13, color: page >= totalPages ? "#cbd5e1" : C.blueDark, cursor: page >= totalPages ? "not-allowed" : "pointer" }}>Keyingi →</button>
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
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium">Rollar</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => setSelectedTemplateIds(new Set(templates.map((t) => t.id)))}
                      >
                        Barchasini tanlash
                      </button>
                      <span className="text-xs text-muted-foreground">·</span>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:underline"
                        onClick={() => setSelectedTemplateIds(new Set())}
                      >
                        Tozalash
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {templates.map((t) => (
                      <div
                        key={t.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          selectedTemplateIds.has(t.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                        onClick={() => {
                          setSelectedTemplateIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(t.id)) next.delete(t.id);
                            else next.add(t.id);
                            return next;
                          });
                        }}
                      >
                        <Checkbox
                          checked={selectedTemplateIds.has(t.id)}
                          onCheckedChange={() => {}}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{(t.permissions || []).length} ruxsat</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedTemplateIds.size === 0 && (
                    <p className="text-xs text-amber-600 mb-3 flex items-center gap-1"><TriangleAlert className="h-3.5 w-3.5" /> Hech bir rol tanlanmagan — kampaniya rollarsiz yaratiladi</p>
                  )}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kompaniyani tahrirlash</DialogTitle>
            <DialogDescription>Kompaniya ma'lumotlarini yangilang</DialogDescription>
          </DialogHeader>
          {formError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{formError}</div>}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Kompaniya nomi</Label>
              <Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>INN</Label>
                <Input placeholder="123456789" value={formData.inn} onChange={(e) => setFormData(p => ({ ...p, inn: e.target.value }))} />
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
            <div className="space-y-2">
              <Label>Manzil</Label>
              <Input placeholder="Toshkent, Mirzo Ulug'bek" value={formData.address} onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Mas'ul shaxs</Label>
              <Input placeholder="Ism familiya" value={formData.responsiblePerson} onChange={(e) => setFormData(p => ({ ...p, responsiblePerson: e.target.value }))} />
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
