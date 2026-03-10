"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

import ExecutiveInsight from "@/components/ExecutiveInsight";
import BattlefieldChart from "@/components/BattlefieldChart";
import PortfolioPanel from "@/components/PortfolioPanel";
import StrategyLeaderboard from "@/components/StrategyLeaderboard";
import StrategySandbox from "@/components/StrategySandbox";

type Pulse = "green" | "amber" | "red";

const pulseConfig = {
  green: {
    label: "Targets met",
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.25)",
  },
  amber: {
    label: "Margin compression",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
  },
  red: {
    label: "Competitor threat",
    color: "#f43f5e",
    bg: "rgba(244,63,94,0.08)",
    border: "rgba(244,63,94,0.25)",
  },
};

export default function Dashboard() {
  const [nim, setNim] = useState<number | null>(null);
  const [roe, setRoe] = useState<number | null>(null);
  const [raroc, setRaroc] = useState<number | null>(null);
  const [activeCards, setActiveCards] = useState<number | null>(null);
  const [cac, setCac] = useState<number | null>(null);
  const [loadingHeader, setLoadingHeader] = useState(false);

  const strategyPulse: Pulse = useMemo(() => {
    if (raroc === null || roe === null) return "amber";
    if (raroc >= 20 && roe >= 22) return "green";
    if (raroc >= 15) return "amber";
    return "red";
  }, [raroc, roe]);

  async function loadPortfolioSnapshot() {
    setLoadingHeader(true);
    try {
      const res = await fetch("http://localhost:8000/portfolio/cards");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const totalActive = data.reduce(
          (sum: number, c: any) => sum + (c.active_cards || 0),
          0
        );
        const totalSpend = data.reduce(
          (sum: number, c: any) => sum + (c.monthly_spend || 0),
          0
        );
        setActiveCards(totalActive);
        setNim(totalSpend > 0 ? 0.038 : 0.036);
        setRoe(21.4);
        setRaroc(19.1);
        setCac(412);
      } else {
        setActiveCards(null);
      }
    } catch (e) {
      console.error("Failed to load portfolio snapshot", e);
    } finally {
      setLoadingHeader(false);
    }
  }

  useEffect(() => {
    loadPortfolioSnapshot();
  }, []);

  const pulse = pulseConfig[strategyPulse];

  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <div className="flex w-full flex-col gap-6 px-6 py-7 lg:px-10">

        {/* ── COMMAND HEADER ─────────────────────────────── */}
        <header className="space-y-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p
                className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{ color: "#8fa5b8" }}
              >
                Cards Strategy · Command Center
              </p>
              <h1
                className="font-heading text-2xl font-bold tracking-tight"
                style={{ color: "#1e2d3d" }}
              >
                UAE Credit Card Intelligence
              </h1>
              <p
                className="mt-1 text-sm"
                style={{ color: "#4a6480" }}
              >
                Bloomberg-grade cockpit for GCC strategy — market intelligence,
                capital efficiency, and AI-guided simulations.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {/* Strategy Pulse */}
              <div
                className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold"
                style={{
                  background: pulse.bg,
                  border: `1px solid ${pulse.border}`,
                  color: pulse.color,
                }}
              >
                <span
                  className="dot-pulse h-1.5 w-1.5 rounded-full"
                  style={{ background: pulse.color }}
                />
                Strategy Pulse
                <span
                  className="font-normal"
                  style={{ color: pulse.color, opacity: 0.75 }}
                >
                  · {pulse.label}
                </span>
              </div>

              <button
                onClick={loadPortfolioSnapshot}
                className="btn-primary"
                disabled={loadingHeader}
              >
                {loadingHeader ? "Scanning…" : "↺ Refresh"}
              </button>
            </div>
          </div>

          {/* ── KPI METRIC TILES ─────────────────────────── */}
          <motion.div
            className="grid gap-3 sm:grid-cols-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <MetricTile
              label="Portfolio NIM"
              value={nim !== null ? `${(nim * 100).toFixed(1)}%` : "—"}
              helper="Net interest margin"
              tone="emerald"
            />
            <MetricTile
              label="ROE"
              value={roe !== null ? `${roe.toFixed(1)}%` : "—"}
              helper="Return on equity"
              tone="emerald"
            />
            <MetricTile
              label="RAROC"
              value={raroc !== null ? `${raroc.toFixed(1)}%` : "—"}
              helper="Risk-adjusted return"
              tone={raroc !== null && raroc < 18 ? "rose" : "emerald"}
              alert={raroc !== null && raroc < 18}
            />
            <MetricTile
              label="Active Cards"
              value={
                activeCards !== null
                  ? Intl.NumberFormat("en-US", {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(activeCards)
                  : "—"
              }
              helper="Total portfolio"
              tone="blue"
            />
            <MetricTile
              label="Blended CAC"
              value={cac !== null ? `AED ${cac}` : "—"}
              helper="Acquisition cost"
              tone="amber"
            />
          </motion.div>
        </header>

        {/* ── SECTION 1 ─────────────────────────────────── */}
        <section className="grid gap-5 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <ExecutiveInsight />
          </div>
          <div className="lg:col-span-5">
            <StrategySandbox />
          </div>
        </section>

        {/* ── SECTION 2 ─────────────────────────────────── */}
        <section className="grid gap-5 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <BattlefieldChart />
          </div>
          <div className="space-y-5 lg:col-span-5">
            <PortfolioPanel />
            <StrategyLeaderboard />
          </div>
        </section>
      </div>
    </div>
  );
}

type MetricTone = "emerald" | "rose" | "blue" | "amber" | "violet";

const toneMap: Record<
  MetricTone,
  { value: string; bg: string; border: string; topBorder: string }
> = {
  emerald: {
    value:     "#059669",
    bg:        "rgba(5,150,105,0.06)",
    border:    "rgba(5,150,105,0.15)",
    topBorder: "#059669",
  },
  rose: {
    value:     "#e11d48",
    bg:        "rgba(225,29,72,0.06)",
    border:    "rgba(225,29,72,0.15)",
    topBorder: "#e11d48",
  },
  blue: {
    value:     "#2563eb",
    bg:        "rgba(37,99,235,0.06)",
    border:    "rgba(37,99,235,0.15)",
    topBorder: "#2563eb",
  },
  amber: {
    value:     "#d97706",
    bg:        "rgba(217,119,6,0.06)",
    border:    "rgba(217,119,6,0.15)",
    topBorder: "#d97706",
  },
  violet: {
    value:     "#7c3aed",
    bg:        "rgba(124,58,237,0.06)",
    border:    "rgba(124,58,237,0.15)",
    topBorder: "#7c3aed",
  },
};

function MetricTile({
  label,
  value,
  helper,
  tone = "blue",
  alert = false,
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: MetricTone;
  alert?: boolean;
}) {
  const t = toneMap[tone];
  return (
    <div
      className="flex flex-col rounded-xl px-4 py-3"
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderTop: `2px solid ${t.topBorder}`,
      }}
    >
      <span
        className="text-[10px] font-bold uppercase tracking-[0.16em]"
        style={{ color: "#8fa5b8" }}
      >
        {label}
      </span>
      <span
        className="mt-1.5 text-xl font-bold tabular-nums"
        style={{ color: t.value }}
      >
        {value}
      </span>
      {helper && (
        <span className="mt-0.5 text-[11px]" style={{ color: "#8fa5b8" }}>
          {helper}
        </span>
      )}
      {alert && (
        <span
          className="mt-1 text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: "#f43f5e" }}
        >
          ↓ Below hurdle
        </span>
      )}
    </div>
  );
}
