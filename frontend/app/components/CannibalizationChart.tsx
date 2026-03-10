"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

type RedistributionRow = {
  card_name: string;
  current_active: number;
  cards_shifted: number;
  cards_retained: number;
  overlap_pct: number;
  revenue_lost_aed: number;
};

interface Props {
  data: RedistributionRow[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string; payload: RedistributionRow }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as RedistributionRow | undefined;
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
        minWidth: "200px",
      }}
    >
      <p style={{ fontWeight: 700, marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{p.value.toLocaleString("en-US")}</strong>
        </p>
      ))}
      {row && (
        <>
          <hr style={{ margin: "6px 0", borderColor: "#d1dde9" }} />
          <p>Overlap: <strong>{row.overlap_pct}%</strong></p>
          <p>Revenue lost: <strong>AED {row.revenue_lost_aed.toLocaleString("en-US")}</strong></p>
        </>
      )}
    </div>
  );
}

export default function CannibalizationChart({ data }: Props) {
  if (!data.length) return (
    <div className="flex h-48 items-center justify-center text-xs" style={{ color: "#3d5570" }}>
      No cannibalization data yet.
    </div>
  );

  const chartData = data.map((d) => ({
    ...d,
    card_name: d.card_name.replace(/^Mashreq\s+/i, "").slice(0, 14),
  }));

  return (
    <div style={{ height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
          barCategoryGap="28%"
          stackOffset="none"
        >
          <XAxis
            dataKey="card_name"
            tick={{ fontSize: 10, fill: "#4a6480", fontWeight: 600 }}
            axisLine={{ stroke: "#d1dde9" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#4a6480" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(37,99,235,0.04)" }} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#4a6480", fontWeight: 600 }} />
          <Bar dataKey="cards_retained" name="Retained" stackId="a" fill="#059669" fillOpacity={0.8} radius={[0, 0, 0, 0]} />
          <Bar dataKey="cards_shifted" name="Shifted to New Card" stackId="a" fill="#e11d48" fillOpacity={0.8} radius={[5, 5, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
