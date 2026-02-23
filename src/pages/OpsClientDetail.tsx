import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PipelineStageBadge } from "@/components/PipelineStage";
import { ArrowLeft, Loader2, Building2, ClipboardList, Users } from "lucide-react";
import { format } from "date-fns";

const ORDER_STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-info/15 text-info border-info/30",
  confirmed: "bg-primary/15 text-primary border-primary/30",
  sourcing: "bg-accent/15 text-accent border-accent/30",
  in_progress: "bg-warning/15 text-warning border-warning/30",
  fulfilled: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function OpsClientDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: company, isLoading } = useQuery({
    queryKey: ["ops-company", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["ops-company-orders", id],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*").eq("company_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: workers = [] } = useQuery({
    queryKey: ["ops-company-workers", id],
    queryFn: async () => {
      const { data } = await supabase.from("workers").select("*").eq("company_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["ops-company-profiles", id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("company_id", id!);
      return data || [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>;
  }

  if (!company) {
    return <AppLayout><div className="text-center py-12"><p className="text-muted-foreground">Company not found</p></div></AppLayout>;
  }

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value || "—"}</span>
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ops/clients")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">{company.name}</h1>
              <Badge variant="outline" className={company.is_active ? "bg-success/15 text-success border-success/30" : "bg-muted text-muted-foreground"}>
                {company.is_active ? t("ops.statusActive") : t("ops.statusInactive")}
              </Badge>
            </div>
          </div>
        </div>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">{t("ops.companyInfo")}</TabsTrigger>
            <TabsTrigger value="users">{t("ops.portalUsers")} ({profiles.length})</TabsTrigger>
            <TabsTrigger value="orders">{t("nav.orders")} ({orders.length})</TabsTrigger>
            <TabsTrigger value="workers">{t("nav.workers")} ({workers.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <InfoRow label={t("ops.companyName")} value={company.name} />
                <InfoRow label={t("ops.city")} value={company.city} />
                <InfoRow label={t("ops.country")} value={company.country} />
                <InfoRow label={t("ops.pib")} value={company.pib} />
                <InfoRow label={t("ops.maticniBroj")} value={company.maticni_broj} />
                <InfoRow label={t("ops.contactPerson")} value={company.contact_person} />
                <InfoRow label={t("ops.contactEmail")} value={company.contact_email} />
                <InfoRow label={t("ops.contactPhone")} value={company.contact_phone} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("pipeline.fullName")}</TableHead>
                    <TableHead>{t("pipeline.email")}</TableHead>
                    <TableHead>{t("pipeline.phone")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                      <TableCell>{p.email}</TableCell>
                      <TableCell>{p.phone || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={p.is_active ? "bg-success/15 text-success border-success/30" : "bg-muted text-muted-foreground"}>
                          {p.is_active ? t("ops.statusActive") : t("ops.statusInactive")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {profiles.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t("common.noResults")}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="mt-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("orders.referenceNumber")}</TableHead>
                    <TableHead>{t("orders.position")}</TableHead>
                    <TableHead className="text-center">{t("orders.workers")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    <TableHead>{t("orders.createdAt")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order: any) => (
                    <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/ops/orders/${order.id}`)}>
                      <TableCell className="font-medium text-primary">{order.reference_number}</TableCell>
                      <TableCell>{order.position_title}</TableCell>
                      <TableCell className="text-center">{order.number_of_workers}</TableCell>
                      <TableCell><Badge variant="outline" className={ORDER_STATUS_COLORS[order.status] || ""}>{order.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{format(new Date(order.created_at), "dd MMM yyyy")}</TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t("common.noResults")}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="workers" className="mt-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("pipeline.workerName")}</TableHead>
                    <TableHead>{t("pipeline.nationality")}</TableHead>
                    <TableHead>{t("pipeline.currentStage")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workers.map((w: any) => (
                    <TableRow key={w.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/ops/workers/${w.id}`)}>
                      <TableCell className="font-medium">{w.first_name} {w.last_name}</TableCell>
                      <TableCell className="text-muted-foreground">{w.nationality || "—"}</TableCell>
                      <TableCell><PipelineStageBadge stage={w.current_stage} size="sm" /></TableCell>
                      <TableCell>
                        <Badge variant="outline" className={w.status === "active" ? "bg-success/15 text-success border-success/30" : "bg-muted text-muted-foreground"}>
                          {t(`pipeline.status_${w.status}` as any)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {workers.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t("common.noResults")}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
