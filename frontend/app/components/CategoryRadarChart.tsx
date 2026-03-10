"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type CategoryMetric = {
  label: string;
  mashreq_rate: number;
  market_leader_rate: number;
  opportunity_index: number;
  underperforming: boolean;
};

interface Props {
  data: CategoryMetric[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
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
      }}
    >
      <p style={{ fontWeight: 700, marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{(p.value * 100).toFixed(1)}%</strong>
        </p>
      ))}
    </div>
  );
}

export default function CategoryRadarChart({ data }: Props) {
  if (!data.length) return (
    <div className="flex h-56 items-center justify-center text-xs" style={{ color: "#3d5570" }}>
      Loading category data…
    </div>
  );

  const radarData = data.map((d) => ({
    subject: d.label.replace(" & Restaurants", "").replace(" Shopping", ""),
    Mashreq: d.mashreq_rate,
    "Market Leader": d.market_leader_rate,
  }));

  return (
    <div style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radarData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
          <PolarGrid stroke="#d1dde9" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 10, fill: "#4a6480", fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, "auto"]}
            tick={{ fontSize: 9, fill: "#3d5570" }}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          />
          <Radar
            name="Mashreq"
            dataKey="Mashreq"
            stroke="#2563eb"
            fill="#2563eb"
            fillOpacity={0.18}
            strokeWidth={2}
          />
          <Radar
            name="Market Leader"
            dataKey="Market Leader"
            stroke="#e11d48"
            fill="#e11d48"
            fillOpacity={0.10}
            strokeWidth={2}
            strokeDasharray="4 3"
          />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#4a6480", fontWeight: 600 }}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
