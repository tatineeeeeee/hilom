import { test } from "@playwright/test";

test.describe("booking", () => {
  // Stub: full booking flow needs a verified doctor with seeded schedule.
  // Wire this up once `seedVerifiedDoctor` (admin-bypass DB seed) lands.
  test.skip("patient books a slot and lands on the payment page", async () => {
    // 1. Seed a verified doctor with a Mon-Sun schedule via DB (admin or
    //    direct insert — admin path requires bootstrapping an admin first).
    // 2. Register a patient via /api/auth/register.
    // 3. Navigate to /doctors, click the doctor's card.
    // 4. Pick the first available slot, click "Book".
    // 5. Fill the reason field, click "Book appointment".
    // 6. Expect URL to match /payments/<uuid>.
    // 7. Expect the page to show "Pay now" button + the consultation fee.
  });
});
