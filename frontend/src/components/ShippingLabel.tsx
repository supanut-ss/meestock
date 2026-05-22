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
    JsBarcode(barcodeRef.current, orderNo, {
      format: "CODE128",
      displayValue: true,
      width: 2,
      height: 48,
      margin: 6,
      fontSize: 12,
    });
  }, [orderNo]);

  return (
    <div className="bg-white text-black border border-zinc-300 rounded-md p-4" style={{ width: "100mm", minHeight: "150mm" }}>
      <div className="border-b pb-2 mb-2">
        <p className="text-xs text-zinc-600">From</p>
        <p className="text-sm font-semibold">{senderName}</p>
        <p className="text-sm whitespace-pre-line">{senderAddress}</p>
      </div>

      <div className="border-b pb-2 mb-2">
        <p className="text-xs text-zinc-600">To</p>
        <p className="text-base font-bold">{receiverName}</p>
        <p className="text-sm">Tel: {receiverPhone}</p>
        <p className="text-sm whitespace-pre-line">{receiverAddress}</p>
      </div>

      <div className="flex justify-center">
        <svg ref={barcodeRef} />
      </div>
    </div>
  );
}
