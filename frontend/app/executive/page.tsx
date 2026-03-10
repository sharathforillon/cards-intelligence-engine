"use client";

import { useState } from "react";
import Panel from "@/components/Panel";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const API = "http://localhost:8000";

type PortfolioKPIs = {
  total_active_cards: number;
  total_enr: number;
  activation_rate: number;
  monthly_spend_aed: number;
  annual_spend_aed: number;
  annual_revenue_aed: number;
  annual_cost_aed: number;
  net_annual_profit_aed: number;
  avg_revolve_rate: number;
  avg_npl_rate: number;
  monthly_ntb: number;
  blended_cac_aed: number;
};

type Memo = {
  period: string;
  generated_at: string;
  portfolio_kpis: PortfolioKPIs;
  bank_snapshot: Record<string, number | string>;
  top_segments: { label: string; tier: string; tier_badge_color: string; profit_per_customer: number }[];
  underperforming_categories: { label: string; opportunity_index: number }[];
  competitor_threats: { bank?: string; event?: string; impact?: string }[];
  strategy_actions: { rank: number; action: string; expected_annual_profit_aed: number; clv_36m: number }[];
  profit_projection: { month: string; projected_profit_aed: number }[];
  ai_narrative: string;
};

function KpiTile({ label, value, color = "#1e2d3d" }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl px-3 py-3" style={{ background: "#f8fafc", border: "1px solid #d1dde9" }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "#3d5570" }}>
        {label}
      </p>
      <p className="mt-1.5 text-base font-bold tabular-nums leading-tight" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

export default function ExecutivePage() {
  const [memo, setMemo] = useState<Memo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const data = await fetch(`${API}/executive/quarterly-memo`).then((r) => r.json());
      setMemo(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const kpis = memo?.portfolio_kpis;

  return (
    <main style={{ background: "var(--c-bg)", minHeight: "100vh", padding: "28px 32px" }}>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#3d5570" }}>
            Module 9
          </p>
          <h1 className="font-heading mt-1 text-xl font-bold" style={{ color: "#1e2d3d" }}>
            Executive Strategy Output
          </h1>
          <p className="mt-1 text-xs" style={{ color: "#4a6480" }}>
            Quarterly board memo generated from live portfolio, segment, category and competitor data.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {memo && (
            <button
              className="btn-ghost"
              style={{ fontSize: 11 }}
              onClick={() => window.print()}
            >
              🖨 Print / PDF
            </button>
          )}
          <button
            className="btn-primary"
            onClick={generate}
            disabled={loading}
          >
            {loading ? "Generating…" : "Generate Quarterly Memo"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl px-4 py-3 text-xs" style={{ background: "rgba(225,29,72,0.06)", border: "1px solid rgba(225,29,72,0.2)", color: "#e11d48" }}>
          Error: {error}
        </div>
      )}

      {!memo ? (
        <Panel>
          <div className="flex h-64 flex-col items-center justify-center gap-4">
            <p className="text-4xl">📋</p>
            <p className="text-sm font-semibold" style={{ color: "#1e2d3d" }}>
              No memo generated yet
            </p>
            <p className="text-xs" style={{ color: "#4a6480" }}>
              Click &quot;Generate Quarterly Memo&quot; above to produce the board report.
            </p>
          </div>
        </Panel>
      ) : (
        <div className="space-y-6">
          {/* Memo header */}
          <Panel accent="blue">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-heading text-base font-bold" style={{ color: "#1e2d3d" }}>
                  Mashreq Bank · Cards Division
                </p>
                <p className="text-xs" style={{ color: "#4a6480" }}>
                  Quarterly Board Memo · {memo.period} · Generated {memo.generated_at}
                </p>
              </div>
              <div
                className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em]"
                style={{ background: "rgba(37,99,235,0.08)", color: "#2563eb" }}
              >
                CONFIDENTIAL
              </div>
            </div>
          </Panel>

          {/* Portfolio KPIs */}
          {kpis && (
            <Panel title="Portfolio Performance · 8 Key Metrics" accent="emerald">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiTile label="Active Cards" value={kpis.total_active_cards.toLocaleString("en-US")} color="#2563eb" />
                <KpiTile label="Annual Spend" value={`AED ${(kpis.annual_spend_aed / 1e9).toFixed(1)}B`} color="#059669" />
                <KpiTile label="Annual Revenue" value={`AED ${(kpis.annual_revenue_aed / 1e6).toFixed(0)}M`} color="#059669" />
                <KpiTile label="Net Profit" value={`AED ${(kpis.net_annual_profit_aed / 1e6).toFixed(0)}M`} color={kpis.net_annual_profit_aed > 0 ? "#059669" : "#e11d48"} />
                <KpiTile label="Revolve Rate" value={`${kpis.avg_revolve_rate}%`} color="#d97706" />
                <KpiTile label="NPL Rate" value={`${kpis.avg_npl_rate}%`} color={kpis.avg_npl_rate > 2 ? "#e11d48" : "#059669"} />
                <KpiTile label="Monthly NTB" value={kpis.monthly_ntb.toLocaleString("en-US")} color="#7c3aed" />
                <KpiTile label="Blended CAC" value={`AED ${kpis.blended_cac_aed.toLocaleString("en-US")}`} />
              </div>
            </Panel>
          )}

          {/* AI Narrative */}
          {memo.ai_narrative && (
            <Panel title="AI-Generated Executive Summary" accent="violet">
              <div
                className="rounded-xl p-4 text-sm leading-relaxed"
                style={{ background: "#f8fafc", border: "1px solid #d1dde9", color: "#2d4a62", whiteSpace: "pre-line" }}
              >
                {memo.ai_narrative}
              </div>
            </Panel>
          )}

          {/* Competitor threats + segments in 2 cols */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Competitor threats */}
            <Panel title="Competitor Threats" accent="rose">
              <div className="rounded-xl" style={{ border: "1px solid #d1dde9" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Bank</th>
                      <th>Event</th>
                      <th>Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memo.competitor_threats.map((t, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, color: "#1e2d3d" }}>{t.bank ?? "?"}</td>
                        <td style={{ color: "#2d4a62" }}>{t.event ?? "—"}</td>
                        <td>
                          <span
                            className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                            style={{
                              background:
                                t.impact === "high" ? "rgba(225,29,72,0.08)"
                                : t.impact === "medium" ? "rgba(217,119,6,0.08)"
                                : "rgba(5,150,105,0.08)",
                              color:
                                t.impact === "high" ? "#e11d48"
                                : t.impact === "medium" ? "#d97706"
                                : "#059669",
                            }}
                          >
                            {t.impact ?? "low"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!memo.competitor_threats.length && (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-xs" style={{ color: "#3d5570" }}>
                          No recent competitor events.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>

            {/* Top segments */}
            <Panel title="Top Performing Segments" accent="blue">
              <div className="space-y-3">
                {memo.top_segments.map((seg, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5"
                    style={{ background: "#f8fafc", border: "1px solid #d1dde9" }}
                  >
                    <div>
                      <span className="text-xs font-bold" style={{ color: "#1e2d3d" }}>{seg.label}</span>
                      <span
                        className="ml-2 rounded-full px-2 py-0.5 text-[9px] font-bold text-white"
                        style={{ background: seg.tier_badge_color }}
                      >
                        {seg.tier}
                      </span>
                    </div>
                    <span className="text-xs font-bold tabular-nums" style={{ color: "#2563eb" }}>
                      AED {seg.profit_per_customer.toFixed(0)}/mo
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {/* Strategy actions */}
          <Panel title="Recommended Product Actions" accent="amber">
            <ol className="space-y-3">
              {memo.strategy_actions.map((a) => (
                <li
                  key={a.rank}
                  className="flex items-start gap-3 rounded-xl p-3"
                  style={{ background: "#f8fafc", border: "1px solid #d1dde9" }}
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ background: "#d97706" }}
                  >
                    {a.rank}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold" style={{ color: "#1e2d3d" }}>{a.action}</p>
                    <p className="mt-0.5 text-[10px]" style={{ color: "#4a6480" }}>
                      Expected annual profit: AED {(a.expected_annual_profit_aed / 1e6).toFixed(1)}M ·
                      36m CLV: AED {a.clv_36m.toFixed(0)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          {/* 12-month profit projection */}
          {memo.profit_projection.length > 0 && (
            <Panel title="12-Month Profit Projection (AED)" accent="emerald">
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={memo.profit_projection} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d1dde9" strokeOpacity={0.7} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: "#4a6480" }}
                      axisLine={{ stroke: "#d1dde9" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#4a6480" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#fff",
                        border: "1px solid #d1dde9",
                        borderRadius: "8px",
                        fontSize: 12,
                        color: "#1e2d3d",
                      }}
                      formatter={(v: unknown) => [`AED ${((v as number) / 1e6).toFixed(2)}M`, "Projected Profit"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="projected_profit_aed"
                      stroke="#059669"
                      strokeWidth={2.5}
                      dot={{ fill: "#059669", r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          )}
        </div>
      )}
    </main>
  );
}
