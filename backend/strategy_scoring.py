class StrategyScoring:

    def score(self, simulation, market_gap_score):

        profit = simulation["expected_profit"]
        risk = simulation["risk"]
        loss_prob = simulation["loss_probability"]

        profit_score = profit / 1_000_000

        risk_penalty = risk / 1_000_000

        score = (
            0.5 * profit_score +
            0.3 * market_gap_score -
            0.2 * risk_penalty -
            0.2 * loss_prob
        )

        return score