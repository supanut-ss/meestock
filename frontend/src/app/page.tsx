import Link from "next/link";
import { getCurrentUser } from "@/lib/authActions";
import AddressDemo from "@/components/landing/AddressDemo";
import {
  DashboardMock,
  LabelMock,
  PhoneMock,
  PosMock,
  PosPhoneScreen,
  RoleMock,
  ScanPhoneScreen,
  StockMock,
} from "@/components/landing/Mockups";

const modules = [
  { href: "/products", title: "สินค้า & สต็อก", desc: "บาร์โค้ด ตัวเลือกย่อย ชุดเซ็ต Excel" },
  { href: "/stock-in", title: "รับสินค้าเข้า", desc: "Lot วันหมดอายุ Supplier" },
  { href: "/stock-out", title: "จ่ายสินค้า / ขาย", desc: "ตะกร้า ส่วนลด ใบเสร็จ 80 มม." },
  { href: "/movements", title: "ประวัติสต็อก", desc: "เข้า ออก คืน พร้อมเหตุผล" },
  { href: "/shipping", title: "ใบปะหน้า & จัดส่ง", desc: "แกะที่อยู่ พิมพ์ฉลาก เลขพัสดุ" },
  { href: "/dashboard", title: "แดชบอร์ด & รายงาน", desc: "ยอดขาย กำไร ขายดี ขายช้า" },
];

const steps = [
  { title: "รับสินค้าเข้า", desc: "บันทึก Lot และต้นทุน" },
  { title: "ขายและตัดสต็อก", desc: "สแกน ค้นหา กด Enter" },
  { title: "พิมพ์ใบปะหน้า", desc: "วางข้อความจากแชต" },
  { title: "ดูผลประกอบการ", desc: "ยอดขาย กำไร สต็อกต่ำ" },
];

function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const Arrow = ({ className = "h-4 w-4" }: { className?: string }) => <Icon d="M5 12h14m-6-6l6 6-6 6" className={className} />;

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-2.5 text-[15px] text-slate-700">
      {items.map((t) => (
        <li key={t} className="flex gap-2.5">
          <Icon d="M5 13l4 4L19 7" className="mt-1 h-4 w-4 shrink-0 text-indigo-600" />
          {t}
        </li>
      ))}
    </ul>
  );
}

type ShowcaseProps = {
  title: string;
  lead: string;
  bullets: string[];
  visual: React.ReactNode;
  reverse?: boolean;
  dark?: boolean;
};

// Text on one side, a product mockup on a coloured stage on the other
function Showcase({ title, lead, bullets, visual, reverse, dark }: ShowcaseProps) {
  return (
    <section className="grid items-center gap-6 lg:grid-cols-2 lg:gap-12">
      <div className={reverse ? "lg:order-2" : ""}>
        <h2 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
        <p className="mt-3 text-base leading-relaxed text-slate-600">{lead}</p>
        <Bullets items={bullets} />
      </div>
      <div
        className={`${dark ? "dot-grid bg-[#173d42]" : "bg-[#d5f2e6]"} flex min-h-[320px] items-center justify-center overflow-hidden rounded-[2rem] p-5 sm:p-10 ${reverse ? "lg:order-1" : ""}`}
      >
        {visual}
      </div>
    </section>
  );
}

