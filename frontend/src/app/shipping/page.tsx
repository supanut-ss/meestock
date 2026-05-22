"use client";

import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import ShippingLabel from "@/components/ShippingLabel";
import { smartAddressParser } from "@/lib/addressParser";

const sampleText = "ส่งที่ นายสมชาย ใจดี 0812345678 บ้านเลขที่ 1/99 หมู่บ้านสุขใจ ซอย 3 ถนนพหลโยธิน แขวงจอมพล เขตจตุจักร กรุงเทพ 10900";

export default function ShippingPage() {
  const [rawAddress, setRawAddress] = useState(sampleText);
  const [orderNo, setOrderNo] = useState("MS-202605220001");
  const [senderName, setSenderName] = useState("MeeStock Shop");
  const [senderAddress, setSenderAddress] = useState("99/9 ถนนสุขใจ แขวงสามเสนใน เขตพญาไท กรุงเทพ 10400");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [receiverAddress, setReceiverAddress] = useState("");

  const printRef = useRef<HTMLDivElement>(null);
  const print = useReactToPrint({ contentRef: printRef, documentTitle: `shipping-${orderNo}` });

  const onParse = () => {
    const parsed = smartAddressParser(rawAddress);
    setReceiverName(parsed.name);
    setReceiverPhone(parsed.phone);
    setReceiverAddress(parsed.address);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Smart Address Parser + Shipping Label (100x150mm)</h1>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
          <label className="text-sm font-medium">Unstructured Address Input</label>
          <textarea
            className="w-full min-h-32 rounded border border-zinc-300 p-2"
            value={rawAddress}
            onChange={(e) => setRawAddress(e.target.value)}
          />
          <button onClick={onParse} className="rounded bg-blue-600 text-white px-3 py-2 text-sm">Parse Address</button>

          <div className="space-y-2">
            <input className="w-full rounded border border-zinc-300 p-2" placeholder="Order No" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} />
            <input className="w-full rounded border border-zinc-300 p-2" placeholder="Sender Name" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
            <textarea className="w-full rounded border border-zinc-300 p-2" placeholder="Sender Address" value={senderAddress} onChange={(e) => setSenderAddress(e.target.value)} />
            <input className="w-full rounded border border-zinc-300 p-2" placeholder="Receiver Name" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} />
            <input className="w-full rounded border border-zinc-300 p-2" placeholder="Receiver Phone" value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} />
            <textarea className="w-full rounded border border-zinc-300 p-2" placeholder="Receiver Address" value={receiverAddress} onChange={(e) => setReceiverAddress(e.target.value)} />
          </div>

          <button onClick={print} className="rounded bg-green-600 text-white px-3 py-2 text-sm">Print Shipping Label</button>
        </div>

        <div className="rounded-xl border bg-zinc-100 p-4 overflow-auto">
          <div ref={printRef} className="inline-block">
            <ShippingLabel
              senderName={senderName}
              senderAddress={senderAddress}
              receiverName={receiverName}
              receiverPhone={receiverPhone}
              receiverAddress={receiverAddress}
              orderNo={orderNo}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
