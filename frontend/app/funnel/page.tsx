"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/Panel";
import AcquisitionFunnelChart from "@/components/AcquisitionFunnelChart";

type FunnelMetrics = {
  stages: { stage: string; count: number; conversion_pct: number | null; color: string }[];
  overall_conversion_pct: number;
  total_applications: number;
  total_issued: number;
  total_active: number;
  blended_cac: number;
};

type ChannelRow = {
  channel: string;
  cac_aed: number;
  volume_cards: number;
  volume_share_pct: number;
  color: string;
  efficiency_vs_blended: number;
};

type Efficiency = {
  efficiency_score: number;
  payback_months: number;
  blended_cac_aed: number;
  avg_monthly_profit_per_card: number;
  approval_rate_pct: number;
  activation_rate_pct: number;
  active_rate_pct: number;
};

const API = "http://localhost:8000";

export default function FunnelPage() {
  const [funnel, setFunnel] = useState<FunnelMetrics | null>(null);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [efficiency, setEfficiency] = useState<Efficiency | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [f, c, e] = await Promise.all([
          fetch(`${API}/funnel/metrics`).then((r) => r.json()),
          fetch(`${API}/funnel/channel-cac`).then((r) => r.json()),
          fetch(`${API}/funnel/efficiency`).then((r) => r.json()),
        ]);
        setFunnel(f);
        setChannels(c);
        setEfficiency(e);
      } catch (err) {
        console.error("Failed to load funnel data", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <main style={{ background: "var(--c-bg)", minHeight: "100vh", padding: "28px 32px" }}>
      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#3d5570" }}>
          Module 6
        </p>
        <h1 className="font-heading mt-1 text-xl font-bold" style={{ color: "#1e2d3d" }}>
          Acquisition Funnel Analytics
        </h1>
        <p className="mt-1 text-xs" style={{ color: "#4a6480" }}>
          End-to-end card issuance funnel with channel-level CAC and acquisition efficiency metrics.
        </p>
      </div>

      {/* Funnel chart */}
      <div className="mb-6">
        <Panel
          title="Acquisition Funnel · Applications → Active Spenders"
          accent="blue"
          action={
            funnel ? (
              <span
                className="rounded-full px-3 py-1 text-[10px] font-bold"
                style={{ background: "rgba(37,99,235,0.08)", color: "#2563eb" }}
              >
                {funnel.overall_conversion_pct}% end-to-end
              </span>
            ) : undefined
          }
        >
          <AcquisitionFunnelChart stages={funnel?.stages ?? []} />
          {funnel && (
            <div className="mt-3 flex flex-wrap gap-4 text-xs" style={{ color: "#4a6480" }}>
              <span>Total applications: <strong style={{ color: "#1e2d3d" }}>{funnel.total_applications.toLocaleString("en-US")}</strong></span>
              <span>Cards issued: <strong style={{ color: "#1e2d3d" }}>{funnel.total_issued.toLocaleString("en-US")}</strong></span>
              <span>Active spenders: <strong style={{ color: "#059669" }}>{funnel.total_active.toLocaleString("en-US")}</strong></span>
              <span>Blended CAC: <strong style={{ color: "#1e2d3d" }}>AED {funnel.blended_cac.toLocaleString("en-US")}</strong></span>
            </div>
          )}
        </Panel>
      </div>

      {/* Channel CAC + Efficiency */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Channel CAC table */}
        <Panel title="Channel CAC Breakdown" accent="violet">
          <div className="rounded-xl" style={{ border: "1px solid #d1dde9" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th style={{ textAlign: "right" }}>CAC (AED)</th>
                  <th style={{ textAlign: "right" }}>Volume</th>
                  <th style={{ textAlign: "right" }}>vs Blended</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((ch) => (
                  <tr key={ch.channel}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: ch.color }}
                        />
                        <span style={{ color: "#1e2d3d", fontWeight: 600 }}>{ch.channel}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#1e2d3d" }}>
                      {ch.cac_aed.toLocaleString("en-US")}
                    </td>
                    <td style={{ textAlign: "right", color: "#4a6480" }}>
                      {ch.volume_cards.toLocaleString("en-US")}{" "}
                      <span style={{ color: "#3d5570" }}>({ch.volume_share_pct}%)</span>
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        color: ch.efficiency_vs_blended >= 0 ? "#059669" : "#e11d48",
                        fontWeight: 700,
                      }}
                    >
                      {ch.efficiency_vs_blended >= 0 ? "−" : "+"}{Math.abs(ch.efficiency_vs_blended)}%
                    </td>
                  </tr>
                ))}
                {!channels.length && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs" style={{ color: "#3d5570" }}>
                      {loading ? "Loading…" : "No channel data."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Efficiency panel */}
        <Panel title="Acquisition Efficiency Metrics" accent="emerald">
          {efficiency ? (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Efficiency Score", value: efficiency.efficiency_score.toFixed(1), color: "#2563eb" },
                { label: "Payback Period", value: `${efficiency.payback_months} mo`, color: "#059669" },
                { label: "Blended CAC", value: `AED ${efficiency.blended_cac_aed.toLocaleString("en-US")}`, color: "#1e2d3d" },
                { label: "Monthly Profit / Card", value: `AED ${efficiency.avg_monthly_profit_per_card.toFixed(0)}`, color: "#1e2d3d" },
                { label: "Approval Rate", value: `${efficiency.approval_rate_pct}%`, color: "#059669" },
                { label: "Activation Rate", value: `${efficiency.activation_rate_pct}%`, color: "#d97706" },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl px-3 py-2.5"
                  style={{ background: "#f8fafc", border: "1px solid #d1dde9" }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "#3d5570" }}>
                    {kpi.label}
                  </p>
                  <p className="mt-1 text-base font-bold tabular-nums" style={{ color: kpi.color }}>
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs" style={{ color: "#3d5570" }}>
              {loading ? "Loading efficiency metrics…" : "No efficiency data."}
            </p>
          )}
        </Panel>
      </div>
    </main>
  );
}
