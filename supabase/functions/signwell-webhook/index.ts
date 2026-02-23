import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const payload = await req.json();
    console.log("SignWell webhook received:", JSON.stringify(payload));

    const eventType = payload.event_type || payload.event;
    const documentId = payload.document?.id || payload.id;

    if (!documentId) {
      return new Response(JSON.stringify({ error: "No document ID in payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map SignWell events to our signing_status
    let signingStatus: string | null = null;
    switch (eventType) {
      case "document_completed":
        signingStatus = "signed";
        break;
      case "document_declined":
        signingStatus = "declined";
        break;
      case "document_expired":
        signingStatus = "expired";
        break;
      case "document_viewed":
        signingStatus = "viewed";
        break;
      case "document_sent":
        signingStatus = "sent";
        break;
      default:
        console.log(`Unhandled SignWell event: ${eventType}`);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Update the worker_documents record
    const { error } = await supabase
      .from("worker_documents")
      .update({ signing_status: signingStatus })
      .eq("signwell_document_id", documentId);

    if (error) {
      console.error("Failed to update document signing status:", error);
      throw error;
    }

    // If signed, also update document status to verified
    if (signingStatus === "signed") {
      await supabase
        .from("worker_documents")
        .update({
          status: "verified",
          verified_at: new Date().toISOString(),
          notes: "Auto-verified via e-signature",
        })
        .eq("signwell_document_id", documentId);
    }

    console.log(`Updated document ${documentId} signing_status to ${signingStatus}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in signwell-webhook:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
