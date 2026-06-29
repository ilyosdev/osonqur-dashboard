import { useState } from "react";
import {
  Store, DollarSign, History, Plus,
  Phone, ChevronRight, CheckCircle,
  Loader2, Search, CreditCard, Briefcase,
  ClipboardList, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useApi } from "@/hooks/use-api";
import { TablePagination } from "@/components/shared/table-pagination";
import { useAuth } from "@/lib/auth";
import { suppliersApi, Supplier, SupplierDebt } from "@/lib/api/suppliers";
import { analyticsApi } from "@/lib/api/analytics";
import { useProject } from "@/lib/project-context";

function fmt(num: number) {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + " mln";
  return num.toLocaleString("uz-UZ");
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("uz-UZ", { day: "numeric", month: "short", year: "numeric" });
}

const C = {
  blue:    "#185fa5",
  blueBg:  "#e6f1fb",
  border:  "#daeaf8",
  text:    "#0c447c",
  muted:   "#85b7eb",
  red:     "#A32D2D",
  redBg:   "#FDECEA",
  green:   "#3B6D11",
  greenBg: "#EAF3DE",
  th:      "#378add",
};

type Tab = "royxat" | "tolov_tarixi";
type DetailTab = "qarzlar" | "tolov_tarixi";

function EmptyState({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div style={{ padding: "52px 20px", textAlign: "center", color: C.muted }}>
      <Icon size={36} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
      <p style={{ fontSize: 13 }}>{text}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ padding: 16 }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ height: 54, background: "#f0f7ff", borderRadius: 8, marginBottom: 8 }} />
      ))}
    </div>
  );
}

