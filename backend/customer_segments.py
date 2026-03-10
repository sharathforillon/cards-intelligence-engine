class CustomerSegments:
    """
    UAE/GCC credit card behavioral segments calibrated for Mashreq-like portfolios.
    """

    def get_segments(self):

        return [

            {
                "name": "salary_bank_customers",

                "portfolio_share": 0.45,

                "monthly_spend": 5000,

                "revolve_rate": 0.50,
                "balance_multiplier": 1.8,

                "annual_churn": 0.20,
                "credit_loss_rate": 0.045,

                "fx_spend_ratio": 0.10,

                "cac": 400,
                "lifespan_cap": 60
            },

            {
                "name": "core_professionals",

                "portfolio_share": 0.30,

                "monthly_spend": 9000,

                "revolve_rate": 0.35,
                "balance_multiplier": 1.9,

                "annual_churn": 0.16,
                "credit_loss_rate": 0.03,

                "fx_spend_ratio": 0.18,

                "cac": 800,
                "lifespan_cap": 48
            },

            {
                "name": "affluent_lifestyle",

                "portfolio_share": 0.15,

                "monthly_spend": 22000,

                "revolve_rate": 0.20,
                "balance_multiplier": 2.0,

                "annual_churn": 0.12,
                "credit_loss_rate": 0.015,

                "fx_spend_ratio": 0.30,

                "cac": 1500,
                "lifespan_cap": 48
            },

            {
                "name": "premium_travelers",

                "portfolio_share": 0.07,

                "monthly_spend": 55000,

                "revolve_rate": 0.08,
                "balance_multiplier": 2.2,

                "annual_churn": 0.09,
                "credit_loss_rate": 0.01,

                "fx_spend_ratio": 0.45,

                "cac": 3000,
                "lifespan_cap": 36
            },

            {
                "name": "category_maximizers",

                "portfolio_share": 0.03,

                "monthly_spend": 14000,

                "revolve_rate": 0.15,
                "balance_multiplier": 1.7,

                "annual_churn": 0.30,
                "credit_loss_rate": 0.02,

                "fx_spend_ratio": 0.12,

                "cac": 600,
                "lifespan_cap": 24
            }

        ]

    def portfolio_average_spend(self):

        segments = self.get_segments()

        weighted_spend = 0

        for s in segments:
            weighted_spend += s["monthly_spend"] * s["portfolio_share"]

        return weighted_spend