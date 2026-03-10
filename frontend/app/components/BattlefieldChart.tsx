"use client";

import { useMemo } from "react";
import { useCachedFetch } from "@/hooks/useCachedFetch";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
  CartesianGrid,
} from "recharts";
import Panel from "./Panel";

type CardPoint = {
  bank: string;
  card_name: string;
  annual_fee: number;
  cashback_rate: number | null;
  category?: string;
};

const BANK_PALETTE: Record<string, string> = {
  "Mashreq":             "#2563eb",
  "Emirates NBD":        "#059669",
  "FAB":                 "#d97706",
  "ADCB":                "#7c3aed",
  "RAKBANK":             "#e11d48",
  "HSBC":                "#0284c7",
  "Standard Chartered":  "#92400e",
  "ADIB":                "#0891b2",
  "Emirates Islamic":    "#16a34a",
  "CBD":                 "#9333ea",
  "Dubai Islamic Bank":  "#b91c1c",
};

const FALLBACK_COLORS = [
  "#2563eb","#059669","#d97706","#7c3aed","#e11d48",
  "#0284c7","#92400e","#0891b2","#16a34a","#9333ea","#b91c1c",
];

function bankColor(bank: string, idx: number): string {
  return BANK_PALETTE[bank] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

// Shorten a Mashreq card name to fit as a chart label
function shortLabel(name: string): string {
  return name
    .replace(/^Mashreq\s+/i, "")
    .replace(/\s+Card$/i, "")
    .replace(/\s+Credit$/i, "")
    .trim()
    .slice(0, 12);
}

// Value score: how good is this card (reward vs fee)?
// Higher cashback_rate and lower annual_fee = higher score
function valueScore(p: CardPoint): number {
  return (p.cashback_rate ?? 0) * 10000 - p.annual_fee * 0.1;
}

// ── Custom Tooltip ──────────────────────────────────────────────────────────
function CustomTooltip({
  active,
  payload,
  bankBestSet,
  bankColorMap,
}: {
  active?: boolean;
  payload?: { payload: CardPoint }[];
  bankBestSet: Set<string>;
  bankColorMap: Map<string, string>;
}) {
  if (!active || !payload?.length) return null;
  const card = payload[0]?.payload;
  if (!card) return null;

  const isBest = bankBestSet.has(`${card.bank}::${card.card_name}`);
  const color = bankColorMap.get(card.bank) ?? "#4a6480";
  const rewardPct = ((card.cashback_rate ?? 0) * 100).toFixed(2).replace(/\.?0+$/, "") + "%";

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #d1dde9",
        borderRadius: "12px",
        fontSize: "12px",
        color: "#1e2d3d",
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
        padding: "12px 14px",
        minWidth: "210px",
      }}
    >
      {/* Bank + card name header */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: color,
              flexShrink: 0,
            }}
          />
          <span style={{ fontWeight: 700, color, fontSize: 12 }}>{card.bank}</span>
        </div>
        <p style={{ color: "#1e2d3d", fontWeight: 600, fontSize: 12, paddingLeft: 14 }}>
          {card.card_name}
        </p>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid #e2eaf2", marginBottom: 8 }} />

      {/* Metrics */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: "#4a6480", fontSize: 11 }}>Annual Fee</span>
          <span style={{ fontWeight: 700, color: "#1e2d3d", fontSize: 11 }}>
            AED {card.annual_fee.toLocaleString("en-US")}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: "#4a6480", fontSize: 11 }}>Reward Rate</span>
          <span style={{ fontWeight: 700, color: "#059669", fontSize: 11 }}>
            {rewardPct}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span style={{ color: "#4a6480", fontSize: 11 }}>Value Score</span>
          <span style={{ fontWeight: 700, color: "#7c3aed", fontSize: 11 }}>
            {valueScore(card).toFixed(0)}
          </span>
        </div>
      </div>

      {/* Best-for-bank badge */}
      {isBest && (
        <div
          style={{
            marginTop: 10,
            padding: "4px 8px",
            background: "rgba(5,150,105,0.08)",
            borderRadius: 7,
            border: "1px solid rgba(5,150,105,0.22)",
            fontSize: 10,
            fontWeight: 700,
            color: "#059669",
            textAlign: "center",
          }}
        >
          ⭐ Best value card at {card.bank}
        </div>
      )}
    </div>
  );
}

