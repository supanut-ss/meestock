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

const mainLinks = [
  { href: "/", label: "หน้าแรก", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/dashboard", label: "แดชบอร์ด", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
];

const inventoryLinks = [
  { href: "/products", label: "สินค้า", desc: "รายการสินค้าและระดับสต็อก", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  { href: "/categories", label: "หมวดหมู่", desc: "จัดกลุ่มสินค้าและป้ายสี", icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" },
  { href: "/stock-in", label: "รับสินค้า", desc: "นำเข้าสินค้าใหม่เข้าคลัง", icon: "M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" },
  { href: "/stock-out", label: "จ่ายสินค้า", desc: "เบิกจ่ายสินค้าออก", icon: "M15 13l-3 3m0 0l-3-3m3 3V8m0-5a9 9 0 110 18 9 9 0 010-18z" },
  { href: "/movements", label: "ประวัติสต็อก", desc: "บันทึกการเคลื่อนไหวสินค้า", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
];

const salesLinks = [
  { href: "/orders", label: "จัดส่ง", desc: "รายการสั่งซื้อและการจัดส่ง", icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" },
  { href: "/shipping", label: "ใบปะหน้า", desc: "พิมพ์ใบแปะกล่องพัสดุ", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { href: "/reports", label: "รายงาน", desc: "สรุปยอดขายและกำไร", icon: "M9 17v-2a4 4 0 00-4-4H3m14 0h-2a4 4 0 00-4 4v2m4-6a2 2 0 10-4 0v4m0 0H5a2 2 0 00-2 2v2h14v-2a2 2 0 00-2-2h-3" },
];

const tabLinks = [
  { href: "/", label: "หน้าแรก", icon: mainLinks[0].icon },
  { href: "/products", label: "สินค้า", icon: inventoryLinks[0].icon },
  { href: "/stock-out", label: "จ่ายสินค้า", icon: inventoryLinks[3].icon },
  { href: "/orders", label: "จัดส่ง", icon: salesLinks[0].icon },
];
const tabHrefs = new Set(tabLinks.map((t) => t.href));
const allLinks = [...mainLinks, ...inventoryLinks, ...salesLinks, { href: "/users", label: "จัดการผู้ใช้งาน" }];
const isTabActive = (href: string, pathname: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

export default function Navigation({ user }: { user?: NavUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isInventoryActive = inventoryLinks.some(link => pathname === link.href);
  const isSalesActive = salesLinks.some(link => pathname === link.href);

  const pageTitle = allLinks.find((l) => isTabActive(l.href, pathname))?.label ?? "MeeStock";
  const moreActive = !!user && !tabLinks.some((t) => isTabActive(t.href, pathname));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const [unreadCount, setUnreadCount] = useState(0);
  const [alertsOpen, setAlertsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    getUnreadAlertCount().then((count) => {
      setUnreadCount(count);
    });

    // Refresh count every 15 seconds
    const interval = setInterval(() => {
      getUnreadAlertCount().then((count) => {
        setUnreadCount(count);
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    startTransition(async () => {
      await logoutUser();
      router.push("/login");
      router.refresh();
    });
  };

  const roleLabel = user?.role === "owner" || user?.role === "admin" ? "Admin" : "Staff";
  const roleColor = user?.role === "owner" || user?.role === "admin"
    ? "bg-indigo-500/10 text-indigo-300 ring-indigo-400/20"
    : "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20";

  if (pathname === "/login") return null;

  return (
    <>
    <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-3 lg:h-16 lg:gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {user && <h1 className="truncate text-balance text-lg font-bold text-slate-900 lg:hidden">{pageTitle}</h1>}
            <Link href="/" className={`group items-center gap-2.5 ${user ? "hidden lg:flex" : "flex"}`}>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white">
                  <path d="m7.5 4.27 9 5.15" />
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                  <path d="M12 22V12" />
                </svg>
              </div>
              <span className="text-lg font-bold text-slate-900">
                MeeStock
              </span>
              <span className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                PRO
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1.5 flex-1 justify-center">
            {mainLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? "text-indigo-600 bg-indigo-50/80 shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                  </svg>
                  {link.label}
                </Link>
              );
            })}

            {/* คลังสินค้า Dropdown */}
            <div className="relative">
              <button
                onClick={() => setActiveDropdown(activeDropdown === "inventory" ? null : "inventory")}
                className={`flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-200 whitespace-nowrap ${
                  isInventoryActive
                    ? "text-indigo-600 bg-indigo-50/50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                คลังสินค้า
                <svg className={`w-3 h-3 text-slate-400 transition-transform ${activeDropdown === "inventory" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {activeDropdown === "inventory" && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                  <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl border border-slate-200/80 bg-white shadow-xl z-20 p-2 animate-in slide-in-from-top-2 duration-150 flex flex-col gap-0.5">
                    {inventoryLinks.map((link) => {
                      const isLinkActive = pathname === link.href;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setActiveDropdown(null)}
                          className={`group flex items-start gap-3 p-2 rounded-xl transition-all duration-200 ${
                            isLinkActive
                              ? "bg-indigo-50/80 text-indigo-600"
                              : "hover:bg-slate-50 text-slate-700 hover:text-slate-900"
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg transition-colors ${
                            isLinkActive
                              ? "bg-indigo-100 text-indigo-600"
                              : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700"
                          }`}>
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                            </svg>
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-semibold leading-normal">{link.label}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{link.desc}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* ขาย & ขนส่ง Dropdown */}
            <div className="relative">
              <button
                onClick={() => setActiveDropdown(activeDropdown === "sales" ? null : "sales")}
                className={`flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-200 whitespace-nowrap ${
                  isSalesActive
                    ? "text-indigo-600 bg-indigo-50/50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                ขาย & ขนส่ง
                <svg className={`w-3 h-3 text-slate-400 transition-transform ${activeDropdown === "sales" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {activeDropdown === "sales" && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                  <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl border border-slate-200/80 bg-white shadow-xl z-20 p-2 animate-in slide-in-from-top-2 duration-150 flex flex-col gap-0.5">
                    {salesLinks.map((link) => {
                      const isLinkActive = pathname === link.href;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setActiveDropdown(null)}
                          className={`group flex items-start gap-3 p-2 rounded-xl transition-all duration-200 ${
                            isLinkActive
                              ? "bg-indigo-50/80 text-indigo-600"
                              : "hover:bg-slate-50 text-slate-700 hover:text-slate-900"
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg transition-colors ${
                            isLinkActive
                              ? "bg-indigo-100 text-indigo-600"
                              : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700"
                          }`}>
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                            </svg>
                          </div>
                          <div className="text-left">
                            <p className="text-xs font-semibold leading-normal">{link.label}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{link.desc}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </nav>

          {/* Right side: User menu + Mobile toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Alerts Bell Icon */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setAlertsOpen(!alertsOpen)}
                  aria-label="การแจ้งเตือน"
                  className="tap-press flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 relative transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                  )}
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
            )}

            {/* User Menu */}
            {user && (
              <div className="relative hidden lg:block">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold text-slate-700 leading-tight">{user.displayName}</p>
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ring-1 ring-inset ${roleColor}`}>
                      {roleLabel}
                    </span>
                  </div>
                  <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl border border-slate-200 bg-white shadow-xl z-20 py-1.5 animate-in slide-in-from-top-2 duration-150">
                      {(user.role === "owner" || user.role === "admin") && (
                        <Link
                          href="/users"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          จัดการผู้ใช้งาน
                        </Link>
                      )}
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        onClick={handleLogout}
                        disabled={isPending}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {isPending ? "กำลังออก..." : "ออกจากระบบ"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

    </header>

      {user && (
        <>
          {/* Bottom tab bar (mobile/tablet) */}
          <nav
            aria-label="เมนูหลัก"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md lg:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <ul className="mx-auto grid max-w-2xl grid-cols-5">
              {tabLinks.map((tab) => {
                const active = isTabActive(tab.href, pathname);
                return (
                  <li key={tab.href}>
                    <Link
                      href={tab.href}
                      aria-current={active ? "page" : undefined}
                      className={`tap-press flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold ${
                        active ? "text-indigo-600" : "text-slate-500"
                      }`}
                    >
                      <span className={`flex h-7 w-14 items-center justify-center rounded-full transition-colors ${active ? "bg-indigo-100" : ""}`}>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                        </svg>
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
                  className={`tap-press flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-semibold ${
                    moreActive ? "text-indigo-600" : "text-slate-500"
                  }`}
                >
                  <span className={`flex h-7 w-14 items-center justify-center rounded-full transition-colors ${moreActive ? "bg-indigo-100" : ""}`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </span>
                  เพิ่มเติม
                </button>
              </li>
            </ul>
          </nav>

          {/* "More" bottom sheet */}
          {moreOpen && (
            <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="เมนูเพิ่มเติม">
              <div className="absolute inset-0 bg-slate-900/40 animate-in fade-in duration-150" onClick={() => setMoreOpen(false)} />
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
                                active ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-700"
                              }`}
                            >
                              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
                              </svg>
                              {link.label}
                            </Link>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                <div className="mb-3 flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{user.displayName}</p>
                    <p className="text-xs text-slate-500">{roleLabel}</p>
                  </div>
                </div>
                {(user.role === "owner" || user.role === "admin") && (
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
