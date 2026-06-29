import { Outlet, useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/app-sidebar';
import { Header } from '@/components/dashboard/header';
import { MobileNav } from '@/components/dashboard/mobile-nav';

const NO_PADDING_ROUTES = ['/workers'];

export default function DashboardLayout() {
  const location = useLocation();
  const noPadding = NO_PADDING_ROUTES.some(r => location.pathname.startsWith(r));

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />
        <main className={`flex-1 overflow-auto${noPadding ? " bg-[#eaf3fb]" : ""}`}>
          <div className={noPadding
            ? "w-full px-3 pt-4 md:px-4 md:pt-4 xl:px-5 2xl:px-6"
            : "w-full px-3 pt-4 pb-24 md:px-4 md:pt-4 md:pb-6 xl:px-5 2xl:px-6"
          }>
            <Outlet />
          </div>
        </main>
        <MobileNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
