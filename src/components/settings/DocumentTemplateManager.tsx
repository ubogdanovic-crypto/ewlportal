import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, Loader2 } from "lucide-react";
import { format } from "date-fns";

const TEMPLATE_TYPES = [
  { key: "invitation_letter", labelKey: "settings.invitationLetter" },
  { key: "work_contract", labelKey: "settings.workContract" },
  { key: "job_offer", labelKey: "settings.jobOffer" },
] as const;

export function DocumentTemplateManager() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: files, isLoading } = useQuery({
    queryKey: ["document-templates-list"],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("document-templates")
        .list("", { limit: 100 });
      if (error) throw error;
      return data;
    },
  });

  const getFileForType = (templateKey: string) => {
    return files?.find((f) => f.name.startsWith(templateKey + ".") || f.name.startsWith(templateKey + "_"));
  };

  const handleUpload = async (templateKey: string, file: File) => {
    // Remove old file first
    const existing = getFileForType(templateKey);
    if (existing) {
      await supabase.storage.from("document-templates").remove([existing.name]);
    }

    const ext = file.name.split(".").pop() || "docx";
    const fileName = `${templateKey}.${ext}`;

    const { error } = await supabase.storage
      .from("document-templates")
      .upload(fileName, file, { upsert: true });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("settings.templateUploaded") });
      queryClient.invalidateQueries({ queryKey: ["document-templates-list"] });
    }
  };

  if (isLoading) {
    return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mt-8" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.documentTemplates")}</CardTitle>
        <CardDescription>{t("settings.documentTemplatesDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {TEMPLATE_TYPES.map(({ key, labelKey }) => {
          const existing = getFileForType(key);
          return (
            <div key={key} className="flex items-center justify-between border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t(labelKey)}</p>
                  {existing ? (
                    <p className="text-xs text-muted-foreground">
                      {existing.name} • {format(new Date(existing.created_at), "dd.MM.yyyy")}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("settings.noTemplateUploaded")}</p>
                  )}
                </div>
              </div>
              <div>
                <input
                  ref={(el) => { fileInputRefs.current[key] = el; }}
                  type="file"
                  accept=".doc,.docx,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(key, file);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRefs.current[key]?.click()}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {existing ? t("settings.replace") : t("settings.upload")}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
