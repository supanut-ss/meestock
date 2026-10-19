"use client";

import { useState } from "react";
import { smartAddressParser } from "@/lib/addressParser";

const SAMPLE =
  "ส่งที่ นายสมชาย ใจดี 081-234-5678 บ้านเลขที่ 1/99 หมู่บ้านสุขใจ ซอย 3 ถนนพหลโยธิน แขวงจอมพล เขตจตุจักร กรุงเทพ 10900";

// Live demo of the same parser the shipping page uses
export default function AddressDemo() {
  const [text, setText] = useState(SAMPLE);
  const parsed = smartAddressParser(text);

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
      <div className="rounded-2xl bg-white p-4 text-slate-900 shadow-lg">
        <label htmlFor="address-demo" className="text-xs font-semibold text-slate-500">
          วางข้อความจากแชตลูกค้า
        </label>
        <textarea
          id="address-demo"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        <button
          type="button"
          onClick={() => setText(SAMPLE)}
          className="mt-2 text-xs font-semibold text-indigo-700 hover:underline"
        >
          ใช้ข้อความตัวอย่าง
        </button>
      </div>

      <div className="flex items-center justify-center text-[#173d42]" aria-hidden="true">
        <svg className="h-8 w-8 rotate-90 lg:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6l6 6-6 6" />
        </svg>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-4 text-slate-900 shadow-lg" aria-live="polite">
        <p className="text-xs font-semibold text-slate-500">ใบปะหน้า 100×150 มม.</p>
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="text-xs text-slate-500">ผู้รับ</dt>
            <dd className="text-base font-bold">{parsed.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">โทร</dt>
            <dd className="font-mono font-semibold tabular-nums">{parsed.phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">ที่อยู่</dt>
            <dd className="leading-relaxed">{parsed.address || "—"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
