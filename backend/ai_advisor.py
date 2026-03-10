"""
AI Strategy Advisor
Assembles context from all simulation engines and calls Claude to produce
structured strategy recommendations for the Head of Cards.
"""

import json
import logging
import anthropic

from backend.config import ANTHROPIC_API_KEY
from backend.customer_segments import CustomerSegments
from backend.segment_intelligence_engine import SegmentIntelligenceEngine
from backend.spend_category_engine import SpendCategoryEngine
from backend.acquisition_funnel_engine import AcquisitionFunnelEngine
from backend.models_portfolio import MashreqCardPerformance, BankPortfolioSnapshot
from backend.models import CompetitorCard

logger = logging.getLogger("AIAdvisor")

SUGGESTED_PROMPTS = [
    "Which customer segment should we prioritise for acquisition in Q3 and why?",
    "We're losing ground in travel rewards — what card design would recapture premium travellers?",
    "How should we respond if ADCB launches a 5% dining cashback card next month?",
    "What is the optimal reward rate for a mass-market card to maximise net portfolio profit?",
    "Identify our top three cannibalization risks across the existing Mashreq card portfolio.",
    "Design an acquisition campaign to grow Mass Affluent cards by 15% without hurting RAROC.",
]


class AIAdvisor:

    def __init__(self, db, config):
        self.db = db
        self.config = config
        self.client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    # ── Context assembly ───────────────────────────────────────────────────

    def _portfolio_summary(self) -> str:
        """Aggregate key Mashreq portfolio metrics into a compact text block."""
        records = self.db.query(MashreqCardPerformance).all()
        if not records:
            return "No portfolio data available."

        total_active = sum(r.active_cards or 0 for r in records)
        total_monthly_spend = sum(r.monthly_spend or 0 for r in records)
        total_interchange = sum(r.interchange_income or 0 for r in records)
        total_interest = sum(r.interest_income or 0 for r in records)
        total_reward_cost = sum(r.reward_cost or 0 for r in records)
        total_credit_loss = sum(r.credit_loss or 0 for r in records)
        avg_revolve = (
            sum((r.revolve_rate or 0) for r in records) / len(records)
        )

        lines = [
            f"Total active cards: {total_active:,}",
            f"Monthly portfolio spend: AED {total_monthly_spend:,.0f}",
            f"Annual interchange income: AED {total_interchange * 12:,.0f}",
            f"Annual interest income: AED {total_interest * 12:,.0f}",
            f"Annual reward cost: AED {total_reward_cost * 12:,.0f}",
            f"Annual credit losses: AED {total_credit_loss * 12:,.0f}",
            f"Average revolve rate: {avg_revolve * 100:.1f}%",
        ]

        card_lines = [
            f"  • {r.card_name}: {r.active_cards or 0:,} active, "
            f"AED {(r.monthly_spend or 0):,.0f}/mo spend, "
            f"{(r.reward_rate or 0) * 100:.1f}% rewards, "
            f"AED {r.annual_fee or 0:.0f} fee"
            for r in sorted(records, key=lambda x: x.active_cards or 0, reverse=True)
        ]
        return "\n".join(lines) + "\n\nCard-level breakdown:\n" + "\n".join(card_lines)

    def _segment_summary(self) -> str:
        """Top-level segment ranking as a compact text block."""
        try:
            engine = SegmentIntelligenceEngine(self.db, self.config)
            ranked = engine.rank_segments_by_profit()
            lines = [
                f"  {d['rank']}. {d['label']} ({d['tier']}): "
                f"AED {d['profit_per_customer']:.0f}/mo profit, "
                f"{d['churn_rate'] * 100:.0f}% churn, "
                f"{d['cards_issued']:,} cards"
                for d in ranked
            ]
            return "\n".join(lines)
        except Exception as e:
            logger.warning(f"Segment summary failed: {e}")
            return "Segment data unavailable."

    def _category_summary(self) -> str:
        """Spend category opportunity index as a compact text block."""
        try:
            engine = SpendCategoryEngine(self.db)
            metrics = engine.compute_category_metrics()
            lines = [
                f"  • {m['label']}: Mashreq {m['mashreq_rate'] * 100:.1f}% vs "
                f"market leader {m['market_leader_rate'] * 100:.1f}% "
                f"({m['market_leader_bank']}), "
                f"opportunity index {m['opportunity_index']:.2f}"
                + (" ⚠ underperforming" if m['underperforming'] else "")
                for m in metrics
            ]
            return "\n".join(lines)
        except Exception as e:
            logger.warning(f"Category summary failed: {e}")
            return "Category data unavailable."

    def _funnel_summary(self) -> str:
        """Acquisition funnel efficiency metrics as a compact text block."""
        try:
            engine = AcquisitionFunnelEngine(self.db, self.config)
            funnel = engine.compute_funnel_metrics()
            eff = engine.compute_acquisition_efficiency()
            stages = funnel.get("stages", [])
            lines = [
                f"  {s['stage']}: {s['count']:,} ({s['conversion_pct']:.0f}% conv)"
                for s in stages
            ]
            lines.append(
                f"  Blended CAC: AED {funnel.get('blended_cac', 0):,.0f}  "
                f"| Payback: {eff.get('payback_months', 0):.1f} months  "
                f"| Efficiency score: {eff.get('efficiency_score', 0):.2f}"
            )
            return "\n".join(lines)
        except Exception as e:
            logger.warning(f"Funnel summary failed: {e}")
            return "Funnel data unavailable."

    def _competitor_summary(self, max_events: int = 6) -> str:
        """Recent competitor events as a compact text block."""
        try:
            from backend.competitor_intelligence import CompetitorIntelligence
            intel = CompetitorIntelligence(self.db)
            events = intel.latest_events()[:max_events]
            if not events:
                return "No recent competitor events."
            lines = [
                f"  • [{e.get('bank', '?')}] {e.get('event', '')} "
                f"({e.get('impact', 'medium')} impact)"
                for e in events
            ]
            return "\n".join(lines)
        except Exception as e:
            logger.warning(f"Competitor summary failed: {e}")
            return "Competitor data unavailable."

    def _build_context(self) -> str:
        """Assemble ~1,300-token context block from all engines."""
        return f"""=== MASHREQ CARDS STRATEGY CONTEXT ===

--- PORTFOLIO OVERVIEW ---
{self._portfolio_summary()}

--- CUSTOMER SEGMENT RANKING (by profit/customer) ---
{self._segment_summary()}

--- SPEND CATEGORY OPPORTUNITY ANALYSIS ---
{self._category_summary()}

--- ACQUISITION FUNNEL ---
{self._funnel_summary()}

--- RECENT COMPETITOR INTELLIGENCE ---
{self._competitor_summary()}

=== END CONTEXT ==="""

    # ── System prompt ──────────────────────────────────────────────────────

    SYSTEM_PROMPT = (
        "You are a senior credit card product strategist advising the Head of Cards "
        "at Mashreq Bank (UAE). You have access to live portfolio, segment, category, "
        "funnel, and competitor intelligence data. "
        "Always respond in the following strict JSON format (no markdown, no preamble):\n"
        "{\n"
        '  "recommended_action": "<one concrete action sentence>",\n'
        '  "rationale": "<2-3 sentence explanation tied to the data>",\n'
        '  "profit_impact_aed": <integer AED annual impact estimate or 0>,\n'
        '  "key_risks": ["<risk 1>", "<risk 2>", "<risk 3>"],\n'
        '  "competitor_response_likelihood": <float 0.0-1.0>,\n'
        '  "confidence": <float 0.0-1.0>,\n'
        '  "follow_up_questions": ["<question 1>", "<question 2>"]\n'
        "}"
    )

    # ── Public API ─────────────────────────────────────────────────────────

    def get_suggested_prompts(self) -> list[str]:
        """Return 6 curated strategy prompts for the UI."""
        return SUGGESTED_PROMPTS

    def chat(self, query: str) -> dict:
        """
        Process a strategy query with full engine context.
        Returns a structured dict matching the JSON schema in SYSTEM_PROMPT.
        """
        context = self._build_context()
        user_message = f"{context}\n\nQUESTION: {query}"

        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=900,
                temperature=0.2,
                system=self.SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_message}],
            )
            raw = response.content[0].text.strip()

            # Strip potential markdown code fences
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]

            result = json.loads(raw)
            result["query"] = query
            return result

        except json.JSONDecodeError as e:
            logger.error(f"AI advisor JSON parse error: {e}\nRaw: {raw!r}")
            return self._fallback_response(query, raw if "raw" in dir() else "")
        except Exception as e:
            logger.error(f"AI advisor call failed: {e}")
            return self._fallback_response(query, str(e))

    def _fallback_response(self, query: str, error_detail: str = "") -> dict:
        """Return a structured fallback when Claude is unavailable."""
        return {
            "query": query,
            "recommended_action": "Review portfolio data manually — AI response unavailable.",
            "rationale": (
                "The AI advisor could not generate a response at this time. "
                "Please check the Anthropic API key configuration and try again."
            ),
            "profit_impact_aed": 0,
            "key_risks": [
                "AI service unavailable",
                "Manual analysis required",
                error_detail[:80] if error_detail else "Unknown error",
            ],
            "competitor_response_likelihood": 0.5,
            "confidence": 0.0,
            "follow_up_questions": [
                "Is the ANTHROPIC_API_KEY set correctly in the backend config?",
                "Can you retry with a simpler question?",
            ],
        }
