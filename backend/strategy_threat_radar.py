class StrategyThreatRadar:

    """
    Predicts probability of competitor strategic moves
    based on market pressure indicators.
    """

    def __init__(self):

        self.bank_profiles = {

            "ADCB": {"bias": "cashback", "reaction_rate": 0.7},
            "EmiratesNBD": {"bias": "travel", "reaction_rate": 0.6},
            "FAB": {"bias": "promotional", "reaction_rate": 0.65},
            "HSBC": {"bias": "premium", "reaction_rate": 0.4}

        }

        self.market_avg_reward = 0.025


    def compute_reward_gap(self, competitor_reward):

        gap = competitor_reward - self.market_avg_reward

        return max(0, gap)


    def threat_probability(self, reward_gap, acquisition_loss, segment_gap, reaction):

        score = (
            0.35 * reward_gap +
            0.25 * acquisition_loss +
            0.20 * segment_gap +
            0.20 * reaction
        )

        return min(1, score)


    def evaluate_market(self, competitor_data):

        threats = []

        for bank, data in competitor_data.items():

            profile = self.bank_profiles.get(bank)

            reward_gap = self.compute_reward_gap(data["reward"])

            acquisition_loss = data.get("acquisition_loss", 0.2)

            segment_gap = data.get("segment_profit_gap", 0.3)

            reaction_rate = profile["reaction_rate"]

            probability = self.threat_probability(
                reward_gap,
                acquisition_loss,
                segment_gap,
                reaction_rate
            )

            threats.append({

                "bank": bank,
                "predicted_move": profile["bias"],
                "probability": round(probability * 100, 1)

            })

        return threats