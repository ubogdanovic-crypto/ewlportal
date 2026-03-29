import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Users, CheckCircle2, Clock, ArrowRight, Loader2 } from "lucide-react";

export default function PartnerDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["partner-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, companies(name)")
        .not("status", "in", '("cancelled","fulfilled")')
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: workers = [] } = useQuery({
    queryKey: ["partner-workers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("workers").select("*");
      if (error) throw error;
      return data;
    },
  });

  const activeOrders = orders.length;
  const totalSubmitted = workers.length;
  const accepted = workers.filter((w: any) => w.status === "active" && w.current_stage !== "sourcing").length;
  const acceptanceRate = totalSubmitted > 0 ? Math.round((accepted / totalSubmitted) * 100) : 0;
  const pending = workers.filter((w: any) => w.current_stage === "sourcing" || w.current_stage === "cv_screening").length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("partner.dashboard")}</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{t("partner.activeOrders")}</p>
                <ClipboardList className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold mt-1">{loadingOrders ? "—" : activeOrders}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{t("partner.candidatesSubmitted")}</p>
                <Users className="h-4 w-4 text-accent" />
              </div>
              <p className="text-2xl font-bold mt-1">{totalSubmitted}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{t("partner.acceptanceRate")}</p>
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
              <p className="text-2xl font-bold mt-1">{acceptanceRate}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{t("partner.pending")}</p>
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <p className="text-2xl font-bold mt-1">{pending}</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Orders */}
        <Card>
          <CardHeader>
            <CardTitle>{t("partner.activeOrders")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t("partner.noOrders")}</p>
            ) : (
              <div className="space-y-3">
                {orders.map((order: any) => {
                  const orderWorkers = workers.filter((w: any) => w.order_id === order.id);
                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/partner/orders/${order.id}`)}
                    >
                      <div>
                        <p className="font-medium">{order.reference_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.position_title} — {order.number_of_workers} {t("partner.workersNeeded")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(order.companies as any)?.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium">{orderWorkers.length}/{order.number_of_workers}</p>
                          <p className="text-xs text-muted-foreground">{t("partner.submitted")}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
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
