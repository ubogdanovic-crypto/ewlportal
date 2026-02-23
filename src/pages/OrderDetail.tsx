import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkersPipelineTab } from "@/components/WorkersPipelineTab";
import { ArrowLeft, Loader2, Users, FileText, Bell, Clock } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-info/15 text-info border-info/30",
  confirmed: "bg-primary/15 text-primary border-primary/30",
  sourcing: "bg-accent/15 text-accent border-accent/30",
  in_progress: "bg-warning/15 text-warning border-warning/30",
  fulfilled: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function OrderDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      draft: "orders.statusDraft",
      submitted: "orders.statusSubmitted",
      confirmed: "orders.statusConfirmed",
      sourcing: "orders.statusSourcing",
      in_progress: "orders.statusInProgress",
      fulfilled: "orders.statusFulfilled",
      cancelled: "orders.statusCancelled",
    };
    return t(map[status] || status);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!order) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Order not found</p>
          <Button variant="outline" onClick={() => navigate("/orders")} className="mt-4">
            {t("common.back")}
          </Button>
        </div>
      </AppLayout>
    );
  }

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value || "—"}</span>
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/orders")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{order.reference_number}</h1>
              <Badge variant="outline" className={STATUS_COLORS[order.status] || ""}>
                {statusLabel(order.status)}
              </Badge>
            </div>
            <p className="text-muted-foreground">{order.position_title} · {order.number_of_workers} {t("orders.workers").toLowerCase()}</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">{t("orders.overview")}</TabsTrigger>
            <TabsTrigger value="workers">
              <Users className="h-4 w-4 mr-1" />
              {t("orders.workersPipeline")}
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="h-4 w-4 mr-1" />
              {t("orders.documents")}
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-1" />
              {t("orders.notifications")}
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <Clock className="h-4 w-4 mr-1" />
              {t("orders.timeline")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">{t("orders.jobInfo")}</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label={t("orders.positionTitle")} value={order.position_title} />
                <InfoRow label={t("orders.numberOfWorkers")} value={order.number_of_workers} />
                <InfoRow label={t("orders.sourceCountry")} value={order.source_country} />
                <InfoRow label={t("orders.startDate")} value={order.start_date ? format(new Date(order.start_date), "dd MMM yyyy") : null} />
                <InfoRow label={t("orders.contractDuration")} value={order.contract_duration_months ? `${order.contract_duration_months} months` : null} />
                <InfoRow label={t("orders.workSchedule")} value={order.work_schedule} />
                <InfoRow label={t("orders.serbianLanguage")} value={order.serbian_language_required ? t("common.yes") : t("common.no")} />
                <InfoRow label={t("orders.experienceYears")} value={order.experience_years} />
                <InfoRow label={t("orders.educationLevel")} value={order.education_level} />
                {order.job_description && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-1">{t("orders.jobDescription")}:</p>
                    <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">{order.job_description}</p>
                  </div>
                )}
                {order.requirements && (
                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground mb-1">{t("orders.requirements")}:</p>
                    <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">{order.requirements}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">{t("orders.compensation")}</CardTitle></CardHeader>
              <CardContent>
                <InfoRow label={t("orders.monthlySalary")} value={order.monthly_salary_eur ? `€${order.monthly_salary_eur}${t("orders.perMonth")}` : null} />
                <InfoRow label={t("orders.transportationProvided")} value={order.transportation_provided ? t("common.yes") : t("common.no")} />
                <InfoRow label={t("orders.mealsProvided")} value={order.meals_provided ? t("common.yes") : t("common.no")} />
                {order.other_benefits && <InfoRow label={t("orders.otherBenefits")} value={order.other_benefits} />}
              </CardContent>
            </Card>

            {order.accommodation_provided && (
              <Card>
                <CardHeader><CardTitle className="text-lg">{t("orders.accommodation")}</CardTitle></CardHeader>
                <CardContent>
                  <InfoRow label={t("orders.accommodationType")} value={order.accommodation_type} />
                  <InfoRow label={t("orders.accommodationAddress")} value={order.accommodation_address} />
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="workers" className="mt-4">
            <WorkersPipelineTab orderId={order.id} />
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <Card><CardContent className="py-12 text-center text-muted-foreground">{t("orders.noDocumentsYet")}</CardContent></Card>
          </TabsContent>

          <TabsContent value="notifications" className="mt-4">
            <Card><CardContent className="py-12 text-center text-muted-foreground">{t("orders.noNotificationsYet")}</CardContent></Card>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <Card><CardContent className="py-12 text-center text-muted-foreground">{t("orders.noTimelineYet")}</CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
