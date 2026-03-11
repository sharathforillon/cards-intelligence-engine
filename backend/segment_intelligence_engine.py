"""
Segment Intelligence Engine
Computes per-segment profitability, growth opportunities, and churn risk
by delegating to the existing ProfitabilitySimulator and CustomerSegments.
"""

import logging
from backend.customer_segments import CustomerSegments
from backend.profitability_simulator import ProfitabilitySimulator
from backend.models_portfolio import MashreqCardPerformance

logger = logging.getLogger("SegmentIntelligenceEngine")

# ── Display mapping from backend keys to user-facing labels ────────────────
SEGMENT_DISPLAY = {
    "salary_bank_customers": {
        "label": "Mass Market",
        "description": "Salaried customers with primary banking relationship",
        "icon": "👥",
        "tier_color": "#2563eb",
        "cards": ["noon Credit Card"],
    },
    "core_professionals": {
        "label": "Mass Affluent",
        "description": "Mid-career professionals with growing disposable income",
        "icon": "💼",
        "tier_color": "#0891b2",
        "cards": ["Cashback Credit Card"],
    },
    "affluent_lifestyle": {
        "label": "Affluent",
        "description": "High-income lifestyle spenders with category focus",
        "icon": "✨",
        "tier_color": "#7c3aed",
        "cards": ["Platinum Plus Credit Card"],
    },
    "premium_travelers": {
        "label": "Premium / High-Spend Travelers",
        "description": "Ultra-HNI frequent flyers with international spend",
        "icon": "✈️",
        "tier_color": "#d97706",
        "cards": ["Solitaire Credit Card"],
    },
    "category_maximizers": {
        "label": "Category Maximizers",
        "description": "Savvy reward optimisers across spend categories",
        "icon": "🎯",
        "tier_color": "#059669",
        "cards": ["noon Credit Card", "Cashback Credit Card"],
    },
}

# Default avg reward rate assumption for baseline CLV (2.5%)
DEFAULT_REWARD_RATE = 0.025
DEFAULT_ANNUAL_FEE = 300


