import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Package, ChevronLeft, AlertCircle, Save } from "lucide-react";
import { smetasApi, Smeta } from "@/lib/api/smetas";
import { smetaItemsApi, SmetaItemType, CreateSmetaItemRequest } from "@/lib/api/smeta-items";

const C = {
  blue: "#185fa5",
  blueDark: "#0c447c",
  blueLight: "#eff6ff",
  border: "#dbe7f3",
  muted: "#64748b",
  text: "#0f172a",
  red: "#ef4444",
};

const ITEM_TYPES: { value: SmetaItemType; label: string }[] = [
  { value: "MATERIAL", label: "Material" },
  { value: "WORK", label: "Ish" },
  { value: "MACHINE", label: "Texnika" },
  { value: "OTHER", label: "Boshqa" },
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 40,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "0 12px",
  fontSize: 13,
  color: C.blueDark,
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: C.muted,
  marginBottom: 6,
  display: "block",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

function parseNumber(value: string): number {
  return parseFloat(value.replace(/[^\d.]/g, "")) || 0;
}

function formatNumberInput(value: number): string {
  if (value === 0) return "";
  return value.toLocaleString("uz-UZ");
}

export default function AddSmetaItemPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [smeta, setSmeta] = useState<Smeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    itemType: "MATERIAL" as SmetaItemType,
    category: "",
    code: "",
    name: "",
    unit: "",
    quantity: 0,
    quantityDisplay: "",
    unitPrice: 0,
    unitPriceDisplay: "",
  });

  useEffect(() => {
    if (!id) return;
    smetasApi.getById(id).then(setSmeta).catch(() => {});
  }, [id]);

  const handleQuantityChange = (value: string) => {
    const num = parseNumber(value);
    setFormData(p => ({ ...p, quantity: num, quantityDisplay: formatNumberInput(num) }));
  };

  const handleUnitPriceChange = (value: string) => {
    const num = parseNumber(value);
    setFormData(p => ({ ...p, unitPrice: num, unitPriceDisplay: formatNumberInput(num) }));
  };

  const totalAmount = formData.quantity * formData.unitPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!formData.name.trim()) { setError("Element nomini kiriting"); return; }
    if (!formData.unit.trim()) { setError("O'lchov birligini kiriting"); return; }
    if (formData.quantity <= 0) { setError("Miqdorni kiriting"); return; }
    if (formData.unitPrice <= 0) { setError("Narxni kiriting"); return; }

    setIsLoading(true);
    setError(null);
    try {
      const payload: CreateSmetaItemRequest = {
        smetaId: id,
        itemType: formData.itemType,
        category: formData.category.trim() || formData.itemType,
        code: formData.code.trim() || undefined,
        name: formData.name.trim(),
        unit: formData.unit.trim(),
        quantity: formData.quantity,
        unitPrice: formData.unitPrice,
      };
      await smetaItemsApi.create(payload);
      navigate(`/smetas/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Element qo'shishda xatolik");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}>
      {/* Back */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => navigate(`/smetas/${id}`)}
          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: C.blue, background: "none", border: "none", cursor: "pointer", padding: "6px 10px", borderRadius: 8 }}
        >
          <ChevronLeft size={16} /> Ortga
        </button>
      </div>

      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, background: "#f8fbff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Package size={20} color={C.blue} />
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: C.blueDark, margin: 0 }}>Yangi element qo'shish</p>
              <p style={{ fontSize: 12, color: C.muted, margin: 0, marginTop: 2 }}>
                {smeta ? `"${smeta.name}" smetasiga yangi element qo'shing` : "Smetaga yangi element qo'shing"}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: C.red }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Element turi + Kategoriya */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Element turi</label>
              <select
                value={formData.itemType}
                onChange={e => setFormData(p => ({ ...p, itemType: e.target.value as SmetaItemType }))}
                style={inputStyle}
              >
                {ITEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Kategoriya</label>
              <input
                style={inputStyle}
                placeholder="Masalan: Beton ishlari"
                value={formData.category}
                onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
              />
            </div>
          </div>

          {/* Kod + Nomi */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Kod (ixtiyoriy)</label>
              <input
                style={inputStyle}
                placeholder="Masalan: EP-01-001"
                value={formData.code}
                onChange={e => setFormData(p => ({ ...p, code: e.target.value }))}
              />
            </div>
            <div>
              <label style={labelStyle}>Nomi *</label>
              <input
                style={inputStyle}
                placeholder="Masalan: Beton M200"
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              />
            </div>
          </div>

          {/* Miqdor + Narx */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Miqdori * <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(o'lchov birligi yonida)</span></label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="0"
                  value={formData.quantityDisplay}
                  onChange={e => handleQuantityChange(e.target.value)}
                />
                <input
                  style={{ ...inputStyle, width: 100, flex: "none", textAlign: "center" }}
                  placeholder="dona, m³..."
                  value={formData.unit}
                  onChange={e => setFormData(p => ({ ...p, unit: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Birlik narxi *</label>
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...inputStyle, paddingRight: 44 }}
                  placeholder="0"
                  value={formData.unitPriceDisplay}
                  onChange={e => handleUnitPriceChange(e.target.value)}
                />
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: C.muted }}>so'm</span>
              </div>
            </div>
          </div>

          {/* Jami */}
          {totalAmount > 0 && (
            <div style={{ background: C.blueLight, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: C.muted }}>Jami summa:</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.blueDark }}>{totalAmount.toLocaleString("uz-UZ")} so'm</span>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              onClick={() => navigate(`/smetas/${id}`)}
              style={{ height: 40, padding: "0 20px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", fontSize: 13, color: C.muted, cursor: "pointer" }}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{ height: 40, padding: "0 24px", borderRadius: 8, border: "none", background: isLoading ? "#94a3b8" : C.blue, fontSize: 13, fontWeight: 600, color: "#fff", cursor: isLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}
            >
              <Save size={14} />
              {isLoading ? "Qo'shilmoqda..." : "Qo'shish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
