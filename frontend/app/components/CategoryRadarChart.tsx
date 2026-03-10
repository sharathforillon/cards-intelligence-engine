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
  key?: string;
  label: string;
  mashreq_rate: number;
  market_leader_rate: number;
  market_leader_bank: string;
  market_leader_card?: string;
  top_3_banks?: { bank: string; rate: number }[];
  opportunity_index: number;
  underperforming: boolean;
};

interface Props {
  data: CategoryMetric[];
}

// ── Custom Tooltip ──────────────────────────────────────────────────────────
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload ?? {};
  const mashreqVal = (item.Mashreq ?? 0) as number;
  const leaderVal  = (item["Market Leader"] ?? 0) as number;
  const leaderBank = (item.market_leader_bank ?? "") as string;
  const leaderCard = (item.market_leader_card ?? "") as string;
  const top3       = (item.top_3_banks ?? []) as { bank: string; rate: number }[];
  const gap        = leaderVal - mashreqVal;

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #c4d2e1",
        borderRadius: "12px",
        padding: "14px 16px",
        fontSize: "13px",
        color: "#0d1f2f",
        boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
        minWidth: "240px",
      }}
    >
      {/* Category header */}
      <p style={{ fontWeight: 800, marginBottom: 10, fontSize: 14, color: "#0d1f2f" }}>
        {label}
      </p>

      {/* Mashreq row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
          padding: "6px 10px",
          borderRadius: 8,
          background: "rgba(29,86,219,0.07)",
          border: "1px solid rgba(29,86,219,0.20)",
        }}
      >
        <span style={{ color: "#1d56db", fontWeight: 700, fontSize: 12 }}>🔵 Mashreq</span>
        <span style={{ color: "#1d56db", fontWeight: 800, fontSize: 14 }}>
          {(mashreqVal * 100).toFixed(1)}%
        </span>
      </div>

      {/* Market Leader row — shows bank + card */}
      <div
        style={{
          marginBottom: 8,
          padding: "8px 10px",
          borderRadius: 8,
          background: "rgba(190,18,60,0.06)",
          border: "1px solid rgba(190,18,60,0.22)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ color: "#be123c", fontWeight: 700, fontSize: 12 }}>🔴 Market Leader</span>
          <span style={{ color: "#be123c", fontWeight: 800, fontSize: 14 }}>
            {(leaderVal * 100).toFixed(1)}%
          </span>
        </div>
        {leaderBank && (
          <p style={{ color: "#be123c", fontSize: 12, fontWeight: 700, margin: 0 }}>
            {leaderBank}
          </p>
        )}
        {leaderCard && leaderCard !== leaderBank && (
          <p style={{ color: "#7f1d1d", fontSize: 11, fontWeight: 500, marginTop: 2, opacity: 0.85 }}>
            {leaderCard}
          </p>
        )}
      </div>

      {/* Gap indicator */}
      {gap > 0.001 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "5px 10px",
            borderRadius: 7,
            background: "rgba(146,64,14,0.07)",
            border: "1px solid rgba(146,64,14,0.20)",
            marginBottom: 8,
          }}
        >
          <span style={{ color: "#78350f", fontSize: 11, fontWeight: 600 }}>Gap to leader</span>
          <span style={{ color: "#78350f", fontSize: 12, fontWeight: 800 }}>
            +{(gap * 100).toFixed(1)}pp
          </span>
        </div>
      )}

      {/* Top 3 competitors */}
      {top3.length > 0 && (
        <div>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#3a5270",
              marginBottom: 5,
              textTransform: "uppercase",
              letterSpacing: "0.10em",
            }}
          >
            Top 3 by reward rate
          </p>
          {top3.map((b, i) => (
            <div
              key={b.bank}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 12,
                color: i === 0 ? "#be123c" : "#2a4560",
                fontWeight: i === 0 ? 700 : 500,
                padding: "2px 0",
              }}
            >
              <span>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {b.bank}
              </span>
              <span style={{ fontWeight: 700 }}>{(b.rate * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoryRadarChart({ data }: Props) {
  if (!data.length) {
    return (
      <div
        className="flex h-56 items-center justify-center text-sm"
        style={{ color: "#3a5270" }}
      >
        Data not available.
      </div>
    );
  }

  const radarData = data.map((d) => ({
    subject: d.label
      .replace(" & Restaurants", "")
      .replace(" Shopping", ""),
    Mashreq: d.mashreq_rate,
    "Market Leader": d.market_leader_rate,
    // Extra fields surfaced in payload.payload for CustomTooltip
    market_leader_bank: d.market_leader_bank,
    market_leader_card: d.market_leader_card ?? "",
    top_3_banks: d.top_3_banks ?? [],
  }));

  return (
    <div style={{ height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radarData} margin={{ top: 10, right: 35, bottom: 10, left: 35 }}>
          <PolarGrid stroke="#c4d2e1" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fontSize: 12, fill: "#1a3347", fontWeight: 600 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, "auto"]}
            tick={{ fontSize: 10, fill: "#3a5270" }}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          />
          <Radar
            name="Mashreq"
            dataKey="Mashreq"
            stroke="#1d56db"
            fill="#1d56db"
            fillOpacity={0.20}
            strokeWidth={2.5}
          />
          <Radar
            name="Market Leader (best per category)"
            dataKey="Market Leader"
            stroke="#be123c"
            fill="#be123c"
            fillOpacity={0.10}
            strokeWidth={2.5}
            strokeDasharray="5 3"
          />
          <Legend
            wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingTop: 8 }}
          />
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Tooltip content={(props: any) => <CustomTooltip {...props} />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
