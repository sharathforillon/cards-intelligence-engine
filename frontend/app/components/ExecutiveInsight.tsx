"use client";

import { useEffect, useState } from "react";
import Panel from "./Panel";

type NarrativePayload = {
  summary: string;
};

export default function ExecutiveInsight() {
  const [memo, setMemo] = useState<NarrativePayload | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadNarrative() {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/strategy/narrative");
      const data = await res.json();
      setMemo(data);
    } catch (e) {
      console.error("Failed to load narrative", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNarrative();
  }, []);

  const summaryText =
    memo?.summary ||
    "Strategy engine is warming up. Start the backend to stream the current board-level view of the UAE cards battlefield.";

  return (
    <Panel
      title="Executive Strategy Intelligence"
      accent="blue"
      action={
        <button onClick={loadNarrative} className="btn-ghost" disabled={loading}>
          {loading ? "Refreshing…" : "↺ Refresh"}
        </button>
      }
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
            <p
              className="font-heading text-sm font-bold"
              style={{ color: "#1e2d3d" }}
            >
              Board Memo · Cards Strategy
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "#4a6480" }}>
              Condensed recommendation suitable for ExCo / Board packs.
            </p>
          </div>
        </div>

        {/* Amber callout */}
        <div
          className="rounded-lg px-3 py-2 text-xs"
          style={{
            background: "rgba(217,119,6,0.06)",
            border: "1px solid rgba(217,119,6,0.18)",
            color: "#92400e",
          }}
        >
          <span className="font-semibold">Amber</span> sections highlight
          AI-recommended strategic actions for the Head of Cards.
        </div>

        {/* Memo body */}
        <div className="space-y-4 text-xs">
          <section>
            <SectionLabel color="#3d5570" label="Headline recommendation" />
            <p
              className="mt-2 leading-relaxed"
              style={{ color: "#2d4a62" }}
            >
              {summaryText.split("\n\n")[0] ||
                "Stabilise margin while selectively leaning into high-yield salary-bank and affluent segments, using calibrated cashback and fee constructs."}
            </p>
          </section>

          <Divider />

          <section>
            <SectionLabel color="#3d5570" label="Supporting arguments" />
            <BulletList
              items={[
                "Portfolio CLV and RAROC remain resilient around internal hurdle rates, with scope to reprice sub-scale cards.",
                "White space in fee vs. reward yield suggests room for a mid-fee salary-bank flagship with differentiated FX and category rewards.",
                "Competitor moves indicate a pivot towards richer travel and FX propositions from FAB and ENBD, especially in affluent bands.",
              ]}
            />
          </section>

          <Divider />

          <section>
            <SectionLabel color="#3d5570" label="Risk analysis" />
            <BulletList
              items={[
                "Margin compression risk if cashback is raised without corresponding fee and utilisation uplifts.",
                "Cannibalisation of existing premium cards if benefits are over-concentrated in a single flagship construct.",
                "Regulatory focus on fee transparency and FX markup, requiring careful design of non-price benefits.",
              ]}
              tone="rose"
            />
          </section>

          <Divider />

          <section>
            <SectionLabel color="#d97706" label="Recommended action" />
            <div
              className="mt-2 rounded-lg p-3"
              style={{
                background: "rgba(217,119,6,0.05)",
                border: "1px solid rgba(217,119,6,0.16)",
              }}
            >
              <ol
                className="list-decimal space-y-1.5 pl-4 leading-relaxed"
                style={{ color: "#92400e" }}
              >
                <li>
                  Approve a calibrated strategy grid for simulation in the
                  sandbox, focusing on 2–3 flagship constructs.
                </li>
                <li>
                  Run capital and profitability scenarios via the command center
                  and lock target RAROC & ROE bands.
                </li>
                <li>
                  Prepare an execution roadmap with risk, finance, and marketing
                  aligned around the selected design.
                </li>
              </ol>
            </div>
          </section>
        </div>
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

function Divider() {
  return (
    <div style={{ height: 1, background: "rgba(209,221,233,0.8)" }} />
  );
}

function BulletList({
  items,
  tone = "default",
}: {
  items: string[];
  tone?: "default" | "rose";
}) {
  const dotColor = tone === "rose" ? "#e11d48" : "#2563eb";
  const textColor = tone === "rose" ? "#9f1239" : "#2d4a62";
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex gap-2 leading-relaxed"
          style={{ color: textColor }}
        >
          <span
            className="mt-1.5 h-1 w-1 shrink-0 rounded-full"
            style={{ background: dotColor }}
          />
          {item}
        </li>
      ))}
    </ul>
  );
}
