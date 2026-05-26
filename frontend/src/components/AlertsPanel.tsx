"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  getAlerts,
  getUnreadAlertCount,
  markAlertRead,
  markAllAlertsRead,
  DBAlert
} from "@/lib/dbActions";

export default function AlertsPanel({ onClose }: { onClose?: () => void }) {
  const [alerts, setAlerts] = useState<DBAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const loadAlerts = async () => {
    try {
      const data = await getAlerts();
      const count = await getUnreadAlertCount();
      setAlerts(data);
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to load alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAlerts();
  }, []);

  const handleMarkRead = (id: string, type: "low_stock" | "expiry") => {
    // Expiry alerts are dynamic, so we just filter them out from local state,
    // while low_stock alerts are updated in the DB
    if (type === "expiry") {
      setAlerts(alerts.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
      return;
    }

    startTransition(async () => {
      const success = await markAlertRead(id);
      if (success) {
        void loadAlerts();
      }
    });
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      const success = await markAllAlertsRead();
      if (success) {
        void loadAlerts();
      }
    });
  };

  return (
    <div className="w-80 sm:w-96 rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[480px]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 text-sm">การแจ้งเตือนเตือนสต็อก</span>
          {unreadCount > 0 && (
            <span className="inline-flex h-5 items-center justify-center rounded-full bg-rose-500 px-2 text-[10px] font-bold text-white">
              {unreadCount} ใหม่
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="text-xxs font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-40 transition-colors"
          >
            อ่านทั้งหมด
          </button>
        )}
      </div>

      {/* Alert Feed */}
      <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
        {loading ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-[10px] text-slate-400 font-semibold">กำลังตรวจสอบสต็อก...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-2 text-slate-400 text-center">
            <svg className="w-8 h-8 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-bold text-slate-700">ไม่มีสัญญานเตือน</p>
            <p className="text-[10px] text-slate-400">คลังสินค้าของคุณมีความเสถียรและเรียบร้อยดี</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const isLowStock = alert.type === "low_stock";
            const iconBg = isLowStock ? "bg-amber-50 text-amber-600" : "bg-violet-50 text-violet-600";
            return (
              <div
                key={alert.id}
                className={`p-4 flex gap-3 items-start transition-colors relative group ${
                  alert.isRead ? "opacity-60 bg-white" : "bg-indigo-50/10 hover:bg-slate-50"
                }`}
              >
                {/* Visual Unread Marker */}
                {!alert.isRead && (
                  <span className="absolute left-2.5 top-5 h-1.5 w-1.5 rounded-full bg-indigo-600"></span>
                )}

                {/* Icon */}
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                  {isLowStock ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>

                {/* Message body */}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs font-semibold text-slate-700 leading-normal break-words">
                    {alert.message}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] text-slate-400 font-semibold">{alert.createdAt}</span>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/products?search=${encodeURIComponent(alert.productName)}`}
                        onClick={onClose}
                        className="text-[9px] font-bold text-indigo-600 hover:underline"
                      >
                        จัดการ
                      </Link>
                      {!alert.isRead && (
                        <button
                          onClick={() => handleMarkRead(alert.id, alert.type)}
                          disabled={isPending}
                          className="text-[9px] font-bold text-slate-400 hover:text-slate-600"
                        >
                          อ่านแล้ว
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