class SegmentIntelligenceEngine:

    def __init__(self, db, config):
        self.db = db
        self.config = config
        self.segments = CustomerSegments().get_segments()
        self.simulator = ProfitabilitySimulator(db, config)

    # ── Helpers ────────────────────────────────────────────────────────────

    def _actual_monthly_spend_for_segment(self, seg_name: str, fallback: float) -> float:
        """
        Return per-card monthly spend from DB (monthly_spend / active_cards).
        Falls back to the CustomerSegments estimate if DB has no data.
        """
        records = self.db.query(MashreqCardPerformance).filter(
            MashreqCardPerformance.segment == seg_name
        ).all()
        if records:
            total_spend  = sum(r.monthly_spend  or 0 for r in records)
            total_active = sum(r.active_cards   or 1 for r in records)
            return round(total_spend / max(total_active, 1), 2)
        return fallback

    def _clv_for_segment(self, seg, reward_rate=None, annual_fee=None):
        """Run simulate_card_clv with segment-specific parameters."""
        rr = reward_rate if reward_rate is not None else DEFAULT_REWARD_RATE
        af = annual_fee if annual_fee is not None else DEFAULT_ANNUAL_FEE
        # Use per-card monthly spend from DB records (real data) when available
        monthly_spend = self._actual_monthly_spend_for_segment(
            seg["name"], fallback=seg["monthly_spend"]
        )
        return self.simulator.simulate_card_clv(
            reward_rate=rr,
            annual_fee=af,
            monthly_spend=monthly_spend,
            revolver_rate=seg["revolve_rate"],
            apr=getattr(self.config, "interest_rate", 0.26),
        )

    def _cards_for_segment(self, seg_name: str) -> int:
        """
        Try to get actual card count from DB records for this segment.
        Falls back to proportional split of baseline 375,000 active cards.
        """
        records = (
            self.db.query(MashreqCardPerformance)
            .filter(MashreqCardPerformance.segment == seg_name)
            .all()
        )
        if records:
            return sum(r.active_cards or 0 for r in records)
        # Fallback: use portfolio_share × actual total portfolio active cards from DB
        all_records = self.db.query(MashreqCardPerformance).all()
        total_active = sum(r.active_cards or 0 for r in all_records) or 159_500
        seg = next((s for s in self.segments if s["name"] == seg_name), None)
        share = seg["portfolio_share"] if seg else 0.2
        return int(total_active * share)

    # ── Main methods ───────────────────────────────────────────────────────

    def _actual_params_for_segment(self, seg_name: str):
        """Get average reward_rate and annual_fee from real card records for this segment."""
        records = (
            self.db.query(MashreqCardPerformance)
            .filter(MashreqCardPerformance.segment == seg_name)
            .all()
        )
        if records:
            avg_reward = sum(r.reward_rate or DEFAULT_REWARD_RATE for r in records) / len(records)
            avg_fee    = sum(r.annual_fee  or DEFAULT_ANNUAL_FEE  for r in records) / len(records)
            return avg_reward, avg_fee
        return DEFAULT_REWARD_RATE, DEFAULT_ANNUAL_FEE

    def compute_segment_profitability(self):
        """Return enriched per-segment profitability objects."""
        results = []
        for seg in self.segments:
            reward_rate, annual_fee = self._actual_params_for_segment(seg["name"])
            # Use per-card monthly spend from DB when available, fall back to segment benchmark
            actual_monthly_spend = self._actual_monthly_spend_for_segment(
                seg["name"], fallback=seg["monthly_spend"]
            )
            clv_data = self._clv_for_segment(seg, reward_rate=reward_rate, annual_fee=annual_fee)
            cards = self._cards_for_segment(seg["name"])
            annual_reward_cost = (
                actual_monthly_spend * 12 * reward_rate
                * (1 - 0.15)  # 15% breakage
            )
            # Use yearly_profit/12 so annual fee is amortised into monthly figure
            profit_per_customer = round(clv_data["yearly_profit"] / 12, 2)
            ltv = clv_data["clv_36m"]

            display = SEGMENT_DISPLAY.get(seg["name"], {})

            results.append({
                "key": seg["name"],
                "label": display.get("label", seg["name"]),
                "description": display.get("description", ""),
                "icon": display.get("icon", ""),
                "tier_color": display.get("tier_color", "#2563eb"),
                "cards": display.get("cards", []),
                "portfolio_share": seg["portfolio_share"],
                "cards_issued": cards,
                "monthly_spend_per_card": round(actual_monthly_spend),
                "revolve_rate": seg["revolve_rate"],
                "annual_reward_cost": round(annual_reward_cost, 2),
                "churn_rate": seg["annual_churn"],
                "profit_per_customer": round(profit_per_customer, 2),
                "lifetime_value": round(ltv, 2),
                "cac": seg["cac"],
                "payback_months": round(seg["cac"] / max(profit_per_customer, 0.01)),
            })

        return results

    def rank_segments_by_profit(self):
        """Return segments sorted by profit_per_customer with opportunity tier tags."""
        data = self.compute_segment_profitability()
        data.sort(key=lambda x: x["profit_per_customer"], reverse=True)

        profits = [d["profit_per_customer"] for d in data]
        median_profit = sorted(profits)[len(profits) // 2]

        for i, d in enumerate(data):
            d["rank"] = i + 1
            if d["churn_rate"] > 0.25:
                d["tier"] = "At Risk"
                d["tier_badge_color"] = "#e11d48"
            elif d["churn_rate"] > 0.18 and d["profit_per_customer"] < median_profit:
                d["tier"] = "Watch"
                d["tier_badge_color"] = "#d97706"
            elif d["profit_per_customer"] >= median_profit and d["churn_rate"] <= 0.18:
                d["tier"] = "Core"
                d["tier_badge_color"] = "#059669"
            else:
                d["tier"] = "Growth Opportunity"
                d["tier_badge_color"] = "#2563eb"

        return data

    def _actual_monthly_profit_per_card(self, seg_name: str) -> float:
        """
        Compute actual monthly profit per card from DB P&L fields:
        (interchange_income + interest_income - reward_cost - credit_loss) / active_cards.
        Falls back to CLV simulation only when no DB records exist for this segment.
        """
        records = (
            self.db.query(MashreqCardPerformance)
            .filter(MashreqCardPerformance.segment == seg_name)
            .all()
        )
        if records:
            total_revenue = sum(
                (r.interchange_income or 0) + (r.interest_income or 0)
                - (r.reward_cost or 0) - (r.credit_loss or 0)
                for r in records
            )
            total_active = sum(r.active_cards or 1 for r in records)
            return total_revenue / max(total_active, 1)
        # Fallback: use segment benchmark via simulation
        seg = next((s for s in self.segments if s["name"] == seg_name), None)
        if seg:
            reward_rate, annual_fee = self._actual_params_for_segment(seg_name)
            clv = self._clv_for_segment(seg, reward_rate=reward_rate, annual_fee=annual_fee)
            return clv["monthly_profit"]
        return 0.0

    def compute_growth_opportunities(self):
        """
        For each segment, quantify the revenue upside from two levers:
          1. Churn recovery — retaining 30 % of annually churned cards
             (achievable via loyalty lock-in & personalised re-engagement)
          2. Market penetration — growing the segment card base by 10 %
             (achievable via targeted acquisition campaigns)

        All profit figures are derived from *actual* DB P&L data
        (interchange + interest − reward_cost − credit_loss) per active card.
        Returned list is sorted by total revenue_opportunity_aed descending.
        """
        opportunities = []
        for seg in self.segments:
            cards = self._cards_for_segment(seg["name"])
            display = SEGMENT_DISPLAY.get(seg["name"], {})

            # Actual monthly profit per card from real DB P&L (not simulation)
            monthly_profit_per_card = self._actual_monthly_profit_per_card(seg["name"])

            # ── Lever 1: Churn recovery ─────────────────────────────────────
            # 30 % of churned cards are recoverable with retention programmes
            recoverable_rate = 0.30
            churn_recovery_cards = int(cards * seg["annual_churn"] * recoverable_rate)
            churn_opportunity = churn_recovery_cards * max(monthly_profit_per_card, 0) * 12

            # ── Lever 2: Market penetration ─────────────────────────────────
            # A 10 % uplift in active card base is achievable within 12 months
            penetration_uplift_cards = int(cards * 0.10)
            penetration_opportunity = (
                penetration_uplift_cards * max(monthly_profit_per_card, 0) * 12
            )

            total_opportunity = churn_opportunity + penetration_opportunity

            opportunities.append({
                "key": seg["name"],
                "label": display.get("label", seg["name"]),
                "icon": display.get("icon", ""),
                "tier_color": display.get("tier_color", "#2563eb"),
                # Current economics (actual DB)
                "current_profit_per_card": round(monthly_profit_per_card, 2),
                "current_cards": cards,
                "churn_rate": seg["annual_churn"],
                # Churn lever
                "churn_recovery_cards": churn_recovery_cards,
                "churn_opportunity_aed": round(churn_opportunity, 0),
                # Penetration lever
                "penetration_uplift_cards": penetration_uplift_cards,
                "penetration_opportunity_aed": round(penetration_opportunity, 0),
                # Total
                "revenue_opportunity_aed": round(total_opportunity, 0),
                "opportunity_size": (
                    "large"  if total_opportunity > 5_000_000 else
                    "medium" if total_opportunity > 1_000_000 else
                    "small"
                ),
            })

        opportunities.sort(key=lambda x: x["revenue_opportunity_aed"], reverse=True)
        return opportunities

    def compute_churn_risk(self):
        """
        For each segment, compute revenue at risk from current churn rate.
        Returns segments sorted by revenue_at_risk descending.
        """
        risks = []
        for seg in self.segments:
            cards = self._cards_for_segment(seg["name"])
            clv_data = self._clv_for_segment(seg)
            monthly_revenue_per_card = (
                clv_data["interchange_income"] + clv_data["interest_income"]
            )
            revenue_at_risk = (
                cards * seg["monthly_spend"] * 12 * seg["annual_churn"]
                * getattr(self.config, "interchange_rate", 0.0175)
            )
            display = SEGMENT_DISPLAY.get(seg["name"], {})
            risks.append({
                "key": seg["name"],
                "label": display.get("label", seg["name"]),
                "icon": display.get("icon", ""),
                "tier_color": display.get("tier_color", "#2563eb"),
                "cards": display.get("cards", []),
                "churn_rate": seg["annual_churn"],
                "cards_at_risk_annually": int(cards * seg["annual_churn"]),
                "revenue_at_risk_aed": round(revenue_at_risk, 0),
                "risk_level": "high" if seg["annual_churn"] > 0.22
                              else "medium" if seg["annual_churn"] > 0.14
                              else "low",
                "risk_color": "#e11d48" if seg["annual_churn"] > 0.22
                              else "#d97706" if seg["annual_churn"] > 0.14
                              else "#059669",
                "monthly_revenue_per_card": round(monthly_revenue_per_card, 2),
                "recommended_action": (
                    "Introduce loyalty lock-in program and preferential refinancing"
                    if seg["annual_churn"] > 0.22
                    else "Enhance benefits and personalise offers"
                    if seg["annual_churn"] > 0.14
                    else "Maintain current engagement strategy"
                ),
            })

        risks.sort(key=lambda x: x["revenue_at_risk_aed"], reverse=True)
        return risks
