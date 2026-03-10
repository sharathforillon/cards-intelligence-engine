"use client";

import { useEffect, useMemo, useState } from "react";
import Panel from "./Panel";

type SimulationResult = {
  financials: { expected_roe: number; raroc: number };
  capital: { capital_required: number; baseline_capital_required?: number };
  spend_lift?: number | null;
  capital_impact?: number | null;
  competitor_response_probability?: number | null;
};

export default function StrategySandbox() {
  const [cards, setCards] = useState<any[]>([]);
  const [selectedCardName, setSelectedCardName] = useState<string>("");

  const selectedCard = useMemo(
    () => cards.find((c) => c.card_name === selectedCardName),
    [cards, selectedCardName]
  );

  const [reward, setReward] = useState(3);
  const [fee, setFee] = useState(200);
  const [features, setFeatures] = useState(0.6);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadCards() {
      try {
        const res = await fetch("http://localhost:8000/portfolio/cards");
        const data = await res.json();
        setCards(data);
        if (data.length > 0) {
          setSelectedCardName(data[0].card_name);
          if (data[0].reward_rate) setReward((data[0].reward_rate as number) * 100);
          if (data[0].annual_fee) setFee(data[0].annual_fee as number);
        }
      } catch (e) {
        console.error("Failed to load Mashreq cards", e);
      }
    }
    loadCards();
  }, []);

  async function simulate() {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_name: selectedCardName || null,
          reward_rate: reward / 100,
          annual_fee: fee,
          features,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error("Failed to run simulation", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedCardName) simulate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roe            = result?.financials.expected_roe ?? null;
  const raroc          = result?.financials.raroc ?? null;
  const capitalRequired = result?.capital.capital_required ?? null;
  const spendLift      = result?.spend_lift ?? null;
  const competitorProb = result?.competitor_response_probability ?? null;
  const capitalImpact  = result?.capital_impact ?? null;
  const failsHurdle    = roe !== null && roe < 18;

  return (
    <Panel title="Strategy Sandbox · Interactive Simulation" accent="violet">
      <div className="space-y-5 text-xs">
        <p style={{ color: "#4a6480" }}>
          Select a Mashreq card and adjust reward rate, annual fee, and feature
          strength. The sandbox simulates ROE, RAROC, capital, and spend delta
          vs the current card configuration.
        </p>

        {/* Card selector */}
        <div>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "#8fa5b8" }}>
              Mashreq card anchor
            </span>
            <select
              value={selectedCardName}
              onChange={(e) => {
                const name = e.target.value;
                setSelectedCardName(name);
                const card = cards.find((c) => c.card_name === name);
                if (card) {
                  if (typeof card.reward_rate === "number") setReward(card.reward_rate * 100);
                  if (typeof card.annual_fee === "number") setFee(card.annual_fee);
                }
              }}
              className="input-dark"
            >
              {cards.map((c, i) => (
                <option key={`${c.card_name}-${i}`} value={c.card_name}>
                  {c.card_name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Current card stats */}
        {selectedCard && (
          <div
            className="grid grid-cols-3 gap-3 rounded-xl p-3 text-[11px]"
            style={{ background: "#f8fafc", border: "1px solid #d1dde9" }}
          >
            <StatItem label="Annual fee" value={`AED ${selectedCard.annual_fee?.toFixed(0) ?? "0"}`} />
            <StatItem label="Reward rate" value={selectedCard.reward_rate ? `${(selectedCard.reward_rate * 100).toFixed(1)}%` : "—"} />
            <StatItem label="FX markup"   value={selectedCard.fx_markup ? `${selectedCard.fx_markup.toFixed(2)}%` : "—"} />
            <StatItem label="Active cards" value={selectedCard.active_cards?.toLocaleString("en-US") ?? "—"} />
            <StatItem
              label="Spend / card"
              value={selectedCard.active_cards ? `AED ${(selectedCard.monthly_spend / selectedCard.active_cards).toFixed(0)}` : "—"}
            />
            <StatItem label="Segment" value={selectedCard.segment ?? "—"} />
          </div>
        )}

        {/* Sliders */}
        <div className="space-y-4">
          <Slider label="Reward rate"      value={reward}   min={1}   max={6}   step={0.5} suffix="%" onChange={setReward}   color="#059669" />
          <Slider label="Annual fee"       value={fee}      min={0}   max={1000} step={50}  suffix=" AED" onChange={setFee}  color="#2563eb" />
          <Slider label="Feature strength" value={features} min={0.3} max={1}   step={0.1} suffix=""     onChange={setFeatures} color="#7c3aed" />
        </div>

        {/* Simulate button */}
        <button onClick={simulate} className="btn-primary w-full" disabled={loading}>
          {loading ? "Running simulation…" : "▶ Run simulation"}
        </button>

        {/* Results */}
        <div className="grid grid-cols-3 gap-3">
          <SimMetric label="Projected ROE"  value={roe    !== null ? `${roe.toFixed(1)}%`    : loading ? "…" : "—"} tone={failsHurdle ? "rose" : "emerald"} />
          <SimMetric label="RAROC"          value={raroc  !== null ? `${raroc.toFixed(1)}%`  : loading ? "…" : "—"} tone={raroc !== null && raroc < 18 ? "rose" : "emerald"} />
          <SimMetric
            label="Capital Δ"
            value={capitalImpact !== null ? `AED ${capitalImpact.toLocaleString("en-US")}` : capitalRequired !== null ? `AED ${capitalRequired.toLocaleString("en-US")}` : loading ? "…" : "—"}
            tone="blue"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SimMetric label="Spend lift vs baseline"       value={spendLift     !== null ? `${spendLift.toFixed(1)}%`              : loading ? "…" : "—"} tone="blue" />
          <SimMetric label="Competitor response prob."    value={competitorProb !== null ? `${(competitorProb * 100).toFixed(0)}%` : loading ? "…" : "—"} tone="amber" />
        </div>

        {/* Hurdle warning */}
        {failsHurdle && (
          <div
            className="rounded-xl px-3 py-2.5 text-xs"
            style={{ background: "rgba(225,29,72,0.06)", border: "1px solid rgba(225,29,72,0.2)", color: "#9f1239" }}
          >
            <span className="font-bold">↓ Fails hurdle rate</span> — ROE below
            18%. Rebalance reward rate, fees, or feature richness before taking
            this construct to IC.
          </div>
        )}
      </div>
    </Panel>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ color: "#8fa5b8" }}>{label}</p>
      <p className="mt-0.5 font-medium" style={{ color: "#1e2d3d" }}>{value}</p>
    </div>
  );
}

