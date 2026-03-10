import React from "react";

type PanelAccent = "blue" | "emerald" | "amber" | "rose" | "violet" | "none";

interface PanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  accent?: PanelAccent;
  action?: React.ReactNode;
}

const accentColors: Record<PanelAccent, string> = {
  blue:    "#2563eb",
  emerald: "#059669",
  amber:   "#d97706",
  rose:    "#e11d48",
  violet:  "#7c3aed",
  none:    "transparent",
};

export default function Panel({
  title,
  children,
  className = "",
  accent = "none",
  action,
}: PanelProps) {
  const accentColor = accentColors[accent];

  return (
    <div
      className={`panel relative overflow-hidden ${className}`}
      style={
        accent !== "none"
          ? {
              borderTop: `2px solid ${accentColor}`,
              boxShadow: `0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)`,
            }
          : undefined
      }
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && (
            <h2
              className="font-heading text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{ color: "#8fa5b8" }}
            >
              {title}
            </h2>
          )}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
