import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a passport OCR system. Extract the following fields from this passport image.
Return ONLY valid JSON, no markdown, no code fences. Use this exact structure:
{
  "first_name": { "value": "", "confidence": "high" },
  "last_name": { "value": "", "confidence": "high" },
  "date_of_birth": { "value": "YYYY-MM-DD", "confidence": "high" },
  "nationality": { "value": "", "confidence": "high" },
  "passport_number": { "value": "", "confidence": "high" },
  "passport_expiry": { "value": "YYYY-MM-DD", "confidence": "high" },
  "gender": { "value": "", "confidence": "high" },
  "place_of_birth": { "value": "", "confidence": "high" },
  "issuing_country": { "value": "", "confidence": "high" }
}

Rules:
- confidence must be "high", "medium", or "low"
- All dates in YYYY-MM-DD format
- Names in Title Case (not ALL CAPS)
- Nationality and issuing_country as full country name in English (e.g. "India", "Nepal")
- Gender as "M" or "F"
- If a field is unreadable, set value to "" and confidence to "low"
- Read BOTH the MRZ (machine readable zone at the bottom) and the visual zone; cross-reference for accuracy
- For Indian passports: "Given Name(s)" maps to first_name, "Surname" maps to last_name
- For passport_number: use the document number from the MRZ for highest accuracy`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

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
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64 || !mimeType) {
      throw new Error("imageBase64 and mimeType are required");
    }

    // Build the content block based on file type
    const isPdf = mimeType === "application/pdf";
    const contentBlock = isPdf
      ? {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: imageBase64,
          },
        }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: mimeType as "image/jpeg" | "image/png" | "image/webp",
            data: imageBase64,
          },
        };

    // Call Claude Vision API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              contentBlock,
              {
                type: "text",
                text: "Extract all passport data from this document. Return JSON only.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Anthropic API error:", response.status, errorBody);
      throw new Error(
        `Anthropic API returned ${response.status}: ${errorBody}`
      );
    }

    const result = await response.json();

    // Extract the text content from Claude's response
    const textContent = result.content?.find(
      (c: any) => c.type === "text"
    )?.text;
    if (!textContent) {
      throw new Error("No text response from Claude");
    }

    // Parse the JSON from Claude's response
    // Strip any accidental markdown code fences
    const cleaned = textContent
      .replace(/^```json?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const extractedData = JSON.parse(cleaned);

    return new Response(
      JSON.stringify({ success: true, data: extractedData }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in extract-passport-data:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";

    // Distinguish parse errors (bad image) from system errors
    const isParseFail =
      msg.includes("JSON") ||
      msg.includes("parse") ||
      msg.includes("Unexpected");
    const status = isParseFail ? 422 : 500;
    const userMsg = isParseFail
      ? "Could not extract passport data. Please ensure the image is clear and shows the full passport page."
      : msg;

    return new Response(JSON.stringify({ error: userMsg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
