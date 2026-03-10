import random


class StrategySearchEngine:

    def __init__(self, finance_engine, simulator):
        self.finance_engine = finance_engine
        self.simulator = simulator


    def generate_card_strategies(self):

        strategies = []

        cashback_options = [0.01, 0.02, 0.03, 0.05]
        annual_fees = [0, 200, 500, 1200]
        card_types = ["cashback", "travel", "premium"]

        for _ in range(200):

            strategy = {

                "card_type": random.choice(card_types),

                "cashback_rate": random.choice(cashback_options),

                "annual_fee": random.choice(annual_fees),

                "welcome_bonus_cost": random.randint(200000, 1200000)
            }

            strategies.append(strategy)

        return strategies


    def evaluate_strategies(self, bank_profile):

        strategies = self.generate_card_strategies()

        results = []

        for s in strategies:

            pnl = self.finance_engine.calculate_card_profitability(

                customers=10000,

                avg_spend=bank_profile["avg_spend_per_card"],

                revolve_rate=bank_profile["revolve_rate"],

                revolve_balance_ratio=bank_profile["revolve_balance_ratio"],

                interest_rate=bank_profile["interest_rate"],

                interchange_rate=bank_profile["interchange_rate"],

                annual_fee=s["annual_fee"],

                fx_spend_ratio=0.15,

                fx_markup=bank_profile["fx_markup"],

                late_fee_rate=120,

                balance_transfer_rate=0.03,

                reward_rate=s["cashback_rate"],

                welcome_bonus_cost=s["welcome_bonus_cost"],

                credit_loss_rate=bank_profile["credit_loss_rate"],

                fraud_loss_rate=bank_profile["fraud_loss_rate"],

                cost_of_funds=bank_profile["cost_of_funds"],

                servicing_cost=bank_profile["servicing_cost"],

                network_cost=bank_profile["network_cost"],

                processing_cost=bank_profile["processing_cost"],

                acquisition_cost=bank_profile["acquisition_cost"]
            )

            results.append({

                "strategy": s,
                "profit": pnl["profit"],
                "revenue": pnl["revenue"]
            })

        ranked = sorted(results, key=lambda x: x["profit"], reverse=True)

        return ranked[:10]