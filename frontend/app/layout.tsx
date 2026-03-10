import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Cards Strategy Command Center",
  description: "Fintech strategy intelligence for credit card portfolios.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${montserrat.variable} antialiased`}>
        {/* Top navigation bar */}
        <header
          style={{
            borderBottom: "1px solid #d1dde9",
            background: "rgba(255,255,255,0.96)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            position: "sticky",
            top: 0,
            zIndex: 50,
          }}
        >
          <div className="flex w-full items-center justify-between px-6 py-3 lg:px-10">
            {/* Logo + wordmark */}
            <div className="flex items-center gap-3">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                style={{
                  background:
                    "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
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
                  className="hidden text-[10px] font-medium uppercase tracking-[0.14em] sm:inline"
                  style={{ color: "#3d5570" }}
                >
                  Head of Cards · UAE
                </span>
              </div>
            </div>

            {/* Right side: nav + live badge */}
            <div className="flex items-center gap-3">
              <nav className="flex items-center gap-1">
                <a
                  href="/dashboard"
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 hover:bg-[rgba(37,99,235,0.06)] hover:text-[#1e2d3d]"
                  style={{ color: "#4a6480" }}
                >
                  Command Center
                </a>
                <a
                  href="/market"
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 hover:bg-[rgba(37,99,235,0.06)] hover:text-[#1e2d3d]"
                  style={{ color: "#4a6480" }}
                >
                  Market Intel
                </a>
                <a
                  href="/mashreq"
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 hover:bg-[rgba(37,99,235,0.06)] hover:text-[#1e2d3d]"
                  style={{ color: "#4a6480" }}
                >
                  Portfolio
                </a>
              </nav>

              {/* Live status badge */}
              <div
                className="hidden items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold sm:flex"
                style={{
                  background: "rgba(5,150,105,0.08)",
                  border: "1px solid rgba(5,150,105,0.22)",
                  color: "#059669",
                  letterSpacing: "0.08em",
                }}
              >
                <span
                  className="dot-pulse h-1.5 w-1.5 rounded-full"
                  style={{ background: "#059669" }}
                />
                LIVE
              </div>
            </div>
          </div>
        </header>

        {children}
      </body>
    </html>
  );
}
