import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the caller is a management user
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub as string;

    // Check management role
    const { data: roleData } = await anonClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (roleData?.role !== "management") {
      return new Response(JSON.stringify({ error: "Forbidden: management role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, role, company_id, full_name } = await req.json();

    if (!email || !role) {
      return new Response(JSON.stringify({ error: "email and role are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client to invite user
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: full_name || "" },
    });

    if (inviteErr) {
      return new Response(JSON.stringify({ error: inviteErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = inviteData.user.id;

    // Assign role
    await adminClient.from("user_roles").insert({
      user_id: newUserId,
      role: role,
    });

    // Update profile with company_id if provided
    if (company_id) {
      await adminClient
        .from("profiles")
        .update({ company_id, full_name: full_name || "" })
        .eq("user_id", newUserId);
    } else if (full_name) {
      await adminClient
        .from("profiles")
        .update({ full_name })
        .eq("user_id", newUserId);
    }

    return new Response(JSON.stringify({ success: true, user_id: newUserId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
