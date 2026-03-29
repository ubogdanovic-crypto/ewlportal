import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { MyTasksWidget } from "@/components/tasks/MyTasksWidget";
import { CrmQuickView } from "@/components/crm/CrmQuickView";
import { LeadFunnelChart } from "@/components/crm/LeadFunnelChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BarChart3, TrendingUp, Users, Activity, Building2, ClipboardList, ArrowRight, UserCog } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const STAGE_GROUPS = [
  { key: "sourcing", stages: ["sourcing", "cv_screening"], color: "hsl(var(--primary))" },
  { key: "review", stages: ["cv_sent_to_client", "client_review", "interview_scheduled", "interview_completed", "approved_by_client"], color: "hsl(var(--accent))" },
  { key: "documents", stages: ["documents_collection", "document_generation", "documents_signed"], color: "hsl(45, 80%, 50%)" },
  { key: "visa", stages: ["visa_application", "police_interview", "visa_approved"], color: "hsl(280, 60%, 55%)" },
  { key: "arrived", stages: ["arrived"], color: "hsl(var(--success))" },
];

export default function ManagementDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["mgmt-stats"],
    queryFn: async () => {
      const [companies, orders, workers, profiles] = await Promise.all([
        supabase.from("companies").select("id, is_active"),
        supabase.from("orders").select("id, status, created_at"),
        supabase.from("workers").select("id, status, current_stage, created_at"),
        supabase.from("profiles").select("id, is_active"),
      ]);
      return {
        companies: companies.data || [],
        orders: orders.data || [],
        workers: workers.data || [],
        profiles: profiles.data || [],
      };
    },
  });

  const activeClients = stats?.companies.filter((c: any) => c.is_active).length || 0;
  const openOrders = stats?.orders.filter((o: any) => !["fulfilled", "cancelled", "draft"].includes(o.status)).length || 0;
  const totalWorkers = stats?.workers.filter((w: any) => w.status === "active").length || 0;
  const arrivedWorkers = stats?.workers.filter((w: any) => w.current_stage === "arrived" && w.status === "active").length || 0;
  const totalUsers = stats?.profiles.length || 0;

  // Pipeline distribution for pie chart
  const pipelineData = STAGE_GROUPS.map((g) => ({
    name: t(`mgmt.group_${g.key}` as any),
    value: stats?.workers.filter((w: any) => w.status === "active" && g.stages.includes(w.current_stage)).length || 0,
    color: g.color,
  })).filter((d) => d.value > 0);

  // Orders by status for bar chart
  const statusCounts: Record<string, number> = {};
  stats?.orders.forEach((o: any) => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });
  const ordersByStatus = Object.entries(statusCounts).map(([status, count]) => ({
    status: t(`orders.status${status.charAt(0).toUpperCase() + status.slice(1).replace(/_./g, (m) => m[1].toUpperCase())}` as any),
    count,
  }));

  const kpiCards = [
    { label: t("ops.activeClients"), value: activeClients, icon: Building2 },
    { label: t("ops.openOrders"), value: openOrders, icon: ClipboardList },
    { label: t("ops.workersInPipeline"), value: totalWorkers, icon: Activity },
    { label: t("dashboard.workersArrived"), value: arrivedWorkers, icon: TrendingUp },
    { label: t("mgmt.totalUsers" as any), value: totalUsers, icon: Users },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">{t("mgmt.dashboardTitle" as any)}</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/management/users")}>
              <UserCog className="h-4 w-4 mr-1" />{t("mgmt.manageUsers" as any)}
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/management/reports")}>
              <BarChart3 className="h-4 w-4 mr-1" />{t("nav.reports")}
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {kpiCards.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pipeline distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("mgmt.pipelineDistribution" as any)}</CardTitle>
            </CardHeader>
            <CardContent>
              {pipelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={pipelineData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                      {pipelineData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">{t("common.noResults")}</p>
              )}
            </CardContent>
          </Card>

          {/* Orders by status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("mgmt.ordersByStatus" as any)}</CardTitle>
            </CardHeader>
            <CardContent>
              {ordersByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={ordersByStatus}>
                    <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">{t("common.noResults")}</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: t("ops.allClients"), path: "/ops/clients" },
            { label: t("ops.allOrders"), path: "/ops/orders" },
            { label: t("ops.allWorkers"), path: "/ops/workers" },
          ].map((link) => (
            <Card key={link.path} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(link.path)}>
              <CardContent className="py-4 flex items-center justify-between">
                <span className="font-medium">{link.label}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <MyTasksWidget />
          <CrmQuickView />
        </div>

        <LeadFunnelChart />
      </div>
    </AppLayout>
  );
}
