"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getDashboardData } from "@/lib/dbActions";

type Snapshot = {
  total_products: number;
  total_stock_qty: number;
  low_stock_count: number;
  low_stock_items: { id: string; name: string; stockQty: number; lowStockThreshold: number }[];
};

type DashboardState = {
  snapshot: Snapshot;
  daily: { date: string; amount: number }[];
  monthly: { month: string; amount: number }[];
  bestSellers: { name: string; total_qty: number; price: number }[];
};

// Custom elegant Tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white/95 p-3.5 shadow-xl backdrop-blur-md text-xs space-y-1">
        <p className="font-bold text-slate-700">{label}</p>
        <p className="font-semibold text-indigo-600">
          ยอดขาย: <span className="font-bold text-slate-900">฿{payload[0].value.toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function DashboardView() {
  const [data, setData] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const dbData = await getDashboardData();
      setData(dbData);
    } catch (err) {
      console.error("Failed to load dashboard data from database:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const cards = useMemo(() => {
    if (!data) return [];
    return [
      { 
        title: "สินค้าทั้งหมด", 
        value: data.snapshot.total_products, 
        unit: "รายการ",
        trend: "สินค้าในแคตตาล็อก",
        bg: "from-indigo-500/5 to-indigo-600/5 border-indigo-100/70 text-indigo-600",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        )
      },
      { 
        title: "จำนวนสต็อกสินค้าคงเหลือรวม", 
        value: data.snapshot.total_stock_qty, 
        unit: "ชิ้น",
        trend: "ระดับปริมาณคงเหลือเฉลี่ย",
        bg: "from-emerald-500/5 to-emerald-600/5 border-emerald-100/70 text-emerald-600",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        )
      },
      { 
        title: "สินค้าที่ระดับสต็อกต่ำกว่าเกณฑ์", 
        value: data.snapshot.low_stock_count, 
        unit: "รายการ",
        trend: "ต้องจัดเตรียมสั่งซื้อของเพิ่ม",
        bg: data.snapshot.low_stock_count > 0 
          ? "from-rose-500/5 to-rose-600/5 border-rose-100/70 text-rose-600 animate-pulse" 
          : "from-slate-500/5 to-slate-600/5 border-slate-100 text-slate-500",
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      },
    ];
  }, [data]);

  if (loading || !data) {
    return (
      <div className="p-24 flex flex-col items-center justify-center gap-3">
        <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-xs font-semibold text-slate-400">กำลังดึงข้อมูลวิเคราะห์และการเงินเชิงลึก...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.title} className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br bg-white p-5 shadow-sm hover:shadow transition-all duration-300 ${card.bg}`}>
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-xxs font-semibold text-slate-400 uppercase tracking-wider">{card.title}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-slate-800 tracking-tight">{card.value}</span>
                  <span className="text-xs font-semibold text-slate-500">{card.unit}</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm text-slate-600">
                {card.icon}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100/60 flex items-center justify-between text-xxs font-semibold text-slate-400">
              <span>{card.trend}</span>
              <svg className="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Recharts Analytics Charts View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Chart */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">รายงานยอดขายรายวัน (THB)</h3>
            <span className="text-xxs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">ดึงข้อมูลจริงจาก SQL Server</span>
          </div>
          <div className="h-64 pr-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.daily} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.005}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "#94a3b8", fontWeight: 600 }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "#94a3b8", fontWeight: 600 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDaily)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Sales Chart */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">รายงานยอดขายสะสมรายเดือน (THB)</h3>
            <span className="text-xxs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">สรุปผลยอดจำหน่ายสะสม</span>
          </div>
          <div className="h-64 pr-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly} margin={{ top: 10, right: 5, left: -20, bottom: 0 }} barSize={32}>
                <defs>
                  <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.95}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.65}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "#94a3b8", fontWeight: 600 }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "#94a3b8", fontWeight: 600 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" fill="url(#colorMonthly)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Leaderboard Lists Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Warning Feed */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                รายการสินค้าที่ระดับสต็อกต่ำกว่าเกณฑ์
              </h3>
              <span className="text-xxs text-rose-500 font-semibold bg-rose-50 px-2 py-0.5 rounded-md">ระดับวิกฤตสต็อก</span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {data.snapshot.low_stock_items.length === 0 ? (
                <p className="py-6 text-center text-slate-400 text-xs font-semibold">
                  🎉 ยอดเยี่ยม! ไม่มีรายการสินค้าใดที่มีสต็อกต่ำกว่าระดับเตือนภัย
                </p>
              ) : (
                data.snapshot.low_stock_items.map((item) => {
                  const ratio = Math.min(100, Math.max(0, (item.stockQty / item.lowStockThreshold) * 100));
                  return (
                    <div key={item.id} className="py-3 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-700">{item.name}</span>
                        <span className="font-mono text-xs font-bold text-rose-600 bg-rose-50/50 px-2 py-0.5 rounded-md">
                          {item.stockQty} / {item.lowStockThreshold} ชิ้น
                        </span>
                      </div>
                      {/* Visual Progress percentage */}
                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-500" 
                          style={{ width: `${ratio}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <p className="text-xxs text-slate-400 leading-normal border-t border-slate-100 pt-3 mt-4">
            💡 คำแนะนำ: กรุณาเติมสต็อกของรายการที่เตือนเพื่อรักษาโอกาสในการสร้างยอดขายและให้บริการลูกค้า
          </p>
        </div>

        {/* Best Sellers Leaderboard */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              สินค้าขายดี 5 อันดับแรก (วิเคราะห์ยอดขายสะสม)
            </h3>
            <span className="text-xxs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">สถิติท็อปฮิต</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {data.bestSellers.map((item, idx) => {
              // Ranked styled bullets
              let badgeColor = "bg-slate-100 text-slate-600";
              if (idx === 0) badgeColor = "bg-amber-100 text-amber-700 font-extrabold shadow-sm shadow-amber-200/50";
              if (idx === 1) badgeColor = "bg-slate-200 text-slate-700 font-bold";
              if (idx === 2) badgeColor = "bg-orange-100 text-orange-700 font-bold";

              return (
                <div key={item.name} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`h-6 w-6 flex items-center justify-center rounded-lg text-xxs ${badgeColor}`}>
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-700 truncate">{item.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-800">{item.total_qty} ชิ้น</span>
                    <p className="text-slate-400 text-xxs font-semibold">฿{(item.total_qty * item.price).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
