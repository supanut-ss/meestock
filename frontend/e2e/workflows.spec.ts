import { test, expect } from "@playwright/test";

// These specs only read data or fill forms they never submit, so they are safe on a real database.

test.describe("dashboard", () => {
  test("range selector reloads the charts without fake sample data", async ({ page }) => {
    await page.goto("/dashboard");
    const range = page.getByRole("group", { name: "ช่วงเวลา" });
    await expect(range.getByRole("button", { name: "30 วัน" })).toHaveAttribute("aria-pressed", "true");

    await range.getByRole("button", { name: "7 วัน" }).click();
    await expect(range.getByRole("button", { name: "7 วัน" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("7 วันล่าสุด")).toBeVisible();

    // The old placeholder products must never come back
    await expect(page.getByText("เสื้อยืดสีขาว Premium")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "สถานะออเดอร์" })).toBeVisible();
  });
});

test.describe("products", () => {
  test("search narrows the table", async ({ page }) => {
    await page.goto("/products");
    const rows = page.locator(".MuiDataGrid-row");
    await expect(rows.first()).toBeVisible();
    await expect.poll(() => rows.count()).toBeGreaterThan(1);
    const before = await rows.count();

    await page.getByPlaceholder("ค้นหาชื่อสินค้า, SKU, บาร์โค้ด...").first().fill("zzz-no-such-product");
    await expect(rows).toHaveCount(0);

    await page.getByPlaceholder("ค้นหาชื่อสินค้า, SKU, บาร์โค้ด...").first().fill("");
    await expect(rows).toHaveCount(before);
  });

  test("selecting rows shows the bulk bar and cancelling changes nothing", async ({ page }) => {
    await page.goto("/products");
    const rows = page.locator(".MuiDataGrid-row");
    await expect(rows.first()).toBeVisible();

    await rows.nth(0).getByRole("checkbox").check();
    await rows.nth(1).getByRole("checkbox").check();
    const bar = page.getByRole("region", { name: "จัดการสินค้าที่เลือก" });
    await expect(bar).toContainText("เลือก 2 รายการ");

    await bar.getByRole("button", { name: "ปิดใช้งาน", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("ปิดใช้งานสินค้า 2 รายการ");
    await dialog.getByRole("button", { name: "ยกเลิก", exact: true }).click();
    await expect(dialog).toBeHidden();

    await bar.getByRole("button", { name: "ล้างการเลือก" }).click();
    await expect(bar).toBeHidden();
  });

  test("add form opens and closes without saving", async ({ page }) => {
    await page.goto("/products");
    await page.getByRole("button", { name: "เพิ่มสินค้าใหม่" }).first().click();
    await expect(page.getByRole("heading", { name: "เพิ่มสินค้าใหม่" })).toBeVisible();
    await page.locator("main form").getByRole("button", { name: "ยกเลิก", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "เพิ่มสินค้าใหม่" })).toBeHidden();
  });
});

test.describe("point of sale", () => {
  test("F2 focuses search and Enter adds the product to the cart", async ({ page }) => {
    await page.goto("/stock-out");
    const picker = page.getByRole("combobox", { name: "ค้นหาสินค้า" });
    await expect(picker).toBeVisible();

    await page.keyboard.press("F2");
    await expect(picker).toBeFocused();

    await picker.fill("a");
    const first = page.getByRole("option").first();
    await expect(first).toBeVisible();
    await picker.press("Enter");

    await expect(page.getByText("1 รายการ").first()).toBeVisible();
    // Nothing is submitted: the sale button exists but we never press it
    await expect(page.getByRole("button", { name: /บันทึกการขาย/ })).toBeEnabled();
  });

  test("unknown text shows the empty hint", async ({ page }) => {
    await page.goto("/stock-out");
    const picker = page.getByRole("combobox", { name: "ค้นหาสินค้า" });
    await picker.fill("zzz-no-such-product");
    await expect(page.getByText("ไม่พบสินค้า")).toBeVisible();
  });
});

test.describe("stock in", () => {
  test("choosing a product fills the summary panel", async ({ page }) => {
    await page.goto("/stock-in");
    const picker = page.getByRole("combobox", { name: "ค้นหาสินค้า" });
    await picker.fill("a");
    await page.getByRole("option").first().click();
    await expect(page.getByText("สต็อกปัจจุบัน")).toBeVisible();
    await expect(page.getByText(/สต็อกใหม่จะเป็น/)).toBeVisible();
  });

  test("submitting without a product is blocked by validation", async ({ page }) => {
    await page.goto("/stock-in");
    await page.getByRole("button", { name: "บันทึกรับสินค้าเข้าคลัง" }).click();
    await expect(page.getByRole("combobox", { name: "ค้นหาสินค้า" })).toBeFocused();
    await expect(page).toHaveURL(/\/stock-in$/);
  });
});

test.describe("shipping label", () => {
  test("address parser separates name, phone and address", async ({ page }) => {
    await page.goto("/shipping");
    await page
      .locator("textarea")
      .first()
      .fill("ส่งที่ นายสมชาย ใจดี 081-234-5678 บ้านเลขที่ 1/99 หมู่บ้านสุขใจ ซอย 3 ถนนพหลโยธิน แขวงจอมพล เขตจตุจักร กรุงเทพ 10900");
    await page.getByRole("button", { name: /ดึงข้อมูลอัจฉริยะ/ }).click();

    await expect(page.getByText("ดึงข้อมูลสำเร็จ")).toBeVisible();
    await expect(page.locator('input[value="นายสมชาย ใจดี"]')).toBeVisible();
    await expect(page.locator('input[value="0812345678"]')).toBeVisible();
  });
});

test.describe("users", () => {
  test("add-user form validates required fields and can be cancelled", async ({ page }) => {
    await page.goto("/users");
    await page.getByRole("button", { name: "เพิ่มผู้ใช้งานใหม่" }).click();
    const form = page.locator("main form");
    await form.getByRole("button", { name: /สร้าง|บันทึก/ }).first().click();
    await expect(form.locator("input:invalid").first()).toBeVisible();
    await form.getByRole("button", { name: "ยกเลิก", exact: true }).click();
    await expect(form).toBeHidden();
  });
});
