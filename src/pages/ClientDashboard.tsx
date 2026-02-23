import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Users, AlertCircle, CheckCircle2, Plus, ArrowRight } from "lucide-react";

export default function ClientDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const { data } = useQuery({
    queryKey: ["client-dashboard-stats", profile?.company_id],
    queryFn: async () => {
      const [ordersRes, workersRes, recentOrdersRes] = await Promise.all([
        supabase.from("orders").select("id, status").eq("company_id", profile!.company_id!),
        supabase.from("workers").select("id, status, current_stage").eq("company_id", profile!.company_id!),
        supabase.from("orders")
          .select("id, reference_number, position_title, status, created_at, number_of_workers")
          .eq("company_id", profile!.company_id!)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      return {
        orders: ordersRes.data || [],
        workers: workersRes.data || [],
        recentOrders: recentOrdersRes.data || [],
      };
    },
    enabled: !!profile?.company_id,
  });

  const orders = data?.orders || [];
  const workers = data?.workers || [];

  const recentOrders = data?.recentOrders || [];

  const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: t("orders.status.draft" as any, "Draft"), variant: "secondary" },
    submitted: { label: t("orders.status.submitted" as any, "Submitted"), variant: "outline" },
    confirmed: { label: t("orders.status.confirmed" as any, "Confirmed"), variant: "default" },
    sourcing: { label: t("orders.status.sourcing" as any, "Sourcing"), variant: "default" },
    in_progress: { label: t("orders.status.in_progress" as any, "In Progress"), variant: "default" },
    fulfilled: { label: t("orders.status.fulfilled" as any, "Fulfilled"), variant: "secondary" },
    cancelled: { label: t("orders.status.cancelled" as any, "Cancelled"), variant: "destructive" },
  };
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{t("dashboard.recentOrders" as any, "Recent Orders")}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/orders")}>
              {t("common.viewAll" as any, "View All")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {!recentOrders.length ? (
              <p className="text-muted-foreground text-sm">No orders yet.</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order: any) => {
                  const s = statusLabel[order.status] || { label: order.status, variant: "secondary" as const };
                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{order.reference_number}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {order.position_title} · {order.number_of_workers} {t("orders.workers" as any, "workers")}
                        </p>
                      </div>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