export default function SuppliersPage() {
  const { hasPermission } = useAuth();
  const { selectedProjectId } = useProject();

  const canCreate  = hasPermission("supplier:create");
  const canPayDebt = hasPermission("supplier_debt:pay");
  const canViewDebt = hasPermission("supplier_debt:view") || hasPermission("debt:view");

  const [tab, setTab]           = useState<Tab>("royxat");
  const [detailTab, setDetailTab] = useState<DetailTab>("qarzlar");
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);
  const PAGE_SIZE = 10;
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [debtPage, setDebtPage] = useState(1);
  const [paidPage, setPaidPage] = useState(1);
  const DEBT_PAGE = 10;

  const [showAdd, setShowAdd]   = useState(false);
  const [addForm, setAddForm]   = useState({ name: "", phone: "", contactPerson: "", address: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [showPay, setShowPay]   = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payOriginalAmount, setPayOriginalAmount] = useState("");
  const [payReason, setPayReason] = useState("");
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [payingDebtId, setPayingDebtId] = useState<string | null>(null);

  // ─── Data ────────────────────────────────────────────────────────────────
  const { data: suppliersData, loading: suppliersLoading, refetch: refetchSuppliers } =
    useApi(() => suppliersApi.getAll({ limit: 200 }), []);

  const { data: debtsAnalytics, loading: debtsLoading, refetch: refetchDebts } =
    useApi(() => analyticsApi.getSupplierDebts(undefined), []);

  const { data: unpaidDebtsData, loading: unpaidLoading, refetch: refetchUnpaid } =
    useApi(
      () => selectedSupplier ? suppliersApi.getDebts(selectedSupplier.id, { isPaid: false, limit: 200 }) : Promise.resolve(null),
      [selectedSupplier?.id],
      { enabled: !!selectedSupplier }
    );

  const { data: paidDebtsData, loading: paidLoading, refetch: refetchPaid } =
    useApi(
      () => selectedSupplier ? suppliersApi.getDebts(selectedSupplier.id, { isPaid: true, limit: 200 }) : Promise.resolve(null),
      [selectedSupplier?.id],
      { enabled: !!selectedSupplier }
    );

  const suppliers: Supplier[]    = suppliersData?.data || [];
  const debtSuppliers            = debtsAnalytics?.suppliers || [];
  const totalDebt                = debtsAnalytics?.totalDebt || 0;
  const unpaidList: SupplierDebt[] = unpaidDebtsData?.data || [];
  const paidList: SupplierDebt[]   = paidDebtsData?.data || [];

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.phone || "").includes(search)
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const debtTotalPages = Math.ceil(unpaidList.length / DEBT_PAGE);
  const pagedUnpaid    = unpaidList.slice((debtPage - 1) * DEBT_PAGE, debtPage * DEBT_PAGE);
  const paidTotalPages = Math.ceil(paidList.length / DEBT_PAGE);
  const pagedPaid      = paidList.slice((paidPage - 1) * DEBT_PAGE, paidPage * DEBT_PAGE);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!addForm.name.trim()) return;
    setAddLoading(true); setAddError(null);
    try {
      await suppliersApi.create({ name: addForm.name, phone: addForm.phone || undefined, contactPerson: addForm.contactPerson || undefined, address: addForm.address || undefined });
      setShowAdd(false); setAddForm({ name: "", phone: "", contactPerson: "", address: "" }); refetchSuppliers();
    } catch (e: any) { setAddError(e?.message || "Xatolik"); }
    finally { setAddLoading(false); }
  };

  const handlePay = async () => {
    if (!payingDebtId) return;
    setPayLoading(true); setPayError(null);
    try {
      await suppliersApi.payDebt(payingDebtId, Number(payAmount) || undefined, selectedProjectId || undefined);
      setShowPay(false); setPayingDebtId(null); setPayAmount(""); setPayOriginalAmount(""); setPayReason("");
      refetchDebts(); refetchUnpaid(); refetchPaid();
    } catch (e: any) { setPayError(e?.message || "Xatolik"); }
    finally { setPayLoading(false); }
  };

  const openPayDialog = (debt: { id: string; amount: number; reason?: string; description?: string }) => {
    setPayingDebtId(debt.id);
    setPayAmount(String(debt.amount));
    setPayOriginalAmount(String(debt.amount));
    setPayReason(debt.reason || debt.description || "");
    setPayError(null);
    setShowPay(true);
  };

  // ─── Supplier detail (workers profile uslubida) ───────────────────────────
  if (selectedSupplier) {
    const debtInfo  = debtSuppliers.find(d => d.supplierId === selectedSupplier.id);
    const totalOwed = debtInfo?.totalDebt || 0;
    const initials  = selectedSupplier.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

    return (
      <>
        <div className="animate-fade-in -mx-3 md:-mx-4 xl:-mx-5 2xl:-mx-6 -mt-4"
          style={{ background: "#fff", minHeight: "calc(100vh - 4rem)" }}>
          <div className="flex" style={{ background: "#fff", minHeight: "calc(100vh - 4rem)", alignItems: "stretch" }}>

            {/* LEFT SIDEBAR */}
            <div className="w-[260px] xl:w-[300px] shrink-0 bg-white border-r border-[#daeaf8] p-6 flex flex-col gap-6 hidden md:flex">
              <button onClick={() => setSelectedSupplier(null)}
                className="self-start flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12px] font-medium bg-[#e6f1fb] text-[#185fa5] hover:bg-[#d4e8f8] transition-colors">
                ← Postavshiklar
              </button>

              {/* Avatar */}
              <div className="text-center">
                <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-br from-[#378add] to-[#0c447c] mx-auto mb-3">
                  <div className="w-full h-full rounded-full bg-[#185fa5] flex items-center justify-center text-white text-xl font-semibold">
                    {initials}
                  </div>
                </div>
                <p className="text-[16px] font-semibold text-[#0c447c]">{selectedSupplier.name}</p>
                <p className="text-[12px] text-[#378add] mt-0.5">Postavshik</p>
                <div className="inline-flex items-center gap-1.5 mt-2 text-[11px] text-[#3B6D11] bg-[#EAF3DE] px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3B6D11]" />
                  Faol postavshik
                </div>
              </div>

              {/* Info rows */}
              <div className="flex flex-col gap-2.5">
                {selectedSupplier.phone && (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[#f8fbff] rounded-[10px] border border-[#edf4fb]">
                    <div className="w-7 h-7 rounded-lg bg-[#e6f1fb] text-[#185fa5] flex items-center justify-center shrink-0">
                      <Phone className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#85b7eb] font-medium">Telefon</p>
                      <p className="text-[12px] text-[#0c447c] font-medium">{selectedSupplier.phone}</p>
                    </div>
                  </div>
                )}
                {(selectedSupplier as any).contactPerson && (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[#f8fbff] rounded-[10px] border border-[#edf4fb]">
                    <div className="w-7 h-7 rounded-lg bg-[#e6f1fb] text-[#185fa5] flex items-center justify-center shrink-0">
                      <Briefcase className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#85b7eb] font-medium">Mas'ul shaxs</p>
                      <p className="text-[12px] text-[#0c447c] font-medium">{(selectedSupplier as any).contactPerson}</p>
                    </div>
                  </div>
                )}
                {(selectedSupplier as any).address && (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[#f8fbff] rounded-[10px] border border-[#edf4fb]">
                    <div className="w-7 h-7 rounded-lg bg-[#e6f1fb] text-[#185fa5] flex items-center justify-center shrink-0">
                      <Store className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#85b7eb] font-medium">Manzil</p>
                      <p className="text-[12px] text-[#0c447c] font-medium">{(selectedSupplier as any).address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT MAIN */}
            <div className="flex-1 p-5 flex flex-col gap-4" style={{ height: "100vh", overflowY: "auto" }}>

              {/* Stat cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-[14px] bg-white border border-[#daeaf8] p-4">
                  <p className="text-[22px] font-semibold text-[#0c447c] leading-none">{unpaidList.length}</p>
                  <p className="text-[11px] text-[#85b7eb] mt-1">To'lanmagan qarzlar</p>
                  <p className="text-[11px] text-[#85b7eb] mt-0.5">{paidList.length} ta to'lov amalga oshirilgan</p>
                </div>
                <div className="rounded-[14px] bg-white border border-[#daeaf8] p-4">
                  <p className="text-[22px] font-semibold text-[#0c447c] leading-none">
                    {fmt(paidList.reduce((s, d) => s + d.amount, 0))}
                  </p>
                  <p className="text-[11px] text-[#85b7eb] mt-1">To'langan (so'm)</p>
                  <p className="text-[11px] text-[#3B6D11] mt-0.5">↑ Barcha to'lovlar</p>
                </div>
                <div className={`rounded-[14px] border p-4 ${totalOwed > 0 ? "bg-[#fff5f5] border-[#fecaca]" : "bg-white border-[#daeaf8]"}`}>
                  <p className={`text-[22px] font-semibold leading-none ${totalOwed > 0 ? "text-[#dc2626]" : "text-[#0c447c]"}`}>
                    {fmt(totalOwed)}
                  </p>
                  <p className="text-[11px] text-[#85b7eb] mt-1">To'lanmagan (so'm)</p>
                  <p className={`text-[11px] mt-0.5 ${totalOwed > 0 ? "text-[#ef4444]" : "text-[#85b7eb]"}`}>
                    {unpaidList.length} ta qarz kutmoqda
                  </p>
                </div>
              </div>

              {/* Tabs + button */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-1 bg-white rounded-[10px] p-1 border border-[#daeaf8] w-fit">
                  {(["qarzlar", "tolov_tarixi"] as DetailTab[]).map((t, i) => (
                    <button key={t} onClick={() => setDetailTab(t)}
                      className={`px-4 py-1.5 rounded-[7px] text-[12px] font-medium transition-all ${
                        detailTab === t ? "bg-[#185fa5] text-white" : "text-[#85b7eb] hover:text-[#185fa5]"
                      }`}>
                      {["Qarzlar", "To'lov tarixi"][i]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Panel */}
              <div className="flex-1 flex flex-col min-h-0">

                {/* Qarzlar tab */}
                {detailTab === "qarzlar" && (
                  <div className="bg-white rounded-[16px] border border-[#daeaf8] overflow-hidden flex-1 flex flex-col">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#f0f7ff]">
                      <span className="text-[12px] font-semibold text-[#0c447c] uppercase tracking-wide flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-[#378add]" /> Qarzlar tarixi
                      </span>
                      <span className="text-[11px] text-[#85b7eb]">{unpaidList.length} ta to'lanmagan</span>
                    </div>
                    {unpaidLoading ? (
                      <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-[#f8fbff] rounded-lg animate-pulse" />)}</div>
                    ) : unpaidList.length === 0 ? (
                      <div className="py-10 text-center text-[12px] text-[#85b7eb]">To'lanmagan qarzlar yo'q</div>
                    ) : (
                      <table className="w-full text-[12px] border-collapse">
                        <thead>
                          <tr className="border-b border-[#f0f7ff] bg-[#f8fbff]">
                            <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-[#378add] uppercase tracking-[0.04em]">#</th>
                            <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-[#378add] uppercase tracking-[0.04em]">Summa</th>
                            <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-[#378add] uppercase tracking-[0.04em]">Nima olindi</th>
                            <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-[#378add] uppercase tracking-[0.04em]">Sana</th>
                            {canPayDebt && <th className="px-5 py-2.5"></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {pagedUnpaid.map((debt, i) => (
                            <tr key={debt.id} className="border-b border-[#f5f9fe] hover:bg-[#f8fbff]">
                              <td className="px-5 py-3 text-[#85b7eb]">{String((debtPage - 1) * DEBT_PAGE + i + 1).padStart(2, "0")}</td>
                              <td className="px-5 py-3 font-semibold text-[#A32D2D]">{fmt(debt.amount - (debt.paidAmount || 0))} so'm</td>
                              <td className="px-5 py-3 text-[#0c447c]">{debt.reason || debt.description || "—"}</td>
                              <td className="px-5 py-3 text-[#85b7eb]">{fmtDate(debt.createdAt)}</td>
                              {canPayDebt && (
                                <td className="px-5 py-3">
                                  <button onClick={() => openPayDialog(debt)}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[11px] font-semibold text-white transition-colors hover:opacity-90"
                                    style={{ background: "#166534" }}>
                                    <CheckCircle className="h-3 w-3" /> To'lash
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    <TablePagination page={debtPage} totalPages={debtTotalPages || 1} onPageChange={setDebtPage}
                      summary={`${(debtPage-1)*DEBT_PAGE+1}–${Math.min(debtPage*DEBT_PAGE, unpaidList.length)} / ${unpaidList.length} ta`} />
                  </div>
                )}

                {/* To'lov tarixi tab */}
                {detailTab === "tolov_tarixi" && (
                  <div className="bg-white rounded-[16px] border border-[#daeaf8] overflow-hidden flex-1 flex flex-col">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#f0f7ff]">
                      <span className="text-[12px] font-semibold text-[#0c447c] uppercase tracking-wide flex items-center gap-1.5">
                        <ClipboardList className="h-3.5 w-3.5 text-[#378add]" /> To'lov tarixi
                      </span>
                      <span className="text-[11px] text-[#85b7eb]">{paidList.length} ta to'lov</span>
                    </div>
                    {paidLoading ? (
                      <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-[#f8fbff] rounded-lg animate-pulse" />)}</div>
                    ) : paidList.length === 0 ? (
                      <div className="py-10 text-center text-[12px] text-[#85b7eb]">To'lovlar tarixi yo'q</div>
                    ) : (
                      <table className="w-full text-[12px] border-collapse">
                        <thead>
                          <tr className="border-b border-[#f0f7ff] bg-[#f8fbff]">
                            <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-[#378add] uppercase tracking-[0.04em]">#</th>
                            <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-[#378add] uppercase tracking-[0.04em]">Summa</th>
                            <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-[#378add] uppercase tracking-[0.04em]">Nima olindi</th>
                            <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-[#378add] uppercase tracking-[0.04em]">Sana</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagedPaid.map((debt, i) => (
                            <tr key={debt.id} className="border-b border-[#f5f9fe] hover:bg-[#f8fbff]">
                              <td className="px-5 py-3 text-[#85b7eb]">{String((paidPage - 1) * DEBT_PAGE + i + 1).padStart(2, "0")}</td>
                              <td className="px-5 py-3 font-semibold text-[#3B6D11]">{fmt(debt.amount)} so'm</td>
                              <td className="px-5 py-3 text-[#0c447c]">{debt.reason || debt.description || "—"}</td>
                              <td className="px-5 py-3 text-[#85b7eb]">{fmtDate(debt.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    <TablePagination page={paidPage} totalPages={paidTotalPages || 1} onPageChange={setPaidPage}
                      summary={`${(paidPage-1)*DEBT_PAGE+1}–${Math.min(paidPage*DEBT_PAGE, paidList.length)} / ${paidList.length} ta`} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {renderDialogs()}
      </>
    );
  }

  // ─── Main view ────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 20, fontWeight: 700, color: C.text }}>Postavshiklar</p>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            {suppliers.length} ta postavshik
            {canViewDebt && totalDebt > 0 && ` • ${fmt(totalDebt)} so'm qarz`}
          </p>
        </div>
      </div>

      {/* Tab bar — faqat 2 ta: Postavshiklar | To'lov tarixi */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: 4, marginBottom: 16 }}>
        {([
          { id: "royxat", label: "Postavshiklar", icon: Store },
          { id: "tolov_tarixi", label: "To'lov tarixi", icon: History },
        ] as { id: Tab; label: string; icon: LucideIcon }[]).map(({ id, label, icon: Icon }) => {
          const on = tab === id;
          return (
            <button key={id} onClick={() => setTab(id)} style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "9px 8px", borderRadius: 9, border: "none",
              background: on ? C.blue : "transparent",
              color: on ? "#fff" : C.muted,
              fontSize: 12, fontWeight: 500, cursor: "pointer",
              boxShadow: on ? "0 2px 8px rgba(24,95,165,.3)" : "none", transition: "all .15s",
            }}>
              <Icon size={14} /> {label}
            </button>
          );
        })}
      </div>

      {/* ── Postavshiklar ro'yxati ── */}
      {tab === "royxat" && (
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: "calc(100vh - 220px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: `1px solid #f0f7ff` }}>
            <div style={{ flex: 1, position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.muted }} />
              <input placeholder="Qidirish..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ width: "100%", padding: "9px 12px 9px 30px", border: `1px solid ${C.border}`, borderRadius: 9, fontSize: 13, background: "#f8fbff", color: C.text, outline: "none", boxSizing: "border-box" }} />
            </div>
            {canCreate && (
              <button onClick={() => setShowAdd(true)} style={{
                display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                padding: "9px 16px", border: "none", borderRadius: 9,
                background: C.blue, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                <Plus size={14} /> Qo'shish
              </button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr", padding: "10px 20px", background: "#f8fbff", borderBottom: `1px solid #f0f7ff` }}>
            {["Nomi", "Telefon", "Qarz", ""].map((h, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 700, color: C.th, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
            ))}
          </div>
          {suppliersLoading ? <Skeleton /> : filtered.length === 0
            ? <EmptyState icon={Store} text={search ? "Topilmadi" : "Postavshiklar yo'q"} />
            : paginated.map((s, i) => {
              const debt = debtSuppliers.find(d => d.supplierId === s.id);
              const hasDebt = debt && debt.totalDebt > 0;
              return (
                <div key={s.id} onClick={() => setSelectedSupplier(s)}
                  style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr", alignItems: "center", padding: "13px 20px", borderBottom: i < paginated.length - 1 ? `1px solid #f5f9fe` : "none", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: C.blueBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Store size={14} color={C.blue} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{s.name}</span>
                  </div>
                  <span style={{ fontSize: 13, color: C.muted, display: "flex", alignItems: "center", gap: 4 }}>
                    {s.phone ? <><Phone size={11} />{s.phone}</> : "—"}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: hasDebt ? 700 : 500, color: hasDebt ? C.red : C.green }}>
                    {hasDebt ? `${fmt(debt!.totalDebt)} so'm` : "Yo'q"}
                  </span>
                  <span style={{ display: "flex", justifyContent: "flex-end" }}>
                    <ChevronRight size={14} color={C.muted} />
                  </span>
                </div>
              );
            })
          }
          <div style={{ flex: 1 }} />
          <TablePagination page={page} totalPages={totalPages || 1} onPageChange={setPage}
            summary={`${(page-1)*PAGE_SIZE+1}–${Math.min(page*PAGE_SIZE, filtered.length)} / ${filtered.length} ta`} />
        </div>
      )}

      {/* ── To'lov tarixi ── */}
      {tab === "tolov_tarixi" && (() => {
        const withHistory = suppliers.filter(s => debtSuppliers.some(d => d.supplierId === s.id));
        return (
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: "calc(100vh - 220px)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr", padding: "10px 20px", background: "#f8fbff", borderBottom: `1px solid #f0f7ff` }}>
              {["Postavshik", "Telefon", "Qarz holati", ""].map((h, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 700, color: C.th, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
              ))}
            </div>
            {debtsLoading || suppliersLoading ? <Skeleton /> : withHistory.length === 0
              ? <EmptyState icon={History} text="To'lov tarixi yo'q" />
              : withHistory.map((s, i) => {
                const debt = debtSuppliers.find(d => d.supplierId === s.id);
                const hasDebt = debt && debt.totalDebt > 0;
                return (
                  <div key={s.id} onClick={() => setSelectedSupplier(s)}
                    style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr", alignItems: "center", padding: "13px 20px", borderBottom: i < withHistory.length - 1 ? `1px solid #f5f9fe` : "none", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: C.blueBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Store size={14} color={C.blue} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{s.name}</span>
                    </div>
                    <span style={{ fontSize: 13, color: C.muted, display: "flex", alignItems: "center", gap: 4 }}>
                      {s.phone ? <><Phone size={11} />{s.phone}</> : "—"}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: hasDebt ? C.red : C.green, background: hasDebt ? C.redBg : C.greenBg, borderRadius: 999, padding: "3px 10px", width: "fit-content" }}>
                      {hasDebt ? `${fmt(debt!.totalDebt)} so'm qarz` : "To'langan"}
                    </span>
                    <span style={{ display: "flex", justifyContent: "flex-end" }}>
                      <ChevronRight size={14} color={C.muted} />
                    </span>
                  </div>
                );
              })
            }
            <div style={{ flex: 1 }} />
          </div>
        );
      })()}

      {renderDialogs()}
    </div>
  );

  function renderDialogs() {
    return (
      <>
        {/* Postavshik qo'shish */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="max-w-[480px] rounded-[16px] border border-[#dbe7f3] p-0 shadow-xl">
            <DialogHeader className="border-b border-[#dbe7f3] px-6 py-4">
              <DialogTitle className="flex items-center gap-2 text-[18px] font-semibold text-[#0c447c]">
                <Store className="h-5 w-5 text-[#185fa5]" /> Postavshik qo'shish
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 px-6 py-5">
              <div className="space-y-2">
                <Label className="text-[13px] font-medium text-[#0c447c]">Nomi *</Label>
                <Input placeholder="Kompaniya yoki ism" value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  className="h-11 rounded-[10px] border-[#dbe7f3] bg-white shadow-none" />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-medium text-[#0c447c]">Telefon</Label>
                <Input placeholder="+998 __ ___ __ __" value={addForm.phone}
                  onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                  className="h-11 rounded-[10px] border-[#dbe7f3] bg-white shadow-none" />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-medium text-[#0c447c]">Mas'ul shaxs</Label>
                <Input placeholder="F.I.O" value={addForm.contactPerson}
                  onChange={e => setAddForm(f => ({ ...f, contactPerson: e.target.value }))}
                  className="h-11 rounded-[10px] border-[#dbe7f3] bg-white shadow-none" />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-medium text-[#0c447c]">Manzil</Label>
                <Input placeholder="Manzil" value={addForm.address}
                  onChange={e => setAddForm(f => ({ ...f, address: e.target.value }))}
                  className="h-11 rounded-[10px] border-[#dbe7f3] bg-white shadow-none" />
              </div>
              {addError && <p className="text-sm text-red-600">{addError}</p>}
            </div>
            <DialogFooter className="border-t border-[#dbe7f3] px-6 py-4">
              <Button variant="outline" className="h-11 rounded-[10px]" onClick={() => setShowAdd(false)}>Bekor qilish</Button>
              <Button className="h-11 rounded-[10px]" onClick={handleAdd} disabled={addLoading || !addForm.name.trim()}>
                {addLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Saqlash
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Qarz to'lash */}
        <Dialog open={showPay} onOpenChange={v => { if (!v) { setShowPay(false); setPayingDebtId(null); setPayAmount(""); setPayReason(""); } }}>
          <DialogContent className="max-w-[420px] rounded-[16px] border border-[#dbe7f3] p-0 shadow-xl">
            <DialogHeader className="border-b border-[#dbe7f3] px-6 py-4">
              <DialogTitle className="flex items-center gap-2 text-[18px] font-semibold text-[#0c447c]">
                <CheckCircle className="h-5 w-5 text-[#166534]" /> Qarzni to'lash
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 py-5 space-y-3">
              {selectedSupplier && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "#f8fbff", border: `1px solid ${C.border}` }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: C.blueBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Store size={15} color={C.blue} />
                  </div>
                  <div>
                    <p style={{ fontSize: 11, color: C.muted }}>Postavshik</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{selectedSupplier.name}</p>
                  </div>
                </div>
              )}
              {payReason && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "#f8fbff", border: `1px solid ${C.border}` }}>
                  <p style={{ fontSize: 11, color: C.muted }}>Nima olindi</p>
                  <p style={{ fontSize: 13, color: C.text, marginTop: 2 }}>{payReason}</p>
                </div>
              )}
              <div style={{ padding: "14px 16px", borderRadius: 10, background: "#fff5f5", border: "1px solid #fecaca" }}>
                <p style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>To'lanadigan summa (so'm)</p>
                <input
                  type="number"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  placeholder="Summani kiriting"
                  style={{
                    width: "100%", border: "1px solid #fecaca", borderRadius: 8,
                    padding: "8px 12px", fontSize: 20, fontWeight: 700, color: "#A32D2D",
                    background: "transparent", outline: "none", boxSizing: "border-box",
                  }}
                />
                {payOriginalAmount && Number(payAmount) !== Number(payOriginalAmount) && (
                  <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Jami qarz: {fmt(Number(payOriginalAmount))} so'm</p>
                )}
              </div>
              <p style={{ fontSize: 12, color: C.muted }}>Tasdiqlashdan so'ng qarz to'langan deb belgilanadi.</p>
              {payError && <p className="text-sm text-red-600">{payError}</p>}
            </div>
            <DialogFooter className="border-t border-[#dbe7f3] px-6 py-4">
              <Button variant="outline" className="h-11 rounded-[10px]" onClick={() => { setShowPay(false); setPayingDebtId(null); }}>Bekor qilish</Button>
              <Button className="h-11 rounded-[10px] bg-[#166534] hover:bg-[#14532d]" onClick={handlePay} disabled={payLoading}>
                {payLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />} To'lashni tasdiqlash
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }
}
