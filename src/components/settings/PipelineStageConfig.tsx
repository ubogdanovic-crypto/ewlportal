import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

interface StageConfig {
  id: string;
  stage_key: string;
  label_sr: string;
  label_en: string;
  client_visible: boolean;
  color: string | null;
  sort_order: number;
}

export function PipelineStageConfig() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editedStages, setEditedStages] = useState<Record<string, Partial<StageConfig>>>({});

  const { data: stages, isLoading } = useQuery({
    queryKey: ["pipeline-stage-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_stage_config")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as StageConfig[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (stage: StageConfig) => {
      const { error } = await supabase
        .from("pipeline_stage_config")
        .update({
          label_sr: stage.label_sr,
          label_en: stage.label_en,
          client_visible: stage.client_visible,
          color: stage.color,
        })
        .eq("id", stage.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stage-config"] });
    },
  });

  const handleFieldChange = (id: string, field: string, value: any) => {
    setEditedStages((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const getStageValue = (stage: StageConfig, field: keyof StageConfig) => {
    return editedStages[stage.id]?.[field] ?? stage[field];
  };

  const saveAll = async () => {
    if (!stages) return;
    const promises = stages
      .filter((s) => editedStages[s.id])
      .map((s) => {
        const merged = { ...s, ...editedStages[s.id] } as StageConfig;
        return updateMutation.mutateAsync(merged);
      });
    await Promise.all(promises);
    setEditedStages({});
    toast({ title: t("settings.pipelineConfigSaved") });
  };

  const hasChanges = Object.keys(editedStages).length > 0;

  if (isLoading) {
    return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mt-8" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.pipelineConfig")}</CardTitle>
        <CardDescription>{t("settings.pipelineConfigDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-[2rem_1fr_1fr_5rem_4rem] gap-2 text-xs font-medium text-muted-foreground px-1">
            <span>#</span>
            <span>Srpski</span>
            <span>English</span>
            <span>{t("settings.visible")}</span>
            <span>{t("settings.color")}</span>
          </div>
          {stages?.map((stage) => (
            <div key={stage.id} className="grid grid-cols-[2rem_1fr_1fr_5rem_4rem] gap-2 items-center">
              <span className="text-xs text-muted-foreground">{stage.sort_order}</span>
              <Input
                value={getStageValue(stage, "label_sr") as string}
                onChange={(e) => handleFieldChange(stage.id, "label_sr", e.target.value)}
                className="h-8 text-sm"
                maxLength={60}
              />
              <Input
                value={getStageValue(stage, "label_en") as string}
                onChange={(e) => handleFieldChange(stage.id, "label_en", e.target.value)}
                className="h-8 text-sm"
                maxLength={60}
              />
              <div className="flex justify-center">
                <Switch
                  checked={getStageValue(stage, "client_visible") as boolean}
                  onCheckedChange={(v) => handleFieldChange(stage.id, "client_visible", v)}
                />
              </div>
              <Input
                type="color"
                value={(getStageValue(stage, "color") as string) || "#6366f1"}
                onChange={(e) => handleFieldChange(stage.id, "color", e.target.value)}
                className="h-8 w-10 p-0.5 cursor-pointer"
              />
            </div>
          ))}
        </div>
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
