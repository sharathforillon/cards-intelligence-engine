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

type BankSnapshot = {
  period?: string;
  source?: string;
  note?: string;
  net_interest_yield_pct?: number;
  cost_income_ratio?: number;
  blended_reward_rate_pct?: number;
  npl_rate_pct?: number;
  delinquency_30dpd_pct?: number;
  avg_revolve_rate_pct?: number;
  avg_utilisation_pct?: number;
  digital_penetration?: number;
  market_share?: number | null;
  raroc?: number | null;
  roe?: number | null;
  nps?: number | null;
  nim?: number;
};

type CardProduct = {
  card_name: string;
  active_cards: number;
  monthly_spend_aed: number;
  reward_rate: number;
  annual_fee: number;
  revolve_rate: number;
  monthly_profit_aed: number;
};

type Memo = {
  period: string;
  generated_at: string;
  portfolio_kpis: PortfolioKPIs & { cards_by_product?: CardProduct[] };
  bank_snapshot: BankSnapshot;
  top_segments: { label: string; tier: string; tier_badge_color: string; profit_per_customer: number }[];
  underperforming_categories: { label: string; opportunity_index: number }[];
  competitor_threats: { bank?: string; card?: string; event?: string; impact?: string }[];
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

          {/* Portfolio Ratios (bank_snapshot) */}
          {memo.bank_snapshot && Object.keys(memo.bank_snapshot).length > 0 && (
            <Panel title="Portfolio Risk & Yield Ratios" accent="amber">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {memo.bank_snapshot.net_interest_yield_pct != null && (
                  <KpiTile label="Net Interest Yield" value={`${memo.bank_snapshot.net_interest_yield_pct}%`} color="#7c3aed" />
                )}
                {memo.bank_snapshot.cost_income_ratio != null && (
                  <KpiTile label="Cost-Income Ratio" value={`${memo.bank_snapshot.cost_income_ratio}%`} color={(memo.bank_snapshot.cost_income_ratio as number) > 80 ? "#e11d48" : "#059669"} />
                )}
                {memo.bank_snapshot.blended_reward_rate_pct != null && (
                  <KpiTile label="Blended Reward Rate" value={`${memo.bank_snapshot.blended_reward_rate_pct}%`} color="#d97706" />
                )}
                {memo.bank_snapshot.npl_rate_pct != null && (
                  <KpiTile label="NPL Rate" value={`${memo.bank_snapshot.npl_rate_pct}%`} color={(memo.bank_snapshot.npl_rate_pct as number) > 2 ? "#e11d48" : "#059669"} />
                )}
                {memo.bank_snapshot.delinquency_30dpd_pct != null && (
                  <KpiTile label="30-DPD Delinquency" value={`${memo.bank_snapshot.delinquency_30dpd_pct}%`} color={(memo.bank_snapshot.delinquency_30dpd_pct as number) > 3 ? "#e11d48" : "#d97706"} />
                )}
                {memo.bank_snapshot.avg_revolve_rate_pct != null && (
                  <KpiTile label="Revolve Rate" value={`${memo.bank_snapshot.avg_revolve_rate_pct}%`} color="#2563eb" />
                )}
                {memo.bank_snapshot.avg_utilisation_pct != null && (
                  <KpiTile label="Utilisation Rate" value={`${memo.bank_snapshot.avg_utilisation_pct}%`} color="#0891b2" />
                )}
                {memo.bank_snapshot.digital_penetration != null && (
                  <KpiTile label="Digital Penetration" value={`${memo.bank_snapshot.digital_penetration}%`} color="#059669" />
                )}
              </div>
              {memo.bank_snapshot.note && (
                <p className="mt-3 text-[10px] italic" style={{ color: "#6b7280" }}>
                  ℹ {memo.bank_snapshot.note as string}
                </p>
              )}
            </Panel>
          )}

          {/* Card-level P&L breakdown */}
          {kpis?.cards_by_product && kpis.cards_by_product.length > 0 && (
            <Panel title="Product P&L Breakdown" accent="blue">
              <div className="overflow-auto rounded-xl" style={{ border: "1px solid #d1dde9" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Card</th>
                      <th>Active Cards</th>
                      <th>Monthly Spend</th>
                      <th>Reward Rate</th>
                      <th>Annual Fee</th>
                      <th>Revolve Rate</th>
                      <th>Monthly Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpis.cards_by_product.map((c) => (
                      <tr key={c.card_name}>
                        <td className="font-semibold" style={{ color: "#1e2d3d" }}>{c.card_name}</td>
                        <td>{c.active_cards.toLocaleString("en-US")}</td>
                        <td>AED {(c.monthly_spend_aed / 1e6).toFixed(0)}M</td>
                        <td>{c.reward_rate}%</td>
                        <td>{c.annual_fee > 0 ? `AED ${c.annual_fee}` : "Free"}</td>
                        <td>{c.revolve_rate}%</td>
                        <td style={{ fontWeight: 700, color: c.monthly_profit_aed >= 0 ? "#059669" : "#e11d48" }}>
                          AED {(c.monthly_profit_aed / 1e6).toFixed(2)}M
                          {c.monthly_profit_aed < 0 && " ⚠"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {kpis.cards_by_product.some((c) => c.monthly_profit_aed < 0) && (
                <div className="mt-3 rounded-lg px-4 py-2.5 text-xs" style={{ background: "rgba(225,29,72,0.06)", border: "1px solid rgba(225,29,72,0.18)", color: "#e11d48" }}>
                  ⚠ One or more products show negative monthly P&L. Review reward cost structure and fee pricing.
                </div>
              )}
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
            <Panel title="Competitor Intelligence" accent="rose">
              <div className="rounded-xl" style={{ border: "1px solid #d1dde9" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Bank</th>
                      <th>Card</th>
                      <th>Offer</th>
                      <th>Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memo.competitor_threats.map((t, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600, color: "#1e2d3d" }}>{t.bank ?? "?"}</td>
                        <td style={{ color: "#4a6480", fontSize: 11 }}>{t.card ?? "—"}</td>
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
