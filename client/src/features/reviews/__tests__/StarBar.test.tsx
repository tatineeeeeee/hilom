import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StarBar } from "@/features/reviews/components/StarBar";

describe("StarBar", () => {
  it("renders 5 stars regardless of value", () => {
    render(<StarBar value={3} />);
    expect(screen.getAllByText("★")).toHaveLength(5);
  });

  it("clamps the rating to 0-5 in the aria-label", () => {
    render(<StarBar value={9} />);
    expect(screen.getByLabelText("5 out of 5")).toBeInTheDocument();
  });

  it("rounds to the nearest integer", () => {
    render(<StarBar value={3.7} />);
    expect(screen.getByLabelText("4 out of 5")).toBeInTheDocument();
  });
});
