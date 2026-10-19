import type { Metadata, Viewport } from "next";
import Navigation from "@/components/Navigation";
import { getCurrentUser } from "@/lib/authActions";
import ThemeProvider from "@/components/providers/ThemeProvider";
import { NotificationProvider } from "@/components/ui/NotificationProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeeStock - ระบบจัดการสต็อกร้านค้าออนไลน์ยุคใหม่",
  description: "Mini stock management for online sellers - เรียบหรู ใช้งานง่าย รวดเร็ว และรองรับมือถือ 100%",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111312",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  const navUser = user ? { displayName: user.displayName, role: user.role } : null;

  return (
    <html lang="th" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Prompt:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-[#f3f4f1] text-slate-900 font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
        <ThemeProvider>
          <NotificationProvider>
            {/* Modern Navigation Header */}
            <Navigation user={navUser} />

            {/* Core Content Layout */}
            <div className={`flex flex-grow flex-col ${navUser ? "lg:pl-64" : ""}`}>
              <main className={`mx-auto w-full max-w-[88rem] flex-grow px-4 sm:px-6 lg:px-8 lg:py-6 ${navUser ? "pt-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-8" : ""}`}>
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {children}
                </div>
              </main>

              <footer className="mt-auto hidden px-8 pb-5 text-xs text-slate-400 lg:block">
                © {new Date().getFullYear()} MeeStock Pro
              </footer>
            </div>
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
