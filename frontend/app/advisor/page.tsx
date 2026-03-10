"use client";

import { useEffect, useRef, useState } from "react";
import Panel from "@/components/Panel";
import SuggestedPrompts from "@/components/SuggestedPrompts";

const API = "http://localhost:8000";

type AIMessage = {
  role: "user" | "ai";
  query?: string;
  recommended_action?: string;
  rationale?: string;
  profit_impact_aed?: number;
  key_risks?: string[];
  competitor_response_likelihood?: number;
  confidence?: number;
  follow_up_questions?: string[];
  error?: string;
};

export default function AdvisorPage() {
  const [prompts, setPrompts] = useState<string[]>([]);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API}/advisor/suggested-prompts`)
      .then((r) => r.json())
      .then(setPrompts)
      .catch(console.error);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(query: string) {
    if (!query.trim()) return;
    setMessages((prev) => [...prev, { role: "user", query }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/advisor/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", ...data }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", error: "Failed to connect to AI advisor. Check backend." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ background: "var(--c-bg)", minHeight: "100vh", padding: "28px 32px" }}>
      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#3d5570" }}>
          Module 8
        </p>
        <h1 className="font-heading mt-1 text-xl font-bold" style={{ color: "#1e2d3d" }}>
          AI Strategy Advisor
        </h1>
        <p className="mt-1 text-xs" style={{ color: "#4a6480" }}>
          Ask any card strategy question — the AI draws on live portfolio, segment, category and competitor data.
        </p>
      </div>

      {/* Suggested prompts */}
      {prompts.length > 0 && (
        <div className="mb-4">
          <Panel title="Suggested Questions">
            <SuggestedPrompts
              prompts={prompts}
              onSelect={(p) => sendMessage(p)}
              disabled={loading}
            />
          </Panel>
        </div>
      )}

      {/* Chat */}
      <Panel title="Strategy Chat" accent="blue">
        {/* Message thread */}
        <div
          className="mb-4 space-y-4 overflow-auto rounded-xl p-3"
          style={{
            minHeight: "320px",
            maxHeight: "520px",
            background: "#f8fafc",
            border: "1px solid #d1dde9",
          }}
        >
          {messages.length === 0 && (
            <div className="flex h-40 items-center justify-center text-xs" style={{ color: "#3d5570" }}>
              Ask a strategy question or click a suggested prompt above.
            </div>
          )}
          {messages.map((msg, i) => {
            if (msg.role === "user") {
              return (
                <div key={i} className="flex justify-end">
                  <div className="chat-user">
                    <p className="text-xs" style={{ color: "#1e2d3d" }}>{msg.query}</p>
                  </div>
                </div>
              );
            }
            // AI response
            if (msg.error) {
              return (
                <div key={i}>
                  <div className="chat-ai">
                    <p className="text-xs" style={{ color: "#e11d48" }}>⚠ {msg.error}</p>
                  </div>
                </div>
              );
            }
            return (
              <div key={i}>
                <div className="chat-ai">
                  {/* Recommended action amber callout */}
                  {msg.recommended_action && (
                    <div
                      className="mb-3 rounded-lg px-3 py-2"
                      style={{
                        background: "rgba(217,119,6,0.08)",
                        border: "1px solid rgba(217,119,6,0.22)",
                      }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "#d97706" }}>
                        Recommended Action
                      </p>
                      <p className="mt-1 text-xs font-semibold" style={{ color: "#1e2d3d" }}>
                        {msg.recommended_action}
                      </p>
                    </div>
                  )}

                  {/* Rationale */}
                  {msg.rationale && (
                    <p className="mb-3 text-xs" style={{ color: "#2d4a62" }}>{msg.rationale}</p>
                  )}

                  {/* Key metrics row */}
                  <div className="mb-3 flex flex-wrap gap-3">
                    {msg.profit_impact_aed !== undefined && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{ background: "rgba(5,150,105,0.08)", color: "#059669" }}
                      >
                        Profit impact: AED {(msg.profit_impact_aed / 1_000_000).toFixed(1)}M/yr
                      </span>
                    )}
                    {msg.competitor_response_likelihood !== undefined && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{
                          background: "rgba(37,99,235,0.08)",
                          color: "#2563eb",
                        }}
                      >
                        Competitor response: {Math.round((msg.competitor_response_likelihood ?? 0) * 100)}%
                      </span>
                    )}
                    {msg.confidence !== undefined && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{ background: "#f8fafc", color: "#4a6480", border: "1px solid #d1dde9" }}
                      >
                        Confidence: {Math.round((msg.confidence ?? 0) * 100)}%
                      </span>
                    )}
                  </div>

                  {/* Competitor likelihood progress bar */}
                  {msg.competitor_response_likelihood !== undefined && (
                    <div className="mb-3">
                      <p className="mb-1 text-[10px] font-semibold" style={{ color: "#3d5570" }}>
                        Competitor Response Likelihood
                      </p>
                      <div className="h-1.5 w-full rounded-full" style={{ background: "#d1dde9" }}>
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${Math.round((msg.competitor_response_likelihood ?? 0) * 100)}%`,
                            background:
                              (msg.competitor_response_likelihood ?? 0) > 0.7
                                ? "#e11d48"
                                : (msg.competitor_response_likelihood ?? 0) > 0.4
                                ? "#d97706"
                                : "#059669",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Key risks */}
                  {msg.key_risks?.length ? (
                    <div className="mb-3">
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "#e11d48" }}>
                        Key Risks
                      </p>
                      <ul className="space-y-1">
                        {msg.key_risks.map((r, j) => (
                          <li key={j} className="flex items-start gap-2 text-xs" style={{ color: "#2d4a62" }}>
                            <span style={{ color: "#e11d48", flexShrink: 0 }}>•</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {/* Follow-up questions */}
                  {msg.follow_up_questions?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {msg.follow_up_questions.map((q, j) => (
                        <button
                          key={j}
                          className="btn-ghost"
                          style={{ fontSize: 11 }}
                          onClick={() => sendMessage(q)}
                          disabled={loading}
                        >
                          ↗ {q}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
          {loading && (
            <div>
              <div className="chat-ai">
                <div className="flex items-center gap-2 text-xs" style={{ color: "#4a6480" }}>
                  <span className="dot-pulse h-1.5 w-1.5 rounded-full" style={{ background: "#2563eb" }} />
                  AI advisor is thinking…
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="flex gap-2">
          <input
            className="input-dark flex-1"
            placeholder="Ask a strategy question…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            disabled={loading}
          />
          <button
            className="btn-primary"
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
          >
            Send
          </button>
        </div>
      </Panel>
    </main>
  );
}
