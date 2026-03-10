"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

import ExecutiveInsight from "@/components/ExecutiveInsight";
import BattlefieldChart from "@/components/BattlefieldChart";
import PortfolioPanel from "@/components/PortfolioPanel";
import StrategyLeaderboard from "@/components/StrategyLeaderboard";
import StrategySandbox from "@/components/StrategySandbox";
import { useCachedFetch } from "@/hooks/useCachedFetch";

type Pulse = "green" | "amber" | "red";

type PortfolioCard = {
  card_name: string;
  active_cards: number;
  monthly_spend: number;
};

type SegmentRow = {
  label: string;
  tier: string;
  tier_badge_color: string;
  tier_color: string;
  profit_per_customer: number;
  cards_issued: number;
  rank: number;
};

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
  // Real portfolio data — no hardcoded fallbacks
  const {
    data: portfolioCards,
    loading: loadingHeader,
    refresh: refreshHeader,
  } = useCachedFetch<PortfolioCard[]>(
    "api:portfolio/cards",
    () => fetch("http://localhost:8000/portfolio/cards").then((r) => r.json()),
  );

  // Derive active card count from real data only
  const activeCards = useMemo(
    () =>
      portfolioCards && portfolioCards.length > 0
        ? portfolioCards.reduce((sum, c) => sum + (c.active_cards || 0), 0)
        : null,
    [portfolioCards],
  );

  // NIM, ROE, RAROC, CAC: no dedicated backend endpoint yet — show "—"
  // Using useState so TypeScript does not narrow the type to `never` on the null literal.
  // These will be wired to a real API once the endpoint is built.
  const [nim]   = useState<number | null>(null);
  const [roe]   = useState<number | null>(null);
  const [raroc] = useState<number | null>(null);
  const [cac]   = useState<number | null>(null);

  const strategyPulse: Pulse = useMemo(() => {
    if (raroc === null || roe === null) return "amber";
    if (raroc >= 20 && roe >= 22) return "green";
    if (raroc >= 15) return "amber";
    return "red";
  }, [raroc, roe]);

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
                style={{ color: "#3d5570" }}
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
                onClick={refreshHeader}
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

        {/* ── SECTION 3: Segment summary + AI quick-chat ── */}
        <section className="grid gap-5 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SegmentSummaryWidget />
          </div>
          <div className="lg:col-span-7">
            <AIAdvisorWidget />
          </div>
        </section>
      </div>
    </div>
  );
}

/* ── Segment Summary Widget ──────────────────────────────── */

function SegmentSummaryWidget() {
  const { data } = useCachedFetch<SegmentRow[]>(
    "api:segments/profitability",
    () =>
      fetch("http://localhost:8000/segments/profitability").then((r) => r.json()),
  );
  const segments = useMemo(() => data?.slice(0, 3) ?? [], [data]);

  return (
    <div
      className="panel"
      style={{ borderTop: "2px solid #7c3aed" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#2d4259" }}>
          Top Segments by Profit
        </h2>
        <a href="/segments" className="text-[10px] font-semibold" style={{ color: "#2563eb" }}>
          View All →
        </a>
      </div>
      <div className="space-y-2">
        {segments.map((seg) => (
          <div
            key={seg.rank}
            className="flex items-center justify-between rounded-xl px-3 py-2.5"
            style={{ background: "#f8fafc", border: "1px solid #d1dde9" }}
          >
            <div className="flex items-center gap-2">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ background: seg.tier_color }}
              >
                {seg.rank}
              </span>
              <div>
                <p className="text-xs font-bold" style={{ color: "#1e2d3d" }}>{seg.label}</p>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white"
                  style={{ background: seg.tier_badge_color }}
                >
                  {seg.tier}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold tabular-nums" style={{ color: "#2563eb" }}>
                AED {seg.profit_per_customer.toFixed(0)}/mo
              </p>
              <p className="text-[10px]" style={{ color: "#4a6480" }}>
                {seg.cards_issued.toLocaleString("en-US")} cards
              </p>
            </div>
          </div>
        ))}
        {segments.length === 0 && (
          <p className="py-4 text-center text-xs" style={{ color: "#3d5570" }}>
            Data not available.
          </p>
        )}
      </div>
    </div>
  );
}

/* ── AI Advisor Widget ───────────────────────────────────── */

function AIAdvisorWidget() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<{
    recommended_action?: string;
    rationale?: string;
    profit_impact_aed?: number;
    confidence?: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask() {
    if (!query.trim()) return;
    setLoading(true);
    setResponse(null);
    try {
      const data = await fetch("http://localhost:8000/advisor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      }).then((r) => r.json());
      setResponse(data);
    } catch {
      setResponse({ recommended_action: "AI advisor unavailable." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel" style={{ borderTop: "2px solid #2563eb" }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#2d4259" }}>
          AI Strategy Quick Question
        </h2>
        <a href="/advisor" className="text-[10px] font-semibold" style={{ color: "#2563eb" }}>
          Full Advisor →
        </a>
      </div>
      <div className="flex gap-2">
        <input
          className="input-dark flex-1 text-xs"
          placeholder="e.g. Which segment has the highest churn risk?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          disabled={loading}
        />
        <button className="btn-primary" onClick={ask} disabled={loading || !query.trim()}>
          {loading ? "…" : "Ask"}
        </button>
      </div>
      {response && (
        <div className="mt-3 rounded-xl p-3" style={{ background: "#f8fafc", border: "1px solid #d1dde9" }}>
          {response.recommended_action && (
            <div
              className="mb-2 rounded-lg px-3 py-2"
              style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.22)" }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "#d97706" }}>
                Recommended Action
              </p>
              <p className="mt-0.5 text-xs font-semibold" style={{ color: "#1e2d3d" }}>
                {response.recommended_action}
              </p>
            </div>
          )}
          {response.rationale && (
            <p className="text-xs leading-relaxed" style={{ color: "#2d4a62" }}>
              {response.rationale}
            </p>
          )}
          {response.profit_impact_aed !== undefined && (
            <p className="mt-2 text-[10px] font-semibold" style={{ color: "#059669" }}>
              Estimated profit impact: AED {(response.profit_impact_aed / 1e6).toFixed(1)}M/yr
              {response.confidence !== undefined && ` · ${Math.round(response.confidence * 100)}% confidence`}
            </p>
          )}
        </div>
      )}
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
        style={{ color: "#3d5570" }}
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
        <span className="mt-0.5 text-[11px]" style={{ color: "#3d5570" }}>
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
