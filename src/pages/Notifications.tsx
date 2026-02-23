import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, MailOpen, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function Notifications() {
  const { t } = useTranslation();
  const { user, role } = useAuth();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications-inbox", user?.id, role],
    queryFn: async () => {
      let query = supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      // Clients only see their own; ops/management see all
      if (role === "client") {
        query = query.eq("recipient_user_id", user!.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

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
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("nav.notifications")}</h1>
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
            {notifications.map((n) => (
              <Card key={n.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 flex flex-row items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <CardTitle className="text-base font-semibold truncate">{n.subject}</CardTitle>
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
