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
            พร้อมใช้งานสำหรับร้านค้าของคุณ
          </div>
          
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            จัดการสต็อกได้ง่ายๆ <br/>
            <span className="bg-gradient-to-r from-indigo-300 to-violet-200 bg-clip-text text-transparent">
              ฉลาด รวดเร็ว เรียบหรู
            </span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-lg leading-relaxed">
            MeeStock ช่วยลดความยุ่งยากในการนับสต็อก พิมพ์บาร์โค้ดสินค้า และแกะข้อมูลที่อยู่ลูกค้าเพื่อจัดส่ง ได้อย่างรวดเร็วผ่านมือถือของคุณ
          </p>
        </div>
      </div>

      {/* Highlights Quick Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "รายการสินค้าทั้งหมด", value: "17 รายการ", color: "border-indigo-100 text-indigo-600 bg-indigo-50/30" },
          { label: "สินค้าสต็อกต่ำกว่าเกณฑ์", value: "3 รายการ", color: "border-amber-100 text-amber-600 bg-amber-50/30" },
          { label: "ระบบแกะที่อยู่อัจฉริยะ", value: "พร้อมใช้งาน", color: "border-emerald-100 text-emerald-600 bg-emerald-50/30" },
          { label: "เครื่องพิมพ์บาร์โค้ด", value: "รองรับ 100x150", color: "border-violet-100 text-violet-600 bg-violet-50/30" },
        ].map((item, idx) => (
          <div key={idx} className={`rounded-2xl border p-4 text-center transition-all duration-300 hover:shadow-sm ${item.color}`}>
            <p className="text-xs text-slate-500 font-medium mb-1">{item.label}</p>
            <p className="text-lg font-bold">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Main Interactive Feature Cards */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
          </svg>
          เครื่องมือจัดการหลัก
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Card 1: Product Management */}
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
                  จัดการสต็อก & บาร์โค้ด
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  เพิ่ม/ลดสต็อกแบบ Real-time ด้วยการสแกนบาร์โค้ด รองรับระบบแจ้งเตือนเมื่อสต็อกต่ำ
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center text-xs font-semibold text-indigo-600 gap-1">
              เริ่มใช้งานคลังสินค้า
              <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          {/* Card 2: Smart Address Parser */}
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
                  ระบบแกะที่อยู่ & ใบปะหน้า
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  คัดลอกข้อความยาวๆ มาวางเพื่อดึงข้อมูล ชื่อ เบอร์โทร ที่อยู่ อัตโนมัติ พร้อมพิมพ์ใบแปะหน้ากล่อง 100x150มม.
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center text-xs font-semibold text-emerald-600 gap-1">
              แกะที่อยู่และปริ้นท์
              <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          {/* Card 3: Dashboard & Reports */}
          <Link 
            href="/dashboard" 
            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-md hover:shadow-violet-100/40"
          >
            <div className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 transition-colors duration-300 group-hover:bg-violet-600 group-hover:text-white">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-800 text-lg group-hover:text-violet-600 transition-colors">
                  แดชบอร์ด & รายงานยอดขาย
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  ดูรายงานยอดขายรายวันและรายเดือน สินค้ายอดนิยมอันดับต้นๆ และเช็ครายการสินค้าค้างคลังได้อย่างสวยงาม
                </p>
              </div>
            </div>
            <div className="mt-6 flex items-center text-xs font-semibold text-violet-600 gap-1">
              ดูรายงานภาพรวม
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
