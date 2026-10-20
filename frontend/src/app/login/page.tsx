"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginUser } from "@/lib/authActions";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRedirect = searchParams.get("redirect") || "/";
  // Only allow same-site relative paths (blocks "//host" open redirects)
  const redirect = /^\/(?!\/)/.test(requestedRedirect) ? requestedRedirect : "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await loginUser(username, password);
      if (result.success) {
        router.push(redirect);
        router.refresh();
      } else {
        setError(result.error || "เกิดข้อผิดพลาด");
      }
    });
  };

  return (
    <div className="relative overflow-hidden min-h-dvh bg-[#173d42] flex items-center justify-center p-4">

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#a8e6cb]/35 via-[#a8e6cb]/12 to-white/5 p-3 shadow-[0_16px_48px_-8px_rgba(168,230,203,0.5)] ring-1 ring-[#a8e6cb]/40 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="MeeStock" className="h-full w-full object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.35)]" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Mee<span className="text-[#a8e6cb]">Stock</span></h1>
          <p className="text-slate-400 text-sm mt-1">ระบบจัดการสต็อกร้านค้า</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-lg font-bold text-white mb-1">เข้าสู่ระบบ</h2>
          <p className="text-slate-400 text-xs mb-6">กรอกข้อมูลผู้ใช้งานของคุณ</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">ชื่อผู้ใช้งาน</label>
              <div className="relative">
                <div className="absolute left-3.5 top-4 text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  id="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 h-12 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#a8e6cb]/50 focus:border-[#a8e6cb]/50 transition-all"
                  placeholder="username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">รหัสผ่าน</label>
              <div className="relative">
                <div className="absolute left-3.5 top-4 text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 h-12 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#a8e6cb]/50 focus:border-[#a8e6cb]/50 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 text-rose-300 text-xs">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full h-12 rounded-xl bg-[#a8e6cb] hover:bg-[#c2f0da] text-[#173d42] font-bold text-sm shadow-lg shadow-teal-400/20 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                "เข้าสู่ระบบ"
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-5 pt-5 border-t border-white/10">
            <p className="text-center text-xs text-slate-500">
              บัญชี Demo: <span className="text-slate-400 font-mono">owner</span> / <span className="text-slate-400 font-mono">password</span>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          © {new Date().getFullYear()} MeeStock Pro. Secured with bcrypt.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="relative overflow-hidden min-h-dvh bg-[#173d42] flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-[#a8e6cb]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
