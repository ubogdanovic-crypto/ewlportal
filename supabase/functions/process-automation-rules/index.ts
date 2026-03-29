import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const payload = await req.json();
    const { type, table, record, old_record } = payload;

    // Determine trigger type
    let triggerType: string | null = null;
    if (table === "workers" && record?.current_stage !== old_record?.current_stage) {
      triggerType = "stage_change";
    } else if (table === "worker_documents" && record?.status !== old_record?.status) {
      triggerType = "document_status";
    } else if (table === "worker_documents" && record?.signing_status !== old_record?.signing_status) {
      triggerType = "signing_status";
    }

    if (!triggerType) {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch active rules matching this trigger type
    const { data: rules } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("is_active", true)
      .eq("trigger_type", triggerType);

    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ success: true, matched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let executed = 0;

    for (const rule of rules) {
      const condition = rule.trigger_condition as Record<string, any>;

      // Evaluate trigger condition
      let matches = true;
      if (triggerType === "stage_change" && condition.to_stage) {
        matches = record.current_stage === condition.to_stage;
      }
      if (triggerType === "document_status" && condition.status) {
        matches = record.status === condition.status;
      }
      if (triggerType === "signing_status" && condition.signing_status) {
        matches = record.signing_status === condition.signing_status;
      }

      if (!matches) continue;

      const actionConfig = rule.action_config as Record<string, any>;

      // Execute action
      switch (rule.action_type) {
        case "change_stage": {
          if (!actionConfig.target_stage) break;
          const workerId = table === "workers" ? record.id : record.worker_id;
          if (!workerId) break;

          await supabase
            .from("workers")
            .update({ current_stage: actionConfig.target_stage })
            .eq("id", workerId);

          await supabase.from("pipeline_stage_history").insert({
            worker_id: workerId,
            from_stage: record.current_stage,
            to_stage: actionConfig.target_stage,
            changed_by: "00000000-0000-0000-0000-000000000000",
            notes: `Auto: ${rule.name}`,
          });
          executed++;
          break;
        }

        case "send_notification": {
          const workerId = table === "workers" ? record.id : record.worker_id;
          if (!workerId) break;

          // Get worker details for notification
          const { data: worker } = await supabase
            .from("workers")
            .select("first_name, last_name, company_id")
            .eq("id", workerId)
            .single();

          if (worker) {
            // Notify ops users
            const { data: opsUsers } = await supabase
              .from("profiles")
              .select("email, user_id")
              .eq("is_active", true);

            const { data: opsRoles } = await supabase
              .from("user_roles")
              .select("user_id")
              .in("role", ["ops", "management"]);

            const opsUserIds = new Set((opsRoles || []).map((r: any) => r.user_id));

            for (const profile of (opsUsers || []).filter((p: any) => opsUserIds.has(p.user_id))) {
              await supabase.from("notifications").insert({
                recipient_email: profile.email,
                recipient_user_id: profile.user_id,
                notification_type: "automation",
                subject: `Auto: ${rule.name}`,
                body: `Automation rule "${rule.name}" triggered for ${worker.first_name} ${worker.last_name}.`,
                entity_type: "worker",
                entity_id: workerId,
                status: "sent",
              });
            }
          }
          executed++;
          break;
        }

        case "create_task": {
          const workerId = table === "workers" ? record.id : record.worker_id;
          await supabase.from("tasks").insert({
            title: actionConfig.title || `Auto: ${rule.name}`,
            description: actionConfig.description || null,
            entity_type: "worker",
            entity_id: workerId,
            assigned_to: actionConfig.assigned_to || null,
            priority: actionConfig.priority || "normal",
            created_by: "00000000-0000-0000-0000-000000000000",
          });
          executed++;
          break;
        }
      }
    }

    console.log(`Processed ${rules.length} rules, executed ${executed} actions`);

    return new Response(
      JSON.stringify({ success: true, matched: rules.length, executed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in process-automation-rules:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
