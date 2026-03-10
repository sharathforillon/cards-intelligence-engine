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
  annual_fee: number;
  cashback_rate: number | null;
  fx_markup?: number | null;
  min_salary?: number | null;
  key_benefits?: string | null;
};

export default function CardIntelligenceTable() {
  const [rawCards, setRawCards] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);

  useEffect(() => {
    async function loadCards() {
      setLoading(true);
      try {
        const res = await fetch("http://localhost:8000/cards");
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
        bank: c.bank,
        card_name: c.card_name,
        annual_fee: c.annual_fee,
        cashback_rate: c.cashback_rate,
        fx_markup: c.fx_markup ?? null,
        min_salary: c.min_salary ?? null,
        key_benefits: c.reward_summary ?? null,
      })),
    [rawCards]
  );

  const filtered = useMemo(() => {
    if (!query) return cards;
    const q = query.toLowerCase();
    return cards.filter(
      (c) =>
        c.bank.toLowerCase().includes(q) ||
        c.card_name.toLowerCase().includes(q) ||
        (c.key_benefits ?? "").toLowerCase().includes(q)
    );
  }, [cards, query]);

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
        accessorKey: "annual_fee",
        header: "Annual Fee",
        cell: (info) => {
          const v = info.getValue<number>();
          return (
            <span className="tabular-nums" style={{ color: "#2d4a62" }}>
              {v ? `AED ${v.toFixed(0)}` : "—"}
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
            <span className="tabular-nums" style={{ color: "#4a6480" }}>
              {v ? `${v.toFixed(2)}%` : "—"}
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
          <span
            className="line-clamp-2 text-xs"
            style={{ color: "#4a6480" }}
          >
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
    <Panel title="Market Intelligence">
      {/* Search + count */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by bank, card, or benefits…"
          className="input-dark max-w-xs"
        />
        <p className="hidden shrink-0 text-[11px] sm:block" style={{ color: "#8fa5b8" }}>
          {filtered.length.toLocaleString("en-US")} cards · UAE market
        </p>
      </div>

      {/* Table */}
      <div
        className="overflow-hidden rounded-xl"
        style={{ border: "1px solid #d1dde9" }}
      >
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{
                      cursor: header.column.getCanSort() ? "pointer" : "default",
                    }}
                  >
                    <span className="flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {header.column.getIsSorted() === "asc" && " ↑"}
                      {header.column.getIsSorted() === "desc" && " ↓"}
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
                <td
                  colSpan={columns.length}
                  className="py-8 text-center text-xs"
                  style={{ color: "#8fa5b8" }}
                >
                  {loading
                    ? "Scanning market data…"
                    : "No cards found for the current filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

