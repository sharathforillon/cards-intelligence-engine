"use client";

import { useEffect, useState } from "react";

interface CacheBarProps {
  fetchedAt: number | null;
  onRefresh: () => void;
  loading?: boolean;
  className?: string;
}

function ageLabel(fetchedAt: number): string {
  const ms = Date.now() - fetchedAt;
  if (ms < 60_000) return "just now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

/**
 * Shows "Updated X ago · ↺ Refresh" next to any page or panel title.
 * Ticks every 30 s so the label stays accurate without a full re-render.
 */
export default function CacheBar({
  fetchedAt,
  onRefresh,
  loading = false,
  className = "",
}: CacheBarProps) {
  // Force a re-render every 30 s so the "X ago" label stays fresh.
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!fetchedAt) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-[11px]" style={{ color: "#3a5270" }}>
        Updated {ageLabel(fetchedAt)}
      </span>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors"
        style={{
          background: "rgba(29,86,219,0.07)",
          border: "1px solid rgba(29,86,219,0.22)",
          color: loading ? "#9ab3d9" : "#1d56db",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "…" : "↺ Refresh"}
      </button>
    </div>
  );
}
