from multiprocessing import Pool


def simulate_strategy(args):

    simulator, strategy, profile = args

    return {
        "strategy": strategy,
        "result": simulator.run_simulation(strategy, profile)
    }


class ParallelStrategySimulator:

    def __init__(self, simulator, workers=2):

        self.simulator = simulator
        self.workers = workers


    def run(self, strategies, profile):

        with Pool(self.workers) as p:

            results = p.map(
                simulate_strategy,
                [(self.simulator, s, profile) for s in strategies]
            )

        return results