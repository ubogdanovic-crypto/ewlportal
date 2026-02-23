import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import { LanguageToggle } from "@/components/LanguageToggle";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Building2,
  FileText,
  Bell,
  Settings,
  BarChart3,
  CalendarDays,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const { t } = useTranslation();
  const { role, profile, user, signOut } = useAuth();
  const sidebar = useSidebar();
  const collapsed = sidebar.state === "collapsed";

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications-count", user?.id, role],
    queryFn: async () => {
      let query = supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false);

      if (role === "client") {
        query = query.eq("recipient_user_id", user!.id);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
          queryClient.invalidateQueries({ queryKey: ["notifications-inbox"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
  const clientItems = [
    { title: t("nav.dashboard"), url: "/dashboard", icon: LayoutDashboard },
    { title: t("nav.orders"), url: "/orders", icon: ClipboardList },
    { title: t("nav.documents"), url: "/documents", icon: FileText },
    { title: t("nav.notifications"), url: "/notifications", icon: Bell, badge: unreadCount },
  ];

  const opsItems = [
    { title: t("nav.dashboard"), url: "/ops", icon: LayoutDashboard },
    { title: t("nav.clients"), url: "/ops/clients", icon: Building2 },
    { title: t("nav.orders"), url: "/ops/orders", icon: ClipboardList },
    { title: t("nav.workers"), url: "/ops/workers", icon: Users },
    { title: t("nav.interviews"), url: "/ops/interviews", icon: CalendarDays },
    { title: t("nav.documents"), url: "/ops/documents", icon: FileText },
  ];

  const managementItems = [
    { title: t("nav.dashboard"), url: "/management", icon: LayoutDashboard },
    { title: t("mgmt.userManagement" as any), url: "/management/users", icon: Users },
    { title: t("nav.reports"), url: "/management/reports", icon: BarChart3 },
    { title: t("nav.settings"), url: "/management/settings", icon: Settings },
  ];

  let menuItems = clientItems;
  if (role === "ops") menuItems = opsItems;
  if (role === "management") menuItems = [...managementItems, ...opsItems];

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm shrink-0">
            E
          </div>
          {!collapsed && (
            <span className="font-bold text-lg text-sidebar-foreground">
              EastWestLinks
            </span>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && (role === "ops" ? "Operations" : role === "management" ? "Management" : "Portal")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard" || item.url === "/ops" || item.url === "/management"}
                      className="flex items-center gap-2 hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="flex-1">{item.title}</span>}
                      {"badge" in item && (item as any).badge > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium px-1">
                          {(item as any).badge}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-2">
        {!collapsed && profile && (
          <div className="text-xs text-sidebar-foreground/70 truncate px-1">
            {profile.full_name || profile.email}
          </div>
        )}
        <div className="flex items-center gap-1">
          <LanguageToggle className="text-sidebar-foreground hover:bg-sidebar-accent" />
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-1">{t("common.logout")}</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
