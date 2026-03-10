class BankProfileEngine:

    def mashreq_profile(self):

        return {

            "bank": "Mashreq",

            # customer behaviour
            "avg_spend_per_card": 96000,

            "revolve_rate": 0.30,
            "revolve_balance_ratio": 0.35,

            # revenue
            "interchange_rate": 0.018,
            "interest_rate": 0.32,
            "fx_markup": 0.0299,

            # cost structure
            "cost_of_funds": 0.05,
            "credit_loss_rate": 0.035,
            "fraud_loss_rate": 0.002,

            # operating cost
            "servicing_cost": 35,
            "network_cost": 0.002,
            "processing_cost": 0.001,

            # acquisition
            "acquisition_cost": 300,

            # rewards
            "reward_budget_limit": 0.03
        }