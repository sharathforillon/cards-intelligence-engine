"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

import ExecutiveInsight from "@/components/ExecutiveInsight";
import BattlefieldChart from "@/components/BattlefieldChart";
import PortfolioPanel from "@/components/PortfolioPanel";
import StrategyLeaderboard from "@/components/StrategyLeaderboard";
import StrategySandbox from "@/components/StrategySandbox";
import { useCachedFetch } from "@/hooks/useCachedFetch";

/* ── Types ─────────────────────────────────────────────────────────────── */

type PortfolioCard = {
  card_name: string;
  active_cards: number;
  monthly_spend: number;
};

type SegmentRow = {
  label: string;
  icon: string;
  tier: string;
  tier_badge_color: string;
  tier_color: string;
  profit_per_customer: number;
  cards_issued: number;
  churn_rate: number;
  rank: number;
};

type FunnelMetrics = {
  total_applications: number;
  total_issued: number;
  total_active: number;
  blended_cac: number;
  overall_conversion_pct: number;
};

type CategoryMetric = {
  key: string;
  label: string;
  icon: string;
  opportunity_index: number;
  underperforming: boolean;
  mashreq_rate: number;
  market_leader_rate: number;
  market_leader_bank: string;
};

/* ── Helpers ────────────────────────────────────────────────────────────── */

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */

