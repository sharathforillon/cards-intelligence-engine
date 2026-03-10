from backend.strategy_orchestrator import StrategyOrchestrator


class StrategyAutoPilot:

    """
    Automatically evaluates incremental strategy adjustments
    and recommends optimal changes.
    """

    def __init__(self):

        self.engine = StrategyOrchestrator()

        self.current_strategy = {

            "reward_rate": 0.03,
            "annual_fee": 200,
            "features": 0.6
        }

    def generate_adjustments(self):

        base_reward = self.current_strategy["reward_rate"]
        base_fee = self.current_strategy["annual_fee"]

        candidates = [

            {"reward_rate": base_reward - 0.005, "annual_fee": base_fee},
            {"reward_rate": base_reward + 0.005, "annual_fee": base_fee},

            {"reward_rate": base_reward, "annual_fee": base_fee - 200},
            {"reward_rate": base_reward, "annual_fee": base_fee + 200},

            {"reward_rate": base_reward + 0.01, "annual_fee": base_fee}

        ]

        return candidates

    def evaluate_adjustments(self):

        candidates = self.generate_adjustments()

        results = []

        for c in candidates:

            strategy = {

                "reward_rate": max(0.01, c["reward_rate"]),
                "annual_fee": max(0, c["annual_fee"]),
                "features": 0.6
            }

            result = self.engine.evaluate_strategy(strategy)

            results.append(result)

        results.sort(key=lambda x: x["score"], reverse=True)

        return results

    def recommend_strategy(self):

        results = self.evaluate_adjustments()

        best = results[0]

        recommendation = {

            "current_strategy": self.current_strategy,
            "recommended_strategy": best["strategy"],
            "score": best["score"],
            "clv": best["clv"]["portfolio_clv"],
            "roe": best["roe"]["roe"]

        }

        return recommendation