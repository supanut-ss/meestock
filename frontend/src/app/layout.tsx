import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeeStock",
  description: "Mini stock management for online sellers",
};

const links = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/shipping", label: "Shipping" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-zinc-50 text-zinc-900">
        <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
            <p className="font-bold">MeeStock</p>
            <nav className="flex items-center gap-3 text-sm">
              {links.map((link) => (
                <Link key={link.href} href={link.href} className="px-2 py-1 rounded hover:bg-zinc-100">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-4 md:p-6">{children}</main>
      </body>
    </html>
  );
}
