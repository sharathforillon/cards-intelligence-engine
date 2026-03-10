"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/Panel";

type PortfolioCard = {
  id: number;
  card_name: string;
  segment: string;
  total_enr: number;
  active_cards: number;
  activation_rate: number;
  attrition_rate: number;
  annual_fee: number;
  reward_rate: number;
  fx_markup: number;
  monthly_spend: number;
  avg_credit_limit: number;
  outstanding_balance: number;
  utilization_rate: number;
  revolve_rate: number;
  interchange_income: number;
  interest_income: number;
  reward_cost: number;
  credit_loss: number;
  npl_rate: number;
  delinquency_30dpd: number;
  acquisition_ntb: number;
  acquisition_etb: number;
  cac_cost: number;
  timestamp: string | null;
};

const EMPTY_FORM = {
  card_name: "",
  segment: "salary_bank_customers",
  // Portfolio Volume
  total_enr: 0,
  active_cards: 0,
  activation_rate: 0,
  attrition_rate: 0,
  // Product Design
  annual_fee: 0,
  reward_rate: 0,
  fx_markup: 0,
  // Spend & Credit
  monthly_spend: 0,
  avg_credit_limit: 0,
  outstanding_balance: 0,
  utilization_rate: 0,
  revolve_rate: 0,
  // Revenue
  interchange_income: 0,
  interest_income: 0,
  // Costs & Risk
  reward_cost: 0,
  credit_loss: 0,
  npl_rate: 0,
  delinquency_30dpd: 0,
  // Acquisition
  acquisition_ntb: 0,
  acquisition_etb: 0,
  cac_cost: 0,
};

