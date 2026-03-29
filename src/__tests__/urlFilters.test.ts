import { describe, it, expect } from "vitest";

// Test the URL filter logic (pure function equivalent)
describe("URL filter logic", () => {
  it("returns default when param not set", () => {
    const params = new URLSearchParams("");
    const stage = params.get("stage") || "all";
    expect(stage).toBe("all");
  });

  it("returns value when param is set", () => {
    const params = new URLSearchParams("stage=sourcing&status=active");
    expect(params.get("stage")).toBe("sourcing");
    expect(params.get("status")).toBe("active");
  });

  it("handles search param", () => {
    const params = new URLSearchParams("q=rajan");
    expect(params.get("q")).toBe("rajan");
  });

  it("serializes filters to URL", () => {
    const params = new URLSearchParams();
    params.set("stage", "visa_application");
    params.set("status", "active");
    expect(params.toString()).toBe("stage=visa_application&status=active");
  });

  it("removes default values", () => {
    const params = new URLSearchParams("stage=all");
    if (params.get("stage") === "all") params.delete("stage");
    expect(params.toString()).toBe("");
  });
});
