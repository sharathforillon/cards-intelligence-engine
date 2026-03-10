import logging
from backend.customer_segments import CustomerSegments
from backend.models_portfolio import MashreqCardPerformance

logger = logging.getLogger("ProfitabilitySimulator")


class ProfitabilitySimulator:

    def __init__(self, db, config):

        self.db = db
        self.config = config

        self.segments = CustomerSegments().get_segments()

        # Safe configuration loading
        self.reward_breakage = getattr(config, "reward_breakage", {"cashback": 0.15, "miles": 0.25})
        self.monthly_discount = getattr(config, "monthly_discount", 0.01)

        self.interchange_rate = getattr(config, "interchange_rate", 0.0175)
        self.interest_apr = getattr(config, "interest_apr", 0.26)
        self.cost_of_funds_apr = getattr(config, "cost_of_funds_apr", 0.05)
        self.fx_margin = getattr(config, "fx_margin", 0.02)
        self.monthly_opex = getattr(config, "monthly_opex", 8)
        self.rwa_factor = getattr(config, "rwa_factor", 0.75)

    # --------------------------------------------------

    def portfolio_snapshot(self):

        records = self.db.query(MashreqCardPerformance).all()

        portfolio = []

        for r in records:

            portfolio.append({

                "card_name": r.card_name,
                "spend": r.monthly_spend,
                "revolve_rate": r.revolve_rate,
                "utilization": r.utilization_rate,
                "active_cards": r.active_cards

            })

        return portfolio

    # --------------------------------------------------

    def survival_probability(self, churn_rate, month):

        monthly_survival = (1 - churn_rate) ** (1 / 12)

        return monthly_survival ** month

    # --------------------------------------------------

    def credit_loss_curve(self, base_loss, month):

        if month < 6:
            return base_loss * 0.4

        if month < 18:
            return base_loss * 1.4

        if month < 36:
            return base_loss * 1.0

        return base_loss * 0.7

    # --------------------------------------------------
    # FIXED FUNCTION SIGNATURE
    # --------------------------------------------------

    def simulate_card_clv(
        self,
        reward_rate: float = 0.02,
        annual_fee: float = 0,
        monthly_spend: float = 4000,
        revolver_rate: float = 0.35,
        apr: float = 0.28
    ):
        """
        Lightweight CLV simulator used by the Strategy Orchestrator.
        """

        revolve_balance = monthly_spend * revolver_rate

        interest_income = revolve_balance * apr / 12
        interchange_income = monthly_spend * self.interchange_rate
        reward_cost = monthly_spend * reward_rate

        monthly_profit = (
            interest_income +
            interchange_income -
            reward_cost -
            self.monthly_opex
        )

        yearly_profit = monthly_profit * 12 + annual_fee

        clv_36m = yearly_profit * 3

        return {

            "monthly_profit": round(monthly_profit, 2),
            "yearly_profit": round(yearly_profit, 2),
            "clv_36m": round(clv_36m, 2),
            "interest_income": round(interest_income, 2),
            "interchange_income": round(interchange_income, 2),
            "reward_cost": round(reward_cost, 2)

        }

    # --------------------------------------------------

    def simulate_strategy(self, strategy):

        reward_rate = strategy.get("reward_rate", 0.02)
        annual_fee = strategy.get("annual_fee", 0)
        reward_type = strategy.get("reward_type", "cashback")

        breakage = self.reward_breakage.get(reward_type, 0.15)

        portfolio_clv = 0
        segment_results = []
        # aggregates for strategic intelligence layer
        expected_profit_total = 0.0
        expected_credit_loss_total = 0.0

        for seg in self.segments:

            cumulative_profit = 0
            payback = None

            cac = seg.get("cac", 400)

            for month in range(1, seg.get("lifespan_cap", 48) + 1):

                survival = self.survival_probability(
                    seg.get("annual_churn", 0.25),
                    month
                )

                ramp = seg.get("spend_ramp", lambda m: 1)(month)

                spend = seg.get("monthly_spend", 2000) * ramp

                revolve_balance = (
                    spend *
                    seg.get("revolve_rate", 0.3) *
                    seg.get("balance_multiplier", 1.3)
                )

                # --------------------------
                # REVENUE
                # --------------------------

                interchange_rev = spend * self.interchange_rate

                fx_rev = (
                    spend *
                    seg.get("fx_spend_ratio", 0.05) *
                    self.fx_margin
                )

                interest_rev = revolve_balance * (
                    self.interest_apr / 12
                )

                fee_income = annual_fee / 12

                # --------------------------
                # COST
                # --------------------------

                funding_cost = revolve_balance * (
                    self.cost_of_funds_apr / 12
                )

                credit_loss = revolve_balance * (
                    self.credit_loss_curve(
                        seg.get("credit_loss_rate", 0.04),
                        month
                    ) / 12
                )

                reward_cost = spend * reward_rate * (1 - breakage)

                # expected profit before credit losses (for RAROC)
                expected_profit_month = (
                    interchange_rev +
                    fx_rev +
                    interest_rev +
                    fee_income
                ) - (
                    funding_cost +
                    reward_cost +
                    self.monthly_opex
                )

                expected_profit_total += expected_profit_month
                expected_credit_loss_total += credit_loss

                net = (
                    interchange_rev +
                    fx_rev +
                    interest_rev +
                    fee_income
                ) - (
                    funding_cost +
                    credit_loss +
                    reward_cost +
                    self.monthly_opex
                )

                discounted = (
                    net *
                    survival /
                    ((1 + self.monthly_discount) ** month)
                )

                cumulative_profit += discounted

                if payback is None and cumulative_profit >= cac:
                    payback = month

            clv = cumulative_profit - cac

            portfolio_clv += clv * seg.get("portfolio_share", 0.2)

            segment_results.append({

                "segment": seg.get("name", "unknown"),
                "clv": round(clv, 2),
                "payback": payback

            })

        logger.info("Strategy simulation completed")

        return {

            "portfolio_clv": round(portfolio_clv, 2),
            "segments": segment_results,
            "expected_profit": round(expected_profit_total, 2),
            "expected_credit_loss": round(expected_credit_loss_total, 2)

        }

    # --------------------------------------------------

    def capital_efficiency(self, strategy):

        capital_usage = 0

        for seg in self.segments:

            exposure = seg.get("monthly_spend", 2000) * seg.get("credit_line_multiplier", 3)

            capital_usage += exposure * self.rwa_factor

        return capital_usage