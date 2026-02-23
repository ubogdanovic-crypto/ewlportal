import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Docxtemplater from "npm:docxtemplater@3.50.0";
import PizZip from "npm:pizzip@3.1.7";

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
    const userId = claimsData.claims.sub;

    const { workerId, templateType } = await req.json();
    if (!workerId || !templateType) {
      throw new Error("workerId and templateType are required");
    }

    const validTypes = ["invitation_letter", "work_contract", "job_offer"];
    if (!validTypes.includes(templateType)) {
      throw new Error(`Invalid template type. Must be one of: ${validTypes.join(", ")}`);
    }

    // Fetch worker with related data
    const { data: worker, error: workerErr } = await supabase
      .from("workers")
      .select("*, orders(reference_number, position_title, start_date, contract_duration_months, monthly_salary_eur, work_schedule, accommodation_provided, accommodation_address, company_id), companies(name, address, city, country, contact_person, pib, maticni_broj)")
      .eq("id", workerId)
      .single();

    if (workerErr || !worker) throw new Error("Worker not found");

    const order = worker.orders as any;
    const company = worker.companies as any;

    // Find the template file in storage
    const { data: templateFiles, error: listErr } = await supabase.storage
      .from("document-templates")
      .list("", { limit: 100 });

    if (listErr) throw new Error("Failed to list templates");

    const templateFile = templateFiles?.find(
      (f) => f.name.startsWith(templateType + ".") || f.name.startsWith(templateType + "_")
    );

    if (!templateFile) {
      throw new Error(`No template uploaded for "${templateType}". Please upload a template in Management Settings first.`);
    }

    // Download template
    const { data: fileData, error: downloadErr } = await supabase.storage
      .from("document-templates")
      .download(templateFile.name);

    if (downloadErr || !fileData) throw new Error("Failed to download template file");

    const arrayBuffer = await fileData.arrayBuffer();

    // Prepare placeholder data
    const today = new Date();
    const templateData = {
      // Worker info
      worker_name: `${worker.first_name} ${worker.last_name}`,
      worker_first_name: worker.first_name,
      worker_last_name: worker.last_name,
      worker_nationality: worker.nationality || "",
      worker_date_of_birth: worker.date_of_birth || "",
      worker_passport_number: worker.passport_number || "",
      worker_passport_expiry: worker.passport_expiry || "",
      worker_email: worker.email || "",
      worker_phone: worker.phone || "",
      // Company info
      company_name: company?.name || "",
      company_address: company?.address || "",
      company_city: company?.city || "",
      company_country: company?.country || "",
      company_contact_person: company?.contact_person || "",
      company_pib: company?.pib || "",
      company_maticni_broj: company?.maticni_broj || "",
      // Order info
      order_ref: order?.reference_number || "",
      position_title: order?.position_title || "",
      start_date: order?.start_date || "",
      contract_duration: order?.contract_duration_months ? `${order.contract_duration_months} months` : "",
      monthly_salary: order?.monthly_salary_eur ? `${order.monthly_salary_eur} EUR` : "",
      work_schedule: order?.work_schedule || "",
      accommodation_provided: order?.accommodation_provided ? "Yes" : "No",
      accommodation_address: order?.accommodation_address || "",
      // Meta
      date_generated: today.toLocaleDateString("en-GB"),
      year: today.getFullYear().toString(),
    };

    // Process template
    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{{", end: "}}" },
    });

    doc.render(templateData);

    const generatedBuffer = doc.getZip().generate({ type: "uint8array" });

    // Upload generated document
    const ext = templateFile.name.split(".").pop() || "docx";
    const outputFileName = `${templateType}_${worker.first_name}_${worker.last_name}.${ext}`;
    const outputPath = `${workerId}/generated/${outputFileName}`;

    const { error: uploadErr } = await supabase.storage
      .from("worker-documents")
      .upload(outputPath, generatedBuffer, {
        upsert: true,
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

    if (uploadErr) throw new Error(`Failed to upload generated document: ${uploadErr.message}`);

    // Create or update worker_documents record
    const docLabel = {
      invitation_letter: "Invitation Letter",
      work_contract: "Work Contract",
      job_offer: "Job Offer",
    }[templateType] || templateType;

    // Check if a document of this type already exists for generated docs
    const { data: existingDoc } = await supabase
      .from("worker_documents")
      .select("id")
      .eq("worker_id", workerId)
      .eq("document_type", templateType)
      .maybeSingle();

    if (existingDoc) {
      await supabase
        .from("worker_documents")
        .update({
          file_path: outputPath,
          file_name: outputFileName,
          file_size: generatedBuffer.length,
          status: "uploaded",
          uploaded_at: new Date().toISOString(),
          uploaded_by: userId,
          notes: "Auto-generated from template",
        })
        .eq("id", existingDoc.id);
    } else {
      await supabase.from("worker_documents").insert({
        worker_id: workerId,
        document_type: templateType,
        label: docLabel,
        file_path: outputPath,
        file_name: outputFileName,
        file_size: generatedBuffer.length,
        status: "uploaded",
        is_required: true,
        uploaded_at: new Date().toISOString(),
        uploaded_by: userId,
        notes: "Auto-generated from template",
      });
    }

    return new Response(
      JSON.stringify({ success: true, fileName: outputFileName }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in generate-document:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
