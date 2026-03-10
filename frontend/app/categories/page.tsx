"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/Panel";
import CategoryRadarChart from "@/components/CategoryRadarChart";

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

const API = "http://localhost:8000";

export default function CategoriesPage() {
  const [metrics, setMetrics] = useState<CategoryMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetch(`${API}/categories/metrics`).then((r) => r.json());
        setMetrics(data);
      } catch (e) {
        console.error("Failed to load category data", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const underperforming = metrics.filter((m) => m.underperforming);
  const maxOpportunity = Math.max(...metrics.map((m) => m.opportunity_index), 0.001);

  return (
    <main style={{ background: "var(--c-bg)", minHeight: "100vh", padding: "28px 32px" }}>
      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#3d5570" }}>
          Module 5 · Spend
        </p>
        <h1 className="font-heading mt-1 text-xl font-bold" style={{ color: "#1e2d3d" }}>
          Spend Category Intelligence
        </h1>
        <p className="mt-1 text-xs" style={{ color: "#4a6480" }}>
          Mashreq reward rate vs. market leader across 6 spend categories — identify where to invest.
        </p>
      </div>

      {/* Radar + metrics table */}
      <div className="mb-6 grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Panel title="Mashreq vs Market Leader · Reward Rate by Category" accent="blue">
            <CategoryRadarChart data={metrics} />
          </Panel>
        </div>
        <div className="lg:col-span-4">
          <Panel title="Category Metrics" accent="violet">
            {loading ? (
              <p className="text-xs" style={{ color: "#3d5570" }}>Loading…</p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-auto">
                {metrics.map((m) => (
                  <div
                    key={m.key}
                    className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{
                      background: m.underperforming ? "rgba(225,29,72,0.05)" : "#f8fafc",
                      border: `1px solid ${m.underperforming ? "rgba(225,29,72,0.2)" : "#d1dde9"}`,
                    }}
                  >
                    <div>
                      <p className="text-xs font-bold" style={{ color: "#1e2d3d" }}>
                        {m.icon} {m.label}
                      </p>
                      <p className="text-[10px]" style={{ color: "#4a6480" }}>
                        Mashreq: <span style={{ color: "#1d56db", fontWeight: 700 }}>{(m.mashreq_rate * 100).toFixed(1)}%</span>
                        {" vs "}
                        <span style={{ color: "#be123c", fontWeight: 700 }}>{(m.market_leader_rate * 100).toFixed(1)}%</span>
                        {" "}
                        <span style={{ color: "#be123c", fontWeight: 600 }}>
                          ({m.market_leader_bank}{m.market_leader_card ? ` · ${m.market_leader_card}` : ""})
                        </span>
                      </p>
                    </div>
                    {m.underperforming && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                        style={{ background: "rgba(225,29,72,0.1)", color: "#e11d48" }}
                      >
                        Gap {(m.opportunity_index * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {/* Opportunity bar chart */}
      <div className="mb-6">
        <Panel title="Opportunity Index · How Far Mashreq Lags the Market Leader (higher = bigger gap)" accent="amber">
          <div className="space-y-3">
            {metrics.map((m) => {
              const barPct = (m.opportunity_index / maxOpportunity) * 100;
              return (
                <div key={m.key}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: "#1e2d3d" }}>
                      {m.icon} {m.label}
                    </span>
                    <span
                      className="text-xs font-bold tabular-nums"
                      style={{ color: m.underperforming ? "#e11d48" : "#059669" }}
                    >
                      {(m.opportunity_index * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full" style={{ background: "#d1dde9" }}>
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${barPct}%`,
                        background: m.underperforming ? "#e11d48" : "#059669",
                        transition: "width 0.6s ease",
                      }}
                    />
                  </div>
                  <p className="mt-0.5 text-[10px]" style={{ color: "#4a6480" }}>
                    Leader: {m.market_leader_bank} @ {(m.market_leader_rate * 100).toFixed(1)}% ·
                    Spend share: {(m.spend_share * 100).toFixed(0)}% of portfolio
                  </p>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Underperforming callout */}
      {underperforming.length > 0 && (
        <Panel title={`⚠ ${underperforming.length} Underperforming Categories (opportunity index > 20%)`} accent="rose">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {underperforming.map((m) => (
              <div
                key={m.key}
                className="rounded-xl p-3"
                style={{ background: "rgba(225,29,72,0.04)", border: "1px solid rgba(225,29,72,0.18)" }}
              >
                <p className="text-lg">{m.icon}</p>
                <p className="mt-1 text-xs font-bold" style={{ color: "#1e2d3d" }}>{m.label}</p>
                <p className="mt-2 text-sm font-bold" style={{ color: "#e11d48" }}>
                  {(m.opportunity_index * 100).toFixed(0)}% gap
                </p>
                <p className="text-[10px]" style={{ color: "#4a6480" }}>
                  Mashreq <strong style={{ color: "#1d56db" }}>{(m.mashreq_rate * 100).toFixed(1)}%</strong>
                  {" vs "}
                  <strong style={{ color: "#be123c" }}>{m.market_leader_bank} {(m.market_leader_rate * 100).toFixed(1)}%</strong>
                </p>
                {m.market_leader_card && (
                  <p className="mt-0.5 text-[10px]" style={{ color: "#7f1d1d", fontWeight: 600 }}>
                    📋 {m.market_leader_card}
                  </p>
                )}
                <p className="mt-1 text-[10px]" style={{ color: "#4a6480" }}>
                  Top: {m.top_3_banks.map((b) => `${b.bank} ${(b.rate * 100).toFixed(1)}%`).join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </main>
  );
}
