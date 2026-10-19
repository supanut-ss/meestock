import { test, expect } from "@playwright/test";

const paths = ["/", "/dashboard", "/products", "/categories", "/stock-in", "/stock-out", "/movements", "/orders", "/shipping", "/reports", "/users"];

test.describe("mobile layout (375px)", () => {
  test("bottom tab bar replaces the sidebar", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("aside")).toBeHidden();
    const tabs = page.getByRole("navigation", { name: "เมนูหลัก" });
    await expect(tabs.getByRole("link")).toHaveCount(4);
    await expect(tabs.getByRole("button", { name: "เพิ่มเติม" })).toBeVisible();
  });

  test("more sheet opens and lists the rest of the menu", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "เพิ่มเติม" }).click();
    const sheet = page.getByRole("dialog", { name: "เมนูเพิ่มเติม" });
    await expect(sheet.getByRole("link", { name: "แดชบอร์ด" })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "ออกจากระบบ" })).toBeVisible();
  });

  test("no page scrolls horizontally", async ({ page }) => {
    for (const path of paths) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
    }
  });

  test("touch targets in the main area are at least 40px", async ({ page }) => {
    for (const path of ["/products", "/stock-out", "/stock-in"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const small = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("main a, main button, main select, main input:not([type=checkbox])")]
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width > 0 && (r.width < 40 || r.height < 40))
          .map(({ el, r }) => `${el.tagName} "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 20)}" ${Math.round(r.width)}x${Math.round(r.height)}`)
      );
      expect(small, path).toEqual([]);
    }
  });
});
