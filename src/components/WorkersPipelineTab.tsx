import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PipelineStageBadge } from "@/components/PipelineStage";
import { Badge } from "@/components/ui/badge";
import { Users, Eye, Plus, Loader2, Upload, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ConfidenceIndicator({ level }: { level?: string }) {
  if (!level || level === "high") return null;
  return (
    <AlertTriangle
      className={`inline h-3.5 w-3.5 ml-1 ${level === "low" ? "text-destructive" : "text-amber-500"}`}
      aria-label={level === "low" ? "Low confidence" : "Medium confidence"}
    />
  );
}

interface WorkersPipelineTabProps {
  orderId: string;
  companyId?: string;
}

export function WorkersPipelineTab({ orderId, companyId }: WorkersPipelineTabProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedFile, setScannedFile] = useState<File | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    firstName: "", lastName: "", nationality: "", passportNumber: "",
    dateOfBirth: "", passportExpiry: "",
  });

  const { data: workers = [], isLoading } = useQuery({
    queryKey: ["order-workers", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workers")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const handlePassportScan = async (file: File) => {
    setScanning(true);
    setOcrConfidence({});
    setScannedFile(file);
    try {
      const base64 = await fileToBase64(file);
      const res = await supabase.functions.invoke("extract-passport-data", {
        body: { imageBase64: base64, mimeType: file.type },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      const d = res.data.data;
      setForm((f) => ({
        ...f,
        firstName: d.first_name?.value || f.firstName,
        lastName: d.last_name?.value || f.lastName,
        nationality: d.nationality?.value || f.nationality,
        passportNumber: d.passport_number?.value || f.passportNumber,
        dateOfBirth: d.date_of_birth?.value || f.dateOfBirth,
        passportExpiry: d.passport_expiry?.value || f.passportExpiry,
      }));
      setOcrConfidence({
        firstName: d.first_name?.confidence,
        lastName: d.last_name?.confidence,
        nationality: d.nationality?.confidence,
        passportNumber: d.passport_number?.confidence,
        dateOfBirth: d.date_of_birth?.confidence,
        passportExpiry: d.passport_expiry?.confidence,
      });
      toast.success(t("ocr.extractionComplete"));
    } catch (err: any) {
      toast.error(err.message || t("ocr.extractionFailed"));
    } finally {
      setScanning(false);
    }
  };

  const handleAddWorker = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !companyId) {
      toast.error(t("pipeline.nameRequired"));
      return;
    }
    setSaving(true);
    const { data: insertedWorker, error } = await supabase
      .from("workers")
      .insert({
        order_id: orderId,
        company_id: companyId,
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        nationality: form.nationality.trim() || null,
        passport_number: form.passportNumber.trim() || null,
        date_of_birth: form.dateOfBirth || null,
        passport_expiry: form.passportExpiry || null,
        current_stage: "sourcing" as const,
        status: "active" as const,
      })
      .select("id")
      .single();

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    // If a passport was scanned, store the file and create a document record
    if (scannedFile && insertedWorker) {
      try {
        const filePath = `${insertedWorker.id}/passport-scan/${scannedFile.name}`;
        await supabase.storage
          .from("worker-documents")
          .upload(filePath, scannedFile, { upsert: true });
        await supabase.from("worker_documents").insert({
          worker_id: insertedWorker.id,
          document_type: "passport_copy",
          label: t("docs.passportCopy"),
          file_path: filePath,
          file_name: scannedFile.name,
          file_size: scannedFile.size,
          status: "uploaded",
          is_required: true,
          uploaded_at: new Date().toISOString(),
          uploaded_by: user!.id,
          notes: "Uploaded via passport scan during worker creation",
        });
      } catch (uploadErr) {
        console.error("Failed to store passport scan:", uploadErr);
        // Non-blocking — worker was created successfully
      }
    }

    setSaving(false);
    toast.success(t("pipeline.workerAdded"));
    setForm({ firstName: "", lastName: "", nationality: "", passportNumber: "", dateOfBirth: "", passportExpiry: "" });
    setScannedFile(null);
    setOcrConfidence({});
    setOpen(false);
    queryClient.invalidateQueries({ queryKey: ["order-workers", orderId] });
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-success/15 text-success border-success/30",
      rejected: "bg-destructive/15 text-destructive border-destructive/30",
      withdrawn: "bg-muted text-muted-foreground",
      completed: "bg-primary/15 text-primary border-primary/30",
    };
    return <Badge variant="outline" className={colors[status] || ""}>{t(`pipeline.status_${status}` as any)}</Badge>;
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary + Add button */}
      <Card>
        <CardContent className="pt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {workers.filter(w => w.status === 'active').length} {t("pipeline.activeWorkers")} · {workers.filter(w => w.status === 'rejected').length} {t("pipeline.rejected")}
          </div>
          <Dialog open={open} onOpenChange={(v) => {
            setOpen(v);
            if (!v) {
              setForm({ firstName: "", lastName: "", nationality: "", passportNumber: "", dateOfBirth: "", passportExpiry: "" });
              setScannedFile(null);
              setOcrConfidence({});
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                {t("pipeline.addWorker")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("pipeline.addWorker")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {/* Passport Upload Area */}
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    className="hidden"
                    id="passport-scan-input"
                    disabled={scanning}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePassportScan(f);
                      e.target.value = "";
                    }}
                  />
                  <label htmlFor="passport-scan-input" className="cursor-pointer block">
                    {scanning ? (
                      <div className="flex items-center justify-center gap-2 py-2">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">{t("ocr.scanning")}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 py-2">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm font-medium">{t("ocr.scanPassport")}</span>
                        <span className="text-xs text-muted-foreground">{t("ocr.scanHint")}</span>
                      </div>
                    )}
                  </label>
                  {scannedFile && !scanning && (
                    <p className="text-xs text-success mt-2">{scannedFile.name}</p>
                  )}
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      {t("pipeline.firstName")} *
                      <ConfidenceIndicator level={ocrConfidence.firstName} />
                    </Label>
                    <Input value={form.firstName} onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} maxLength={100} />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      {t("pipeline.lastName")} *
                      <ConfidenceIndicator level={ocrConfidence.lastName} />
                    </Label>
                    <Input value={form.lastName} onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} maxLength={100} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>
                    {t("pipeline.nationality")}
                    <ConfidenceIndicator level={ocrConfidence.nationality} />
                  </Label>
                  <Input value={form.nationality} onChange={(e) => setForm(f => ({ ...f, nationality: e.target.value }))} maxLength={100} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      {t("pipeline.passportNumber")}
                      <ConfidenceIndicator level={ocrConfidence.passportNumber} />
                    </Label>
                    <Input value={form.passportNumber} onChange={(e) => setForm(f => ({ ...f, passportNumber: e.target.value }))} maxLength={50} />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      {t("ocr.passportExpiry")}
                      <ConfidenceIndicator level={ocrConfidence.passportExpiry} />
                    </Label>
                    <Input type="date" value={form.passportExpiry} onChange={(e) => setForm(f => ({ ...f, passportExpiry: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>
                    {t("pipeline.dateOfBirth")}
                    <ConfidenceIndicator level={ocrConfidence.dateOfBirth} />
                  </Label>
                  <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} />
                </div>
                <Button onClick={handleAddWorker} disabled={saving || !form.firstName.trim() || !form.lastName.trim()} className="w-full">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t("pipeline.addWorker")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {workers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">{t("orders.noWorkersYet")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("pipeline.workerName")}</TableHead>
                <TableHead>{t("pipeline.nationality")}</TableHead>
                <TableHead>{t("pipeline.currentStage")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((worker: any) => (
                <TableRow key={worker.id}>
                  <TableCell className="font-medium">
                    {worker.first_name} {worker.last_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{worker.nationality || "—"}</TableCell>
                  <TableCell>
                    <PipelineStageBadge stage={worker.current_stage} size="sm" />
                  </TableCell>
                  <TableCell>{statusBadge(worker.status)}</TableCell>
                  <TableCell>
                    {worker.current_stage === "client_review" && worker.status === "active" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/candidates/${worker.id}/review`)}
                        className="text-accent border-accent/30 hover:bg-accent/10"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        {t("pipeline.review")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
