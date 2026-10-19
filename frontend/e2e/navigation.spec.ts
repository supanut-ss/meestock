import { test, expect } from "@playwright/test";

const pages = [
  { path: "/", group: "ภาพรวม", label: "หน้าแรก" },
  { path: "/dashboard", group: "ภาพรวม", label: "แดชบอร์ด" },
  { path: "/products", group: "คลังสินค้า", label: "สินค้า" },
  { path: "/categories", group: "คลังสินค้า", label: "หมวดหมู่" },
  { path: "/stock-in", group: "คลังสินค้า", label: "รับสินค้า" },
  { path: "/stock-out", group: "คลังสินค้า", label: "จ่ายสินค้า" },
  { path: "/movements", group: "คลังสินค้า", label: "ประวัติสต็อก" },
  { path: "/orders", group: "ขาย & ขนส่ง", label: "จัดส่ง" },
  { path: "/shipping", group: "ขาย & ขนส่ง", label: "ใบปะหน้า" },
  { path: "/reports", group: "ขาย & ขนส่ง", label: "รายงาน" },
];

test.describe("sidebar navigation", () => {
  test("every page loads with a breadcrumb and exactly one h1", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    for (const p of pages) {
      await page.goto(p.path);
      const crumb = page.getByRole("navigation", { name: "ตำแหน่งปัจจุบัน" });
      await expect(crumb, p.path).toContainText(p.group);
      await expect(crumb, p.path).toContainText(p.label);
      await expect(page.locator("main h1"), p.path).toHaveCount(1);
    }
    expect(errors).toEqual([]);
  });

  test("clicking sidebar links navigates and marks the current page", async ({ page }) => {
    await page.goto("/");
    const sidebar = page.locator("aside");
    await sidebar.getByRole("link", { name: "สินค้า", exact: true }).click();
    await expect(page).toHaveURL(/\/products$/);
    await expect(sidebar.getByRole("link", { name: "สินค้า", exact: true })).toHaveAttribute("aria-current", "page");

    await sidebar.getByRole("link", { name: "จ่ายสินค้า" }).click();
    await expect(page).toHaveURL(/\/stock-out$/);
  });
});
