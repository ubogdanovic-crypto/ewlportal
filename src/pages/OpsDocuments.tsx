import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Upload, CheckCircle, XCircle, Download, Loader2, PenTool } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { format } from "date-fns";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  verified: { label: "Verified", variant: "default" },
  uploaded: { label: "Uploaded", variant: "secondary" },
  pending: { label: "Pending", variant: "outline" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export default function OpsDocuments() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<string | null>(null);
  const [sendingSignId, setSendingSignId] = useState<string | null>(null);

  const handleSendForSigning = async (docId: string) => {
    setSendingSignId(docId);
    try {
      const res = await supabase.functions.invoke("send-for-signing", {
        body: { documentId: docId },
      });
      if (res.error) throw new Error(res.error.message);
      queryClient.invalidateQueries({ queryKey: ["ops-all-documents"] });
      toast({ title: "Sent for signing", description: "Document sent via SignWell." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSendingSignId(null);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: ["ops-all-documents"],
    queryFn: async () => {
      const { data: docs, error } = await supabase
        .from("worker_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!docs?.length) return [];

      const workerIds = [...new Set(docs.map((d) => d.worker_id))];
      const { data: workers } = await supabase
        .from("workers")
        .select("id, first_name, last_name, order_id, company_id")
        .in("id", workerIds);

      const orderIds = [...new Set((workers || []).map((w) => w.order_id))];
      const companyIds = [...new Set((workers || []).map((w) => w.company_id))];

      const [ordersRes, companiesRes] = await Promise.all([
        supabase.from("orders").select("id, reference_number").in("id", orderIds),
        supabase.from("companies").select("id, name").in("id", companyIds),
      ]);

      const orderMap = Object.fromEntries((ordersRes.data || []).map((o) => [o.id, o.reference_number]));
      const companyMap = Object.fromEntries((companiesRes.data || []).map((c) => [c.id, c.name]));
      const workerMap = Object.fromEntries((workers || []).map((w) => [
        w.id,
        { name: `${w.first_name} ${w.last_name}`, orderRef: orderMap[w.order_id] || "", company: companyMap[w.company_id] || "" },
      ]));

      return docs.map((d) => ({
        ...d,
        workerName: workerMap[d.worker_id]?.name || "",
        orderRef: workerMap[d.worker_id]?.orderRef || "",
        companyName: workerMap[d.worker_id]?.company || "",
      }));
    },
  });

  const documents = data || [];

  const handleUploadClick = (docId: string) => {
    uploadTargetRef.current = docId;
    fileInputRef.current?.click();
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const docId = uploadTargetRef.current;
      if (!docId) throw new Error("No document target");

      const doc = documents.find((d: any) => d.id === docId);
      if (!doc) throw new Error("Document not found");

      const filePath = `${doc.worker_id}/${docId}-${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("worker-documents")
        .upload(filePath, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { error: updateErr } = await supabase
        .from("worker_documents")
        .update({
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          status: "uploaded",
          uploaded_at: new Date().toISOString(),
          uploaded_by: user!.id,
        })
        .eq("id", docId);
      if (updateErr) throw updateErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops-all-documents"] });
      toast({ title: "Uploaded", description: "Document uploaded successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ docId, status }: { docId: string; status: string }) => {
      const updates: any = { status };
      if (status === "verified") {
        updates.verified_at = new Date().toISOString();
        updates.verified_by = user!.id;
        updates.rejection_reason = null;
      }
      if (status === "rejected") {
        updates.rejection_reason = "Rejected by ops";
      }
      const { error } = await supabase
        .from("worker_documents")
        .update(updates)
        .eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops-all-documents"] });
      toast({ title: "Status updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleDownload = async (filePath: string) => {
    const { data } = await supabase.storage.from("worker-documents").createSignedUrl(filePath, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = "";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("nav.documents")}</h1>
        </div>

        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !documents.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <FileText className="h-10 w-10" />
              <p>No documents found.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Document</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead>Signing</TableHead>
                     <TableHead>Updated</TableHead>
                     <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc: any) => {
                    const s = STATUS_MAP[doc.status] || STATUS_MAP.pending;
                    return (
                      <TableRow key={doc.id}>
                        <TableCell
                          className="font-medium text-primary cursor-pointer hover:underline"
                          onClick={() => navigate(`/ops/workers/${doc.worker_id}`)}
                        >
                          {doc.workerName}
                        </TableCell>
                        <TableCell className="text-sm">{doc.companyName}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{doc.orderRef}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{doc.label}</p>
                            <p className="text-xs text-muted-foreground">{doc.document_type}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.variant}>{s.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {doc.signing_status && doc.signing_status !== "none" ? (
                            <Badge variant="outline" className="text-xs">
                              <PenTool className="h-3 w-3 mr-1" />
                              {doc.signing_status}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {format(new Date(doc.updated_at), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {doc.file_path && (
                              <Button variant="ghost" size="icon" onClick={() => handleDownload(doc.file_path)} title="Download">
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => handleUploadClick(doc.id)} title="Upload">
                              <Upload className="h-4 w-4" />
                            </Button>
                            {doc.file_path && doc.status !== "verified" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateStatus.mutate({ docId: doc.id, status: "verified" })}
                                title="Verify"
                              >
                                <CheckCircle className="h-4 w-4 text-success" />
                              </Button>
                            )}
                            {doc.file_path && doc.status !== "rejected" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => updateStatus.mutate({ docId: doc.id, status: "rejected" })}
                                title="Reject"
                              >
                                <XCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                            {doc.file_path && (!doc.signing_status || doc.signing_status === "none") && doc.status !== "pending" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={sendingSignId === doc.id}
                                onClick={() => handleSendForSigning(doc.id)}
                                title="Send for Signing"
                              >
                                {sendingSignId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenTool className="h-4 w-4 text-primary" />}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
