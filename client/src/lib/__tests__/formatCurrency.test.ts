import { describe, expect, it } from "vitest";
import { formatPHP } from "@/lib/utils/formatCurrency";

describe("formatPHP", () => {
  it("formats a whole peso amount with the PHP symbol", () => {
    expect(formatPHP(1500)).toMatch(/₱/);
    expect(formatPHP(1500)).toContain("1,500");
  });

  it("accepts a string amount from the API", () => {
    expect(formatPHP("1234.5")).toContain("1,234.5");
  });

  it("formats zero", () => {
    expect(formatPHP("0")).toContain("0");
  });
});
