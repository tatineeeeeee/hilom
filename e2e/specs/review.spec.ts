import { test } from "@playwright/test";

test.describe("review", () => {
  test.skip("patient reviews a completed appointment", async () => {
    // Pre-seed a completed + paid appointment via API.
    // Patient logs in → /appointments → "Leave a review" → 5 stars + comment.
    // Toast confirms. Modal closes.
    // Navigate to /doctors/<profileId> → reviews section shows the new review
    // with privacy-formatted name (e.g. "Patient L.").
  });
});
