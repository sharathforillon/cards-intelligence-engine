class FinanceEngine:

    def __init__(self, db=None):
        self.db = db

    def calculate_card_profitability(
        self,
        customers,
        avg_spend,
        revolve_rate,
        revolve_balance_ratio,
        interest_rate,
        interchange_rate,
        annual_fee,
        fx_spend_ratio,
        fx_markup,
        late_fee_rate,
        balance_transfer_rate,
        reward_rate,
        welcome_bonus_cost,
        credit_loss_rate,
        fraud_loss_rate,
        cost_of_funds,
        servicing_cost,
        network_cost,
        processing_cost,
        acquisition_cost
    ):

        total_spend = customers * avg_spend

        revolve_balance = total_spend * revolve_balance_ratio
        revolve_customers = customers * revolve_rate

        # Revenue

        interchange_income = total_spend * interchange_rate

        interest_income = revolve_balance * interest_rate

        annual_fee_income = customers * annual_fee

        fx_income = total_spend * fx_spend_ratio * fx_markup

        late_fee_income = revolve_customers * late_fee_rate

        balance_transfer_income = revolve_balance * balance_transfer_rate

        revenue = (
            interchange_income
            + interest_income
            + annual_fee_income
            + fx_income
            + late_fee_income
            + balance_transfer_income
        )

        # Costs

        reward_cost = total_spend * reward_rate

        credit_loss = revolve_balance * credit_loss_rate

        fraud_loss = total_spend * fraud_loss_rate

        funding_cost = revolve_balance * cost_of_funds

        servicing = customers * servicing_cost

        network_fees = total_spend * network_cost

        processing = total_spend * processing_cost

        marketing = customers * acquisition_cost

        total_cost = (
            reward_cost
            + welcome_bonus_cost
            + credit_loss
            + fraud_loss
            + funding_cost
            + servicing
            + network_fees
            + processing
            + marketing
        )

        profit = revenue - total_cost

        return {
            "customers": customers,
            "total_spend": total_spend,
            "revolve_balance": revolve_balance,
            "interchange_income": interchange_income,
            "interest_income": interest_income,
            "annual_fee_income": annual_fee_income,
            "fx_income": fx_income,
            "late_fee_income": late_fee_income,
            "balance_transfer_income": balance_transfer_income,
            "reward_cost": reward_cost,
            "welcome_bonus_cost": welcome_bonus_cost,
            "credit_loss": credit_loss,
            "fraud_loss": fraud_loss,
            "funding_cost": funding_cost,
            "servicing_cost": servicing,
            "network_fees": network_fees,
            "processing_cost": processing,
            "marketing_cost": marketing,
            "revenue": revenue,
            "cost": total_cost,
            "profit": profit
        }

    def portfolio_summary(self, cards):

        total_profit = 0
        total_revenue = 0
        total_cost = 0

        for card in cards:
            total_profit += card["profit"]
            total_revenue += card["revenue"]
            total_cost += card["cost"]

        return {
            "portfolio_revenue": total_revenue,
            "portfolio_cost": total_cost,
            "portfolio_profit": total_profit
        }

    def pnl_bridge(self, previous_profit, current_profit):

        variance = current_profit - previous_profit

        return {
            "previous_profit": previous_profit,
            "current_profit": current_profit,
            "variance": variance
        }