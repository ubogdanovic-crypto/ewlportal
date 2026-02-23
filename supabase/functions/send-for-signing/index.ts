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
    const SIGNWELL_API_KEY = Deno.env.get("SIGNWELL_API_KEY");
    if (!SIGNWELL_API_KEY) throw new Error("SIGNWELL_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { documentId } = await req.json();
    if (!documentId) throw new Error("documentId is required");

    // Get the document record
    const { data: doc, error: docErr } = await supabase
      .from("worker_documents")
      .select("*, workers(first_name, last_name, email)")
      .eq("id", documentId)
      .single();

    if (docErr || !doc) throw new Error("Document not found");
    if (!doc.file_path) throw new Error("No file uploaded for this document");

    // Download the file from storage
    const { data: fileData, error: fileErr } = await supabase.storage
      .from("worker-documents")
      .download(doc.file_path);
    if (fileErr || !fileData) throw new Error("Failed to download file from storage");

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Get webhook URL
    const webhookUrl = `${SUPABASE_URL}/functions/v1/signwell-webhook`;

    // Determine signer info
    const worker = doc.workers as any;
    const signerName = worker ? `${worker.first_name} ${worker.last_name}` : "Signer";
    const signerEmail = worker?.email || "";

    if (!signerEmail) throw new Error("Worker has no email address for signing");

    // Create SignWell document
    const signwellRes = await fetch("https://www.signwell.com/api/v1/documents/", {
      method: "POST",
      headers: {
        "X-Api-Key": SIGNWELL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        test_mode: true,
        name: doc.label || doc.document_type,
        subject: `Please sign: ${doc.label || doc.document_type}`,
        message: `You are requested to sign the document "${doc.label}".`,
        recipients: [
          {
            id: "1",
            name: signerName,
            email: signerEmail,
            action: "sign",
          },
        ],
        files: [
          {
            name: doc.file_name || "document.pdf",
            file_base64: base64,
          },
        ],
        api_application_id: null,
        draft: false,
        reminders: true,
        apply_signing_order: false,
        embedded_signing: false,
        text_tags: false,
        allow_decline: true,
        webhook_url: webhookUrl,
      }),
    });

    if (!signwellRes.ok) {
      const errBody = await signwellRes.text();
      throw new Error(`SignWell API error [${signwellRes.status}]: ${errBody}`);
    }

    const signwellDoc = await signwellRes.json();

    // Update document with SignWell ID
    await supabase
      .from("worker_documents")
      .update({
        signwell_document_id: signwellDoc.id,
        signing_status: "sent",
      })
      .eq("id", documentId);

    return new Response(JSON.stringify({ success: true, signwellDocumentId: signwellDoc.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in send-for-signing:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
