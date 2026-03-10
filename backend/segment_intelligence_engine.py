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
    },
    "core_professionals": {
        "label": "Mass Affluent",
        "description": "Mid-career professionals with growing disposable income",
        "icon": "💼",
        "tier_color": "#0891b2",
    },
    "affluent_lifestyle": {
        "label": "Affluent",
        "description": "High-income lifestyle spenders with category focus",
        "icon": "✨",
        "tier_color": "#7c3aed",
    },
    "premium_travelers": {
        "label": "Premium / High-Spend Travelers",
        "description": "Ultra-HNI frequent flyers with international spend",
        "icon": "✈️",
        "tier_color": "#d97706",
    },
    "category_maximizers": {
        "label": "Category Maximizers",
        "description": "Savvy reward optimisers across spend categories",
        "icon": "🎯",
        "tier_color": "#059669",
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

    def _clv_for_segment(self, seg, reward_rate=None, annual_fee=None):
        """Run simulate_card_clv with segment-specific parameters."""
        rr = reward_rate if reward_rate is not None else DEFAULT_REWARD_RATE
        af = annual_fee if annual_fee is not None else DEFAULT_ANNUAL_FEE
        return self.simulator.simulate_card_clv(
            reward_rate=rr,
            annual_fee=af,
            monthly_spend=seg["monthly_spend"],
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
        # Fallback: use portfolio_share × baseline
        seg = next((s for s in self.segments if s["name"] == seg_name), None)
        share = seg["portfolio_share"] if seg else 0.2
        return int(375_000 * share)

    # ── Main methods ───────────────────────────────────────────────────────

    def compute_segment_profitability(self):
        """Return enriched per-segment profitability objects."""
        results = []
        for seg in self.segments:
            clv_data = self._clv_for_segment(seg)
            cards = self._cards_for_segment(seg["name"])
            annual_reward_cost = (
                seg["monthly_spend"] * 12 * DEFAULT_REWARD_RATE
                * (1 - 0.15)  # 15% breakage
            )
            profit_per_customer = clv_data["monthly_profit"]
            ltv = clv_data["clv_36m"]

            display = SEGMENT_DISPLAY.get(seg["name"], {})

            results.append({
                "key": seg["name"],
                "label": display.get("label", seg["name"]),
                "description": display.get("description", ""),
                "icon": display.get("icon", ""),
                "tier_color": display.get("tier_color", "#2563eb"),
                "portfolio_share": seg["portfolio_share"],
                "cards_issued": cards,
                "monthly_spend_per_card": seg["monthly_spend"],
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

    def compute_growth_opportunities(self):
        """
        For each segment, compute the profit headroom if reward rate lifted by 0.5pp.
        Returns segments sorted by opportunity_aed descending.
        """
        opportunities = []
        for seg in self.segments:
            baseline = self._clv_for_segment(seg, reward_rate=DEFAULT_REWARD_RATE)
            enhanced = self._clv_for_segment(seg, reward_rate=DEFAULT_REWARD_RATE + 0.005)

            headroom_monthly = enhanced["monthly_profit"] - baseline["monthly_profit"]
            # Negative headroom means cost increase: express as potential acquisition gain
            cards = self._cards_for_segment(seg["name"])
            # Acquisition uplift: a 0.5pp rate improvement increases acquisition ~8%
            acquisition_uplift = int(cards * 0.08)
            revenue_opportunity = acquisition_uplift * baseline["monthly_profit"] * 12

            display = SEGMENT_DISPLAY.get(seg["name"], {})
            opportunities.append({
                "key": seg["name"],
                "label": display.get("label", seg["name"]),
                "icon": display.get("icon", ""),
                "tier_color": display.get("tier_color", "#2563eb"),
                "current_profit_per_card": round(baseline["monthly_profit"], 2),
                "enhanced_profit_per_card": round(enhanced["monthly_profit"], 2),
                "profit_headroom_monthly": round(headroom_monthly, 2),
                "acquisition_uplift_cards": acquisition_uplift,
                "revenue_opportunity_aed": round(revenue_opportunity, 0),
                "opportunity_size": "large" if revenue_opportunity > 5_000_000
                                    else "medium" if revenue_opportunity > 1_000_000
                                    else "small",
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
