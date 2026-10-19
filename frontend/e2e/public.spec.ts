import { test, expect } from "@playwright/test";

test.describe("public access", () => {
  test("landing page is visible without logging in", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("MeeStock Pro");
    await expect(page.getByRole("link", { name: "เข้าสู่ระบบ" }).first()).toHaveAttribute("href", "/login");
  });

  for (const path of ["/dashboard", "/products", "/stock-in", "/stock-out", "/orders", "/reports", "/users"]) {
    test(`${path} redirects to login with a return path`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL((url) => url.pathname === "/login" && url.searchParams.get("redirect") === path);
    });
  }

  test("login rejects wrong credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("username").fill("nobody");
    await page.getByPlaceholder("••••••••").fill("definitely-wrong");
    await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
    await expect(page.getByText("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("a forged unsigned session cookie is rejected", async ({ page, context }) => {
    const forged = Buffer.from(
      JSON.stringify({ id: "1", username: "owner", displayName: "x", role: "owner", merchantId: "m", exp: Date.now() + 1e7 })
    ).toString("base64");
    const host = new URL(process.env.E2E_BASE_URL ?? "http://localhost:3000").hostname;
    await context.addCookies([{ name: "meestock_session", value: forged, domain: host, path: "/" }]);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
