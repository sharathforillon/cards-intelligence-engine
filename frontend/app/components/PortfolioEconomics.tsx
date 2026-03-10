"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import Panel from "./Panel";

/* ── Types ──────────────────────────────────────────────────────────────── */

type Inputs = {
  active_cards:      number;   // total active cards
  avg_spend:         number;   // AED / card / month
  revolve_rate:      number;   // % 0–100 (% of spend that revolves)
  annual_fee:        number;   // AED / card / year
  fx_markup:         number;   // % e.g. 2.99
  interchange_rate:  number;   // % e.g. 1.5
  reward_rate:       number;   // % e.g. 1.0
  benefits_cost:     number;   // AED / card / year
  credit_loss_rate:  number;   // % of outstanding balance (annual)
  acquisition_cost:  number;   // AED / card (amortised over 3 yrs)
};

const DEFAULTS: Inputs = {
  active_cards:     50_000,
  avg_spend:         3_500,
  revolve_rate:         35,
  annual_fee:          400,
  fx_markup:          2.99,
  interchange_rate:    1.5,
  reward_rate:         1.0,
  benefits_cost:       200,
  credit_loss_rate:    3.0,
  acquisition_cost:    500,
};

/* ── Slider groups ──────────────────────────────────────────────────────── */

type SliderDef = {
  key: keyof Inputs;
  label: string;
  min: number;
  max: number;
  step: number;
  fmt: (v: number) => string;
};

const GROUPS: { label: string; accent: "blue" | "emerald" | "rose"; sliders: SliderDef[] }[] = [
  {
    label: "Volume",
    accent: "blue",
    sliders: [
      { key: "active_cards",  label: "Active Cards",             min: 5_000,  max: 500_000, step: 5_000, fmt: (v) => v.toLocaleString("en-US") + " cards" },
      { key: "avg_spend",     label: "Avg Spend / Card / Month", min: 500,    max: 15_000,  step: 100,   fmt: (v) => `AED ${v.toLocaleString("en-US")}` },
      { key: "revolve_rate",  label: "Revolve Rate",             min: 0,      max: 80,      step: 1,     fmt: (v) => `${v}%` },
    ],
  },
  {
    label: "Revenue Drivers",
    accent: "emerald",
    sliders: [
      { key: "interchange_rate", label: "Interchange Rate",    min: 0.5, max: 3.0,   step: 0.05, fmt: (v) => `${v.toFixed(2)}%` },
      { key: "annual_fee",       label: "Annual Fee / Card",  min: 0,   max: 3_000, step: 50,   fmt: (v) => v === 0 ? "No fee" : `AED ${v}` },
      { key: "fx_markup",        label: "FX Markup",          min: 0,   max: 5,     step: 0.05, fmt: (v) => `${v.toFixed(2)}%` },
    ],
  },
  {
    label: "Cost Drivers",
    accent: "rose",
    sliders: [
      { key: "reward_rate",      label: "Reward Rate",                min: 0, max: 8,     step: 0.1,  fmt: (v) => `${v.toFixed(1)}%` },
      { key: "benefits_cost",    label: "Benefits Cost / Card / Yr",  min: 0, max: 2_000, step: 50,   fmt: (v) => `AED ${v}` },
      { key: "credit_loss_rate", label: "Credit Loss Rate (Annual)",  min: 0, max: 15,    step: 0.1,  fmt: (v) => `${v.toFixed(1)}%` },
      { key: "acquisition_cost", label: "Acquisition Cost / Card",    min: 0, max: 2_000, step: 50,   fmt: (v) => `AED ${v}` },
    ],
  },
];

const GROUP_ACCENT_COLOR: Record<string, string> = {
  "Volume":          "#2563eb",
  "Revenue Drivers": "#059669",
  "Cost Drivers":    "#e11d48",
};

/* ── Helpers ────────────────────────────────────────────────────────────── */

