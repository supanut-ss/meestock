import type { Metadata } from "next";
import Navigation from "@/components/Navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeeStock - ระบบจัดการสต็อกร้านค้าออนไลน์ยุคใหม่",
  description: "Mini stock management for online sellers - เรียบหรู ใช้งานง่าย รวดเร็ว และรองรับมือถือ 100%",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
        {/* Modern Navigation Header */}
        <Navigation />

        {/* Core Content Layout */}
        <main className="mx-auto w-full max-w-6xl flex-grow px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </main>

        {/* Modern Footer */}
        <footer className="border-t border-slate-200/80 bg-white/60 py-6 text-center text-xs text-slate-500 backdrop-blur-sm mt-auto">
          <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© {new Date().getFullYear()} MeeStock Pro. All rights reserved.</p>
            <p className="flex items-center gap-1.5">
              <span>Made with ❤️ for online sellers</span>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping"></span>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

