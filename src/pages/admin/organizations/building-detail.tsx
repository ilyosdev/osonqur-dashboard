import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  Building2, Plus, Search, RefreshCw, Loader2, MoreVertical,
  Edit, Trash2, AlertCircle, ArrowLeft, FileSpreadsheet, Calendar, Upload,
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
import { adminApi, AdminBuilding, AdminProjectSmeta, AdminSmetaType } from "@/lib/api/admin";
import { smetaItemsApi, CreateSmetaItemRequest } from "@/lib/api/smeta-items";

interface ExcelRow { name: string; unit: string; quantity: number; unitPrice: number }

const SMETA_TYPES: { value: AdminSmetaType; label: string }[] = [
  { value: "CONSTRUCTION", label: "Qurilish" },
  { value: "ELECTRICAL", label: "Elektr" },
  { value: "PLUMBING", label: "Santexnika" },
  { value: "HVAC", label: "Isitish/Sovutish" },
  { value: "FINISHING", label: "Pardozlash" },
  { value: "OTHER", label: "Boshqa" },
];

export default function BuildingDetailPage() {
  const { orgId, projectId, buildingId } = useParams<{ orgId: string; projectId: string; buildingId: string }>();
  const [building, setBuilding] = useState<AdminBuilding | null>(null);
  const [smetas, setSmetas] = useState<AdminProjectSmeta[]>([]);
  const [smetaTotal, setSmetaTotal] = useState(0);
  const [smetaPage, setSmetaPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [addSmetaDialogOpen, setAddSmetaDialogOpen] = useState(false);
  const [editSmetaDialogOpen, setEditSmetaDialogOpen] = useState(false);
  const [deleteSmetaDialogOpen, setDeleteSmetaDialogOpen] = useState(false);
  const [selectedSmeta, setSelectedSmeta] = useState<AdminProjectSmeta | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [excelDialogOpen, setExcelDialogOpen] = useState(false);
  const [excelSmetaId, setExcelSmetaId] = useState<string>("");
  const [excelRows, setExcelRows] = useState<ExcelRow[]>([]);
  const [excelError, setExcelError] = useState("");
  const [excelUploading, setExcelUploading] = useState(false);
  const [excelFileName, setExcelFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [smetaFormData, setSmetaFormData] = useState({
    name: "",
    type: "CONSTRUCTION" as AdminSmetaType,
    description: "",
    budget: "",
    deadline: "",
    overheadPercent: "17.27",
  });

  const fetchBuilding = useCallback(async () => {
    if (!orgId || !projectId || !buildingId) return;
    try {
      const result = await adminApi.getProjectBuildings(orgId, projectId);
      const b = result.find((b) => b.id === buildingId);
      if (b) setBuilding(b);
    } catch {}
  }, [orgId, projectId, buildingId]);

  const fetchSmetas = useCallback(async () => {
    if (!orgId || !projectId || !buildingId) return;
    setIsLoading(true);
    setError("");
    try {
      const result = await adminApi.getProjectSmetas(orgId, projectId, {
        page: smetaPage,
        limit: 20,
        search: searchQuery || undefined,
        buildingId,
      });
      setSmetas(result.data);
      setSmetaTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  }, [orgId, projectId, buildingId, smetaPage, searchQuery]);

  useEffect(() => { fetchBuilding(); }, [fetchBuilding]);
  useEffect(() => { fetchSmetas(); }, [fetchSmetas]);

  const resetSmetaForm = () => {
    setSmetaFormData({ name: "", type: "CONSTRUCTION", description: "", budget: "", deadline: "", overheadPercent: "17.27" });
    setFormError("");
  };

  const openAddSmetaDialog = () => { resetSmetaForm(); setAddSmetaDialogOpen(true); };

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

  const handleAddSmeta = async () => {
    if (!orgId || !projectId || !buildingId || !smetaFormData.name.trim()) {
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
        buildingId,
      });
      setAddSmetaDialogOpen(false);
      fetchSmetas();
      fetchBuilding();
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "O'chirishda xatolik");
      setDeleteSmetaDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatMoney = (val: number) => val.toLocaleString("uz-UZ") + " so'm";
  const getSmetaTypeLabel = (type: string) => SMETA_TYPES.find((t) => t.value === type)?.label || type;
  const smetaTotalPages = Math.ceil(smetaTotal / 20);

  const openExcelDialog = (smetaId: string) => {
    setExcelSmetaId(smetaId);
    setExcelRows([]);
    setExcelError("");
    setExcelFileName("");
    setExcelDialogOpen(true);
  };

  const handleExcelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFileName(file.name);
    setExcelError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
        const parsed: ExcelRow[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[0]) continue;
          const name = String(row[0] || "").trim().slice(0, 500);
          const unit = String(row[1] || "dona").trim().slice(0, 50);
          const quantity = parseFloat(String(row[2] || "0").replace(",", ".")) || 0;
          const unitPrice = parseFloat(String(row[3] || "0").replace(",", ".")) || 0;
          if (name) parsed.push({ name, unit, quantity, unitPrice });
        }
        if (parsed.length === 0) { setExcelError("Excel faylda ma'lumot topilmadi. Format: Nomi | Birligi | Miqdori | Narxi"); return; }
        setExcelRows(parsed);
      } catch { setExcelError("Excel faylni o'qishda xatolik"); }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExcelUpload = async () => {
    if (!excelSmetaId || excelRows.length === 0) return;
    setExcelUploading(true);
    setExcelError("");
    try {
      const items: CreateSmetaItemRequest[] = excelRows.map((row) => ({
        smetaId: excelSmetaId,
        name: row.name,
        unit: row.unit,
        quantity: row.quantity,
        unitPrice: row.unitPrice,
        category: "Umumiy",
      }));
      await smetaItemsApi.bulkCreate(items);
      setExcelDialogOpen(false);
      fetchSmetas();
    } catch (err) {
      setExcelError(err instanceof Error ? err.message : "Yuklashda xatolik");
    } finally {
      setExcelUploading(false);
    }
  };

  const C = { blue: "#185fa5", blueDark: "#0c447c", blueLight: "#eff6ff", border: "#dbe7f3", muted: "#64748b", red: "#ef4444" };

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "20px 24px", background: "#f8fbff", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link to={`/admin/organizations/${orgId}/projects/${projectId}`} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: C.blue, textDecoration: "none" }}>
              <ArrowLeft size={16} /> Ortga
            </Link>
            <span style={{ color: C.border }}>|</span>
            <Building2 size={16} color={C.blue} />
            <h1 style={{ fontSize: 18, fontWeight: 700, color: C.blueDark, margin: 0 }}>{building?.name || "..."}</h1>
          </div>
        </div>
        {building && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: `1px solid ${C.border}` }}>
            {building.budget !== undefined && building.budget !== null && (
              <div style={{ padding: "16px 24px", borderRight: `1px solid ${C.border}` }}>
                <p style={{ fontSize: 12, color: C.muted, margin: 0, marginBottom: 4 }}>Byudjet</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: C.blueDark, margin: 0 }}>{formatMoney(building.budget)}</p>
              </div>
            )}
            {building.endDate && (
              <div style={{ padding: "16px 24px", borderRight: `1px solid ${C.border}` }}>
                <p style={{ fontSize: 12, color: C.muted, margin: 0, marginBottom: 4 }}>Tugash sanasi</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: C.blueDark, margin: 0 }}>{new Date(building.endDate).toLocaleDateString("ru-RU")}</p>
              </div>
            )}
            <div style={{ padding: "16px 24px" }}>
              <p style={{ fontSize: 12, color: C.muted, margin: 0, marginBottom: 4 }}>Smetalar soni</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: C.blueDark, margin: 0 }}>{building.smetaCount} ta</p>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <Search size={16} color={C.muted} />
        <input placeholder="Nomi bo'yicha qidirish..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setSmetaPage(1); }}
          style={{ flex: 1, border: "none", outline: "none", fontSize: 14, color: C.blueDark, background: "transparent" }} />
        <button onClick={fetchSmetas} disabled={isLoading} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex" }}>
          <RefreshCw size={16} style={{ animation: isLoading ? "spin 1s linear infinite" : "none" }} />
        </button>
        <button onClick={openAddSmetaDialog} style={{ display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 16px", borderRadius: 8, border: "none", background: C.blue, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
          <Plus size={14} /> Yangi smeta
        </button>
        {smetas.length > 0 && (
          smetas.length === 1 ? (
            <button onClick={() => openExcelDialog(smetas[0].id)} style={{ display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", fontSize: 13, color: C.blue, cursor: "pointer" }}>
              <Upload size={14} /> Excel yuklash
            </button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button style={{ display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", fontSize: 13, color: C.blue, cursor: "pointer" }}>
                  <Upload size={14} /> Excel yuklash
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {smetas.map((s) => <DropdownMenuItem key={s.id} onClick={() => openExcelDialog(s.id)}>{s.name}</DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        )}
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
      ) : smetas.length === 0 ? (
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, padding: 48, textAlign: "center" }}>
          <FileSpreadsheet size={48} color={C.border} style={{ margin: "0 auto 12px" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: C.blueDark, marginBottom: 6 }}>Smetalar topilmadi</p>
          <button onClick={openAddSmetaDialog} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 38, padding: "0 20px", borderRadius: 8, border: "none", background: C.blue, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
            <Plus size={14} /> Birinchi smetani qo'shing
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {smetas.map((smeta) => (
            <div key={smeta.id} onClick={() => window.location.href = `/admin/smetas/${smeta.id}?orgId=${orgId}&projectId=${projectId}`}
              className="rounded-[12px] border border-[#dbe7f3] bg-white p-5 transition-shadow hover:shadow-sm cursor-pointer">
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#f0f7ff]">
                    <FileSpreadsheet className="h-4 w-4 text-[#185fa5]" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-[15px] text-[#0c447c] truncate block">{smeta.name}</span>
                    <span className="text-[11px] font-medium text-[#185fa5] bg-[#eff6ff] rounded px-2 py-0.5">{getSmetaTypeLabel(smeta.type)}</span>
                  </div>
                </div>
                <div onClick={e => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-[#94a3b8] hover:bg-[#f0f7ff]">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditSmetaDialog(smeta)}><Edit className="h-4 w-4 mr-2" />Tahrirlash</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { setSelectedSmeta(smeta); setDeleteSmetaDialogOpen(true); }}><Trash2 className="h-4 w-4 mr-2" />O'chirish</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="space-y-2 text-[13px]">
                {smeta.description && <p className="text-[#64748b] mb-1">{smeta.description}</p>}
                <div className="flex items-center justify-between">
                  <span className="text-[#94a3b8]">Byudjet:</span>
                  <span className="font-medium text-[#0c447c]">{formatMoney(smeta.grandTotal || 0)}</span>
                </div>
                {smeta.deadline && (
                  <div className="flex items-center gap-1.5 pt-2 border-t border-[#eef2f7] text-[#64748b]">
                    <Calendar className="h-3.5 w-3.5 text-[#378add]" />
                    <span>Tugash: {new Date(smeta.deadline).toLocaleDateString("ru-RU")}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {smetaTotalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
          <span style={{ fontSize: 13, color: C.muted }}>Jami: {smetaTotal}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button disabled={smetaPage <= 1} onClick={() => setSmetaPage(p => p - 1)} style={{ height: 34, padding: "0 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: smetaPage <= 1 ? "#f8fafc" : "#fff", fontSize: 13, color: smetaPage <= 1 ? "#cbd5e1" : C.blueDark, cursor: smetaPage <= 1 ? "not-allowed" : "pointer" }}>← Oldingi</button>
            <span style={{ height: 34, padding: "0 14px", display: "flex", alignItems: "center", fontSize: 13, color: C.muted }}>{smetaPage} / {smetaTotalPages}</span>
            <button disabled={smetaPage >= smetaTotalPages} onClick={() => setSmetaPage(p => p + 1)} style={{ height: 34, padding: "0 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: smetaPage >= smetaTotalPages ? "#f8fafc" : "#fff", fontSize: 13, color: smetaPage >= smetaTotalPages ? "#cbd5e1" : C.blueDark, cursor: smetaPage >= smetaTotalPages ? "not-allowed" : "pointer" }}>Keyingi →</button>
          </div>
        </div>
      )}

      {/* Add Smeta Dialog */}
      <Dialog open={addSmetaDialogOpen} onOpenChange={setAddSmetaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi smeta</DialogTitle>
            <DialogDescription>Binoga yangi smeta qo'shing</DialogDescription>
          </DialogHeader>
          {formError && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{formError}</div>}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nomi *</Label>
              <Input placeholder="Smeta nomi" value={smetaFormData.name} onChange={(e) => setSmetaFormData((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Turi</Label>
              <Select value={smetaFormData.type} onValueChange={(v) => setSmetaFormData((p) => ({ ...p, type: v as AdminSmetaType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SMETA_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tavsif</Label>
              <Input placeholder="Qisqacha tavsif" value={smetaFormData.description} onChange={(e) => setSmetaFormData((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Byudjet</Label>
                <Input type="number" placeholder="0" value={smetaFormData.budget} onChange={(e) => setSmetaFormData((p) => ({ ...p, budget: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Muddat</Label>
                <Input type="date" value={smetaFormData.deadline} onChange={(e) => setSmetaFormData((p) => ({ ...p, deadline: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSmetaDialogOpen(false)} disabled={isSubmitting}>Bekor qilish</Button>
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
              <Input value={smetaFormData.name} onChange={(e) => setSmetaFormData((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Turi</Label>
              <Select value={smetaFormData.type} onValueChange={(v) => setSmetaFormData((p) => ({ ...p, type: v as AdminSmetaType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SMETA_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tavsif</Label>
              <Input value={smetaFormData.description} onChange={(e) => setSmetaFormData((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Byudjet</Label>
                <Input type="number" value={smetaFormData.budget} onChange={(e) => setSmetaFormData((p) => ({ ...p, budget: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Muddat</Label>
                <Input type="date" value={smetaFormData.deadline} onChange={(e) => setSmetaFormData((p) => ({ ...p, deadline: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSmetaDialogOpen(false)} disabled={isSubmitting}>Bekor qilish</Button>
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

      {/* Excel Upload Dialog */}
      <Dialog open={excelDialogOpen} onOpenChange={setExcelDialogOpen}>
        <DialogContent className="!w-[96vw] !max-w-[96vw] h-[calc(100vh-32px)] max-h-[calc(100vh-32px)] flex flex-col p-0 gap-0 overflow-hidden">
          <div className="px-7 pt-6 pb-0 shrink-0">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="text-lg font-medium">Smeta elementlarini Excel orqali yuklash</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Excel fayl formati: <strong className="text-foreground font-medium">Nomi</strong> | <strong className="text-foreground font-medium">Birligi</strong> | <strong className="text-foreground font-medium">Miqdori</strong> | <strong className="text-foreground font-medium">Narxi</strong> <span className="text-muted-foreground/60">(1-qator sarlavha)</span>
                </p>
              </div>
            </div>
            {excelError && <div className="mt-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{excelError}</div>}
            <div
              className="mt-4 border border-dashed border-muted-foreground/30 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-primary/50 transition-colors bg-muted/30"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{excelFileName || "Excel faylni tanlang (.xlsx, .xls)"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Bosing yoki faylni bu yerga tashlang</p>
              </div>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelFile} />
            </div>
            {excelRows.length > 0 && (
              <div className="flex items-center gap-2 mt-4 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium">{excelRows.length} ta element topildi</span>
              </div>
            )}
          </div>
          {excelRows.length > 0 && (
            <div className="flex-1 overflow-auto border-t border-border min-h-0">
              <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs w-10">#</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs w-[38%]">Nomi</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs w-[16%]">Birligi</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs w-[12%]">Miqdori</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs w-[18%]">Narxi</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs w-[12%]">Jami</th>
                  </tr>
                </thead>
                <tbody>
                  {excelRows.map((row, i) => (
                    <tr key={i} className="border-t border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-4 py-2.5 break-words leading-snug">{row.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{row.unit}</td>
                      <td className="px-4 py-2.5 text-right">{row.quantity}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{row.unitPrice.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right">{(row.quantity * row.unitPrice).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-6 py-4 flex items-center justify-between border-t border-border bg-muted/30 shrink-0">
            <p className="text-sm text-muted-foreground">
              Jami: <strong className="text-foreground font-medium">{excelRows.length.toLocaleString()}</strong> ta element yuklanadi
            </p>
            <div className="flex gap-2.5">
              <Button variant="outline" onClick={() => setExcelDialogOpen(false)} disabled={excelUploading}>Bekor qilish</Button>
              <Button onClick={handleExcelUpload} disabled={excelRows.length === 0 || excelUploading}>
                {excelUploading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Yuklanmoqda...</>
                  : <><Upload className="h-4 w-4 mr-2" />{excelRows.length} ta element yuklash</>
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
