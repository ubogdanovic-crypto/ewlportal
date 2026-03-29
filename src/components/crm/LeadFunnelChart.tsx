import { useTranslation } from "react-i18next";
import { useLeads } from "@/hooks/api/useLeads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Target } from "lucide-react";

const FUNNEL_STAGES = [
  { key: "cold", color: "#94a3b8" },
  { key: "warm", color: "#f59e0b" },
  { key: "hot", color: "#ef4444" },
  { key: "negotiating", color: "#3b82f6" },
  { key: "won", color: "#22c55e" },
  { key: "lost", color: "#6b7280" },
];

export function LeadFunnelChart() {
  const { t } = useTranslation();
  const { data: leads = [] } = useLeads();

  if (leads.length === 0) return null;

  const data = FUNNEL_STAGES.map(({ key, color }) => ({
    name: t(`crm.${key}` as any),
    count: leads.filter((l: any) => l.status === key).length,
    color,
  })).filter((d) => d.count > 0 || FUNNEL_STAGES.findIndex((s) => s.key === d.name) < 5);

  const totalWorkers = leads.reduce((sum: number, l: any) => sum + (l.estimated_workers || 0), 0);
  const totalRevenue = leads.reduce((sum: number, l: any) => sum + (parseFloat(l.estimated_revenue_eur) || 0), 0);
  const wonCount = leads.filter((l: any) => l.status === "won").length;
  const conversionRate = leads.length > 0 ? Math.round((wonCount / leads.length) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          Lead Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4 text-center">
          <div>
            <p className="text-2xl font-bold">{leads.length}</p>
            <p className="text-xs text-muted-foreground">Total Leads</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{conversionRate}%</p>
            <p className="text-xs text-muted-foreground">Conversion</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{totalWorkers}</p>
            <p className="text-xs text-muted-foreground">Est. Workers</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={75} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {totalRevenue > 0 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Pipeline value: {totalRevenue.toLocaleString()} EUR
          </p>
        )}
      </CardContent>
    </Card>
  );
}
