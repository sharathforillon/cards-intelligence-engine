import random
import statistics


class AdaptiveMonteCarlo:

    def __init__(self, finance_engine):

        self.finance_engine = finance_engine


    def run_simulation(self, strategy, profile, runs=100):

        profits = []

        for _ in range(runs):

            spend = profile["avg_spend_per_card"] * random.uniform(0.9, 1.1)

            credit_loss = profile["credit_loss_rate"] * random.uniform(0.8, 1.3)

            pnl = self.finance_engine.calculate_card_profitability(

                customers=10000,
                avg_spend=spend,
                revolve_rate=profile["revolve_rate"],
                revolve_balance_ratio=profile["revolve_balance_ratio"],
                interest_rate=profile["interest_rate"],
                interchange_rate=profile["interchange_rate"],
                annual_fee=strategy["annual_fee"],
                fx_spend_ratio=0.15,
                fx_markup=profile["fx_markup"],
                late_fee_rate=120,
                balance_transfer_rate=0.03,
                reward_rate=strategy["cashback_rate"],
                welcome_bonus_cost=strategy["welcome_bonus_cost"],
                credit_loss_rate=credit_loss,
                fraud_loss_rate=profile["fraud_loss_rate"],
                cost_of_funds=profile["cost_of_funds"],
                servicing_cost=profile["servicing_cost"],
                network_cost=profile["network_cost"],
                processing_cost=profile["processing_cost"],
                acquisition_cost=profile["acquisition_cost"]
            )

            profits.append(pnl["profit"])

        return {
            "expected_profit": statistics.mean(profits),
            "risk": statistics.stdev(profits),
            "loss_probability": len([p for p in profits if p < 0]) / len(profits)
        }