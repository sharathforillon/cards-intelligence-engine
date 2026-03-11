"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Panel from "./Panel";

/* ── Types ──────────────────────────────────────────────────────────────── */

type CardRecord = {
  id: number;
  card_name: string;
  segment: string;
  active_cards: number;
  monthly_spend: number;
  annual_fee: number;
  reward_rate: number;
  fx_markup: number;
  revolve_rate: number;
  attrition_rate: number;
  npl_rate: number;
  interchange_income: number;
  interest_income: number;
  reward_cost: number;
};

type SimResult = {
  financials: { expected_roe: number; raroc: number };
  capital: { capital_required: number; baseline_capital_required?: number };
  spend_lift?: number | null;
  capital_impact?: number | null;
  competitor_response_probability?: number | null;
};

type Strategy = {
  id?: number;
  priority: number;
  title: string;
  action: string;
  rationale: string;
  parameter_changes?: {
    reward_rate: number | null;
    annual_fee: number | null;
    features: number | null;
  };
  // DB-stored versions use param_ prefix
  param_reward_rate?: number | null;
  param_annual_fee?: number | null;
  param_features?: number | null;
  projected_profit_aed?: number;
  profit_impact_aed_annual?: number;
  projected_roe_lift_pp?: number;
  roe_improvement_pp?: number;
  risk_level: "Low" | "Medium" | "High";
  confidence_pct: number;
  quick_win: boolean;
  // tracking fields
  status?: string;
  notes?: string;
  actual_profit_delta_30d?: number | null;
  actual_profit_delta_60d?: number | null;
  actual_profit_delta_90d?: number | null;
  actual_roe_delta?: number | null;
  performance_notes?: string | null;
  generated_at?: string;
};

type StrategyResult = {
  card_name: string;
  card_summary: string;
  annual_profit_aed: number;
  monthly_spend_aed: number;
  active_cards: number;
  strategies: Strategy[];
  generated_fresh?: boolean;
};

const SEGMENT_LABEL: Record<string, string> = {
  salary_bank_customers: "Mass Market",
  core_professionals:    "Mass Affluent",
  affluent_lifestyle:    "Affluent",
  premium_travelers:     "Premium Travelers",
  category_maximizers:   "Category Maximizers",
};

const RISK_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  Low:    { bg: "rgba(5,150,105,0.09)",  border: "rgba(5,150,105,0.25)",  text: "#047857" },
  Medium: { bg: "rgba(217,119,6,0.09)",  border: "rgba(217,119,6,0.25)",  text: "#b45309" },
  High:   { bg: "rgba(225,29,72,0.09)",  border: "rgba(225,29,72,0.25)",  text: "#be123c" },
};

const STATUS_COLOR: Record<string, string> = {
  pending:     "#3d5570",
  approved:    "#2563eb",
  in_progress: "#d97706",
  monitoring:  "#7c3aed",
  completed:   "#059669",
  rejected:    "#e11d48",
};

const PROFIT_FMT = (n: number) =>
  `AED ${(Math.abs(n) / 1e6).toFixed(1)}M${n < 0 ? " loss" : ""}`;

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════ */

