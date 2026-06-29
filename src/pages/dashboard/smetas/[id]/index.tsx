import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FileSpreadsheet, ChevronLeft, Download, Calendar, Loader2, Package,
  Banknote, TrendingUp, Plus, Edit2, Check, X, Building2, AlertCircle,
  Upload, Trash2,
} from "lucide-react";
import { smetasApi, Smeta, SmetaType } from "@/lib/api/smetas";
import { smetaItemsApi, SmetaItem, SmetaItemType } from "@/lib/api/smeta-items";
import { uploadApi, ParsedSmetaItem } from "@/lib/api/upload";
import { ExcelUpload } from "@/components/dashboard/excel-upload";
import { useAuth } from "@/lib/auth";

const C = {
  blue: "#185fa5",
  blueDark: "#0c447c",
  blueLight: "#eff6ff",
  border: "#dbe7f3",
  muted: "#64748b",
  red: "#ef4444",
  green: "#1d9e75",
  yellow: "#ef9f27",
};

function fmt(n: number) { return n.toLocaleString("uz-UZ"); }
function fmtDate(s: string) { return new Date(s).toLocaleDateString("uz-UZ"); }

const ITEM_TYPE_LABELS: Record<SmetaItemType, string> = {
  WORK: "Ish", MACHINE: "Texnika", MATERIAL: "Material", OTHER: "Boshqa",
};
const ITEM_TYPE_COLORS: Record<SmetaItemType, { bg: string; color: string }> = {
  WORK: { bg: "#dbeafe", color: "#1d4ed8" },
  MACHINE: { bg: "#ede9fe", color: "#7c3aed" },
  MATERIAL: { bg: "#dcfce7", color: "#15803d" },
  OTHER: { bg: "#f1f5f9", color: "#475569" },
};
const SMETA_TYPE_LABELS: Record<SmetaType, string> = {
  CONSTRUCTION: "Qurilish", ELECTRICAL: "Elektr", PLUMBING: "Santexnika",
  HVAC: "HVAC", FINISHING: "Pardozlash", OTHER: "Boshqa",
};

function StatsRow({ itemId }: { itemId: string }) {
  const [stats, setStats] = useState<{
    planned: number; usedQty: number; requestedQty: number;
    remaining: number; overrun: boolean; overrunQty: number; unit: string;
  } | null>(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    smetaItemsApi.getStats(itemId).then(setStats).catch(() => {});
  }, [itemId]);

  if (!stats) return null;

  const usedPct = stats.planned > 0 ? Math.min(100, Math.round((stats.usedQty / stats.planned) * 100)) : 0;
  const reqPct = stats.planned > 0 ? Math.min(100, Math.round(((stats.usedQty + stats.requestedQty) / stats.planned) * 100)) : 0;

  return (
    <div style={{ marginTop: 10, padding: "12px 14px", background: "#f8fbff", border: `1px solid ${stats.overrun ? "#fecaca" : C.border}`, borderRadius: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
        {[
          { label: "Reja", val: `${stats.planned} ${stats.unit}`, color: C.blueDark },
          { label: "Zayavka qilindi", val: `${stats.requestedQty} ${stats.unit}`, color: C.yellow },
          { label: "Sarflandi", val: `${stats.usedQty} ${stats.unit}`, color: C.green },
          { label: stats.overrun ? "Oshib ketdi" : "Qolgan", val: stats.overrun ? `+${stats.overrunQty} ${stats.unit}` : `${stats.remaining} ${stats.unit}`, color: stats.overrun ? C.red : C.blue },
        ].map(({ label, val, color }) => (
          <div key={label}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color }}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{ height: 6, borderRadius: 4, background: "#e2eaf5", overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${reqPct}%`, background: stats.overrun ? "#fca5a5" : "#bfdbfe", borderRadius: 4 }} />
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${usedPct}%`, background: stats.overrun ? C.red : C.blue, borderRadius: 4 }} />
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 10, color: "#94a3b8" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: C.blue, display: "inline-block" }} /> Sarflandi {usedPct}%</span>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#bfdbfe", display: "inline-block" }} /> Zayavka {reqPct}%</span>
      </div>
    </div>
  );
}

