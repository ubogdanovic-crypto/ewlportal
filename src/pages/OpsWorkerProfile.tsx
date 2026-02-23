import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { PipelineStageBadge, PipelineProgress, STAGE_ORDER } from "@/components/PipelineStage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Loader2, User, Flag, StickyNote, Send } from "lucide-react";
import { format } from "date-fns";

export default function OpsWorkerProfile() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [stageNote, setStageNote] = useState("");
  const [newNote, setNewNote] = useState("");
  const [changingStage, setChangingStage] = useState(false);

  const { data: worker, isLoading } = useQuery({
    queryKey: ["ops-worker", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("workers").select("*, orders(reference_number, position_title), companies(name)").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["ops-worker-history", id],
    queryFn: async () => {
      const { data } = await supabase.from("pipeline_stage_history").select("*").eq("worker_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: notes = [], refetch: refetchNotes } = useQuery({
    queryKey: ["ops-worker-notes", id],
    queryFn: async () => {
      const { data } = await supabase.from("internal_notes").select("*").eq("entity_type", "worker").eq("entity_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const handleStageChange = async (newStage: string) => {
    if (!worker || !user || newStage === worker.current_stage) return;
    setChangingStage(true);

    const { error } = await supabase.from("workers").update({ current_stage: newStage as any }).eq("id", worker.id);
    if (error) { toast.error(error.message); setChangingStage(false); return; }

    await supabase.from("pipeline_stage_history").insert({
      worker_id: worker.id,
      from_stage: worker.current_stage,
      to_stage: newStage as any,
      changed_by: user.id,
      notes: stageNote || `Stage changed to ${t(`pipeline.${newStage}` as any)}`,
    });

    toast.success(t("ops.stageUpdated"));
    setStageNote("");
    setChangingStage(false);
    queryClient.invalidateQueries({ queryKey: ["ops-worker", id] });
    queryClient.invalidateQueries({ queryKey: ["ops-worker-history", id] });
  };

  const handleFlagUpdate = async (field: string, value: any) => {
    if (!worker) return;
    await supabase.from("workers").update({ [field]: value } as any).eq("id", worker.id);
    queryClient.invalidateQueries({ queryKey: ["ops-worker", id] });
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;
    await supabase.from("internal_notes").insert({
      entity_type: "worker",
      entity_id: id!,
      content: newNote.trim(),
      created_by: user.id,
    });
    setNewNote("");
    refetchNotes();
    toast.success(t("ops.noteAdded"));
  };

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>;
  }

  if (!worker) {
    return <AppLayout><div className="text-center py-12"><p className="text-muted-foreground">Worker not found</p></div></AppLayout>;
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
          <Button variant="ghost" size="icon" onClick={() => navigate("/ops/workers")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{worker.first_name} {worker.last_name}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <span>{(worker.orders as any)?.reference_number}</span>
              <span>·</span>
              <span>{(worker.companies as any)?.name}</span>
            </div>
          </div>
          <Badge variant="outline" className={worker.status === "active" ? "bg-success/15 text-success border-success/30" : "bg-destructive/15 text-destructive border-destructive/30"}>
            {t(`pipeline.status_${worker.status}` as any)}
          </Badge>
        </div>

        {/* Pipeline progress */}
        <PipelineProgress currentStage={worker.current_stage} />

        {/* Stage selector (ops) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("ops.changeStage")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <Select value={worker.current_stage} onValueChange={handleStageChange} disabled={changingStage}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGE_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>{t(`pipeline.${s}` as any)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input placeholder={t("ops.stageChangeNote")} value={stageNote} onChange={(e) => setStageNote(e.target.value)} maxLength={300} />
          </CardContent>
        </Card>

        {/* Personal info */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5" />{t("pipeline.candidateInfo")}</CardTitle></CardHeader>
          <CardContent>
            <InfoRow label={t("pipeline.fullName")} value={`${worker.first_name} ${worker.last_name}`} />
            <InfoRow label={t("pipeline.nationality")} value={worker.nationality} />
            <InfoRow label={t("pipeline.dateOfBirth")} value={worker.date_of_birth} />
            <InfoRow label={t("pipeline.passportNumber")} value={worker.passport_number} />
            <InfoRow label={t("ops.passportExpiry")} value={worker.passport_expiry} />
            <InfoRow label={t("pipeline.phone")} value={worker.phone} />
            <InfoRow label={t("pipeline.email")} value={worker.email} />
          </CardContent>
        </Card>

        {/* Flags */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Flag className="h-5 w-5" />{t("ops.flags")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox checked={worker.flag_euprava || false} onCheckedChange={(v) => handleFlagUpdate("flag_euprava", !!v)} />
              <Label>e-Uprava</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={worker.flag_visa_delay || false} onCheckedChange={(v) => handleFlagUpdate("flag_visa_delay", !!v)} />
              <Label>{t("ops.visaDelay")}</Label>
            </div>
            {worker.flag_visa_delay && (
              <Input
                placeholder={t("ops.visaDelayEstimate")}
                value={worker.visa_delay_estimate || ""}
                onChange={(e) => handleFlagUpdate("visa_delay_estimate", e.target.value)}
                className="ml-6"
                maxLength={200}
              />
            )}
            <div className="space-y-1">
              <Label>{t("ops.customFlag")}</Label>
              <Input
                value={worker.flag_custom || ""}
                onChange={(e) => handleFlagUpdate("flag_custom", e.target.value)}
                maxLength={200}
              />
            </div>
          </CardContent>
        </Card>

        {/* Internal notes */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><StickyNote className="h-5 w-5" />{t("ops.internalNotes")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder={t("ops.addNotePlaceholder")} rows={2} className="flex-1" maxLength={1000} />
              <Button size="icon" onClick={handleAddNote} disabled={!newNote.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {notes.map((note: any) => (
              <div key={note.id} className="text-sm p-3 bg-muted rounded-md">
                <p className="whitespace-pre-wrap">{note.content}</p>
                <p className="text-xs text-muted-foreground mt-2">{format(new Date(note.created_at), "dd MMM yyyy HH:mm")}</p>
              </div>
            ))}
            {notes.length === 0 && <p className="text-sm text-muted-foreground">{t("ops.noNotes")}</p>}
          </CardContent>
        </Card>

        {/* Stage history */}
        <Card>
          <CardHeader><CardTitle className="text-lg">{t("pipeline.stageHistory")}</CardTitle></CardHeader>
          <CardContent>
            {history.length > 0 ? (
              <div className="space-y-3">
                {history.map((entry: any) => (
                  <div key={entry.id} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {entry.from_stage && <><PipelineStageBadge stage={entry.from_stage} size="sm" /><span className="text-muted-foreground">→</span></>}
                        <PipelineStageBadge stage={entry.to_stage} size="sm" />
                      </div>
                      {entry.notes && <p className="text-muted-foreground mt-1">{entry.notes}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(entry.created_at), "dd MMM yyyy HH:mm")}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("orders.noTimelineYet")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
