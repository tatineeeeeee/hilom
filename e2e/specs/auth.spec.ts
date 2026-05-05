import { test, expect } from "@playwright/test";

const PASSWORD = "Test1234!";
const uniq = () => Date.now().toString(36);

test.describe("auth", () => {
  test("register, dashboard renders, logout, login", async ({ page }) => {
    const email = `e2e-${uniq()}@example.com`;

    await page.goto("/register");
    await page.getByLabel(/full name/i).fill("E2E User");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill(PASSWORD);
    // Pick the "patient" role if a chooser exists; otherwise this is a no-op.
    const patientChoice = page.getByRole("radio", { name: /patient/i });
    if (await patientChoice.count()) await patientChoice.first().check();
    await page.getByRole("button", { name: /sign up|create account|register/i }).click();

    await expect(page).toHaveURL(/\/dashboard|\/profile\/setup/, { timeout: 10_000 });

    // Whatever lands first, the user's first name greets them on the dashboard.
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/welcome/i);

    // Logout via Navbar.
    await page.getByRole("button", { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/$|\/login/);

    // Log back in.
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill(PASSWORD);
    await page.getByRole("button", { name: /log in|sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test("wrong password shows a generic error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(`nobody-${uniq()}@example.com`);
    await page.getByLabel(/^password$/i).fill("WrongPass1!");
    await page.getByRole("button", { name: /log in|sign in/i }).click();

    // Generic invalid-credentials message — never leaks whether the user exists.
    await expect(page.getByText(/invalid|incorrect|wrong/i)).toBeVisible({
      timeout: 5_000,
    });
  });
});
