import { Link, useLocation, useParams } from "react-router-dom";
import {
  Building2,
  FolderOpen,
  Home,
  UserCog,
  Users,
  HardHat,
  Shield,
  Layers,
  KeyRound,
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
};

const systemNavItems: NavItem[] = [
  {
    title: "Bosh sahifa",
    url: "/admin",
    icon: Home,
  },
];

const managementNavItems: NavItem[] = [
  {
    title: "Operatorlar",
    url: "/admin/operators",
    icon: UserCog,
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "Kompaniyalar",
    url: "/admin/organizations",
    icon: Building2,
    roles: ["SUPER_ADMIN", "OPERATOR"],
  },
];

const rolePermissionNavItems: NavItem[] = [
  {
    title: "Permission guruhlar",
    url: "/admin/permission-groups",
    icon: KeyRound,
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "Rol shablonlar",
    url: "/admin/role-templates",
    icon: Shield,
    roles: ["SUPER_ADMIN"],
  },
  {
    title: "Tashkilot rollari",
    url: "/admin/org-roles",
    icon: Layers,
    roles: ["SUPER_ADMIN", "OPERATOR"],
  },
];

export function AdminSidebar() {
  const location = useLocation();
  const pathname = location.pathname;
  const { user } = useAuth();
  const { orgId } = useParams();

  const isActive = (url: string) => {
    if (url === "/admin") return pathname === "/admin";
    return pathname.startsWith(url);
  };

  const canSeeItem = (item: NavItem) => {
    if (!item.roles || item.roles.length === 0) return true;
    const userRole = user?.platformRole || user?.role || "";
    return item.roles.includes(userRole);
  };

  const visibleManagement = managementNavItems.filter(canSeeItem);
  const visibleRolePermission = rolePermissionNavItems.filter(canSeeItem);

  // Detect active org from URL
  const activeOrgId = orgId || pathname.match(/\/admin\/organizations\/([^/]+)/)?.[1];

  // For ADMIN role, always show their own org links
  const isAdminRole = user?.role === "ADMIN";
  const adminOrgId = user?.orgId;

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-sidebar-border">
        <Link to="/admin" className="flex items-center gap-2.5 px-2 group-data-[collapsible=icon]:px-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-md shadow-orange-500/25">
            <HardHat className="h-5 w-5" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-base font-bold tracking-tight text-foreground">
              Osonqur
            </span>
            <span className="text-[10px] text-muted-foreground -mt-0.5">
              qurilish boshqaruv tizimi
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Tizim
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemNavItems.map((item) => (
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

        <SidebarSeparator className="my-2" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Boshqaruv
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleManagement.map((item) => (
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

        {visibleRolePermission.length > 0 && (
          <>
            <SidebarSeparator className="my-2" />
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Rollar va ruxsatlar
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleRolePermission.map((item) => (
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

        {(activeOrgId || (isAdminRole && adminOrgId)) && (
          <>
            <SidebarSeparator className="my-2" />
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {isAdminRole ? "Mening kompaniyam" : "Kompaniya"}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.includes(`/organizations/${activeOrgId || adminOrgId}/users`)}
                      tooltip="Xodimlar"
                      className="transition-all duration-200"
                    >
                      <Link to={`/admin/organizations/${activeOrgId || adminOrgId}/users`}>
                        <Users className="h-4 w-4" />
                        <span>Xodimlar</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.includes(`/organizations/${activeOrgId || adminOrgId}/projects`)}
                      tooltip="Loyihalar"
                      className="transition-all duration-200"
                    >
                      <Link to={`/admin/organizations/${activeOrgId || adminOrgId}/projects`}>
                        <FolderOpen className="h-4 w-4" />
                        <span>Loyihalar</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3" />
    </Sidebar>
  );
}
