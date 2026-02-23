import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, FileCheck, FileClock, FileX } from "lucide-react";

const DOC_STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof FileCheck }> = {
  verified: { label: "Verified", variant: "default", icon: FileCheck },
  pending: { label: "Pending", variant: "outline", icon: FileClock },
  uploaded: { label: "Uploaded", variant: "secondary", icon: FileClock },
  rejected: { label: "Rejected", variant: "destructive", icon: FileX },
};

export default function ClientDocuments() {
  const { t } = useTranslation();
  const { profile } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["client-documents", profile?.company_id],
    queryFn: async () => {
      // Get workers for this company
      const { data: workers } = await supabase
        .from("workers")
        .select("id, first_name, last_name, order_id")
        .eq("company_id", profile!.company_id!);

      if (!workers?.length) return [];

      const workerIds = workers.map((w) => w.id);

      // Get orders for reference numbers
      const orderIds = [...new Set(workers.map((w) => w.order_id))];
      const { data: orders } = await supabase
        .from("orders")
        .select("id, reference_number")
        .in("id", orderIds);

      const orderMap = Object.fromEntries((orders || []).map((o) => [o.id, o.reference_number]));
      const workerMap = Object.fromEntries(workers.map((w) => [w.id, { name: `${w.first_name} ${w.last_name}`, orderRef: orderMap[w.order_id] || "" }]));

      // Get documents
      const { data: docs } = await supabase
        .from("worker_documents")
        .select("*")
        .in("worker_id", workerIds)
        .order("created_at", { ascending: false });

      return (docs || []).map((d) => ({
        ...d,
        workerName: workerMap[d.worker_id]?.name || "",
        orderRef: workerMap[d.worker_id]?.orderRef || "",
      }));
    },
    enabled: !!profile?.company_id,
  });

  const documents = data || [];

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data } = await supabase.storage.from("worker-documents").createSignedUrl(filePath, 60);
    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{t("nav.documents")}</h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">Loading…</div>
        ) : !documents.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <FileText className="h-10 w-10" />
              <p>No documents available yet.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc: any) => {
                    const status = DOC_STATUS_MAP[doc.status] || DOC_STATUS_MAP.pending;
                    return (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.workerName}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{doc.orderRef}</TableCell>
                        <TableCell>{doc.label}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{doc.document_type}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {doc.file_path ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(doc.file_path, doc.file_name || doc.label)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
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
