import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Building2, FolderOpen, Users, UserCog, Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { adminApi, AdminStats } from "@/lib/api/admin";

const C = {
  blue: "#185fa5",
  blueDark: "#0c447c",
  blueLight: "#eff6ff",
  border: "#dbe7f3",
  muted: "#64748b",
  text: "#0f172a",
};

export default function AdminHomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    adminApi.getStats().then(setStats).catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  if (user?.role === "ADMIN" && user?.orgId) {
    return <Navigate to={`/admin/organizations/${user.orgId}/users`} replace />;
  }

  const statCards = [
    { title: "Kompaniyalar", value: stats?.totalOrganizations ?? 0, icon: Building2, color: C.blue },
    ...(isSuperAdmin ? [{ title: "Operatorlar", value: stats?.totalOperators ?? 0, icon: UserCog, color: "#7c3aed" }] : []),
    { title: "Foydalanuvchilar", value: stats?.totalUsers ?? 0, icon: Users, color: "#059669" },
    { title: "Loyihalar", value: stats?.totalProjects ?? 0, icon: FolderOpen, color: "#d97706" },
  ];

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.blueDark, margin: 0 }}>
          Xush kelibsiz, {user?.name}!
        </h1>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
          {isSuperAdmin ? "Tizim boshqaruvi — operatorlar va kompaniyalarni boshqaring" : "Kompaniyalar va foydalanuvchilarni boshqaring"}
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
          <Loader2 style={{ width: 32, height: 32, color: C.blue, animation: "spin 1s linear infinite" }} />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${statCards.length}, 1fr)`, gap: 16, marginBottom: 24 }}>
            {statCards.map((card) => (
              <div key={card.title} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>{card.title}</p>
                  <p style={{ fontSize: 32, fontWeight: 700, color: C.blueDark, margin: "6px 0 0" }}>{card.value}</p>
                </div>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: card.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <card.icon style={{ width: 22, height: 22, color: card.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Action cards */}
          <div style={{ display: "grid", gridTemplateColumns: isSuperAdmin ? "1fr 1fr" : "1fr", gap: 16 }}>
            {isSuperAdmin && (
              <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: C.blueDark, margin: "0 0 6px" }}>Operator qo'shish</h3>
                <p style={{ fontSize: 13, color: C.muted, margin: "0 0 20px" }}>Yangi operator yarating va kompaniyalarni tayinlang</p>
                <Link to="/admin/operators" style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 38, padding: "0 20px", background: C.blue, color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                  <Plus style={{ width: 15, height: 15 }} /> Operatorlar
                </Link>
              </div>
            )}
            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: C.blueDark, margin: "0 0 6px" }}>Kompaniya qo'shish</h3>
              <p style={{ fontSize: 13, color: C.muted, margin: "0 0 20px" }}>Yangi kompaniya yarating va boshqaring</p>
              <Link to="/admin/organizations" style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 38, padding: "0 20px", background: C.blue, color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                <Plus style={{ width: 15, height: 15 }} /> Kompaniyalar
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
