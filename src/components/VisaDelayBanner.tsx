import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle } from "lucide-react";

export function VisaDelayBanner() {
  const { t } = useTranslation();
  const { profile } = useAuth();

  const { data: delayedWorkers = [] } = useQuery({
    queryKey: ["visa-delay-workers", profile?.company_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("workers")
        .select("first_name, last_name, visa_delay_estimate")
        .eq("company_id", profile!.company_id!)
        .eq("flag_visa_delay", true)
        .eq("status", "active");
      return data || [];
    },
    enabled: !!profile?.company_id,
  });

  if (!delayedWorkers.length) return null;

  return (
    <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-sm text-warning">
          {t("dashboard.visaDelayTitle" as any)}
        </p>
        <ul className="mt-1 space-y-0.5">
          {delayedWorkers.map((w: any, i: number) => (
            <li key={i} className="text-sm text-foreground">
              {w.first_name} {w.last_name}
              {w.visa_delay_estimate && (
                <span className="text-muted-foreground"> — {w.visa_delay_estimate}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
