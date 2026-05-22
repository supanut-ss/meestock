"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Snapshot = {
  total_products: number;
  total_stock_qty: number;
  low_stock_count: number;
  low_stock_items: { id: string; name: string; stockQty: number; lowStockThreshold: number }[];
};

const fallbackSnapshot: Snapshot = {
  total_products: 17,
  total_stock_qty: 286,
  low_stock_count: 3,
  low_stock_items: [
    { id: "1", name: "แก้วกาแฟ", stockQty: 3, lowStockThreshold: 3 },
    { id: "2", name: "กระเป๋าผ้า", stockQty: 2, lowStockThreshold: 4 },
    { id: "3", name: "สมุดโน้ต", stockQty: 1, lowStockThreshold: 3 },
  ],
};

const daily = [
  { date: "05-18", amount: 1200 },
  { date: "05-19", amount: 1450 },
  { date: "05-20", amount: 980 },
  { date: "05-21", amount: 2100 },
  { date: "05-22", amount: 1750 },
];

const monthly = [
  { month: "Jan", amount: 26000 },
  { month: "Feb", amount: 30000 },
  { month: "Mar", amount: 35500 },
  { month: "Apr", amount: 39800 },
  { month: "May", amount: 42000 },
];

const bestSellers = [
  { name: "เสื้อยืดสีขาว", total_qty: 88 },
  { name: "กระเป๋าผ้า", total_qty: 73 },
  { name: "แก้วกาแฟ", total_qty: 58 },
  { name: "หมวก", total_qty: 41 },
  { name: "สมุดโน้ต", total_qty: 33 },
];

export default function DashboardView() {
  const [snapshot, setSnapshot] = useState<Snapshot>(fallbackSnapshot);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000"}/api/dashboard/stock-snapshot`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Snapshot;
        setSnapshot(data);
      } catch {
        // fallback to static data for local first-load experience
      }
    };

    void load();
  }, []);

  const cards = useMemo(
    () => [
      { title: "Total Products", value: snapshot.total_products },
      { title: "Total Stock", value: snapshot.total_stock_qty },
      { title: "Low Stock", value: snapshot.low_stock_count },
    ],
    [snapshot]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {cards.map((card) => (
          <div key={card.title} className="rounded-xl bg-white p-4 shadow-sm border border-zinc-100">
            <p className="text-sm text-zinc-500">{card.title}</p>
            <p className="text-2xl font-bold text-zinc-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-zinc-100">
          <h3 className="font-semibold mb-3">Sales Summary (Daily)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2} name="THB" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-zinc-100">
          <h3 className="font-semibold mb-3">Sales Summary (Monthly)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="amount" fill="#0ea5e9" name="THB" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-zinc-100">
          <h3 className="font-semibold mb-3">Low Stock Items</h3>
          <ul className="space-y-2 text-sm">
            {snapshot.low_stock_items.map((item) => (
              <li key={item.id} className="flex justify-between border-b border-zinc-100 pb-2">
                <span>{item.name}</span>
                <span className="font-semibold text-red-600">{item.stockQty} / {item.lowStockThreshold}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm border border-zinc-100">
          <h3 className="font-semibold mb-3">Best Seller Top 5</h3>
          <ul className="space-y-2 text-sm">
            {bestSellers.map((item, idx) => (
              <li key={item.name} className="flex justify-between border-b border-zinc-100 pb-2">
                <span>{idx + 1}. {item.name}</span>
                <span className="font-semibold text-zinc-800">{item.total_qty}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
