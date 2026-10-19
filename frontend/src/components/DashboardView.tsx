"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getDashboardData } from "@/lib/dbActions";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import WarehouseOutlinedIcon from "@mui/icons-material/WarehouseOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";

type Snapshot = {
  total_products: number;
  total_stock_qty: number;
  low_stock_count: number;
  low_stock_items: { id: string; name: string; stockQty: number; lowStockThreshold: number }[];
  total_sales: number;
  total_profit: number;
};

type DashboardState = {
  snapshot: Snapshot;
  daily: { date: string; amount: number }[];
  monthly: { month: string; amount: number }[];
  bestSellers: { name: string; total_qty: number; price: number }[];
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: Array<{
    value: number;
    name?: string;
  }>;
  label?: string;
};

// Custom elegant Tooltip for charts
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
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

export default function DashboardView({ isAdmin = false }: { isAdmin?: boolean }) {
  const [data, setData] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      const dbData = await getDashboardData();
      setTimeout(() => {
        setData(dbData);
        setLoading(false);
      }, 0);
    } catch (err) {
      console.error("Failed to load dashboard data from database:", err);
      setTimeout(() => {
        setLoading(false);
      }, 0);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const cards = useMemo(() => {
    if (!data) return [];
    const all = [
      { 
        title: "ยอดขายรวมสะสม", 
        value: `฿${data.snapshot.total_sales.toLocaleString()}`, 
        unit: "",
        trend: "รายได้ขายทั้งหมด",
        bg: "from-indigo-500/5 to-indigo-600/5 border-indigo-100/70 text-indigo-600",
        icon: <PaymentsOutlinedIcon sx={{ fontSize: 20, color: "inherit" }} />
      },
      { 
        title: "กำไรรวมสะสม", 
        value: `฿${data.snapshot.total_profit.toLocaleString()}`, 
        unit: "",
        trend: "ยอดขายลบต้นทุนรวม",
        bg: "from-violet-500/5 to-violet-600/5 border-violet-100/70 text-violet-600",
        icon: <TrendingUpOutlinedIcon sx={{ fontSize: 20, color: "inherit" }} />
      },
      { 
        title: "สินค้าทั้งหมด", 
        value: String(data.snapshot.total_products), 
        unit: "รายการ",
        trend: "ในแคตตาล็อก",
        bg: "from-sky-500/5 to-sky-600/5 border-sky-100/70 text-sky-600",
        icon: <Inventory2OutlinedIcon sx={{ fontSize: 20, color: "inherit" }} />
      },
      { 
        title: "สต็อกคงเหลือรวม", 
        value: data.snapshot.total_stock_qty.toLocaleString(), 
        unit: "ชิ้น",
        trend: "ปริมาณสินค้าในคลัง",
        bg: "border-emerald-100/70 text-emerald-600",
        icon: <WarehouseOutlinedIcon sx={{ fontSize: 20, color: "inherit" }} />
      },
      { 
        title: "สินค้าที่สต็อกต่ำ", 
        value: String(data.snapshot.low_stock_count), 
        unit: "รายการ",
        trend: "ต้องจัดซื้อของเพิ่ม",
        bg: data.snapshot.low_stock_count > 0 
          ? "border-rose-100/70 text-rose-600" 
          : "from-slate-500/5 to-slate-600/5 border-slate-100 text-slate-500",
        icon: <WarningAmberOutlinedIcon sx={{ fontSize: 20, color: "inherit" }} />
      },
    ];
    // Profit is derived from cost price, which only admins may see
    return isAdmin ? all : all.filter((c) => c.title !== "กำไรรวมสะสม");
  }, [data, isAdmin]);

  if (loading || !data) {
    return (
      <div className="p-24 flex flex-col items-center justify-center gap-3">
        <CircularProgress size={36} sx={{ color: "#4d7c0f" }} />
        <p className="text-xs font-semibold text-slate-400">กำลังดึงข้อมูลวิเคราะห์และการเงินเชิงลึก...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 max-lg:[&>*:last-child:nth-child(odd)]:col-span-2">
        {cards.map((card, idx) => {
          const dark = idx === 0;
          return (
            <div
              key={card.title}
              className={`relative overflow-hidden rounded-3xl p-5 transition-all duration-300 hover:-translate-y-0.5 ${
                dark ? "bg-[#111312] text-white shadow-lg shadow-black/10" : "surface-card"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className={`text-xs font-medium truncate ${dark ? "text-white/60" : "text-slate-500"}`} title={card.title}>{card.title}</p>
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${dark ? "bg-[#c6f432] text-[#111312]" : "bg-slate-100 text-slate-700"}`}>
                  {card.icon}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-baseline gap-1.5">
                <span className={`break-all text-2xl font-extrabold tracking-tight ${dark ? "text-white" : "text-slate-900"}`}>{card.value}</span>
                {card.unit && <span className={`text-xs font-semibold ${dark ? "text-white/50" : "text-slate-500"}`}>{card.unit}</span>}
              </div>
              <p className={`mt-2 text-xs ${dark ? "text-[#c6f432]" : "text-slate-400"}`}>{card.trend}</p>
            </div>
          );
        })}
      </div>

      {/* Recharts Analytics Charts View */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Daily Sales Chart */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">รายงานยอดขายรายวัน (THB)</h3>
            <span className="text-xxs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">ข้อมูลจริง</span>
          </div>
          <div className="h-64 pr-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.daily} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#84cc16" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#65a30d" stopOpacity={0.005}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "#94a3b8", fontWeight: 600 }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: "10px", fill: "#94a3b8", fontWeight: 600 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="amount" stroke="#4d7c0f" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDaily)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Sales Chart */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">รายงานยอดขายสะสมรายเดือน (THB)</h3>
            <span className="text-xxs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">สะสม</span>
          </div>
          <div className="h-64 pr-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly} margin={{ top: 10, right: 5, left: -20, bottom: 0 }} barSize={32}>
                <defs>
                  <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#111312" stopOpacity={0.95}/>
                    <stop offset="95%" stopColor="#111312" stopOpacity={0.75}/>
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
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Low Stock Warning Feed */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className=" absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                รายการสินค้าที่ระดับสต็อกต่ำกว่าเกณฑ์
              </h3>
              <span className="text-xxs text-rose-500 font-semibold bg-rose-50 px-2 py-0.5 rounded-md">ระดับวิกฤตสต็อก</span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {data.snapshot.low_stock_items.length === 0 ? (
                <p className="py-6 text-center text-slate-400 text-xs font-semibold">
                  ยอดเยี่ยม! ไม่มีรายการสินค้าใดที่มีสต็อกต่ำกว่าระดับเตือนภัย
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
                      {/* Visual Progress bar */}
                      <LinearProgress
                        variant="determinate"
                        value={ratio}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: "#f1f5f9",
                          "& .MuiLinearProgress-bar": {
                            borderRadius: 3,
                            backgroundColor: ratio < 30 ? "#f43f5e" : ratio < 70 ? "#f59e0b" : "#10b981",
                          },
                        }}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <p className="text-xxs text-slate-400 leading-normal border-t border-slate-100 pt-3 mt-4">
            คำแนะนำ: กรุณาเติมสต็อกของรายการที่เตือนเพื่อรักษาโอกาสในการสร้างยอดขายและให้บริการลูกค้า
          </p>
        </div>

        {/* Best Sellers Leaderboard */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
              <EmojiEventsOutlinedIcon sx={{ fontSize: 18, color: "#f59e0b" }} />
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
