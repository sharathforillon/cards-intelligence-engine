"use client";

import { useMemo } from "react";
import CacheBar from "@/components/CacheBar";
import SegmentProfitabilityChart from "@/components/SegmentProfitabilityChart";
import { useCachedFetch } from "@/hooks/useCachedFetch";

type SegmentRow = {
  key: string;
  rank: number;
  label: string;
  icon: string;
  tier: string;
  tier_badge_color: string;
  tier_color: string;
  cards: string[];
  cards_issued: number;
  profit_per_customer: number;
  lifetime_value: number;
  churn_rate: number;
  cac: number;
  payback_months: number;
  portfolio_share: number;
  monthly_spend_per_card: number;
};

type ChurnRow = {
  key: string;
  label: string;
  icon: string;
  tier_color: string;
  cards: string[];
  churn_rate: number;
  cards_at_risk_annually: number;
  revenue_at_risk_aed: number;
  risk_level: string;
  risk_color: string;
  recommended_action: string;
};

type GrowthRow = {
  key: string;
  label: string;
  icon: string;
  tier_color: string;
  acquisition_uplift_cards: number;
  revenue_opportunity_aed: number;
  opportunity_size: string;
  current_profit_per_card: number;
  enhanced_profit_per_card: number;
};

const API = "http://localhost:8000";

