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
} from "recharts";
import Panel from "./Panel";

type CardPoint = {
  bank: string;
  card_name: string;
  annual_fee: number;
  cashback_rate: number | null;
  category?: string;
};

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
    () => cards.filter((c) => c.cashback_rate !== null),
    [cards]
  );

  const frontier = useMemo(() => {
    if (!points.length) return [];
    const sorted = [...points].sort(
      (a, b) => a.annual_fee - b.annual_fee
    ) as Required<CardPoint>[];

    const frontierPoints: { annual_fee: number; cashback_rate: number }[] = [];
    let bestSoFar = 0;

    for (const p of sorted) {
      const rate = p.cashback_rate ?? 0;
      if (rate >= bestSoFar) {
        bestSoFar = rate;
        frontierPoints.push({ annual_fee: p.annual_fee, cashback_rate: rate });
      }
    }

    return frontierPoints;
  }, [points]);

  return (
    <Panel title="Competitive Battlefield · Annual Fee vs. Reward Yield" accent="emerald">
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 28, left: 8 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#d1dde9"
              strokeOpacity={0.8}
            />
            <XAxis
              dataKey="annual_fee"
              name="Annual Fee"
              tick={{ fontSize: 10, fill: "#8fa5b8" }}
              tickLine={false}
              axisLine={{ stroke: "#d1dde9" }}
              tickFormatter={(v) => `AED ${v}`}
              label={{
                value: "Annual Fee (AED)",
                position: "insideBottom",
                offset: -14,
                fontSize: 10,
                fill: "#8fa5b8",
              }}
            />
            <YAxis
              dataKey="cashback_rate"
              name="Reward Yield"
              tick={{ fontSize: 10, fill: "#8fa5b8" }}
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
                boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              }}
              labelStyle={{ color: "#4a6480", marginBottom: "4px" }}
              formatter={(value: any, name: string) => {
                if (name === "cashback_rate")
                  return [`${(value * 100).toFixed(1)}%`, "Reward rate"];
                if (name === "annual_fee")
                  return [`AED ${value}`, "Annual fee"];
                return [value, name];
              }}
              labelFormatter={(_, payload) =>
                payload && payload[0]
                  ? `${payload[0].payload.bank} · ${payload[0].payload.card_name}`
                  : ""
              }
            />

            <Scatter
              data={points}
              fill="#3b82f6"
              fillOpacity={0.75}
              name="Competitor cards"
            />

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

      {/* Legend + caption */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs" style={{ color: "#8fa5b8" }}>
          Each{" "}
          <span style={{ color: "#3b82f6" }}>blue point</span> is a
          competitor card.{" "}
          <span style={{ color: "#059669" }}>Green frontier</span> = efficient
          construct. Space above = premium opportunity.
        </p>

        <div className="flex items-center gap-3">
          <LegendItem color="#3b82f6" label="Cards" />
          <LegendItem color="#059669" label="Frontier" dashed />
          {loading && (
            <span className="text-[10px]" style={{ color: "#8fa5b8" }}>
              Scanning…
            </span>
          )}
        </div>
      </div>
    </Panel>
  );
}

function LegendItem({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="h-px w-5"
        style={{
          background: dashed
            ? `repeating-linear-gradient(90deg, ${color} 0, ${color} 4px, transparent 4px, transparent 7px)`
            : color,
          height: dashed ? "1.5px" : "2px",
        }}
      />
      <span className="text-[10px]" style={{ color: "#8fa5b8" }}>
        {label}
      </span>
    </div>
  );
}
