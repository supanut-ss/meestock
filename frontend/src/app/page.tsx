import Link from "next/link";
import { getCurrentUser } from "@/lib/authActions";

type Module = {
  href: string;
  title: string;
  cta: string;
  desc: string;
  icon: string;
};

const modules: Module[] = [
  {
    href: "/products",
    title: "จัดการสินค้า & สต็อก",
    cta: "เข้าสู่ระบบสินค้า",
    desc: "เพิ่ม/แก้ไข/ลบสินค้า รหัสสินค้า บาร์โค้ด กำหนดจุดแจ้งเตือนสต็อกต่ำ และดูประวัติราคาทุนแยกตาม role ได้",
    icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  },
  {
    href: "/stock-in",
    title: "รับสินค้าเข้า (Stock In)",
    cta: "บันทึกสินค้าเข้า",
    desc: "บันทึกสินค้าเข้าคลังแยกตาม Lot, วันหมดอายุ, ข้อมูล Supplier และปรับต้นทุนราคาสินค้าเฉลี่ยอัตโนมัติ",
    icon: "M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z",
  },
  {
    href: "/stock-out",
    title: "จ่ายสินค้าออก / บันทึกขาย",
    cta: "ทำรายการขายสินค้า",
    desc: "เพิ่มรายการสินค้าในบิลเดียวแบบตะกร้าสินค้า ตัดสต็อก Real-time พิมพ์ใบเสร็จ/Invoice ขนาด 80มม. ได้ทันที",
    icon: "M15 13l-3 3m0 0l-3-3m3 3V8m0-5a9 9 0 110 18 9 9 0 010-18z",
  },
  {
    href: "/movements",
    title: "ประวัติและรายการเคลื่อนไหว",
    cta: "ตรวจสอบความเคลื่อนไหว",
    desc: "ตรวจสอบความเคลื่อนไหวคลังสินค้า (Stock Movements) เข้า-ออก-คืนสินค้า พร้อมเหตุผลการปรับคลังสินค้าแบบละเอียด",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  },
  {
    href: "/shipping",
    title: "ปะหน้ากล่อง & จัดส่ง",
    cta: "แกะที่อยู่และปะหน้ากล่อง",
    desc: "แกะข้อมูลที่อยู่ลูกค้าอัจฉริยะ (Airway Bill Parser) จากข้อความยาวๆ พร้อมระบบพิมพ์ใบปะหน้าและบันทึกเลขพัสดุ",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  },
  {
    href: "/dashboard",
    title: "แดชบอร์ด & รายงานยอดขาย",
    cta: "วิเคราะห์รายงานธุรกิจ",
    desc: "ดูสถิติวิเคราะห์ ยอดขายรายวันและรายเดือน สินค้ายอดนิยมอันดับต้นๆ และวิเคราะห์อัตราการหมุนเวียนสินค้า",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
];

const highlights = [
  { label: "รายการสินค้า", value: "พร้อมใช้งาน" },
  { label: "รับเข้า / จ่ายออก", value: "Real-time" },
  { label: "แกะที่อยู่อัจฉริยะ", value: "พิมพ์ใบปะหน้า" },
  { label: "รายงานยอดขาย", value: "กำไร-ขาดทุน" },
];

const steps = [
  { n: "01", title: "รับสินค้า", desc: "บันทึก Lot และต้นทุน" },
  { n: "02", title: "ขาย / จ่ายออก", desc: "ตัดสต็อกทันที" },
  { n: "03", title: "จัดส่ง", desc: "แกะที่อยู่ พิมพ์ใบปะหน้า" },
  { n: "04", title: "สรุปผล", desc: "ยอดขายและกำไร" },
];

// Static preview bars for the hero mock chart (decorative only)
const bars = [38, 56, 44, 72, 52, 86, 64, 94];

function Arrow({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6l6 6-6 6" />
    </svg>
  );
}

export default async function Home() {
  const user = await getCurrentUser();
  const primaryHref = user ? "/stock-out" : "/login";
  return (
    <div className="space-y-6">
      {/* Hero bento */}
      <section className="grid gap-4 lg:grid-cols-12">
        <div className="dot-grid relative overflow-hidden rounded-[2rem] bg-[#173d42] p-6 text-white sm:p-8 lg:col-span-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#a8e6cb]/20 blur-3xl" />
          <div className="relative max-w-xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 ring-1 ring-white/10">
              <span className="h-2 w-2 rounded-full bg-[#a8e6cb]" />
              พร้อมใช้งานสำหรับร้านค้าออนไลน์ของคุณ
            </div>
            <h1 className="text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl">
              ระบบบริหารคลังสินค้า
              <br />
              <span className="text-[#a8e6cb]">MeeStock Pro</span>
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
              ระบบ Mini Stock ครบวงจรสำหรับร้านค้าออนไลน์ จัดการสินค้า หมวดหมู่ รับเข้า จ่ายออก จัดส่ง และรายงานกำไร-ขาดทุนครบในที่เดียว
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href={primaryHref}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#a8e6cb] px-6 text-sm font-bold text-[#173d42] transition-transform hover:scale-[1.03]"
              >
                {user ? "เริ่มบันทึกขาย" : "เข้าสู่ระบบ"}
                <Arrow />
              </Link>
              <Link
                href={user ? "/dashboard" : "#modules"}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-white/10 px-6 text-sm font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-white/15"
              >
                {user ? "ดูแดชบอร์ด" : "ดูฟีเจอร์ทั้งหมด"}
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative preview card */}
        <div className="surface-card hidden flex-col justify-between p-6 md:flex lg:col-span-4" aria-hidden="true">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">ยอดขายสัปดาห์นี้</p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">฿ 48,250</p>
            </div>
            <span className="rounded-full bg-[#a8e6cb] px-2.5 py-1 text-[11px] font-bold text-[#173d42]">+12.4%</span>
          </div>
          <div className="mt-6 flex h-32 items-end gap-2">
            {bars.map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className={`flex-1 rounded-t-lg ${i === bars.length - 1 ? "bg-[#a8e6cb]" : "bg-slate-200"}`}
              />
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-400">ตัวอย่างการแสดงผล</p>
        </div>
      </section>

      {/* Highlights */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {highlights.map((item) => (
          <div key={item.label} className="surface-card px-5 py-4">
            <p className="text-xs font-medium text-slate-500">{item.label}</p>
            <p className="mt-1 text-base font-bold text-slate-900 sm:text-lg">{item.value}</p>
          </div>
        ))}
      </section>

      {/* Modules */}
      <section id="modules" className="scroll-mt-24 space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">ระบบงานหลัก 6 โมดูล</h2>
            <p className="text-sm text-slate-500">เลือกโมดูลที่ต้องการเพื่อเริ่มทำงาน</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m, i) => (
            <Link
              key={m.href}
              href={m.href}
              className="surface-card group relative flex flex-col justify-between p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#a8e6cb] hover:shadow-lg"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-900 transition-colors duration-300 group-hover:bg-[#a8e6cb]">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d={m.icon} />
                    </svg>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-slate-300">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-slate-900">{m.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{m.desc}</p>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                {m.cta}
                <Arrow className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section className="surface-card p-6 sm:p-8">
        <h2 className="mb-5 text-lg font-bold tracking-tight text-slate-900">ขั้นตอนการทำงาน</h2>
        <ol className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="rounded-2xl bg-slate-50 p-4">
              <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[#173d42] px-2 text-xs font-bold text-[#a8e6cb]">{s.n}</span>
              <p className="mt-3 font-bold text-slate-900">{s.title}</p>
              <p className="text-sm text-slate-500">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
