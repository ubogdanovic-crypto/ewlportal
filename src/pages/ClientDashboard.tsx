import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Users, AlertCircle, CheckCircle2, Plus } from "lucide-react";

export default function ClientDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const { data } = useQuery({
    queryKey: ["client-dashboard-stats", profile?.company_id],
    queryFn: async () => {
      const [ordersRes, workersRes] = await Promise.all([
        supabase.from("orders").select("id, status").eq("company_id", profile!.company_id!),
        supabase.from("workers").select("id, status, current_stage").eq("company_id", profile!.company_id!),
      ]);
      return { orders: ordersRes.data || [], workers: workersRes.data || [] };
    },
    enabled: !!profile?.company_id,
  });

  const orders = data?.orders || [];
  const workers = data?.workers || [];

  const activeOrders = orders.filter((o: any) => !["fulfilled", "cancelled", "draft"].includes(o.status)).length;
  const activeWorkers = workers.filter((w: any) => w.status === "active").length;
  const pendingReview = workers.filter((w: any) => w.status === "active" && w.current_stage === "client_review").length;
  const arrived = workers.filter((w: any) => w.current_stage === "arrived" && w.status === "active").length;

  const stats = [
    { label: t("dashboard.activeOrders"), value: activeOrders, icon: ClipboardList, color: "text-info" },
    { label: t("dashboard.workersInPipeline"), value: activeWorkers, icon: Users, color: "text-accent" },
    { label: t("dashboard.pendingActions"), value: pendingReview, icon: AlertCircle, color: "text-warning" },
    { label: t("dashboard.workersArrived"), value: arrived, icon: CheckCircle2, color: "text-success" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">{t("dashboard.title")}</h1>
          <Button onClick={() => navigate("/orders/new")} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="mr-2 h-4 w-4" />
            {t("dashboard.placeNewOrder")}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("dashboard.recentNotifications")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">No notifications yet.</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
