import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { PipelineStageBadge, PipelineProgress } from "@/components/PipelineStage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Loader2, CheckCircle2, XCircle, Download, User } from "lucide-react";

export default function CandidateReview() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const { data: worker, isLoading } = useQuery({
    queryKey: ["worker", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workers")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["worker-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_stage_history")
        .select("*")
        .eq("worker_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleApprove = async () => {
    if (!worker || !user) return;
    setActionLoading(true);

    // Update worker
    const { error: updateError } = await supabase
      .from("workers")
      .update({
        current_stage: "approved_by_client" as any,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", worker.id);

    if (updateError) {
      toast.error(updateError.message);
      setActionLoading(false);
      return;
    }

    // Add history entry
    await supabase.from("pipeline_stage_history").insert({
      worker_id: worker.id,
      from_stage: worker.current_stage,
      to_stage: "approved_by_client" as any,
      changed_by: user.id,
      notes: "Approved by client",
    });

    toast.success(t("pipeline.candidateApproved"));
    queryClient.invalidateQueries({ queryKey: ["worker", id] });
    queryClient.invalidateQueries({ queryKey: ["worker-history", id] });
    queryClient.invalidateQueries({ queryKey: ["order-workers"] });
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!worker || !user || !rejectionReason.trim()) {
      toast.error(t("pipeline.rejectionReasonRequired"));
      return;
    }
    setActionLoading(true);

    const { error: updateError } = await supabase
      .from("workers")
      .update({
        status: "rejected" as any,
        rejection_reason: rejectionReason.trim(),
        rejected_by: user.id,
        rejected_at: new Date().toISOString(),
      })
      .eq("id", worker.id);

    if (updateError) {
      toast.error(updateError.message);
      setActionLoading(false);
      return;
    }

    await supabase.from("pipeline_stage_history").insert({
      worker_id: worker.id,
      from_stage: worker.current_stage,
      to_stage: worker.current_stage,
      changed_by: user.id,
      notes: `Rejected: ${rejectionReason.trim()}`,
    });

    toast.success(t("pipeline.candidateRejected"));
    setRejectOpen(false);
    queryClient.invalidateQueries({ queryKey: ["worker", id] });
    queryClient.invalidateQueries({ queryKey: ["order-workers"] });
    setActionLoading(false);
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

  if (!worker) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Worker not found</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">{t("common.back")}</Button>
        </div>
      </AppLayout>
    );
  }

  const isReviewable = worker.current_stage === "client_review" && worker.status === "active";
  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value || "—"}</span>
    </div>
  );

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{worker.first_name} {worker.last_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <PipelineStageBadge stage={worker.current_stage} />
              {worker.status === "rejected" && (
                <span className="text-xs text-destructive font-medium">({t("pipeline.status_rejected")})</span>
              )}
            </div>
          </div>
        </div>

        {/* Pipeline progress */}
        <PipelineProgress currentStage={worker.current_stage} />

        {/* Worker info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("pipeline.candidateInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InfoRow label={t("pipeline.fullName")} value={`${worker.first_name} ${worker.last_name}`} />
            <InfoRow label={t("pipeline.nationality")} value={worker.nationality} />
            <InfoRow label={t("pipeline.dateOfBirth")} value={worker.date_of_birth || null} />
            <InfoRow label={t("pipeline.passportNumber")} value={worker.passport_number ? "••••" + worker.passport_number.slice(-4) : null} />
            <InfoRow label={t("pipeline.phone")} value={worker.phone} />
            <InfoRow label={t("pipeline.email")} value={worker.email} />
          </CardContent>
        </Card>

        {/* CV Download */}
        {worker.cv_url && (
          <Card>
            <CardContent className="py-4">
              <a href={worker.cv_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  {t("pipeline.downloadCV")}
                </Button>
              </a>
            </CardContent>
          </Card>
        )}

        {/* Action buttons */}
        {isReviewable && (
          <Card>
            <CardContent className="py-4 flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setRejectOpen(true)}
                disabled={actionLoading}
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <XCircle className="h-4 w-4 mr-2" />
                {t("pipeline.reject")}
              </Button>
              <Button
                onClick={handleApprove}
                disabled={actionLoading}
                className="bg-success text-success-foreground hover:bg-success/90"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                {t("pipeline.approve")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Rejection reason display (if already rejected) */}
        {worker.status === "rejected" && worker.rejection_reason && (
          <Card className="border-destructive/30">
            <CardContent className="py-4">
              <p className="text-sm font-medium text-destructive mb-1">{t("pipeline.rejectionReason")}:</p>
              <p className="text-sm text-muted-foreground">{worker.rejection_reason}</p>
            </CardContent>
          </Card>
        )}

        {/* Stage history */}
        {history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("pipeline.stageHistory")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.map((entry: any) => (
                  <div key={entry.id} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {entry.from_stage && (
                          <>
                            <PipelineStageBadge stage={entry.from_stage} size="sm" />
                            <span className="text-muted-foreground">→</span>
                          </>
                        )}
                        <PipelineStageBadge stage={entry.to_stage} size="sm" />
                      </div>
                      {entry.notes && <p className="text-muted-foreground mt-1">{entry.notes}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(entry.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Rejection reason modal */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pipeline.rejectCandidate")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>{t("pipeline.rejectionReason")} *</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={t("pipeline.rejectionReasonPlaceholder")}
              rows={4}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>{t("common.cancel")}</Button>
            <Button
              onClick={handleReject}
              disabled={!rejectionReason.trim() || actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("pipeline.confirmReject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
