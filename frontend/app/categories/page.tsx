"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import Panel from "@/components/Panel";
import CategoryRadarChart from "@/components/CategoryRadarChart";
import CacheBar from "@/components/CacheBar";
import { useCachedFetch } from "@/hooks/useCachedFetch";

type CategoryMetric = {
  key: string;
  label: string;
  icon: string;
  color: string;
  spend_share: number;
  mashreq_rate: number;
  market_leader_rate: number;
  market_leader_bank: string;
  market_leader_card?: string;
  market_avg_rate: number;
  competitor_strength: number;
  opportunity_index: number;
  reward_cost_monthly_aed: number;
  top_3_banks: { bank: string; rate: number }[];
  underperforming: boolean;
};

// Gap severity colour helpers
function gapColor(opp: number) {
  if (opp >= 0.6) return "#be123c";
  if (opp >= 0.4) return "#b45309";
  if (opp >= 0.2) return "#ca8a04";
  return "#047857";
}
function gapBg(opp: number) {
  if (opp >= 0.6) return "rgba(190,18,60,0.08)";
  if (opp >= 0.4) return "rgba(180,83,9,0.08)";
  if (opp >= 0.2) return "rgba(202,138,4,0.08)";
  return "rgba(4,120,87,0.08)";
}
function gapBorder(opp: number) {
  if (opp >= 0.6) return "rgba(190,18,60,0.22)";
  if (opp >= 0.4) return "rgba(180,83,9,0.22)";
  if (opp >= 0.2) return "rgba(202,138,4,0.22)";
  return "rgba(4,120,87,0.22)";
}
function gapLabel(opp: number) {
  if (opp >= 0.6) return "Critical";
  if (opp >= 0.4) return "High";
  if (opp >= 0.2) return "Medium";
  return "On track";
}