export default function StrategySandbox() {
  const [cards, setCards]                   = useState<CardRecord[]>([]);
  const [selectedName, setSelectedName]     = useState<string>("");
  const [reward, setReward]                 = useState(2.0);
  const [fee, setFee]                       = useState(0);
  const [features, setFeatures]             = useState(0.6);
  const [simResult, setSimResult]           = useState<SimResult | null>(null);
  const [freshStrategies, setFreshStrategies]   = useState<Strategy[]>([]);
  const [historyStrategies, setHistoryStrategies] = useState<Strategy[]>([]);
  const [cardSummary, setCardSummary]       = useState<string>("");
  const [simLoading, setSimLoading]         = useState(false);
  const [stratLoading, setStratLoading]     = useState(false);
  const [showHistory, setShowHistory]       = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null);
  const prevCardRef                         = useRef<string>("");

  const selectedCard = useMemo(
    () => cards.find((c) => c.card_name === selectedName) ?? null,
    [cards, selectedName],
  );

  /* ── Load cards on mount ──────────────────────────────────────────────── */
  useEffect(() => {
    fetch("http://localhost:8000/portfolio/cards")
      .then((r) => r.json())
      .then((data: CardRecord[]) => {
        setCards(data);
        if (data.length > 0) {
          const first = data[0];
          setSelectedName(first.card_name);
          setReward(+(first.reward_rate * 100).toFixed(1));
          setFee(Math.round(first.annual_fee));
        }
      })
      .catch(console.error);
  }, []);

  /* ── Run simulation ───────────────────────────────────────────────────── */
  const simulate = useCallback(async () => {
    setSimLoading(true);
    try {
      const res = await fetch("http://localhost:8000/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_name: selectedName || null,
          reward_rate: reward / 100,
          annual_fee: fee,
          features,
        }),
      });
      setSimResult(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setSimLoading(false);
    }
  }, [selectedName, reward, fee, features]);

  /* ── Load history for card ────────────────────────────────────────────── */
  const loadHistory = useCallback(async (name: string) => {
    try {
      const res = await fetch(
        `http://localhost:8000/portfolio/strategy/history/${encodeURIComponent(name)}`,
      );
      setHistoryStrategies(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, []);

  /* ── Auto-simulate + load history when card changes ──────────────────── */
  useEffect(() => {
    if (!selectedName || selectedName === prevCardRef.current) return;
    prevCardRef.current = selectedName;
    setFreshStrategies([]);
    setCardSummary("");
    simulate();
    loadHistory(selectedName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedName]);

  /* ── Generate new strategies (manual, user-triggered) ────────────────── */
  const generateStrategies = useCallback(async () => {
    if (!selectedName) return;
    setStratLoading(true);
    try {
      const res = await fetch(
        `http://localhost:8000/portfolio/strategy/generate/${encodeURIComponent(selectedName)}`,
        { method: "POST" },
      );
      const data: StrategyResult = await res.json();
      setFreshStrategies(data.strategies ?? []);
      setCardSummary(data.card_summary ?? "");
      // Reload history so newly saved strategies appear there too
      await loadHistory(selectedName);
    } catch (e) {
      console.error(e);
    } finally {
      setStratLoading(false);
    }
  }, [selectedName, loadHistory]);

  /* ── Card selector handler ────────────────────────────────────────────── */
  function handleCardChange(name: string) {
    const card = cards.find((c) => c.card_name === name);
    setSelectedName(name);
    if (card) {
      setReward(+(card.reward_rate * 100).toFixed(1));
      setFee(Math.round(card.annual_fee));
    }
  }

  /* ── Apply recommended parameters to sliders ──────────────────────────── */
  function applyStrategy(s: Strategy) {
    const rr = s.parameter_changes?.reward_rate ?? s.param_reward_rate;
    const af = s.parameter_changes?.annual_fee  ?? s.param_annual_fee;
    const ft = s.parameter_changes?.features    ?? s.param_features;
    if (rr !== null && rr !== undefined) setReward(+(rr * 100).toFixed(1));
    if (af !== null && af !== undefined) setFee(Math.round(af));
    if (ft !== null && ft !== undefined) setFeatures(ft);
  }

  /* ── Update strategy status ───────────────────────────────────────────── */
  async function updateStatus(id: number, status: string) {
    setStatusUpdating(id);
    try {
      await fetch(`http://localhost:8000/portfolio/strategy/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await loadHistory(selectedName);
      setFreshStrategies((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status } : s)),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setStatusUpdating(null);
    }
  }

  /* ── Derived display values ───────────────────────────────────────────── */
  const roe         = simResult?.financials.expected_roe ?? null;
  const raroc       = simResult?.financials.raroc        ?? null;
  const capitalReq  = simResult?.capital.capital_required ?? null;
  const capitalImp  = simResult?.capital_impact           ?? null;
  const spendLift   = simResult?.spend_lift               ?? null;
  const competProb  = simResult?.competitor_response_probability ?? null;
  const failsHurdle = roe !== null && roe < 18;

  const monthlyRevenue = selectedCard
    ? (selectedCard.interchange_income + selectedCard.interest_income) / 1e6
    : null;

  return (
    <Panel title="Strategy Sandbox · Interactive Simulation" accent="violet">
      <div className="space-y-5 text-xs">
        <p style={{ color: "#4a6480" }}>
          Select a Mashreq card to auto-run simulations. Click{" "}
          <strong>Generate AI Strategies</strong> to create fresh, non-repeating
          recommendations — each saved to history for tracking.
        </p>

        {/* ── Card selector ──────────────────────────────────────────────── */}
        <div>
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{ color: "#3d5570" }}>
            Mashreq Card Anchor
          </span>
          <select
            value={selectedName}
            onChange={(e) => handleCardChange(e.target.value)}
            className="input-dark"
          >
            {cards.length === 0 && <option value="">Loading cards…</option>}
            {cards.map((c) => (
              <option key={c.id} value={c.card_name}>{c.card_name}</option>
            ))}
          </select>
        </div>

        {/* ── Current card KPI grid ──────────────────────────────────────── */}
        {selectedCard && (
          <div className="grid grid-cols-3 gap-2 rounded-xl p-3"
            style={{ background: "#f3f7fb", border: "1px solid #d1dde9" }}>
            <KPIItem label="Annual Fee"        value={`AED ${selectedCard.annual_fee.toLocaleString("en-US")}`} />
            <KPIItem label="Reward Rate"       value={`${(selectedCard.reward_rate * 100).toFixed(1)}%`} />
            <KPIItem label="FX Markup"         value={`${selectedCard.fx_markup.toFixed(2)}%`} />
            <KPIItem label="Active Cards"      value={selectedCard.active_cards.toLocaleString("en-US")} />
            <KPIItem label="Spend/Card/Mo"     value={`AED ${Math.round(selectedCard.monthly_spend / Math.max(selectedCard.active_cards, 1)).toLocaleString("en-US")}`} />
            <KPIItem label="Segment"           value={SEGMENT_LABEL[selectedCard.segment] ?? selectedCard.segment} />
            <KPIItem label="Revolve Rate"      value={`${(selectedCard.revolve_rate * 100).toFixed(0)}%`} />
            <KPIItem label="Attrition"         value={`${(selectedCard.attrition_rate * 100).toFixed(0)}%/yr`} />
            <KPIItem label="NPL Rate"          value={`${(selectedCard.npl_rate * 100).toFixed(1)}%`} />
            {monthlyRevenue !== null && (
              <KPIItem label="Monthly Revenue" value={`AED ${monthlyRevenue.toFixed(1)}M`} />
            )}
          </div>
        )}

        {/* ── Sliders ────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <Slider label="Reward rate"      value={reward}   min={0.5} max={6}     step={0.25} suffix="%" onChange={setReward}   color="#059669" />
          <Slider label="Annual fee"       value={fee}      min={0}   max={3_500}  step={100}  suffix=" AED" onChange={setFee}  color="#2563eb" />
          <Slider label="Feature strength" value={features} min={0.3} max={1.0}   step={0.1}  suffix=""     onChange={setFeatures} color="#7c3aed" />
        </div>

        <button onClick={simulate} className="btn-primary w-full" disabled={simLoading}>
          {simLoading ? "Running simulation…" : "▶ Run Simulation"}
        </button>

        {/* ── Sim results ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2.5">
          <SimMetric label="Projected ROE"  value={roe   !== null ? `${roe.toFixed(1)}%`   : simLoading ? "…" : "—"} tone={failsHurdle ? "rose" : "emerald"} />
          <SimMetric label="RAROC"          value={raroc !== null ? `${raroc.toFixed(1)}%` : simLoading ? "…" : "—"} tone={raroc !== null && raroc < 18 ? "rose" : "emerald"} />
          <SimMetric label="Capital Δ"      value={capitalImp !== null ? `AED ${(capitalImp/1e6).toFixed(1)}M` : capitalReq !== null ? `AED ${(capitalReq/1e6).toFixed(1)}M` : simLoading ? "…" : "—"} tone="blue" />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <SimMetric label="Spend Lift vs Baseline"    value={spendLift  !== null ? `${spendLift.toFixed(1)}%`         : simLoading ? "…" : "—"} tone="blue" />
          <SimMetric label="Competitor Response Prob." value={competProb !== null ? `${(competProb*100).toFixed(0)}%` : simLoading ? "…" : "—"} tone="amber" />
        </div>

        {failsHurdle && (
          <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(225,29,72,0.06)", border: "1px solid rgba(225,29,72,0.2)", color: "#9f1239" }}>
            <span className="font-bold">↓ Fails hurdle rate</span> — ROE below 18%.
            Rebalance reward rate, fees, or features before taking to IC.
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            AI STRATEGY RECOMMENDATIONS
        ════════════════════════════════════════════════════════════════════ */}
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#7c3aed" }}>
              ✦ AI Strategy Recommendations
            </span>
            <button
              onClick={generateStrategies}
              disabled={stratLoading || !selectedName}
              className="btn-primary text-[11px]"
              style={{ padding: "5px 14px" }}
            >
              {stratLoading ? "Generating…" : "Generate AI Strategies"}
            </button>
          </div>

          {cardSummary && (
            <p className="mb-3 rounded-lg px-3 py-2 text-[11px] leading-relaxed"
              style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.15)", color: "#4a3f75" }}>
              {cardSummary}
            </p>
          )}

          {/* Skeleton */}
          {stratLoading && (
            <div className="space-y-2">
              {[1,2,3].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl" style={{ background: "#eef2f7" }} />)}
            </div>
          )}

          {/* Fresh strategies */}
          {!stratLoading && freshStrategies.length > 0 && (
            <div className="space-y-2.5">
              {freshStrategies.map((s) => (
                <StrategyCard
                  key={s.id ?? s.priority}
                  strategy={s}
                  onApply={() => { applyStrategy(s); setTimeout(simulate, 150); }}
                  onStatusChange={s.id ? (st) => updateStatus(s.id!, st) : undefined}
                  updating={statusUpdating === s.id}
                />
              ))}
            </div>
          )}

          {!stratLoading && freshStrategies.length === 0 && (
            <p className="rounded-lg px-3 py-3 text-center text-[11px]"
              style={{ background: "#f3f7fb", border: "1px dashed #c5d5e8", color: "#3d5570" }}>
              Click <strong>Generate AI Strategies</strong> to get 3 fresh recommendations for this card.
              Each call generates unique strategies — previously suggested ones are never repeated.
            </p>
          )}

          {/* ── History ──────────────────────────────────────────────────── */}
          {historyStrategies.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold"
                style={{ color: "#3d5570" }}
              >
                <span>{showHistory ? "▲" : "▼"}</span>
                Strategy History ({historyStrategies.length})
              </button>
              {showHistory && (
                <div className="space-y-2">
                  {historyStrategies.map((s) => (
                    <HistoryCard
                      key={s.id}
                      strategy={s}
                      onApply={() => { applyStrategy(s); setTimeout(simulate, 150); }}
                      onStatusChange={s.id ? (st) => updateStatus(s.id!, st) : undefined}
                      updating={statusUpdating === s.id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

/* ── Strategy card (fresh result) ──────────────────────────────────────── */
function StrategyCard({
  strategy: s, onApply, onStatusChange, updating,
}: {
  strategy: Strategy;
  onApply: () => void;
  onStatusChange?: (status: string) => void;
  updating?: boolean;
}) {
  const rc = RISK_COLOR[s.risk_level] ?? RISK_COLOR.Medium;
  const profit = s.profit_impact_aed_annual ?? s.projected_profit_aed ?? 0;
  const roe    = s.roe_improvement_pp ?? s.projected_roe_lift_pp ?? 0;
  const hasParams = !!(
    (s.parameter_changes?.reward_rate ?? s.param_reward_rate) !== null &&
    (s.parameter_changes?.reward_rate ?? s.param_reward_rate) !== undefined ||
    (s.parameter_changes?.annual_fee  ?? s.param_annual_fee)  !== null &&
    (s.parameter_changes?.annual_fee  ?? s.param_annual_fee)  !== undefined ||
    (s.parameter_changes?.features    ?? s.param_features)    !== null &&
    (s.parameter_changes?.features    ?? s.param_features)    !== undefined
  );
  const status = s.status ?? "pending";

  return (
    <div className="rounded-xl p-3.5" style={{ background: "#f8fafc", border: "1px solid #d5e0ec" }}>
      {/* Header */}
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "#1e2d3d", color: "#fff" }}>
          #{s.priority}
        </span>
        <span className="font-semibold" style={{ color: "#0d1f2f", fontSize: 12 }}>{s.title}</span>
        <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: rc.bg, border: `1px solid ${rc.border}`, color: rc.text }}>
          {s.risk_level} Risk
        </span>
        {s.quick_win && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: "rgba(5,150,105,0.1)", border: "1px solid rgba(5,150,105,0.25)", color: "#047857" }}>
            ⚡ Quick Win
          </span>
        )}
        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize"
          style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)", color: STATUS_COLOR[status] ?? "#3d5570" }}>
          {status}
        </span>
      </div>

      <p className="mb-1.5 text-[11px] font-medium" style={{ color: "#1e4a7d" }}>→ {s.action}</p>
      <p className="mb-2.5 text-[10.5px] leading-relaxed" style={{ color: "#4a6480" }}>{s.rationale}</p>

      <div className="mb-2.5 flex flex-wrap gap-4">
        <MetricPill label="Profit Impact" value={PROFIT_FMT(profit)} color="#059669" />
        <MetricPill label="ROE Lift"      value={`+${roe.toFixed(1)}pp`}             color="#2563eb" />
        <MetricPill label="Confidence"    value={`${s.confidence_pct}%`}             color="#7c3aed" />
      </div>

      <div className="mb-3 h-1 w-full rounded-full" style={{ background: "#dde7f0" }}>
        <div className="h-1 rounded-full" style={{ width: `${s.confidence_pct}%`, background: "#7c3aed" }} />
      </div>

      <div className="flex flex-wrap gap-2">
        {hasParams && (
          <button onClick={onApply} className="btn-ghost text-[11px]" style={{ padding: "4px 12px" }}>
            Apply to Simulator ↑
          </button>
        )}
        {onStatusChange && status === "pending" && (
          <button
            onClick={() => onStatusChange("approved")}
            disabled={updating}
            className="btn-primary text-[11px]"
            style={{ padding: "4px 12px", background: "#059669" }}
          >
            {updating ? "…" : "✓ Approve & Track"}
          </button>
        )}
        {onStatusChange && status === "approved" && (
          <button
            onClick={() => onStatusChange("in_progress")}
            disabled={updating}
            className="btn-primary text-[11px]"
            style={{ padding: "4px 12px", background: "#d97706" }}
          >
            {updating ? "…" : "▶ Mark In Progress"}
          </button>
        )}
        {onStatusChange && status === "in_progress" && (
          <button
            onClick={() => onStatusChange("completed")}
            disabled={updating}
            className="btn-primary text-[11px]"
            style={{ padding: "4px 12px", background: "#059669" }}
          >
            {updating ? "…" : "✓ Mark Complete"}
          </button>
        )}
        {onStatusChange && status === "pending" && (
          <button
            onClick={() => onStatusChange("rejected")}
            disabled={updating}
            className="btn-ghost text-[11px]"
            style={{ padding: "4px 12px", color: "#e11d48" }}
          >
            {updating ? "…" : "✗ Reject"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── History card (with performance delta) ─────────────────────────────── */
function HistoryCard({
  strategy: s, onApply, onStatusChange, updating,
}: {
  strategy: Strategy;
  onApply: () => void;
  onStatusChange?: (status: string) => void;
  updating?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const status  = s.status ?? "pending";
  const sc      = STATUS_COLOR[status] ?? "#3d5570";
  const profit  = s.projected_profit_aed ?? s.profit_impact_aed_annual ?? 0;
  const d90     = s.actual_profit_delta_90d;
  const hasPerf = d90 !== null && d90 !== undefined;

  return (
    <div className="rounded-xl p-3" style={{ background: "#f8fafc", border: "1px solid #d5e0ec" }}>
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold capitalize"
              style={{ background: `${sc}18`, border: `1px solid ${sc}40`, color: sc }}>
              {status}
            </span>
            <span className="font-semibold" style={{ color: "#0d1f2f", fontSize: 11 }}>{s.title}</span>
            <span className="ml-auto text-[9px]" style={{ color: "#8fa5b8" }}>
              {s.generated_at ? new Date(s.generated_at).toLocaleDateString("en-GB") : ""}
            </span>
          </div>
          <p className="text-[10.5px]" style={{ color: "#4a6480" }}>{s.action}</p>
          {hasPerf && (
            <div className="mt-1.5 flex gap-3">
              <MetricPill
                label="90d Actual Δ"
                value={`${d90! >= 0 ? "+" : ""}AED ${(Math.abs(d90!) / 1e6).toFixed(1)}M`}
                color={d90! >= 0 ? "#059669" : "#e11d48"}
              />
              <MetricPill label="Projected" value={PROFIT_FMT(profit)} color="#8fa5b8" />
            </div>
          )}
          {!hasPerf && profit > 0 && (
            <p className="mt-0.5 text-[10px]" style={{ color: "#8fa5b8" }}>
              Projected: {PROFIT_FMT(profit)}/yr
            </p>
          )}
        </div>
        <button onClick={() => setExpanded((v) => !v)} className="text-[11px]" style={{ color: "#3d5570" }}>
          {expanded ? "▲" : "▼"}
        </button>
      </div>

      {expanded && (
        <div className="mt-2.5 space-y-2 border-t pt-2.5" style={{ borderColor: "#d5e0ec" }}>
          <p className="text-[10.5px] leading-relaxed" style={{ color: "#4a6480" }}>{s.rationale}</p>
          {s.performance_notes && (
            <p className="text-[10px]" style={{ color: "#3d5570" }}>📝 {s.performance_notes}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={onApply} className="btn-ghost text-[10px]" style={{ padding: "3px 10px" }}>
              Apply to Simulator
            </button>
            {onStatusChange && status === "pending" && (
              <button onClick={() => onStatusChange("approved")} disabled={updating} className="btn-primary text-[10px]" style={{ padding: "3px 10px", background: "#059669" }}>
                {updating ? "…" : "Approve"}
              </button>
            )}
            {onStatusChange && status === "approved" && (
              <button onClick={() => onStatusChange("in_progress")} disabled={updating} className="btn-primary text-[10px]" style={{ padding: "3px 10px", background: "#d97706" }}>
                {updating ? "…" : "In Progress"}
              </button>
            )}
            {onStatusChange && status === "in_progress" && (
              <button onClick={() => onStatusChange("completed")} disabled={updating} className="btn-primary text-[10px]" style={{ padding: "3px 10px" }}>
                {updating ? "…" : "Complete"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function KPIItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[9.5px]" style={{ color: "#3d5570" }}>{label}</p>
      <p className="mt-0.5 text-[11px] font-semibold tabular-nums" style={{ color: highlight ? "#059669" : "#1e2d3d" }}>
        {value}
      </p>
    </div>
  );
}

function Slider({ label, value, min, max, step, suffix, onChange, color }: {
  label: string; value: number; min: number; max: number; step: number;
  suffix: string; onChange: (v: number) => void; color?: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span style={{ color: "#4a6480" }}>{label}</span>
        <span className="font-semibold tabular-nums" style={{ color: color ?? "#1e2d3d" }}>
          {value.toFixed(step < 1 ? (step < 0.1 ? 2 : 1) : 0)}{suffix}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

type SimTone = "emerald" | "rose" | "blue" | "amber";
const TONE_MAP: Record<SimTone, { v: string; bg: string; bd: string }> = {
  emerald: { v: "#059669", bg: "rgba(5,150,105,0.06)",  bd: "rgba(5,150,105,0.16)"  },
  rose:    { v: "#e11d48", bg: "rgba(225,29,72,0.06)",  bd: "rgba(225,29,72,0.16)"  },
  blue:    { v: "#2563eb", bg: "rgba(37,99,235,0.06)",  bd: "rgba(37,99,235,0.16)"  },
  amber:   { v: "#d97706", bg: "rgba(217,119,6,0.06)",  bd: "rgba(217,119,6,0.16)"  },
};

function SimMetric({ label, value, tone = "blue" }: { label: string; value: string; tone?: SimTone }) {
  const t = TONE_MAP[tone];
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: t.bg, border: `1px solid ${t.bd}` }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#3d5570" }}>{label}</p>
      <p className="mt-1 text-base font-bold tabular-nums" style={{ color: t.v }}>{value}</p>
    </div>
  );
}

function MetricPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wide" style={{ color: "#3d5570" }}>{label}</p>
      <p className="text-[11px] font-bold tabular-nums" style={{ color }}>{value}</p>
    </div>
  );
}
