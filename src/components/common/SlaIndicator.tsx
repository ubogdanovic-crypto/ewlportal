import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Clock } from "lucide-react";

interface SlaIndicatorProps {
  stage: string;
  stageEnteredAt: string;
  compact?: boolean;
}

export function SlaIndicator({ stage, stageEnteredAt, compact = false }: SlaIndicatorProps) {
  const { data: stageConfig } = useQuery({
    queryKey: ["pipeline-stage-config"],
    queryFn: async () => {
      const { data } = await supabase.from("pipeline_stage_config").select("*");
      return data || [];
    },
    staleTime: Infinity,
  });

  if (!stageConfig || !stageEnteredAt) return null;

  const config = stageConfig.find((s: any) => s.stage_key === stage);
  if (!config?.expected_duration_days) return null;

  const daysInStage = Math.floor(
    (Date.now() - new Date(stageEnteredAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const expected = config.expected_duration_days;
  const warning = config.sla_warning_days || Math.floor(expected * 0.7);

  if (daysInStage < warning) return null;

  const isBreached = daysInStage > expected;

  if (compact) {
    return (
      <span className={`text-xs ${isBreached ? "text-destructive font-medium" : "text-warning"}`} title={`${daysInStage}d / ${expected}d`}>
        {isBreached ? <AlertTriangle className="h-3 w-3 inline" /> : <Clock className="h-3 w-3 inline" />}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-1 text-xs ${isBreached ? "text-destructive" : "text-warning"}`}>
      {isBreached ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
      <span>{daysInStage}d / {expected}d</span>
      {isBreached && <span className="font-medium">SLA breach</span>}
    </div>
  );
}
