"use client";

import { useState, useEffect } from "react";
import Panel from "@/components/Panel";
import BattlefieldChart from "@/components/BattlefieldChart";
import CannibalizationChart from "@/components/CannibalizationChart";

const SIM_HISTORY_KEY = "launch_sim_history";

const API = "http://localhost:8000";

const CATEGORIES = [
  { key: "dining", label: "Dining" },
  { key: "grocery", label: "Grocery" },
  { key: "travel", label: "Travel" },
  { key: "online", label: "Online" },
  { key: "fuel", label: "Fuel" },
  { key: "luxury_retail", label: "Luxury" },
];

const SEGMENTS = [
  { value: "", label: "All Segments" },
  { value: "salary_bank_customers", label: "Mass Market" },
  { value: "core_professionals", label: "Mass Affluent" },
  { value: "affluent_lifestyle", label: "Affluent" },
  { value: "premium_travelers", label: "Premium Travelers" },
  { value: "category_maximizers", label: "Category Maximizers" },
];

type SimSnapshot = {
  id: string;           // timestamp-based unique id
  timestamp: string;    // ISO string
  cardName: string;
  annualFee: number;
  baseReward: number;
  targetSegment: string;
  result: LaunchResult;
};

type LaunchResult = {
  card_name: string;
  effective_reward_rate: number;
  strategy: {
    clv_analysis?: { yearly_profit?: number; clv_36m?: number };
    market_analysis?: { mashreq_share?: number };
    acquisition_forecast?: { expected_acquisitions?: number };
  };
  cannibalization: {
    redistribution: {
      card_name: string;
      current_active: number;
      cards_shifted: number;
      cards_retained: number;
      overlap_pct: number;
      revenue_lost_aed: number;
    }[];
    total_revenue_lost_aed: number;
    new_card_acquisitions: number;
    new_card_annual_value_aed: number;
    net_portfolio_growth_aed: number;
    mashreq_market_share_before: number;
    mashreq_market_share_after: number;
    market_share_delta_pp: number;
    cannibalization_risk: boolean;
    net_positive: boolean;
  };
};

