import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

describe("useDebouncedValue", () => {
  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebouncedValue("hello", 300));
    expect(result.current).toBe("hello");
  });

  it("debounces value changes", async () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "a" } }
    );

    expect(result.current).toBe("a");

    // Change value
    rerender({ value: "ab" });
    expect(result.current).toBe("a"); // Still old value

    // Advance time less than delay
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe("a"); // Still old value

    // Advance past delay
    act(() => { vi.advanceTimersByTime(150); });
    expect(result.current).toBe("ab"); // Now updated

    vi.useRealTimers();
  });

  it("resets timer on rapid changes", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "ab" });
    act(() => { vi.advanceTimersByTime(200); });

    rerender({ value: "abc" }); // Reset timer
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe("a"); // Timer reset, not yet 300ms from "abc"

    act(() => { vi.advanceTimersByTime(150); });
    expect(result.current).toBe("abc"); // Now 350ms from "abc" change

    vi.useRealTimers();
  });
});
