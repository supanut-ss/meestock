"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { logoutUser } from "@/lib/authActions";
import { getUnreadAlertCount } from "@/lib/dbActions";
import AlertsPanel from "./AlertsPanel";

type NavUser = {
  displayName: string;
  role: string;
} | null;

type NavLink = { href: string; label: string; desc?: string; icon: string };

const mainLinks: NavLink[] = [
  { href: "/", label: "หน้าแรก", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/dashboard", label: "แดชบอร์ด", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
];

const inventoryLinks: NavLink[] = [
  { href: "/products", label: "สินค้า", desc: "รายการสินค้าและระดับสต็อก", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  { href: "/categories", label: "หมวดหมู่", desc: "จัดกลุ่มสินค้าและป้ายสี", icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" },
  { href: "/stock-in", label: "รับสินค้า", desc: "นำเข้าสินค้าใหม่เข้าคลัง", icon: "M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" },
  { href: "/stock-out", label: "จ่ายสินค้า", desc: "เบิกจ่ายสินค้าออก", icon: "M15 13l-3 3m0 0l-3-3m3 3V8m0-5a9 9 0 110 18 9 9 0 010-18z" },
  { href: "/movements", label: "ประวัติสต็อก", desc: "บันทึกการเคลื่อนไหวสินค้า", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
];

const salesLinks: NavLink[] = [
  { href: "/orders", label: "จัดส่ง", desc: "รายการสั่งซื้อและการจัดส่ง", icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" },
  { href: "/shipping", label: "ใบปะหน้า", desc: "พิมพ์ใบแปะกล่องพัสดุ", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { href: "/reports", label: "รายงาน", desc: "สรุปยอดขายและกำไร", icon: "M9 17v-2a4 4 0 00-4-4H3m14 0h-2a4 4 0 00-4 4v2m4-6a2 2 0 10-4 0v4m0 0H5a2 2 0 00-2 2v2h14v-2a2 2 0 00-2-2h-3" },
];

const usersIcon = "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z";

const tabLinks = [
  { href: "/", label: "หน้าแรก", icon: mainLinks[0].icon },
  { href: "/products", label: "สินค้า", icon: inventoryLinks[0].icon },
  { href: "/stock-out", label: "จ่ายสินค้า", icon: inventoryLinks[3].icon },
  { href: "/orders", label: "จัดส่ง", icon: salesLinks[0].icon },
];
const tabHrefs = new Set(tabLinks.map((t) => t.href));
const allLinks = [...mainLinks, ...inventoryLinks, ...salesLinks, { href: "/users", label: "จัดการผู้ใช้งาน" }];
const isTabActive = (href: string, pathname: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

function Icon({ d, className = "h-5 w-5", strokeWidth = 1.8 }: { d: string; className?: string; strokeWidth?: number }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function BrandMark({ size = "h-10 w-10" }: { size?: string }) {
  return (
    <div className={`flex ${size} items-center justify-center rounded-xl bg-[#a8e6cb] text-[#173d42]`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    </div>
  );
}

export default function Navigation({ user }: { user?: NavUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [unreadCount, setUnreadCount] = useState(0);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const pageTitle = allLinks.find((l) => isTabActive(l.href, pathname))?.label ?? "MeeStock";
  const moreActive = !!user && !tabLinks.some((t) => isTabActive(t.href, pathname));
  const isAdminUser = user?.role === "owner" || user?.role === "admin";

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!user) return;
    const load = () => getUnreadAlertCount().then(setUnreadCount);
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    startTransition(async () => {
      await logoutUser();
      router.push("/login");
      router.refresh();
    });
  };

  const roleLabel = isAdminUser ? "Admin" : "Staff";

  if (pathname === "/login") return null;

  const sidebarGroups: { title: string; links: NavLink[] }[] = [
    { title: "ภาพรวม", links: mainLinks },
    { title: "คลังสินค้า", links: inventoryLinks },
    { title: "ขาย & ขนส่ง", links: salesLinks },
    ...(isAdminUser ? [{ title: "ผู้ดูแลระบบ", links: [{ href: "/users", label: "จัดการผู้ใช้งาน", icon: usersIcon }] }] : []),
  ];

  return (
    <>
      {/* Desktop sidebar */}
      {user && (
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-[#173d42] p-4 text-white lg:flex">
          <Link href="/" className="mb-6 flex items-center gap-3 px-2 pt-1">
            <BrandMark />
            <div className="leading-tight">
              <p className="text-base font-bold tracking-tight">MeeStock</p>
              <p className="text-[11px] font-medium text-white/40">Inventory Suite</p>
            </div>
          </Link>

          <nav className="sidebar-scroll -mr-2 flex-1 space-y-4 overflow-y-auto pr-2" aria-label="เมนูหลัก">
            {sidebarGroups.map((group) => (
              <div key={group.title}>
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">{group.title}</p>
                <ul className="space-y-0.5">
                  {group.links.map((link) => {
                    const active = isTabActive(link.href, pathname);
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          aria-current={active ? "page" : undefined}
                          className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            active ? "bg-[#a8e6cb] text-[#173d42]" : "text-white/65 hover:bg-white/[0.07] hover:text-white"
                          }`}
                        >
                          <Icon d={link.icon} className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                          <span className="truncate">{link.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* User card */}
          <div className="mt-4 rounded-2xl bg-white/[0.06] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#a8e6cb] text-sm font-bold text-[#173d42]">
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user.displayName}</p>
                <p className="text-[11px] text-white/45">{roleLabel}</p>
              </div>
              <button
                onClick={handleLogout}
                disabled={isPending}
                aria-label="ออกจากระบบ"
                title="ออกจากระบบ"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-rose-300 disabled:opacity-50"
              >
                <Icon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Top bar */}
      <header className={`sticky top-0 z-30 w-full border-b border-slate-200/70 bg-[#f1f5f3]/85 backdrop-blur-md pt-[env(safe-area-inset-top)] ${user ? "lg:pl-60" : ""}`}>
        <div className="mx-auto max-w-[88rem] px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-3 lg:h-14">
            <div className="flex min-w-0 items-center gap-3">
              {user ? (
                <>
                  <div className="lg:hidden"><BrandMark size="h-8 w-8" /></div>
                  <div className="min-w-0">
                    <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 lg:text-xl">{pageTitle}</h1>
                    
                  </div>
                </>
              ) : (
                <Link href="/" className="flex items-center gap-2.5">
                  <BrandMark size="h-9 w-9" />
                  <span className="text-lg font-bold text-slate-900">MeeStock</span>
                </Link>
              )}
            </div>

            {!user && (
              <Link
                href="/login"
                className="inline-flex h-11 items-center rounded-full bg-[#173d42] px-5 text-sm font-semibold text-[#a8e6cb] transition-colors hover:bg-[#1f4a50]"
              >
                เข้าสู่ระบบ
              </Link>
            )}

            {user && (
              <div className="flex flex-shrink-0 items-center gap-2">
                <span className={`hidden items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset sm:inline-flex ${
                  isAdminUser ? "bg-slate-900 text-[#a8e6cb] ring-slate-900" : "bg-white text-slate-600 ring-slate-200"
                }`}>
                  {user.displayName} · {roleLabel}
                </span>
                <div className="relative">
                  <button
                    onClick={() => setAlertsOpen(!alertsOpen)}
                    aria-label="การแจ้งเตือน"
                    className="tap-press relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    <Icon d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeWidth={2} />
                    {unreadCount > 0 && <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />}
                  </button>

                  {alertsOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setAlertsOpen(false)} />
                      <div className="fixed inset-x-3 top-[calc(3.5rem+env(safe-area-inset-top))] z-20 animate-in slide-in-from-top-2 duration-150 sm:left-auto sm:w-96 lg:absolute lg:inset-x-auto lg:right-0 lg:top-full lg:mt-2">
                        <AlertsPanel onClose={() => setAlertsOpen(false)} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {user && (
        <>
          {/* Bottom tab bar (mobile/tablet) */}
          <nav
            aria-label="เมนูหลัก"
            className="fixed inset-x-3 bottom-3 z-40 rounded-3xl bg-[#173d42]/95 shadow-2xl shadow-black/25 backdrop-blur-md lg:hidden"
            style={{ marginBottom: "env(safe-area-inset-bottom)" }}
          >
            <ul className="mx-auto grid max-w-2xl grid-cols-5">
              {tabLinks.map((tab) => {
                const active = isTabActive(tab.href, pathname);
                return (
                  <li key={tab.href}>
                    <Link
                      href={tab.href}
                      aria-current={active ? "page" : undefined}
                      className={`tap-press flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active ? "text-[#a8e6cb]" : "text-white/55"}`}
                    >
                      <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${active ? "bg-white/10" : ""}`}>
                        <Icon d={tab.icon} strokeWidth={active ? 2.2 : 1.8} />
                      </span>
                      {tab.label}
                    </Link>
                  </li>
                );
              })}
              <li>
                <button
                  type="button"
                  onClick={() => setMoreOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={moreOpen}
                  className={`tap-press flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold ${moreActive ? "text-[#a8e6cb]" : "text-white/55"}`}
                >
                  <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${moreActive ? "bg-white/10" : ""}`}>
                    <Icon d="M4 6h16M4 12h16M4 18h16" strokeWidth={2} />
                  </span>
                  เพิ่มเติม
                </button>
              </li>
            </ul>
          </nav>

          {/* "More" bottom sheet */}
          {moreOpen && (
            <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="เมนูเพิ่มเติม">
              <div className="absolute inset-0 bg-slate-900/50 animate-in fade-in duration-150" onClick={() => setMoreOpen(false)} />
              <div
                className="absolute inset-x-0 bottom-0 mx-auto max-h-[85dvh] max-w-2xl overflow-y-auto overscroll-contain rounded-t-3xl bg-white p-4 shadow-2xl animate-in slide-in-from-bottom duration-200"
                style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
              >
                <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300" aria-hidden="true" />
                {[
                  { title: "คลังสินค้า", links: inventoryLinks.filter((l) => !tabHrefs.has(l.href)) },
                  { title: "ขาย & ขนส่ง", links: salesLinks.filter((l) => !tabHrefs.has(l.href)) },
                  { title: "ภาพรวม", links: mainLinks.filter((l) => !tabHrefs.has(l.href)) },
                ]
                  .filter((group) => group.links.length > 0)
                  .map((group) => (
                    <section key={group.title} className="mb-4">
                      <h2 className="mb-2 px-1 text-xs font-bold text-slate-400">{group.title}</h2>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {group.links.map((link) => {
                          const active = pathname === link.href;
                          return (
                            <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setMoreOpen(false)}
                              className={`tap-press flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl p-2 text-center text-xs font-semibold ${
                                active ? "bg-[#173d42] text-[#a8e6cb]" : "bg-slate-50 text-slate-700"
                              }`}
                            >
                              <Icon d={link.icon} className="h-6 w-6" />
                              {link.label}
                            </Link>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                <div className="mb-3 flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173d42] text-sm font-bold text-[#a8e6cb]">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{user.displayName}</p>
                    <p className="text-xs text-slate-500">{roleLabel}</p>
                  </div>
                </div>
                {isAdminUser && (
                  <Link
                    href="/users"
                    onClick={() => setMoreOpen(false)}
                    className="tap-press mb-2 flex h-12 items-center rounded-2xl bg-slate-50 px-4 text-sm font-semibold text-slate-700"
                  >
                    จัดการผู้ใช้งาน
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isPending}
                  className="tap-press flex h-12 w-full items-center justify-center rounded-2xl bg-rose-50 text-sm font-semibold text-rose-600 disabled:opacity-50"
                >
                  {isPending ? "กำลังออก..." : "ออกจากระบบ"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
