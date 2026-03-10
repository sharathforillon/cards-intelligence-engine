import math


class MarketGameSimulator:

    """
    Multi-bank strategy competition simulator using
    utility-based consumer choice and constrained reactions.
    """

    def __init__(self):

        self.banks = {

            "Mashreq": {"brand": 0.7, "strategy": "digital_rewards"},
            "ADCB": {"brand": 0.75, "strategy": "cashback"},
            "EmiratesNBD": {"brand": 0.85, "strategy": "travel"},
            "FAB": {"brand": 0.8, "strategy": "promotional"},
            "HSBC": {"brand": 0.9, "strategy": "premium"}

        }

        self.segment_weights = {

            "salary_bank_customers": {"reward": 0.45, "fee": 0.25, "brand": 0.20, "features": 0.10},
            "core_professionals": {"reward": 0.40, "fee": 0.20, "brand": 0.25, "features": 0.15},
            "affluent_lifestyle": {"reward": 0.35, "fee": 0.15, "brand": 0.30, "features": 0.20},
            "premium_travelers": {"reward": 0.25, "fee": 0.10, "brand": 0.40, "features": 0.25},
            "category_maximizers": {"reward": 0.55, "fee": 0.20, "brand": 0.15, "features": 0.10}

        }


    def card_utility(self, reward_rate, annual_fee, brand, features, weights):

        reward_score = reward_rate * weights["reward"] * 20

        fee_penalty = annual_fee * weights["fee"] * -0.002

        brand_score = brand * weights["brand"]

        feature_score = features * weights["features"]

        return reward_score + fee_penalty + brand_score + feature_score


    def softmax(self, utilities):

        exp_values = [math.exp(u) for u in utilities]

        total = sum(exp_values)

        return [v / total for v in exp_values]


    def simulate_market(self, strategies):

        """
        strategies example:
        {
            "Mashreq": {"reward":0.03,"fee":200,"features":0.6},
            "ADCB": {"reward":0.04,"fee":300,"features":0.5}
        }
        """

        market_results = {}

        for segment, weights in self.segment_weights.items():

            utilities = []
            banks = []

            for bank, strat in strategies.items():

                brand = self.banks[bank]["brand"]

                util = self.card_utility(
                    strat["reward"],
                    strat["fee"],
                    brand,
                    strat["features"],
                    weights
                )

                utilities.append(util)
                banks.append(bank)

            shares = self.softmax(utilities)

            segment_shares = dict(zip(banks, shares))

            market_results[segment] = segment_shares

        return market_results


    def aggregate_market_share(self, segment_shares, segments):

        portfolio_share = {}

        for bank in self.banks:

            portfolio_share[bank] = 0

        for seg in segments:

            seg_name = seg["name"]

            for bank, share in segment_shares[seg_name].items():

                portfolio_share[bank] += share * seg["portfolio_share"]

        return portfolio_share