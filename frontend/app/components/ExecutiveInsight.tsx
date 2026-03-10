"use client";

import Panel from "./Panel";
import CacheBar from "./CacheBar";
import { useCachedFetch } from "@/hooks/useCachedFetch";

type NarrativePayload = { summary: string };

export default function ExecutiveInsight() {
  const { data: memo, loading, refresh, fetchedAt } = useCachedFetch<NarrativePayload>(
    "api:strategy/narrative",
    () => fetch("http://localhost:8000/strategy/narrative").then((r) => r.json()),
    10 * 60 * 1000, // 10-min TTL — this is an AI call
  );

  return (
    <Panel
      title="Executive Strategy Intelligence"
      accent="blue"
      action={<CacheBar fetchedAt={fetchedAt} onRefresh={refresh} loading={loading} />}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{
              background: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(124,58,237,0.2)",
              color: "#7c3aed",
            }}
          >
            AI
          </div>
          <div>
            <p className="font-heading text-sm font-bold" style={{ color: "#1e2d3d" }}>
              Board Memo · Cards Strategy
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "#4a6480" }}>
              AI-generated recommendation for ExCo / Board packs.
            </p>
          </div>
        </div>

        {/* Content */}
        {loading && (
          <p className="text-xs" style={{ color: "#3d5570" }}>Generating AI narrative…</p>
        )}

        {!loading && !memo && (
          <div
            className="rounded-xl px-4 py-6 text-center text-xs"
            style={{ background: "#f8fafc", border: "1px solid #d1dde9", color: "#3d5570" }}
          >
            <p className="text-lg mb-2">📋</p>
            <p className="font-semibold" style={{ color: "#1e2d3d" }}>Data not available</p>
            <p className="mt-1" style={{ color: "#4a6480" }}>
              Start the backend and ensure portfolio data has been seeded.
            </p>
          </div>
        )}

        {memo?.summary && (
          <div className="space-y-4 text-xs">
            <section>
              <SectionLabel color="#3d5570" label="AI Strategy Analysis" />
              <p className="mt-2 leading-relaxed" style={{ color: "#2d4a62", whiteSpace: "pre-line" }}>
                {memo.summary}
              </p>
            </section>
          </div>
        )}
      </div>
    </Panel>
  );
}

function SectionLabel({ label, color }: { label: string; color: string }) {
  return (
    <h3
      className="font-heading text-[10px] font-bold uppercase tracking-[0.18em]"
      style={{ color }}
    >
      {label}
    </h3>
  );
}
