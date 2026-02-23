import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

interface EmailTemplate {
  id: string;
  trigger_event: string;
  lang: string;
  subject: string;
  body_html: string;
}

const TRIGGER_LABELS: Record<string, { sr: string; en: string }> = {
  new_order_received: { sr: "Nova narudžbina primljena", en: "New Order Received" },
  order_status_changed: { sr: "Promena statusa narudžbine", en: "Order Status Changed" },
  worker_stage_changed: { sr: "Promena faze radnika", en: "Worker Stage Changed" },
  documents_ready: { sr: "Dokumenti spremni", en: "Documents Ready" },
  police_interview_scheduled: { sr: "Policijski intervju zakazan", en: "Police Interview Scheduled" },
  visa_approved: { sr: "Viza odobrena", en: "Visa Approved" },
  worker_arrived: { sr: "Radnik stigao", en: "Worker Arrived" },
};

export function EmailTemplateEditor() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editedTemplates, setEditedTemplates] = useState<Record<string, Partial<EmailTemplate>>>({});

  const { data: templates, isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("trigger_event");
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (tmpl: EmailTemplate) => {
      const { error } = await supabase
        .from("email_templates")
        .update({ subject: tmpl.subject, body_html: tmpl.body_html })
        .eq("id", tmpl.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
    },
  });

  const handleChange = (id: string, field: string, value: string) => {
    setEditedTemplates((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const getValue = (tmpl: EmailTemplate, field: keyof EmailTemplate) => {
    return editedTemplates[tmpl.id]?.[field] ?? tmpl[field];
  };

  const saveAll = async () => {
    if (!templates) return;
    const promises = templates
      .filter((t) => editedTemplates[t.id])
      .map((t) => updateMutation.mutateAsync({ ...t, ...editedTemplates[t.id] } as EmailTemplate));
    await Promise.all(promises);
    setEditedTemplates({});
    toast({ title: t("settings.templatesSaved") });
  };

  const hasChanges = Object.keys(editedTemplates).length > 0;

  // Group templates by trigger_event
  const grouped = templates?.reduce<Record<string, EmailTemplate[]>>((acc, t) => {
    if (!acc[t.trigger_event]) acc[t.trigger_event] = [];
    acc[t.trigger_event].push(t);
    return acc;
  }, {}) ?? {};

  if (isLoading) {
    return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mt-8" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.emailTemplates")}</CardTitle>
        <CardDescription>
          {t("settings.emailTemplatesDesc")}
          <br />
          <span className="text-xs font-mono mt-1 inline-block">
            {"{{worker_name}}, {{order_ref}}, {{company_name}}, {{stage_name}}, {{status}}"}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {Object.entries(grouped).map(([event, tmpls]) => {
            const label = TRIGGER_LABELS[event]?.[i18n.language as "sr" | "en"] ?? event;
            return (
              <AccordionItem key={event} value={event}>
                <AccordionTrigger className="text-sm">{label}</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tmpls.map((tmpl) => (
                      <div key={tmpl.id} className="space-y-2 border rounded-lg p-3">
                        <Label className="text-xs font-semibold uppercase">{tmpl.lang === "sr" ? "Srpski" : "English"}</Label>
                        <div className="space-y-1">
                          <Label className="text-xs">{t("settings.subject")}</Label>
                          <Input
                            value={getValue(tmpl, "subject") as string}
                            onChange={(e) => handleChange(tmpl.id, "subject", e.target.value)}
                            maxLength={200}
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t("settings.body")}</Label>
                          <Textarea
                            value={getValue(tmpl, "body_html") as string}
                            onChange={(e) => handleChange(tmpl.id, "body_html", e.target.value)}
                            rows={4}
                            className="text-sm font-mono"
                            maxLength={5000}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
        <div className="flex justify-end mt-4">
          <Button onClick={saveAll} disabled={!hasChanges || updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            {t("common.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
