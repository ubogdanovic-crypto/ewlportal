import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { MyTasksWidget } from "@/components/tasks/MyTasksWidget";
import { CrmQuickView } from "@/components/crm/CrmQuickView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, ClipboardList, Users, AlertTriangle } from "lucide-react";
import { PipelineStageBadge } from "@/components/PipelineStage";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Constants } from "@/integrations/supabase/types";

const ORDER_STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-info/15 text-info border-info/30",
  confirmed: "bg-primary/15 text-primary border-primary/30",
  sourcing: "bg-accent/15 text-accent border-accent/30",
  in_progress: "bg-warning/15 text-warning border-warning/30",
  fulfilled: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function OpsDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: companies = [] } = useQuery({
    queryKey: ["ops-companies"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("*").eq("is_active", true);
      return data || [];
    },
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["ops-orders-all"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: workers = [] } = useQuery({
    queryKey: ["ops-workers-all"],
    queryFn: async () => {
      const { data } = await supabase.from("workers").select("*").eq("status", "active");
      return data || [];
    },
  });

  const openOrders = orders.filter((o: any) => !["fulfilled", "cancelled", "draft"].includes(o.status));
  const recentOrders = orders.slice(0, 10);

  // Workers needing attention: stuck in same stage or missing docs
  const stalledWorkers = workers.filter((w: any) => {
    const daysSinceUpdate = (Date.now() - new Date(w.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > 7;
  });

  const stats = [
    { label: t("ops.activeClients"), value: companies.length.toString(), icon: Building2, color: "text-info" },
    { label: t("ops.openOrders"), value: openOrders.length.toString(), icon: ClipboardList, color: "text-accent" },
    { label: t("ops.workersInPipeline"), value: workers.length.toString(), icon: Users, color: "text-primary" },
    { label: t("ops.stalledWorkers"), value: stalledWorkers.length.toString(), icon: AlertTriangle, color: "text-warning" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{t("ops.dashboardTitle")}</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="cursor-pointer hover:shadow-md transition-shadow">
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

        {/* Workers by pipeline stage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("ops.workersByStage" as any, "Workers by Pipeline Stage")}</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const allStages = Constants.public.Enums.pipeline_stage;
              const stageCounts = allStages.map((stage) => ({
                stage: stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                count: workers.filter((w: any) => w.current_stage === stage).length,
              }));
              const colors = [
                "hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--info))",
                "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--destructive))",
                "hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--info))",
                "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--destructive))",
                "hsl(var(--primary))", "hsl(var(--accent))",
              ];
              return (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stageCounts} layout="vertical" margin={{ left: 120 }}>
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="stage" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {stageCounts.map((_, i) => (
                        <Cell key={i} fill={colors[i % colors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </CardContent>
        </Card>

        {/* Attention required */}
        {stalledWorkers.length > 0 && (
          <Card className="border-warning/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                {t("ops.attentionRequired")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stalledWorkers.slice(0, 5).map((w: any) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50 cursor-pointer hover:bg-muted"
                    onClick={() => navigate(`/ops/workers/${w.id}`)}
                  >
                    <span className="text-sm font-medium">{w.first_name} {w.last_name}</span>
                    <PipelineStageBadge stage={w.current_stage} size="sm" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("ops.recentOrders")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("orders.referenceNumber")}</TableHead>
                  <TableHead>{t("orders.position")}</TableHead>
                  <TableHead>{t("orders.workers")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("orders.createdAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order: any) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/ops/orders/${order.id}`)}
                  >
                    <TableCell className="font-medium text-primary">{order.reference_number}</TableCell>
                    <TableCell>{order.position_title}</TableCell>
                    <TableCell className="text-center">{order.number_of_workers}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={ORDER_STATUS_COLORS[order.status] || ""}>
                        {t(`orders.status${order.status.charAt(0).toUpperCase() + order.status.slice(1).replace("_p", "P")}` as any)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(order.created_at), "dd MMM yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
                {recentOrders.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t("common.noResults")}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <MyTasksWidget />
          <CrmQuickView />
        </div>
      </div>
    </AppLayout>
  );
}
