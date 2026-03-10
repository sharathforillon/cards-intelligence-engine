"use client";

import { useEffect, useState } from "react";
import Panel from "./Panel";

type StrategyResult = {
  strategy: { reward_rate: number; annual_fee: number; features: number };
  financials: { portfolio_clv: number; expected_roe: number; raroc: number; annual_profit: number };
  capital: { capital_required: number };
  strategy_score: number;
};

const GRID: { reward_rate: number; annual_fee: number; features: number }[] = [
  { reward_rate: 0.02,  annual_fee: 0,   features: 0.6 },
  { reward_rate: 0.025, annual_fee: 200, features: 0.6 },
  { reward_rate: 0.03,  annual_fee: 200, features: 0.7 },
  { reward_rate: 0.035, annual_fee: 400, features: 0.7 },
  { reward_rate: 0.04,  annual_fee: 400, features: 0.8 },
];

const rankConfig = [
  { bg: "rgba(217,119,6,0.07)",   border: "rgba(217,119,6,0.22)",   badge: "#d97706", label: "🥇" },
  { bg: "rgba(100,116,139,0.06)", border: "rgba(100,116,139,0.18)", badge: "#64748b", label: "🥈" },
  { bg: "rgba(180,120,80,0.05)",  border: "rgba(180,120,80,0.16)",  badge: "#b47850", label: "🥉" },
];

export default function StrategyLeaderboard() {
  const [rows, setRows] = useState<StrategyResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function runGrid() {
    setLoading(true);
    try {
      const results: StrategyResult[] = [];
      for (const s of GRID) {
        const res = await fetch("http://localhost:8000/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(s),
        });
        const data = await res.json();
        results.push(data);
      }
      results.sort((a, b) => b.strategy_score - a.strategy_score);
      setRows(results);
    } catch (e) {
      console.error("Failed to run strategy grid", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { runGrid(); }, []);

  return (
    <Panel
      title="Strategy Optimizer · Leaderboard"
      accent="violet"
      action={
        <button onClick={runGrid} className="btn-ghost" disabled={loading}>
          {loading ? "Running…" : "↺ Run grid"}
        </button>
      }
    >
      <p className="mb-3 text-xs" style={{ color: "#4a6480" }}>
        Ranked by composite{" "}
        <span style={{ color: "#7c3aed" }} className="font-semibold">strategy_score</span>{" "}
        across CLV, ROE, acquisition and market share.
      </p>

      <div className="overflow-hidden rounded-xl" style={{ border: "1px solid #d1dde9" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Reward</th>
              <th>Annual Fee</th>
              <th style={{ textAlign: "right" }}>ROE</th>
              <th style={{ textAlign: "right" }}>RAROC</th>
              <th style={{ textAlign: "right" }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const rank = rankConfig[idx];
              return (
                <tr
                  key={idx}
                  style={
                    rank
                      ? { background: rank.bg, borderLeft: `2px solid ${rank.border}` }
                      : idx === rows.length - 1
                        ? { background: "rgba(225,29,72,0.04)" }
                        : undefined
                  }
                >
                  <td>
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{
                        background: rank ? `${rank.badge}18` : "#f1f5f9",
                        color: rank ? rank.badge : "#3d5570",
                      }}
                    >
                      {rank ? rank.label : idx + 1}
                    </span>
                  </td>
                  <td className="font-medium" style={{ color: "#059669" }}>
                    {(r.strategy.reward_rate * 100).toFixed(1)}%
                  </td>
                  <td style={{ color: "#2d4a62" }}>AED {r.strategy.annual_fee}</td>
                  <td className="tabular-nums" style={{
                    textAlign: "right",
                    color: r.financials.expected_roe >= 18 ? "#059669" : "#e11d48",
                  }}>
                    {r.financials.expected_roe.toFixed(1)}%
                  </td>
                  <td className="tabular-nums" style={{
                    textAlign: "right",
                    color: r.financials.raroc >= 18 ? "#059669" : "#e11d48",
                  }}>
                    {r.financials.raroc.toFixed(1)}%
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <span
                      className="rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums"
                      style={{ background: "rgba(124,58,237,0.08)", color: "#7c3aed" }}
                    >
                      {r.strategy_score.toFixed(2)}
                    </span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs" style={{ color: "#3d5570" }}>
                  {loading ? "Running strategy simulation…" : "No strategies evaluated yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
