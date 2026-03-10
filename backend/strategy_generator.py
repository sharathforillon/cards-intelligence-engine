from backend.strategy_generator import StrategyGenerator
from backend.adaptive_monte_carlo import AdaptiveMonteCarlo
from backend.parallel_simulator import ParallelStrategySimulator
from backend.strategy_scoring import StrategyScoring


class ProductStrategyEngine:

    def __init__(self, db, finance_engine, bank_profile, feature_store):

        self.db = db
        self.finance_engine = finance_engine
        self.profile = bank_profile
        self.features = feature_store


    def run(self):

        generator = StrategyGenerator(self.profile, self.features)

        strategies = generator.generate()

        simulator = AdaptiveMonteCarlo(self.finance_engine)

        parallel = ParallelStrategySimulator(simulator)

        results = parallel.run(strategies, self.profile)

        scoring = StrategyScoring()

        ranked = []

        for r in results:

            score = scoring.score(
                r["result"],
                market_gap_score=0.5
            )

            ranked.append({
                "strategy": r["strategy"],
                "score": score,
                "metrics": r["result"]
            })

        ranked.sort(key=lambda x: x["score"], reverse=True)

        return ranked[:5]