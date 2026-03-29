import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Workers with SLA breaches
    const { data: stageConfig } = await supabase
      .from("pipeline_stage_config")
      .select("stage_key, expected_duration_days, label_en");

    const { data: activeWorkers } = await supabase
      .from("workers")
      .select("id, first_name, last_name, current_stage, updated_at, company_id, order_id, orders(reference_number), companies(name)")
      .eq("status", "active");

    const slaBreaches: string[] = [];
    const stageMap = new Map((stageConfig || []).map((s: any) => [s.stage_key, s]));

    for (const w of activeWorkers || []) {
      const config = stageMap.get(w.current_stage) as any;
      if (!config?.expected_duration_days) continue;
      const days = Math.floor((Date.now() - new Date(w.updated_at).getTime()) / 86400000);
      if (days > config.expected_duration_days) {
        slaBreaches.push(
          `${w.first_name} ${w.last_name} — ${w.current_stage.replace(/_/g, " ")} for ${days}d (expected: ${config.expected_duration_days}d) — ${(w.orders as any)?.reference_number || ""}`
        );
      }
    }

    // 2. Overdue tasks
    const { data: overdueTasks } = await supabase
      .from("tasks")
      .select("title, due_date, assigned_to")
      .lt("due_date", new Date().toISOString().split("T")[0])
      .in("status", ["todo", "in_progress"]);

    // 3. Pending documents
    const { data: pendingDocs } = await supabase
      .from("worker_documents")
      .select("id, document_type, worker_id, uploaded_at")
      .eq("status", "uploaded")
      .lt("uploaded_at", new Date(Date.now() - 48 * 3600 * 1000).toISOString());

    // 4. Build digest HTML
    const sections: string[] = [];

    if (slaBreaches.length > 0) {
      sections.push(`
        <h3 style="color:#dc2626">SLA Breaches (${slaBreaches.length})</h3>
        <ul>${slaBreaches.map((b) => `<li>${b}</li>`).join("")}</ul>
      `);
    }

    if ((overdueTasks || []).length > 0) {
      sections.push(`
        <h3 style="color:#f59e0b">Overdue Tasks (${overdueTasks!.length})</h3>
        <ul>${overdueTasks!.map((t: any) => `<li>${t.title} — due ${t.due_date}</li>`).join("")}</ul>
      `);
    }

    if ((pendingDocs || []).length > 0) {
      sections.push(`
        <h3>Documents Pending Verification (${pendingDocs!.length})</h3>
        <p>${pendingDocs!.length} documents uploaded more than 48h ago awaiting verification.</p>
      `);
    }

    if (sections.length === 0) {
      return new Response(JSON.stringify({ success: true, skipped: "nothing to report" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>EWL Daily Ops Digest</h2>
        <p style="color:#666">${new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        ${sections.join("<hr>")}
        <hr>
        <p style="color:#999;font-size:12px">EWL Portal — automated daily digest</p>
      </div>
    `;

    // 5. Send to ops/management users
    const { data: opsProfiles } = await supabase
      .from("profiles")
      .select("email, user_id")
      .eq("is_active", true);

    const { data: opsRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["ops", "management"]);

    const opsUserIds = new Set((opsRoles || []).map((r: any) => r.user_id));
    const recipients = (opsProfiles || [])
      .filter((p: any) => opsUserIds.has(p.user_id))
      .map((p: any) => p.email);

    if (recipients.length > 0) {
      await supabase.functions.invoke("send-notification", {
        body: {
          to: recipients,
          subject: `EWL Daily Digest — ${slaBreaches.length} SLA breaches, ${(overdueTasks || []).length} overdue tasks`,
          html,
        },
      });
    }

    return new Response(
      JSON.stringify({ success: true, recipients: recipients.length, breaches: slaBreaches.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-daily-digest:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
