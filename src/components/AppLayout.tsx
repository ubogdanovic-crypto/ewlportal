import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { BottomNav } from "@/components/common/BottomNav";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Sidebar hidden on mobile, visible on md+ */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card">
            <div className="hidden md:block">
              <SidebarTrigger />
            </div>
            <div className="md:hidden font-bold text-sm">EastWestLinks</div>
            <NotificationBell />
          </header>
          <main className="flex-1 p-4 sm:p-6 overflow-auto pb-20 md:pb-6">
            {children}
          </main>
        </div>
      </div>
      {/* Bottom nav on mobile only */}
      <BottomNav />
    </SidebarProvider>
  );
}
