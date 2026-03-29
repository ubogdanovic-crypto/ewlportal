import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLead, useLeadActivities } from "@/hooks/api/useLeads";
import { queryKeys } from "@/lib/queryKeys";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Phone, Mail, MessageSquare, StickyNote, Users as UsersIcon, Send, Loader2, Calendar, Building2, CheckSquare, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const LEAD_STATUSES = ["cold", "warm", "hot", "negotiating", "won", "lost"] as const;
const STATUS_COLORS: Record<string, string> = {
  cold: "bg-slate-100 text-slate-700 border-slate-300",
  warm: "bg-amber-100 text-amber-700 border-amber-300",
  hot: "bg-red-100 text-red-700 border-red-300",
  negotiating: "bg-blue-100 text-blue-700 border-blue-300",
  won: "bg-success/15 text-success border-success/30",
  lost: "bg-muted text-muted-foreground",
};

const ACTIVITY_ICONS: Record<string, any> = {
  call: Phone,
  meeting: UsersIcon,
  email: Mail,
  whatsapp: MessageSquare,
  note: StickyNote,
};

export default function LeadDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: lead, isLoading } = useLead(id!);
  const { data: activities = [] } = useLeadActivities(id!);

  const [activityType, setActivityType] = useState("call");
  const [activityContent, setActivityContent] = useState("");
  const [activityOutcome, setActivityOutcome] = useState("");
  const [savingActivity, setSavingActivity] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [converting, setConverting] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    setUpdatingStatus(true);
    const { error } = await supabase.from("leads").update({ status: newStatus }).eq("id", id);
    setUpdatingStatus(false);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
  };

  const handleAddActivity = async () => {
    if (!activityContent.trim() || !user || !id) return;
    setSavingActivity(true);
    const { error } = await supabase.from("lead_activities").insert({
      lead_id: id,
      activity_type: activityType,
      content: activityContent.trim(),
      outcome: activityOutcome.trim() || null,
      created_by: user.id,
    });
    setSavingActivity(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("crm.activityAdded"));
    setActivityContent("");
    setActivityOutcome("");
    queryClient.invalidateQueries({ queryKey: queryKeys.leads.activities(id) });
  };

  const handleUpdateField = async (field: string, value: string | null) => {
    if (!id) return;
    const { error } = await supabase.from("leads").update({ [field]: value }).eq("id", id);
    if (error) toast.error(error.message);
    else queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
  };

  const handleConvertToClient = async () => {
    if (!lead || !id) return;
    setConverting(true);
    // Create company from lead
    const { data: company, error: companyErr } = await supabase.from("companies").insert({
      name: lead.company_name,
      contact_person: lead.contact_person,
      contact_email: lead.contact_email,
      contact_phone: lead.contact_phone,
      is_active: true,
    }).select("id").single();

    if (companyErr || !company) {
      toast.error(companyErr?.message || "Failed to create company");
      setConverting(false);
      return;
    }

    // Update lead status and link to company
    await supabase.from("leads").update({
      status: "won",
      converted_company_id: company.id,
    }).eq("id", id);

    setConverting(false);
    toast.success(t("crm.converted"));
    queryClient.invalidateQueries({ queryKey: queryKeys.leads.detail(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
  };

  const handleCreateTask = async () => {
    if (!taskTitle.trim() || !user || !id) return;
    setSavingTask(true);
    const { error } = await supabase.from("tasks").insert({
      title: taskTitle.trim(),
      entity_type: "lead",
      entity_id: id,
      assigned_to: user.id,
      due_date: taskDueDate || null,
      created_by: user.id,
    });
    setSavingTask(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("tasks.taskCreated"));
    setTaskTitle("");
    setTaskDueDate("");
    setTaskDialogOpen(false);
  };

  if (isLoading || !lead) {
    return (
      <AppLayout>
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </AppLayout>
    );
  }

  const isOverdue = lead.next_action_date && new Date(lead.next_action_date) < new Date();

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/crm/leads")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{lead.company_name}</h1>
            {lead.contact_person && (
              <p className="text-muted-foreground">{lead.contact_person}</p>
            )}
          </div>
          <Select value={lead.status} onValueChange={handleStatusChange} disabled={updatingStatus}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{t(`crm.${s}` as any)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("crm.leadDetail")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground">{t("crm.contactEmail")}</span>
                    <p className="font-medium">{lead.contact_email || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("crm.contactPhone")}</span>
                    <p className="font-medium">{lead.contact_phone || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("crm.source")}</span>
                    <p className="font-medium">{t(`crm.source${lead.source.charAt(0).toUpperCase() + lead.source.slice(1)}` as any)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("crm.estimatedWorkers")}</span>
                    <p className="font-medium">{lead.estimated_workers || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("crm.estimatedRevenue")}</span>
                    <p className="font-medium">{lead.estimated_revenue_eur ? `€${lead.estimated_revenue_eur}` : "—"}</p>
                  </div>
                </div>
                {lead.notes && (
                  <div>
                    <span className="text-muted-foreground">{t("orders.notes")}</span>
                    <p className="mt-1 whitespace-pre-wrap">{lead.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Log */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("crm.activities")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Activity */}
                <div className="space-y-3 border rounded-lg p-3">
                  <div className="flex gap-2">
                    {(["call", "meeting", "email", "whatsapp", "note"] as const).map((type) => {
                      const Icon = ACTIVITY_ICONS[type];
                      return (
                        <Button
                          key={type}
                          size="sm"
                          variant={activityType === type ? "default" : "outline"}
                          onClick={() => setActivityType(type)}
                          className="h-8"
                        >
                          <Icon className="h-3.5 w-3.5 mr-1" />
                          {t(`crm.log${type.charAt(0).toUpperCase() + type.slice(1)}` as any)}
                        </Button>
                      );
                    })}
                  </div>
                  <Textarea
                    placeholder={t("crm.content")}
                    value={activityContent}
                    onChange={(e) => setActivityContent(e.target.value)}
                    rows={2}
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder={t("crm.outcome")}
                      value={activityOutcome}
                      onChange={(e) => setActivityOutcome(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={handleAddActivity} disabled={savingActivity || !activityContent.trim()} size="sm">
                      {savingActivity ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-3">
                  {activities.map((a: any) => {
                    const Icon = ACTIVITY_ICONS[a.activity_type] || StickyNote;
                    return (
                      <div key={a.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="mt-0.5">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">{a.activity_type}</Badge>
                            <span>{format(new Date(a.created_at), "MMM d, yyyy HH:mm")}</span>
                          </div>
                          <p className="text-sm mt-1 whitespace-pre-wrap">{a.content}</p>
                          {a.outcome && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {t("crm.outcome")}: {a.outcome}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {activities.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No activities yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-4">
            {/* Next Action */}
            <Card className={isOverdue ? "border-warning/50" : ""}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t("crm.nextAction")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={lead.next_action || ""}
                  placeholder={t("crm.nextAction")}
                  onBlur={(e) => handleUpdateField("next_action", e.target.value || null)}
                  onChange={() => {}}
                  defaultValue={lead.next_action || ""}
                />
                <Input
                  type="date"
                  defaultValue={lead.next_action_date || ""}
                  onBlur={(e) => handleUpdateField("next_action_date", e.target.value || null)}
                />
                {isOverdue && (
                  <p className="text-xs text-warning font-medium">Overdue!</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Status */}
            <Card>
              <CardContent className="pt-4 space-y-2">
                <Label className="text-xs text-muted-foreground">{t("common.status")}</Label>
                <div className="flex flex-wrap gap-1">
                  {LEAD_STATUSES.map((s) => (
                    <Badge
                      key={s}
                      variant="outline"
                      className={`cursor-pointer ${lead.status === s ? STATUS_COLORS[s] + " ring-1 ring-offset-1" : "opacity-50 hover:opacity-100"}`}
                      onClick={() => handleStatusChange(s)}
                    >
                      {t(`crm.${s}` as any)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-4 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setTaskDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("tasks.newTask")}
                </Button>
                {lead.status !== "won" && lead.status !== "lost" && (
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleConvertToClient}
                    disabled={converting}
                  >
                    {converting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Building2 className="h-4 w-4 mr-1" />}
                    {t("crm.convertToClient")}
                  </Button>
                )}
                {lead.converted_company_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-success"
                    onClick={() => navigate(`/ops/clients/${lead.converted_company_id}`)}
                  >
                    <Building2 className="h-4 w-4 mr-1" />
                    View Client
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tasks.newTask")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{t("tasks.title")} *</Label>
              <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder={`e.g. Follow up with ${lead.contact_person || lead.company_name}`} />
            </div>
            <div className="space-y-2">
              <Label>{t("tasks.dueDate")}</Label>
              <Input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">{t("tasks.linkedTo")}: {lead.company_name}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleCreateTask} disabled={savingTask || !taskTitle.trim()}>
              {savingTask && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