// Custom dot + label for Mashreq cards
function MashreqDot(props: {
  cx?: number; cy?: number; fill?: string; payload?: CardPoint;
}) {
  const { cx = 0, cy = 0, fill = "#2563eb", payload } = props;
  const label = payload ? shortLabel(payload.card_name) : "";
  return (
    <g>
      {/* Halo */}
      <circle cx={cx} cy={cy} r={9} fill={fill} fillOpacity={0.12} />
      {/* Dot */}
      <circle
        cx={cx} cy={cy} r={6}
        fill={fill} fillOpacity={0.95}
        stroke="#ffffff" strokeWidth={1.5}
      />
      {/* Card name label */}
      <text
        x={cx}
        y={cy - 12}
        textAnchor="middle"
        fontSize={8.5}
        fontWeight="700"
        fill="#1e2d3d"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {label}
      </text>
    </g>
  );
}

// Regular dot for all other banks
function RegularDot(props: {
  cx?: number; cy?: number; fill?: string;
}) {
  const { cx = 0, cy = 0, fill = "#888" } = props;
  return (
    <circle
      cx={cx} cy={cy} r={5}
      fill={fill} fillOpacity={0.82}
      stroke="#ffffff" strokeWidth={1.2}
    />
  );
}

// Diamond dot for simulated new card
function SimulatedDot(props: {
  cx?: number; cy?: number; label?: string;
}) {
  const { cx = 0, cy = 0, label = "NEW" } = props;
  const size = 9;
  const pts = [
    `${cx},${cy - size}`,
    `${cx + size},${cy}`,
    `${cx},${cy + size}`,
    `${cx - size},${cy}`,
  ].join(" ");
  return (
    <g>
      <polygon points={pts} fill="#d97706" fillOpacity={0.9} stroke="#ffffff" strokeWidth={1.5} />
      <text
        x={cx}
        y={cy - size - 5}
        textAnchor="middle"
        fontSize={9}
        fontWeight="800"
        fill="#d97706"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {label}
      </text>
    </g>
  );
}

export type SimulatedCardProp = {
  annual_fee: number;
  cashback_rate: number;
  label: string;
};

