import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, User, Shield, LayoutDashboard } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";

export function AdminHeader() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const roleBadge = user?.platformRole === 'SUPER_ADMIN' ? 'Super Admin' : user?.platformRole === 'OPERATOR' ? 'Operator' : 'User';
  const roleBadgeColor = user?.platformRole === 'SUPER_ADMIN'
    ? 'bg-destructive/10 text-destructive'
    : user?.platformRole === 'OPERATOR'
      ? 'bg-orange-500/10 text-orange-600'
      : 'bg-primary/10 text-primary';

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden" />
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground hidden md:inline">
            Admin Panel
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary" className={`${roleBadgeColor} text-xs font-semibold`}>
          {roleBadge}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2 hover:bg-muted"
            >
              <Avatar className="h-8 w-8 border-2 border-orange-500/20">
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white text-xs font-semibold">
                  {user?.name ? getInitials(user.name) : 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium">{user?.name || 'Admin'}</span>
                <span className="text-[10px] text-muted-foreground">{user?.phone || ''}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name || 'Admin'}</p>
                <p className="text-xs text-muted-foreground">{user?.phone || ''}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/')}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Asosiy panel
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
