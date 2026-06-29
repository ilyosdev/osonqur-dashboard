import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Banknote,
  Building2,
  ChartBar,
  ClipboardList,
  FileText,
  Home,
  Settings,
  Users,
  Wallet,
  Package,
  LogOut,
  Truck,
  CheckSquare,
  UserCircle,
  Car,
  Shield,
  Briefcase,
  Store,
  BarChart3,
  Crown,
  ShoppingCart,
  FolderOpen,
  HardHat,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  ArrowLeftRight,
  History,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useProject } from "@/lib/project-context";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  // one or more permissions — item shows if user has ANY of them
  permissions?: string[];
  requiresProject?: boolean;
};

const mainNavItems: NavItem[] = [
  {
    title: "Bosh sahifa",
    url: "/",
    icon: Home,
  },
  {
    title: "Loyihalar",
    url: "/projects",
    icon: Building2,
    permissions: ["smeta:view", "request:create", "request:view_all", "worker:view", "order:view", "warehouse:view", "driver:view_assigned", "moderator:view_pending", "statistics:view"],
  },
  {
    title: "Xodimlar",
    url: "/users",
    icon: Users,
    permissions: ["user:view", "user:manage"],
  },
];

// Bot PERMISSION_MENU_ITEMS bilan aynan bir xil tartib va permission mapping
const roleNavItems: NavItem[] = [
  // statistics:view → Statistika
  { title: "Statistika", url: "/direktor", icon: Crown, permissions: ["statistics:view"] },
  // report:view → Loyiha bajarilishi
  { title: "Loyiha bajarilishi", url: "/reports", icon: ChartBar, permissions: ["report:view"] },
  // request:view_all → Zayavkalar
  { title: "Zayavkalar", url: "/requests", icon: ClipboardList, permissions: ["request:view_all"] },
  // request:create → Zayavka yaratish
  { title: "Zayavka yaratish", url: "/foreman", icon: Package, permissions: ["request:create"] },
  // smeta:edit → Smeta yangilash
  { title: "Smeta yangilash", url: "/smetas", icon: FileText, permissions: ["smeta:edit"] },
  // smeta_comparison:view → Smeta vs Fakt
  { title: "Smeta vs Fakt", url: "/smeta-comparison", icon: BarChart3, permissions: ["smeta_comparison:view"] },
  // worklog:validate → Usta ishlarini tasdiqlash
  { title: "Usta ishlarini tasdiqlash", url: "/direktor", icon: CheckSquare, permissions: ["worklog:validate"] },
  // order:view → Buyurtmalar
  { title: "Buyurtmalar", url: "/supply", icon: ShoppingCart, permissions: ["order:view"] },
  // supplier:view → Postavshiklar
  { title: "Postavshiklar", url: "/suppliers", icon: Truck, permissions: ["supplier:view"] },
  // debt:view → Qarzlar
  { title: "Qarzlar", url: "/direktor", icon: Wallet, permissions: ["debt:view"] },
  // expense:view → Umumiy rasxodlar
  { title: "Umumiy rasxodlar", url: "/finance?tab=expenses", icon: TrendingDown, permissions: ["expense:view"] },
  // income:create → Kirim
  { title: "Kirim", url: "/finance?tab=income", icon: TrendingUp, permissions: ["income:create"] },
  // cash_request:approve → Pul zayavkalari
  { title: "Pul zayavkalari", url: "/finance?tab=cash-requests", icon: DollarSign, permissions: ["cash_request:approve"] },
  // kashlok:view_all → Kosheloklar
  { title: "Kosheloklar", url: "/finance?tab=kosheloks", icon: CreditCard, permissions: ["kashlok:view_all"] },
  // warehouse:receive → Kutilayotgan yetkazmalar
  { title: "Kutilayotgan yetkazmalar", url: "/warehouse?tab=deliveries", icon: Truck, permissions: ["warehouse:receive"] },
  // warehouse:view → Ombor
  { title: "Ombor", url: "/warehouse?tab=inventory", icon: Package, permissions: ["warehouse:view"] },
  // warehouse:view → Ombor tarixi
  { title: "Ombor tarixi", url: "/warehouse?tab=history", icon: History, permissions: ["warehouse:view"] },
  // warehouse:transfer → Ko'chirish
  { title: "Ko'chirish", url: "/warehouse?tab=warehouses", icon: ArrowLeftRight, permissions: ["warehouse:transfer"] },
  // driver:view_assigned → Tayinlangan zayavkalar
  { title: "Tayinlangan zayavkalar", url: "/driver?tab=assigned", icon: Car, permissions: ["driver:view_assigned"] },
  // driver:mark_collected → Faol yetkazma
  { title: "Faol yetkazma", url: "/driver?tab=active", icon: Truck, permissions: ["driver:mark_collected"] },
  // driver:mark_delivered → Yetkazma tarixi
  { title: "Yetkazma tarixi", url: "/driver?tab=history", icon: History, permissions: ["driver:mark_delivered"] },
  { title: "Mahsulot kiritish", url: "/moderator", icon: Shield, permissions: ["moderator:view_pending"] },
  { title: "Moderatsiya tarixi", url: "/moderator?tab=history", icon: History, permissions: ["moderator:view_pending"] },
  // worker:view → Ustalar
  { title: "Ustalar", url: "/workers", icon: UserCircle, permissions: ["worker:view"] },
  // worker_portal:view → Hisob-kitob
  { title: "Hisob-kitob", url: "/worker-portal?tab=summary", icon: BarChart3, permissions: ["worker_portal:view"] },
  // worker_portal:work_logs → Bajarilgan ishlar
  { title: "Bajarilgan ishlar", url: "/worker-portal?tab=worklogs", icon: Briefcase, permissions: ["worker_portal:work_logs"] },
  // worker_portal:payments → To'lovlar
  { title: "To'lovlar", url: "/worker-portal?tab=payments", icon: Wallet, permissions: ["worker_portal:payments"] },
  // supplier_portal:view → Hisob-kitob (postavshik)
  { title: "Hisob-kitob", url: "/supplier-portal?tab=summary", icon: Store, permissions: ["supplier_portal:view"] },
  // supplier_portal:orders → Berilgan tovar
  { title: "Berilgan tovar", url: "/supplier-portal?tab=orders", icon: Package, permissions: ["supplier_portal:orders"] },
  // supplier_portal:debts → Olingan pullar
  { title: "Olingan pullar", url: "/supplier-portal?tab=payments", icon: Wallet, permissions: ["supplier_portal:debts"] },
  // kassa:view / kassa:request_money / kassa:add_expense → Koshelok
  { title: "Koshelok", url: "/kassa", icon: Banknote, permissions: ["kassa:view", "kassa:request_money", "kassa:add_expense"] },
];

