import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLeads } from "@/hooks/api/useLeads";
import { queryKeys } from "@/lib/queryKeys";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, LayoutGrid, List, Phone, Users, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const LEAD_STATUSES = ["cold", "warm", "hot", "negotiating", "won", "lost"] as const;
const LEAD_SOURCES = ["referral", "cold", "event", "website", "partner", "other"] as const;

const STATUS_COLORS: Record<string, string> = {
  cold: "bg-slate-100 text-slate-700 border-slate-300",
  warm: "bg-amber-100 text-amber-700 border-amber-300",
  hot: "bg-red-100 text-red-700 border-red-300",
  negotiating: "bg-blue-100 text-blue-700 border-blue-300",
  won: "bg-success/15 text-success border-success/30",
  lost: "bg-muted text-muted-foreground",
};

const emptyForm = {
  company_name: "", contact_person: "", contact_email: "", contact_phone: "",
  source: "other" as string, status: "cold" as string,
  estimated_workers: "", estimated_revenue_eur: "",
  next_action: "", next_action_date: "", notes: "",
};

export default function LeadsList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: leads = [], isLoading } = useLeads({ search: search || undefined });

  const handleSave = async () => {
    if (!form.company_name.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from("leads").insert({
      company_name: form.company_name.trim(),
      contact_person: form.contact_person.trim() || null,
      contact_email: form.contact_email.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      source: form.source,
      status: form.status,
      owner_id: user.id,
      estimated_workers: form.estimated_workers ? parseInt(form.estimated_workers) : null,
      estimated_revenue_eur: form.estimated_revenue_eur ? parseFloat(form.estimated_revenue_eur) : null,
      next_action: form.next_action.trim() || null,
      next_action_date: form.next_action_date || null,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("crm.leadSaved"));
    setForm(emptyForm);
    setDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
  };

  const leadsByStatus = LEAD_STATUSES.reduce((acc, status) => {
    acc[status] = leads.filter((l: any) => l.status === status);
    return acc;
  }, {} as Record<string, any[]>);

  const isOverdue = (lead: any) =>
    lead.next_action_date && new Date(lead.next_action_date) < new Date();

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{t("crm.leads")}</h1>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search")}
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button size="icon" variant={view === "kanban" ? "default" : "outline"} onClick={() => setView("kanban")}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button size="icon" variant={view === "table" ? "default" : "outline"} onClick={() => setView("table")}>
              <List className="h-4 w-4" />
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t("crm.newLead")}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : view === "kanban" ? (
          /* Kanban View */
          <div className="flex gap-3 overflow-x-auto pb-4">
            {LEAD_STATUSES.map((status) => (
              <div key={status} className="min-w-[240px] flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className={STATUS_COLORS[status]}>
                    {t(`crm.${status}` as any)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{leadsByStatus[status]?.length || 0}</span>
                </div>
                <div className="space-y-2">
                  {leadsByStatus[status]?.map((lead: any) => (
                    <Card
                      key={lead.id}
                      className={`cursor-pointer hover:shadow-md transition-shadow ${isOverdue(lead) ? "border-l-4 border-l-warning" : ""}`}
                      onClick={() => navigate(`/crm/leads/${lead.id}`)}
                    >
                      <CardContent className="p-3 space-y-1.5">
                        <p className="font-medium text-sm">{lead.company_name}</p>
                        {lead.contact_person && (
                          <p className="text-xs text-muted-foreground">{lead.contact_person}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {lead.estimated_workers && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" /> {lead.estimated_workers}
                            </span>
                          )}
                          {lead.contact_phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                        {lead.next_action && (
                          <p className={`text-xs ${isOverdue(lead) ? "text-warning font-medium" : "text-muted-foreground"}`}>
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {lead.next_action}
                            {lead.next_action_date && ` · ${format(new Date(lead.next_action_date), "MMM d")}`}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {(!leadsByStatus[status] || leadsByStatus[status].length === 0) && (
                    <div className="text-center py-6 text-xs text-muted-foreground">—</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("crm.companyName")}</TableHead>
                  <TableHead>{t("crm.contactPerson")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("crm.source")}</TableHead>
                  <TableHead>{t("crm.estimatedWorkers")}</TableHead>
                  <TableHead>{t("crm.nextAction")}</TableHead>
                  <TableHead>{t("common.date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead: any) => (
                  <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/crm/leads/${lead.id}`)}>
                    <TableCell className="font-medium">{lead.company_name}</TableCell>
                    <TableCell className="text-muted-foreground">{lead.contact_person || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[lead.status] || ""}>
                        {t(`crm.${lead.status}` as any)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t(`crm.source${lead.source.charAt(0).toUpperCase() + lead.source.slice(1)}` as any)}</TableCell>
                    <TableCell>{lead.estimated_workers || "—"}</TableCell>
                    <TableCell className={isOverdue(lead) ? "text-warning font-medium" : ""}>{lead.next_action || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {lead.next_action_date ? format(new Date(lead.next_action_date), "MMM d, yyyy") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {leads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      {t("crm.noLeads")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* New Lead Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("crm.newLead")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{t("crm.companyName")} *</Label>
              <Input value={form.company_name} onChange={(e) => setForm(f => ({ ...f, company_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("crm.contactPerson")}</Label>
                <Input value={form.contact_person} onChange={(e) => setForm(f => ({ ...f, contact_person: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("crm.contactPhone")}</Label>
                <Input value={form.contact_phone} onChange={(e) => setForm(f => ({ ...f, contact_phone: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("crm.contactEmail")}</Label>
              <Input type="email" value={form.contact_email} onChange={(e) => setForm(f => ({ ...f, contact_email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("common.status")}</Label>
                <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`crm.${s}` as any)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("crm.source")}</Label>
                <Select value={form.source} onValueChange={(v) => setForm(f => ({ ...f, source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>{t(`crm.source${s.charAt(0).toUpperCase() + s.slice(1)}` as any)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("crm.estimatedWorkers")}</Label>
                <Input type="number" min="0" value={form.estimated_workers} onChange={(e) => setForm(f => ({ ...f, estimated_workers: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("crm.estimatedRevenue")} (EUR)</Label>
                <Input type="number" min="0" step="100" value={form.estimated_revenue_eur} onChange={(e) => setForm(f => ({ ...f, estimated_revenue_eur: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("crm.nextAction")}</Label>
                <Input value={form.next_action} onChange={(e) => setForm(f => ({ ...f, next_action: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("crm.nextActionDate")}</Label>
                <Input type="date" value={form.next_action_date} onChange={(e) => setForm(f => ({ ...f, next_action_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("orders.notes")}</Label>
              <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSave} disabled={saving || !form.company_name.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
