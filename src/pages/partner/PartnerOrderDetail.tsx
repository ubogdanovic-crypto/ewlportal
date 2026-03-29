import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PipelineStageBadge } from "@/components/PipelineStage";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Loader2, CheckCircle2, XCircle, Clock, Upload, Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function PartnerOrderDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    firstName: "", lastName: "", nationality: "India",
    passportNumber: "", dateOfBirth: "", phone: "", email: "",
  });

  const { data: order, isLoading: loadingOrder } = useQuery({
    queryKey: ["partner-order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, companies(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: workers = [] } = useQuery({
    queryKey: ["partner-order-workers", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workers")
        .select("*")
        .eq("order_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleSubmitCandidate = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !user || !order) return;
    setSaving(true);

    const { data: newWorker, error } = await supabase.from("workers").insert({
      order_id: order.id,
      company_id: order.company_id,
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      nationality: form.nationality.trim() || null,
      passport_number: form.passportNumber.trim() || null,
      date_of_birth: form.dateOfBirth || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      current_stage: "sourcing" as const,
      status: "active" as const,
    }).select("id").single();

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    // Upload CV if provided
    if (cvFile && newWorker) {
      const filePath = `${newWorker.id}/cv/${cvFile.name}`;
      await supabase.storage.from("worker-documents").upload(filePath, cvFile, { upsert: true });
      await supabase.from("worker_documents").insert({
        worker_id: newWorker.id,
        document_type: "cv",
        label: "CV",
        file_path: filePath,
        file_name: cvFile.name,
        file_size: cvFile.size,
        status: "uploaded",
        is_required: true,
        uploaded_at: new Date().toISOString(),
        uploaded_by: user.id,
      });
    }

    setSaving(false);
    toast.success(t("partner.candidateSubmitted"));
    setForm({ firstName: "", lastName: "", nationality: "India", passportNumber: "", dateOfBirth: "", phone: "", email: "" });
    setCvFile(null);
    setDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["partner-order-workers", id] });
  };

  if (loadingOrder || !order) {
    return (
      <AppLayout>
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </AppLayout>
    );
  }

  const statusIcon = (worker: any) => {
    if (worker.status === "rejected") return <XCircle className="h-4 w-4 text-destructive" />;
    if (worker.current_stage === "approved_by_client" || worker.current_stage === "documents_collection")
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/partner")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{order.reference_number} — {order.position_title}</h1>
            <p className="text-muted-foreground">
              {(order.companies as any)?.name} · {workers.length}/{order.number_of_workers} {t("partner.submitted")}
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t("partner.submitCandidate")}
          </Button>
        </div>

        {/* Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("partner.requirements")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Position</span>
              <p className="font-medium">{order.position_title}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Workers needed</span>
              <p className="font-medium">{order.number_of_workers}</p>
            </div>
            {order.source_country && (
              <div>
                <span className="text-muted-foreground">Source Country</span>
                <p className="font-medium">{order.source_country}</p>
              </div>
            )}
            {order.start_date && (
              <div>
                <span className="text-muted-foreground">Start Date</span>
                <p className="font-medium">{format(new Date(order.start_date), "MMM d, yyyy")}</p>
              </div>
            )}
            {order.contract_duration_months && (
              <div>
                <span className="text-muted-foreground">Contract</span>
                <p className="font-medium">{order.contract_duration_months} months</p>
              </div>
            )}
            {order.experience_years != null && (
              <div>
                <span className="text-muted-foreground">Experience</span>
                <p className="font-medium">{order.experience_years}+ years</p>
              </div>
            )}
            {order.education_level && (
              <div>
                <span className="text-muted-foreground">Education</span>
                <p className="font-medium">{order.education_level}</p>
              </div>
            )}
            {order.additional_skills && (
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Skills</span>
                <p className="font-medium">{order.additional_skills}</p>
              </div>
            )}
            {order.job_description && (
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Description</span>
                <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{order.job_description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submitted Candidates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("partner.candidates")} ({workers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {workers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No candidates submitted yet.</p>
            ) : (
              <div className="space-y-2">
                {workers.map((w: any) => (
                  <div key={w.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    {statusIcon(w)}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{w.first_name} {w.last_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <PipelineStageBadge stage={w.current_stage} size="sm" />
                        {w.status === "rejected" && w.rejection_reason && (
                          <span className="text-xs text-destructive">{w.rejection_reason}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(w.created_at), "MMM d")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Messages */}
        <MessageThread orderId={order.id} />
      </div>

      {/* Submit Candidate Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("partner.submitCandidate")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("pipeline.firstName")} *</Label>
                <Input value={form.firstName} onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("pipeline.lastName")} *</Label>
                <Input value={form.lastName} onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("pipeline.nationality")}</Label>
                <Input value={form.nationality} onChange={(e) => setForm(f => ({ ...f, nationality: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("pipeline.passportNumber")}</Label>
                <Input value={form.passportNumber} onChange={(e) => setForm(f => ({ ...f, passportNumber: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("pipeline.dateOfBirth")}</Label>
              <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("pipeline.phone")}</Label>
                <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t("pipeline.email")}</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>CV</Label>
              <div className="border-2 border-dashed rounded-lg p-3 text-center">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  id="cv-upload"
                  onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                />
                <label htmlFor="cv-upload" className="cursor-pointer block">
                  <Upload className="h-5 w-5 mx-auto text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{cvFile ? cvFile.name : "Upload CV (PDF, DOC)"}</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSubmitCandidate} disabled={saving || !form.firstName.trim() || !form.lastName.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("partner.submitCandidate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function MessageThread({ orderId }: { orderId: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  const { data: messages = [] } = useQuery({
    queryKey: ["partner-messages", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_messages")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const handleSend = async () => {
    if (!msg.trim() || !user) return;
    setSending(true);
    const { error } = await supabase.from("partner_messages").insert({
      order_id: orderId,
      sender_id: user.id,
      content: msg.trim(),
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setMsg("");
    queryClient.invalidateQueries({ queryKey: ["partner-messages", orderId] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Messages
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-64 overflow-y-auto space-y-2">
          {messages.map((m: any) => {
            const isMine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${isMine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <p>{m.content}</p>
                  <p className={`text-xs mt-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-4">No messages yet.</p>
          )}
        </div>
        <div className="flex gap-2">
          <Textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 min-h-[40px]"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <Button size="icon" onClick={handleSend} disabled={sending || !msg.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
