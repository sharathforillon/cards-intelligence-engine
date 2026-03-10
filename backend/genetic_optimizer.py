import random


class GeneticStrategyOptimizer:

    def __init__(self, simulator, scoring_engine):

        self.simulator = simulator
        self.scoring = scoring_engine


    def mutate(self, strategy):

        mutation = strategy.copy()

        if random.random() < 0.3:
            mutation["cashback_rate"] *= random.uniform(0.8, 1.2)

        if random.random() < 0.3:
            mutation["annual_fee"] += random.choice([-200, 0, 200])

        mutation["cashback_rate"] = max(0.005, min(mutation["cashback_rate"], 0.05))
        mutation["annual_fee"] = max(0, min(mutation["annual_fee"], 1500))

        return mutation


    def evolve(self, strategies, profile, generations=5):

        population = strategies

        for _ in range(generations):

            evaluated = []

            for s in population:

                result = self.simulator.run_simulation(s, profile)

                score = self.scoring.score(result, market_gap_score=0.5)

                evaluated.append({
                    "strategy": s,
                    "score": score,
                    "metrics": result
                })

            evaluated.sort(key=lambda x: x["score"], reverse=True)

            survivors = evaluated[:10]

            new_population = []

            for s in survivors:

                new_population.append(s["strategy"])

                new_population.append(
                    self.mutate(s["strategy"])
                )

            population = new_population

        return evaluated[:5]