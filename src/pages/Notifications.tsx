import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Mail, MailOpen, AlertCircle, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { useEffect } from "react";

export default function Notifications() {
  const { t } = useTranslation();
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications-inbox", user?.id, role],
    queryFn: async () => {
      let query = supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (role === "client") {
        query = query.eq("recipient_user_id", user!.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Mark unread notifications as read when the page loads
  useEffect(() => {
    if (!notifications?.length || !user) return;
    const unreadIds = notifications
      .filter((n: any) => !n.is_read)
      .map((n: any) => n.id);
    if (!unreadIds.length) return;

    supabase
      .from("notifications")
      .update({ is_read: true } as any)
      .in("id", unreadIds)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
      });
  }, [notifications, user, queryClient]);

  const handleMarkAllRead = async () => {
    if (!notifications?.length) return;
    const unreadIds = notifications.filter((n: any) => !n.is_read).map((n: any) => n.id);
    if (!unreadIds.length) return;
    await supabase.from("notifications").update({ is_read: true } as any).in("id", unreadIds);
    queryClient.invalidateQueries({ queryKey: ["notifications-inbox"] });
    queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
  };

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0;

  const statusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge variant="default">Sent</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">{t("nav.notifications")}</h1>
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount} unread</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Loading…
          </div>
        ) : !notifications?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <MailOpen className="h-10 w-10" />
              <p>No notifications yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((n: any) => (
              <Card
                key={n.id}
                className={`hover:shadow-md transition-shadow ${!n.is_read ? "border-primary/30 bg-primary/5" : ""}`}
              >
                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    {n.is_read ? (
                      <MailOpen className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    ) : (
                      <Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <CardTitle className={`text-base truncate ${!n.is_read ? "font-bold" : "font-semibold"}`}>
                        {n.subject}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(n.created_at), "PPP p")} · {n.recipient_email}
                      </p>
                    </div>
                  </div>
                  {statusBadge(n.status)}
                </CardHeader>
                <CardContent className="pt-0 pl-12">
                  <p className="text-sm text-muted-foreground line-clamp-2"
                    dangerouslySetInnerHTML={{ __html: n.body.replace(/<[^>]*>/g, " ").trim().slice(0, 200) }}
                  />
                  {n.status === "failed" && n.error_message && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-destructive">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {n.error_message}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
