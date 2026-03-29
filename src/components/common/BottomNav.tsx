import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, ClipboardList, Users, Target, CheckSquare, MoreHorizontal, FileText, Bell, Settings, CalendarDays, Building2, BarChart3 } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface NavItem {
  label: string;
  icon: any;
  path: string;
}

export function BottomNav() {
  const { t } = useTranslation();
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const clientMain: NavItem[] = [
    { label: t("nav.dashboard"), icon: LayoutDashboard, path: "/dashboard" },
    { label: t("nav.orders"), icon: ClipboardList, path: "/orders" },
    { label: t("tasks.title"), icon: CheckSquare, path: "/tasks" },
    { label: t("nav.notifications"), icon: Bell, path: "/notifications" },
  ];
  const clientMore: NavItem[] = [
    { label: t("nav.documents"), icon: FileText, path: "/documents" },
    { label: t("profile.profileSettings"), icon: Settings, path: "/profile" },
  ];

  const opsMain: NavItem[] = [
    { label: t("nav.dashboard"), icon: LayoutDashboard, path: "/ops" },
    { label: t("crm.leads"), icon: Target, path: "/crm/leads" },
    { label: t("nav.workers"), icon: Users, path: "/ops/workers" },
    { label: t("tasks.title"), icon: CheckSquare, path: "/tasks" },
  ];
  const opsMore: NavItem[] = [
    { label: t("nav.clients"), icon: Building2, path: "/ops/clients" },
    { label: t("nav.orders"), icon: ClipboardList, path: "/ops/orders" },
    { label: t("nav.interviews"), icon: CalendarDays, path: "/ops/interviews" },
    { label: t("nav.documents"), icon: FileText, path: "/ops/documents" },
    { label: t("nav.notifications"), icon: Bell, path: "/notifications" },
    { label: t("profile.profileSettings"), icon: Settings, path: "/profile" },
  ];

  const mgmtMain = opsMain;
  const mgmtMore: NavItem[] = [
    { label: t("nav.management"), icon: BarChart3, path: "/management" },
    ...opsMore,
    { label: t("nav.settings"), icon: Settings, path: "/management/settings" },
  ];

  const partnerMain: NavItem[] = [
    { label: t("partner.dashboard"), icon: LayoutDashboard, path: "/partner" },
    { label: t("profile.profileSettings"), icon: Settings, path: "/profile" },
  ];

  let main: NavItem[] = clientMain;
  let more: NavItem[] = clientMore;
  if (role === "ops") { main = opsMain; more = opsMore; }
  if (role === "management") { main = mgmtMain; more = mgmtMore; }
  if (role === "partner") { main = partnerMain; more = []; }

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden safe-area-pb">
      <nav className="flex items-center justify-around h-16 px-2">
        {main.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 min-w-[56px] ${isActive(item.path) ? "text-accent" : "text-muted-foreground"}`}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px]">{item.label}</span>
          </button>
        ))}
        {more.length > 0 && (
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center gap-0.5 px-2 py-1 min-w-[56px] text-muted-foreground">
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-[10px]">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="pb-safe">
              <div className="grid grid-cols-3 gap-3 py-4">
                {more.map((item) => (
                  <Button
                    key={item.path}
                    variant="ghost"
                    className="flex flex-col h-auto py-3 gap-1"
                    onClick={() => { navigate(item.path); setMoreOpen(false); }}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-xs">{item.label}</span>
                  </Button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </nav>
    </div>
  );
}
