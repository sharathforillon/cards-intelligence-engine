"""
Cannibalization Engine
Models customer redistribution when a new Mashreq card enters the market.
Uses the MarketGameSimulator utility model to compute market-share shifts.
"""

import logging
from backend.market_game_simulator import MarketGameSimulator
from backend.models_portfolio import MashreqCardPerformance
from backend.customer_segments import CustomerSegments
from backend.profitability_simulator import ProfitabilitySimulator

logger = logging.getLogger("CannibalizationEngine")

# Default competitor strategies for market simulation context
DEFAULT_COMPETITOR_STRATEGIES = {
    "ADCB":        {"reward": 0.030, "fee": 300, "features": 0.65},
    "EmiratesNBD": {"reward": 0.020, "fee": 200, "features": 0.75},
    "FAB":         {"reward": 0.025, "fee": 0,   "features": 0.60},
    "HSBC":        {"reward": 0.015, "fee": 400, "features": 0.80},
}


class CannibalizationEngine:

    def __init__(self, db, config):
        self.db = db
        self.config = config
        self.segments = CustomerSegments().get_segments()
        self.market_sim = MarketGameSimulator()
        self.prof_sim = ProfitabilitySimulator(db, config)

    # ── Helpers ────────────────────────────────────────────────────────────

    def _existing_mashreq_cards(self):
        records = (
            self.db.query(MashreqCardPerformance)
            .order_by(MashreqCardPerformance.card_name)
            .all()
        )
        if not records:
            # Illustrative fallback: 4 Mashreq card archetypes
            return [
                {"card_name": "Mashreq Solitaire",      "active_cards": 8_000,  "reward_rate": 0.020, "annual_fee": 1500, "monthly_spend": 6_000_000},
                {"card_name": "Mashreq Platinum Plus",  "active_cards": 22_000, "reward_rate": 0.015, "annual_fee": 400,  "monthly_spend": 14_000_000},
                {"card_name": "Mashreq Cashback",       "active_cards": 45_000, "reward_rate": 0.020, "annual_fee": 0,    "monthly_spend": 18_000_000},
                {"card_name": "Mashreq noon",           "active_cards": 15_000, "reward_rate": 0.015, "annual_fee": 0,    "monthly_spend": 8_000_000},
            ]
        return [
            {
                "card_name": r.card_name,
                "active_cards": r.active_cards or 0,
                "reward_rate": r.reward_rate or 0.015,
                "annual_fee": r.annual_fee or 0,
                "monthly_spend": r.monthly_spend or 0,
            }
            for r in records
        ]

    def _card_annual_revenue(self, card: dict) -> float:
        """Approximate annual revenue for an existing card."""
        interchange = getattr(self.config, "interchange_rate", 0.0175)
        annual_spend = card["monthly_spend"] * 12
        reward_cost = annual_spend * card["reward_rate"] * 0.85  # 15% breakage
        interchange_rev = annual_spend * interchange
        fee_rev = card["active_cards"] * card["annual_fee"]
        return interchange_rev + fee_rev - reward_cost

    # ── Market share delta computation ────────────────────────────────────

    def _market_share_without_new(self, existing_cards):
        """Compute Mashreq market share with existing cards only."""
        strategies = dict(DEFAULT_COMPETITOR_STRATEGIES)
        # Use highest-reward Mashreq card as proxy for Mashreq position
        best_mashreq = max(existing_cards, key=lambda c: c["reward_rate"])
        strategies["Mashreq"] = {
            "reward": best_mashreq["reward_rate"],
            "fee": best_mashreq["annual_fee"],
            "features": 0.65,
        }
        return self.market_sim.simulate_market(strategies)

    def _market_share_with_new(self, existing_cards, new_params):
        """Compute Mashreq market share with new card added to the portfolio.

        The new card is merged with the best existing card to represent the
        improved Mashreq offer in the market game. Both 'features_strength'
        and 'benefits_strength' key names are accepted.
        """
        strategies = dict(DEFAULT_COMPETITOR_STRATEGIES)
        best_mashreq = max(existing_cards, key=lambda c: c["reward_rate"])
        new_features = new_params.get("features_strength") or new_params.get("benefits_strength") or 0.65
        strategies["Mashreq"] = {
            "reward": max(best_mashreq["reward_rate"], new_params["reward_rate"]),
            "fee": min(best_mashreq["annual_fee"], new_params.get("annual_fee", 200)),
            "features": max(0.65, float(new_features)),
        }
        return self.market_sim.simulate_market(strategies)

    # ── Main public methods ────────────────────────────────────────────────

    def simulate_cannibalization(self, new_params: dict) -> dict:
        """
        new_params: {
          reward_rate, annual_fee, features_strength, target_segment,
          min_salary (optional), category_rewards (optional)
        }
        Returns full cannibalization analysis.
        """
        existing_cards = self._existing_mashreq_cards()
        total_existing_active = sum(c["active_cards"] for c in existing_cards)

        shares_before = self._market_share_without_new(existing_cards)
        shares_after = self._market_share_with_new(existing_cards, new_params)

        # Aggregate weighted Mashreq share across segments
        def weighted_mashreq_share(shares_dict):
            total = 0.0
            for seg in self.segments:
                seg_shares = shares_dict.get(seg["name"], {})
                mashreq_share = seg_shares.get("Mashreq", 0.2)
                total += mashreq_share * seg["portfolio_share"]
            return total

        mashreq_share_before = weighted_mashreq_share(shares_before)
        mashreq_share_after = weighted_mashreq_share(shares_after)
        share_delta = mashreq_share_after - mashreq_share_before

        # Estimate new card acquisitions based on market size
        TOTAL_UAE_CC_MARKET = 10_000_000  # approximate active UAE credit cards
        new_card_acquisitions = max(0, int(TOTAL_UAE_CC_MARKET * share_delta * 0.3))

        # Per-existing-card cannibalization
        redistribution = []
        total_revenue_lost = 0.0

        for card in existing_cards:
            if card["active_cards"] == 0:
                continue
            # Estimate cards shifting away based on reward-rate overlap
            overlap = max(0, min(
                new_params["reward_rate"] / max(card["reward_rate"], 0.01) - 0.9,
                0.35
            ))
            # Higher overlap if same fee tier
            if abs(new_params.get("annual_fee", 200) - card["annual_fee"]) < 200:
                overlap = min(overlap * 1.3, 0.35)
            cards_shifted = int(card["active_cards"] * overlap)
            annual_rev = self._card_annual_revenue(card)
            rev_per_card = annual_rev / max(card["active_cards"], 1)
            revenue_lost = cards_shifted * rev_per_card
            total_revenue_lost += revenue_lost

            redistribution.append({
                "card_name": card["card_name"],
                "current_active": card["active_cards"],
                "cards_shifted": cards_shifted,
                "cards_retained": card["active_cards"] - cards_shifted,
                "overlap_pct": round(overlap * 100, 1),
                "revenue_lost_aed": round(revenue_lost, 0),
            })

        # New card CLV
        clv_data = self.prof_sim.simulate_card_clv(
            reward_rate=new_params["reward_rate"],
            annual_fee=new_params.get("annual_fee", 200),
            monthly_spend=getattr(self.config, "avg_monthly_spend", 3500),
            revolver_rate=getattr(self.config, "revolve_rate", 0.35),
            apr=getattr(self.config, "interest_rate", 0.26),
        )
        new_card_annual_value = clv_data["yearly_profit"] * new_card_acquisitions
        net_portfolio_growth = new_card_annual_value - total_revenue_lost

        return {
            "redistribution": redistribution,
            "total_revenue_lost_aed": round(total_revenue_lost, 0),
            "new_card_acquisitions": new_card_acquisitions,
            "new_card_annual_value_aed": round(new_card_annual_value, 0),
            "net_portfolio_growth_aed": round(net_portfolio_growth, 0),
            "mashreq_market_share_before": round(mashreq_share_before * 100, 2),
            "mashreq_market_share_after": round(mashreq_share_after * 100, 2),
            "market_share_delta_pp": round(share_delta * 100, 2),
            "cannibalization_risk": total_revenue_lost > new_card_annual_value,
            "net_positive": net_portfolio_growth > 0,
        }
