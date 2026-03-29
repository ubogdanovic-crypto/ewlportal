import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useLeads } from "@/hooks/api/useLeads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, ArrowRight, AlertTriangle } from "lucide-react";

const STATUS_ORDER = ["cold", "warm", "hot", "negotiating", "won", "lost"] as const;
const STATUS_COLORS: Record<string, string> = {
  cold: "bg-slate-100 text-slate-700",
  warm: "bg-amber-100 text-amber-700",
  hot: "bg-red-100 text-red-700",
  negotiating: "bg-blue-100 text-blue-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-gray-100 text-gray-500",
};

export function CrmQuickView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: leads = [] } = useLeads();

  const counts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = leads.filter((l: any) => l.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const overdueCount = leads.filter(
    (l: any) => l.next_action_date && new Date(l.next_action_date) < new Date() && l.status !== "won" && l.status !== "lost"
  ).length;

  if (leads.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            {t("crm.leads")}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/crm/leads")} className="text-xs">
            {t("crm.allLeads")} <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-3">
          {STATUS_ORDER.filter((s) => s !== "lost").map((s) => (
            <div key={s} className="text-center">
              <Badge variant="outline" className={`${STATUS_COLORS[s]} text-xs`}>
                {t(`crm.${s}` as any)}
              </Badge>
              <p className="text-lg font-bold mt-0.5">{counts[s]}</p>
            </div>
          ))}
        </div>
        {overdueCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-warning bg-warning/10 rounded-md px-3 py-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {overdueCount} {t("crm.overdueFollowups")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
