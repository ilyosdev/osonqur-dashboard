import { useEffect, useState, useCallback } from "react";
import {
  UserCog, Plus, Search, RefreshCw, Loader2, MoreVertical,
  Edit, Trash2, AlertCircle, Eye, EyeOff,
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { adminApi, AdminOperator } from "@/lib/api/admin";

export default function OperatorsPage() {
  const [operators, setOperators] = useState<AdminOperator[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<AdminOperator | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    password: "",
  });

  const fetchOperators = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await adminApi.getOperators({ page, limit: 20, search: searchQuery || undefined });
      setOperators(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  const resetForm = () => {
    setFormData({ name: "", phone: "", password: "" });
    setFormError("");
    setShowPassword(false);
  };

  const openAddDialog = () => {
    resetForm();
    setAddDialogOpen(true);
  };

  const openEditDialog = (op: AdminOperator) => {
    setSelectedOperator(op);
    setFormData({
      name: op.name,
      phone: (op.phone || "").replace("+998", ""),
      password: "",
    });
    setFormError("");
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (op: AdminOperator) => {
    setSelectedOperator(op);
    setDeleteDialogOpen(true);
  };

  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.phone.trim() || !formData.password.trim()) {
      setFormError("Barcha maydonlarni to'ldiring");
      return;
    }
    if (formData.password.length < 6) {
      setFormError("Parol kamida 6 ta belgi bo'lishi kerak");
      return;
    }
    setIsSubmitting(true);
    setFormError("");
    try {
      const fullPhone = "+998" + formData.phone.replace(/\s/g, "");
      await adminApi.createOperator({
        name: formData.name,
        phone: fullPhone,
        password: formData.password,
      });
      setAddDialogOpen(false);
      fetchOperators();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedOperator) return;
    setIsSubmitting(true);
    setFormError("");
    try {
      const data: { name?: string; phone?: string; password?: string } = {};
      if (formData.name.trim()) data.name = formData.name;
      if (formData.phone.trim()) data.phone = "+998" + formData.phone.replace(/\s/g, "");
      if (formData.password.trim()) data.password = formData.password;
      await adminApi.updateOperator(selectedOperator.id, data);
      setEditDialogOpen(false);
      fetchOperators();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedOperator) return;
    setIsSubmitting(true);
    try {
      await adminApi.deleteOperator(selectedOperator.id);
      setDeleteDialogOpen(false);
      fetchOperators();
    } catch (err) {
      setError(err instanceof Error ? err.message : "O'chirishda xatolik yuz berdi");
      setDeleteDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (op: AdminOperator) => {
    try {
      await adminApi.updateOperator(op.id, { isActive: !op.isActive });
      fetchOperators();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <UserCog className="h-6 w-6" />
            Operatorlar
          </h1>
          <p className="text-muted-foreground">Tizim operatorlarini boshqaring</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Operator qo'shish
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Ism bo'yicha qidirish..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-9 bg-muted/50 border-0"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchOperators} disabled={isLoading}>
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
      ) : !error && operators.length === 0 ? (
        <Card className="p-8 text-center">
          <UserCog className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Operatorlar topilmadi</h3>
          <p className="text-muted-foreground mb-4">Hozircha operatorlar yo'q</p>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Birinchi operatorni qo'shing
          </Button>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ism</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Kompaniyalar</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {operators.map((op) => (
                <TableRow key={op.id}>
                  <TableCell className="font-medium">{op.name}</TableCell>
                  <TableCell>{op.phone || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{op.orgCount} ta</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={op.isActive ? "default" : "secondary"}
                      className={op.isActive ? "bg-green-500/10 text-green-600" : ""}>
                      {op.isActive ? "Faol" : "Nofaol"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(op.createdAt).toLocaleDateString("uz-UZ")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(op)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Tahrirlash
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(op)}>
                          {op.isActive ? "Nofaol qilish" : "Faol qilish"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => openDeleteDialog(op)}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">Jami: {total}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Oldingi
            </Button>
            <span className="text-sm">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Keyingi
            </Button>
          </div>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi operator</DialogTitle>
            <DialogDescription>Yangi operator foydalanuvchisini yarating</DialogDescription>
          </DialogHeader>
          {formError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{formError}</div>
          )}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ism *</Label>
              <Input placeholder="Operator ismi" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} />
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
            <DialogTitle>Operatorni tahrirlash</DialogTitle>
            <DialogDescription>Operator ma'lumotlarini yangilang</DialogDescription>
          </DialogHeader>
          {formError && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{formError}</div>
          )}
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
            <AlertDialogTitle>Operatorni o'chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Haqiqatan ham <strong>{selectedOperator?.name}</strong> operatorini o'chirmoqchimisiz?
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
