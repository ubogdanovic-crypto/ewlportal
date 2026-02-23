import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";

export function NotificationBell() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications-bell", user?.id, role],
    queryFn: async () => {
      let query = supabase
        .from("notifications")
        .select("id, subject, created_at, is_read")
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(5);

      if (role === "client") {
        query = query.eq("recipient_user_id", user!.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!role,
  });

  const unreadCount = notifications.length;

  const handleViewAll = async () => {
    navigate("/notifications");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0 z-50 bg-popover border shadow-lg"
      >
        <div className="px-4 py-3 border-b">
          <p className="font-semibold text-sm">Notifications</p>
        </div>
        {!unreadCount ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No unread notifications
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            {notifications.map((n: any) => (
              <div
                key={n.id}
                className="px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={handleViewAll}
              >
                <p className="text-sm font-medium truncate">{n.subject}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(n.created_at), "PPP p")}
                </p>
              </div>
            ))}
          </div>
        )}
        <div className="px-4 py-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={handleViewAll}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
