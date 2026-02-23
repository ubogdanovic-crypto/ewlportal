import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, Activity } from "lucide-react";

export default function ManagementDashboard() {
  const { t } = useTranslation();

  const stats = [
    { label: "Workers Placed (Month)", value: "0", icon: Users },
    { label: "Pipeline Total", value: "0", icon: Activity },
    { label: "Avg. Time to Placement", value: "—", icon: TrendingUp },
    { label: "Active Clients", value: "0", icon: BarChart3 },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{t("nav.management")} {t("dashboard.title")}</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">KPI Charts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Charts will be added in Phase 9.</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
