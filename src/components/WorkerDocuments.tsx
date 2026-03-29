import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, Download, Check, X, FileText, Loader2, Trash2, Plus, PenTool, ScanLine } from "lucide-react";
import { format } from "date-fns";

const DOCUMENT_TYPES = [
  { type: "passport_copy", labelKey: "docs.passportCopy" },
  { type: "cv", labelKey: "docs.cv" },
  { type: "photo", labelKey: "docs.photo" },
  { type: "medical_certificate", labelKey: "docs.medicalCertificate" },
  { type: "employment_contract", labelKey: "docs.employmentContract" },
  { type: "work_permit_application", labelKey: "docs.workPermitApplication" },
  { type: "visa_application_form", labelKey: "docs.visaApplicationForm" },
  { type: "police_clearance", labelKey: "docs.policeClearance" },
  { type: "education_diploma", labelKey: "docs.educationDiploma" },
  { type: "other", labelKey: "docs.other" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  uploaded: "bg-primary/15 text-primary border-primary/30",
  verified: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
};

const OCR_FIELD_KEYS = [
  "first_name", "last_name", "date_of_birth", "nationality",
  "passport_number", "passport_expiry", "gender", "place_of_birth", "issuing_country",
] as const;

function fileToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

interface WorkerDocumentsProps {
  workerId: string;
  readOnly?: boolean;
}

export function WorkerDocuments({ workerId, readOnly = false }: WorkerDocumentsProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [initializingChecklist, setInitializingChecklist] = useState(false);
  const [sendingSignId, setSendingSignId] = useState<string | null>(null);

  // OCR state
  const [extracting, setExtracting] = useState(false);
  const [showOcrDialog, setShowOcrDialog] = useState(false);
  const [ocrResult, setOcrResult] = useState<Record<string, { value: string; confidence: string }> | null>(null);
  const [applyingOcr, setApplyingOcr] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["worker-documents", workerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("worker_documents")
        .select("*")
        .eq("worker_id", workerId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const initializeChecklist = async () => {
    if (!user) return;
    setInitializingChecklist(true);
    const items = DOCUMENT_TYPES.filter((d) => d.type !== "other").map((d) => ({
      worker_id: workerId,
      document_type: d.type,
      label: t(d.labelKey as any),
      is_required: ["passport_copy", "cv", "photo", "employment_contract"].includes(d.type),
    }));
    const { error } = await supabase.from("worker_documents").insert(items);
    if (error) toast.error(error.message);
    else toast.success(t("docs.checklistCreated" as any));
    queryClient.invalidateQueries({ queryKey: ["worker-documents", workerId] });
    setInitializingChecklist(false);
  };

  const runOcrExtraction = async (base64: string, mimeType: string) => {
    const res = await supabase.functions.invoke("extract-passport-data", {
      body: { imageBase64: base64, mimeType },
    });
    if (res.error) throw new Error(res.error.message);
    if (res.data?.error) throw new Error(res.data.error);
    return res.data.data;
  };

  const handleUpload = async (docId: string, file: File) => {
    if (!user) return;
    setUploadingDocId(docId);
    const filePath = `${workerId}/${docId}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("worker-documents")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error(uploadError.message);
      setUploadingDocId(null);
      return;
    }

    await supabase
      .from("worker_documents")
      .update({
        status: "uploaded",
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        uploaded_at: new Date().toISOString(),
        uploaded_by: user.id,
      })
      .eq("id", docId);

    toast.success(t("docs.fileUploaded" as any));
    queryClient.invalidateQueries({ queryKey: ["worker-documents", workerId] });
    setUploadingDocId(null);

    // Auto-trigger OCR for passport_copy uploads
    const doc = documents.find((d: any) => d.id === docId);
    if (doc?.document_type === "passport_copy") {
      setExtracting(true);
      try {
        const base64 = await fileToBase64(file);
        const data = await runOcrExtraction(base64, file.type);
        setOcrResult(data);
        setShowOcrDialog(true);
      } catch {
        // Silent — OCR is an optional enhancement
      }
      setExtracting(false);
    }
  };

  const handleRescan = async (filePath: string, fileName: string) => {
    setExtracting(true);
    try {
      const { data: blob, error } = await supabase.storage
        .from("worker-documents")
        .download(filePath);
      if (error) throw error;
      const base64 = await fileToBase64(blob);
      const mimeType = fileName.endsWith(".pdf")
        ? "application/pdf"
        : fileName.endsWith(".png")
          ? "image/png"
          : "image/jpeg";
      const data = await runOcrExtraction(base64, mimeType);
      setOcrResult(data);
      setShowOcrDialog(true);
    } catch (err: any) {
      toast.error(err.message || t("ocr.extractionFailed"));
    }
    setExtracting(false);
  };

  const handleApplyOcrData = async () => {
    if (!ocrResult) return;
    setApplyingOcr(true);
    const updates: Record<string, string | null> = {};
    if (ocrResult.first_name?.value) updates.first_name = ocrResult.first_name.value;
    if (ocrResult.last_name?.value) updates.last_name = ocrResult.last_name.value;
    if (ocrResult.nationality?.value) updates.nationality = ocrResult.nationality.value;
    if (ocrResult.passport_number?.value) updates.passport_number = ocrResult.passport_number.value;
    if (ocrResult.date_of_birth?.value) updates.date_of_birth = ocrResult.date_of_birth.value;
    if (ocrResult.passport_expiry?.value) updates.passport_expiry = ocrResult.passport_expiry.value;
    if (ocrResult.gender?.value) updates.gender = ocrResult.gender.value;
    if (ocrResult.place_of_birth?.value) updates.place_of_birth = ocrResult.place_of_birth.value;
    if (ocrResult.issuing_country?.value) updates.issuing_country = ocrResult.issuing_country.value;

    const { error } = await supabase.from("workers").update(updates).eq("id", workerId);
    setApplyingOcr(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("ocr.workerUpdated"));
      queryClient.invalidateQueries({ queryKey: ["ops-worker", workerId] });
    }
    setShowOcrDialog(false);
    setOcrResult(null);
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("worker-documents")
      .download(filePath);
    if (error) { toast.error(error.message); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleVerify = async (docId: string) => {
    if (!user) return;
    await supabase.from("worker_documents").update({
      status: "verified",
      verified_at: new Date().toISOString(),
      verified_by: user.id,
    }).eq("id", docId);
    toast.success(t("docs.documentVerified" as any));
    queryClient.invalidateQueries({ queryKey: ["worker-documents", workerId] });
  };

  const handleReject = async (docId: string) => {
    const reason = prompt(t("docs.rejectionReasonPrompt" as any));
    if (!reason) return;
    await supabase.from("worker_documents").update({
      status: "rejected",
      rejection_reason: reason,
    }).eq("id", docId);
    toast.success(t("docs.documentRejected" as any));
    queryClient.invalidateQueries({ queryKey: ["worker-documents", workerId] });
  };

  const handleDelete = async (docId: string, filePath?: string | null) => {
    if (filePath) {
      await supabase.storage.from("worker-documents").remove([filePath]);
    }
    await supabase.from("worker_documents").delete().eq("id", docId);
    queryClient.invalidateQueries({ queryKey: ["worker-documents", workerId] });
  };

  const addCustomDocument = async () => {
    const label = prompt(t("docs.customDocLabel" as any));
    if (!label?.trim()) return;
    await supabase.from("worker_documents").insert({
      worker_id: workerId,
      document_type: "other",
      label: label.trim(),
      is_required: false,
    });
    queryClient.invalidateQueries({ queryKey: ["worker-documents", workerId] });
  };

  const handleSendForSigning = async (docId: string) => {
    setSendingSignId(docId);
    try {
      const res = await supabase.functions.invoke("send-for-signing", {
        body: { documentId: docId },
      });
      if (res.error) throw new Error(res.error.message);
      toast.success(t("docs.sentForSigning" as any));
      queryClient.invalidateQueries({ queryKey: ["worker-documents", workerId] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSendingSignId(null);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const completed = documents.filter((d: any) => d.status === "verified").length;
  const total = documents.length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("docs.title" as any)}
              {total > 0 && (
                <Badge variant="secondary" className="ml-2">{completed}/{total}</Badge>
              )}
            </CardTitle>
            {!readOnly && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={addCustomDocument}>
                  <Plus className="h-4 w-4 mr-1" />{t("docs.addCustom" as any)}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-muted-foreground">{t("docs.noDocuments" as any)}</p>
              {!readOnly && (
                <Button onClick={initializeChecklist} disabled={initializingChecklist}>
                  {initializingChecklist && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {t("docs.initializeChecklist" as any)}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{doc.label}</span>
                      {doc.is_required && <Badge variant="outline" className="text-xs shrink-0">Required</Badge>}
                    </div>
                    {doc.file_name && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {doc.file_name}
                        {doc.uploaded_at && ` · ${format(new Date(doc.uploaded_at), "dd MMM yyyy")}`}
                      </p>
                    )}
                    {doc.rejection_reason && (
                      <p className="text-xs text-destructive mt-1">{doc.rejection_reason}</p>
                    )}
                  </div>

                  <Badge variant="outline" className={STATUS_COLORS[doc.status] || ""}>
                    {t(`docs.status_${doc.status}` as any)}
                  </Badge>

                  {doc.signing_status && doc.signing_status !== "none" && (
                    <Badge variant="outline" className="bg-accent/15 text-accent-foreground border-accent/30 text-xs">
                      <PenTool className="h-3 w-3 mr-1" />
                      {t(`docs.signing_${doc.signing_status}` as any)}
                    </Badge>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    {doc.file_path && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDownload(doc.file_path, doc.file_name)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Re-scan button for passport_copy with uploaded file */}
                    {!readOnly && doc.document_type === "passport_copy" && doc.file_path && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-primary"
                        disabled={extracting}
                        onClick={() => handleRescan(doc.file_path, doc.file_name)}
                        title={t("ocr.rescan")}
                      >
                        {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
                      </Button>
                    )}

                    {!readOnly && (
                      <>
                        {(doc.status === "pending" || doc.status === "rejected") && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            disabled={uploadingDocId === doc.id}
                            onClick={() => {
                              setUploadingDocId(doc.id);
                              const input = document.createElement("input");
                              input.type = "file";
                              input.onchange = (e: any) => {
                                const f = e.target.files?.[0];
                                if (f) handleUpload(doc.id, f);
                              };
                              input.click();
                            }}
                          >
                            {uploadingDocId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          </Button>
                        )}

                        {doc.status === "uploaded" && (
                          <>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-success" onClick={() => handleVerify(doc.id)}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleReject(doc.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        {doc.file_path && (doc.signing_status === "none" || !doc.signing_status) && doc.status !== "pending" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-primary"
                            disabled={sendingSignId === doc.id}
                            onClick={() => handleSendForSigning(doc.id)}
                            title={t("docs.sendForSigning" as any)}
                          >
                            {sendingSignId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenTool className="h-4 w-4" />}
                          </Button>
                        )}

                        {!doc.is_required && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => handleDelete(doc.id, doc.file_path)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* OCR Review Dialog */}
      <Dialog open={showOcrDialog} onOpenChange={(v) => { if (!v) { setShowOcrDialog(false); setOcrResult(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("ocr.reviewExtracted")}</DialogTitle>
          </DialogHeader>
          {ocrResult && (
            <div className="space-y-2">
              {OCR_FIELD_KEYS.map((key) => {
                const field = ocrResult[key];
                if (!field) return null;
                return (
                  <div key={key} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <span className="text-sm text-muted-foreground">
                      {t(`ocr.field_${key}` as any)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">{field.value || "—"}</span>
                      {field.confidence === "medium" && (
                        <span className="text-xs text-amber-500" title={t("ocr.confidenceMedium")}>?</span>
                      )}
                      {field.confidence === "low" && (
                        <span className="text-xs text-destructive font-bold" title={t("ocr.confidenceLow")}>!</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowOcrDialog(false); setOcrResult(null); }}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleApplyOcrData} disabled={applyingOcr}>
              {applyingOcr && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("ocr.applyToWorker")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
