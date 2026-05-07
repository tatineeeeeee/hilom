import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PaymentStatusBadge } from "@/features/payments/components/PaymentStatusBadge";

describe("PaymentStatusBadge", () => {
  it("renders the human label for each status", () => {
    const { rerender } = render(<PaymentStatusBadge status="pending" />);
    expect(screen.getByText("Awaiting payment")).toBeInTheDocument();

    rerender(<PaymentStatusBadge status="escrowed" />);
    expect(screen.getByText("Paid")).toBeInTheDocument();

    rerender(<PaymentStatusBadge status="released" />);
    expect(screen.getByText("Released")).toBeInTheDocument();

    rerender(<PaymentStatusBadge status="refunded" />);
    expect(screen.getByText("Refunded")).toBeInTheDocument();
  });
});
