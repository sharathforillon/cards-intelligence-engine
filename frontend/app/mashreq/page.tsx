"use client";

import { useEffect, useState, useMemo } from "react";
import Panel from "@/components/Panel";
import PortfolioEconomics from "@/components/PortfolioEconomics";

/* ── Types ──────────────────────────────────────────────────────────────── */

type BankSnapshot = {
  id?: number;
  period: string;
  market_share: number;
  nim: number;
  cost_income_ratio: number;
  rwa: number;
  raroc: number;
  roe: number;
  provision_coverage: number;
  ntb_budget: number;
  revenue_budget: number;
  op_cost: number;
  nps: number;
  avg_bureau_score: number;
  digital_penetration: number;
};

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

type ScrapedCard = {
  card_name: string;
  annual_fee: number;
  cashback_rate: number | null;
  fx_markup: number | null;
};

/* ── Card → Segment mapping ─────────────────────────────────────────────── */
// Maps scraped Mashreq card names to the best-fit customer segment key
const CARD_SEGMENT_MAP: Record<string, string> = {
  "Solitaire":     "affluent_lifestyle",      // AED 1500 fee, lifestyle rewards → Affluent
  "Platinum Plus": "core_professionals",      // AED 400 fee, dining + travel → Mass Affluent
  "Cashback":      "salary_bank_customers",   // No fee, online + grocery → Mass Market
  "noon":          "category_maximizers",     // No fee, noon rewards → Category Maximizers
};

/* ── Default values ─────────────────────────────────────────────────────── */

const EMPTY_BANK: BankSnapshot = {
  period: new Date().toISOString().slice(0, 7), // "YYYY-MM"
  market_share: 0,
  nim: 0,
  cost_income_ratio: 0,
  rwa: 0,
  raroc: 0,
  roe: 0,
  provision_coverage: 0,
  ntb_budget: 0,
  revenue_budget: 0,
  op_cost: 0,
  nps: 0,
  avg_bureau_score: 0,
  digital_penetration: 0,
};

const EMPTY_CARD_FORM = {
  card_name: "",
  segment: "salary_bank_customers",
  total_enr: 0, active_cards: 0, activation_rate: 0, attrition_rate: 0,
  annual_fee: 0, reward_rate: 0, fx_markup: 0,
  monthly_spend: 0, avg_credit_limit: 0, outstanding_balance: 0,
  utilization_rate: 0, revolve_rate: 0,
  interchange_income: 0, interest_income: 0,
  reward_cost: 0, credit_loss: 0, npl_rate: 0, delinquency_30dpd: 0,
  acquisition_ntb: 0, acquisition_etb: 0, cac_cost: 0,
};

/* ════════════════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════════════════ */

