import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FileSpreadsheet, ChevronLeft, AlertCircle } from "lucide-react";
import { smetasApi, SmetaType, CreateSmetaRequest } from "@/lib/api/smetas";
import { projectsApi, Project } from "@/lib/api/projects";
import { useProject } from "@/lib/project-context";

const C = {
  blue: "#185fa5",
  blueDark: "#0c447c",
  blueLight: "#eff6ff",
  border: "#dbe7f3",
  muted: "#64748b",
  text: "#0f172a",
  red: "#ef4444",
};

const SMETA_TYPES: { value: SmetaType; label: string }[] = [
  { value: "CONSTRUCTION", label: "Qurilish" },
  { value: "ELECTRICAL", label: "Elektr" },
  { value: "PLUMBING", label: "Santexnika" },
  { value: "HVAC", label: "HVAC" },
  { value: "FINISHING", label: "Pardozlash" },
  { value: "OTHER", label: "Boshqa" },
];

function parseNumber(value: string): number {
  return parseInt(value.replace(/[^\d]/g, ""), 10) || 0;
}

function formatNumberInput(value: number): string {
  if (value === 0) return "";
  return value.toLocaleString("uz-UZ");
}

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

export default function NewSmetaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedProjectId } = useProject();
  const preselectedProjectId = searchParams.get("projectId") || selectedProjectId || "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    projectId: preselectedProjectId,
    name: "",
    type: "CONSTRUCTION" as SmetaType,
    description: "",
    budget: 0,
    budgetDisplay: "",
    deadline: "",
    overheadPercent: 17.27,
  });

  useEffect(() => {
    projectsApi.getAll({ limit: 100 }).then(r => setProjects(r.data)).catch(() => {});
  }, []);

  const handleBudgetChange = (value: string) => {
    const num = parseNumber(value);
    setFormData(p => ({ ...p, budget: num, budgetDisplay: formatNumberInput(num) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId) { setError("Loyihani tanlash shart"); return; }
    if (!formData.name.trim()) { setError("Smeta nomini kiriting"); return; }
    setIsLoading(true);
    setError(null);
    try {
      const payload: CreateSmetaRequest = {
        projectId: formData.projectId,
        name: formData.name.trim(),
        type: formData.type,
        description: formData.description.trim() || undefined,
        budget: formData.budget,
        deadline: formData.deadline || undefined,
        overheadPercent: formData.overheadPercent,
      };
      const smeta = await smetasApi.create(payload);
      navigate(`/smetas/${smeta.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Smeta yaratishda xatolik");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => navigate("/smetas")}
          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: C.blue, background: "none", border: "none", cursor: "pointer", padding: "6px 10px", borderRadius: 8 }}
        >
          <ChevronLeft size={16} /> Orqaga
        </button>
      </div>

      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
        {/* Title */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, background: "#f8fbff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileSpreadsheet size={20} color={C.blue} />
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: C.blueDark, margin: 0 }}>Yangi smeta yaratish</p>
              <p style={{ fontSize: 12, color: C.muted, margin: 0, marginTop: 2 }}>Barcha maydonlarni to'ldiring</p>
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

          {/* Loyiha */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Loyiha *</label>
            <select
              value={formData.projectId}
              onChange={e => setFormData(p => ({ ...p, projectId: e.target.value }))}
              style={{ ...inputStyle }}
            >
              <option value="">— Tanlang —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Smeta nomi */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Smeta nomi *</label>
            <input
              style={inputStyle}
              placeholder="Masalan: Poydevor ishlari"
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
            />
          </div>

          {/* Smeta turi */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Smeta turi</label>
            <select
              value={formData.type}
              onChange={e => setFormData(p => ({ ...p, type: e.target.value as SmetaType }))}
              style={inputStyle}
            >
              {SMETA_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Tavsif */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Tavsif</label>
            <textarea
              style={{ ...inputStyle, height: 88, padding: "10px 12px", resize: "vertical" }}
              placeholder="Smeta haqida qo'shimcha ma'lumot..."
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
            />
          </div>

          {/* Byudjet + Muddat */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Rejalashtirilgan byudjet</label>
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...inputStyle, paddingRight: 44 }}
                  placeholder="0"
                  value={formData.budgetDisplay}
                  onChange={e => handleBudgetChange(e.target.value)}
                />
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: C.muted }}>so'm</span>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Muddat</label>
              <input
                type="date"
                style={inputStyle}
                value={formData.deadline}
                onChange={e => setFormData(p => ({ ...p, deadline: e.target.value }))}
              />
            </div>
          </div>

          {/* Overhead */}
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>Qo'shimcha xarajatlar foizi (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              style={inputStyle}
              value={formData.overheadPercent}
              onChange={e => setFormData(p => ({ ...p, overheadPercent: parseFloat(e.target.value) || 0 }))}
            />
            <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Standart qiymat: 17.27%</p>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              onClick={() => navigate("/smetas")}
              style={{ height: 40, padding: "0 20px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", fontSize: 13, color: C.muted, cursor: "pointer" }}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{ height: 40, padding: "0 24px", borderRadius: 8, border: "none", background: isLoading ? "#94a3b8" : C.blue, fontSize: 13, fontWeight: 600, color: "#fff", cursor: isLoading ? "not-allowed" : "pointer" }}
            >
              {isLoading ? "Yaratilmoqda..." : "Yaratish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
