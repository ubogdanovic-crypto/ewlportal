import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

// 14 pipeline stages with color groups
const STAGE_CONFIG: Record<string, { colorClass: string; group: string }> = {
  sourcing:             { colorClass: "bg-gray-100 text-gray-700 border-gray-300",         group: "sourcing" },
  cv_screening:         { colorClass: "bg-gray-100 text-gray-700 border-gray-300",         group: "sourcing" },
  cv_sent_to_client:    { colorClass: "bg-blue-100 text-blue-700 border-blue-300",         group: "review" },
  client_review:        { colorClass: "bg-blue-100 text-blue-700 border-blue-300",         group: "review" },
  interview_scheduled:  { colorClass: "bg-teal-100 text-teal-700 border-teal-300",         group: "interview" },
  interview_completed:  { colorClass: "bg-teal-100 text-teal-700 border-teal-300",         group: "interview" },
  approved_by_client:   { colorClass: "bg-amber-100 text-amber-700 border-amber-300",      group: "approved" },
  documents_collection: { colorClass: "bg-amber-100 text-amber-700 border-amber-300",      group: "documents" },
  document_generation:  { colorClass: "bg-purple-100 text-purple-700 border-purple-300",   group: "documents" },
  documents_signed:     { colorClass: "bg-purple-100 text-purple-700 border-purple-300",   group: "documents" },
  visa_application:     { colorClass: "bg-green-100 text-green-700 border-green-300",      group: "visa" },
  police_interview:     { colorClass: "bg-green-100 text-green-700 border-green-300",      group: "visa" },
  visa_approved:        { colorClass: "bg-green-100 text-green-700 border-green-300",      group: "visa" },
  arrived:              { colorClass: "bg-primary/15 text-primary border-primary/30",       group: "complete" },
};

const STAGE_ORDER = [
  'sourcing', 'cv_screening', 'cv_sent_to_client', 'client_review',
  'interview_scheduled', 'interview_completed', 'approved_by_client',
  'documents_collection', 'document_generation', 'documents_signed',
  'visa_application', 'police_interview', 'visa_approved', 'arrived',
];

export function getStageIndex(stage: string): number {
  return STAGE_ORDER.indexOf(stage);
}

export function getStageConfig(stage: string) {
  return STAGE_CONFIG[stage] || STAGE_CONFIG.sourcing;
}

export function PipelineStageBadge({ stage, size = "default" }: { stage: string; size?: "default" | "sm" }) {
  const { t } = useTranslation();
  const config = getStageConfig(stage);
  const label = t(`pipeline.${stage}` as any);

  return (
    <Badge
      variant="outline"
      className={`${config.colorClass} ${size === "sm" ? "text-xs px-1.5 py-0" : ""}`}
    >
      {label}
    </Badge>
  );
}

export function PipelineProgress({ currentStage }: { currentStage: string }) {
  const { t } = useTranslation();
  const currentIdx = getStageIndex(currentStage);

  return (
    <div className="space-y-1">
      <div className="flex gap-0.5">
        {STAGE_ORDER.map((stage, idx) => {
          const config = getStageConfig(stage);
          const isActive = idx <= currentIdx;
          return (
            <div
              key={stage}
              className={`h-2 flex-1 rounded-sm transition-colors ${
                isActive ? config.colorClass.split(" ")[0] : "bg-muted"
              }`}
              title={t(`pipeline.${stage}` as any)}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{t("pipeline.sourcing")}</span>
        <span>{t("pipeline.arrived")}</span>
      </div>
    </div>
  );
}

export { STAGE_ORDER };