function fmtA(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}${(abs / 1_000).toFixed(0)}K`;
  return `${sign}${abs.toFixed(0)}`;
}

/* ── Economics computation ──────────────────────────────────────────────── */

function compute(inp: Inputs) {
  const revolveF      = inp.revolve_rate / 100;
  const fxF           = inp.fx_markup / 100;
  const interchangeF  = inp.interchange_rate / 100;
  const rewardF       = inp.reward_rate / 100;
  const clF           = inp.credit_loss_rate / 100;

  const annualSpend   = inp.active_cards * inp.avg_spend * 12;   // total annual spend
  const outstanding   = inp.active_cards * inp.avg_spend * revolveF; // monthly revolving balance

  // ── Revenue (annual) ──────────────────────────────────────────────────
  const interchangeIncome = annualSpend   * interchangeF;
  const interestIncome    = outstanding   * 0.24;            // 24% p.a. UAE lending rate
  const annualFeeIncome   = inp.active_cards * inp.annual_fee;
  const fxIncome          = annualSpend   * 0.25 * fxF;     // assume 25% of spend is FX

  const totalRevenue = interchangeIncome + interestIncome + annualFeeIncome + fxIncome;

  // ── Costs (annual) ────────────────────────────────────────────────────
  const rewardsCost      = annualSpend   * rewardF;
  const benefitsCostAnn  = inp.active_cards * inp.benefits_cost;
  const creditLosses     = outstanding   * 12 * clF;         // annualise monthly outstanding
  const acquisitionAmort = inp.active_cards * inp.acquisition_cost / 3; // 3-year amortisation

  const totalCosts = rewardsCost + benefitsCostAnn + creditLosses + acquisitionAmort;

  // ── Profit ────────────────────────────────────────────────────────────
  const netProfit     = totalRevenue - totalCosts;
  const profitPerCard = inp.active_cards > 0 ? netProfit / inp.active_cards : 0;

  // ── Capital & returns ─────────────────────────────────────────────────
  // avg credit limit ≈ 3× monthly spend; capital = 12% of total limits
  const capitalRequired = inp.active_cards * inp.avg_spend * 3 * 0.12;
  const raroc           = capitalRequired > 0 ? (netProfit / capitalRequired) * 100 : 0;
  const roe             = raroc; // simplified

  // ── Waterfall data ────────────────────────────────────────────────────
  type WfItem = { name: string; base: number; value: number; fill: string; category: string; display: number };
  const wf: WfItem[] = [];
  let run = 0;

  function addRev(name: string, val: number, fill: string) {
    wf.push({ name, base: run, value: val, fill, category: "revenue", display: val });
    run += val;
  }
  function addCost(name: string, val: number, fill: string) {
    run -= val;
    wf.push({ name, base: run, value: val, fill, category: "cost", display: -val });
  }

  addRev("Interchange",   interchangeIncome, "#059669");
  addRev("Interest",      interestIncome,    "#0891b2");
  addRev("Annual Fees",   annualFeeIncome,   "#7c3aed");
  addRev("FX Income",     fxIncome,          "#2563eb");
  addCost("Rewards",      rewardsCost,       "#e11d48");
  addCost("Benefits",     benefitsCostAnn,   "#f43f5e");
  addCost("Credit Loss",  creditLosses,      "#be123c");
  addCost("Acq. Cost",    acquisitionAmort,  "#d97706");

  wf.push({
    name: "Net Profit",
    base: 0,
    value: netProfit,
    fill: netProfit >= 0 ? "#059669" : "#e11d48",
    category: "profit",
    display: netProfit,
  });

  const yMin = Math.min(0, netProfit) * 1.15;
  const yMax = totalRevenue * 1.12;

  return {
    interchangeIncome, interestIncome, annualFeeIncome, fxIncome, totalRevenue,
    rewardsCost, benefitsCostAnn, creditLosses, acquisitionAmort, totalCosts,
    netProfit, profitPerCard, raroc, roe, capitalRequired,
    wf, yMin, yMax,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */

export default function PortfolioEconomics() {
  const [inp, setInp] = useState<Inputs>({ ...DEFAULTS });

  function setVal(k: keyof Inputs, v: number) {
    setInp((prev) => ({ ...prev, [k]: v }));
  }

  const ec = useMemo(() => compute(inp), [inp]);

  return (
    <div className="grid gap-6 xl:grid-cols-12">

      {/* ── LEFT: Input sliders ──────────────────────────────────────────── */}
      <div className="xl:col-span-4 space-y-4">
        {GROUPS.map((g) => {
          const accentHex = GROUP_ACCENT_COLOR[g.label];
          return (
            <Panel key={g.label} title={g.label} accent={g.accent}>
              <div className="space-y-5">
                {g.sliders.map((s) => {
                  const val = inp[s.key] as number;
                  return (
                    <div key={s.key}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "#2d4259" }}>
                          {s.label}
                        </span>
                        <span className="text-[11px] font-bold tabular-nums" style={{ color: accentHex }}>
                          {s.fmt(val)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={s.min}
                        max={s.max}
                        step={s.step}
                        value={val}
                        onChange={(e) => setVal(s.key, parseFloat(e.target.value))}
                        className="w-full"
                        style={{ accentColor: accentHex, cursor: "pointer" }}
                      />
                      <div className="mt-0.5 flex justify-between">
                        <span className="text-[9px]" style={{ color: "#4a6480" }}>{s.fmt(s.min)}</span>
                        <span className="text-[9px]" style={{ color: "#4a6480" }}>{s.fmt(s.max)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          );
        })}
      </div>

      {/* ── RIGHT: Outputs ───────────────────────────────────────────────── */}
      <div className="xl:col-span-8 space-y-4">

        {/* Summary KPI tiles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <EcoKpi label="Total Revenue"  value={`AED ${fmtA(ec.totalRevenue)}`}  sub="Annual"           color="#2563eb" />
          <EcoKpi label="Total Costs"    value={`AED ${fmtA(ec.totalCosts)}`}    sub="Annual"           color="#e11d48" />
          <EcoKpi label="Net Profit"     value={`AED ${fmtA(ec.netProfit)}`}     sub="Annual"           color={ec.netProfit >= 0 ? "#059669" : "#e11d48"} big />
          <EcoKpi label="Profit / Card"  value={`AED ${fmtA(ec.profitPerCard)}`} sub="Per active card / yr" color="#059669" />
          <EcoKpi label="RAROC"          value={`${ec.raroc.toFixed(1)}%`}       sub="Risk-adj return"  color={ec.raroc >= 18 ? "#059669" : "#e11d48"} />
          <EcoKpi label="ROE"            value={`${ec.roe.toFixed(1)}%`}         sub="Return on equity" color={ec.roe  >= 15 ? "#059669" : "#e11d48"} />
        </div>

        {/* Revenue & Cost breakdown side-by-side */}
        <div className="grid grid-cols-2 gap-4">
          <Panel title="Revenue Breakdown" accent="emerald">
            <div className="space-y-2.5">
              <RevLine label="Interchange" value={ec.interchangeIncome} total={ec.totalRevenue} color="#059669" />
              <RevLine label="Interest"    value={ec.interestIncome}    total={ec.totalRevenue} color="#0891b2" />
              <RevLine label="Annual Fees" value={ec.annualFeeIncome}   total={ec.totalRevenue} color="#7c3aed" />
              <RevLine label="FX Income"   value={ec.fxIncome}          total={ec.totalRevenue} color="#2563eb" />
              <div className="mt-1 border-t pt-2" style={{ borderColor: "#d1dde9" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: "#1e2d3d" }}>Total Revenue</span>
                  <span className="text-xs font-bold tabular-nums" style={{ color: "#059669" }}>
                    AED {fmtA(ec.totalRevenue)}
                  </span>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Cost Breakdown" accent="rose">
            <div className="space-y-2.5">
              <RevLine label="Rewards"     value={ec.rewardsCost}      total={ec.totalCosts} color="#e11d48" />
              <RevLine label="Benefits"    value={ec.benefitsCostAnn}  total={ec.totalCosts} color="#f43f5e" />
              <RevLine label="Credit Loss" value={ec.creditLosses}     total={ec.totalCosts} color="#be123c" />
              <RevLine label="Acq. Cost"   value={ec.acquisitionAmort} total={ec.totalCosts} color="#d97706" />
              <div className="mt-1 border-t pt-2" style={{ borderColor: "#d1dde9" }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: "#1e2d3d" }}>Total Costs</span>
                  <span className="text-xs font-bold tabular-nums" style={{ color: "#e11d48" }}>
                    AED {fmtA(ec.totalCosts)}
                  </span>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* Waterfall chart */}
        <Panel title="Portfolio Profit Waterfall · Annual (AED)" accent="blue">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ec.wf}
                barCategoryGap="28%"
                margin={{ top: 10, right: 10, bottom: 0, left: 24 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#d1dde9"
                  vertical={false}
                  strokeOpacity={0.8}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fill: "#4a6480" }}
                  tickLine={false}
                  axisLine={{ stroke: "#d1dde9" }}
                />
                <YAxis
                  tickFormatter={(v) => `${fmtA(v)}`}
                  tick={{ fontSize: 9, fill: "#4a6480" }}
                  tickLine={false}
                  axisLine={false}
                  domain={[ec.yMin, ec.yMax]}
                />
                <Tooltip
                  cursor={{ fill: "rgba(209,221,233,0.25)" }}
                  content={<WaterfallTooltip />}
                />
                <ReferenceLine y={0} stroke="#d1dde9" strokeWidth={1.5} />
                {ec.netProfit < 0 && (
                  <ReferenceLine
                    y={ec.netProfit}
                    stroke="#e11d48"
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                  />
                )}

                {/* Transparent base bar — creates the floating offset */}
                <Bar dataKey="base" stackId="wf" fill="transparent" />

                {/* Coloured value bar */}
                <Bar dataKey="value" stackId="wf" radius={[4, 4, 0, 0]} maxBarSize={56}>
                  {ec.wf.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} fillOpacity={0.88} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart legend */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {[
              { color: "#059669", label: "Interchange" },
              { color: "#0891b2", label: "Interest" },
              { color: "#7c3aed", label: "Annual Fees" },
              { color: "#2563eb", label: "FX Income" },
              { color: "#e11d48", label: "Rewards" },
              { color: "#be123c", label: "Credit Loss" },
              { color: "#d97706", label: "Acq. Cost" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm flex-shrink-0" style={{ background: color }} />
                <span className="text-[10px] font-medium" style={{ color: "#3d5570" }}>{label}</span>
              </div>
            ))}
          </div>

          <p className="mt-2 text-[10px]" style={{ color: "#4a6480" }}>
            All figures are annualised. Interest income at 24% p.a. on revolving balance.
            FX income assumes 25% of spend is foreign-currency. Acquisition cost amortised over 3 years.
            Capital = 12% × (active cards × 3× monthly spend).
          </p>
        </Panel>
      </div>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────────────────── */

function EcoKpi({
  label, value, sub, color, big,
}: {
  label: string; value: string; sub: string; color: string; big?: boolean;
}) {
  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{ background: `${color}0e`, border: `1px solid ${color}26` }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.13em]" style={{ color: "#3d5570" }}>
        {label}
      </p>
      <p
        className={`mt-1 tabular-nums font-bold leading-tight ${big ? "text-2xl" : "text-lg"}`}
        style={{ color }}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-medium" style={{ color: "#4a6480" }}>{sub}</p>
    </div>
  );
}

function RevLine({
  label, value, total, color,
}: {
  label: string; value: number; total: number; color: string;
}) {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: "#1e2d3d" }}>{label}</span>
        <span className="text-xs font-semibold tabular-nums" style={{ color }}>
          AED {fmtA(value)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "#f0f4f8" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color, opacity: 0.8 }}
        />
      </div>
    </div>
  );
}

function WaterfallTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const isCost = d.category === "cost";

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #d1dde9",
        borderRadius: 10,
        padding: "8px 14px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
        minWidth: 160,
      }}
    >
      <p className="mb-1 text-xs font-bold" style={{ color: "#1e2d3d" }}>{d.name}</p>
      <p className="text-sm font-bold tabular-nums" style={{ color: d.fill }}>
        {isCost ? "−" : "+"} AED {fmtA(Math.abs(d.display ?? d.value))}
      </p>
      <p className="mt-0.5 text-[10px] font-medium" style={{ color: "#4a6480" }}>
        {d.category === "revenue"
          ? "Revenue contribution"
          : d.category === "cost"
          ? "Cost deduction"
          : d.display >= 0
          ? "Net profit"
          : "Net loss"}
      </p>
    </div>
  );
}