export default async function Home() {
  const user = await getCurrentUser();
  const startHref = user ? "/stock-out" : "/login";

  return (
    <div className="space-y-16 pb-4 sm:space-y-20">
      {/* Hero */}
      <section className="dot-grid relative overflow-hidden rounded-[2rem] bg-[#173d42] px-5 pb-10 pt-10 text-white sm:px-10 sm:pt-14 lg:pb-14">
        <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-[#a8e6cb]/10 blur-3xl" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-5">
            <h1 className="text-balance text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl xl:text-6xl">
              ขายของออนไลน์
              <br />
              ให้ <span className="text-[#a8e6cb]">สต็อกตรง</span> ส่งของไว
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-white/75 sm:text-lg">
              สแกนหรือพิมพ์ชื่อสินค้าแล้วกด Enter ตัดสต็อกทันที วางข้อความจากแชตลูกค้าแล้วได้ใบปะหน้า เห็นยอดขายและกำไรครบในระบบเดียว
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href={startHref}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#a8e6cb] px-7 text-sm font-bold text-[#173d42] transition-transform hover:scale-[1.03]"
              >
                {user ? "เริ่มบันทึกขาย" : "เข้าสู่ระบบ"}
                <Arrow />
              </Link>
              <Link
                href="#try"
                className="inline-flex h-12 items-center rounded-full bg-white/10 px-7 text-sm font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/15"
              >
                ลองแกะที่อยู่เลย
              </Link>
            </div>
          </div>

          {/* Product stage: dashboard window, phone and a printed label */}
          <div className="relative mx-auto h-[300px] w-full max-w-[600px] sm:h-[430px]">
            <DashboardMock className="absolute left-0 top-0 w-[92%] sm:w-[88%]" />
            <div className="landing-float absolute -bottom-2 right-0 hidden sm:block" style={{ ["--landing-tilt" as string]: "4deg" }}>
              <PhoneMock>
                <PosPhoneScreen />
              </PhoneMock>
            </div>
            <div className="landing-float absolute bottom-2 left-2 hidden -rotate-3 sm:block" style={{ ["--landing-tilt" as string]: "-4deg", animationDelay: "1.2s" }}>
              <LabelMock />
            </div>
          </div>
        </div>
      </section>

      {/* Try the address parser */}
      <section id="try" className="scroll-mt-24 rounded-[2rem] bg-[#d5f2e6] p-5 sm:p-10">
        <div className="mb-6 max-w-2xl">
          <h2 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
            วางข้อความจากแชต ได้ใบปะหน้าเลย
          </h2>
          <p className="mt-2 text-base text-slate-700">ไม่ต้องพิมพ์ชื่อ เบอร์ และที่อยู่ใหม่ทีละช่อง ลองแก้ข้อความด้านล่างดู ผลลัพธ์เปลี่ยนทันที</p>
        </div>
        <AddressDemo />
      </section>

      {/* Product showcases */}
      <Showcase
        dark
        title="ขายเร็วเหมือนเครื่องคิดเงิน"
        lead="ช่วงลูกค้าเยอะ ทุกวินาทีมีค่า พิมพ์ชื่อหรือสแกน แล้วกด Enter ที่เหลือระบบทำให้"
        bullets={["กด F2 โฟกัสช่องค้นหาได้จากทุกที่ในหน้า", "ตะกร้าหลายรายการ ใส่ส่วนลด พิมพ์ใบเสร็จ 80 มม.", "สต็อกถูกตัดทันที เห็นของคงเหลือก่อนกดเลือก"]}
        visual={<PosMock className="w-full max-w-[520px]" />}
      />

      <Showcase
        reverse
        title="รู้ก่อนของหมด ไม่ต้องไล่นับ"
        lead="ทุกสินค้ามี Lot วันหมดอายุ และจุดเตือนของตัวเอง ของใกล้หมดจะเด้งเตือนก่อนขายไม่ทัน"
        bullets={["รับเข้าแยก Lot พร้อม Supplier และต้นทุนเฉลี่ย", "แถบสต็อกสีแดงเมื่อต่ำกว่าเกณฑ์ที่ตั้งไว้", "รายงานสินค้าขายช้าและใกล้หมดอายุ"]}
        visual={<StockMock className="w-full max-w-[480px]" />}
      />

      <Showcase
        dark
        title="ต้นทุนเห็นเฉพาะคนที่ควรเห็น"
        lead="ให้พนักงานขายได้เต็มที่โดยไม่ต้องเปิดเผยต้นทุนและกำไร ข้อมูลถูกซ่อนที่เซิร์ฟเวอร์ ไม่ได้แค่ซ่อนบนหน้าจอ"
        bullets={["เจ้าของร้านเห็นต้นทุน กำไร และรายงานครบ", "พนักงานขาย รับสินค้า พิมพ์ใบปะหน้าได้ แต่ไม่เห็นต้นทุน", "เพิ่มหรือปิดบัญชีพนักงานได้ในหน้าผู้ใช้งาน"]}
        visual={<RoleMock className="w-full max-w-[560px]" />}
      />

      <Showcase
        reverse
        title="ใช้ได้ทั้งมือถือ แท็บเล็ต และคอม"
        lead="ยืนขายที่หน้าร้านหรือแพ็กของที่โต๊ะ ก็ใช้เครื่องเดียวกันได้ หน้าจอปรับตามอุปกรณ์"
        bullets={["สแกนบาร์โค้ดด้วยกล้องมือถือ ไม่ต้องซื้อเครื่องสแกน", "มือถือมีแถบเมนูล่าง ปุ่มกดใหญ่ กดง่ายด้วยนิ้วเดียว", "คอมมีเมนูด้านข้างและตารางข้อมูลเต็มจอ"]}
        visual={
          <div className="relative h-[470px] w-full max-w-[440px]">
            <div className="absolute left-0 top-0 -rotate-3">
              <PhoneMock>
                <ScanPhoneScreen />
              </PhoneMock>
            </div>
            <div className="absolute bottom-0 right-0 rotate-3">
              <PhoneMock>
                <PosPhoneScreen />
              </PhoneMock>
            </div>
          </div>
        }
      />

      {/* Day in the life: a real sequence */}
      <section>
        <h2 className="text-balance text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">หนึ่งวันของร้านที่ใช้ MeeStock</h2>
        <ol className="relative mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="absolute left-0 right-0 top-5 hidden h-0.5 bg-[#a8e6cb] lg:block" aria-hidden="true" />
          {steps.map((s, i) => (
            <li key={s.title} className="relative">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#173d42] text-base font-extrabold text-[#a8e6cb]">
                {i + 1}
              </span>
              <p className="mt-3 text-lg font-bold text-slate-900">{s.title}</p>
              <p className="text-sm text-slate-500">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Modules */}
      <section>
        <h2 className="text-balance text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">ทุกโมดูลอยู่ในที่เดียว</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-lg"
            >
              <span>
                <span className="block font-bold text-slate-900">{m.title}</span>
                <span className="block text-sm text-slate-500">{m.desc}</span>
              </span>
              <Arrow className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-indigo-600" />
            </Link>
          ))}
        </div>
      </section>

      {/* Closing call to action */}
      <section className="dot-grid relative overflow-hidden rounded-[2rem] bg-[#173d42] p-8 text-white sm:p-12">
        <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              พร้อมให้สต็อกตรง
              <br />
              ตั้งแต่วันนี้
            </h2>
            <Link
              href={startHref}
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-[#a8e6cb] px-7 text-sm font-bold text-[#173d42] transition-transform hover:scale-[1.03]"
            >
              {user ? "เริ่มบันทึกขาย" : "เข้าสู่ระบบ"}
              <Arrow />
            </Link>
          </div>
          <div className="hidden -rotate-3 lg:block">
            <LabelMock />
          </div>
        </div>
      </section>
    </div>
  );
}
