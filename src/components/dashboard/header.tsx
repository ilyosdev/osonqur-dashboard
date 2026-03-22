import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Bell, Search, ChevronDown, LogOut, User, Settings, RefreshCw, Check, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  OPERATOR: "Operator",
  ADMIN: "Admin",
  BOSS: "Boss",
  DIREKTOR: "Direktor",
  BUGALTERIYA: "Buxgalteriya",
  PTO: "PTO",
  SNABJENIYA: "Ta'minot",
  SKLAD: "Ombor",
  PRORAB: "Prorab",
  HAYDOVCHI: "Haydovchi",
  MODERATOR: "Moderator",
  WORKER: "Ishchi",
  POSTAVSHIK: "Yetkazuvchi",
};

export function Header() {
  const navigate = useNavigate();
  const { user, logout, currentRole, allowedRoles, switchRole } = useAuth();
  const [isSwitching, setIsSwitching] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleSwitchRole = async (role: string) => {
    if (role === currentRole || isSwitching) return;
    setIsSwitching(true);
    try {
      await switchRole(role);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Failed to switch role:', error);
    } finally {
      setIsSwitching(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const canSwitchRoles = allowedRoles.length > 1;

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden" />
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Qidirish..."
            className="w-64 pl-9 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Role Switcher - visible on all screen sizes */}
        {canSwitchRoles && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 sm:gap-2 h-9 px-2 sm:px-3"
                disabled={isSwitching}
              >
                {isSwitching ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{ROLE_LABELS[currentRole || ''] || currentRole}</span>
                <span className="sm:hidden text-xs">{(ROLE_LABELS[currentRole || ''] || currentRole || '').slice(0, 3)}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Rolni almashtirish
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allowedRoles.map((role) => (
                <DropdownMenuItem
                  key={role}
                  onClick={() => handleSwitchRole(role)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 w-full">
                    {role === currentRole ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <div className="w-4" />
                    )}
                    <span className={role === currentRole ? 'font-medium' : ''}>
                      {ROLE_LABELS[role] || role}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-muted"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          <Badge className="absolute -right-0.5 -top-0.5 h-5 min-w-5 rounded-full bg-destructive px-1.5 text-[10px] font-semibold">
            3
          </Badge>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2 hover:bg-muted"
            >
              <Avatar className="h-8 w-8 border-2 border-primary/20">
                <AvatarImage src="/avatars/user.jpg" alt="Foydalanuvchi" />
                <AvatarFallback className="bg-gradient-to-br from-primary to-blue-600 text-white text-xs font-semibold">
                  {user?.name ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium">{user?.name || 'Foydalanuvchi'}</span>
                <span className="text-[10px] text-muted-foreground">{user?.role || ''}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name || 'Foydalanuvchi'}</p>
                <p className="text-xs text-muted-foreground">{user?.phone || ''}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <User className="mr-2 h-4 w-4" />
                Profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Sozlamalar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Chiqish
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
