import { describe, it, expect } from "vitest";
import { queryKeys } from "@/lib/queryKeys";

describe("queryKeys", () => {
  it("generates unique worker keys", () => {
    expect(queryKeys.workers.all).toEqual(["workers"]);
    expect(queryKeys.workers.detail("123")).toEqual(["workers", "detail", "123"]);
    expect(queryKeys.workers.documents("123")).toEqual(["workers", "documents", "123"]);
    expect(queryKeys.workers.history("123")).toEqual(["workers", "history", "123"]);
  });

  it("generates unique order keys", () => {
    expect(queryKeys.orders.all).toEqual(["orders"]);
    expect(queryKeys.orders.detail("456")).toEqual(["orders", "detail", "456"]);
    expect(queryKeys.orders.byCompany("789")).toEqual(["orders", "company", "789"]);
  });

  it("generates unique lead keys", () => {
    expect(queryKeys.leads.all).toEqual(["leads"]);
    expect(queryKeys.leads.detail("abc")).toEqual(["leads", "detail", "abc"]);
    expect(queryKeys.leads.activities("abc")).toEqual(["leads", "activities", "abc"]);
  });

  it("generates unique task keys", () => {
    expect(queryKeys.tasks.all).toEqual(["tasks"]);
    expect(queryKeys.tasks.mine("user1")).toEqual(["tasks", "mine", "user1"]);
    expect(queryKeys.tasks.byEntity("lead", "id1")).toEqual(["tasks", "entity", "lead", "id1"]);
  });

  it("generates unique partner keys", () => {
    expect(queryKeys.partner.orders("agency1")).toEqual(["partner", "orders", "agency1"]);
    expect(queryKeys.partner.candidates("order1")).toEqual(["partner", "candidates", "order1"]);
  });

  it("generates different keys for different IDs", () => {
    expect(queryKeys.workers.detail("a")).not.toEqual(queryKeys.workers.detail("b"));
    expect(queryKeys.leads.detail("x")).not.toEqual(queryKeys.orders.detail("x"));
  });

  it("list keys with filters are unique per filter set", () => {
    const f1 = queryKeys.workers.list({ stage: "sourcing" });
    const f2 = queryKeys.workers.list({ stage: "arrived" });
    const f3 = queryKeys.workers.list({ stage: "sourcing" });
    expect(f1).not.toEqual(f2);
    expect(f1).toEqual(f3);
  });
});
