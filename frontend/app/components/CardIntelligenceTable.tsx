"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  ColumnDef, flexRender, getCoreRowModel,
  getSortedRowModel, SortingState, useReactTable,
} from "@tanstack/react-table";
import Panel from "./Panel";

// ── Types ────────────────────────────────────────────────────────────────────
type CardRow = {
  id: number;
  bank: string; card_name: string; network: string | null;
  category: string; card_tier: string | null; target_segment: string | null;
  is_islamic: boolean; is_cobrand: boolean;
  annual_fee: number | null; annual_fee_waiver_condition: string | null;
  joining_fee: number | null; supplementary_card_fee: number | null;
  late_payment_fee: number | null;
  min_salary: number | null; min_income_annual: number | null;
  nationality_eligibility: string | null; employment_type: string | null;
  reward_type: string | null; cashback_rate: number | null;
  cashback_rate_detail: Record<string, number> | null;
  base_reward_rate: number | null; dining_reward_rate: number | null;
  grocery_reward_rate: number | null; fuel_reward_rate: number | null;
  travel_reward_rate: number | null; online_reward_rate: number | null;
  international_reward_rate: number | null; miles_rate: number | null;
  reward_cap_monthly: number | null; reward_cap_annual: number | null;
  reward_expiry_months: number | null; reward_currency: string | null;
  reward_exclusions: string | null; reward_redemption_rate: number | null;
  welcome_bonus: number | null; welcome_bonus_miles: number | null;
  welcome_bonus_points: number | null; welcome_spend_requirement: number | null;
  welcome_period_days: number | null;
  lounge_access: string | null; lounge_program: string | null;
  lounge_visits_primary: string | null; lounge_visits_guest: number | null;
  lounge_visits_supplementary: string | null; lounge_guest_fee_usd: number | null;
  lounge_spend_condition: string | null;
  travel_insurance: string | null; airport_transfer: string | null;
  airport_fast_track: string | null; concierge_service: string | null;
  hotel_status: string | null; global_wifi: string | null;
  golf_rounds_annual: number | null; dining_benefits: string | null;
  cinema_benefits: string | null; fitness_benefit: string | null;
  spa_benefit: string | null; ride_hailing_benefit: string | null;
  entertainer_access: boolean;
  apple_pay: boolean; google_pay: boolean; samsung_pay: boolean; garmin_pay: boolean;
  fx_markup: number | null; cash_advance_fee_pct: number | null;
  cash_advance_interest: number | null;
  interest_rate_monthly: number | null; balance_transfer_rate: number | null;
  balance_transfer_months: number | null; installment_tenures: string | null;
  purchase_protection_days: number | null; extended_warranty_months: number | null;
  price_protection: boolean; mobile_phone_protection: boolean;
  cobrand_partner: string | null; cobrand_industry: string | null;
  miles_transfer_partners: string[] | null; miles_transfer_ratio: string | null;
  spend_conditions: Record<string, string> | null;
  reward_summary: string | null; last_updated: string | null;
};

// ── Display config ────────────────────────────────────────────────────────────
const CAT_CFG: Record<string, { label: string; color: string; bg: string }> = {
  cashback:  { label: "Cashback",  color: "#059669", bg: "rgba(5,150,105,0.09)"  },
  premium:   { label: "Premium",   color: "#7c3aed", bg: "rgba(124,58,237,0.09)" },
  travel:    { label: "Travel",    color: "#2563eb", bg: "rgba(37,99,235,0.09)"  },
  miles:     { label: "Miles",     color: "#0284c7", bg: "rgba(2,132,199,0.09)"  },
  islamic:   { label: "Islamic",   color: "#d97706", bg: "rgba(217,119,6,0.09)"  },
  lifestyle: { label: "Lifestyle", color: "#e11d48", bg: "rgba(225,29,72,0.09)"  },
  rewards:   { label: "Rewards",   color: "#7c3aed", bg: "rgba(124,58,237,0.09)" },
  classic:   { label: "Classic",   color: "#4a6480", bg: "rgba(74,100,128,0.09)" },
};
const TIER_COLOR: Record<string, string> = {
  "Classic": "#4a6480", "Gold": "#d97706", "Platinum": "#6b7280",
  "Signature": "#2563eb", "Infinite": "#7c3aed", "World Elite": "#0f172a",
};

