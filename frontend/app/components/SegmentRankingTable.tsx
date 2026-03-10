"use client";

type SegmentRow = {
  rank: number;
  label: string;
  icon: string;
  tier: string;
  tier_badge_color: string;
  tier_color: string;
  cards_issued: number;
  profit_per_customer: number;
  lifetime_value: number;
  churn_rate: number;
  cac: number;
  payback_months: number;
};

interface Props {
  data: SegmentRow[];
}

export default function SegmentRankingTable({ data }: Props) {
  if (!data.length) return (
    <div className="py-8 text-center text-xs" style={{ color: "#3d5570" }}>
      Loading segment rankings…
    </div>
  );

  return (
    <div className="max-h-72 overflow-auto rounded-xl" style={{ border: "1px solid #d1dde9" }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Segment</th>
            <th style={{ textAlign: "right" }}>Profit/mo</th>
            <th style={{ textAlign: "right" }}>LTV 36m</th>
            <th style={{ textAlign: "right" }}>Churn</th>
            <th style={{ textAlign: "right" }}>Tier</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.rank}>
              <td>
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: row.tier_color }}
                >
                  {row.rank}
                </span>
              </td>
              <td>
                <span className="font-medium" style={{ color: "#1e2d3d" }}>
                  {row.icon} {row.label}
                </span>
              </td>
              <td style={{ textAlign: "right", color: "#2563eb", fontWeight: 600 }}>
                AED {row.profit_per_customer.toFixed(0)}
              </td>
              <td style={{ textAlign: "right", color: "#059669", fontWeight: 600 }}>
                AED {(row.lifetime_value / 1000).toFixed(1)}K
              </td>
              <td
                style={{
                  textAlign: "right",
                  color: row.churn_rate > 0.22 ? "#e11d48" : row.churn_rate > 0.14 ? "#d97706" : "#059669",
                  fontWeight: 600,
                }}
              >
                {(row.churn_rate * 100).toFixed(0)}%
              </td>
              <td style={{ textAlign: "right" }}>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                  style={{ background: row.tier_badge_color }}
                >
                  {row.tier}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
