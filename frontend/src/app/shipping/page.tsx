"use client";

import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import ShippingLabel from "@/components/ShippingLabel";
import { smartAddressParser } from "@/lib/addressParser";
import { saveShipmentOrder } from "@/lib/dbActions";

const sampleText = "ส่งที่ นายสมชาย ใจดี 0812345678 บ้านเลขที่ 1/99 หมู่บ้านสุขใจ ซอย 3 ถนนพหลโยธิน แขวงจอมพล เขตจตุจักร กรุงเทพ 10900";

export default function ShippingPage() {
  const [rawAddress, setRawAddress] = useState(sampleText);
  const [orderNo, setOrderNo] = useState("MS-202605220001");
  const [senderName, setSenderName] = useState("MeeStock Shop");
  const [senderAddress, setSenderAddress] = useState("99/9 ถนนสุขใจ แขวงสามเสนใน เขตพญาไท กรุงเทพ 10400");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [receiverAddress, setReceiverAddress] = useState("");
  const [isParsed, setIsParsed] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const print = useReactToPrint({ contentRef: printRef, documentTitle: `shipping-${orderNo}` });

  const handleSaveOrder = async () => {
    if (!receiverName || !receiverPhone || !receiverAddress) {
      alert("กรุณาระบุข้อมูลผู้รับให้ครบถ้วนก่อนบันทึก");
      return;
    }
    setIsSaving(true);
    setSaveSuccess(null);
    try {
      const success = await saveShipmentOrder({
        orderNo,
        senderName,
        senderAddress,
        receiverName,
        receiverPhone,
        receiverAddress,
      });
      setSaveSuccess(success);
      if (success) {
        // Auto reset success state after 3 seconds
        setTimeout(() => setSaveSuccess(null), 3000);
        // Generate next order number sequence for convenience
        const nextSeq = Math.floor(1000 + Math.random() * 9000);
        setOrderNo(`MS-20260522${nextSeq}`);
      } else {
        alert("ไม่สามารถบันทึกข้อมูลลงฐานข้อมูลได้");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล");
    } finally {
      setIsSaving(false);
    }
  };

  const onParse = () => {
    if (!rawAddress.trim()) return;
    const parsed = smartAddressParser(rawAddress);
    setReceiverName(parsed.name);
    setReceiverPhone(parsed.phone);
    setReceiverAddress(parsed.address);
    setIsParsed(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">ระบบแกะที่อยู่อัจฉริยะ & ใบปะหน้ากล่อง</h1>
        <p className="text-slate-500 text-sm">
          คัดลอกที่อยู่ลูกค้ามาวางเพื่อแปลงเป็นฟอร์มจัดส่งอัตโนมัติ และสั่งพิมพ์ใบแปะหน้าขนาดมาตรฐาน 100x150 มม.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Parser Settings & Manual Forms */}
        <div className="lg:col-span-7 space-y-6">
          {/* Unstructured Address Input */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                ข้อความที่อยู่ของลูกค้า
              </h3>
              <button 
                onClick={() => setRawAddress("")}
                className="text-slate-400 hover:text-rose-500 text-xs font-semibold transition-colors"
              >
                ล้างข้อมูล
              </button>
            </div>

            <div className="relative">
              <textarea
                className="w-full min-h-24 px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all resize-none"
                placeholder="วางข้อความที่อยู่อย่างไม่เป็นทางการที่ลูกค้าส่งมาให้ที่นี่..."
                value={rawAddress}
                onChange={(e) => {
                  setRawAddress(e.target.value);
                  setIsParsed(false);
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xxs text-slate-400">ระบบจะทำการคัดกรองเบอร์โทรศัพท์และแยกแยะชื่อ-ที่อยู่ออกจากกัน</p>
              <button 
                onClick={onParse} 
                className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-100 hover:shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>ดึงข้อมูลอัจฉริยะ</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Parsed & Detailed Information Forms */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight border-b border-slate-100 pb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              รายละเอียดใบจัดส่ง (ตรวจสอบและแก้ไขได้)
            </h3>

            {isParsed && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3 flex items-center gap-2 text-xxs font-semibold text-emerald-700 animate-in fade-in duration-300">
                <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ดึงข้อมูลสำเร็จ! กรุณาตรวจสอบความถูกต้องของข้อมูลผู้รับด้านล่าง
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Order Number Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xxs font-semibold text-slate-500">หมายเลขคำสั่งซื้อ (Order No)</label>
                  <input 
                    type="text" 
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs" 
                    placeholder="MS-xxxxxxxx" 
                    value={orderNo} 
                    onChange={(e) => setOrderNo(e.target.value)} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xxs font-semibold text-slate-500">ชื่อผู้ส่งสินค้า</label>
                  <input 
                    type="text" 
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs" 
                    placeholder="ระบุชื่อผู้ส่ง" 
                    value={senderName} 
                    onChange={(e) => setSenderName(e.target.value)} 
                  />
                </div>
              </div>

              {/* Sender address */}
              <div className="space-y-1">
                <label className="text-xxs font-semibold text-slate-500">ที่อยู่ผู้ส่ง</label>
                <textarea 
                  className="w-full min-h-16 px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs resize-none" 
                  placeholder="ระบุที่อยู่ผู้ส่งอย่างละเอียด" 
                  value={senderAddress} 
                  onChange={(e) => setSenderAddress(e.target.value)} 
                />
              </div>

              <div className="border-t border-slate-100 my-4"></div>

              {/* Receiver details form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xxs font-semibold text-slate-500">ชื่อผู้รับสินค้า *</label>
                  <input 
                    type="text" 
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-semibold text-slate-800" 
                    placeholder="ชื่อ-นามสกุล ผู้รับ" 
                    value={receiverName} 
                    onChange={(e) => setReceiverName(e.target.value)} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xxs font-semibold text-slate-500">เบอร์โทรศัพท์ผู้รับ *</label>
                  <input 
                    type="text" 
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-mono font-semibold text-slate-800" 
                    placeholder="เช่น 0812345678" 
                    value={receiverPhone} 
                    onChange={(e) => setReceiverPhone(e.target.value)} 
                  />
                </div>
              </div>

              {/* Receiver address */}
              <div className="space-y-1">
                <label className="text-xxs font-semibold text-slate-500">ที่อยู่ผู้รับปลายทาง *</label>
                <textarea 
                  className="w-full min-h-20 px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs resize-none" 
                  placeholder="ระบุบ้านเลขที่ ซอย หมู่บ้าน แขวง เขต จังหวัด รหัสไปรษณีย์" 
                  value={receiverAddress} 
                  onChange={(e) => setReceiverAddress(e.target.value)} 
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button 
                disabled={isSaving}
                onClick={handleSaveOrder} 
                className={`py-2.5 px-6 rounded-xl text-white text-xs font-semibold shadow-md active:scale-95 transition-all flex items-center gap-1.5 ${
                  saveSuccess 
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100" 
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
                }`}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    กำลังบันทึก...
                  </>
                ) : saveSuccess ? (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    บันทึกสำเร็จ!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    บันทึกออเดอร์ลงระบบ
                  </>
                )}
              </button>

              <button 
                onClick={print} 
                className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-xs font-semibold shadow-md shadow-emerald-100 hover:shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                สั่งพิมพ์ใบปะหน้ากล่อง (100x150mm)
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Virtual Workbench Live Preview */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-600 tracking-wider uppercase">Live Preview (ป้ายพิมพ์จำลอง)</span>
            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xxs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
              ขนาดมาตรฐาน 100 x 150 มม.
            </span>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-100 p-8 shadow-inner overflow-auto flex justify-center items-center min-h-[500px] relative bg-[radial-gradient(#cfd8dc_1px,transparent_1px)] [background-size:16px_16px]">
            {/* The absolute workbench paper layer with high contrast */}
            <div ref={printRef} className="shadow-2xl transition-all hover:scale-[1.01] duration-300">
              <ShippingLabel
                senderName={senderName}
                senderAddress={senderAddress}
                receiverName={receiverName || "ยังไม่ได้ระบุชื่อผู้รับ"}
                receiverPhone={receiverPhone || "ยังไม่ได้ระบุเบอร์โทร"}
                receiverAddress={receiverAddress || "ยังไม่ได้ระบุที่อยู่จัดส่ง"}
                orderNo={orderNo}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
