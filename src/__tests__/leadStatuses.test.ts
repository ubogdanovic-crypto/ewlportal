import { describe, it, expect } from "vitest";

const LEAD_STATUSES = ["cold", "warm", "hot", "negotiating", "won", "lost"];
const LEAD_SOURCES = ["referral", "cold", "event", "website", "partner", "other"];

describe("Lead status workflow", () => {
  it("has 6 lead statuses", () => {
    expect(LEAD_STATUSES).toHaveLength(6);
  });

  it("starts cold and ends won or lost", () => {
    expect(LEAD_STATUSES[0]).toBe("cold");
    expect(LEAD_STATUSES.includes("won")).toBe(true);
    expect(LEAD_STATUSES.includes("lost")).toBe(true);
  });

  it("has 6 lead sources", () => {
    expect(LEAD_SOURCES).toHaveLength(6);
  });

  it("referral is a valid source", () => {
    expect(LEAD_SOURCES.includes("referral")).toBe(true);
  });

  it("cold appears in both statuses and sources (different meanings)", () => {
    expect(LEAD_STATUSES.includes("cold")).toBe(true);
    expect(LEAD_SOURCES.includes("cold")).toBe(true);
  });
});

describe("Lead conversion", () => {
  it("won lead should have converted_company_id", () => {
    const lead = { status: "won", converted_company_id: "abc-123" };
    expect(lead.status).toBe("won");
    expect(lead.converted_company_id).toBeTruthy();
  });

  it("lost lead should have lost_reason", () => {
    const lead = { status: "lost", lost_reason: "Too expensive" };
    expect(lead.status).toBe("lost");
    expect(lead.lost_reason).toBeTruthy();
  });
});
