import logging

logger = logging.getLogger("CapitalEfficiency")


class CapitalEfficiencySimulator:

    """
    Simulates portfolio growth, capital consumption,
    and return on equity for credit card strategies.
    """

    def __init__(self):

        # portfolio baseline
        self.active_cards = 375000

        self.new_to_bank_monthly = 10000
        self.existing_cross_sell = 10000

        self.monthly_attrition_rate = 0.015

        # credit metrics
        self.avg_credit_limit = 45000
        self.utilization_rate = 0.38

        # regulatory parameters
        self.risk_weight = 0.75
        self.capital_ratio = 0.105

        # structural metrics
        self.cards_per_customer = 1.4


    def estimate_customers(self):

        return self.active_cards / self.cards_per_customer


    def portfolio_projection(self, months=12):

        customers = self.estimate_customers()

        history = []

        for m in range(1, months + 1):

            acquisitions = (
                self.new_to_bank_monthly +
                self.existing_cross_sell
            )

            attrition = customers * self.monthly_attrition_rate

            customers = customers + acquisitions - attrition

            cards = customers * self.cards_per_customer

            exposure = (
                customers *
                self.avg_credit_limit *
                self.utilization_rate
            )

            capital_required = (
                exposure *
                self.risk_weight *
                self.capital_ratio
            )

            history.append({

                "month": m,
                "customers": round(customers),
                "cards": round(cards),
                "exposure_aed": round(exposure),
                "capital_required_aed": round(capital_required)

            })

        return history


    def compute_roe(self, annual_profit):

        customers = self.estimate_customers()

        exposure = (
            customers *
            self.avg_credit_limit *
            self.utilization_rate
        )

        capital_required = (
            exposure *
            self.risk_weight *
            self.capital_ratio
        )

        roe = annual_profit / capital_required

        return {

            "capital_required": round(capital_required),
            "roe": round(roe * 100, 2)

        }