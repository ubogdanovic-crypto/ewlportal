import { describe, it, expect } from "vitest";
import { STAGE_ORDER } from "@/components/PipelineStage";

describe("Pipeline Stages", () => {
  it("has exactly 14 stages", () => {
    expect(STAGE_ORDER).toHaveLength(14);
  });

  it("starts with sourcing and ends with arrived", () => {
    expect(STAGE_ORDER[0]).toBe("sourcing");
    expect(STAGE_ORDER[STAGE_ORDER.length - 1]).toBe("arrived");
  });

  it("has correct stage ordering", () => {
    const expectedOrder = [
      "sourcing", "cv_screening", "cv_sent_to_client", "client_review",
      "interview_scheduled", "interview_completed", "approved_by_client",
      "documents_collection", "document_generation", "documents_signed",
      "visa_application", "police_interview", "visa_approved", "arrived",
    ];
    expect(STAGE_ORDER).toEqual(expectedOrder);
  });

  it("has no duplicate stages", () => {
    const unique = new Set(STAGE_ORDER);
    expect(unique.size).toBe(STAGE_ORDER.length);
  });

  it("approved_by_client comes before documents_collection", () => {
    const approvedIdx = STAGE_ORDER.indexOf("approved_by_client");
    const docsIdx = STAGE_ORDER.indexOf("documents_collection");
    expect(approvedIdx).toBeLessThan(docsIdx);
  });

  it("visa stages are grouped together near the end", () => {
    const visaApp = STAGE_ORDER.indexOf("visa_application");
    const policeInt = STAGE_ORDER.indexOf("police_interview");
    const visaApproved = STAGE_ORDER.indexOf("visa_approved");
    expect(policeInt).toBe(visaApp + 1);
    expect(visaApproved).toBe(policeInt + 1);
  });
});
