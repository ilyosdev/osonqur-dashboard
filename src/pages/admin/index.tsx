import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Building2, FolderOpen, Users, UserCog, Plus, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { adminApi, AdminStats } from "@/lib/api/admin";

export default function AdminHomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await adminApi.getStats();
        setStats(data);
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  // ADMIN users can't use the admin dashboard - redirect to their org
  if (user?.role === "ADMIN" && user?.orgId) {
    return <Navigate to={`/admin/organizations/${user.orgId}/users`} replace />;
  }

  const statCards = [
    {
      title: "Kompaniyalar",
      value: stats?.totalOrganizations ?? 0,
      icon: Building2,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-600",
    },
    ...(isSuperAdmin
      ? [
          {
            title: "Operatorlar",
            value: stats?.totalOperators ?? 0,
            icon: UserCog,
            color: "from-purple-500 to-purple-600",
            bgColor: "bg-purple-500/10",
            textColor: "text-purple-600",
          },
        ]
      : []),
    {
      title: "Foydalanuvchilar",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-500/10",
      textColor: "text-green-600",
    },
    {
      title: "Loyihalar",
      value: stats?.totalProjects ?? 0,
      icon: FolderOpen,
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-500/10",
      textColor: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Xush kelibsiz, {user?.name}!
        </h1>
        <p className="text-muted-foreground">
          {isSuperAdmin
            ? "Tizim boshqaruvi — operatorlar va kompaniyalarni boshqaring"
            : "Kompaniyalar va foydalanuvchilarni boshqaring"}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <Card key={card.title} className="overflow-hidden transition-all duration-300 hover:shadow-md group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                    <h3 className="text-2xl font-bold tracking-tight">{card.value}</h3>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${card.bgColor}`}>
                    <card.icon className={`h-5 w-5 ${card.textColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {isSuperAdmin && (
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Operator qo'shish</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Yangi operator yarating va kompaniyalarni tayinlang
            </p>
            <Button asChild>
              <Link to="/admin/operators">
                <Plus className="h-4 w-4 mr-2" />
                Operatorlar
              </Link>
            </Button>
          </Card>
        )}
        <Card className="p-6">
          <h3 className="font-semibold mb-2">Kompaniya qo'shish</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Yangi kompaniya yarating va boshqaring
          </p>
          <Button asChild>
            <Link to="/admin/organizations">
              <Plus className="h-4 w-4 mr-2" />
              Kompaniyalar
            </Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
