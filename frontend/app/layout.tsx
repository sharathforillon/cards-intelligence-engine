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
        {/* ── Top navigation bar ── */}
        <header
          style={{
            borderBottom: "1px solid #c4d2e1",
            background: "rgba(255,255,255,0.98)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            position: "sticky",
            top: 0,
            zIndex: 50,
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
          }}
        >
          <div className="flex w-full items-center justify-between px-5 py-3.5 lg:px-10">

            {/* Logo + wordmark */}
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #1d56db 0%, #1741b0 100%)",
                  boxShadow: "0 3px 10px rgba(37,99,235,0.35)",
                }}
              >
                CS
              </div>
              <div className="flex items-baseline gap-2.5">
                <span
                  className="font-heading text-base font-bold tracking-tight"
                  style={{ color: "#0d1f2f" }}
                >
                  Cards Strategy Engine
                </span>
                <span
                  className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] xl:inline"
                  style={{
                    color: "#3a5270",
                    borderLeft: "1px solid #c4d2e1",
                    paddingLeft: "10px",
                    marginLeft: "2px",
                  }}
                >
                  Head of Cards · UAE
                </span>
              </div>
            </div>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-0.5 lg:flex">
              {NAV_ITEMS.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "7px 14px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: active ? 700 : 500,
                      letterSpacing: "0.01em",
                      textDecoration: "none",
                      transition: "all 0.15s",
                      color: active ? "#1d56db" : "#1a3347",
                      background: active
                        ? "rgba(29,86,219,0.09)"
                        : "transparent",
                      borderBottom: active
                        ? "2px solid #1d56db"
                        : "2px solid transparent",
                    }}
                  >
                    {item.label}
                  </a>
                );
              })}
            </nav>

            {/* Right: live badge + mobile hamburger */}
            <div className="flex items-center gap-3">
              <div
                className="hidden items-center gap-2 rounded-full px-3.5 py-1.5 sm:flex"
                style={{
                  background: "rgba(4,120,87,0.08)",
                  border: "1px solid rgba(4,120,87,0.25)",
                  color: "#047857",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                }}
              >
                <span
                  className="dot-pulse h-2 w-2 rounded-full"
                  style={{ background: "#047857" }}
                />
                LIVE
              </div>

              {/* Mobile hamburger */}
              <button
                className="flex h-9 w-9 items-center justify-center rounded-xl lg:hidden"
                style={{
                  border: "1px solid #c4d2e1",
                  background: "#f0f5fa",
                  color: "#0d1f2f",
                  fontSize: 16,
                  fontWeight: 700,
                }}
                onClick={() => setNavOpen(!navOpen)}
                aria-label="Toggle navigation"
              >
                {navOpen ? "✕" : "☰"}
              </button>
            </div>
          </div>

          {/* Mobile nav dropdown */}
          {navOpen && (
            <div
              className="border-t px-5 py-4 lg:hidden"
              style={{ borderColor: "#c4d2e1", background: "#ffffff" }}
            >
              <div className="grid grid-cols-3 gap-2">
                {NAV_ITEMS.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className="rounded-xl px-2 py-2.5 text-center"
                      style={{
                        fontSize: "13px",
                        fontWeight: active ? 700 : 500,
                        color: active ? "#1d56db" : "#1a3347",
                        background: active
                          ? "rgba(29,86,219,0.09)"
                          : "#f0f5fa",
                        border: `1px solid ${active ? "rgba(29,86,219,0.25)" : "#c4d2e1"}`,
                        textDecoration: "none",
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