function chip(label: string, color: string, bg: string) {
  return (
    <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap"
      style={{ color, background: bg }}>{label}</span>
  );
}
function catChip(cat: string) {
  const c = CAT_CFG[cat?.toLowerCase()] ?? { label: cat ?? "—", color: "#4a6480", bg: "rgba(74,100,128,0.09)" };
  return chip(c.label, c.color, c.bg);
}
function fmtPct(v: number | null, d = 1) { return v != null ? `${(v * 100).toFixed(d)}%` : "—"; }
function fmtAED(v: number | null) {
  return v != null ? `AED ${v.toLocaleString("en-AE", { minimumFractionDigits: 0 })}` : null;
}

// ── Rate mini bars ────────────────────────────────────────────────────────────
function RateGrid({ card }: { card: CardRow }) {
  const rates = [
    { label: "Base",   val: card.base_reward_rate },
    { label: "Dining", val: card.dining_reward_rate },
    { label: "Grocery",val: card.grocery_reward_rate },
    { label: "Travel", val: card.travel_reward_rate },
    { label: "Online", val: card.online_reward_rate },
    { label: "Fuel",   val: card.fuel_reward_rate },
    { label: "Intl",   val: card.international_reward_rate },
  ].filter(r => r.val != null && r.val > 0);

  if (!rates.length) return <span style={{ color: "#94a3b8", fontSize: 11 }}>—</span>;
  const max = Math.max(...rates.map(r => r.val!));
  return (
    <div className="space-y-1 min-w-[120px]">
      {rates.map(r => (
        <div key={r.label} className="flex items-center gap-1.5">
          <span className="w-10 text-[9px] font-semibold shrink-0" style={{ color: "#4a6480" }}>{r.label}</span>
          <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(37,99,235,0.10)" }}>
            <div className="h-1.5 rounded-full" style={{
              width: `${(r.val! / max) * 100}%`,
              background: r.val! >= 0.05 ? "#059669" : r.val! >= 0.02 ? "#2563eb" : "#94a3b8",
            }} />
          </div>
          <span className="w-7 text-right text-[10px] font-bold tabular-nums shrink-0"
            style={{ color: r.val! >= 0.05 ? "#059669" : "#2d4a62" }}>
            {fmtPct(r.val)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Lounge badge ──────────────────────────────────────────────────────────────
function LoungeBadge({ card }: { card: CardRow }) {
  if (!card.lounge_access || card.lounge_access === "None")
    return <span style={{ color: "#94a3b8", fontSize: 11 }}>None</span>;
  const unlimited = card.lounge_access.toLowerCase().includes("unlimited");
  return (
    <div>
      <span className="text-[11px] font-bold" style={{ color: unlimited ? "#7c3aed" : "#2563eb" }}>
        {unlimited ? "∞ Unlimited" : card.lounge_access}
      </span>
      {card.lounge_program && <div className="text-[9px] mt-0.5" style={{ color: "#4a6480" }}>{card.lounge_program}</div>}
      {card.lounge_visits_guest != null && <div className="text-[9px]" style={{ color: "#4a6480" }}>+{card.lounge_visits_guest} guests</div>}
    </div>
  );
}

// ── Detail drawer ─────────────────────────────────────────────────────────────
function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#4a6480" }}>{title}</div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
    </div>
  );
}
function F({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value == null || value === "" || value === false) return null;
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wide font-semibold mb-0.5" style={{ color: "#8fa5b8" }}>{label}</div>
      <div className="text-[12px] font-semibold" style={{ color: "#1e2d3d" }}>{value}</div>
    </div>
  );
}

function CardDetailDrawer({ card, onClose }: { card: CardRow; onClose: () => void }) {
  const tierColor = TIER_COLOR[card.card_tier ?? ""] ?? "#4a6480";
  const wallets = [card.apple_pay && "Apple Pay", card.google_pay && "Google Pay",
    card.samsung_pay && "Samsung Pay", card.garmin_pay && "Garmin Pay"].filter(Boolean).join(" · ");

  return (
    <tr>
      <td colSpan={8} style={{ padding: 0, background: "#f8fafc", borderBottom: "2px solid #e2eaf2" }}>
        <div className="p-5 space-y-5">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-base font-bold" style={{ color: "#1e2d3d" }}>{card.bank}</span>
                <span style={{ color: "#8fa5b8" }}>·</span>
                <span className="text-base font-bold" style={{ color: "#2d4a62" }}>{card.card_name}</span>
                {card.card_tier && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ background: tierColor + "18", color: tierColor, border: `1px solid ${tierColor}33` }}>
                    {card.card_tier}
                  </span>
                )}
                {card.is_islamic && chip("Islamic", "#d97706", "rgba(217,119,6,0.09)")}
                {card.is_cobrand && chip("Co-brand", "#0284c7", "rgba(2,132,199,0.09)")}
              </div>
              {card.reward_summary && <p className="text-sm italic" style={{ color: "#4a6480" }}>{card.reward_summary}</p>}
            </div>
            <button onClick={onClose}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{ background: "#e2eaf2", color: "#4a6480" }}>
              ✕ Close
            </button>
          </div>

          {/* Earn rates visual */}
          <div className="rounded-xl p-4" style={{ background: "#fff", border: "1px solid #e2eaf2" }}>
            <div className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#4a6480" }}>
              Earn Rates by Category
            </div>
            <RateGrid card={card} />
            <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
              {card.reward_cap_monthly && <span style={{ color: "#e11d48" }}>⚡ Cap: {fmtAED(card.reward_cap_monthly)}/mo</span>}
              {card.reward_expiry_months === 0 && <span style={{ color: "#059669" }}>✓ Points never expire</span>}
              {(card.reward_expiry_months ?? 0) > 0 && <span style={{ color: "#d97706" }}>⏱ Expires in {card.reward_expiry_months}mo</span>}
              {card.reward_exclusions && <span style={{ color: "#94a3b8" }}>Excl: {card.reward_exclusions}</span>}
              {card.reward_currency && card.reward_currency !== "AED" && <span style={{ color: "#4a6480" }}>Currency: {card.reward_currency}</span>}
            </div>
          </div>

          <Sec title="Fees">
            <F label="Annual Fee" value={card.annual_fee === 0 ? "Free forever" : fmtAED(card.annual_fee)} />
            <F label="Fee Waiver Condition" value={card.annual_fee_waiver_condition} />
            <F label="Joining Fee" value={card.joining_fee === 0 ? "None" : fmtAED(card.joining_fee)} />
            <F label="Supplementary Card" value={card.supplementary_card_fee === 0 ? "Free" : fmtAED(card.supplementary_card_fee)} />
            <F label="Late Payment" value={fmtAED(card.late_payment_fee)} />
          </Sec>

          <Sec title="Eligibility">
            <F label="Min Monthly Salary" value={fmtAED(card.min_salary)} />
            <F label="Min Annual Income" value={fmtAED(card.min_income_annual)} />
            <F label="Nationality" value={card.nationality_eligibility} />
            <F label="Employment Type" value={card.employment_type} />
            <F label="Target Segment" value={card.target_segment} />
          </Sec>

          <Sec title="Welcome Offer">
            <F label="Bonus Value" value={
              card.welcome_bonus_miles ? `${card.welcome_bonus_miles.toLocaleString()} miles` :
              card.welcome_bonus_points ? `${card.welcome_bonus_points.toLocaleString()} points` :
              fmtAED(card.welcome_bonus)
            } />
            <F label="Spend to Unlock" value={fmtAED(card.welcome_spend_requirement)} />
            <F label="Window" value={card.welcome_period_days ? `${card.welcome_period_days} days` : undefined} />
          </Sec>

          <Sec title="Airport Lounge">
            <F label="Access Level" value={card.lounge_access} />
            <F label="Program" value={card.lounge_program} />
            <F label="Primary Visits" value={card.lounge_visits_primary} />
            <F label="Guest Visits" value={card.lounge_visits_guest != null ? `${card.lounge_visits_guest} free/year` : undefined} />
            <F label="Guest Fee After Limit" value={card.lounge_guest_fee_usd ? `USD ${card.lounge_guest_fee_usd}` : undefined} />
            <F label="Spend Condition" value={card.lounge_spend_condition} />
          </Sec>

          <Sec title="Travel Benefits">
            <F label="Travel Insurance" value={card.travel_insurance} />
            <F label="Airport Transfer" value={card.airport_transfer} />
            <F label="Fast Track" value={card.airport_fast_track} />
            <F label="Concierge" value={card.concierge_service} />
            <F label="Hotel Status" value={card.hotel_status} />
            <F label="Global Wi-Fi" value={card.global_wifi} />
          </Sec>

          <Sec title="Lifestyle & Entertainment">
            <F label="Golf Rounds" value={card.golf_rounds_annual ? `${card.golf_rounds_annual} rounds/year` : undefined} />
            <F label="Dining" value={card.dining_benefits} />
            <F label="Cinema" value={card.cinema_benefits} />
            <F label="Fitness" value={card.fitness_benefit} />
            <F label="Spa" value={card.spa_benefit} />
            <F label="Ride Hailing" value={card.ride_hailing_benefit} />
            <F label="Entertainer" value={card.entertainer_access ? "✓ Included" : undefined} />
          </Sec>

          <Sec title="Forex & Financing">
            <F label="FX Markup" value={card.fx_markup === 0 ? "0% — No FX Fee" : card.fx_markup != null ? `${card.fx_markup}%` : undefined} />
            <F label="Cash Advance Fee" value={card.cash_advance_fee_pct ? `${card.cash_advance_fee_pct}% of amount` : undefined} />
            <F label="Monthly Interest Rate" value={card.interest_rate_monthly ? `${card.interest_rate_monthly}%/month` : undefined} />
            <F label="Balance Transfer" value={
              card.balance_transfer_rate === 0 && card.balance_transfer_months
                ? `0% for ${card.balance_transfer_months} months`
                : card.balance_transfer_rate != null ? `${card.balance_transfer_rate}%` : undefined
            } />
            <F label="Instalment Tenures" value={card.installment_tenures} />
          </Sec>

          <Sec title="Purchase Protection">
            <F label="Purchase Protection" value={card.purchase_protection_days ? `${card.purchase_protection_days} days` : undefined} />
            <F label="Extended Warranty" value={card.extended_warranty_months ? `+${card.extended_warranty_months} months` : undefined} />
            <F label="Price Protection" value={card.price_protection ? "✓ Yes" : undefined} />
            <F label="Phone Protection" value={card.mobile_phone_protection ? "✓ Yes" : undefined} />
          </Sec>

          {(card.cobrand_partner || (card.miles_transfer_partners?.length ?? 0) > 0) && (
            <Sec title="Co-brand & Miles Transfer">
              <F label="Co-brand Partner" value={card.cobrand_partner} />
              <F label="Industry" value={card.cobrand_industry} />
              <F label="Miles Transfer Partners" value={card.miles_transfer_partners?.join(", ")} />
              <F label="Transfer Ratio" value={card.miles_transfer_ratio} />
            </Sec>
          )}

          {card.spend_conditions && Object.keys(card.spend_conditions).length > 0 && (
            <div className="rounded-xl p-3" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.20)" }}>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#d97706" }}>
                ⚠ Hidden Spend Conditions
              </div>
              {Object.entries(card.spend_conditions).map(([k, v]) => (
                <div key={k} className="flex gap-2 text-[11px] mb-1">
                  <span className="font-semibold capitalize shrink-0" style={{ color: "#92400e", minWidth: 80 }}>{k}</span>
                  <span style={{ color: "#4a6480" }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-1 border-t" style={{ borderColor: "#e2eaf2" }}>
            {wallets && (
              <div className="text-[11px]" style={{ color: "#4a6480" }}>
                <span className="font-semibold" style={{ color: "#1e2d3d" }}>Digital Wallets: </span>{wallets}
              </div>
            )}
            {card.last_updated && (
              <div className="ml-auto text-[10px]" style={{ color: "#94a3b8" }}>
                Data updated: {new Date(card.last_updated).toLocaleDateString("en-AE", { day: "numeric", month: "short", year: "numeric" })}
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
const ALL_BANKS = "All Banks";
const ALL_CATS  = "All Categories";
const ALL_TIERS = "All Tiers";

export default function CardIntelligenceTable() {
  const [rawCards, setRawCards]           = useState<any[]>([]);
  const [query, setQuery]                 = useState("");
  const [bankFilter, setBankFilter]       = useState(ALL_BANKS);
  const [catFilter, setCatFilter]         = useState(ALL_CATS);
  const [tierFilter, setTierFilter]       = useState(ALL_TIERS);
  const [feeFilter, setFeeFilter]         = useState<"all"|"free"|"paid">("all");
  const [loungeFilter, setLoungeFilter]   = useState(false);
  const [islamicFilter, setIslamicFilter] = useState(false);
  const [cobrandFilter, setCobrandFilter] = useState(false);
  const [loading, setLoading]             = useState(false);
  const [sorting, setSorting]             = useState<SortingState>([]);
  const [expanded, setExpanded]           = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("http://localhost:8000/cards")
      .then(r => r.json()).then(setRawCards).catch(console.error).finally(() => setLoading(false));
  }, []);

  const cards: CardRow[] = useMemo(() => rawCards.map((c: any) => ({ ...c, category: c.category ?? "" })), [rawCards]);
  const banks = useMemo(() => [ALL_BANKS, ...Array.from(new Set(cards.map(c => c.bank))).sort()], [cards]);
  const cats  = useMemo(() => [ALL_CATS,  ...Array.from(new Set(cards.map(c => c.category).filter(Boolean))).sort()], [cards]);
  const tiers = useMemo(() => [ALL_TIERS, ...Array.from(new Set(cards.map(c => c.card_tier).filter(Boolean))).sort()], [cards]);

  const filtered = useMemo(() => {
    let rows = cards;
    if (bankFilter !== ALL_BANKS) rows = rows.filter(c => c.bank === bankFilter);
    if (catFilter  !== ALL_CATS)  rows = rows.filter(c => c.category === catFilter);
    if (tierFilter !== ALL_TIERS) rows = rows.filter(c => c.card_tier === tierFilter);
    if (feeFilter === "free")     rows = rows.filter(c => !c.annual_fee || c.annual_fee === 0);
    if (feeFilter === "paid")     rows = rows.filter(c => !!c.annual_fee && c.annual_fee > 0);
    if (loungeFilter)             rows = rows.filter(c => c.lounge_access && c.lounge_access !== "None");
    if (islamicFilter)            rows = rows.filter(c => c.is_islamic);
    if (cobrandFilter)            rows = rows.filter(c => c.is_cobrand);
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter(c =>
        c.bank.toLowerCase().includes(q) || c.card_name.toLowerCase().includes(q) ||
        (c.reward_summary ?? "").toLowerCase().includes(q) ||
        (c.cobrand_partner ?? "").toLowerCase().includes(q)
      );
    }
    return rows;
  }, [cards, bankFilter, catFilter, tierFilter, feeFilter, loungeFilter, islamicFilter, cobrandFilter, query]);

  const columns = useMemo<ColumnDef<CardRow>[]>(() => [
    {
      id: "expand", header: "", enableSorting: false,
      cell: ({ row }) => (
        <button onClick={() => setExpanded(p => p === row.original.id ? null : row.original.id)}
          className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] transition-all"
          style={{ background: expanded === row.original.id ? "#1e2d3d" : "rgba(29,45,61,0.07)",
            color: expanded === row.original.id ? "#fff" : "#4a6480" }}>
          {expanded === row.original.id ? "▲" : "▼"}
        </button>
      ),
    },
    {
      accessorKey: "bank", header: "Bank",
      cell: info => <span className="font-bold" style={{ color: "#1e2d3d" }}>{info.getValue<string>()}</span>,
    },
    {
      accessorKey: "card_name", header: "Card",
      cell: info => {
        const r = info.row.original;
        return (
          <div>
            <span className="font-semibold text-sm" style={{ color: "#2d4a62" }}>{info.getValue<string>()}</span>
            <div className="flex gap-1.5 mt-0.5 flex-wrap">
              {r.is_islamic && <span className="text-[9px] font-bold" style={{ color: "#d97706" }}>☪ Islamic</span>}
              {r.is_cobrand && r.cobrand_partner && <span className="text-[9px] font-bold" style={{ color: "#0284c7" }}>⊗ {r.cobrand_partner}</span>}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "card_tier", header: "Tier",
      cell: info => {
        const t = info.getValue<string | null>();
        if (!t) return <span style={{ color: "#94a3b8" }}>—</span>;
        return <span className="text-[11px] font-bold" style={{ color: TIER_COLOR[t] ?? "#4a6480" }}>{t}</span>;
      },
    },
    {
      accessorKey: "category", header: "Category",
      cell: info => catChip(info.getValue<string>()),
    },
    {
      accessorKey: "annual_fee", header: "Annual Fee",
      cell: info => {
        const v = info.getValue<number | null>();
        return <span className="tabular-nums font-semibold" style={{ color: v ? "#2d4a62" : "#059669" }}>
          {v ? `AED ${v.toLocaleString()}` : "Free"}
        </span>;
      },
    },
    {
      id: "earn", header: "Earn Rates", enableSorting: false,
      cell: ({ row }) => <RateGrid card={row.original} />,
    },
    {
      id: "lounge", header: "Lounge", enableSorting: false,
      cell: ({ row }) => <LoungeBadge card={row.original} />,
    },
  ], [expanded]);

  const table = useReactTable({
    data: filtered, columns, state: { sorting }, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
  });

  const hasFilters = query || bankFilter !== ALL_BANKS || catFilter !== ALL_CATS ||
    tierFilter !== ALL_TIERS || feeFilter !== "all" || loungeFilter || islamicFilter || cobrandFilter;

  return (
    <Panel title={`Market Intelligence · Card Universe · ${filtered.length} cards`}>
      {/* Filter bar */}
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search card, bank, partner…" className="input-dark"
            style={{ minWidth: 200, maxWidth: 240 }} />
          <select value={bankFilter} onChange={e => setBankFilter(e.target.value)}
            className="input-dark" style={{ minWidth: 150 }}>
            {banks.map(b => <option key={b}>{b}</option>)}
          </select>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="input-dark" style={{ minWidth: 140 }}>
            {cats.map(c => <option key={c} value={c}>{c === ALL_CATS ? c : (CAT_CFG[c]?.label ?? c)}</option>)}
          </select>
          <select value={tierFilter} onChange={e => setTierFilter(e.target.value)}
            className="input-dark" style={{ minWidth: 130 }}>
            {tiers.map(t => <option key={t}>{t}</option>)}
          </select>
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #d1dde9" }}>
            {(["all","free","paid"] as const).map(opt => (
              <button key={opt} onClick={() => setFeeFilter(opt)}
                className="px-3 py-1.5 text-xs font-semibold capitalize transition-colors"
                style={{ background: feeFilter===opt?"#1e2d3d":"#fff", color: feeFilter===opt?"#fff":"#4a6480",
                  borderRight: opt!=="paid"?"1px solid #d1dde9":"none" }}>
                {opt==="all"?"All Fees":opt==="free"?"No Fee":"Paid"}
              </button>
            ))}
          </div>
          {hasFilters && (
            <button onClick={() => { setQuery(""); setBankFilter(ALL_BANKS); setCatFilter(ALL_CATS);
              setTierFilter(ALL_TIERS); setFeeFilter("all"); setLoungeFilter(false);
              setIslamicFilter(false); setCobrandFilter(false); }}
              className="text-xs font-semibold" style={{ color: "#e11d48" }}>✕ Clear</button>
          )}
          <p className="ml-auto text-[11px] shrink-0 hidden sm:block" style={{ color: "#3d5570" }}>
            {filtered.length} of {cards.length} cards
          </p>
        </div>

        {/* Tag toggle filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {[
            { label: "✈ Lounge", val: loungeFilter, set: setLoungeFilter },
            { label: "☪ Islamic", val: islamicFilter, set: setIslamicFilter },
            { label: "⊗ Co-brand", val: cobrandFilter, set: setCobrandFilter },
          ].map(f => (
            <button key={f.label} onClick={() => f.set(!f.val)}
              className="rounded-full px-3 py-1 text-[11px] font-semibold transition-all"
              style={{ background: f.val?"#1e2d3d":"rgba(29,45,61,0.06)",
                color: f.val?"#fff":"#4a6480", border: "1px solid "+(f.val?"#1e2d3d":"#d1dde9") }}>
              {f.label}
            </button>
          ))}
          <span className="text-[10px] self-center ml-1" style={{ color: "#8fa5b8" }}>
            Click ▼ on any row to expand all 60+ attributes
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl" style={{ border: "1px solid #d1dde9" }}>
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th key={h.id} onClick={h.column.getToggleSortingHandler()}
                    style={{ cursor: h.column.getCanSort()?"pointer":"default", userSelect:"none" }}>
                    <span className="flex items-center gap-1">
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getIsSorted()==="asc"  && <span style={{ color:"#2563eb" }}>↑</span>}
                      {h.column.getIsSorted()==="desc" && <span style={{ color:"#2563eb" }}>↓</span>}
                      {!h.column.getIsSorted() && h.column.getCanSort() && <span style={{ color:"#8fa5b8" }}>↕</span>}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <Fragment key={row.id}>
                <tr style={{
                  background: expanded === row.original.id ? "rgba(37,99,235,0.04)" : undefined,
                  borderLeft: `3px solid ${expanded === row.original.id ? "#2563eb" : "transparent"}`,
                }}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
                {expanded === row.original.id && (
                  <CardDetailDrawer card={row.original} onClose={() => setExpanded(null)} />
                )}
              </Fragment>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-xs" style={{ color: "#3d5570" }}>
                  {loading ? "Scanning market data…" : "No cards match the current filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
