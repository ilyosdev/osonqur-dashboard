import { Link, useLocation } from "react-router-dom";
import {
  Banknote,
  Building2,
  ChartBar,
  ClipboardList,
  FileText,
  Home,
  Settings,
  Users,
  HardHat,
  Wallet,
  Package,
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
import { useAuth } from "@/lib/auth";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  roles?: string[];
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
    roles: ["DIREKTOR", "BOSS", "BUGALTERIYA", "PTO", "SNABJENIYA", "SKLAD", "PRORAB"],
  },
  {
    title: "Smetalar",
    url: "/smetas",
    icon: FileText,
    roles: ["BOSS", "DIREKTOR", "PTO", "PRORAB"],
  },
  {
    title: "So'rovlar",
    url: "/requests",
    icon: ClipboardList,
    roles: ["DIREKTOR", "BOSS"],
  },
  {
    title: "Hisobotlar",
    url: "/reports",
    icon: ChartBar,
    roles: ["BOSS"],
  },
  {
    title: "Xodimlar",
    url: "/users",
    icon: Users,
    roles: ["DIREKTOR", "BOSS"],
  },
];

const roleNavItems: NavItem[] = [
  // DIREKTOR only
  {
    title: "Direktor",
    url: "/direktor",
    icon: Crown,
    roles: ["DIREKTOR"],
  },
  // SNABJENIYA only
  {
    title: "Ta'minot",
    url: "/supply",
    icon: ShoppingCart,
    roles: ["SNABJENIYA"],
  },
  // PRORAB only
  {
    title: "Prorab",
    url: "/foreman",
    icon: HardHat,
    roles: ["PRORAB"],
  },
  // Kassa - all roles
  {
    title: "Kassa",
    url: "/kassa",
    icon: Banknote,
    roles: ["BOSS", "DIREKTOR", "BUGALTERIYA", "SNABJENIYA", "SKLAD", "PRORAB", "PTO", "HAYDOVCHI", "MODERATOR"],
  },
  // BUGALTERIYA + BOSS + DIREKTOR
  {
    title: "Moliya",
    url: "/finance",
    icon: Wallet,
    roles: ["BUGALTERIYA", "BOSS", "DIREKTOR"],
  },
  // SKLAD + BOSS + DIREKTOR
  {
    title: "Ombor",
    url: "/warehouse",
    icon: Package,
    roles: ["SKLAD", "BOSS", "DIREKTOR"],
  },
  // SNABJENIYA + DIREKTOR
  {
    title: "Yetkazuvchilar",
    url: "/suppliers",
    icon: Truck,
    roles: ["SNABJENIYA", "DIREKTOR"],
  },
  // BUGALTERIYA + DIREKTOR
  {
    title: "Ustalar",
    url: "/workers",
    icon: UserCircle,
    roles: ["BUGALTERIYA", "DIREKTOR"],
  },
  // DIREKTOR + PTO + BOSS
  {
    title: "Tekshirish",
    url: "/validation",
    icon: CheckSquare,
    roles: ["DIREKTOR", "PTO", "BOSS"],
  },
  // HAYDOVCHI only
  {
    title: "Yetkazish",
    url: "/driver",
    icon: Car,
    roles: ["HAYDOVCHI"],
  },
  // MODERATOR only
  {
    title: "Moderatsiya",
    url: "/moderator",
    icon: Shield,
    roles: ["MODERATOR"],
  },
  // WORKER only
  {
    title: "Mening ishlarim",
    url: "/worker-portal",
    icon: Briefcase,
    roles: ["WORKER"],
  },
  // POSTAVSHIK only
  {
    title: "Ta'minotchi",
    url: "/supplier-portal",
    icon: Store,
    roles: ["POSTAVSHIK"],
  },
  // PTO only
  {
    title: "Smeta taqqoslash",
    url: "/smeta-comparison",
    icon: BarChart3,
    roles: ["PTO"],
  },
];

const settingsNavItems: NavItem[] = [
  {
    title: "Sozlamalar",
    url: "/settings",
    icon: Settings,
    roles: ["DIREKTOR", "BOSS"],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const pathname = location.pathname;
  const { user, pageRoutes } = useAuth();

  const isActive = (url: string) => {
    if (url === "/") return pathname === "/";
    return pathname.startsWith(url);
  };

  const canSeeItem = (item: NavItem) => {
    if (!item.roles || item.roles.length === 0) return true;
    // Match both /projects and /dashboard/projects formats
    return pageRoutes.includes(item.url) || pageRoutes.includes('/dashboard' + item.url);
  };

  const visibleMainItems = mainNavItems.filter(canSeeItem);
  const visibleRoleItems = roleNavItems.filter(canSeeItem);
  const visibleSettingsItems = settingsNavItems.filter(canSeeItem);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2.5 px-2 group-data-[collapsible=icon]:px-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-600 text-white shadow-md shadow-primary/25">
            <HardHat className="h-5 w-5" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-base font-bold tracking-tight text-foreground">
              OSONQUR
            </span>
            <span className="text-[10px] text-muted-foreground -mt-0.5">
              Byudjet nazorati
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Asosiy
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className="transition-all duration-200"
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.badge && (
                    <SidebarMenuBadge>
                      <Badge 
                        variant="secondary" 
                        className="h-5 min-w-5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold"
                      >
                        {item.badge}
                      </Badge>
                    </SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleRoleItems.length > 0 && (
          <>
            <SidebarSeparator className="my-2" />
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Boshqaruv
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleRoleItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.url)}
                        tooltip={item.title}
                        className="transition-all duration-200"
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
          </>
        )}

        <SidebarSeparator className="my-2" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-success">
            <FileText className="h-4 w-4" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-xs font-medium text-foreground">Telegram ulangan</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              @SmetakonBot
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
