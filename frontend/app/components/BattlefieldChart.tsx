"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
  CartesianGrid,
  ReferenceLine,
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

export default function BattlefieldChart() {
  const [cards, setCards] = useState<CardPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadCards() {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:8000/cards");
        const data = await res.json();
        setCards(data);
      } catch (e) {
        console.error("Failed to load cards", e);
      } finally {
        setLoading(false);
      }
    }
    loadCards();
  }, []);

  const points = useMemo(
    () => cards.filter((c) => c.cashback_rate !== null && c.cashback_rate > 0),
    [cards]
  );

  // Y-axis domain: 0 → max reward rate + 20% headroom, capped at 8%
  const yMax = useMemo(() => {
    if (!points.length) return 0.06;
    const max = Math.max(...points.map((p) => p.cashback_rate ?? 0));
    return Math.min(Math.ceil(max * 100 * 1.2) / 100, 0.08);
  }, [points]);

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
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #d1dde9",
                borderRadius: "10px",
                fontSize: "12px",
                color: "#1e2d3d",
                boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
                padding: "8px 12px",
              }}
              labelStyle={{ color: "#4a6480", fontWeight: 600, marginBottom: "6px" }}
              formatter={(value: unknown, name: string) => {
                if (name === "cashback_rate")
                  return [`${((value as number) * 100).toFixed(1)}%`, "Reward rate"];
                if (name === "annual_fee")
                  return [`AED ${value}`, "Annual fee"];
                return [String(value), name];
              }}
              labelFormatter={(_, payload) =>
                payload?.[0]
                  ? `${payload[0].payload.bank} · ${payload[0].payload.card_name}`
                  : ""
              }
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
        labelled. Hover any dot for full details. Space above the{" "}
        <span style={{ color: "#059669" }}>frontier</span> = premium pricing opportunity.
        {loading && <span className="ml-1">Scanning…</span>}
      </p>
    </Panel>
  );
}
