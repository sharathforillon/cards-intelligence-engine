"use client";

import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";
import Panel from "./Panel";
import CacheBar from "./CacheBar";
import { useCachedFetch } from "@/hooks/useCachedFetch";

type PortfolioCard = {
  card_name: string;
  active_cards: number;
  monthly_spend: number;
  utilization_rate: number;
};

export default function PortfolioPanel() {
  const { data, loading, refresh, fetchedAt } = useCachedFetch<PortfolioCard[]>(
    "api:portfolio/cards",
    () => fetch("http://localhost:8000/portfolio/cards").then((r) => r.json()),
  );
  const cards = data ?? [];

  const totalActive = useMemo(() => cards.reduce((s, c) => s + c.active_cards, 0), [cards]);
  const totalSpend  = useMemo(() => cards.reduce((s, c) => s + c.monthly_spend, 0), [cards]);

  return (
    <Panel
      title="Portfolio Performance · Active Cards & Spend"
      accent="emerald"
      action={<CacheBar fetchedAt={fetchedAt} onRefresh={refresh} loading={loading} />}
    >
      <div className="space-y-4">
        {/* Aggregate stats */}
        {cards.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-xl px-3 py-2.5 text-xs"
              style={{ background: "rgba(5,150,105,0.06)", border: "1px solid rgba(5,150,105,0.16)" }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#3d5570" }}>
                Total active
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums" style={{ color: "#059669" }}>
                {totalActive.toLocaleString("en-US")}
              </p>
            </div>
            <div
              className="rounded-xl px-3 py-2.5 text-xs"
              style={{ background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.16)" }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#3d5570" }}>
                Monthly spend
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums" style={{ color: "#2563eb" }}>
                {`AED ${(totalSpend / 1_000_000).toFixed(1)}M`}
              </p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="max-h-60 overflow-auto rounded-xl" style={{ border: "1px solid #d1dde9" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Card</th>
                <th style={{ textAlign: "right" }}>Active</th>
                <th style={{ textAlign: "right" }}>Spend / card</th>
                <th style={{ textAlign: "right" }}>Utilize</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c, i) => {
                const spendPerCard = c.active_cards > 0 ? c.monthly_spend / c.active_cards : 0;
                return (
                  <tr key={i}>
                    <td style={{ color: "#1e2d3d" }}>{c.card_name}</td>
                    <td style={{ textAlign: "right" }}>{c.active_cards.toLocaleString("en-US")}</td>
                    <td style={{ textAlign: "right" }}>AED {spendPerCard.toFixed(0)}</td>
                    <td style={{
                      textAlign: "right",
                      color: c.utilization_rate > 0.5 ? "#059669" : c.utilization_rate < 0.3 ? "#e11d48" : "#d97706",
                    }}>
                      {(c.utilization_rate * 100).toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
              {cards.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs" style={{ color: "#3d5570" }}>
                    {loading ? "Loading…" : "No portfolio data available."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Sparkline — only when there are at least 2 cards to plot */}
        {cards.length >= 2 && (
          <div
            className="rounded-xl px-3 py-3"
            style={{ background: "#f8fafc", border: "1px solid #d1dde9", height: "88px" }}
          >
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#3d5570" }}>
              Active cards by product
            </p>
            <div style={{ height: "52px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cards.map((c, idx) => ({ idx, active: c.active_cards }))}>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #d1dde9",
                      borderRadius: "8px",
                      fontSize: "11px",
                      color: "#1e2d3d",
                    }}
                  />
                  <Line type="monotone" dataKey="active" stroke="#059669" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
