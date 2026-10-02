# MeeStock User Guide

**Languages:** [English](#meestock-user-guide) | [ภาษาไทย](#คู่มือการใช้งาน-meestock-ฉบับภาษาไทย)

A step-by-step guide for shop owners and staff. The app interface is in Thai; menu names are shown here in English with the Thai label in brackets.

## 1. Getting started

### Sign in
1. Open the app address (for example `http://localhost:3000`).
2. Enter your **username** and **password**, then click **Sign in (เข้าสู่ระบบ)**.
3. You stay signed in for 7 days. To leave, click your name (top right) and choose **Sign out**.

If you see "wrong username or password", check your typing. If it says the account is disabled, ask an Admin.

### Menu
| Menu | Contains |
|------|----------|
| Home / Dashboard (แดชบอร์ด) | Overview of sales and stock |
| Inventory (คลังสินค้า) | Products, Categories, Stock in, Stock out, Stock history |
| Sales & Shipping (ขาย & ขนส่ง) | Orders, Shipping labels, Reports |
| Bell icon | Low-stock and expiry alerts |

On a phone or tablet the menu is behind the **hamburger button** (three lines, top right).

### Roles
- **Admin** (shown next to your name): can do everything, including managing users.
- **Staff**: day-to-day work (stock, sales, shipping). Cannot manage users.

## 2. Dashboard
Shows today's and this month's sales, stock value, low-stock items, daily and monthly charts, and best-selling products. Use it as a quick daily check.

## 3. Products (สินค้า)

### Add a product
1. Go to **Inventory > Products** and click the add button.
2. Fill in name, **SKU** (unique code), barcode, category, selling price, cost price, unit, and low-stock threshold.
3. Save. The SKU must not already exist.

### Find and edit
- Use the search box above the table, or the filters (category, active/inactive, stock level).
- Click the column titles to sort. Use the **Columns** and **Density** buttons to change what you see.
- Use the row's action buttons to edit or delete a product.

### Adjust stock quickly
In the **Stock / Adjust** column use **+** and **-** to correct a quantity (for example after a stock count). The change is recorded in the history.

### Variants
For products with options (size, color), add **variants**. Each variant has its own SKU, price, cost and stock.

### Bundles
A bundle is a set made of other products. Set how many of each component one set needs; the system shows the **maximum sets you can make** from current stock.

### Import / export Excel
- **Export Excel**: downloads the current product list.
- **Import Excel**: upload a spreadsheet to add many products at once. Check the preview before confirming.

### Change history
Open a product's history to see who changed what and when (old value to new value).

## 4. Categories (หมวดหมู่)
Create, rename or delete categories (including sub-categories) and choose a color tag so products are easy to scan.

## 5. Receive stock (รับสินค้า)
1. Go to **Inventory > Stock in**.
2. Select the product (or scan its barcode) and, if needed, the variant.
3. Enter **quantity** and **unit cost**. Optionally enter **lot number**, **expiry date**, **supplier** and a **note**.
4. To add a new supplier, use the supplier add button and fill in the form.
5. Save. Stock increases and a movement is logged.

## 6. Sell / issue stock (จ่ายสินค้า)
1. Go to **Inventory > Stock out**.
2. Add items to the cart:
   - pick a product from the list, or
   - scan a barcode with a scanner, or
   - click **Scan with camera** to use your phone or webcam.
3. Adjust quantities and prices in the cart. Add a **discount** and a note (customer info) if needed.
4. Click **Save sale (บันทึกการขาย)**. Stock is deducted and an order is created.
5. Print the **invoice** when prompted.

If stock is not enough for an item, the system warns you and does not save.

## 7. Stock history (ประวัติสต็อก)
A read-only log of every movement: receive, sale, adjustment, return. Use search and filters to answer "why did this item change?". Records cannot be edited or deleted.

## 8. Orders and shipping (จัดส่ง)
1. Go to **Sales & Shipping > Orders**.
2. Filter by status: **All**, **Prepare (เตรียมจัดส่ง)**, **Shipped (จัดส่งแล้ว)**, **Cancelled (ยกเลิก)**.
3. Open an order to enter the **tracking number**. Saving a tracking number marks the order **Shipped** automatically.
4. Select orders in the table and print their **shipping labels**.
5. For a returned sale, use the **Return** action; stock is added back and the bill shows "Returned".

### Shipping labels (ใบปะหน้า)
Go to **Sales & Shipping > Shipping labels** to create a parcel label with sender and recipient details and print it for the box.

## 9. Reports (รายงาน)
Choose a tab, view the table, and export to Excel with **Export Excel**.

| Tab | Use it to |
|-----|-----------|
| Inventory snapshot | See stock on hand and total stock value |
| Profit & loss | See revenue, cost and profit |
| Best sellers (Top 10) | Decide what to restock |
| Slow-moving items | Find stock that is not selling |
| Expiring lots | Act on products close to expiry |

## 10. Alerts
The **bell icon** shows a red count when stock is at or below the low-stock threshold or a lot is near expiry. Click the bell to read alerts, mark one as read, or mark all as read. The count refreshes every 15 seconds.

## 11. User management (Admin only)
1. Go to **Users**.
2. Click add, enter **username**, **display name** and **password**, then save.
3. To stop someone from signing in, toggle their account to inactive. Their history is kept.

## 12. Tips
- Always use a unique SKU; use barcodes to speed up receiving and selling.
- Set a realistic low-stock threshold so alerts are useful.
- Do a periodic stock count and use **+/-** adjustments to match reality.
- On a phone, scroll tables sideways inside their frame.

## 13. Troubleshooting

| Problem | What to do |
|---------|------------|
| Cannot sign in | Check username/password; ask an Admin to confirm the account is active |
| Page keeps returning to login | Session expired; sign in again |
| Camera scan does not open | Allow camera permission in the browser; use HTTPS or localhost |
| Sale will not save | Check stock for each cart item |
| Numbers look wrong | Review **Stock history** for the item to see each change |

---

# คู่มือการใช้งาน MeeStock (ฉบับภาษาไทย)

คู่มือทีละขั้นตอนสำหรับเจ้าของร้านและพนักงาน ชื่อเมนูตรงกับที่แสดงบนหน้าจอ

## 1. เริ่มต้นใช้งาน

### เข้าสู่ระบบ
1. เปิดที่อยู่ของระบบ (เช่น `http://localhost:3000`)
2. กรอก **ชื่อผู้ใช้** และ **รหัสผ่าน** แล้วกด **เข้าสู่ระบบ**
3. ระบบจำการเข้าสู่ระบบไว้ 7 วัน หากต้องการออก กดที่ชื่อของคุณ (มุมขวาบน) แล้วเลือกออกจากระบบ

ถ้าขึ้นว่า "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" ให้ตรวจการพิมพ์ ถ้าขึ้นว่าบัญชีถูกปิดใช้งาน ให้ติดต่อ Admin

### เมนูหลัก
| เมนู | ประกอบด้วย |
|------|-----------|
| หน้าแรก / แดชบอร์ด | ภาพรวมยอดขายและสต็อก |
| คลังสินค้า | สินค้า, หมวดหมู่, รับสินค้า, จ่ายสินค้า, ประวัติสต็อก |
| ขาย & ขนส่ง | จัดส่ง, ใบปะหน้า, รายงาน |
| ไอคอนกระดิ่ง | แจ้งเตือนสินค้าใกล้หมดและใกล้หมดอายุ |

บนมือถือหรือแท็บเล็ต เมนูจะอยู่หลัง **ปุ่มสามขีด** (มุมขวาบน)

### สิทธิ์การใช้งาน
- **Admin** (แสดงข้างชื่อ): ทำได้ทุกอย่าง รวมถึงจัดการผู้ใช้
- **Staff**: งานประจำวัน (สต็อก, ขาย, จัดส่ง) แต่จัดการผู้ใช้ไม่ได้

## 2. แดชบอร์ด
แสดงยอดขายวันนี้และเดือนนี้ มูลค่าสต็อก สินค้าใกล้หมด กราฟรายวัน/รายเดือน และสินค้าขายดี ใช้ดูภาพรวมทุกเช้า

## 3. สินค้า

### เพิ่มสินค้า
1. ไปที่ **คลังสินค้า > สินค้า** แล้วกดปุ่มเพิ่มสินค้า
2. กรอกชื่อ **SKU** (รหัสที่ไม่ซ้ำ) บาร์โค้ด หมวดหมู่ ราคาขาย ราคาทุน หน่วย และจำนวนขั้นต่ำที่จะแจ้งเตือน
3. กดบันทึก (SKU ต้องไม่ซ้ำกับของเดิม)

### ค้นหาและแก้ไข
- ใช้ช่องค้นหาเหนือตาราง หรือตัวกรอง (หมวดหมู่, ใช้งาน/ปิดใช้งาน, ระดับสต็อก)
- กดหัวคอลัมน์เพื่อเรียงลำดับ ใช้ปุ่ม **คอลัมน์** และ **ความหนาแน่น** เพื่อปรับการแสดงผล
- ใช้ปุ่มในคอลัมน์ "จัดการ" เพื่อแก้ไขหรือลบสินค้า

### ปรับสต็อกด่วน
ในคอลัมน์ "คงเหลือ / ปรับสต็อก" กด **+** หรือ **-** เพื่อแก้จำนวน (เช่น หลังนับสต็อก) ระบบบันทึกประวัติให้

### ตัวเลือกสินค้า (Variant)
สินค้าที่มีหลายแบบ (ขนาด, สี) ให้เพิ่ม **ตัวเลือก** แต่ละตัวเลือกมี SKU ราคาขาย ราคาทุน และสต็อกของตัวเอง

### สินค้าเซ็ต (Bundle)
เซ็ตคือชุดที่ประกอบจากสินค้าอื่น กำหนดว่าหนึ่งเซ็ตใช้สินค้าแต่ละตัวกี่ชิ้น ระบบจะแสดง **จำนวนเซ็ตสูงสุดที่จัดได้** จากสต็อกปัจจุบัน

### นำเข้า / ส่งออก Excel
- **ส่งออก Excel**: ดาวน์โหลดรายการสินค้าปัจจุบัน
- **นำเข้า Excel**: อัปโหลดไฟล์เพื่อเพิ่มสินค้าหลายรายการพร้อมกัน ตรวจตัวอย่างก่อนกดยืนยัน

### ประวัติการแก้ไข
เปิดประวัติของสินค้าเพื่อดูว่าใครแก้อะไร เมื่อไหร่ (ค่าเดิม -> ค่าใหม่)

## 4. หมวดหมู่
สร้าง เปลี่ยนชื่อ หรือลบหมวดหมู่ (รวมหมวดย่อย) และเลือกสีป้ายเพื่อให้แยกสินค้าได้ง่าย

## 5. รับสินค้า
1. ไปที่ **คลังสินค้า > รับสินค้า**
2. เลือกสินค้า (หรือสแกนบาร์โค้ด) และเลือกตัวเลือกย่อยถ้ามี
3. กรอก **จำนวน** และ **ราคาทุนต่อหน่วย** ถ้าต้องการให้กรอก **เลข LOT**, **วันหมดอายุ**, **ซัพพลายเออร์** และ **หมายเหตุ** เพิ่มได้
4. ถ้าเป็นซัพพลายเออร์ใหม่ ใช้ปุ่มเพิ่มซัพพลายเออร์แล้วกรอกข้อมูล
5. กดบันทึก สต็อกจะเพิ่มและมีประวัติบันทึกไว้

## 6. จ่ายสินค้า / ขาย
1. ไปที่ **คลังสินค้า > จ่ายสินค้า**
2. เพิ่มสินค้าลงรายการ:
   - เลือกจากรายการสินค้า หรือ
   - ใช้เครื่องสแกนบาร์โค้ด หรือ
   - กด **สแกนกล้อง** เพื่อใช้กล้องมือถือหรือเว็บแคม
3. ปรับจำนวนและราคาในรายการ ใส่ **ส่วนลด** และหมายเหตุ/ข้อมูลลูกค้าถ้าต้องการ
4. กด **บันทึกการขาย** ระบบตัดสต็อกและสร้างออเดอร์
5. พิมพ์ **ใบเสร็จ/Invoice** เมื่อระบบถาม

ถ้าสต็อกไม่พอ ระบบจะเตือนและไม่บันทึก

## 7. ประวัติสต็อก
บันทึกการเคลื่อนไหวทุกครั้ง (รับเข้า, ขาย, ปรับยอด, คืนสินค้า) ดูอย่างเดียว แก้ไขหรือลบไม่ได้ ใช้ค้นหาและกรองเพื่อตอบคำถามว่า "ทำไมสินค้าตัวนี้เปลี่ยน"

## 8. จัดส่ง
1. ไปที่ **ขาย & ขนส่ง > จัดส่ง**
2. กรองตามสถานะ: **ทั้งหมด**, **เตรียมจัดส่ง**, **จัดส่งแล้ว**, **ยกเลิก**
3. เปิดออเดอร์เพื่อกรอก **เลขพัสดุ** เมื่อบันทึกเลขพัสดุ สถานะจะเปลี่ยนเป็น **จัดส่งแล้ว** อัตโนมัติ
4. เลือกออเดอร์ในตารางแล้วพิมพ์ **ใบปะหน้า**
5. กรณีลูกค้าคืนสินค้า ใช้การทำรายการ **คืนสินค้า** สต็อกจะถูกเพิ่มกลับ และบิลแสดงสถานะ "คืนสินค้าแล้ว"

### ใบปะหน้า
ไปที่ **ขาย & ขนส่ง > ใบปะหน้า** เพื่อสร้างใบปะหน้าพัสดุ กรอกข้อมูลผู้ส่งและผู้รับ แล้วพิมพ์ติดกล่อง

## 9. รายงาน
เลือกแท็บ ดูตาราง และกด **ส่งออก Excel** เพื่อดาวน์โหลด

| แท็บ | ใช้ทำอะไร |
|------|----------|
| สต็อกคงเหลือ | ดูสต็อกที่มีและมูลค่ารวม |
| กำไร-ขาดทุน | ดูรายได้ ต้นทุน และกำไร |
| สินค้าขายดี (Top 10) | ตัดสินใจว่าควรสั่งสินค้าอะไรเพิ่ม |
| สินค้าขายช้า | หาสินค้าที่ค้างสต็อก |
| ใกล้หมดอายุ | จัดการสินค้าที่ใกล้วันหมดอายุ |

## 10. การแจ้งเตือน
ไอคอน **กระดิ่ง** แสดงตัวเลขสีแดงเมื่อสต็อกเหลือเท่ากับหรือต่ำกว่าขั้นต่ำ หรือมี LOT ใกล้หมดอายุ กดกระดิ่งเพื่ออ่าน ทำเครื่องหมายว่าอ่านแล้วทีละรายการ หรืออ่านทั้งหมด ตัวเลขรีเฟรชทุก 15 วินาที

## 11. จัดการผู้ใช้ (เฉพาะ Admin)
1. ไปที่ **ผู้ใช้งาน**
2. กดเพิ่มผู้ใช้ กรอก **ชื่อผู้ใช้**, **ชื่อที่แสดง** และ **รหัสผ่าน** แล้วบันทึก
3. ถ้าต้องการไม่ให้ใครเข้าระบบ ให้สลับบัญชีเป็นปิดใช้งาน ประวัติเดิมยังอยู่ครบ

## 12. เคล็ดลับ
- ตั้ง SKU ไม่ซ้ำกัน และใช้บาร์โค้ดเพื่อให้รับ/ขายสินค้าเร็วขึ้น
- ตั้งจำนวนขั้นต่ำให้สมเหตุสมผล การแจ้งเตือนจะได้มีประโยชน์
- นับสต็อกเป็นระยะ แล้วใช้ปุ่ม **+/-** ปรับให้ตรงกับของจริง
- บนมือถือ ให้เลื่อนตารางไปทางซ้าย-ขวาภายในกรอบตาราง

## 13. แก้ปัญหาเบื้องต้น

| ปัญหา | วิธีแก้ |
|-------|--------|
| เข้าสู่ระบบไม่ได้ | ตรวจชื่อผู้ใช้/รหัสผ่าน และให้ Admin ตรวจว่าบัญชียังใช้งานอยู่ |
| ถูกเด้งกลับหน้า login | เซสชันหมดอายุ ให้เข้าสู่ระบบใหม่ |
| สแกนกล้องไม่เปิด | อนุญาตการใช้กล้องในเบราว์เซอร์ และใช้ผ่าน HTTPS หรือ localhost |
| บันทึกการขายไม่ได้ | ตรวจสต็อกของแต่ละรายการในรายการขาย |
| ตัวเลขดูไม่ถูกต้อง | เปิด **ประวัติสต็อก** ของสินค้านั้นเพื่อดูทุกการเปลี่ยนแปลง |
