import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkersPipelineTab } from "@/components/WorkersPipelineTab";
import { toast } from "sonner";
import { sendNotification, orderStatusEmail } from "@/lib/notifications";
import { ArrowLeft, Loader2, Users, FileText, Bell, Clock, StickyNote, MessageSquare, Send } from "lucide-react";
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

export default function OpsOrderDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");
  const [logContent, setLogContent] = useState("");
  const [logDirection, setLogDirection] = useState("outbound");
  const [logChannel, setLogChannel] = useState("email");
  const [logSubject, setLogSubject] = useState("");
  const [logContact, setLogContact] = useState("");

  const { data: order, isLoading } = useQuery({
    queryKey: ["ops-order", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*, companies(name)").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: notes = [], refetch: refetchNotes } = useQuery({
    queryKey: ["ops-order-notes", id],
    queryFn: async () => {
      const { data } = await supabase.from("internal_notes").select("*").eq("entity_type", "order").eq("entity_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: protekLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ["ops-order-protek", id],
    queryFn: async () => {
      const { data } = await supabase.from("protek_communication_log").select("*").eq("order_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;
    await supabase.from("internal_notes").insert({ entity_type: "order", entity_id: id!, content: newNote.trim(), created_by: user.id });
    setNewNote("");
    refetchNotes();
    toast.success(t("ops.noteAdded"));
  };

  const handleAddLog = async () => {
    if (!logContent.trim() || !user) return;
    await supabase.from("protek_communication_log").insert({
      order_id: id!, direction: logDirection as any, channel: logChannel as any,
      subject: logSubject, content: logContent.trim(), contact_person: logContact, created_by: user.id,
    });
    setLogContent(""); setLogSubject(""); setLogContact("");
    refetchLogs();
    toast.success(t("ops.logAdded"));
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;
    const updates: any = { status: newStatus };
    if (newStatus === "submitted" && !order.submitted_at) updates.submitted_at = new Date().toISOString();
    if (newStatus === "confirmed" && !order.confirmed_at) updates.confirmed_at = new Date().toISOString();
    await supabase.from("orders").update(updates).eq("id", order.id);
    queryClient.invalidateQueries({ queryKey: ["ops-order", id] });
    toast.success(t("ops.statusUpdated"));

    // Send notification to client company users
    const companyName = (order.companies as any)?.name || "";
    const statusText = t(`orders.status${newStatus.charAt(0).toUpperCase() + newStatus.slice(1).replace(/_./g, (m) => m[1].toUpperCase())}` as any);
    const { subject, body } = orderStatusEmail(order.reference_number, statusText, companyName);

    const { data: companyUsers } = await supabase
      .from("profiles")
      .select("user_id, email")
      .eq("company_id", order.company_id);

    (companyUsers || []).forEach((u: any) => {
      sendNotification({
        recipientEmail: u.email,
        recipientUserId: u.user_id,
        type: "order_status_change",
        subject,
        body,
        entityType: "order",
        entityId: order.id,
      });
    });
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      draft: "orders.statusDraft", submitted: "orders.statusSubmitted", confirmed: "orders.statusConfirmed",
      sourcing: "orders.statusSourcing", in_progress: "orders.statusInProgress", fulfilled: "orders.statusFulfilled",
      cancelled: "orders.statusCancelled",
    };
    return t(map[status] || status);
  };

  if (isLoading) return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>;
  if (!order) return <AppLayout><div className="text-center py-12"><p className="text-muted-foreground">Order not found</p></div></AppLayout>;

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
          <Button variant="ghost" size="icon" onClick={() => navigate("/ops/orders")}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{order.reference_number}</h1>
              <Badge variant="outline" className={STATUS_COLORS[order.status] || ""}>{statusLabel(order.status)}</Badge>
            </div>
            <p className="text-muted-foreground">{order.position_title} · {(order.companies as any)?.name} · {order.number_of_workers} workers</p>
          </div>
          <Select value={order.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["draft", "submitted", "confirmed", "sourcing", "in_progress", "fulfilled", "cancelled"].map((s) => (
                <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">{t("orders.overview")}</TabsTrigger>
            <TabsTrigger value="workers"><Users className="h-4 w-4 mr-1" />{t("orders.workersPipeline")}</TabsTrigger>
            <TabsTrigger value="documents"><FileText className="h-4 w-4 mr-1" />{t("orders.documents")}</TabsTrigger>
            <TabsTrigger value="notes"><StickyNote className="h-4 w-4 mr-1" />{t("ops.internalNotes")}</TabsTrigger>
            <TabsTrigger value="protek"><MessageSquare className="h-4 w-4 mr-1" />{t("ops.protekLog")}</TabsTrigger>
            <TabsTrigger value="timeline"><Clock className="h-4 w-4 mr-1" />{t("orders.timeline")}</TabsTrigger>
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
                <InfoRow label={t("orders.monthlySalary")} value={order.monthly_salary_eur ? `€${order.monthly_salary_eur}` : null} />
                <InfoRow label={t("orders.accommodationProvided")} value={order.accommodation_provided ? t("common.yes") : t("common.no")} />
                {order.job_description && <div className="mt-3"><p className="text-sm text-muted-foreground mb-1">{t("orders.jobDescription")}:</p><p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">{order.job_description}</p></div>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workers" className="mt-4">
            <WorkersPipelineTab orderId={order.id} />
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <Card><CardContent className="py-12 text-center text-muted-foreground">{t("orders.noDocumentsYet")}</CardContent></Card>
          </TabsContent>

          <TabsContent value="notes" className="mt-4 space-y-4">
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex gap-2">
                  <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder={t("ops.addNotePlaceholder")} rows={2} className="flex-1" maxLength={1000} />
                  <Button size="icon" onClick={handleAddNote} disabled={!newNote.trim()}><Send className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
            {notes.map((note: any) => (
              <Card key={note.id}>
                <CardContent className="py-3">
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">{format(new Date(note.created_at), "dd MMM yyyy HH:mm")}</p>
                </CardContent>
              </Card>
            ))}
            {notes.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t("ops.noNotes")}</p>}
          </TabsContent>

          <TabsContent value="protek" className="mt-4 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">{t("ops.addLogEntry")}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Select value={logDirection} onValueChange={setLogDirection}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outbound">{t("ops.outbound")}</SelectItem>
                      <SelectItem value="inbound">{t("ops.inbound")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={logChannel} onValueChange={setLogChannel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">{t("pipeline.phone")}</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="meeting">{t("ops.meeting")}</SelectItem>
                      <SelectItem value="other">{t("ops.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder={t("ops.contactPerson")} value={logContact} onChange={(e) => setLogContact(e.target.value)} maxLength={100} />
                  <Input placeholder={t("ops.subject")} value={logSubject} onChange={(e) => setLogSubject(e.target.value)} maxLength={200} />
                </div>
                <div className="flex gap-2">
                  <Textarea value={logContent} onChange={(e) => setLogContent(e.target.value)} placeholder={t("ops.logContentPlaceholder")} rows={2} className="flex-1" maxLength={2000} />
                  <Button size="icon" onClick={handleAddLog} disabled={!logContent.trim()}><Send className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
            {protekLogs.map((log: any) => (
              <Card key={log.id}>
                <CardContent className="py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={log.direction === "inbound" ? "bg-info/15 text-info border-info/30" : "bg-accent/15 text-accent border-accent/30"}>
                      {log.direction === "inbound" ? "←" : "→"} {log.channel}
                    </Badge>
                    {log.contact_person && <span className="text-xs text-muted-foreground">{log.contact_person}</span>}
                    {log.subject && <span className="text-xs font-medium">· {log.subject}</span>}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{log.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">{format(new Date(log.created_at), "dd MMM yyyy HH:mm")}</p>
                </CardContent>
              </Card>
            ))}
            {protekLogs.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t("ops.noLogs")}</p>}
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <Card><CardContent className="py-12 text-center text-muted-foreground">{t("orders.noTimelineYet")}</CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