export default function MashreqPortfolioPage() {
  const [records, setRecords] = useState<PortfolioCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  async function loadPortfolio() {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/portfolio/cards");
      const data = await res.json();
      setRecords(data);
    } catch (e) {
      console.error("Failed to load Mashreq portfolio", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPortfolio();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("http://localhost:8000/portfolio/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      setForm({ ...EMPTY_FORM });
      await loadPortfolio();
    } catch (err) {
      console.error("Failed to update portfolio", err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await fetch(`http://localhost:8000/portfolio/cards/${id}`, {
        method: "DELETE",
      });
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete card", err);
    } finally {
      setDeletingId(null);
    }
  }

  // Aggregate stats
  const totalEnr = records.reduce((s, r) => s + r.total_enr, 0);
  const totalActive = records.reduce((s, r) => s + r.active_cards, 0);
  const totalSpend = records.reduce((s, r) => s + r.monthly_spend, 0);
  const totalBalance = records.reduce((s, r) => s + r.outstanding_balance, 0);
  const totalNTB = records.reduce((s, r) => s + r.acquisition_ntb, 0);
  const avgNPL =
    records.length > 0
      ? records.reduce((s, r) => s + r.npl_rate, 0) / records.length
      : 0;

  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <div className="flex w-full flex-col gap-6 px-6 py-7 lg:px-10">

        {/* Header */}
        <header className="pb-5" style={{ borderBottom: "1px solid #1a304e" }}>
          <p
            className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: "#3b5470" }}
          >
            Cards Strategy · Portfolio Management
          </p>
          <h1
            className="font-heading text-2xl font-bold tracking-tight"
            style={{ color: "#dce8f7" }}
          >
            Mashreq Portfolio Anchor
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#7898b4" }}>
            Comprehensive card-level intelligence snapshot: volume, spend, credit, revenue, risk and acquisition metrics.
          </p>
        </header>

        {/* KPI Bar */}
        {records.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <KpiTile label="Total ENR" value={totalEnr.toLocaleString("en-US")} color="#60a5fa" />
            <KpiTile label="Active Cards" value={totalActive.toLocaleString("en-US")} color="#34d399" />
            <KpiTile label="Monthly Spend" value={`AED ${(totalSpend / 1_000_000).toFixed(1)}M`} color="#34d399" />
            <KpiTile label="Outstanding Bal." value={`AED ${(totalBalance / 1_000_000).toFixed(1)}M`} color="#fbbf24" />
            <KpiTile label="NTB Acq." value={totalNTB.toLocaleString("en-US")} color="#a78bfa" />
            <KpiTile label="Avg NPL Rate" value={`${(avgNPL * 100).toFixed(2)}%`} color={avgNPL > 0.05 ? "#fb7185" : "#34d399"} />
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-12">

          {/* ── FORM ────────────────────────────────────────────── */}
          <div className="xl:col-span-5">
            <Panel title="Add monthly portfolio snapshot" accent="blue">
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Card Identity */}
                <Section label="Card Identity">
                  <TextField
                    label="Card name"
                    value={form.card_name}
                    onChange={(v) => setForm((f) => ({ ...f, card_name: v }))}
                    placeholder="Mashreq Cashback, Platinum, etc."
                    required
                  />
                  <SelectField
                    label="Customer segment"
                    value={form.segment}
                    onChange={(v) => setForm((f) => ({ ...f, segment: v }))}
                    options={[
                      { value: "salary_bank_customers", label: "Salary Bank Customers" },
                      { value: "salaried_non_bank", label: "Salaried – Non-Bank" },
                      { value: "self_employed", label: "Self-Employed" },
                      { value: "high_net_worth", label: "High Net Worth" },
                      { value: "expat_premium", label: "Expat Premium" },
                      { value: "mass_market", label: "Mass Market" },
                    ]}
                  />
                </Section>

                {/* Portfolio Volume */}
                <Section label="Portfolio Volume">
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField
                      label="Total ENR"
                      value={form.total_enr}
                      onChange={(v) => setForm((f) => ({ ...f, total_enr: v }))}
                      hint="All open accounts issued"
                    />
                    <NumberField
                      label="Active Cards"
                      value={form.active_cards}
                      onChange={(v) => setForm((f) => ({ ...f, active_cards: v }))}
                      hint="Transacted in last 90d"
                    />
                    <PercentField
                      label="Activation Rate %"
                      value={form.activation_rate}
                      onChange={(v) => setForm((f) => ({ ...f, activation_rate: v }))}
                      hint="Active / ENR"
                    />
                    <PercentField
                      label="Attrition Rate %"
                      value={form.attrition_rate}
                      onChange={(v) => setForm((f) => ({ ...f, attrition_rate: v }))}
                      hint="Annual churn"
                    />
                  </div>
                </Section>

                {/* Product Design */}
                <Section label="Product Design">
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField
                      label="Annual Fee (AED)"
                      value={form.annual_fee}
                      onChange={(v) => setForm((f) => ({ ...f, annual_fee: v }))}
                    />
                    <PercentField
                      label="Reward Rate %"
                      value={form.reward_rate}
                      onChange={(v) => setForm((f) => ({ ...f, reward_rate: v }))}
                      hint="Cashback / miles"
                    />
                    <PercentField
                      label="FX Markup %"
                      value={form.fx_markup}
                      onChange={(v) => setForm((f) => ({ ...f, fx_markup: v }))}
                    />
                  </div>
                </Section>

                {/* Spend & Credit */}
                <Section label="Spend & Credit">
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField
                      label="Monthly Spend (AED)"
                      value={form.monthly_spend}
                      onChange={(v) => setForm((f) => ({ ...f, monthly_spend: v }))}
                    />
                    <NumberField
                      label="Avg Credit Limit (AED)"
                      value={form.avg_credit_limit}
                      onChange={(v) => setForm((f) => ({ ...f, avg_credit_limit: v }))}
                    />
                    <NumberField
                      label="Outstanding Balance (AED)"
                      value={form.outstanding_balance}
                      onChange={(v) => setForm((f) => ({ ...f, outstanding_balance: v }))}
                    />
                    <PercentField
                      label="Utilization %"
                      value={form.utilization_rate}
                      onChange={(v) => setForm((f) => ({ ...f, utilization_rate: v }))}
                    />
                    <PercentField
                      label="Revolve Rate %"
                      value={form.revolve_rate}
                      onChange={(v) => setForm((f) => ({ ...f, revolve_rate: v }))}
                      hint="% of spend that revolves"
                    />
                  </div>
                </Section>

                {/* Revenue */}
                <Section label="Revenue (Monthly AED)">
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField
                      label="Interchange Income"
                      value={form.interchange_income}
                      onChange={(v) => setForm((f) => ({ ...f, interchange_income: v }))}
                    />
                    <NumberField
                      label="Interest Income"
                      value={form.interest_income}
                      onChange={(v) => setForm((f) => ({ ...f, interest_income: v }))}
                    />
                  </div>
                </Section>

                {/* Costs & Risk */}
                <Section label="Costs & Risk">
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField
                      label="Reward Cost (AED)"
                      value={form.reward_cost}
                      onChange={(v) => setForm((f) => ({ ...f, reward_cost: v }))}
                    />
                    <NumberField
                      label="Credit Loss (AED)"
                      value={form.credit_loss}
                      onChange={(v) => setForm((f) => ({ ...f, credit_loss: v }))}
                    />
                    <PercentField
                      label="NPL Rate %"
                      value={form.npl_rate}
                      onChange={(v) => setForm((f) => ({ ...f, npl_rate: v }))}
                      hint="Non-performing loan rate"
                    />
                    <PercentField
                      label="30+ DPD Rate %"
                      value={form.delinquency_30dpd}
                      onChange={(v) => setForm((f) => ({ ...f, delinquency_30dpd: v }))}
                      hint="Delinquency 30 days past due"
                    />
                  </div>
                </Section>

                {/* Acquisition */}
                <Section label="Acquisition">
                  <div className="grid grid-cols-3 gap-2">
                    <NumberField
                      label="NTB Cards"
                      value={form.acquisition_ntb}
                      onChange={(v) => setForm((f) => ({ ...f, acquisition_ntb: v }))}
                      hint="New-to-bank"
                    />
                    <NumberField
                      label="ETB Cards"
                      value={form.acquisition_etb}
                      onChange={(v) => setForm((f) => ({ ...f, acquisition_etb: v }))}
                      hint="Existing-to-bank"
                    />
                    <NumberField
                      label="CAC (AED)"
                      value={form.cac_cost}
                      onChange={(v) => setForm((f) => ({ ...f, cac_cost: v }))}
                      hint="Cost per new card"
                    />
                  </div>
                </Section>

                <button
                  type="submit"
                  className="btn-primary mt-1 w-full justify-center"
                  disabled={submitting}
                >
                  {saved
                    ? "✓ Snapshot saved"
                    : submitting
                      ? "Saving…"
                      : "Save snapshot"}
                </button>
              </form>
            </Panel>
          </div>

          {/* ── TABLE ───────────────────────────────────────────── */}
          <div className="xl:col-span-7">
            <Panel
              title="Portfolio records"
              accent="emerald"
              action={
                <button onClick={loadPortfolio} className="btn-ghost" disabled={loading}>
                  {loading ? "Loading…" : "↺ Refresh"}
                </button>
              }
            >
              <div
                className="overflow-x-auto rounded-xl"
                style={{ border: "1px solid #1a304e" }}
              >
                <table className="data-table" style={{ minWidth: "740px" }}>
                  <thead>
                    <tr>
                      <th>Card</th>
                      <th>Segment</th>
                      <th style={{ textAlign: "right" }}>ENR</th>
                      <th style={{ textAlign: "right" }}>Active</th>
                      <th style={{ textAlign: "right" }}>Spend/card</th>
                      <th style={{ textAlign: "right" }}>Util%</th>
                      <th style={{ textAlign: "right" }}>NPL%</th>
                      <th style={{ textAlign: "right" }}>Reward%</th>
                      <th style={{ textAlign: "center" }}>Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => {
                      const spendPerCard =
                        r.active_cards > 0
                          ? r.monthly_spend / r.active_cards
                          : 0;
                      const isDeleting = deletingId === r.id;
                      return (
                        <tr
                          key={r.id}
                          style={{ opacity: isDeleting ? 0.4 : 1, transition: "opacity 0.2s" }}
                        >
                          <td style={{ color: "#dce8f7", fontWeight: 500 }}>{r.card_name}</td>
                          <td>
                            <span
                              className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                              style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa" }}
                            >
                              {r.segment.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="tabular-nums" style={{ textAlign: "right", color: "#c8d8ec" }}>
                            {r.total_enr.toLocaleString("en-US")}
                          </td>
                          <td className="tabular-nums" style={{ textAlign: "right", color: "#34d399" }}>
                            {r.active_cards.toLocaleString("en-US")}
                          </td>
                          <td className="tabular-nums" style={{ textAlign: "right", color: "#c8d8ec" }}>
                            AED {spendPerCard.toFixed(0)}
                          </td>
                          <td
                            className="tabular-nums"
                            style={{
                              textAlign: "right",
                              color:
                                r.utilization_rate > 0.5
                                  ? "#34d399"
                                  : r.utilization_rate < 0.3
                                    ? "#fb7185"
                                    : "#fbbf24",
                            }}
                          >
                            {(r.utilization_rate * 100).toFixed(1)}%
                          </td>
                          <td
                            className="tabular-nums"
                            style={{
                              textAlign: "right",
                              color: r.npl_rate > 0.05 ? "#fb7185" : "#34d399",
                            }}
                          >
                            {(r.npl_rate * 100).toFixed(2)}%
                          </td>
                          <td className="tabular-nums" style={{ textAlign: "right", color: "#a78bfa" }}>
                            {(r.reward_rate * 100).toFixed(2)}%
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              onClick={() => handleDelete(r.id)}
                              disabled={isDeleting}
                              title="Delete record"
                              style={{
                                background: "rgba(244,63,94,0.1)",
                                border: "1px solid rgba(244,63,94,0.2)",
                                borderRadius: "6px",
                                color: "#fb7185",
                                cursor: isDeleting ? "not-allowed" : "pointer",
                                fontSize: "12px",
                                lineHeight: 1,
                                padding: "3px 7px",
                                transition: "background 0.15s",
                              }}
                              onMouseEnter={(e) =>
                                ((e.target as HTMLElement).style.background =
                                  "rgba(244,63,94,0.22)")
                              }
                              onMouseLeave={(e) =>
                                ((e.target as HTMLElement).style.background =
                                  "rgba(244,63,94,0.1)")
                              }
                            >
                              {isDeleting ? "…" : "✕"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {records.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="py-10 text-center text-xs"
                          style={{ color: "#3b5470" }}
                        >
                          {loading
                            ? "Loading portfolio…"
                            : "No portfolio records yet. Add your first card above."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Detail cards for each record */}
              {records.length > 0 && (
                <div className="mt-4 space-y-3">
                  {records.map((r) => (
                    <DetailCard key={r.id} r={r} />
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function KpiTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-xl px-3 py-2.5"
      style={{
        background: `${color}11`,
        border: `1px solid ${color}28`,
      }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-[0.14em]"
        style={{ color: "#3b5470" }}
      >
        {label}
      </p>
      <p
        className="mt-1 text-base font-bold tabular-nums leading-tight"
        style={{ color }}
      >
        {value}
      </p>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{ color: "#2563eb", borderBottom: "1px solid #1a304e", paddingBottom: "4px" }}
      >
        {label}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span
        className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em]"
        style={{ color: "#3b5470" }}
      >
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="input-dark"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span
        className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em]"
        style={{ color: "#3b5470" }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-dark"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span
        className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em]"
        style={{ color: "#3b5470" }}
      >
        {label}
        {hint && (
          <span className="ml-1 normal-case tracking-normal" style={{ color: "#2d4a6a" }}>
            ({hint})
          </span>
        )}
      </span>
      <input
        type="number"
        min={0}
        value={Number.isNaN(value) ? "" : value}
        onChange={(e) => onChange(Number(e.target.value || 0))}
        className="input-dark"
      />
    </label>
  );
}

// Percent field: stores as fraction (0–1) internally, displays as 0–100
function PercentField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span
        className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em]"
        style={{ color: "#3b5470" }}
      >
        {label}
        {hint && (
          <span className="ml-1 normal-case tracking-normal" style={{ color: "#2d4a6a" }}>
            ({hint})
          </span>
        )}
      </span>
      <input
        type="number"
        min={0}
        max={100}
        step={0.01}
        value={Number.isNaN(value) ? "" : parseFloat((value * 100).toFixed(4))}
        onChange={(e) => onChange(Number(e.target.value || 0) / 100)}
        className="input-dark"
      />
    </label>
  );
}

function DetailCard({ r }: { r: PortfolioCard }) {
  const netRevenue =
    r.interchange_income + r.interest_income - r.reward_cost - r.credit_loss;
  const activationPct = r.total_enr > 0 ? (r.active_cards / r.total_enr) * 100 : 0;

  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{ background: "rgba(10,21,37,0.6)", border: "1px solid #1a304e" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold" style={{ color: "#dce8f7" }}>
          {r.card_name}
        </p>
        <p className="text-[10px]" style={{ color: "#3b5470" }}>
          {r.timestamp ? new Date(r.timestamp).toLocaleDateString("en-AE", { month: "short", year: "numeric" }) : "—"}
        </p>
      </div>
      <div className="grid grid-cols-4 gap-x-4 gap-y-1 text-[10px]">
        <Stat label="ENR" value={r.total_enr.toLocaleString("en-US")} />
        <Stat label="Active" value={r.active_cards.toLocaleString("en-US")} color="#34d399" />
        <Stat label="Activation" value={`${activationPct.toFixed(1)}%`} />
        <Stat label="Attrition" value={`${(r.attrition_rate * 100).toFixed(1)}%`} color={r.attrition_rate > 0.1 ? "#fb7185" : "#fbbf24"} />
        <Stat label="Avg Limit" value={`AED ${r.avg_credit_limit.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} />
        <Stat label="Balance" value={`AED ${(r.outstanding_balance / 1000).toFixed(0)}K`} />
        <Stat label="Util" value={`${(r.utilization_rate * 100).toFixed(1)}%`} />
        <Stat label="Revolve" value={`${(r.revolve_rate * 100).toFixed(1)}%`} />
        <Stat label="Interchange" value={`AED ${(r.interchange_income / 1000).toFixed(0)}K`} color="#60a5fa" />
        <Stat label="Interest" value={`AED ${(r.interest_income / 1000).toFixed(0)}K`} color="#60a5fa" />
        <Stat label="Reward Cost" value={`AED ${(r.reward_cost / 1000).toFixed(0)}K`} color="#fb7185" />
        <Stat
          label="Net Rev."
          value={`AED ${(netRevenue / 1000).toFixed(0)}K`}
          color={netRevenue >= 0 ? "#34d399" : "#fb7185"}
        />
        <Stat label="NPL" value={`${(r.npl_rate * 100).toFixed(2)}%`} color={r.npl_rate > 0.05 ? "#fb7185" : "#34d399"} />
        <Stat label="30DPD" value={`${(r.delinquency_30dpd * 100).toFixed(2)}%`} color={r.delinquency_30dpd > 0.08 ? "#fb7185" : "#fbbf24"} />
        <Stat label="NTB" value={r.acquisition_ntb.toLocaleString("en-US")} color="#a78bfa" />
        <Stat label="CAC" value={`AED ${r.cac_cost.toFixed(0)}`} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color = "#7898b4",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <p style={{ color: "#3b5470" }}>{label}</p>
      <p className="font-semibold tabular-nums" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
