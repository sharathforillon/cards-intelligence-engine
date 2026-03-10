"""
Executive Report Engine
Generates a comprehensive quarterly board memo by aggregating from all engines.
Calls strategy_ai for an AI-generated narrative section.
"""

import logging
from datetime import date

from backend.models_portfolio import MashreqCardPerformance, BankPortfolioSnapshot
from backend.segment_intelligence_engine import SegmentIntelligenceEngine
from backend.spend_category_engine import SpendCategoryEngine
from backend.acquisition_funnel_engine import AcquisitionFunnelEngine
from backend.strategy_ai import generate_strategy
from backend.competitor_intelligence import CompetitorIntelligence
from backend.profitability_simulator import ProfitabilitySimulator

logger = logging.getLogger("ExecutiveReportEngine")

# Quarter labels for the memo period header
QUARTER_LABELS = {1: "Q1", 2: "Q1", 3: "Q1", 4: "Q2", 5: "Q2", 6: "Q2",
                  7: "Q3", 8: "Q3", 9: "Q3", 10: "Q4", 11: "Q4", 12: "Q4"}


class ExecutiveReportEngine:

    def __init__(self, db, config):
        self.db = db
        self.config = config

    # ── Portfolio aggregates ───────────────────────────────────────────────

    def _portfolio_kpis(self) -> dict:
        records = self.db.query(MashreqCardPerformance).all()
        if not records:
            return {}

        total_active = sum(r.active_cards or 0 for r in records)
        total_enr = sum(r.total_enr or 0 for r in records)
        monthly_spend = sum(r.monthly_spend or 0 for r in records)
        interchange = sum(r.interchange_income or 0 for r in records)
        interest = sum(r.interest_income or 0 for r in records)
        reward_cost = sum(r.reward_cost or 0 for r in records)
        credit_loss = sum(r.credit_loss or 0 for r in records)
        ntb = sum(r.acquisition_ntb or 0 for r in records)
        avg_revolve = sum((r.revolve_rate or 0) for r in records) / max(len(records), 1)
        avg_npl = sum((r.npl_rate or 0) for r in records) / max(len(records), 1)
        avg_cac = sum((r.cac_cost or 0) for r in records) / max(len(records), 1)

        annual_revenue = (interchange + interest) * 12
        annual_cost = (reward_cost + credit_loss) * 12
        net_profit = annual_revenue - annual_cost

        return {
            "total_active_cards": total_active,
            "total_enr": total_enr,
            "activation_rate": round(total_active / max(total_enr, 1) * 100, 1),
            "monthly_spend_aed": round(monthly_spend, 0),
            "annual_spend_aed": round(monthly_spend * 12, 0),
            "annual_revenue_aed": round(annual_revenue, 0),
            "annual_cost_aed": round(annual_cost, 0),
            "net_annual_profit_aed": round(net_profit, 0),
            "avg_revolve_rate": round(avg_revolve * 100, 1),
            "avg_npl_rate": round(avg_npl * 100, 2),
            "monthly_ntb": ntb,
            "blended_cac_aed": round(avg_cac, 0),
            "cards_by_product": [
                {
                    "card_name": r.card_name,
                    "active_cards": r.active_cards or 0,
                    "monthly_spend_aed": round(r.monthly_spend or 0, 0),
                    "reward_rate": round((r.reward_rate or 0) * 100, 2),
                    "annual_fee": r.annual_fee or 0,
                    "revolve_rate": round((r.revolve_rate or 0) * 100, 1),
                    "monthly_profit_aed": round(
                        ((r.interchange_income or 0) + (r.interest_income or 0)
                         - (r.reward_cost or 0) - (r.credit_loss or 0)), 0
                    ),
                }
                for r in sorted(records, key=lambda x: x.active_cards or 0, reverse=True)
            ],
        }

    def _bank_snapshot(self) -> dict:
        record = (
            self.db.query(BankPortfolioSnapshot)
            .order_by(BankPortfolioSnapshot.timestamp.desc())
            .first()
        )
        if not record:
            return {}
        return {
            "period": record.period,
            "market_share": record.market_share,
            "nim": record.nim,
            "cost_income_ratio": record.cost_income_ratio,
            "raroc": record.raroc,
            "roe": record.roe,
            "nps": record.nps,
            "digital_penetration": record.digital_penetration,
        }

    # ── Segment & category highlights ─────────────────────────────────────

    def _top_segments(self, n: int = 3) -> list[dict]:
        try:
            engine = SegmentIntelligenceEngine(self.db, self.config)
            return engine.rank_segments_by_profit()[:n]
        except Exception as e:
            logger.warning(f"Segment ranking failed: {e}")
            return []

    def _underperforming_categories(self) -> list[dict]:
        try:
            engine = SpendCategoryEngine(self.db)
            cats = engine.find_underperforming_categories()
            return cats[:4]
        except Exception as e:
            logger.warning(f"Category engine failed: {e}")
            return []

    # ── Funnel highlights ──────────────────────────────────────────────────

    def _funnel_highlights(self) -> dict:
        try:
            engine = AcquisitionFunnelEngine(self.db, self.config)
            eff = engine.compute_acquisition_efficiency()
            return {
                "payback_months": eff.get("payback_months", 0),
                "blended_cac_aed": eff.get("blended_cac_aed", 0),
                "approval_rate_pct": eff.get("approval_rate_pct", 0),
                "activation_rate_pct": eff.get("activation_rate_pct", 0),
                "efficiency_score": eff.get("efficiency_score", 0),
            }
        except Exception as e:
            logger.warning(f"Funnel engine failed: {e}")
            return {}

    # ── Competitor threats ─────────────────────────────────────────────────

    def _competitor_threats(self, max_events: int = 5) -> list[dict]:
        try:
            intel = CompetitorIntelligence(self.db)
            return intel.latest_events()[:max_events]
        except Exception as e:
            logger.warning(f"Competitor intel failed: {e}")
            return []

    # ── Strategy actions from optimizer ───────────────────────────────────

    def _top_strategy_actions(self, n: int = 3) -> list[dict]:
        """
        Run a lightweight grid of reward / fee combos and return top-N by CLV.
        Uses ProfitabilitySimulator directly to avoid orchestrator overhead.
        """
        try:
            sim = ProfitabilitySimulator(self.db, self.config)
            candidates = []
            for rr in [0.020, 0.025, 0.030, 0.035, 0.040]:
                for fee in [0, 200, 400, 600]:
                    result = sim.simulate_card_clv(
                        reward_rate=rr,
                        annual_fee=fee,
                        monthly_spend=getattr(self.config, "avg_monthly_spend", 3500),
                        revolver_rate=getattr(self.config, "revolve_rate", 0.35),
                        apr=getattr(self.config, "interest_rate", 0.26),
                    )
                    candidates.append({
                        "reward_rate": rr,
                        "annual_fee": fee,
                        "yearly_profit": result.get("yearly_profit", 0),
                        "clv_36m": result.get("clv_36m", 0),
                    })
            candidates.sort(key=lambda x: x["yearly_profit"], reverse=True)
            return candidates[:n]
        except Exception as e:
            logger.warning(f"Strategy actions failed: {e}")
            return []

    # ── 12-month profit projection ─────────────────────────────────────────

    def _profit_projection(self) -> list[dict]:
        """
        Simple 12-month projection: assume 1.5% MoM spend growth, static revolve rate.
        Base from actual portfolio data.
        """
        records = self.db.query(MashreqCardPerformance).all()
        if not records:
            base_monthly_profit = 3_500_000
        else:
            interchange = sum(r.interchange_income or 0 for r in records)
            interest = sum(r.interest_income or 0 for r in records)
            reward_cost = sum(r.reward_cost or 0 for r in records)
            credit_loss = sum(r.credit_loss or 0 for r in records)
            base_monthly_profit = interchange + interest - reward_cost - credit_loss

        months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ]
        projection = []
        current = base_monthly_profit
        for i, month in enumerate(months):
            current *= 1.015  # 1.5% MoM growth
            projection.append({
                "month": month,
                "projected_profit_aed": round(current, 0),
            })
        return projection

    # ── AI narrative ───────────────────────────────────────────────────────

    def _ai_narrative(self, kpis: dict, segments: list, threats: list) -> str:
        """Request a brief AI-generated board narrative from strategy_ai."""
        try:
            active = kpis.get("total_active_cards", 0)
            profit = kpis.get("net_annual_profit_aed", 0)
            top_seg = segments[0]["label"] if segments else "N/A"
            top_threat = threats[0].get("event", "N/A") if threats else "N/A"

            market_data = (
                f"Portfolio: {active:,} active cards, "
                f"AED {profit / 1_000_000:.1f}M net annual profit. "
                f"Top segment: {top_seg}. "
                f"Key competitor move: {top_threat}. "
                f"Provide 3-paragraph executive summary for the board."
            )
            narrative = generate_strategy(market_data, focus_bank="Mashreq")
            return narrative or "AI narrative unavailable — review engine logs."
        except Exception as e:
            logger.warning(f"AI narrative failed: {e}")
            return "AI narrative unavailable — check ANTHROPIC_API_KEY configuration."

    # ── Main public method ─────────────────────────────────────────────────

    def generate_quarterly_memo(self) -> dict:
        """
        Aggregate all engines into a complete quarterly board memo dict.
        """
        today = date.today()
        quarter = QUARTER_LABELS.get(today.month, "Q?")
        period = f"{quarter} {today.year}"

        kpis = self._portfolio_kpis()
        bank_snap = self._bank_snapshot()
        top_segments = self._top_segments()
        underperforming_cats = self._underperforming_categories()
        funnel = self._funnel_highlights()
        competitor_threats = self._competitor_threats()
        strategy_actions = self._top_strategy_actions()
        profit_projection = self._profit_projection()
        ai_narrative = self._ai_narrative(kpis, top_segments, competitor_threats)

        return {
            "period": period,
            "generated_at": today.isoformat(),

            # Section 1: Portfolio KPIs (8 tiles)
            "portfolio_kpis": kpis,

            # Section 2: Bank-level ratios
            "bank_snapshot": bank_snap,

            # Section 3: Segment highlights
            "top_segments": top_segments,

            # Section 4: Category gaps
            "underperforming_categories": underperforming_cats,

            # Section 5: Funnel
            "funnel_highlights": funnel,

            # Section 6: Competitor threats table
            "competitor_threats": competitor_threats,

            # Section 7: Recommended product actions
            "strategy_actions": [
                {
                    "rank": i + 1,
                    "action": (
                        f"Launch {a['reward_rate'] * 100:.1f}% reward card "
                        f"with AED {a['annual_fee']:.0f} annual fee"
                    ),
                    "expected_annual_profit_aed": round(a["yearly_profit"] * 10_000, 0),
                    "clv_36m": round(a["clv_36m"], 2),
                }
                for i, a in enumerate(strategy_actions)
            ],

            # Section 8: 12-month profit projection (for LineChart)
            "profit_projection": profit_projection,

            # Section 9: AI narrative
            "ai_narrative": ai_narrative,
        }
