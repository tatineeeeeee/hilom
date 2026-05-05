import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("filters out falsy values", () => {
    expect(cn("a", null, undefined, false, "c")).toBe("a c");
  });

  it("dedupes conflicting tailwind utilities (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
