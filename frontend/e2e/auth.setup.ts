import { test as setup, expect } from "@playwright/test";

// Credentials come from the environment so they are never committed
const username = process.env.E2E_USERNAME;
const password = process.env.E2E_PASSWORD;

setup("log in and save the session", async ({ page }) => {
  setup.skip(!username || !password, "Set E2E_USERNAME and E2E_PASSWORD to run the authenticated specs");

  await page.goto("/login");
  await page.getByPlaceholder("username").fill(username!);
  await page.getByPlaceholder("••••••••").fill(password!);
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("navigation", { name: "เมนูหลัก" }).first()).toBeVisible();

  await page.context().storageState({ path: "e2e/.auth/user.json" });
});
