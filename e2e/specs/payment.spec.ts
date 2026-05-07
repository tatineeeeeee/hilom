import { test } from "@playwright/test";

test.describe("payment", () => {
  test.skip("patient pays in stub mode → escrowed", async () => {
    // Depends on booking spec scaffolding. Once a payment row exists in
    // pending status, navigate to /payments/<id>, click "Pay now", expect
    // toast + redirect to /appointments, expect "Paid" badge on the card.
  });

  test.skip("doctor completes paid appointment → released", async () => {
    // Two browser contexts (patient + doctor). Doctor side: PATCH the
    // appointment to completed. Verify via API GET /appointments/:id/payment
    // that status === "released".
  });

  test.skip("cancel after pay → refunded", async () => {
    // Cancel the appointment, expect payment status === "refunded".
  });
});
