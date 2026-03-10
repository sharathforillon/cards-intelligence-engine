"use client";

interface Props {
  prompts: string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export default function SuggestedPrompts({ prompts, onSelect, disabled }: Props) {
  if (!prompts.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {prompts.map((p, i) => (
        <button
          key={i}
          className="btn-ghost text-left"
          style={{ fontSize: 11, maxWidth: "100%" }}
          onClick={() => onSelect(p)}
          disabled={disabled}
        >
          <span style={{ opacity: 0.6, marginRight: 4 }}>↗</span>
          {p}
        </button>
      ))}
    </div>
  );
}
