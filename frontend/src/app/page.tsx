import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-10 py-4">
      {/* Premium Hero Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-900 p-8 text-white shadow-xl shadow-indigo-950/20 sm:p-12">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-violet-500/10 blur-2xl"></div>

        <div className="relative max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 ring-1 ring-indigo-400/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            พร้อมใช้งานสำหรับร้านค้าออนไลน์ของคุณ
          </div>
          
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            ระบบบริหารคลังสินค้า <br/>
            <span className="bg-gradient-to-r from-indigo-300 to-violet-200 bg-clip-text text-transparent font-black">
              MeeStock Pro
            </span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-lg leading-relaxed">
            ระบบ Mini Stock ครบวงจรสำหรับร้านค้าออนไลน์ จัดการสินค้า หมวดหมู่ รับเข้า จ่ายออก จัดส่ง และรายงานกำไร-ขาดทุนครบในที่เดียว
          </p>
        </div>
      </div>

      {/* Highlights Quick Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "รายการสินค้าทั้งหมด", value: "พร้อมใช้งาน", color: "border-indigo-100 text-indigo-600 bg-indigo-50/30" },
          { label: "ระบบรับเข้า/จ่ายออก", value: "Real-time", color: "border-violet-100 text-violet-600 bg-violet-50/30" },
          { label: "แกะที่อยู่อัจฉริยะ", value: "พิมพ์ใบปะหน้า", color: "border-emerald-100 text-emerald-600 bg-emerald-50/30" },
          { label: "รายงานยอดขาย", value: "กำไร-ขาดทุน", color: "border-sky-100 text-sky-600 bg-sky-50/30" },
        ].map((item, idx) => (
          <div key={idx} className={`rounded-2xl border p-4 text-center transition-all duration-300 hover:shadow-sm ${item.color}`}>
            <p className="text-xs text-slate-500 font-medium mb-1">{item.label}</p>
            <p className="text-base sm:text-lg font-bold">{item.value}</p>
          </div>
        ))}
      </div>

      {/* 6 Main Modules Interactive Grid */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
          ระบบงานหลัก 6 โมดูล
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Product Management */}
          <Link 
            href="/products" 
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-100/40"
          >
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition-colors duration-300 group-hover:bg-indigo-600 group-hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">
                  📦 จัดการสินค้า & สต็อก
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  เพิ่ม/แก้ไข/ลบสินค้า รหัสสินค้า บาร์โค้ด กำหนดจุดแจ้งเตือนสต็อกต่ำ และดูประวัติราคาทุนแยกตาม role ได้
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center text-xs font-semibold text-indigo-600 gap-1">
              เข้าสู่ระบบสินค้า
              <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          {/* 2. Stock In */}
          <Link 
            href="/stock-in" 
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-md hover:shadow-violet-100/40"
          >
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 transition-colors duration-300 group-hover:bg-violet-600 group-hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
                </svg>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-800 text-lg group-hover:text-violet-600 transition-colors">
                  📥 รับสินค้าเข้า (Stock In)
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  บันทึกสินค้าเข้าคลังแยกตาม Lot, วันหมดอายุ, ข้อมูล Supplier และปรับต้นทุนราคาสินค้าเฉลี่ยอัตโนมัติ
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center text-xs font-semibold text-violet-600 gap-1">
              บันทึกสินค้าเข้า
              <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          {/* 3. Stock Out / Sale */}
          <Link 
            href="/stock-out" 
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-pink-200 hover:shadow-md hover:shadow-pink-100/40"
          >
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-50 text-pink-600 transition-colors duration-300 group-hover:bg-pink-600 group-hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13l-3 3m0 0l-3-3m3 3V8m0-5a9 9 0 110 18 9 9 0 010-18z" />
                </svg>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-800 text-lg group-hover:text-pink-600 transition-colors">
                  📤 จ่ายสินค้าออก / บันทึกขาย
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  เพิ่มรายการสินค้าในบิลเดียวแบบตระกร้าสินค้า ตัดสต็อก Real-time พิมพ์ใบเสร็จ/Invoice ขนาด 80มม. ได้ทันที
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center text-xs font-semibold text-pink-600 gap-1">
              ทำรายการขายสินค้า
              <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          {/* 4. Stock Movements */}
          <Link 
            href="/movements" 
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-200 hover:shadow-md hover:shadow-amber-100/40"
          >
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 transition-colors duration-300 group-hover:bg-amber-600 group-hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-800 text-lg group-hover:text-amber-600 transition-colors">
                  📃 ประวัติและรายการเคลื่อนไหว
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  ตรวจสอบความเคลื่อนไหวคลังสินค้า (Stock Movements) เข้า-ออก-คืนสินค้า พร้อมเหตุผลการปรับคลังสินค้าแบบละเอียด
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center text-xs font-semibold text-amber-600 gap-1">
              ตรวจสอบความเคลื่อนไหว
              <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          {/* 5. Smart Airway Bill Parser */}
          <Link 
            href="/shipping" 
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/40"
          >
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 transition-colors duration-300 group-hover:bg-emerald-600 group-hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-800 text-lg group-hover:text-emerald-600 transition-colors">
                  🚚 ปะหน้ากล่อง & จัดส่ง
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  แกะข้อมูลที่อยู่ลูกค้าอัจฉริยะ (Airway Bill Parser) จากข้อความยาวๆ พร้อมระบบพิมพ์ใบปะหน้าและบันทึกเลขพัสดุ
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center text-xs font-semibold text-emerald-600 gap-1">
              แกะที่อยู่และปะหน้ากล่อง
              <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          {/* 6. Dashboard & Reports */}
          <Link 
            href="/dashboard" 
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-md hover:shadow-sky-100/40"
          >
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 transition-colors duration-300 group-hover:bg-sky-600 group-hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-800 text-lg group-hover:text-sky-600 transition-colors">
                  📊 แดชบอร์ด & รายงานยอดขาย
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  ดูสถิติวิเคราะห์ ยอดขายรายวันและรายเดือน สินค้ายอดนิยมอันดับต้นๆ และวิเคราะห์อัตราการหมุนเวียนสินค้า
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center text-xs font-semibold text-sky-600 gap-1">
              วิเคราะห์รายงานธุรกิจ
              <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
