"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

type FunnelStage = {
  stage: string;
  count: number;
  conversion_pct: number | null;
  color: string;
};

interface Props {
  stages: FunnelStage[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: FunnelStage }[] }) {
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
      <p style={{ fontWeight: 700, marginBottom: 4, color: d.color }}>{d.stage}</p>
      <p>Count: <strong>{d.count.toLocaleString("en-US")}</strong></p>
      {d.conversion_pct !== null && (
        <p>Conversion from prev: <strong>{d.conversion_pct}%</strong></p>
      )}
    </div>
  );
}

function ConversionLabel(props: { x?: number; y?: number; width?: number; value?: number | null; index?: number }) {
  const { x = 0, y = 0, width = 0, value, index } = props;
  if (!value || index === 0) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fontSize={10}
      fontWeight={700}
      fill="#3d5570"
    >
      {value}%
    </text>
  );
}

export default function AcquisitionFunnelChart({ stages }: Props) {
  if (!stages.length) return (
    <div className="flex h-48 items-center justify-center text-xs" style={{ color: "#3d5570" }}>
      Loading funnel data…
    </div>
  );

  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={stages}
          margin={{ top: 24, right: 16, left: 8, bottom: 4 }}
          barCategoryGap="28%"
        >
          <XAxis
            dataKey="stage"
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
          <Bar dataKey="count" radius={[5, 5, 0, 0]}>
            <LabelList dataKey="conversion_pct" content={<ConversionLabel />} />
            {stages.map((s, i) => (
              <Cell key={i} fill={s.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