export default function BattlefieldChart({
  simulatedCard,
}: {
  simulatedCard?: SimulatedCardProp;
}) {
  const { data, loading } = useCachedFetch<CardPoint[]>(
    "api:cards",
    () => fetch("http://localhost:8000/cards").then((r) => r.json()),
  );
  const cards = data ?? [];

  const points = useMemo(
    () => cards.filter((c) => c.cashback_rate !== null && c.cashback_rate > 0),
    [cards]
  );

  // Y-axis domain: 0 → max reward rate + 20% headroom, capped at 10%
  const yMax = useMemo(() => {
    const allRates = points.map((p) => p.cashback_rate ?? 0);
    if (simulatedCard) allRates.push(simulatedCard.cashback_rate);
    if (!allRates.length) return 0.06;
    const max = Math.max(...allRates);
    return Math.min(Math.ceil(max * 100 * 1.2) / 100, 0.10);
  }, [points, simulatedCard]);

  // Group into per-bank series
  const byBank = useMemo(() => {
    const map = new Map<string, CardPoint[]>();
    for (const p of points) {
      const arr = map.get(p.bank) ?? [];
      arr.push(p);
      map.set(p.bank, arr);
    }
    return Array.from(map.entries());
  }, [points]);

  // Efficient frontier
  const frontier = useMemo(() => {
    if (!points.length) return [];
    const sorted = [...points].sort((a, b) => a.annual_fee - b.annual_fee);
    const result: { annual_fee: number; cashback_rate: number }[] = [];
    let best = 0;
    for (const p of sorted) {
      const rate = p.cashback_rate ?? 0;
      if (rate >= best) {
        best = rate;
        result.push({ annual_fee: p.annual_fee, cashback_rate: rate });
      }
    }
    return result;
  }, [points]);

  // Best-value card per bank (highest value score = reward rate vs annual fee)
  const bankBestSet = useMemo(() => {
    const bestByBank = new Map<string, { card_name: string; score: number }>();
    for (const p of points) {
      const score = valueScore(p);
      const current = bestByBank.get(p.bank);
      if (!current || score > current.score) {
        bestByBank.set(p.bank, { card_name: p.card_name, score });
      }
    }
    const result = new Set<string>();
    for (const [bank, best] of bestByBank) {
      result.add(`${bank}::${best.card_name}`);
    }
    return result;
  }, [points]);

  // Color map for tooltip
  const bankColorMap = useMemo(() => {
    const map = new Map<string, string>();
    byBank.forEach(([bank], idx) => map.set(bank, bankColor(bank, idx)));
    return map;
  }, [byBank]);

  return (
    <Panel title="Competitive Battlefield · Annual Fee vs. Reward Yield" accent="emerald">
      <div className="h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 32, left: 10 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#d1dde9"
              strokeOpacity={0.7}
            />
            <XAxis
              dataKey="annual_fee"
              name="Annual Fee"
              type="number"
              domain={[0, "auto"]}
              tick={{ fontSize: 10, fill: "#3d5570" }}
              tickLine={false}
              axisLine={{ stroke: "#d1dde9" }}
              tickFormatter={(v) => `AED ${v}`}
              label={{
                value: "Annual Fee (AED)",
                position: "insideBottom",
                offset: -18,
                fontSize: 10,
                fill: "#3d5570",
              }}
            />
            <YAxis
              dataKey="cashback_rate"
              name="Reward Yield"
              type="number"
              domain={[0, yMax]}
              tick={{ fontSize: 10, fill: "#3d5570" }}
              tickLine={false}
              axisLine={{ stroke: "#d1dde9" }}
              tickFormatter={(v) => `${(v * 100).toFixed(1)}%`}
            />

            <Tooltip
              cursor={{ stroke: "#b8cce0", strokeDasharray: "4 4" }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content={(props: any) => (
                <CustomTooltip
                  {...props}
                  bankBestSet={bankBestSet}
                  bankColorMap={bankColorMap}
                />
              )}
            />

            {/* Mashreq rendered first so labels sit below other banks' dots */}
            {byBank
              .slice()
              .sort(([a]) => (a === "Mashreq" ? -1 : 1))
              .map(([bank, bankPoints], idx) => {
                const color = bankColor(bank, byBank.findIndex(([b]) => b === bank));
                const isMashreq = bank === "Mashreq";
                return (
                  <Scatter
                    key={bank}
                    name={bank}
                    data={bankPoints}
                    fill={color}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    shape={isMashreq ? (props: any) => <MashreqDot {...props} /> : (props: any) => <RegularDot {...props} />}
                  />
                );
              })}

            {/* Simulated new card */}
            {simulatedCard && (
              <Scatter
                name={simulatedCard.label}
                data={[{ annual_fee: simulatedCard.annual_fee, cashback_rate: simulatedCard.cashback_rate, bank: "Simulated", card_name: simulatedCard.label }]}
                fill="#d97706"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                shape={(props: any) => <SimulatedDot cx={props.cx} cy={props.cy} label={simulatedCard.label.slice(0, 8)} />}
              />
            )}

            {/* Efficient frontier */}
            {frontier.length > 0 && (
              <Line
                type="monotone"
                dataKey="cashback_rate"
                data={frontier}
                stroke="#059669"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                name="Efficient frontier"
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Bank colour legend */}
      {byBank.length > 0 && (
        <div
          className="mt-3 flex flex-wrap gap-x-4 gap-y-2 rounded-xl px-3 py-2.5"
          style={{ background: "#f8fafc", border: "1px solid #e2eaf2" }}
        >
          {byBank.map(([bank], idx) => (
            <div key={bank} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ background: bankColor(bank, idx) }}
              />
              <span
                className="text-[10px] font-medium"
                style={{
                  color: bank === "Mashreq" ? "#2563eb" : "#4a6480",
                  fontWeight: bank === "Mashreq" ? 700 : 500,
                }}
              >
                {bank}
              </span>
            </div>
          ))}
          {simulatedCard && (
            <div className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="-6 -6 12 12">
                <polygon points="0,-5 5,0 0,5 -5,0" fill="#d97706" />
              </svg>
              <span className="text-[10px] font-bold" style={{ color: "#d97706" }}>
                {simulatedCard.label} (simulated)
              </span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <svg width="20" height="6" className="flex-shrink-0">
              <line x1="0" y1="3" x2="20" y2="3"
                stroke="#059669" strokeWidth="2" strokeDasharray="5 3" />
            </svg>
            <span className="text-[10px] font-medium" style={{ color: "#059669" }}>
              Efficient frontier
            </span>
          </div>
        </div>
      )}

      <p className="mt-2 text-xs" style={{ color: "#3d5570" }}>
        <span style={{ color: "#2563eb", fontWeight: 600 }}>Mashreq</span> cards are
        labelled. Hover any dot for bank, card name, reward rate &amp; value score.{" "}
        <span style={{ color: "#059669" }}>⭐</span> marks the best-value card per bank.
        Space above the{" "}
        <span style={{ color: "#059669" }}>frontier</span> = premium pricing opportunity.
        {loading && <span className="ml-1">Scanning…</span>}
      </p>
    </Panel>
  );
}
