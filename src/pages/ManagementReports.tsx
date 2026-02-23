import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STAGE_ORDER } from "@/components/PipelineStage";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Loader2 } from "lucide-react";
import { format, subMonths, startOfMonth } from "date-fns";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(45, 80%, 50%)",
  "hsl(280, 60%, 55%)",
  "hsl(var(--success))",
  "hsl(0, 70%, 55%)",
  "hsl(190, 70%, 45%)",
];

export default function ManagementReports() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["mgmt-reports"],
    queryFn: async () => {
      const [orders, workers, companies] = await Promise.all([
        supabase.from("orders").select("id, status, created_at, company_id, number_of_workers"),
        supabase.from("workers").select("id, status, current_stage, created_at, company_id"),
        supabase.from("companies").select("id, name, is_active"),
      ]);
      return {
        orders: orders.data || [],
        workers: workers.data || [],
        companies: companies.data || [],
      };
    },
  });

  if (isLoading) {
    return <AppLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>;
  }

  const { orders = [], workers = [], companies = [] } = data || {};

  // 1. Workers per pipeline stage
  const stageCounts = STAGE_ORDER.map((stage) => ({
    stage: t(`pipeline.${stage}` as any),
    count: workers.filter((w: any) => w.status === "active" && w.current_stage === stage).length,
  }));

  // 2. Monthly order trend (last 6 months)
  const monthlyOrders = Array.from({ length: 6 }, (_, i) => {
    const month = startOfMonth(subMonths(new Date(), 5 - i));
    const label = format(month, "MMM yyyy");
    const count = orders.filter((o: any) => {
      const d = new Date(o.created_at);
      return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
    }).length;
    return { month: label, count };
  });

  // 3. Top clients by worker count
  const companyWorkerCounts: Record<string, number> = {};
  workers.forEach((w: any) => {
    companyWorkerCounts[w.company_id] = (companyWorkerCounts[w.company_id] || 0) + 1;
  });
  const companyMap = Object.fromEntries(companies.map((c: any) => [c.id, c.name]));
  const topClients = Object.entries(companyWorkerCounts)
    .map(([id, count]) => ({ name: companyMap[id] || "Unknown", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // 4. Worker status distribution
  const statusDist = [
    { name: t("pipeline.status_active"), value: workers.filter((w: any) => w.status === "active").length, color: COLORS[0] },
    { name: t("pipeline.status_rejected"), value: workers.filter((w: any) => w.status === "rejected").length, color: COLORS[5] },
    { name: t("pipeline.status_withdrawn"), value: workers.filter((w: any) => w.status === "withdrawn").length, color: COLORS[2] },
    { name: t("pipeline.status_completed"), value: workers.filter((w: any) => w.status === "completed").length, color: COLORS[4] },
  ].filter((d) => d.value > 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("mgmt.reportsTitle" as any)}</h1>

        {/* Pipeline funnel */}
        <Card>
          <CardHeader><CardTitle className="text-lg">{t("mgmt.pipelineFunnel" as any)}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stageCounts} layout="vertical">
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="stage" type="category" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly orders trend */}
          <Card>
            <CardHeader><CardTitle className="text-lg">{t("mgmt.monthlyOrders" as any)}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyOrders}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Worker status distribution */}
          <Card>
            <CardHeader><CardTitle className="text-lg">{t("mgmt.workerStatusDist" as any)}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                    {statusDist.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top clients */}
        {topClients.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">{t("mgmt.topClients" as any)}</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topClients}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