function Slider({ label, value, min, max, step, suffix, onChange, color }: {
  label: string; value: number; min: number; max: number; step: number; suffix: string;
  onChange: (v: number) => void; color?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span style={{ color: "#4a6480" }}>{label}</span>
        <span className="font-semibold tabular-nums" style={{ color: color ?? "#1e2d3d" }}>
          {value.toFixed(step < 1 ? 1 : 0)}{suffix}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

type SimTone = "emerald" | "rose" | "blue" | "amber";

const simToneMap: Record<SimTone, { value: string; bg: string; border: string }> = {
  emerald: { value: "#059669", bg: "rgba(5,150,105,0.06)",  border: "rgba(5,150,105,0.16)"  },
  rose:    { value: "#e11d48", bg: "rgba(225,29,72,0.06)",  border: "rgba(225,29,72,0.16)"  },
  blue:    { value: "#2563eb", bg: "rgba(37,99,235,0.06)",  border: "rgba(37,99,235,0.16)"  },
  amber:   { value: "#d97706", bg: "rgba(217,119,6,0.06)", border: "rgba(217,119,6,0.16)"  },
};

function SimMetric({ label, value, tone = "blue" }: { label: string; value: string; tone?: SimTone }) {
  const t = simToneMap[tone];
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#8fa5b8" }}>{label}</p>
      <p className="mt-1 text-base font-bold tabular-nums" style={{ color: t.value }}>{value}</p>
    </div>
  );
}
