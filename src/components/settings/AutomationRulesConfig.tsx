import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Zap, Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { STAGE_ORDER } from "@/components/PipelineStage";

const emptyRule = {
  name: "",
  description: "",
  trigger_type: "stage_change",
  trigger_stage: "",
  action_type: "send_notification",
  action_stage: "",
};

export function AutomationRulesConfig() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyRule);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["automation-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_rules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const handleToggle = async (ruleId: string, isActive: boolean) => {
    await supabase.from("automation_rules").update({ is_active: isActive }).eq("id", ruleId);
    queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
  };

  const handleDelete = async (ruleId: string) => {
    await supabase.from("automation_rules").delete().eq("id", ruleId);
    queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
    toast.success("Rule deleted");
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !user) return;
    setSaving(true);

    const triggerCondition: any = {};
    if (form.trigger_type === "stage_change" && form.trigger_stage) {
      triggerCondition.to_stage = form.trigger_stage;
    }

    const actionConfig: any = {};
    if (form.action_type === "change_stage" && form.action_stage) {
      actionConfig.target_stage = form.action_stage;
    }
    if (form.action_type === "send_notification") {
      actionConfig.template = "auto";
    }

    const { error } = await supabase.from("automation_rules").insert({
      name: form.name.trim(),
      description: form.description.trim() || null,
      trigger_type: form.trigger_type,
      trigger_condition: triggerCondition,
      action_type: form.action_type,
      action_config: actionConfig,
      created_by: user.id,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Rule created");
    setForm(emptyRule);
    setDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
  };

  const triggerLabel = (rule: any) => {
    if (rule.trigger_type === "stage_change") {
      const stage = (rule.trigger_condition as any)?.to_stage;
      return `When worker moves to ${stage?.replace(/_/g, " ") || "any stage"}`;
    }
    if (rule.trigger_type === "document_status") return "When document status changes";
    if (rule.trigger_type === "signing_status") return "When document is signed";
    return rule.trigger_type;
  };

  const actionLabel = (rule: any) => {
    if (rule.action_type === "change_stage") {
      const stage = (rule.action_config as any)?.target_stage;
      return `Move to ${stage?.replace(/_/g, " ") || "next stage"}`;
    }
    if (rule.action_type === "send_notification") return "Send notification";
    if (rule.action_type === "create_task") return "Create task";
    if (rule.action_type === "send_email") return "Send email";
    return rule.action_type;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Automation Rules
            </CardTitle>
            <CardDescription>
              Automate pipeline transitions, notifications, and task creation based on triggers.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Rule
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : rules.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No automation rules configured.</p>
        ) : (
          <div className="space-y-3">
            {rules.map((rule: any) => (
              <div key={rule.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <Switch
                  checked={rule.is_active}
                  onCheckedChange={(v) => handleToggle(rule.id, v)}
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${!rule.is_active ? "text-muted-foreground" : ""}`}>{rule.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {triggerLabel(rule)} → {actionLabel(rule)}
                  </p>
                  {rule.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>
                  )}
                </div>
                <Badge variant={rule.is_active ? "default" : "secondary"} className="text-xs">
                  {rule.is_active ? "Active" : "Disabled"}
                </Badge>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(rule.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create Rule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Automation Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Rule Name *</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Auto-notify on visa approval" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trigger</Label>
                <Select value={form.trigger_type} onValueChange={(v) => setForm(f => ({ ...f, trigger_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stage_change">Stage Change</SelectItem>
                    <SelectItem value="document_status">Document Status</SelectItem>
                    <SelectItem value="signing_status">Signing Complete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.trigger_type === "stage_change" && (
                <div className="space-y-2">
                  <Label>When moving to</Label>
                  <Select value={form.trigger_stage} onValueChange={(v) => setForm(f => ({ ...f, trigger_stage: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select stage..." /></SelectTrigger>
                    <SelectContent>
                      {STAGE_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Action</Label>
                <Select value={form.action_type} onValueChange={(v) => setForm(f => ({ ...f, action_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="send_notification">Send Notification</SelectItem>
                    <SelectItem value="change_stage">Change Stage</SelectItem>
                    <SelectItem value="create_task">Create Task</SelectItem>
                    <SelectItem value="send_email">Send Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.action_type === "change_stage" && (
                <div className="space-y-2">
                  <Label>Move to stage</Label>
                  <Select value={form.action_stage} onValueChange={(v) => setForm(f => ({ ...f, action_stage: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select stage..." /></SelectTrigger>
                    <SelectContent>
                      {STAGE_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
