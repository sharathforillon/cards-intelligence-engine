"use client";

import { useEffect, useState } from "react";
import CardIntelligenceTable from "../components/CardIntelligenceTable";
import BattlefieldChart from "../components/BattlefieldChart";
import Panel from "../components/Panel";

type CategoryMetric = {
  key: string;
  label: string;
  icon: string;
  color: string;
  opportunity_index: number;
  underperforming: boolean;
  mashreq_rate: number;
  market_leader_rate: number;
  market_leader_bank: string;
};

function CategoryStrengthPanel() {
  const [cats, setCats] = useState<CategoryMetric[]>([]);

  useEffect(() => {
    fetch("http://localhost:8000/categories/metrics")
      .then((r) => r.json())
      .then(setCats)
      .catch(console.error);
  }, []);

  const maxOpp = Math.max(...cats.map((c) => c.opportunity_index), 0.001);

  return (
    <Panel
      title="Spend Category Strength · Opportunity Index"
      accent="amber"
      action={
        <a href="/categories" className="text-[10px] font-semibold" style={{ color: "#2563eb" }}>
          Full Analysis →
        </a>
      }
    >
      <div className="space-y-2.5">
        {cats.map((c) => (
          <div key={c.key}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-semibold" style={{ color: "#1e2d3d" }}>
                {c.icon} {c.label}
              </span>
              <span
                className="text-[10px] font-bold"
                style={{ color: c.underperforming ? "#e11d48" : "#059669" }}
              >
                {(c.opportunity_index * 100).toFixed(0)}% gap
                {c.underperforming ? " ⚠" : " ✓"}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full" style={{ background: "#d1dde9" }}>
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: `${(c.opportunity_index / maxOpp) * 100}%`,
                  background: c.underperforming ? "#e11d48" : "#059669",
                }}
              />
            </div>
            <p className="mt-0.5 text-[9px]" style={{ color: "#4a6480" }}>
              Mashreq {(c.mashreq_rate * 100).toFixed(1)}% vs {c.market_leader_bank} {(c.market_leader_rate * 100).toFixed(1)}%
            </p>
          </div>
        ))}
        {cats.length === 0 && (
          <p className="py-4 text-center text-[11px]" style={{ color: "#3d5570" }}>
            Loading category data…
          </p>
        )}
      </div>
    </Panel>
  );
}

export default function MarketPage() {
  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-6">
        <h1
          className="font-heading text-2xl font-bold tracking-tight"
          style={{ color: "#1e2d3d" }}
        >
          Market Intelligence
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#4a6480" }}>
          UAE credit card landscape · competitive benchmarking, efficient frontier &amp; category strength.
        </p>
      </div>

      {/* Battlefield chart (frontier) */}
      <div className="mb-6">
        <BattlefieldChart />
      </div>

      {/* Category Strength Panel */}
      <div className="mb-6">
        <CategoryStrengthPanel />
      </div>

      {/* Full card universe table */}
      <CardIntelligenceTable />
    </main>
  );
}