function Slider({
  label, value, min, max, step, onChange, format,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-[11px] font-semibold" style={{ color: "#1e2d3d" }}>{label}</label>
        <span className="text-[11px] font-bold tabular-nums" style={{ color: "#2563eb" }}>
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="flex justify-between text-[9px]" style={{ color: "#4a6480" }}>
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

export default function LaunchPage() {
  const [cardName, setCardName] = useState("New Mashreq Card");
  const [annualFee, setAnnualFee] = useState(200);
  const [baseReward, setBaseReward] = useState(2.5);
  const [benefitsStrength, setBenefitsStrength] = useState(0.65);
  const [targetSegment, setTargetSegment] = useState("");
  const [minSalary, setMinSalary] = useState(5000);
  const [catRewards, setCatRewards] = useState<Record<string, number>>({});
  const [showCatRewards, setShowCatRewards] = useState(false);

  const [result, setResult] = useState<LaunchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<SimSnapshot[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIM_HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  async function simulate() {
    setLoading(true);
    setError("");
    try {
      const body = {
        card_name: cardName,
        annual_fee: annualFee,
        reward_rate: baseReward / 100,
        category_rewards: Object.fromEntries(
          Object.entries(catRewards).filter(([, v]) => v > 0).map(([k, v]) => [k, v / 100])
        ),
        fx_markup: 0,
        benefits_strength: benefitsStrength,
        target_segment: targetSegment || null,
        min_salary: minSalary || null,
      };
      const res = await fetch(`${API}/simulate/product-launch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data: LaunchResult = await res.json();
      setResult(data);

      // Save to history
      const snapshot: SimSnapshot = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        cardName,
        annualFee,
        baseReward,
        targetSegment,
        result: data,
      };
      setHistory((prev) => {
        const updated = [snapshot, ...prev].slice(0, 20); // keep last 20
        try { localStorage.setItem(SIM_HISTORY_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
        return updated;
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const simulatedCard = result
    ? { annual_fee: annualFee, cashback_rate: result.effective_reward_rate, label: cardName }
    : undefined;

  const cann = result?.cannibalization;

  return (
    <main style={{ background: "var(--c-bg)", minHeight: "100vh", padding: "28px 32px" }}>
      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#3d5570" }}>
          Module 5
        </p>
        <h1 className="font-heading mt-1 text-xl font-bold" style={{ color: "#1e2d3d" }}>
          Product Launch Simulator
        </h1>
        <p className="mt-1 text-xs" style={{ color: "#4a6480" }}>
          Design a new card, simulate its market impact, cannibalization risk, and net portfolio growth.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Left: form */}
        <div className="lg:col-span-5">
          <Panel title="Card Design Parameters" accent="blue">
            <div className="space-y-4">
              {/* Card name */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold" style={{ color: "#1e2d3d" }}>
                  Card Name
                </label>
                <input
                  className="input-dark"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="e.g. Mashreq Prestige"
                />
              </div>

              <Slider
                label="Annual Fee (AED)"
                value={annualFee}
                min={0}
                max={2000}
                step={50}
                onChange={setAnnualFee}
                format={(v) => `AED ${v}`}
              />
              <Slider
                label="Base Reward Rate"
                value={baseReward}
                min={0.5}
                max={6}
                step={0.1}
                onChange={setBaseReward}
                format={(v) => `${v.toFixed(1)}%`}
              />
              <Slider
                label="Benefits Strength"
                value={benefitsStrength}
                min={0.3}
                max={1.0}
                step={0.05}
                onChange={setBenefitsStrength}
                format={(v) => `${(v * 100).toFixed(0)}%`}
              />

              {/* Category rewards (collapsible) */}
              <div>
                <button
                  type="button"
                  className="btn-ghost w-full justify-between"
                  style={{ fontSize: 11 }}
                  onClick={() => setShowCatRewards(!showCatRewards)}
                >
                  Category Reward Rates (optional)
                  <span>{showCatRewards ? "▲" : "▼"}</span>
                </button>
                {showCatRewards && (
                  <div className="mt-3 space-y-3 rounded-xl p-3" style={{ background: "#f8fafc", border: "1px solid #d1dde9" }}>
                    {CATEGORIES.map((cat) => (
                      <Slider
                        key={cat.key}
                        label={cat.label}
                        value={catRewards[cat.key] ?? 0}
                        min={0}
                        max={10}
                        step={0.5}
                        onChange={(v) => setCatRewards({ ...catRewards, [cat.key]: v })}
                        format={(v) => `${v.toFixed(1)}%`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Target segment + min salary */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold" style={{ color: "#1e2d3d" }}>
                  Target Segment
                </label>
                <select
                  className="input-dark"
                  value={targetSegment}
                  onChange={(e) => setTargetSegment(e.target.value)}
                >
                  {SEGMENTS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold" style={{ color: "#1e2d3d" }}>
                  Min. Monthly Salary (AED)
                </label>
                <input
                  type="number"
                  className="input-dark"
                  value={minSalary}
                  onChange={(e) => setMinSalary(Number(e.target.value))}
                  min={0}
                  step={1000}
                />
              </div>

              <button
                className="btn-primary w-full justify-center"
                onClick={simulate}
                disabled={loading}
              >
                {loading ? "Simulating…" : "▶ Run Simulation"}
              </button>
              {error && (
                <p className="text-xs" style={{ color: "#e11d48" }}>Error: {error}</p>
              )}
            </div>
          </Panel>
        </div>

        {/* Right: results */}
        <div className="space-y-5 lg:col-span-7">
          {/* KPI tiles */}
          <Panel title="Simulation Results" accent="emerald">
            {!result ? (
              <p className="py-8 text-center text-xs" style={{ color: "#3d5570" }}>
                Configure the card on the left and click Run Simulation.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  {
                    label: "New Acquisitions",
                    value: (cann?.new_card_acquisitions ?? 0).toLocaleString("en-US"),
                    color: "#2563eb",
                  },
                  {
                    label: "Effective Reward Rate",
                    value: `${(result.effective_reward_rate * 100).toFixed(2)}%`,
                    color: "#7c3aed",
                  },
                  {
                    label: "New Card Annual Value",
                    value: `AED ${((cann?.new_card_annual_value_aed ?? 0) / 1_000_000).toFixed(2)}M`,
                    color: "#059669",
                  },
                  {
                    label: "Revenue Lost (Cann.)",
                    value: `AED ${((cann?.total_revenue_lost_aed ?? 0) / 1_000_000).toFixed(2)}M`,
                    color: "#e11d48",
                  },
                  {
                    label: "Net Portfolio Growth",
                    value: `AED ${((cann?.net_portfolio_growth_aed ?? 0) / 1_000_000).toFixed(2)}M`,
                    color: (cann?.net_positive) ? "#059669" : "#e11d48",
                  },
                  {
                    label: "Market Share Delta",
                    value: `${cann?.market_share_delta_pp ?? 0 > 0 ? "+" : ""}${cann?.market_share_delta_pp ?? 0}pp`,
                    color: (cann?.market_share_delta_pp ?? 0) > 0 ? "#059669" : "#e11d48",
                  },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-xl px-3 py-2.5"
                    style={{ background: "#f8fafc", border: "1px solid #d1dde9" }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "#3d5570" }}>
                      {kpi.label}
                    </p>
                    <p className="mt-1 text-sm font-bold tabular-nums" style={{ color: kpi.color }}>
                      {kpi.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {cann && (
              <div
                className="mt-3 rounded-xl px-3 py-2"
                style={{
                  background: cann.cannibalization_risk ? "rgba(225,29,72,0.06)" : "rgba(5,150,105,0.06)",
                  border: `1px solid ${cann.cannibalization_risk ? "rgba(225,29,72,0.2)" : "rgba(5,150,105,0.2)"}`,
                }}
              >
                <p className="text-xs font-bold" style={{ color: cann.cannibalization_risk ? "#e11d48" : "#059669" }}>
                  {cann.cannibalization_risk
                    ? "⚠ Cannibalization risk: revenue lost exceeds new card value. Review pricing."
                    : "✓ Net positive: new card value exceeds cannibalization losses."}
                </p>
              </div>
            )}
          </Panel>

          {/* Cannibalization chart */}
          {cann && cann.redistribution.length > 0 && (
            <Panel title="Cannibalization · Card Redistribution by Existing Card" accent="rose">
              <CannibalizationChart data={cann.redistribution} />
            </Panel>
          )}
        </div>
      </div>

      {/* Full-width Battlefield with simulated card */}
      <div className="mt-6">
        <BattlefieldChart simulatedCard={simulatedCard} />
      </div>

      {/* ── SIMULATION HISTORY ─────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="mt-6">
          <Panel
            title={`Simulation History · ${history.length} run${history.length !== 1 ? "s" : ""}`}
            accent="violet"
            action={
              <div className="flex items-center gap-3">
                <button
                  className="btn-ghost"
                  style={{ fontSize: 11 }}
                  onClick={() => {
                    if (confirm("Clear all simulation history?")) {
                      setHistory([]);
                      localStorage.removeItem(SIM_HISTORY_KEY);
                    }
                  }}
                >
                  🗑 Clear
                </button>
                <button
                  className="btn-ghost"
                  style={{ fontSize: 11 }}
                  onClick={() => setShowHistory(!showHistory)}
                >
                  {showHistory ? "▲ Collapse" : "▼ Expand"}
                </button>
              </div>
            }
          >
            {/* Always show the 3 most recent; expand for all */}
            <div className="space-y-2">
              {(showHistory ? history : history.slice(0, 3)).map((snap) => {
                const cann = snap.result.cannibalization;
                const netPositive = cann?.net_positive;
                const segLabel = SEGMENTS.find((s) => s.value === snap.targetSegment)?.label ?? "All Segments";
                return (
                  <div
                    key={snap.id}
                    className="rounded-xl p-3"
                    style={{
                      background: netPositive ? "rgba(5,150,105,0.04)" : "rgba(225,29,72,0.04)",
                      border: `1px solid ${netPositive ? "rgba(5,150,105,0.18)" : "rgba(225,29,72,0.18)"}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold" style={{ color: "#0d1f2f" }}>
                            {snap.cardName}
                          </span>
                          <span
                            className="rounded-full px-2 py-0.5 text-[9px] font-bold text-white"
                            style={{ background: netPositive ? "#059669" : "#e11d48" }}
                          >
                            {netPositive ? "Net +" : "Net −"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[10px]" style={{ color: "#4a6480" }}>
                          AED {snap.annualFee} fee · {snap.baseReward.toFixed(1)}% reward · {segLabel}
                          {" · "}{new Date(snap.timestamp).toLocaleString("en-AE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-4 text-right">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "#3d5570" }}>Acquisitions</p>
                          <p className="text-sm font-bold tabular-nums" style={{ color: "#2563eb" }}>
                            {(cann?.new_card_acquisitions ?? 0).toLocaleString("en-US")}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "#3d5570" }}>Net Growth</p>
                          <p className="text-sm font-bold tabular-nums" style={{ color: netPositive ? "#059669" : "#e11d48" }}>
                            AED {((cann?.net_portfolio_growth_aed ?? 0) / 1_000_000).toFixed(2)}M
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "#3d5570" }}>Mkt Share Δ</p>
                          <p className="text-sm font-bold tabular-nums" style={{ color: (cann?.market_share_delta_pp ?? 0) > 0 ? "#059669" : "#e11d48" }}>
                            {(cann?.market_share_delta_pp ?? 0) > 0 ? "+" : ""}{cann?.market_share_delta_pp ?? 0}pp
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!showHistory && history.length > 3 && (
                <button
                  className="btn-ghost w-full justify-center text-[11px]"
                  onClick={() => setShowHistory(true)}
                >
                  Show {history.length - 3} more simulations ▼
                </button>
              )}
            </div>
          </Panel>
        </div>
      )}
    </main>
  );
}
