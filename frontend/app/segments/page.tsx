"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/Panel";
import SegmentProfitabilityChart from "@/components/SegmentProfitabilityChart";
import SegmentRankingTable from "@/components/SegmentRankingTable";

type SegmentRow = {
  key: string;
  rank: number;
  label: string;
  icon: string;
  tier: string;
  tier_badge_color: string;
  tier_color: string;
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
  const [ranked, setRanked] = useState<SegmentRow[]>([]);
  const [churn, setChurn] = useState<ChurnRow[]>([]);
  const [growth, setGrowth] = useState<GrowthRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [r1, r2, r3] = await Promise.all([
          fetch(`${API}/segments/profitability`).then((r) => r.json()),
          fetch(`${API}/segments/churn-risk`).then((r) => r.json()),
          fetch(`${API}/segments/growth-opportunities`).then((r) => r.json()),
        ]);
        setRanked(r1);
        setChurn(r2);
        setGrowth(r3);
      } catch (e) {
        console.error("Failed to load segment data", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalCards = ranked.reduce((s, r) => s + r.cards_issued, 0);

  return (
    <main style={{ background: "var(--c-bg)", minHeight: "100vh", padding: "28px 32px" }}>
      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#3d5570" }}>
          Module 4
        </p>
        <h1 className="font-heading mt-1 text-xl font-bold" style={{ color: "#1e2d3d" }}>
          Customer Segment Intelligence
        </h1>
        <p className="mt-1 text-xs" style={{ color: "#4a6480" }}>
          Per-segment profitability, churn risk, and growth opportunities — powered by simulation.
        </p>
      </div>

      {/* Section 1: Profitability chart + ranking */}
      <div className="mb-6 grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Panel title="Profit per Customer by Segment (AED / month)" accent="blue">
            <SegmentProfitabilityChart data={ranked} />
          </Panel>
        </div>
        <div className="lg:col-span-5">
          <Panel title="Segment Ranking" accent="violet">
            <SegmentRankingTable data={ranked} />
          </Panel>
        </div>
      </div>

      {/* Section 2: Growth opportunity cards */}
      <div className="mb-6">
        <Panel title="Growth Opportunities · Revenue Upside from +0.5pp Reward Rate" accent="emerald">
          {loading ? (
            <p className="text-xs" style={{ color: "#3d5570" }}>Loading…</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {growth.map((g) => (
                <div
                  key={g.key}
                  className="rounded-xl p-3"
                  style={{
                    border: `1px solid ${g.tier_color}33`,
                    background: `${g.tier_color}08`,
                  }}
                >
                  <p className="text-lg">{g.icon}</p>
                  <p className="mt-1 text-xs font-bold" style={{ color: "#1e2d3d" }}>{g.label}</p>
                  <p className="mt-2 text-lg font-bold tabular-nums" style={{ color: g.tier_color }}>
                    +{g.acquisition_uplift_cards.toLocaleString("en-US")} cards
                  </p>
                  <p className="text-[10px]" style={{ color: "#4a6480" }}>
                    AED {(g.revenue_opportunity_aed / 1_000_000).toFixed(1)}M opportunity
                  </p>
                  <span
                    className="mt-2 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase text-white"
                    style={{
                      background:
                        g.opportunity_size === "large" ? "#059669"
                        : g.opportunity_size === "medium" ? "#d97706"
                        : "#4a6480",
                    }}
                  >
                    {g.opportunity_size}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Section 3: Churn risk */}
      <div>
        <Panel title="Churn Risk · Annual Revenue at Risk per Segment" accent="rose">
          <div className="space-y-3">
            {churn.map((row) => {
              const barPct = Math.min((row.revenue_at_risk_aed / Math.max(...churn.map((r) => r.revenue_at_risk_aed))) * 100, 100);
              return (
                <div key={row.key} className="rounded-xl p-3" style={{ border: "1px solid #d1dde9", background: "#f8fafc" }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span>{row.icon}</span>
                        <span className="text-xs font-bold" style={{ color: "#1e2d3d" }}>{row.label}</span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-bold text-white"
                          style={{ background: row.risk_color }}
                        >
                          {row.risk_level} risk
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full" style={{ background: "#d1dde9" }}>
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${barPct}%`, background: row.risk_color, transition: "width 0.6s ease" }}
                        />
                      </div>
                      <p className="mt-1.5 text-[10px]" style={{ color: "#4a6480" }}>
                        💡 {row.recommended_action}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold tabular-nums" style={{ color: row.risk_color }}>
                        AED {(row.revenue_at_risk_aed / 1_000_000).toFixed(1)}M
                      </p>
                      <p className="text-[10px]" style={{ color: "#3d5570" }}>at risk/yr</p>
                      <p className="mt-1 text-[10px]" style={{ color: "#4a6480" }}>
                        {row.cards_at_risk_annually.toLocaleString("en-US")} cards · {(row.churn_rate * 100).toFixed(0)}% churn
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </main>
  );
}
