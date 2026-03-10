"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import Panel from "./Panel";

type CardRow = {
  bank: string;
  card_name: string;
  category: string;
  annual_fee: number;
  cashback_rate: number | null;
  fx_markup?: number | null;
  min_salary?: number | null;
  key_benefits?: string | null;
};

// Category display config
const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  cashback:  { label: "Cashback",  color: "#059669", bg: "rgba(5,150,105,0.09)"  },
  premium:   { label: "Premium",   color: "#7c3aed", bg: "rgba(124,58,237,0.09)" },
  travel:    { label: "Travel",    color: "#2563eb", bg: "rgba(37,99,235,0.09)"  },
  miles:     { label: "Miles",     color: "#0284c7", bg: "rgba(2,132,199,0.09)"  },
  islamic:   { label: "Islamic",   color: "#d97706", bg: "rgba(217,119,6,0.09)"  },
  lifestyle: { label: "Lifestyle", color: "#e11d48", bg: "rgba(225,29,72,0.09)"  },
  classic:   { label: "Classic",   color: "#4a6480", bg: "rgba(74,100,128,0.09)" },
};

function categoryChip(cat: string) {
  const cfg = CATEGORY_CONFIG[cat?.toLowerCase()] ?? { label: cat ?? "—", color: "#4a6480", bg: "rgba(74,100,128,0.09)" };
  return (
    <span
      className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide whitespace-nowrap"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

const ALL_BANKS = "All Banks";
const ALL_CATS  = "All Categories";

export default function CardIntelligenceTable() {
  const [rawCards, setRawCards] = useState<any[]>([]);
  const [query, setQuery]       = useState("");
  const [bankFilter, setBankFilter]   = useState(ALL_BANKS);
  const [catFilter,  setCatFilter]    = useState(ALL_CATS);
  const [feeFilter,  setFeeFilter]    = useState<"all" | "free" | "paid">("all");
  const [loading, setLoading]   = useState(false);
  const [sorting, setSorting]   = useState<SortingState>([]);

  useEffect(() => {
    async function loadCards() {
      setLoading(true);
      try {
        const res  = await fetch("http://localhost:8000/cards");
        const data = await res.json();
        setRawCards(data);
      } catch (e) {
        console.error("Failed to load cards", e);
      } finally {
        setLoading(false);
      }
    }
    loadCards();
  }, []);

  const cards: CardRow[] = useMemo(
    () =>
      rawCards.map((c) => ({
        bank:         c.bank,
        card_name:    c.card_name,
        category:     c.category ?? "",
        annual_fee:   c.annual_fee,
        cashback_rate:c.cashback_rate,
        fx_markup:    c.fx_markup ?? null,
        min_salary:   c.min_salary ?? null,
        key_benefits: c.reward_summary ?? null,
      })),
    [rawCards]
  );

  // Unique filter options derived from loaded data
  const banks      = useMemo(() => [ALL_BANKS, ...Array.from(new Set(cards.map((c) => c.bank))).sort()], [cards]);
  const categories = useMemo(() => [ALL_CATS,  ...Array.from(new Set(cards.map((c) => c.category).filter(Boolean))).sort()], [cards]);

  const filtered = useMemo(() => {
    let rows = cards;

    if (bankFilter !== ALL_BANKS)
      rows = rows.filter((c) => c.bank === bankFilter);

    if (catFilter !== ALL_CATS)
      rows = rows.filter((c) => c.category === catFilter);

    if (feeFilter === "free")
      rows = rows.filter((c) => !c.annual_fee || c.annual_fee === 0);
    else if (feeFilter === "paid")
      rows = rows.filter((c) => c.annual_fee && c.annual_fee > 0);

    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter(
        (c) =>
          c.bank.toLowerCase().includes(q) ||
          c.card_name.toLowerCase().includes(q) ||
          (c.key_benefits ?? "").toLowerCase().includes(q)
      );
    }

    return rows;
  }, [cards, bankFilter, catFilter, feeFilter, query]);

  const columns = useMemo<ColumnDef<CardRow>[]>(
    () => [
      {
        accessorKey: "bank",
        header: "Bank",
        cell: (info) => (
          <span className="font-semibold" style={{ color: "#1e2d3d" }}>
            {info.getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "card_name",
        header: "Card Name",
        cell: (info) => (
          <span style={{ color: "#2d4a62" }}>{info.getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: (info) => categoryChip(info.getValue<string>()),
      },
      {
        accessorKey: "annual_fee",
        header: "Annual Fee",
        cell: (info) => {
          const v = info.getValue<number>();
          return (
            <span className="tabular-nums" style={{ color: v ? "#2d4a62" : "#059669", fontWeight: v ? 400 : 600 }}>
              {v ? `AED ${v.toFixed(0)}` : "Free"}
            </span>
          );
        },
      },
      {
        accessorKey: "cashback_rate",
        header: "Reward Rate",
        cell: (info) => {
          const v = info.getValue<number | null>();
          return (
            <span className="tabular-nums font-semibold" style={{ color: "#059669" }}>
              {v ? `${(v * 100).toFixed(1)}%` : "—"}
            </span>
          );
        },
      },
      {
        accessorKey: "fx_markup",
        header: "FX Markup",
        cell: (info) => {
          const v = info.getValue<number | null>();
          return (
            <span className="tabular-nums" style={{ color: v === 0 ? "#059669" : "#4a6480", fontWeight: v === 0 ? 600 : 400 }}>
              {v === 0 ? "Free" : v ? `${v.toFixed(2)}%` : "—"}
            </span>
          );
        },
      },
      {
        accessorKey: "min_salary",
        header: "Min Salary",
        cell: (info) => {
          const v = info.getValue<number | null>();
          return (
            <span className="tabular-nums" style={{ color: "#4a6480" }}>
              {v ? `AED ${v.toLocaleString("en-US")}` : "—"}
            </span>
          );
        },
      },
      {
        accessorKey: "key_benefits",
        header: "Key Benefits",
        cell: (info) => (
          <span className="line-clamp-2 text-xs" style={{ color: "#4a6480" }}>
            {info.getValue<string | null>() ?? "—"}
          </span>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Panel title="Market Intelligence · Card Universe">

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">

        {/* Text search */}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search card, bank, or benefits…"
          className="input-dark"
          style={{ minWidth: "200px", maxWidth: "240px" }}
        />

        {/* Bank dropdown */}
        <select
          value={bankFilter}
          onChange={(e) => setBankFilter(e.target.value)}
          className="input-dark"
          style={{ minWidth: "160px" }}
        >
          {banks.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>

        {/* Category dropdown */}
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="input-dark"
          style={{ minWidth: "160px" }}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === ALL_CATS ? c : (CATEGORY_CONFIG[c]?.label ?? c)}
            </option>
          ))}
        </select>

        {/* Fee toggle pills */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #d1dde9" }}>
          {(["all", "free", "paid"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setFeeFilter(opt)}
              className="px-3 py-1.5 text-xs font-semibold capitalize transition-colors"
              style={{
                background: feeFilter === opt ? "#1e2d3d" : "#ffffff",
                color:      feeFilter === opt ? "#ffffff"  : "#4a6480",
                borderRight: opt !== "paid" ? "1px solid #d1dde9" : "none",
              }}
            >
              {opt === "all" ? "All Fees" : opt === "free" ? "No Fee" : "Annual Fee"}
            </button>
          ))}
        </div>

        {/* Clear filters */}
        {(query || bankFilter !== ALL_BANKS || catFilter !== ALL_CATS || feeFilter !== "all") && (
          <button
            onClick={() => { setQuery(""); setBankFilter(ALL_BANKS); setCatFilter(ALL_CATS); setFeeFilter("all"); }}
            className="text-xs font-semibold"
            style={{ color: "#e11d48" }}
          >
            ✕ Clear
          </button>
        )}

        {/* Result count — right-aligned */}
        <p className="ml-auto hidden shrink-0 text-[11px] sm:block" style={{ color: "#8fa5b8" }}>
          {filtered.length} of {cards.length} cards
        </p>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl" style={{ border: "1px solid #d1dde9" }}>
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ cursor: header.column.getCanSort() ? "pointer" : "default", userSelect: "none" }}
                  >
                    <span className="flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === "asc"  && <span style={{ color: "#2563eb" }}>↑</span>}
                      {header.column.getIsSorted() === "desc" && <span style={{ color: "#2563eb" }}>↓</span>}
                      {!header.column.getIsSorted() && header.column.getCanSort() && (
                        <span style={{ color: "#d1dde9" }}>↕</span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}

            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center text-xs" style={{ color: "#8fa5b8" }}>
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
