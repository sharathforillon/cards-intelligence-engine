class LearningEngine:

    def __init__(self, db):
        self.db = db


    def update_market_statistics(self, cards):

        cashback_rates = []

        for c in cards:

            if isinstance(c.cashback_rate, dict):
                base = c.cashback_rate.get("base")

                if base:
                    cashback_rates.append(base)

        if cashback_rates:

            avg_cashback = sum(cashback_rates) / len(cashback_rates)

            return {
                "market_avg_cashback": avg_cashback
            }

        return None