export default function SmetaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [smeta, setSmeta] = useState<Smeta | null>(null);
  const [items, setItems] = useState<SmetaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedSmetaItem[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canEditProgress = ["PRORAB", "DIREKTOR", "BOSS"].includes(user?.role ?? "");
  const canUpload = ["DIREKTOR", "BOSS", "PTO", "OPERATOR", "ADMIN"].includes(user?.role ?? "");

  const fetchData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [smetaData, itemsData] = await Promise.all([
        smetasApi.getById(id),
        smetaItemsApi.getAll({ smetaId: id, limit: 5000 }),
      ]);
      setSmeta(smetaData);
      setItems(itemsData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveProgress = async (item: SmetaItem) => {
    const val = parseFloat(editValue);
    if (isNaN(val) || val < 0) return;
    setIsSaving(true);
    try {
      await smetaItemsApi.update(item.id, { usedQuantity: val, usedAmount: val * item.unitPrice });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, usedQuantity: val, usedAmount: val * item.unitPrice } : i));
      setEditingItemId(null);
    } catch { /* ignore */ }
    finally { setIsSaving(false); }
  };

  const handleImport = async () => {
    if (!id || parsedItems.length === 0) return;
    setIsImporting(true);
    setImportError(null);
    try {
      if (parsedItems.length >= 1000 && uploadedFile) {
        setImportProgress(`Import qilinmoqda (${parsedItems.length} ta)...`);
        const result = await uploadApi.directImport(id, uploadedFile, "auto");
        if (result.errors.length > 0) setImportError(`${result.skipped} ta xato`);
        if (result.imported > 0) { await fetchData(); setParsedItems([]); setUploadedFile(null); setShowUpload(false); }
      } else {
        setImportProgress(`Import qilinmoqda (${parsedItems.length} ta)...`);
        const result = await uploadApi.importSmetaItems(id, parsedItems);
        if (result.errors.length > 0) setImportError(result.errors.join("; "));
        if (result.imported > 0) { await fetchData(); setParsedItems([]); setUploadedFile(null); setShowUpload(false); }
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import xatoligi");
    } finally { setIsImporting(false); setImportProgress(null); }
  };

  const handleDeleteAll = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await smetaItemsApi.deleteAllBySmeta(id);
      setItems([]);
      setShowDeleteConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "O'chirishda xatolik");
    } finally { setIsDeleting(false); }
  };

  const plannedBudget = items.reduce((s, i) => s + i.totalAmount, 0);
  const totalUsed = items.reduce((s, i) => s + i.usedAmount, 0);
  const overallPct = plannedBudget > 0 ? Math.min(100, Math.round((totalUsed / plannedBudget) * 100)) : 0;
  const overBudget = plannedBudget > 0 && totalUsed > plannedBudget;

  const ITEMS_PER_PAGE = 20;
  const [itemPage, setItemPage] = useState(1);
  const itemTotalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const pagedItems = items.slice((itemPage - 1) * ITEMS_PER_PAGE, itemPage * ITEMS_PER_PAGE);

  if (isLoading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <Loader2 size={32} color={C.blue} style={{ animation: "spin 1s linear infinite" }} />
    </div>
  );

  if (error || !smeta) return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}>
      <button onClick={() => navigate("/smetas")} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: C.blue, background: "none", border: "none", cursor: "pointer", marginBottom: 16 }}>
        <ChevronLeft size={16} /> Ortga
      </button>
      <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 16, color: C.red, fontSize: 13 }}>
        {error || "Smeta topilmadi"}
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}>
      {/* Back */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => navigate("/smetas")} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: C.blue, background: "none", border: "none", cursor: "pointer", padding: "6px 10px", borderRadius: 8 }}>
          <ChevronLeft size={16} /> Ortga
        </button>
      </div>

      {/* Header + Stats */}
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "20px 24px", background: "#f8fbff", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <FileSpreadsheet size={16} color={C.blue} />
              <span style={{ fontSize: 13, color: C.muted }}>Smeta</span>
              <span style={{ fontSize: 12, fontWeight: 600, background: C.blueLight, color: C.blue, borderRadius: 6, padding: "2px 8px" }}>{SMETA_TYPE_LABELS[smeta.type]}</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.blueDark, margin: 0, marginBottom: 10 }}>{smeta.name}</h1>
            {smeta.description && <p style={{ fontSize: 13, color: C.muted, margin: 0, marginBottom: 8 }}>{smeta.description}</p>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, color: C.muted }}>
              {smeta.projectName && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Building2 size={14} /> {smeta.projectName}</span>}
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={14} /> Yaratilgan: {fmtDate(smeta.createdAt)}</span>
              {smeta.deadline && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={14} /> Muddat: {fmtDate(smeta.deadline)}</span>}
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Package size={14} /> {items.length} ta element</span>
            </div>
          </div>
          <button style={{ display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", fontSize: 13, color: C.muted, cursor: "pointer", whiteSpace: "nowrap" }}>
            <Download size={14} /> Yuklab olish
          </button>
        </div>
        {/* Stats inside header card */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: `1px solid ${C.border}` }}>
          <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, borderRight: `1px solid ${C.border}` }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: C.blueLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Banknote size={17} color={C.blue} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Rejalashtirilgan byudjet</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.blueDark }}>{fmt(plannedBudget)} so'm</div>
            </div>
          </div>
          <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, borderRight: `1px solid ${C.border}` }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: overBudget ? "#fef2f2" : "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <TrendingUp size={17} color={overBudget ? C.red : C.green} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Haqiqiy sarflangan</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: overBudget ? C.red : C.blueDark }}>{fmt(totalUsed)} so'm</div>
            </div>
          </div>
          <div style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: C.muted }}>Umumiy bajarilish</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: overBudget ? C.red : C.blueDark }}>{overallPct}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, background: "#e2eaf5", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${overallPct}%`, background: overBudget ? C.red : C.blue, borderRadius: 4 }} />
            </div>
            {overBudget && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: 11, color: C.red }}>
                <AlertCircle size={11} /> {fmt(totalUsed - plannedBudget)} so'm oshdi
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Excel upload */}
      {showUpload && canUpload && (
        <div style={{ marginBottom: 16 }}>
          <ExcelUpload<ParsedSmetaItem>
            title="Excel dan smeta elementlarini yuklash"
            description="Smeta elementlarini o'z ichiga olgan Excel faylini yuklang"
            onParsed={(data, warnings, file) => { setParsedItems(data); if (file) setUploadedFile(file); if (warnings.length) console.log(warnings); }}
            parseFunction={uploadApi.parseSmetaItems}
            supportsAi={true}
          />
          {parsedItems.length > 0 && (
            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, marginTop: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.blueDark, marginBottom: 12 }}>{parsedItems.length} ta element topildi</div>
              <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 12 }}>
                {parsedItems.slice(0, 10).map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "6px 8px", background: "#f8fbff", borderRadius: 6, marginBottom: 4 }}>
                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                    <span style={{ color: C.muted }}>{item.quantity} {item.unit} × {fmt(item.unitPrice)}</span>
                  </div>
                ))}
                {parsedItems.length > 10 && <p style={{ fontSize: 12, color: C.muted, textAlign: "center" }}>... va yana {parsedItems.length - 10} ta</p>}
              </div>
              {importError && <div style={{ fontSize: 12, color: C.red, marginBottom: 12 }}>{importError}</div>}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => { setParsedItems([]); setUploadedFile(null); setShowUpload(false); }} style={{ height: 36, padding: "0 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", fontSize: 13, color: C.muted, cursor: "pointer" }}>Bekor qilish</button>
                <button onClick={handleImport} disabled={isImporting} style={{ height: 36, padding: "0 16px", borderRadius: 8, border: "none", background: isImporting ? "#94a3b8" : C.blue, fontSize: 13, fontWeight: 600, color: "#fff", cursor: isImporting ? "not-allowed" : "pointer" }}>
                  {isImporting ? (importProgress || "Import qilinmoqda...") : `Import qilish (${parsedItems.length})`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 14, padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AlertCircle size={18} color={C.red} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.red }}>Barcha elementlarni o'chirish</div>
              <div style={{ fontSize: 12, color: C.muted }}>{items.length} ta element o'chiriladi. Bu amalni qaytarib bo'lmaydi!</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowDeleteConfirm(false)} style={{ height: 34, padding: "0 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", fontSize: 13, color: C.muted, cursor: "pointer" }}>Bekor qilish</button>
            <button onClick={handleDeleteAll} disabled={isDeleting} style={{ height: 34, padding: "0 14px", borderRadius: 8, border: "none", background: C.red, fontSize: 13, fontWeight: 600, color: "#fff", cursor: isDeleting ? "not-allowed" : "pointer" }}>
              {isDeleting ? "O'chirilmoqda..." : "Ha, o'chirish"}
            </button>
          </div>
        </div>
      )}

      {/* Items */}
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, background: "#f8fbff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Package size={16} color={C.blue} />
            <span style={{ fontSize: 14, fontWeight: 600, color: C.blueDark }}>Smeta elementlari</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {canUpload && items.length > 0 && (
              <button onClick={() => setShowDeleteConfirm(true)} style={{ height: 34, padding: "0 12px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", fontSize: 12, color: C.red, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <Trash2 size={13} /> Hammasini o'chirish
              </button>
            )}
            {canUpload && (
              <button onClick={() => setShowUpload(!showUpload)} style={{ height: 34, padding: "0 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: showUpload ? C.blueLight : "#fff", fontSize: 12, color: C.blue, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <Upload size={13} /> Excel yuklash
              </button>
            )}
            <button onClick={() => navigate(`/smetas/${id}/add-item`)} style={{ height: 34, padding: "0 14px", borderRadius: 8, border: "none", background: C.blue, fontSize: 12, fontWeight: 600, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <Plus size={13} /> Element qo'shish
            </button>
          </div>
        </div>

        <div style={{ padding: "16px 20px" }}>
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: C.muted }}>
              <Package size={40} color="#dbe7f3" style={{ margin: "0 auto 12px" }} />
              <p style={{ fontSize: 14, marginBottom: 16 }}>Bu smetada hali elementlar yo'q</p>
              <button onClick={() => navigate(`/smetas/${id}/add-item`)} style={{ height: 38, padding: "0 18px", borderRadius: 8, border: "none", background: C.blue, fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Plus size={14} /> Birinchi elementni qo'shing
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pagedItems.map((item) => {
                const isEditing = editingItemId === item.id;
                const progress = item.quantity > 0 ? Math.min(100, Math.round((item.usedQuantity / item.quantity) * 100)) : 0;
                const itemOver = item.usedQuantity > item.quantity;
                const tc = ITEM_TYPE_COLORS[item.itemType];

                return (
                  <div key={item.id} style={{ border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", background: "#fafcff" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 15, fontWeight: 600, color: C.blueDark }}>{item.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, background: tc.bg, color: tc.color, borderRadius: 6, padding: "2px 7px" }}>{ITEM_TYPE_LABELS[item.itemType]}</span>
                        </div>
                        <div style={{ fontSize: 12, color: C.muted }}>{item.code || item.category}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.blueDark }}>{fmt(item.totalAmount)} so'm</div>
                        <div style={{ fontSize: 12, color: C.muted }}>{fmt(item.quantity)} {item.unit} × {fmt(item.unitPrice)}</div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: C.muted }}>Ishlatilgan</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {isEditing ? (
                            <>
                              <input
                                type="number" step="0.01" min="0"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                autoFocus
                                style={{ width: 80, height: 28, border: `1px solid ${C.border}`, borderRadius: 6, padding: "0 8px", fontSize: 13, color: C.blueDark, outline: "none" }}
                              />
                              <span style={{ fontSize: 12, color: C.muted }}>/ {fmt(item.quantity)} {item.unit}</span>
                              <button onClick={() => saveProgress(item)} disabled={isSaving} style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "#f0fdf4", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {isSaving ? <Loader2 size={13} color={C.green} /> : <Check size={13} color={C.green} />}
                              </button>
                              <button onClick={() => setEditingItemId(null)} style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "#f8fafc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <X size={13} color={C.muted} />
                              </button>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: 13, fontWeight: 600, color: itemOver ? C.red : C.blueDark }}>
                                {fmt(item.usedQuantity)} / {fmt(item.quantity)} {item.unit}
                              </span>
                              {canEditProgress && (
                                <button onClick={() => { setEditingItemId(item.id); setEditValue(item.usedQuantity.toString()); }} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${C.border}`, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <Edit2 size={12} color={C.blue} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "#e2eaf5", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${progress}%`, background: itemOver ? C.red : C.blue, borderRadius: 3 }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: C.muted }}>
                        <span>Sarflangan: {fmt(item.usedAmount)} so'm</span>
                        <span>{progress}%</span>
                      </div>
                    </div>
                    <StatsRow itemId={item.id} />
                  </div>
                );
              })}
            </div>
          )}
          {/* Pagination */}
          {items.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 12, color: C.muted }}>
                {(itemPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(itemPage * ITEMS_PER_PAGE, items.length)} / {items.length} ta element
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => setItemPage(p => Math.max(1, p - 1))}
                  disabled={itemPage === 1}
                  style={{ height: 32, padding: "0 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: itemPage === 1 ? "#f8fafc" : "#fff", fontSize: 13, color: itemPage === 1 ? "#cbd5e1" : C.blueDark, cursor: itemPage === 1 ? "not-allowed" : "pointer" }}
                >← Oldingi</button>
                <span style={{ height: 32, padding: "0 14px", display: "flex", alignItems: "center", fontSize: 13, color: C.muted }}>
                  {itemPage} / {itemTotalPages}
                </span>
                <button
                  onClick={() => setItemPage(p => Math.min(itemTotalPages, p + 1))}
                  disabled={itemPage === itemTotalPages}
                  style={{ height: 32, padding: "0 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: itemPage === itemTotalPages ? "#f8fafc" : "#fff", fontSize: 13, color: itemPage === itemTotalPages ? "#cbd5e1" : C.blueDark, cursor: itemPage === itemTotalPages ? "not-allowed" : "pointer" }}
                >Keyingi →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