// ── Dual-bar category card ─────────────────────────────────────────────────
function CategoryBattleCard({
  m,
  maxRate,
  rank,
}: {
  m: CategoryMetric;
  maxRate: number;
  rank: number;
}) {
  const gapPp    = (m.market_leader_rate - m.mashreq_rate) * 100;
  const priority = m.opportunity_index * m.spend_share;
  const opp      = m.opportunity_index;

  return (
    <div
      style={{
        background: "#ffffff",
        border: `1px solid ${gapBorder(opp)}`,
        borderTop: `3px solid ${gapColor(opp)}`,
        borderRadius: 14,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>{m.icon}</span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: "#0d1f2f", margin: 0 }}>
              {m.label}
            </p>
            <p style={{ fontSize: 11, color: "#3a5270", margin: 0, marginTop: 2 }}>
              {(m.spend_share * 100).toFixed(0)}% of portfolio spend
            </p>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 99,
              background: gapBg(opp),
              color: gapColor(opp),
              border: `1px solid ${gapBorder(opp)}`,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {gapLabel(opp)}
          </span>
          <span style={{ fontSize: 10, color: "#3a5270" }}>
            Priority #{rank}
          </span>
        </div>
      </div>

      {/* Dual bar comparison */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {/* Mashreq */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 58, fontSize: 11, fontWeight: 700, color: "#1d56db", flexShrink: 0 }}>
            Mashreq
          </span>
          <div style={{ flex: 1, height: 11, background: "#edf1f7", borderRadius: 6 }}>
            <div
              style={{
                width: `${Math.max((m.mashreq_rate / maxRate) * 100, 2)}%`,
                height: "100%",
                borderRadius: 6,
                background: "linear-gradient(90deg, #1d56db, #3b82f6)",
                transition: "width 0.7s ease",
              }}
            />
          </div>
          <span style={{ width: 38, fontSize: 13, fontWeight: 800, color: "#1d56db", textAlign: "right", flexShrink: 0 }}>
            {(m.mashreq_rate * 100).toFixed(1)}%
          </span>
        </div>

        {/* Market Leader */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 58, fontSize: 11, fontWeight: 700, color: "#be123c", flexShrink: 0 }}>
            Leader
          </span>
          <div style={{ flex: 1, height: 11, background: "#edf1f7", borderRadius: 6 }}>
            <div
              style={{
                width: `${Math.max((m.market_leader_rate / maxRate) * 100, 2)}%`,
                height: "100%",
                borderRadius: 6,
                background: "linear-gradient(90deg, #be123c, #f43f5e)",
                transition: "width 0.7s ease",
              }}
            />
          </div>
          <span style={{ width: 38, fontSize: 13, fontWeight: 800, color: "#be123c", textAlign: "right", flexShrink: 0 }}>
            {(m.market_leader_rate * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Gap callout */}
      <div
        style={{
          background: gapBg(opp),
          border: `1px solid ${gapBorder(opp)}`,
          borderRadius: 9,
          padding: "8px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#3a5270", margin: 0 }}>
            Gap to market leader
          </p>
          {gapPp > 0 && (
            <p style={{ fontSize: 11, color: gapColor(opp), margin: 0, marginTop: 1 }}>
              +{gapPp.toFixed(1)}pp if matched
            </p>
          )}
        </div>
        <span
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: gapColor(opp),
            letterSpacing: "-0.02em",
          }}
        >
          {(opp * 100).toFixed(0)}%
        </span>
      </div>

      {/* Market leader identity */}
      <div
        style={{
          background: "#f5f8fc",
          border: "1px solid #c4d2e1",
          borderRadius: 9,
          padding: "8px 12px",
        }}
      >
        <p style={{ fontSize: 10, fontWeight: 700, color: "#3a5270", margin: 0, textTransform: "uppercase", letterSpacing: "0.10em" }}>
          Market Leader
        </p>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#be123c", margin: "3px 0 0" }}>
          {m.market_leader_bank}
        </p>
        {m.market_leader_card && (
          <p style={{ fontSize: 11, color: "#2a4560", margin: "1px 0 0" }}>
            {m.market_leader_card}
          </p>
        )}
      </div>

      {/* Top 3 competitors */}
      {m.top_3_banks.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#3a5270", margin: "0 0 5px", textTransform: "uppercase", letterSpacing: "0.10em" }}>
            Top 3 competitors
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {m.top_3_banks.map((b, i) => (
              <div
                key={b.bank}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 12,
                }}
              >
                <span style={{ color: i === 0 ? "#be123c" : "#2a4560", fontWeight: i === 0 ? 700 : 500 }}>
                  {["🥇", "🥈", "🥉"][i]} {b.bank}
                </span>
                <span style={{ fontWeight: 700, color: i === 0 ? "#be123c" : "#2a4560" }}>
                  {(b.rate * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Priority score */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <span
          style={{
            fontSize: 10,
            color: "#3a5270",
            background: "#edf1f7",
            borderRadius: 6,
            padding: "2px 8px",
            fontWeight: 600,
          }}
        >
          Priority score: {(priority * 1000).toFixed(0)}
        </span>
      </div>
    </div>
  );
}

// ── Custom Recharts tooltip for comparison chart ──────────────────────────
function ComparisonTooltip({ active, payload, label }: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const mashreq = payload.find((p: { dataKey: string }) => p.dataKey === "mashreq_rate");
  const leader  = payload.find((p: { dataKey: string }) => p.dataKey === "market_leader_rate");
  const gap     = leader && mashreq ? (leader.value - mashreq.value) * 100 : 0;
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #c4d2e1",
      borderRadius: 10,
      padding: "12px 14px",
      fontSize: 12,
      boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
      minWidth: 180,
    }}>
      <p style={{ fontWeight: 800, color: "#0d1f2f", marginBottom: 8 }}>{label}</p>
      {mashreq && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 4 }}>
          <span style={{ color: "#1d56db", fontWeight: 600 }}>🔵 Mashreq</span>
          <span style={{ fontWeight: 800, color: "#1d56db" }}>{(mashreq.value * 100).toFixed(1)}%</span>
        </div>
      )}
      {leader && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 8 }}>
          <span style={{ color: "#be123c", fontWeight: 600 }}>🔴 Leader</span>
          <span style={{ fontWeight: 800, color: "#be123c" }}>{(leader.value * 100).toFixed(1)}%</span>
        </div>
      )}
      {gap > 0 && (
        <div style={{
          background: "rgba(180,83,9,0.08)",
          borderRadius: 6,
          padding: "4px 8px",
          fontSize: 11,
          fontWeight: 700,
          color: "#92400e",
        }}>
          Gap: +{gap.toFixed(1)}pp
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const { data, loading, refresh, fetchedAt } = useCachedFetch<CategoryMetric[]>(
    "api:categories/metrics",
    () => fetch("http://localhost:8000/categories/metrics").then((r) => r.json()),
  );
  const metrics: CategoryMetric[] = data ?? [];

  // Sort by weighted priority: opportunity × spend_share (highest first)
  const sorted = useMemo(
    () => [...metrics].sort(
      (a, b) => b.opportunity_index * b.spend_share - a.opportunity_index * a.spend_share
    ),
    [metrics],
  );

  const maxRate = useMemo(
    () => Math.max(...metrics.map((m) => m.market_leader_rate), 0.01),
    [metrics],
  );

  // Chart data: sorted by opportunity descending
  const chartData = useMemo(
    () =>
      [...metrics]
        .sort((a, b) => b.opportunity_index - a.opportunity_index)
        .map((m) => ({
          label: m.label.replace(" & Restaurants", "").replace(" Shopping", ""),
          mashreq_rate: m.mashreq_rate,
          market_leader_rate: m.market_leader_rate,
          opportunity_index: m.opportunity_index,
        })),
    [metrics],
  );

  // KPI summary
  const avgMashreq  = metrics.length ? metrics.reduce((s, m) => s + m.mashreq_rate, 0) / metrics.length : 0;
  const avgLeader   = metrics.length ? metrics.reduce((s, m) => s + m.market_leader_rate, 0) / metrics.length : 0;
  const underCount  = metrics.filter((m) => m.underperforming).length;
  const topGap      = sorted[0];
  const coveragePct = metrics.reduce((s, m) => s + m.spend_share, 0) * 100;

  const isEmpty = !loading && metrics.length === 0;

  return (
    <main style={{ background: "var(--c-bg)", minHeight: "100vh", padding: "28px 36px" }}>

      {/* ── Page Header ───────────────────────────────────────── */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.18em", color: "#3a5270", margin: 0 }}>
            Module 5 · Spend
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0d1f2f", margin: "4px 0 6px", letterSpacing: "-0.02em" }}>
            Spend Category Intelligence
          </h1>
          <p style={{ fontSize: 14, color: "#2a4560", margin: 0 }}>
            Mashreq reward rate vs. best competitor across 6 spend categories — sorted by strategic priority.
          </p>
        </div>
        <CacheBar fetchedAt={fetchedAt} onRefresh={refresh} loading={loading} />
      </div>

      {/* ── KPI Strip ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          {
            label: "Categories Tracked",
            value: metrics.length ? `${metrics.length}` : "—",
            sub: "spend segments",
            color: "#1d56db",
            bg: "rgba(29,86,219,0.07)",
            border: "rgba(29,86,219,0.20)",
          },
          {
            label: "Underperforming",
            value: metrics.length ? `${underCount} / ${metrics.length}` : "—",
            sub: "gap > 20%",
            color: underCount > 0 ? "#be123c" : "#047857",
            bg: underCount > 0 ? "rgba(190,18,60,0.07)" : "rgba(4,120,87,0.07)",
            border: underCount > 0 ? "rgba(190,18,60,0.22)" : "rgba(4,120,87,0.22)",
          },
          {
            label: "Avg Mashreq Rate",
            value: metrics.length ? `${(avgMashreq * 100).toFixed(1)}%` : "—",
            sub: "across all categories",
            color: "#1d56db",
            bg: "rgba(29,86,219,0.07)",
            border: "rgba(29,86,219,0.18)",
          },
          {
            label: "Avg Market Leader",
            value: metrics.length ? `${(avgLeader * 100).toFixed(1)}%` : "—",
            sub: "best competitor avg",
            color: "#be123c",
            bg: "rgba(190,18,60,0.07)",
            border: "rgba(190,18,60,0.18)",
          },
          {
            label: "Portfolio Coverage",
            value: metrics.length ? `${coveragePct.toFixed(0)}%` : "—",
            sub: "of total spend tracked",
            color: "#047857",
            bg: "rgba(4,120,87,0.07)",
            border: "rgba(4,120,87,0.18)",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: kpi.bg,
              border: `1px solid ${kpi.border}`,
              borderTop: `3px solid ${kpi.color}`,
              borderRadius: 12,
              padding: "14px 16px",
            }}
          >
            <p style={{ fontSize: 10, fontWeight: 700, color: "#3a5270", margin: 0, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              {kpi.label}
            </p>
            <p style={{ fontSize: 22, fontWeight: 900, color: kpi.color, margin: "6px 0 2px", letterSpacing: "-0.02em" }}>
              {kpi.value}
            </p>
            <p style={{ fontSize: 11, color: "#3a5270", margin: 0 }}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {isEmpty && (
        <div style={{
          textAlign: "center", padding: "80px 20px",
          color: "#3a5270", fontSize: 14,
          background: "#fff", borderRadius: 14, border: "1px solid #c4d2e1"
        }}>
          <p style={{ fontSize: 40, marginBottom: 16 }}>📊</p>
          <p style={{ fontWeight: 700, color: "#0d1f2f", fontSize: 16 }}>No category data available</p>
          <p style={{ marginTop: 6 }}>Start the backend and ensure competitor cards have been seeded.</p>
        </div>
      )}

      {!isEmpty && (
        <>
          {/* ── Section 1: Comparison chart + Radar ───────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "7fr 5fr", gap: 20, marginBottom: 24 }}>

            {/* Grouped horizontal bar chart */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #c4d2e1",
                borderTop: "3px solid #1d56db",
                borderRadius: 14,
                padding: "20px 24px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05), 0 4px 20px rgba(0,0,0,0.07)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ fontSize: 12, fontWeight: 700, color: "#0d1f2f", textTransform: "uppercase", letterSpacing: "0.14em", margin: 0 }}>
                  Mashreq vs Market Leader · Reward Rate
                </h2>
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "#1d56db" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: "#1d56db", display: "inline-block" }} />
                    Mashreq
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "#be123c" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: "#be123c", display: "inline-block" }} />
                    Market Leader
                  </div>
                </div>
              </div>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={chartData}
                    margin={{ top: 0, right: 60, bottom: 0, left: 10 }}
                    barGap={4}
                    barCategoryGap="30%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2eaf2" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: "#3a5270" }}
                      tickLine={false}
                      axisLine={{ stroke: "#c4d2e1" }}
                      tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={{ fontSize: 12, fill: "#0d1f2f", fontWeight: 600 }}
                      tickLine={false}
                      axisLine={false}
                      width={90}
                    />
                    <Tooltip content={<ComparisonTooltip />} />
                    <Bar dataKey="mashreq_rate" name="Mashreq" radius={[0, 4, 4, 0]} barSize={11}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill="#1d56db" fillOpacity={0.9} />
                      ))}
                    </Bar>
                    <Bar dataKey="market_leader_rate" name="Market Leader" radius={[0, 4, 4, 0]} barSize={11}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={gapColor(entry.opportunity_index)} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p style={{ fontSize: 11, color: "#3a5270", margin: "10px 0 0", textAlign: "center" }}>
                Sorted by opportunity index (biggest gap first). Market leader bar coloured by severity.
              </p>
            </div>

            {/* Radar overview */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #c4d2e1",
                borderTop: "3px solid #7c3aed",
                borderRadius: 14,
                padding: "20px 24px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05), 0 4px 20px rgba(0,0,0,0.07)",
              }}
            >
              <h2 style={{ fontSize: 12, fontWeight: 700, color: "#0d1f2f", textTransform: "uppercase", letterSpacing: "0.14em", margin: "0 0 12px" }}>
                Competitive Shape · Radar
              </h2>
              <CategoryRadarChart data={metrics} />
              {topGap && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "10px 12px",
                    background: "rgba(190,18,60,0.06)",
                    border: "1px solid rgba(190,18,60,0.20)",
                    borderRadius: 9,
                  }}
                >
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#3a5270", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.10em" }}>
                    Highest Priority
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#be123c", margin: 0 }}>
                    {topGap.icon} {topGap.label}
                  </p>
                  <p style={{ fontSize: 11, color: "#2a4560", margin: "2px 0 0" }}>
                    {(topGap.opportunity_index * 100).toFixed(0)}% gap · {(topGap.spend_share * 100).toFixed(0)}% spend share
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Section 2: Category Battle Cards ──────────────────── */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0d1f2f", margin: 0 }}>
                  Category Battle Map
                </h2>
                <p style={{ fontSize: 12, color: "#3a5270", margin: "3px 0 0" }}>
                  Ranked by priority score (opportunity × spend share). Hover bars for details.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {["Critical", "High", "Medium", "On track"].map((l) => {
                  const opp = l === "Critical" ? 0.7 : l === "High" ? 0.5 : l === "Medium" ? 0.3 : 0;
                  return (
                    <span
                      key={l}
                      style={{
                        fontSize: 10, fontWeight: 700,
                        padding: "3px 9px", borderRadius: 99,
                        background: gapBg(opp), color: gapColor(opp),
                        border: `1px solid ${gapBorder(opp)}`,
                      }}
                    >
                      {l}
                    </span>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {sorted.map((m, i) => (
                <CategoryBattleCard key={m.key} m={m} maxRate={maxRate} rank={i + 1} />
              ))}
            </div>
          </div>

          {/* ── Section 3: Full data table ─────────────────────────── */}
          <div style={{ marginTop: 24 }}>
            <Panel title="Competitive Snapshot · All Categories Ranked by Opportunity" accent="amber">
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Priority</th>
                      <th>Category</th>
                      <th style={{ textAlign: "center" }}>Spend Share</th>
                      <th style={{ textAlign: "right" }}>Mashreq Rate</th>
                      <th style={{ textAlign: "right" }}>Market Leader</th>
                      <th>Leader · Card</th>
                      <th style={{ textAlign: "right" }}>Gap (pp)</th>
                      <th style={{ textAlign: "right" }}>Opp. Index</th>
                      <th style={{ textAlign: "center" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((m, i) => {
                      const gapPp = (m.market_leader_rate - m.mashreq_rate) * 100;
                      return (
                        <tr key={m.key}>
                          <td>
                            <span
                              style={{
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                width: 24, height: 24, borderRadius: "50%",
                                background: gapBg(m.opportunity_index),
                                color: gapColor(m.opportunity_index),
                                fontWeight: 800, fontSize: 12,
                                border: `1px solid ${gapBorder(m.opportunity_index)}`,
                              }}
                            >
                              {i + 1}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: "#0d1f2f" }}>
                              {m.icon} {m.label}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                              <div style={{ width: 50, height: 6, background: "#e2eaf2", borderRadius: 3 }}>
                                <div
                                  style={{
                                    width: `${m.spend_share * 100 * 4.5}%`,
                                    height: "100%", borderRadius: 3,
                                    background: "#1d56db",
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#1d56db" }}>
                                {(m.spend_share * 100).toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: "right", fontSize: 14, fontWeight: 800, color: "#1d56db" }}>
                            {(m.mashreq_rate * 100).toFixed(1)}%
                          </td>
                          <td style={{ textAlign: "right", fontSize: 14, fontWeight: 800, color: "#be123c" }}>
                            {(m.market_leader_rate * 100).toFixed(1)}%
                          </td>
                          <td>
                            <div>
                              <p style={{ fontSize: 12, fontWeight: 700, color: "#0d1f2f", margin: 0 }}>
                                {m.market_leader_bank}
                              </p>
                              {m.market_leader_card && (
                                <p style={{ fontSize: 11, color: "#3a5270", margin: 0 }}>
                                  {m.market_leader_card}
                                </p>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: "right", fontSize: 14, fontWeight: 800, color: gapColor(m.opportunity_index) }}>
                            +{gapPp.toFixed(1)}pp
                          </td>
                          <td style={{ textAlign: "right", fontSize: 13, fontWeight: 700, color: gapColor(m.opportunity_index) }}>
                            {(m.opportunity_index * 100).toFixed(0)}%
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <span
                              style={{
                                fontSize: 10, fontWeight: 700,
                                padding: "3px 8px", borderRadius: 99,
                                background: gapBg(m.opportunity_index),
                                color: gapColor(m.opportunity_index),
                                border: `1px solid ${gapBorder(m.opportunity_index)}`,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {gapLabel(m.opportunity_index)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </>
      )}
    </main>
  );
}
