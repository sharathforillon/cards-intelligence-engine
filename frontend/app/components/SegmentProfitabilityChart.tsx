"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

type SegmentData = {
  label: string;
  profit_per_customer: number;
  tier: string;
  tier_badge_color: string;
  tier_color: string;
  cards_issued: number;
  churn_rate: number;
};

interface Props {
  data: SegmentData[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: SegmentData }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #d1dde9",
        borderRadius: "10px",
        padding: "10px 14px",
        fontSize: "12px",
        color: "#1e2d3d",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        minWidth: "180px",
      }}
    >
      <p style={{ fontWeight: 700, marginBottom: 6, color: d.tier_color }}>{d.label}</p>
      <p>Profit / customer: <strong>AED {d.profit_per_customer.toFixed(0)}/mo</strong></p>
      <p>Cards issued: <strong>{d.cards_issued.toLocaleString("en-US")}</strong></p>
      <p>Churn rate: <strong>{(d.churn_rate * 100).toFixed(0)}%</strong></p>
      <p>Tier: <strong style={{ color: d.tier_badge_color }}>{d.tier}</strong></p>
    </div>
  );
}

export default function SegmentProfitabilityChart({ data }: Props) {
  if (!data.length) return (
    <div className="flex h-48 items-center justify-center text-xs" style={{ color: "#3d5570" }}>
      Loading segment data…
    </div>
  );

  const avg = data.reduce((s, d) => s + d.profit_per_customer, 0) / data.length;

  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
          barCategoryGap="32%"
        >
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#4a6480", fontWeight: 600 }}
            axisLine={{ stroke: "#d1dde9" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#4a6480" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}`}
            label={{
              value: "AED / mo",
              angle: -90,
              position: "insideLeft",
              offset: 10,
              style: { fontSize: 9, fill: "#3d5570" },
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(37,99,235,0.04)" }} />
          <ReferenceLine
            y={avg}
            stroke="#d97706"
            strokeDasharray="4 3"
            label={{ value: "Avg", position: "right", fontSize: 9, fill: "#d97706" }}
          />
          <Bar dataKey="profit_per_customer" radius={[5, 5, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.tier_color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
