import { SidebarTrigger } from "@/components/ui/sidebar";

export function Header() {
  return (
    <header className="sticky top-0 z-40 flex h-0 items-center justify-between md:hidden">
      <SidebarTrigger className="m-3" />
    </header>
  );
}
