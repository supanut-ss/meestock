import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">MeeStock (MVP)</h1>
      <p className="text-zinc-600">ระบบบริหารจัดการสต็อกจิ๋วสำหรับแม่ค้าออนไลน์ เน้นเร็ว เรียบง่าย และ mobile-friendly</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link className="rounded-xl border bg-white p-4 shadow-sm hover:shadow" href="/products">Product Management + Barcode</Link>
        <Link className="rounded-xl border bg-white p-4 shadow-sm hover:shadow" href="/shipping">Smart Address Parser + Shipping Label</Link>
        <Link className="rounded-xl border bg-white p-4 shadow-sm hover:shadow" href="/dashboard">Dashboard & Reports</Link>
      </div>
    </div>
  );
}