export default function SegmentsPage() {
  const { data: rankedData, loading: l1, refresh: r1, fetchedAt: fa1 } = useCachedFetch<SegmentRow[]>(
    "api:segments/profitability",
    () => fetch(`${API}/segments/profitability`).then((r) => r.json()),
  );
  const { data: churnData,  loading: l2, refresh: r2 } = useCachedFetch<ChurnRow[]>(
    "api:segments/churn-risk",
    () => fetch(`${API}/segments/churn-risk`).then((r) => r.json()),
  );
  const { data: growthData, loading: l3, refresh: r3 } = useCachedFetch<GrowthRow[]>(
    "api:segments/growth-opportunities",
    () => fetch(`${API}/segments/growth-opportunities`).then((r) => r.json()),
  );

  const ranked: SegmentRow[] = rankedData ?? [];
  const churn:  ChurnRow[]   = churnData  ?? [];
  const growth: GrowthRow[]  = growthData ?? [];

  const loading = l1 || l2 || l3;
  function refreshAll() { r1(); r2(); r3(); }

  const maxChurnRevenue = useMemo(
    () => Math.max(...churn.map((r) => r.revenue_at_risk_aed), 1),
    [churn],
  );

  // ── Derived KPIs ─────────────────────────────────────────────────────────
  const totalCards       = ranked.reduce((s, r) => s + r.cards_issued, 0);
  const totalMonthlyPnL  = ranked.reduce((s, r) => s + r.profit_per_customer * r.cards_issued, 0);
  const avgLTV           = ranked.length ? ranked.reduce((s, r) => s + r.lifetime_value, 0) / ranked.length : 0;
  const avgCAC           = ranked.length ? ranked.reduce((s, r) => s + r.cac, 0) / ranked.length : 0;
  const wgtdChurn        = totalCards
    ? ranked.reduce((s, r) => s + r.churn_rate * r.cards_issued, 0) / totalCards
    : 0;

  const maxProfit = useMemo(() => Math.max(...ranked.map((r) => r.profit_per_customer), 1), [ranked]);

  return (
    <main style={{ background: "var(--c-bg)", minHeight: "100vh", padding: "28px 36px" }}>

      {/* ── PAGE HEADER ───────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#3d5570" }}>
            Customer Intelligence · Module 4
          </p>
          <h1 className="font-heading mt-1 text-2xl font-bold tracking-tight" style={{ color: "#0d1f2f" }}>
            Segment Command Center
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#4a6480" }}>
            Per-segment profitability, churn risk &amp; growth headroom — driven by live simulation.
          </p>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <CacheBar fetchedAt={fa1} onRefresh={refreshAll} loading={loading} />
        </div>
      </div>

      {/* ── KPI HERO STRIP ───────────────────────────────────────────────── */}
      <div className="mb-6 grid gap-3 sm:grid-cols-5">
        {[
          { label: "Active Cards",      value: totalCards ? Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(totalCards) : "—", helper: "Total portfolio",         color: "#2563eb", bg: "rgba(37,99,235,0.06)",   border: "rgba(37,99,235,0.18)",   top: "#2563eb" },
          { label: "Monthly P&L",       value: totalMonthlyPnL ? `AED ${(totalMonthlyPnL / 1_000_000).toFixed(1)}M` : "—", helper: "Portfolio profit/mo",   color: "#059669", bg: "rgba(5,150,105,0.06)",   border: "rgba(5,150,105,0.18)",   top: "#059669" },
          { label: "Avg Customer LTV",  value: avgLTV ? `AED ${(avgLTV / 1_000).toFixed(1)}K` : "—",  helper: "Lifetime value",          color: "#7c3aed", bg: "rgba(124,58,237,0.06)", border: "rgba(124,58,237,0.18)", top: "#7c3aed" },
          { label: "Avg CAC",           value: avgCAC ? `AED ${avgCAC.toFixed(0)}` : "—",              helper: "Acquisition cost",        color: "#d97706", bg: "rgba(217,119,6,0.06)",  border: "rgba(217,119,6,0.18)",  top: "#d97706" },
          { label: "Portfolio Churn",   value: wgtdChurn ? `${(wgtdChurn * 100).toFixed(1)}%` : "—",  helper: "Weighted avg",            color: wgtdChurn > 0.15 ? "#e11d48" : "#059669", bg: wgtdChurn > 0.15 ? "rgba(225,29,72,0.06)" : "rgba(5,150,105,0.06)", border: wgtdChurn > 0.15 ? "rgba(225,29,72,0.18)" : "rgba(5,150,105,0.18)", top: wgtdChurn > 0.15 ? "#e11d48" : "#059669" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="flex flex-col rounded-xl px-4 py-3"
            style={{ background: kpi.bg, border: `1px solid ${kpi.border}`, borderTop: `2px solid ${kpi.top}` }}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "#3d5570" }}>{kpi.label}</span>
            <span className="mt-1.5 text-xl font-bold tabular-nums" style={{ color: kpi.color }}>{kpi.value}</span>
            <span className="mt-0.5 text-[11px]" style={{ color: "#3d5570" }}>{kpi.helper}</span>
          </div>
        ))}
      </div>

      {/* ── SEGMENT INTEL CARDS ──────────────────────────────────────────── */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#0d1f2f" }}>
            Segment Profiles · Profitability &amp; Health
          </h2>
          <span className="text-[11px]" style={{ color: "#4a6480" }}>{ranked.length} segments tracked</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {ranked.map((seg) => {
            const profitPct = (seg.profit_per_customer / maxProfit) * 100;
            const spendK    = (seg.monthly_spend_per_card / 1000).toFixed(1);
            const ltvK      = (seg.lifetime_value / 1000).toFixed(1);
            const isTopTier = seg.rank === 1;
            return (
              <div
                key={seg.key}
                className="relative overflow-hidden rounded-2xl"
                style={{
                  background: "#ffffff",
                  border: `1px solid ${seg.tier_color}30`,
                  borderLeft: `4px solid ${seg.tier_color}`,
                  boxShadow: isTopTier
                    ? `0 4px 20px ${seg.tier_color}20`
                    : "0 1px 4px rgba(0,0,0,0.05)",
                }}
              >
                {/* Top stripe */}
                <div
                  className="px-4 pt-4 pb-3"
                  style={{ background: `${seg.tier_color}08`, borderBottom: `1px solid ${seg.tier_color}18` }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span style={{ fontSize: 22 }}>{seg.icon}</span>
                      <p className="mt-1 text-sm font-bold leading-tight" style={{ color: "#0d1f2f" }}>{seg.label}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-bold text-white"
                        style={{ background: seg.tier_badge_color }}
                      >
                        {seg.tier}
                      </span>
                      <p className="mt-1 text-[10px] font-semibold" style={{ color: "#4a6480" }}>
                        #{seg.rank} rank
                      </p>
                    </div>
                  </div>

                  {/* Profit headline */}
                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#3d5570" }}>Profit / Customer</p>
                    <p className="text-2xl font-bold tabular-nums" style={{ color: seg.tier_color }}>
                      AED {seg.profit_per_customer.toFixed(0)}
                      <span className="text-xs font-normal" style={{ color: "#4a6480" }}>/mo</span>
                    </p>
                    {/* Profit bar */}
                    <div className="mt-1.5 h-1.5 w-full rounded-full" style={{ background: `${seg.tier_color}18` }}>
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${profitPct}%`, background: seg.tier_color, transition: "width 0.7s ease" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card products */}
                {seg.cards && seg.cards.length > 0 && (
                  <div className="px-3 pb-2 pt-1 flex flex-wrap gap-1.5">
                    {seg.cards.map((c) => (
                      <span
                        key={c}
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          background: `${seg.tier_color}12`,
                          border: `1px solid ${seg.tier_color}30`,
                          color: seg.tier_color,
                        }}
                      >
                        💳 {c}
                      </span>
                    ))}
                  </div>
                )}

                {/* Metrics grid */}
                <div className="grid grid-cols-2 gap-px p-3" style={{ gap: 8 }}>
                  {[
                    { label: "Cards Issued",   value: seg.cards_issued.toLocaleString("en-US"), color: "#1e2d3d" },
                    { label: "Spend / Card",   value: `AED ${spendK}K`,                          color: "#1e2d3d" },
                    { label: "LTV",            value: `AED ${ltvK}K`,                            color: "#7c3aed" },
                    { label: "CAC",            value: `AED ${seg.cac.toFixed(0)}`,               color: "#d97706" },
                    { label: "Payback",        value: `${seg.payback_months} mo`,                color: "#2563eb" },
                    { label: "Churn Rate",     value: `${(seg.churn_rate * 100).toFixed(1)}%`,   color: seg.churn_rate > 0.15 ? "#e11d48" : "#059669" },
                  ].map((m) => (
                    <div key={m.label} className="rounded-lg px-2 py-1.5" style={{ background: "#f8fafc" }}>
                      <p className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: "#3d5570" }}>{m.label}</p>
                      <p className="mt-0.5 text-xs font-bold tabular-nums" style={{ color: m.color }}>{m.value}</p>
                    </div>
                  ))}
                </div>

                {/* Portfolio share footer */}
                <div
                  className="flex items-center justify-between px-3 pb-3"
                  style={{ gap: 6 }}
                >
                  <div className="flex-1">
                    <div className="h-1 w-full rounded-full" style={{ background: "#e2e8f0" }}>
                      <div
                        className="h-1 rounded-full"
                        style={{ width: `${(seg.portfolio_share * 100).toFixed(0)}%`, background: "#94a3b8" }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold" style={{ color: "#4a6480" }}>
                    {(seg.portfolio_share * 100).toFixed(0)}% portfolio
                  </span>
                </div>
              </div>
            );
          })}
          {l1 && ranked.length === 0 && (
            <div className="col-span-5 flex h-40 items-center justify-center text-sm" style={{ color: "#3d5570" }}>
              Loading segment data…
            </div>
          )}
        </div>
      </section>

      {/* ── PROFITABILITY CHART + CHURN RISK ─────────────────────────────── */}
      <section className="mb-6 grid gap-5 lg:grid-cols-12">

        {/* Profitability chart */}
        <div className="lg:col-span-7">
          <div
            className="panel h-full"
            style={{ borderTop: "2px solid #2563eb" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#0d1f2f" }}>
                Profit per Customer · AED / Month
              </h2>
            </div>
            <SegmentProfitabilityChart data={ranked} />
          </div>
        </div>

        {/* Churn Risk compact panel */}
        <div className="lg:col-span-5">
          <div className="panel h-full" style={{ borderTop: "2px solid #e11d48" }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#0d1f2f" }}>
                Churn Risk · Revenue at Risk
              </h2>
            </div>
            <div className="space-y-2.5">
              {churn.map((row) => {
                const barPct = Math.min((row.revenue_at_risk_aed / maxChurnRevenue) * 100, 100);
                return (
                  <div
                    key={row.key}
                    className="rounded-xl p-3"
                    style={{ border: `1px solid ${row.risk_color}22`, background: `${row.risk_color}05` }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span style={{ fontSize: 14 }}>{row.icon}</span>
                        <span className="truncate text-xs font-bold" style={{ color: "#0d1f2f" }}>{row.label}</span>
                        <span
                          className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white"
                          style={{ background: row.risk_color }}
                        >
                          {row.risk_level}
                        </span>
                      </div>
                      <span className="shrink-0 text-sm font-bold tabular-nums" style={{ color: row.risk_color }}>
                        AED {(row.revenue_at_risk_aed / 1_000_000).toFixed(1)}M
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full" style={{ background: "#e2e8f0" }}>
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${barPct}%`, background: `linear-gradient(90deg, ${row.risk_color}, ${row.risk_color}aa)`, transition: "width 0.7s ease" }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <p className="text-[10px]" style={{ color: "#4a6480" }}>
                        {row.cards_at_risk_annually.toLocaleString("en-US")} cards · {(row.churn_rate * 100).toFixed(0)}% churn
                      </p>
                    </div>
                    {row.cards && row.cards.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {row.cards.map((c) => (
                          <span
                            key={c}
                            className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                            style={{
                              background: `${row.risk_color}0f`,
                              border: `1px solid ${row.risk_color}25`,
                              color: row.risk_color,
                            }}
                          >
                            💳 {c}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="mt-1 text-[10px] font-medium" style={{ color: "#2d4a62" }}>
                      💡 {row.recommended_action}
                    </p>
                  </div>
                );
              })}
              {l2 && churn.length === 0 && (
                <p className="py-4 text-center text-xs" style={{ color: "#3d5570" }}>Loading churn data…</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── GROWTH OPPORTUNITIES ──────────────────────────────────────────── */}
      <section>
        <div className="panel" style={{ borderTop: "2px solid #059669" }}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#0d1f2f" }}>
                Growth Opportunities · Revenue Upside from +0.5pp Reward Rate
              </h2>
              <p className="mt-0.5 text-[11px]" style={{ color: "#4a6480" }}>
                Projected card acquisition uplift and profit gain per segment
              </p>
            </div>
          </div>

          {l3 && growth.length === 0 ? (
            <p className="py-4 text-center text-xs" style={{ color: "#3d5570" }}>Loading opportunities…</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {growth.map((g) => {
                const profitLift = g.enhanced_profit_per_card - g.current_profit_per_card;
                const liftPct    = g.current_profit_per_card > 0
                  ? ((profitLift / g.current_profit_per_card) * 100).toFixed(1)
                  : "—";
                const oppColor =
                  g.opportunity_size === "large"  ? "#059669"
                  : g.opportunity_size === "medium" ? "#d97706"
                  : "#6b7280";

                return (
                  <div
                    key={g.key}
                    className="rounded-2xl p-4"
                    style={{
                      background: "#ffffff",
                      border: `1px solid ${g.tier_color}28`,
                      borderTop: `3px solid ${g.tier_color}`,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <span style={{ fontSize: 20 }}>{g.icon}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase text-white"
                        style={{ background: oppColor }}
                      >
                        {g.opportunity_size}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-bold" style={{ color: "#0d1f2f" }}>{g.label}</p>

                    {/* Card uplift */}
                    <div className="mt-3">
                      <p className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: "#3d5570" }}>Card Uplift</p>
                      <p className="text-xl font-bold tabular-nums" style={{ color: g.tier_color }}>
                        +{g.acquisition_uplift_cards.toLocaleString("en-US")}
                      </p>
                      <p className="text-[10px]" style={{ color: "#4a6480" }}>new cards acquired</p>
                    </div>

                    {/* Revenue opportunity */}
                    <div className="mt-3 rounded-lg px-3 py-2" style={{ background: `${oppColor}0d`, border: `1px solid ${oppColor}22` }}>
                      <p className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: oppColor }}>Revenue Opportunity</p>
                      <p className="mt-0.5 text-base font-bold tabular-nums" style={{ color: oppColor }}>
                        AED {(g.revenue_opportunity_aed / 1_000_000).toFixed(1)}M
                      </p>
                    </div>

                    {/* Before → after profit per card */}
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span style={{ color: "#4a6480" }}>Current profit/card</span>
                        <span className="font-semibold" style={{ color: "#1e2d3d" }}>
                          AED {g.current_profit_per_card.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span style={{ color: "#4a6480" }}>Enhanced profit/card</span>
                        <span className="font-bold" style={{ color: "#059669" }}>
                          AED {g.enhanced_profit_per_card.toFixed(0)} (+{liftPct}%)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