const settingsNavItems: NavItem[] = [
  {
    title: "Sozlamalar",
    url: "/settings",
    icon: Settings,
    permissions: ["settings:view"],
  },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const { user, hasPermission, logout } = useAuth();
  const { projects, selectedProject, selectedProjectId, selectProject } = useProject();

  const isActive = (url: string) => {
    if (url === "/") return pathname === "/";
    const [path, query] = url.split("?");
    if (!pathname.startsWith(path)) return false;
    if (!query) return location.search === "";
    return location.search === "?" + query;
  };

  const canSeeItem = (item: NavItem) => {
    if (!item.permissions || item.permissions.length === 0) return true;
    return item.permissions.some((p) => hasPermission(p));
  };

  const visibleMainItems = mainNavItems.filter(canSeeItem);
  const visibleRoleItems = roleNavItems.filter(canSeeItem);
  const visibleSettingsItems = settingsNavItems.filter(canSeeItem);

  // Items that require project selection are dimmed when no project is selected
  const hasProject = !!selectedProjectId;

  const getInitials = (name?: string) =>
    (name || "U")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-sidebar-border bg-sidebar">
        <Link to="/" className="flex items-center gap-2.5 px-2 group-data-[collapsible=icon]:px-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#185fa5] text-white shadow-none">
            <HardHat className="h-5 w-5" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-base font-bold tracking-tight text-sidebar-foreground">
              OSONQUR
            </span>
            <span className="text-[10px] text-sidebar-foreground/60 -mt-0.5">
              Byudjet nazorati
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="min-h-0 px-2">
        {/* Project Selector */}
        {projects.length > 0 && (
          <div className="px-2 pt-3 pb-1 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:pt-2">
            <div className="group-data-[collapsible=icon]:hidden">
              <Select
                value={selectedProjectId || ""}
                onValueChange={(v) => selectProject(v || null)}
              >
                <SelectTrigger className="h-10 w-full rounded-lg border-sidebar-border bg-white text-sidebar-foreground shadow-none">
                  <div className="flex items-center gap-2 truncate">
                    <FolderOpen className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/55" />
                    <SelectValue placeholder="Loyihani tanlang..." />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="hidden group-data-[collapsible=icon]:flex justify-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg cursor-pointer transition-colors ${
                    selectedProject
                    ? "bg-[#eff6ff] text-[#185fa5]"
                    : "bg-slate-100 text-sidebar-foreground/60"
                }`}
                title={selectedProject?.name || "Loyihani tanlang"}
              >
                <FolderOpen className="h-4 w-4" />
              </div>
            </div>
          </div>
        )}

        {!hasProject && projects.length > 0 && (
          <div className="px-3 py-2 group-data-[collapsible=icon]:hidden">
            <p className="rounded-md bg-slate-100 px-2.5 py-1.5 text-xs text-sidebar-foreground/60">
              Avval loyihani tanlang
            </p>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/40">
            Asosiy
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMainItems.map((item) => {
                const disabled = item.requiresProject && !hasProject;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild={!disabled}
                      isActive={isActive(item.url)}
                      tooltip={item.title + (disabled ? " (loyihani tanlang)" : "")}
                      className={`transition-all duration-200 ${disabled ? "opacity-40 pointer-events-none text-sidebar-foreground/35" : "text-sidebar-foreground/70 data-[active=true]:bg-[#eff6ff] data-[active=true]:text-[#185fa5] hover:bg-slate-50 hover:text-sidebar-foreground"}`}
                    >
                      {disabled ? (
                        <span className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </span>
                      ) : (
                        <Link to={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      )}
                    </SidebarMenuButton>
                    {item.badge && (
                      <SidebarMenuBadge>
                        <Badge
                          variant="secondary"
                          className="h-5 min-w-5 rounded-full border-0 bg-[#eff6ff] text-[#185fa5] text-[10px] font-semibold"
                        >
                          {item.badge}
                        </Badge>
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleRoleItems.length > 0 && (
          <>
            <SidebarSeparator className="my-2" />
            <SidebarGroup>
              <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/40">
                Boshqaruv
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleRoleItems.map((item) => {
                    const disabled = item.requiresProject && !hasProject;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild={!disabled}
                          isActive={isActive(item.url)}
                          tooltip={item.title + (disabled ? " (loyihani tanlang)" : "")}
                          className={`transition-all duration-200 ${disabled ? "opacity-40 pointer-events-none text-sidebar-foreground/35" : "text-sidebar-foreground/70 data-[active=true]:bg-[#eff6ff] data-[active=true]:text-[#185fa5] hover:bg-slate-50 hover:text-sidebar-foreground"}`}
                        >
                          {disabled ? (
                            <span className="flex items-center gap-2">
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </span>
                          ) : (
                            <Link to={item.url}>
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </Link>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        <SidebarSeparator className="my-2" />

        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/40">
            Tizim
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleSettingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-sidebar-border bg-sidebar p-3">
        <div className="space-y-3 group-data-[collapsible=icon]:space-y-2">
          <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-50 group-data-[collapsible=icon]:justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#185fa5] text-sm font-semibold text-white">
              {getInitials(user?.name)}
            </div>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{user?.name || "Foydalanuvchi"}</p>
              <p className="truncate text-[10px] text-sidebar-foreground/60">{user?.platformRole || user?.role || ""}</p>
            </div>
          </button>

          <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[#185fa5]">
              <FileText className="h-4 w-4" />
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden">
              <span className="text-xs font-medium text-sidebar-foreground">Telegram ulangan</span>
              <span className="flex items-center gap-1 text-[10px] text-sidebar-foreground/60">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                @SmetakonBot
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start rounded-lg px-2 text-sidebar-foreground/80 hover:bg-slate-50 hover:text-sidebar-foreground group-data-[collapsible=icon]:hidden"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Chiqish
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-9 w-9 rounded-lg text-sidebar-foreground/80 hover:bg-slate-50 hover:text-sidebar-foreground group-data-[collapsible=icon]:inline-flex"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