export default function Dashboard() {
  const { data: portfolioCards, loading: loadingPortfolio, refresh: refreshPortfolio } =
    useCachedFetch<PortfolioCard[]>(
      "api:portfolio/cards",
      () => fetch("http://localhost:8000/portfolio/cards").then((r) => r.json()),
    );

  const { data: segments } = useCachedFetch<SegmentRow[]>(
    "api:segments/profitability",
    () => fetch("http://localhost:8000/segments/profitability").then((r) => r.json()),
  );

  const { data: funnel } = useCachedFetch<FunnelMetrics>(
    "api:funnel/metrics",
    () => fetch("http://localhost:8000/funnel/metrics").then((r) => r.json()),
  );

  const { data: categories } = useCachedFetch<CategoryMetric[]>(
    "api:categories/metrics",
    () => fetch("http://localhost:8000/categories/metrics").then((r) => r.json()),
  );

  const activeCards = useMemo(
    () => portfolioCards?.reduce((s, c) => s + (c.active_cards || 0), 0) ?? null,
    [portfolioCards],
  );

  const totalSpend = useMemo(
    () => portfolioCards?.reduce((s, c) => s + (c.monthly_spend || 0), 0) ?? null,
    [portfolioCards],
  );

  const topSegments = useMemo(() => segments?.slice(0, 5) ?? [], [segments]);
  const criticalCategories = useMemo(
    () => (categories ?? []).filter((c) => c.opportunity_index >= 0.4).slice(0, 3),
    [categories],
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <div className="flex w-full flex-col gap-5 px-6 py-6 lg:px-10">

        {/* ── COMMAND HEADER ─────────────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "#3d5570" }}>
              Cards Strategy · UAE Credit Card Intelligence
            </p>
            <h1 className="font-heading mt-0.5 text-2xl font-bold tracking-tight" style={{ color: "#0d1f2f" }}>
              Command Center
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold"
              style={{ background: "rgba(4,120,87,0.09)", border: "1px solid rgba(4,120,87,0.25)", color: "#047857" }}
            >
              <span className="dot-pulse h-1.5 w-1.5 rounded-full" style={{ background: "#047857" }} />
              LIVE DATA
            </div>
            <button
              onClick={refreshPortfolio}
              className="btn-primary"
              disabled={loadingPortfolio}
              style={{ fontSize: 12, padding: "6px 14px" }}
            >
              {loadingPortfolio ? "↺" : "↺ Refresh"}
            </button>
          </div>
        </motion.header>

        {/* ── KPI STRIP ──────────────────────────────────────────────────── */}
        <motion.div
          className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-6"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          {[
            {
              label: "Active Cards",
              value: activeCards !== null ? Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(activeCards) : "—",
              sub: "Portfolio total",
              color: "#2563eb",
              bg: "rgba(37,99,235,0.07)",
              border: "rgba(37,99,235,0.2)",
              href: "/mashreq",
            },
            {
              label: "Monthly Spend",
              value: totalSpend !== null ? `AED ${fmt(totalSpend)}` : "—",
              sub: "Total card volume",
              color: "#059669",
              bg: "rgba(5,150,105,0.07)",
              border: "rgba(5,150,105,0.2)",
              href: "/mashreq",
            },
            {
              label: "Blended CAC",
              value: funnel ? `AED ${funnel.blended_cac.toLocaleString("en-US")}` : "—",
              sub: "Acquisition cost",
              color: "#d97706",
              bg: "rgba(217,119,6,0.07)",
              border: "rgba(217,119,6,0.2)",
              href: "/funnel",
            },
            {
              label: "Funnel Conv.",
              value: funnel ? `${funnel.overall_conversion_pct}%` : "—",
              sub: "App → active spender",
              color: "#7c3aed",
              bg: "rgba(124,58,237,0.07)",
              border: "rgba(124,58,237,0.2)",
              href: "/funnel",
            },
            {
              label: "Category Gaps",
              value: criticalCategories.length > 0 ? `${criticalCategories.length} critical` : categories ? "All clear" : "—",
              sub: "High opportunity",
              color: criticalCategories.length > 0 ? "#e11d48" : "#059669",
              bg: criticalCategories.length > 0 ? "rgba(225,29,72,0.07)" : "rgba(5,150,105,0.07)",
              border: criticalCategories.length > 0 ? "rgba(225,29,72,0.2)" : "rgba(5,150,105,0.2)",
              href: "/categories",
            },
            {
              label: "Segments",
              value: topSegments.length > 0 ? `${topSegments.length} tracked` : "—",
              sub: "Profitability ranked",
              color: "#0891b2",
              bg: "rgba(8,145,178,0.07)",
              border: "rgba(8,145,178,0.2)",
              href: "/segments",
            },
          ].map((kpi) => (
            <Link key={kpi.label} href={kpi.href} style={{ textDecoration: "none" }}>
              <div
                className="flex cursor-pointer flex-col rounded-xl px-4 py-3 transition-transform hover:-translate-y-0.5"
                style={{
                  background: kpi.bg,
                  border: `1px solid ${kpi.border}`,
                  borderTop: `2px solid ${kpi.color}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: "#3d5570" }}>
                  {kpi.label}
                </span>
                <span className="mt-1 text-xl font-bold tabular-nums leading-tight" style={{ color: kpi.color }}>
                  {kpi.value}
                </span>
                <span className="mt-0.5 text-[10px]" style={{ color: "#3d5570" }}>{kpi.sub}</span>
              </div>
            </Link>
          ))}
        </motion.div>

        {/* ── SECTION 1: Battlefield + Executive Intelligence ─────────────── */}
        <section className="grid gap-5 lg:grid-cols-12">
          <motion.div
            className="lg:col-span-7"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <BattlefieldChart />
          </motion.div>
          <motion.div
            className="lg:col-span-5"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <ExecutiveInsight />
          </motion.div>
        </section>

        {/* ── SECTION 2: Segment Snapshot + Category Alert + Funnel ──────── */}
        <section className="grid gap-5 lg:grid-cols-12">

          {/* Segment Snapshot */}
          <motion.div
            className="lg:col-span-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <SegmentSnapshotPanel segments={topSegments} />
          </motion.div>

          {/* Category Intelligence Alert */}
          <motion.div
            className="lg:col-span-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <CategoryAlertPanel categories={categories ?? []} />
          </motion.div>

          {/* Funnel Snapshot */}
          <motion.div
            className="lg:col-span-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
          >
            <FunnelSnapshotPanel funnel={funnel} />
          </motion.div>
        </section>

        {/* ── SECTION 3: Portfolio + Strategy Tools ──────────────────────── */}
        <section className="grid gap-5 lg:grid-cols-12">
          <motion.div
            className="lg:col-span-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className="space-y-5">
              <PortfolioPanel />
              <StrategyLeaderboard />
            </div>
          </motion.div>
          <motion.div
            className="lg:col-span-7"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
          >
            <div className="space-y-5">
              <StrategySandbox />
              <AIAdvisorWidget />
            </div>
          </motion.div>
        </section>

      </div>
    </div>
  );
}

/* ── Segment Snapshot Panel ─────────────────────────────────────────────── */

function SegmentSnapshotPanel({ segments }: { segments: SegmentRow[] }) {
  const maxProfit = useMemo(() => Math.max(...segments.map((s) => s.profit_per_customer), 1), [segments]);

  return (
    <div className="panel h-full" style={{ borderTop: "2px solid #7c3aed" }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#0d1f2f" }}>
          Segment Intelligence
        </h2>
        <Link href="/segments" className="text-[10px] font-semibold" style={{ color: "#7c3aed" }}>
          Deep Dive →
        </Link>
      </div>

      {segments.length === 0 ? (
        <p className="py-6 text-center text-xs" style={{ color: "#3d5570" }}>Loading segments…</p>
      ) : (
        <div className="space-y-2.5">
          {segments.map((seg) => {
            const barPct = (seg.profit_per_customer / maxProfit) * 100;
            return (
              <div key={seg.rank} className="rounded-xl p-2.5" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                      style={{ background: seg.tier_color }}
                    >
                      {seg.rank}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold" style={{ color: "#0d1f2f" }}>
                        {seg.icon} {seg.label}
                      </p>
                      <span
                        className="rounded-sm px-1.5 py-0.5 text-[9px] font-bold text-white"
                        style={{ background: seg.tier_badge_color }}
                      >
                        {seg.tier}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-bold tabular-nums" style={{ color: seg.tier_color }}>
                      AED {seg.profit_per_customer.toFixed(0)}
                    </p>
                    <p className="text-[9px]" style={{ color: "#4a6480" }}>/mo profit</p>
                  </div>
                </div>
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full" style={{ background: "#e2e8f0" }}>
                  <div
                    className="h-1 rounded-full"
                    style={{ width: `${barPct}%`, background: seg.tier_color, transition: "width 0.6s ease" }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[9px]" style={{ color: "#4a6480" }}>
                  <span>{seg.cards_issued.toLocaleString("en-US")} cards</span>
                  <span style={{ color: seg.churn_rate > 0.2 ? "#e11d48" : "#059669" }}>
                    {(seg.churn_rate * 100).toFixed(0)}% churn
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Category Alert Panel ───────────────────────────────────────────────── */

function CategoryAlertPanel({ categories }: { categories: CategoryMetric[] }) {
  const sorted = useMemo(
    () => [...categories].sort((a, b) => b.opportunity_index - a.opportunity_index),
    [categories],
  );

  function sevColor(opp: number) {
    if (opp >= 0.6) return "#e11d48";
    if (opp >= 0.4) return "#f59e0b";
    if (opp >= 0.2) return "#eab308";
    return "#059669";
  }

  return (
    <div className="panel h-full" style={{ borderTop: "2px solid #e11d48" }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#0d1f2f" }}>
          Category Reward Gaps
        </h2>
        <Link href="/categories" className="text-[10px] font-semibold" style={{ color: "#e11d48" }}>
          Full Analysis →
        </Link>
      </div>

      {sorted.length === 0 ? (
        <p className="py-6 text-center text-xs" style={{ color: "#3d5570" }}>Loading categories…</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((cat) => {
            const color = sevColor(cat.opportunity_index);
            const gapPP = ((cat.market_leader_rate - cat.mashreq_rate) * 100).toFixed(1);
            const mashreqPct = cat.mashreq_rate * 100;
            const leaderPct = cat.market_leader_rate * 100;
            const maxPct = Math.max(leaderPct, 0.01);
            return (
              <div
                key={cat.key}
                className="rounded-xl p-2.5"
                style={{ background: `${color}06`, border: `1px solid ${color}20` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: 13 }}>{cat.icon}</span>
                    <span className="text-xs font-bold" style={{ color: "#0d1f2f" }}>
                      {cat.label.replace(" & Restaurants", "").replace(" Shopping", "")}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold" style={{ color }}>+{gapPP}pp gap</span>
                </div>
                <div className="mt-1.5 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-12 shrink-0 text-right text-[9px] font-bold" style={{ color: "#1d56db" }}>Mashreq</span>
                    <div className="flex-1">
                      <div className="h-2 w-full rounded-full" style={{ background: "rgba(29,86,219,0.1)" }}>
                        <div className="h-2 rounded-full" style={{ width: `${(mashreqPct / maxPct) * 100}%`, background: "#1d56db" }} />
                      </div>
                    </div>
                    <span className="w-7 shrink-0 text-right text-[9px] font-bold tabular-nums" style={{ color: "#1d56db" }}>
                      {mashreqPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-12 shrink-0 overflow-hidden text-ellipsis text-right text-[9px] font-semibold whitespace-nowrap" style={{ color: "#6b7280" }}>
                      {cat.market_leader_bank.split(" ")[0]}
                    </span>
                    <div className="flex-1">
                      <div className="h-2 w-full rounded-full" style={{ background: `${color}15` }}>
                        <div className="h-2 rounded-full" style={{ width: "100%", background: color }} />
                      </div>
                    </div>
                    <span className="w-7 shrink-0 text-right text-[9px] font-bold tabular-nums" style={{ color }}>
                      {leaderPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Funnel Snapshot Panel ──────────────────────────────────────────────── */

function FunnelSnapshotPanel({ funnel }: { funnel: FunnelMetrics | null }) {
  return (
    <div className="panel h-full" style={{ borderTop: "2px solid #059669" }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#0d1f2f" }}>
          Acquisition Funnel
        </h2>
        <Link href="/funnel" className="text-[10px] font-semibold" style={{ color: "#059669" }}>
          Full View →
        </Link>
      </div>

      {!funnel ? (
        <p className="py-6 text-center text-xs" style={{ color: "#3d5570" }}>Loading funnel…</p>
      ) : (
        <>
          {/* End-to-end conversion badge */}
          <div
            className="mb-4 rounded-xl px-3 py-2.5 text-center"
            style={{ background: "rgba(5,150,105,0.07)", border: "1px solid rgba(5,150,105,0.2)" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#3d5570" }}>
              End-to-End Conversion
            </p>
            <p className="mt-0.5 text-3xl font-bold tabular-nums" style={{ color: "#059669" }}>
              {funnel.overall_conversion_pct}%
            </p>
            <p className="text-[10px]" style={{ color: "#4a6480" }}>Applications → Active Spenders</p>
          </div>

          {/* Mini funnel steps */}
          {[
            { label: "Applications", value: funnel.total_applications, color: "#2563eb" },
            { label: "Cards Issued", value: funnel.total_issued, color: "#7c3aed" },
            { label: "Active Spenders", value: funnel.total_active, color: "#059669" },
          ].map((step, _i, arr) => {
            const widthPct = (step.value / Math.max(arr[0].value, 1)) * 100;
            return (
              <div key={step.label} className="mb-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-semibold" style={{ color: "#3d5570" }}>{step.label}</span>
                  <span className="text-[11px] font-bold tabular-nums" style={{ color: step.color }}>
                    {step.value.toLocaleString("en-US")}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ background: "#e2e8f0" }}>
                  <div
                    className="h-2.5 rounded-full"
                    style={{ width: `${widthPct}%`, background: step.color, transition: "width 0.7s ease" }}
                  />
                </div>
              </div>
            );
          })}

          {/* CAC */}
          <div
            className="mt-3 flex items-center justify-between rounded-lg px-3 py-2"
            style={{ background: "rgba(217,119,6,0.07)", border: "1px solid rgba(217,119,6,0.2)" }}
          >
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#3d5570" }}>Blended CAC</span>
            <span className="text-sm font-bold tabular-nums" style={{ color: "#d97706" }}>
              AED {funnel.blended_cac.toLocaleString("en-US")}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/* ── AI Advisor Widget ──────────────────────────────────────────────────── */

function AIAdvisorWidget() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<{
    recommended_action?: string;
    rationale?: string;
    profit_impact_aed?: number;
    confidence?: number;
    key_risks?: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(q?: string) {
    const finalQuery = q ?? query;
    if (!finalQuery.trim()) return;
    setLoading(true);
    setResponse(null);
    if (!q) setQuery(finalQuery);
    try {
      const data = await fetch("http://localhost:8000/advisor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: finalQuery }),
      }).then((r) => r.json());
      setResponse(data);
    } catch {
      setResponse({ recommended_action: "AI advisor unavailable. Check backend." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel" style={{ borderTop: "2px solid #2563eb" }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#0d1f2f" }}>
          AI Strategy Quick-Ask
        </h2>
        <Link href="/advisor" className="text-[10px] font-semibold" style={{ color: "#2563eb" }}>
          Full Advisor →
        </Link>
      </div>

      <div className="flex gap-2">
        <input
          className="input-dark flex-1 text-xs"
          placeholder="e.g. Which segment has the highest churn risk?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && ask()}
          disabled={loading}
        />
        <button
          className="btn-primary shrink-0"
          onClick={() => ask()}
          disabled={loading || !query.trim()}
          style={{ fontSize: 12, padding: "6px 14px" }}
        >
          {loading ? "…" : "Ask"}
        </button>
      </div>

      {/* Suggested quick questions */}
      {!response && !loading && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[
            "Which segment has highest churn risk?",
            "What's our biggest category gap?",
            "How can we improve funnel conversion?",
          ].map((q) => (
            <button
              key={q}
              className="btn-ghost"
              style={{ fontSize: 10, padding: "3px 8px" }}
              onClick={() => { setQuery(q); ask(q); }}
            >
              ↗ {q}
            </button>
          ))}
        </div>
      )}

      {response && (
        <div className="mt-3 rounded-xl p-3" style={{ background: "#f8fafc", border: "1px solid #d1dde9" }}>
          {response.recommended_action && (
            <div
              className="mb-2 rounded-lg px-3 py-2"
              style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.22)" }}
            >
              <p className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: "#d97706" }}>
                Recommended Action
              </p>
              <p className="mt-0.5 text-xs font-semibold" style={{ color: "#1e2d3d" }}>
                {response.recommended_action}
              </p>
            </div>
          )}
          {response.rationale && (
            <p className="mb-2 text-xs leading-relaxed" style={{ color: "#2d4a62" }}>
              {response.rationale}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {response.profit_impact_aed !== undefined && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: "rgba(5,150,105,0.08)", color: "#059669" }}
              >
                AED {(response.profit_impact_aed / 1e6).toFixed(1)}M/yr impact
              </span>
            )}
            {response.confidence !== undefined && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: "#f8fafc", color: "#4a6480", border: "1px solid #d1dde9" }}
              >
                {Math.round(response.confidence * 100)}% confidence
              </span>
            )}
          </div>
          {response.key_risks && response.key_risks.length > 0 && (
            <div className="mt-2">
              <p className="mb-1 text-[9px] font-bold uppercase tracking-wide" style={{ color: "#e11d48" }}>Key Risks</p>
              <ul className="space-y-0.5">
                {response.key_risks.slice(0, 2).map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[10px]" style={{ color: "#2d4a62" }}>
                    <span style={{ color: "#e11d48", flexShrink: 0 }}>•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            className="btn-ghost mt-2"
            style={{ fontSize: 10 }}
            onClick={() => { setResponse(null); setQuery(""); }}
          >
            ✕ Clear
          </button>
        </div>
      )}
    </div>
  );
}
