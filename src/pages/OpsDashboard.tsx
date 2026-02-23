import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ClipboardList, Users, AlertTriangle } from "lucide-react";

export default function OpsDashboard() {
  const { t } = useTranslation();

  const stats = [
    { label: "Active Clients", value: "0", icon: Building2 },
    { label: "Open Orders", value: "0", icon: ClipboardList },
    { label: "Workers in Pipeline", value: "0", icon: Users },
    { label: "Overdue Items", value: "0", icon: AlertTriangle },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Operations {t("dashboard.title")}</h1>

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
            <CardTitle className="text-lg">Attention Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">No items requiring attention.</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
