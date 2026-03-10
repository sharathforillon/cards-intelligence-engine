"use client";

import { Inter, Montserrat } from "next/font/google";
import { usePathname } from "next/navigation";
import { useState } from "react";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

const NAV_ITEMS = [
  { href: "/dashboard",  label: "Command Center" },
  { href: "/market",     label: "Market Intel" },
  { href: "/segments",   label: "Segments" },
  { href: "/categories", label: "Categories" },
  { href: "/mashreq",    label: "Portfolio" },
  { href: "/launch",     label: "Launch Sim" },
  { href: "/funnel",     label: "Acquisition" },
  { href: "/advisor",    label: "AI Advisor" },
  { href: "/executive",  label: "Executive" },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <html lang="en">
      <head>
        <title>Cards Strategy Command Center</title>
        <meta name="description" content="Fintech strategy intelligence for credit card portfolios." />
      </head>
      <body className={`${inter.variable} ${montserrat.variable} antialiased`}>
        {/* Top navigation bar */}
        <header
          style={{
            borderBottom: "1px solid #d1dde9",
            background: "rgba(255,255,255,0.97)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            position: "sticky",
            top: 0,
            zIndex: 50,
          }}
        >
          <div className="flex w-full items-center justify-between px-4 py-2.5 lg:px-8">
            {/* Logo + wordmark */}
            <div className="flex items-center gap-3">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
                }}
              >
                CS
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className="font-heading text-sm font-bold tracking-tight"
                  style={{ color: "#1e2d3d" }}
                >
                  Cards Strategy Engine
                </span>
                <span
                  className="hidden text-[10px] font-medium uppercase tracking-[0.14em] xl:inline"
                  style={{ color: "#3d5570" }}
                >
                  Head of Cards · UAE
                </span>
              </div>
            </div>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-0.5 lg:flex">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all duration-150"
                    style={{
                      color: active ? "#2563eb" : "#4a6480",
                      background: active ? "rgba(37,99,235,0.08)" : "transparent",
                      fontWeight: active ? 700 : 500,
                    }}
                  >
                    {item.label}
                  </a>
                );
              })}
            </nav>

            {/* Right: live badge + mobile hamburger */}
            <div className="flex items-center gap-2">
              <div
                className="hidden items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold sm:flex"
                style={{
                  background: "rgba(5,150,105,0.08)",
                  border: "1px solid rgba(5,150,105,0.22)",
                  color: "#059669",
                  letterSpacing: "0.08em",
                }}
              >
                <span className="dot-pulse h-1.5 w-1.5 rounded-full" style={{ background: "#059669" }} />
                LIVE
              </div>

              {/* Mobile hamburger */}
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg lg:hidden"
                style={{ border: "1px solid #d1dde9", background: "#f8fafc" }}
                onClick={() => setNavOpen(!navOpen)}
                aria-label="Toggle navigation"
              >
                <span style={{ fontSize: 14 }}>{navOpen ? "✕" : "☰"}</span>
              </button>
            </div>
          </div>

          {/* Mobile nav dropdown */}
          {navOpen && (
            <div
              className="border-t px-4 py-3 lg:hidden"
              style={{ borderColor: "#d1dde9", background: "#ffffff" }}
            >
              <div className="grid grid-cols-3 gap-1">
                {NAV_ITEMS.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className="rounded-lg px-2 py-2 text-center text-[11px] font-medium"
                      style={{
                        color: active ? "#2563eb" : "#4a6480",
                        background: active ? "rgba(37,99,235,0.08)" : "#f8fafc",
                        border: "1px solid #d1dde9",
                        fontWeight: active ? 700 : 500,
                      }}
                      onClick={() => setNavOpen(false)}
                    >
                      {item.label}
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </header>

        {children}
      </body>
    </html>
  );
}
