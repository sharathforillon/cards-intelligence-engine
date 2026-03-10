import math
from backend.customer_segments import CustomerSegments


class AcquisitionElasticityEngine:

    """
    Models how reward improvements influence card acquisition volumes.
    Uses logistic adoption curves and segment-specific sensitivity.
    """

    def __init__(self):

        self.segments = CustomerSegments().get_segments()

        # market baseline assumptions
        self.market_avg_reward = 0.015

        # logistic curve steepness
        self.elasticity_k = 8

        # CAC amplification
        self.marketing_elasticity = 800


    def logistic_response(self, reward_rate):

        midpoint = self.market_avg_reward

        exponent = -self.elasticity_k * (reward_rate - midpoint)

        return 1 / (1 + math.exp(exponent))


    def competitive_adjustment(self, reward_rate):

        gap = (reward_rate - self.market_avg_reward) / self.market_avg_reward

        return max(0.5, 1 + gap)


    def segment_multiplier(self, segment_name):

        table = {

            "salary_bank_customers": 0.6,
            "core_professionals": 1.0,
            "affluent_lifestyle": 1.2,
            "premium_travelers": 1.4,
            "category_maximizers": 1.6
        }

        return table.get(segment_name, 1.0)


    def adjusted_cac(self, base_cac, reward_rate, welcome_bonus):

        marketing_cost = reward_rate * self.marketing_elasticity

        return base_cac + welcome_bonus + marketing_cost


    def simulate_acquisition(self, reward_rate, welcome_bonus=0):

        base_multiplier = self.logistic_response(reward_rate)

        competitive_factor = self.competitive_adjustment(reward_rate)

        segment_results = []

        portfolio_multiplier = 0

        for seg in self.segments:

            sensitivity = self.segment_multiplier(seg["name"])

            acquisition_multiplier = (
                base_multiplier *
                competitive_factor *
                sensitivity
            )

            cac = self.adjusted_cac(
                seg["cac"],
                reward_rate,
                welcome_bonus
            )

            segment_results.append({

                "segment": seg["name"],
                "acquisition_multiplier": round(acquisition_multiplier, 2),
                "adjusted_cac": round(cac, 2)

            })

            portfolio_multiplier += (
                acquisition_multiplier *
                seg["portfolio_share"]
            )

        return {

            "portfolio_acquisition_multiplier": round(portfolio_multiplier, 2),
            "segment_breakdown": segment_results

        }