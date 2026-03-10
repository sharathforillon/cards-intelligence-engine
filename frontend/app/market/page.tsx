"use client";

import CardIntelligenceTable from "../components/CardIntelligenceTable";
import BattlefieldChart from "../components/BattlefieldChart";

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
          UAE credit card landscape · 35 cards across 11 banks · competitive
          benchmarking &amp; efficient frontier
        </p>
      </div>

      {/* Battlefield chart (frontier) */}
      <div className="mb-6">
        <BattlefieldChart />
      </div>

      {/* Full card universe table */}
      <CardIntelligenceTable />
    </main>
  );
}
