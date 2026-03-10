"use client";

import Link from "next/link";
import CardIntelligenceTable from "../components/CardIntelligenceTable";
import BattlefieldChart from "../components/BattlefieldChart";
import Panel from "../components/Panel";
import { useCachedFetch } from "@/hooks/useCachedFetch";
import CacheBar from "@/components/CacheBar";

type CategoryMetric = {
  key: string;
  label: string;
  icon: string;
  color: string;
  opportunity_index: number;
  underperforming: boolean;
  mashreq_rate: number;
  market_leader_rate: number;
  market_leader_bank: string;
  market_leader_card?: string;
};

// ── Severity helpers ─────────────────────────────────────────────────────────
function sevColor(opp: number) {
  if (opp >= 0.6) return "#e11d48";
  if (opp >= 0.4) return "#f59e0b";
  if (opp >= 0.2) return "#eab308";
  return "#059669";
}
function sevBg(opp: number) {
  if (opp >= 0.6) return "rgba(225,29,72,0.07)";
  if (opp >= 0.4) return "rgba(245,158,11,0.07)";
  if (opp >= 0.2) return "rgba(234,179,8,0.07)";
  return "rgba(5,150,105,0.07)";
}
function sevBorder(opp: number) {
  if (opp >= 0.6) return "rgba(225,29,72,0.22)";
  if (opp >= 0.4) return "rgba(245,158,11,0.22)";
  if (opp >= 0.2) return "rgba(234,179,8,0.22)";
  return "rgba(5,150,105,0.22)";
}
function sevLabel(opp: number) {
  if (opp >= 0.6) return "Critical";
  if (opp >= 0.4) return "High";
  if (opp >= 0.2) return "Medium";
  return "On track";
}

// ── Category Strength Panel ───────────────────────────────────────────────────
function CategoryStrengthPanel() {
  const { data, loading, refresh, fetchedAt } = useCachedFetch<CategoryMetric[]>(
    "api:categories/metrics",
    () => fetch("http://localhost:8000/categories/metrics").then((r) => r.json()),
  );
  const cats: CategoryMetric[] = data ?? [];

  // Sort by opportunity descending (largest gap first)
  const sorted = [...cats].sort((a, b) => b.opportunity_index - a.opportunity_index);

  // The max leader rate drives bar widths
  const maxRate = Math.max(...cats.map((c) => c.market_leader_rate), 0.01);

  return (
    <Panel
      title="Spend Category Strength · Opportunity Index"
      accent="amber"
      action={
        <div className="flex items-center gap-3">
          <CacheBar fetchedAt={fetchedAt} onRefresh={refresh} loading={loading} />
          <Link href="/categories" className="text-[11px] font-semibold" style={{ color: "#2563eb" }}>
            Full Analysis →
          </Link>
        </div>
      }
    >
      {loading && cats.length === 0 ? (
        <p className="py-4 text-center text-xs" style={{ color: "#3d5570" }}>Loading category data…</p>
      ) : sorted.length === 0 ? (
        <p className="py-4 text-center text-xs" style={{ color: "#3d5570" }}>No category data available.</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((c) => {
            const mashreqPct = (c.mashreq_rate / maxRate) * 100;
            const leaderPct  = (c.market_leader_rate / maxRate) * 100;
            const color      = sevColor(c.opportunity_index);
            const gapPP      = ((c.market_leader_rate - c.mashreq_rate) * 100).toFixed(1);

            return (
              <div
                key={c.key}
                className="rounded-xl p-3"
                style={{
                  background: sevBg(c.opportunity_index),
                  border: `1px solid ${sevBorder(c.opportunity_index)}`,
                }}
              >
                {/* Row 1: Category name + gap badge */}
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 16 }}>{c.icon}</span>
                    <span className="text-sm font-bold" style={{ color: "#0d1f2f" }}>{c.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      style={{
                        background: color + "18",
                        color,
                        border: `1px solid ${color}33`,
                      }}
                    >
                      {sevLabel(c.opportunity_index)}
                    </span>
                    <span
                      className="text-[11px] font-bold tabular-nums"
                      style={{ color }}
                    >
                      {c.underperforming ? "⚠ " : ""}{(c.opportunity_index * 100).toFixed(0)}% gap
                    </span>
                  </div>
                </div>

                {/* Dual bars */}
                <div className="space-y-1.5">
                  {/* Mashreq bar */}
                  <div className="flex items-center gap-2">
                    <span
                      className="w-[56px] shrink-0 text-right text-[10px] font-bold"
                      style={{ color: "#1d56db" }}
                    >
                      Mashreq
                    </span>
                    <div className="flex-1 relative">
                      <div className="h-3 w-full rounded-full" style={{ background: "rgba(29,86,219,0.10)" }}>
                        <div
                          className="h-3 rounded-full"
                          style={{
                            width: `${mashreqPct}%`,
                            background: "linear-gradient(90deg, #1d56db, #3b82f6)",
                            transition: "width 0.7s ease",
                          }}
                        />
                      </div>
                    </div>
                    <span
                      className="w-[36px] shrink-0 text-right text-[11px] font-bold tabular-nums"
                      style={{ color: "#1d56db" }}
                    >
                      {(c.mashreq_rate * 100).toFixed(1)}%
                    </span>
                  </div>

                  {/* Market Leader bar */}
                  <div className="flex items-center gap-2">
                    <span
                      className="w-[56px] shrink-0 text-right text-[10px] font-semibold"
                      style={{ color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                      title={c.market_leader_bank}
                    >
                      {c.market_leader_bank.split(" ")[0]}
                    </span>
                    <div className="flex-1 relative">
                      <div className="h-3 w-full rounded-full" style={{ background: "rgba(107,114,128,0.12)" }}>
                        <div
                          className="h-3 rounded-full"
                          style={{
                            width: `${leaderPct}%`,
                            background: c.opportunity_index >= 0.4
                              ? `linear-gradient(90deg, ${color}, ${color}cc)`
                              : "linear-gradient(90deg, #6b7280, #9ca3af)",
                            transition: "width 0.7s ease",
                          }}
                        />
                      </div>
                    </div>
                    <span
                      className="w-[36px] shrink-0 text-right text-[11px] font-bold tabular-nums"
                      style={{ color: c.opportunity_index >= 0.4 ? color : "#374151" }}
                    >
                      {(c.market_leader_rate * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Row 3: gap detail */}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: "#4a6480" }}>
                    Best: {c.market_leader_bank}{c.market_leader_card ? ` · ${c.market_leader_card}` : ""}
                  </span>
                  <span
                    className="text-[10px] font-bold tabular-nums"
                    style={{ color }}
                  >
                    +{gapPP}pp to close
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

// ── Market Page ────────────────────────────────────────────────────────────────
export default function MarketPage() {
  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-6">
        <h1
          className="font-heading text-2xl font-bold tracking-tight"
          style={{ color: "#1e2d3d" }}
        >
          Market Intelligence
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#4a6480" }}>
          UAE credit card landscape · competitive benchmarking, efficient frontier &amp; category strength.
        </p>
      </div>

      {/* Battlefield chart (frontier) */}
      <div className="mb-6">
        <BattlefieldChart />
      </div>

      {/* Category Strength Panel */}
      <div className="mb-6">
        <CategoryStrengthPanel />
      </div>

      {/* Full card universe table */}
      <CardIntelligenceTable />
    </main>
  );
}
