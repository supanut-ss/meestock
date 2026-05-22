"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

type ShippingLabelProps = {
  senderName: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  orderNo: string;
};

export default function ShippingLabel({
  senderName,
  senderAddress,
  receiverName,
  receiverPhone,
  receiverAddress,
  orderNo,
}: ShippingLabelProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!barcodeRef.current || !orderNo) return;
    try {
      JsBarcode(barcodeRef.current, orderNo, {
        format: "CODE128",
        displayValue: true,
        width: 2.2,
        height: 52,
        margin: 4,
        fontSize: 11,
        lineColor: "#000000",
      });
    } catch (err) {
      console.error("Barcode rendering inside shipping label failed: ", err);
    }
  }, [orderNo]);

  return (
    <div 
      className="bg-white text-black border-2 border-black p-4 flex flex-col justify-between" 
      style={{ 
        width: "100mm", 
        height: "150mm", 
        boxSizing: "border-box",
        fontFamily: "'Inter', sans-serif" 
      }}
    >
      <div className="space-y-3">
        {/* Label top heading branding and order tags */}
        <div className="flex items-center justify-between border-b-2 border-black pb-2">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm tracking-tighter uppercase px-1.5 py-0.5 bg-black text-white rounded">
              MEESTOCK
            </span>
            <span className="text-xxs font-bold tracking-wider text-slate-700">PRO LABEL</span>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold text-slate-500 uppercase leading-none">ORDER ID</p>
            <p className="text-xs font-mono font-bold leading-normal">{orderNo}</p>
          </div>
        </div>

        {/* Sender details (FROM) */}
        <div className="border-b-2 border-black pb-2 text-[11px] leading-tight">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[9px] font-black uppercase bg-slate-200 px-1 py-0.2 rounded">FROM</span>
            <p className="font-bold truncate text-slate-800">{senderName}</p>
          </div>
          <p className="whitespace-pre-line text-slate-600 pl-1">{senderAddress}</p>
        </div>

        {/* Receiver details (TO) */}
        <div className="space-y-2 py-1">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-black uppercase bg-black text-white px-1.5 py-0.2 rounded">TO</span>
            <span className="text-xs font-black text-black">ผู้รับปลายทาง</span>
          </div>

          <div className="pl-1 space-y-1.5">
            <p className="text-base font-black tracking-wide text-black leading-snug">
              {receiverName}
            </p>
            <p className="text-sm font-bold font-mono text-black">
              โทรศัพท์: {receiverPhone}
            </p>
            <p className="text-sm font-medium leading-relaxed whitespace-pre-line text-slate-900 border-l-2 border-slate-300 pl-2 py-0.5">
              {receiverAddress}
            </p>
          </div>
        </div>
      </div>

      {/* Logistics barcode rendering block */}
      <div className="border-t-2 border-black pt-3 flex flex-col items-center justify-center gap-1 mt-auto">
        <div className="w-full flex justify-center py-1">
          <svg ref={barcodeRef} className="max-w-full" />
        </div>
        <div className="w-full flex items-center justify-between text-[9px] font-bold text-slate-500 px-1">
          <span>STANDARD POST / AIRWAY BILL</span>
          <span>MS SYSTEM</span>
        </div>
      </div>
    </div>
  );
}