export default function MashreqPortfolioPage() {
  /* Card-level state */
  const [records, setRecords] = useState<PortfolioCard[]>([]);
  const [mashreqCards, setMashreqCards] = useState<ScrapedCard[]>([]);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardSubmitting, setCardSubmitting] = useState(false);
  const [cardSaved, setCardSaved] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [cardForm, setCardForm] = useState({ ...EMPTY_CARD_FORM });

  /* Bank-level state */
  const [bankSnap, setBankSnap] = useState<BankSnapshot>({ ...EMPTY_BANK });
  const [bankForm, setBankForm] = useState<BankSnapshot>({ ...EMPTY_BANK });
  const [bankSubmitting, setBankSubmitting] = useState(false);
  const [bankSaved, setBankSaved] = useState(false);

  /* ── Load data ──────────────────────────────────────────────────────────── */
  async function loadPortfolio() {
    setCardLoading(true);
    try {
      const res = await fetch("http://localhost:8000/portfolio/cards");
      setRecords(await res.json());
    } catch (e) { console.error(e); }
    finally { setCardLoading(false); }
  }

  useEffect(() => {
    // Scraped Mashreq cards for dropdown
    fetch("http://localhost:8000/cards")
      .then((r) => r.json())
      .then((d) => setMashreqCards(d.filter((c: any) => c.bank === "Mashreq")))
      .catch(console.error);

    // Latest bank snapshot
    fetch("http://localhost:8000/portfolio/bank")
      .then((r) => r.json())
      .then((d) => { if (d && d.id) { setBankSnap(d); setBankForm(d); } })
      .catch(console.error);

    loadPortfolio();
  }, []);

  /* ── Computed card aggregates ───────────────────────────────────────────── */
  const agg = useMemo(() => {
    const totalEnr     = records.reduce((s, r) => s + r.total_enr, 0);
    const totalActive  = records.reduce((s, r) => s + r.active_cards, 0);
    const totalSpend   = records.reduce((s, r) => s + r.monthly_spend, 0);
    const totalBal     = records.reduce((s, r) => s + r.outstanding_balance, 0);
    const totalNTB     = records.reduce((s, r) => s + r.acquisition_ntb, 0);
    const totalRev     = records.reduce((s, r) => s + r.interchange_income + r.interest_income, 0);
    const totalCost    = records.reduce((s, r) => s + r.reward_cost + r.credit_loss, 0);
    const avgNPL       = records.length ? records.reduce((s, r) => s + r.npl_rate, 0) / records.length : 0;
    const avgAttrition = records.length ? records.reduce((s, r) => s + r.attrition_rate, 0) / records.length : 0;
    return { totalEnr, totalActive, totalSpend, totalBal, totalNTB, totalRev, totalCost, avgNPL, avgAttrition };
  }, [records]);

  /* ── Bank form submit ───────────────────────────────────────────────────── */
  async function handleBankSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBankSubmitting(true);
    try {
      const res = await fetch("http://localhost:8000/portfolio/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bankForm),
      });
      const data = await res.json();
      setBankSnap({ ...bankForm, id: data.id });
      setBankSaved(true);
      setTimeout(() => setBankSaved(false), 2500);
    } catch (e) { console.error(e); }
    finally { setBankSubmitting(false); }
  }

  /* ── Card form submit ───────────────────────────────────────────────────── */
  function handleCardSelect(name: string) {
    const card = mashreqCards.find((c) => c.card_name === name);
    // Auto-select the best-fit segment for this card (falls back to current segment)
    const autoSegment = CARD_SEGMENT_MAP[name] ?? cardForm.segment;
    setCardForm((f) => ({
      ...f,
      card_name: name,
      segment: autoSegment,
      annual_fee: card?.annual_fee ?? f.annual_fee,
      reward_rate: card?.cashback_rate ?? f.reward_rate,
      fx_markup: card?.fx_markup ?? f.fx_markup,
    }));
  }

  async function handleCardSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCardSubmitting(true);
    try {
      await fetch("http://localhost:8000/portfolio/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cardForm),
      });
      setCardSaved(true);
      setTimeout(() => setCardSaved(false), 2500);
      setCardForm({ ...EMPTY_CARD_FORM });
      await loadPortfolio();
    } catch (e) { console.error(e); }
    finally { setCardSubmitting(false); }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await fetch(`http://localhost:8000/portfolio/cards/${id}`, { method: "DELETE" });
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (e) { console.error(e); }
    finally { setDeletingId(null); }
  }

  /* ── Helpers ────────────────────────────────────────────────────────────── */
  function setBF<K extends keyof BankSnapshot>(k: K, v: BankSnapshot[K]) {
    setBankForm((f) => ({ ...f, [k]: v }));
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen" style={{ background: "var(--c-bg)" }}>
      <div className="flex w-full flex-col gap-8 px-6 py-7 lg:px-10">

        {/* ── Page Header ────────────────────────────────────────────────── */}
        <header className="pb-5" style={{ borderBottom: "1px solid #d1dde9" }}>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "#3d5570" }}>
            Cards Strategy · Portfolio Management
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight" style={{ color: "#1e2d3d" }}>
            Mashreq Portfolio Anchor
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: "#4a6480" }}>
            Bank-level scorecard and card-level performance intelligence for the Head of Cards.
          </p>
        </header>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 1 — BANK SCORECARD (Head of Cards view)
        ══════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionDivider label="Bank Scorecard · Head of Cards" />

          <div className="mt-4 grid gap-6 xl:grid-cols-12">

            {/* ── Bank-level input form ────────────────────────────────── */}
            <div className="xl:col-span-5">
              <Panel title="Bank-level metrics input" accent="violet">
                <form onSubmit={handleBankSubmit} className="space-y-6">

                  {/* Period */}
                  <div>
                    <label className="block">
                      <FieldLabel text="Reporting Period" />
                      <input
                        type="month"
                        value={bankForm.period}
                        onChange={(e) => setBF("period", e.target.value)}
                        className="input-dark"
                        style={{ fontSize: "14px" }}
                        required
                      />
                    </label>
                  </div>

                  {/* Market Position */}
                  <BSection label="Market Position">
                    <div className="grid grid-cols-3 gap-3">
                      <PctInput  label="Market Share %"      hint="UAE CC market by spend" value={bankForm.market_share}      onChange={(v) => setBF("market_share", v)} />
                      <PctInput  label="NIM %"               hint="Net interest margin"    value={bankForm.nim}               onChange={(v) => setBF("nim", v)} />
                      <PctInput  label="Cost-to-Income %"                                  value={bankForm.cost_income_ratio} onChange={(v) => setBF("cost_income_ratio", v)} />
                    </div>
                  </BSection>

                  {/* Capital Efficiency */}
                  <BSection label="Capital Efficiency">
                    <div className="grid grid-cols-2 gap-3">
                      <NumInput  label="RWA (AED M)"         hint="Risk-weighted assets"   value={bankForm.rwa}               onChange={(v) => setBF("rwa", v)} />
                      <PctInput  label="RAROC %"             hint="Risk-adj return"        value={bankForm.raroc}             onChange={(v) => setBF("raroc", v)} />
                      <PctInput  label="ROE %"               hint="Return on equity"       value={bankForm.roe}               onChange={(v) => setBF("roe", v)} />
                      <PctInput  label="Provision Coverage %" hint="Loan loss reserves"   value={bankForm.provision_coverage} onChange={(v) => setBF("provision_coverage", v)} />
                    </div>
                  </BSection>

                  {/* Budget & Cost */}
                  <BSection label="Budget & Operational Cost">
                    <div className="grid grid-cols-3 gap-3">
                      <NumInput  label="NTB Budget"          hint="Monthly card target"    value={bankForm.ntb_budget}        onChange={(v) => setBF("ntb_budget", Math.round(v))} />
                      <NumInput  label="Revenue Budget (AED)" hint="Monthly target"        value={bankForm.revenue_budget}    onChange={(v) => setBF("revenue_budget", v)} />
                      <NumInput  label="Op Cost (AED)"       hint="Staff + IT + servicing" value={bankForm.op_cost}           onChange={(v) => setBF("op_cost", v)} />
                    </div>
                  </BSection>

                  {/* Customer Intelligence */}
                  <BSection label="Customer Intelligence">
                    <div className="grid grid-cols-3 gap-3">
                      <NumInput  label="NPS Score"           hint="-100 to +100"           value={bankForm.nps}               onChange={(v) => setBF("nps", v)} />
                      <NumInput  label="Avg Bureau Score"    hint="Portfolio avg"           value={bankForm.avg_bureau_score}  onChange={(v) => setBF("avg_bureau_score", v)} />
                      <PctInput  label="Digital Penetration %" hint="Mobile / app users"   value={bankForm.digital_penetration} onChange={(v) => setBF("digital_penetration", v)} />
                    </div>
                  </BSection>

                  <button
                    type="submit"
                    disabled={bankSubmitting}
                    className="btn-primary mt-1 w-full justify-center"
                    style={{ fontSize: "14px", padding: "10px 20px" }}
                  >
                    {bankSaved ? "✓ Saved" : bankSubmitting ? "Saving…" : "Save bank snapshot"}
                  </button>
                </form>
              </Panel>
            </div>

            {/* ── Bank-level KPI dashboard ─────────────────────────────── */}
            <div className="xl:col-span-7 space-y-4">

              {/* Computed from card records */}
              <Panel title="Portfolio aggregates · computed from card snapshots" accent="emerald">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <BankKpi label="Total ENR"          value={agg.totalEnr.toLocaleString("en-US")}                          color="#2563eb" sub="All open accounts" />
                  <BankKpi label="Active Cards"        value={agg.totalActive.toLocaleString("en-US")}                       color="#059669" sub="Transacted 90d" />
                  <BankKpi label="Monthly Spend"       value={`AED ${fmt(agg.totalSpend)}`}                                  color="#059669" sub="Total card spend" />
                  <BankKpi label="Outstanding Bal."    value={`AED ${fmt(agg.totalBal)}`}                                    color="#d97706" sub="Revolving balance" />
                  <BankKpi label="Gross Revenue"       value={`AED ${fmt(agg.totalRev)}`}                                    color="#2563eb" sub="Interchange + interest" />
                  <BankKpi label="Net Revenue"         value={`AED ${fmt(agg.totalRev - agg.totalCost)}`}                   color={agg.totalRev > agg.totalCost ? "#059669" : "#e11d48"} sub="After rewards + loss" />
                  <BankKpi label="Avg Portfolio NPL"   value={`${(agg.avgNPL * 100).toFixed(2)}%`}                          color={agg.avgNPL > 0.05 ? "#e11d48" : "#059669"} sub="Non-performing" />
                  <BankKpi label="Avg Attrition"       value={`${(agg.avgAttrition * 100).toFixed(1)}%`}                   color={agg.avgAttrition > 0.1 ? "#e11d48" : "#d97706"} sub="Annual churn" />
                </div>
              </Panel>

              {/* Manual bank-level metrics */}
              <Panel title="Bank-level metrics · last saved snapshot" accent="blue">
                {bankSnap.id ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold" style={{ color: "#4a6480" }}>Period: {bankSnap.period}</p>
                    </div>

                    {/* Market Position row */}
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#3d5570" }}>Market Position</p>
                      <div className="grid grid-cols-3 gap-3">
                        <BankKpi label="Market Share"       value={`${bankSnap.market_share.toFixed(2)}%`}        color="#7c3aed" sub="UAE CC market" />
                        <BankKpi label="NIM"                value={`${bankSnap.nim.toFixed(2)}%`}                 color="#2563eb" sub="Net interest margin" />
                        <BankKpi label="Cost-to-Income"     value={`${bankSnap.cost_income_ratio.toFixed(1)}%`}   color={bankSnap.cost_income_ratio > 60 ? "#e11d48" : "#059669"} sub="Efficiency ratio" />
                      </div>
                    </div>

                    {/* Capital row */}
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#3d5570" }}>Capital Efficiency</p>
                      <div className="grid grid-cols-4 gap-3">
                        <BankKpi label="RWA"                value={`AED ${bankSnap.rwa.toLocaleString("en-US")}M`} color="#4a6480" sub="Risk-weighted assets" />
                        <BankKpi label="RAROC"              value={`${bankSnap.raroc.toFixed(1)}%`}                color={bankSnap.raroc >= 18 ? "#059669" : "#e11d48"} sub="Risk-adj return" />
                        <BankKpi label="ROE"                value={`${bankSnap.roe.toFixed(1)}%`}                 color={bankSnap.roe >= 15 ? "#059669" : "#e11d48"} sub="Return on equity" />
                        <BankKpi label="Prov. Coverage"     value={`${bankSnap.provision_coverage.toFixed(1)}%`}  color="#d97706" sub="Loan loss reserves" />
                      </div>
                    </div>

                    {/* Budget row */}
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#3d5570" }}>Budget vs Actual</p>
                      <div className="grid grid-cols-3 gap-3">
                        <BankKpi
                          label="NTB Attainment"
                          value={bankSnap.ntb_budget > 0 ? `${((agg.totalNTB / bankSnap.ntb_budget) * 100).toFixed(0)}%` : "—"}
                          color={agg.totalNTB >= bankSnap.ntb_budget ? "#059669" : "#e11d48"}
                          sub={`${agg.totalNTB.toLocaleString()} / ${bankSnap.ntb_budget.toLocaleString()} target`}
                        />
                        <BankKpi
                          label="Revenue Attainment"
                          value={bankSnap.revenue_budget > 0 ? `${(((agg.totalRev) / bankSnap.revenue_budget) * 100).toFixed(0)}%` : "—"}
                          color={(agg.totalRev) >= bankSnap.revenue_budget ? "#059669" : "#e11d48"}
                          sub={`AED ${fmt(agg.totalRev)} / ${fmt(bankSnap.revenue_budget)}`}
                        />
                        <BankKpi label="Op Cost"            value={`AED ${fmt(bankSnap.op_cost)}`}                color="#4a6480" sub="Monthly operational" />
                      </div>
                    </div>

                    {/* Customer row */}
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#3d5570" }}>Customer Intelligence</p>
                      <div className="grid grid-cols-3 gap-3">
                        <BankKpi label="NPS"                value={bankSnap.nps >= 0 ? `+${bankSnap.nps.toFixed(0)}` : `${bankSnap.nps.toFixed(0)}`} color={bankSnap.nps >= 30 ? "#059669" : bankSnap.nps >= 0 ? "#d97706" : "#e11d48"} sub="Net Promoter Score" />
                        <BankKpi label="Avg Bureau Score"   value={bankSnap.avg_bureau_score.toFixed(0)}           color="#2563eb" sub="Portfolio avg" />
                        <BankKpi label="Digital Penetration" value={`${bankSnap.digital_penetration.toFixed(1)}%`} color="#7c3aed" sub="Mobile / app" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm" style={{ color: "#3d5570" }}>
                    No bank snapshot saved yet. Fill in the form and click "Save bank snapshot".
                  </p>
                )}
              </Panel>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 2 — PORTFOLIO ECONOMICS ENGINE
        ══════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionDivider label="Portfolio Economics Engine · Profit Model" />
          <div className="mt-4">
            <PortfolioEconomics />
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 3 — CARD-LEVEL SNAPSHOTS
        ══════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionDivider label="Card-Level Snapshots · Monthly Performance" />

          {/* Card-level KPI bar */}
          {records.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <KpiTile label="Total ENR"      value={agg.totalEnr.toLocaleString("en-US")}                color="#2563eb" />
              <KpiTile label="Active Cards"   value={agg.totalActive.toLocaleString("en-US")}             color="#059669" />
              <KpiTile label="Monthly Spend"  value={`AED ${fmt(agg.totalSpend)}`}                        color="#059669" />
              <KpiTile label="Outstanding"    value={`AED ${fmt(agg.totalBal)}`}                          color="#d97706" />
              <KpiTile label="NTB Acq."       value={agg.totalNTB.toLocaleString("en-US")}               color="#7c3aed" />
              <KpiTile label="Avg NPL Rate"   value={`${(agg.avgNPL * 100).toFixed(2)}%`}                color={agg.avgNPL > 0.05 ? "#e11d48" : "#059669"} />
            </div>
          )}

          <div className="mt-4 grid gap-6 xl:grid-cols-12">

            {/* Card-level form */}
            <div className="xl:col-span-5">
              <Panel title="Add monthly card snapshot" accent="blue">
                <form onSubmit={handleCardSubmit} className="space-y-6">

                  <BSection label="Card Identity">
                    <div>
                      <label className="block">
                        <FieldLabel text="Card Name" />
                        <select
                          value={cardForm.card_name}
                          onChange={(e) => handleCardSelect(e.target.value)}
                          required
                          className="input-dark"
                        >
                          <option value="">— Select a Mashreq card —</option>
                          {mashreqCards.map((c) => (
                            <option key={c.card_name} value={c.card_name}>
                              {c.card_name}
                              {c.cashback_rate ? ` · ${(c.cashback_rate * 100).toFixed(1)}% cashback` : ""}
                              {c.annual_fee ? ` · AED ${c.annual_fee} fee` : " · No fee"}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <SelectField
                      label="Customer Segment"
                      value={cardForm.segment}
                      onChange={(v) => setCardForm((f) => ({ ...f, segment: v }))}
                      options={[
                        { value: "salary_bank_customers", label: "Mass Market · Salary Bank Customers" },
                        { value: "core_professionals",    label: "Mass Affluent · Core Professionals" },
                        { value: "affluent_lifestyle",    label: "Affluent · Lifestyle Spenders" },
                        { value: "premium_travelers",     label: "Premium · High-Spend Travelers" },
                        { value: "category_maximizers",   label: "Category Maximizers" },
                      ]}
                    />
                  </BSection>

                  <BSection label="Portfolio Volume">
                    <div className="grid grid-cols-2 gap-3">
                      <NumInput label="Total ENR"        hint="All open accounts"  value={cardForm.total_enr}       onChange={(v) => setCardForm((f) => ({ ...f, total_enr: v }))} />
                      <NumInput label="Active Cards"      hint="Transacted 90d"    value={cardForm.active_cards}    onChange={(v) => setCardForm((f) => ({ ...f, active_cards: v }))} />
                      <PctInput label="Activation Rate"  hint="Active / ENR"       value={cardForm.activation_rate} onChange={(v) => setCardForm((f) => ({ ...f, activation_rate: v }))} />
                      <PctInput label="Attrition Rate"   hint="Annual churn"       value={cardForm.attrition_rate}  onChange={(v) => setCardForm((f) => ({ ...f, attrition_rate: v }))} />
                    </div>
                  </BSection>

                  <BSection label="Product Design">
                    <p className="mb-2 text-xs" style={{ color: "#3d5570" }}>Pre-filled from card catalogue. Adjust if needed.</p>
                    <div className="grid grid-cols-3 gap-3">
                      <NumInput label="Annual Fee (AED)"  value={cardForm.annual_fee}  onChange={(v) => setCardForm((f) => ({ ...f, annual_fee: v }))} />
                      <PctInput label="Reward Rate %"     hint="Cashback / miles" value={cardForm.reward_rate} onChange={(v) => setCardForm((f) => ({ ...f, reward_rate: v }))} />
                      <PctInput label="FX Markup %"       value={cardForm.fx_markup}   onChange={(v) => setCardForm((f) => ({ ...f, fx_markup: v }))} />
                    </div>
                  </BSection>

                  <BSection label="Spend & Credit">
                    <div className="grid grid-cols-2 gap-3">
                      <NumInput label="Monthly Spend (AED)"       value={cardForm.monthly_spend}       onChange={(v) => setCardForm((f) => ({ ...f, monthly_spend: v }))} />
                      <NumInput label="Avg Credit Limit (AED)"    value={cardForm.avg_credit_limit}    onChange={(v) => setCardForm((f) => ({ ...f, avg_credit_limit: v }))} />
                      <NumInput label="Outstanding Balance (AED)" value={cardForm.outstanding_balance} onChange={(v) => setCardForm((f) => ({ ...f, outstanding_balance: v }))} />
                      <PctInput label="Utilization %"             value={cardForm.utilization_rate}    onChange={(v) => setCardForm((f) => ({ ...f, utilization_rate: v }))} />
                      <PctInput label="Revolve Rate %"            hint="% spend that revolves" value={cardForm.revolve_rate} onChange={(v) => setCardForm((f) => ({ ...f, revolve_rate: v }))} />
                    </div>
                  </BSection>

                  <BSection label="Revenue (Monthly AED)">
                    <div className="grid grid-cols-2 gap-3">
                      <NumInput label="Interchange Income" value={cardForm.interchange_income} onChange={(v) => setCardForm((f) => ({ ...f, interchange_income: v }))} />
                      <NumInput label="Interest Income"    value={cardForm.interest_income}    onChange={(v) => setCardForm((f) => ({ ...f, interest_income: v }))} />
                    </div>
                  </BSection>

                  <BSection label="Costs & Risk">
                    <div className="grid grid-cols-2 gap-3">
                      <NumInput label="Reward Cost (AED)"  value={cardForm.reward_cost}       onChange={(v) => setCardForm((f) => ({ ...f, reward_cost: v }))} />
                      <NumInput label="Credit Loss (AED)"  value={cardForm.credit_loss}       onChange={(v) => setCardForm((f) => ({ ...f, credit_loss: v }))} />
                      <PctInput label="NPL Rate %"         hint="Non-performing"  value={cardForm.npl_rate}          onChange={(v) => setCardForm((f) => ({ ...f, npl_rate: v }))} />
                      <PctInput label="30+ DPD Rate %"     hint="Days past due"   value={cardForm.delinquency_30dpd} onChange={(v) => setCardForm((f) => ({ ...f, delinquency_30dpd: v }))} />
                    </div>
                  </BSection>

                  <BSection label="Acquisition">
                    <div className="grid grid-cols-3 gap-3">
                      <NumInput label="NTB Cards" hint="New-to-bank"      value={cardForm.acquisition_ntb} onChange={(v) => setCardForm((f) => ({ ...f, acquisition_ntb: v }))} />
                      <NumInput label="ETB Cards" hint="Existing-to-bank" value={cardForm.acquisition_etb} onChange={(v) => setCardForm((f) => ({ ...f, acquisition_etb: v }))} />
                      <NumInput label="CAC (AED)" hint="Cost per card"    value={cardForm.cac_cost}        onChange={(v) => setCardForm((f) => ({ ...f, cac_cost: v }))} />
                    </div>
                  </BSection>

                  <button
                    type="submit"
                    disabled={cardSubmitting}
                    className="btn-primary mt-1 w-full justify-center"
                    style={{ fontSize: "14px", padding: "10px 20px" }}
                  >
                    {cardSaved ? "✓ Snapshot saved" : cardSubmitting ? "Saving…" : "Save card snapshot"}
                  </button>
                </form>
              </Panel>
            </div>

            {/* Card-level table */}
            <div className="xl:col-span-7">
              <Panel
                title="Card performance records"
                accent="emerald"
                action={
                  <button onClick={loadPortfolio} className="btn-ghost" disabled={cardLoading}>
                    {cardLoading ? "Loading…" : "↺ Refresh"}
                  </button>
                }
              >
                <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #d1dde9" }}>
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
                        const spendPerCard = r.active_cards > 0 ? r.monthly_spend / r.active_cards : 0;
                        const isDeleting = deletingId === r.id;
                        return (
                          <tr key={r.id} style={{ opacity: isDeleting ? 0.4 : 1, transition: "opacity 0.2s" }}>
                            <td style={{ color: "#1e2d3d", fontWeight: 600, fontSize: "13px" }}>{r.card_name}</td>
                            <td>
                              <span className="rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
                                style={{ background: "rgba(37,99,235,0.08)", color: "#2563eb" }}>
                                {r.segment.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="tabular-nums" style={{ textAlign: "right", color: "#2d4a62" }}>{r.total_enr.toLocaleString("en-US")}</td>
                            <td className="tabular-nums" style={{ textAlign: "right", color: "#059669", fontWeight: 600 }}>{r.active_cards.toLocaleString("en-US")}</td>
                            <td className="tabular-nums" style={{ textAlign: "right", color: "#2d4a62" }}>AED {spendPerCard.toFixed(0)}</td>
                            <td className="tabular-nums" style={{ textAlign: "right", color: r.utilization_rate > 0.5 ? "#059669" : r.utilization_rate < 0.3 ? "#e11d48" : "#d97706" }}>
                              {(r.utilization_rate * 100).toFixed(1)}%
                            </td>
                            <td className="tabular-nums" style={{ textAlign: "right", color: r.npl_rate > 0.05 ? "#e11d48" : "#059669" }}>
                              {(r.npl_rate * 100).toFixed(2)}%
                            </td>
                            <td className="tabular-nums" style={{ textAlign: "right", color: "#7c3aed", fontWeight: 600 }}>
                              {(r.reward_rate * 100).toFixed(2)}%
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <button onClick={() => handleDelete(r.id)} disabled={isDeleting}
                                style={{ background: "rgba(225,29,72,0.07)", border: "1px solid rgba(225,29,72,0.18)", borderRadius: "6px", color: "#e11d48", cursor: isDeleting ? "not-allowed" : "pointer", fontSize: "12px", padding: "3px 8px" }}>
                                {isDeleting ? "…" : "✕"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {records.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-10 text-center text-sm" style={{ color: "#3d5570" }}>
                            {cardLoading ? "Loading portfolio…" : "No card records yet. Add your first snapshot above."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {records.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {records.map((r) => <DetailCard key={r.id} r={r} />)}
                  </div>
                )}
              </Panel>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/** Format large AED numbers as "1.2M" or "450K" */
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}

/* ── Sub-components ───────────────────────────────────────────────────────── */

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1" style={{ background: "#d1dde9" }} />
      <span className="text-[11px] font-bold uppercase tracking-[0.2em] whitespace-nowrap" style={{ color: "#3d5570" }}>
        {label}
      </span>
      <div className="h-px flex-1" style={{ background: "#d1dde9" }} />
    </div>
  );
}

function BSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em]"
        style={{ color: "#2563eb", borderBottom: "1px solid #d1dde9", paddingBottom: "6px" }}>
        {label}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function FieldLabel({ text }: { text: string }) {
  return (
    <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em]" style={{ color: "#3d5570" }}>
      {text}
    </span>
  );
}

function NumInput({ label, value, onChange, hint }: {
  label: string; value: number; onChange: (v: number) => void; hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em]" style={{ color: "#3d5570" }}>
        {label}{hint && <span className="ml-1 normal-case font-normal tracking-normal" style={{ color: "#b8cce0" }}>({hint})</span>}
      </span>
      <input type="number" min={0} value={Number.isNaN(value) ? "" : value}
        onChange={(e) => onChange(Number(e.target.value || 0))}
        className="input-dark" style={{ fontSize: "14px" }} />
    </label>
  );
}

function PctInput({ label, value, onChange, hint }: {
  label: string; value: number; onChange: (v: number) => void; hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em]" style={{ color: "#3d5570" }}>
        {label}{hint && <span className="ml-1 normal-case font-normal tracking-normal" style={{ color: "#b8cce0" }}>({hint})</span>}
      </span>
      <input type="number" min={0} max={100} step={0.01}
        value={Number.isNaN(value) ? "" : parseFloat((value * 100).toFixed(4))}
        onChange={(e) => onChange(Number(e.target.value || 0) / 100)}
        className="input-dark" style={{ fontSize: "14px" }} />
    </label>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em]" style={{ color: "#3d5570" }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input-dark">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function BankKpi({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="rounded-xl px-3 py-3" style={{ background: `${color}0d`, border: `1px solid ${color}22` }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "#3d5570" }}>{label}</p>
      <p className="mt-1 text-base font-bold tabular-nums leading-tight" style={{ color }}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px]" style={{ color: "#3d5570" }}>{sub}</p>}
    </div>
  );
}

function KpiTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl px-4 py-3" style={{ background: `${color}10`, border: `1px solid ${color}28` }}>
      <p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: "#3d5570" }}>{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums leading-tight" style={{ color }}>{value}</p>
    </div>
  );
}

function DetailCard({ r }: { r: PortfolioCard }) {
  const netRevenue = r.interchange_income + r.interest_income - r.reward_cost - r.credit_loss;
  const activationPct = r.total_enr > 0 ? (r.active_cards / r.total_enr) * 100 : 0;
  return (
    <div className="rounded-xl px-4 py-3" style={{ background: "#f8fafc", border: "1px solid #d1dde9" }}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: "#1e2d3d" }}>{r.card_name}</p>
        <p className="text-xs" style={{ color: "#3d5570" }}>
          {r.timestamp ? new Date(r.timestamp).toLocaleDateString("en-AE", { month: "short", year: "numeric" }) : "—"}
        </p>
      </div>
      <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-xs">
        <Stat label="ENR"         value={r.total_enr.toLocaleString("en-US")} />
        <Stat label="Active"      value={r.active_cards.toLocaleString("en-US")}                      color="#059669" />
        <Stat label="Activation"  value={`${activationPct.toFixed(1)}%`} />
        <Stat label="Attrition"   value={`${(r.attrition_rate * 100).toFixed(1)}%`}                   color={r.attrition_rate > 0.1 ? "#e11d48" : "#d97706"} />
        <Stat label="Avg Limit"   value={`AED ${r.avg_credit_limit.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} />
        <Stat label="Balance"     value={`AED ${fmt(r.outstanding_balance)}`} />
        <Stat label="Util"        value={`${(r.utilization_rate * 100).toFixed(1)}%`} />
        <Stat label="Revolve"     value={`${(r.revolve_rate * 100).toFixed(1)}%`} />
        <Stat label="Interchange" value={`AED ${fmt(r.interchange_income)}`}                          color="#2563eb" />
        <Stat label="Interest"    value={`AED ${fmt(r.interest_income)}`}                             color="#2563eb" />
        <Stat label="Reward Cost" value={`AED ${fmt(r.reward_cost)}`}                                 color="#e11d48" />
        <Stat label="Net Rev."    value={`AED ${fmt(netRevenue)}`}                                    color={netRevenue >= 0 ? "#059669" : "#e11d48"} />
        <Stat label="NPL"         value={`${(r.npl_rate * 100).toFixed(2)}%`}                        color={r.npl_rate > 0.05 ? "#e11d48" : "#059669"} />
        <Stat label="30DPD"       value={`${(r.delinquency_30dpd * 100).toFixed(2)}%`}               color={r.delinquency_30dpd > 0.08 ? "#e11d48" : "#d97706"} />
        <Stat label="NTB"         value={r.acquisition_ntb.toLocaleString("en-US")}                   color="#7c3aed" />
        <Stat label="CAC"         value={`AED ${r.cac_cost.toFixed(0)}`} />
      </div>
    </div>
  );
}

function Stat({ label, value, color = "#4a6480" }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="mb-0.5 text-[10px] uppercase tracking-wide font-semibold" style={{ color: "#3d5570" }}>{label}</p>
      <p className="font-semibold tabular-nums text-xs" style={{ color }}>{value}</p>
    </div>
  );
}
