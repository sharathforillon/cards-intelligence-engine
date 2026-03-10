from sqlalchemy import text


class StrategyEngine:

    def __init__(self, db):
        self.db = db

    def generate_narrative(self):

        """
        Generates a strategic narrative based on Mashreq portfolio performance.
        """

        # Fetch portfolio spend data
        result = self.db.execute(
            text("""
                SELECT card_name, monthly_spend
                FROM mashreq_card_performance
            """)
        )

        cards = result.fetchall()

        # No data case
        if not cards:
            return "No portfolio performance data available."

        # Calculate total portfolio spend
        total_spend = sum(card.monthly_spend for card in cards if card.monthly_spend)

        # Identify top performing card
        top_card = max(cards, key=lambda x: x.monthly_spend if x.monthly_spend else 0)

        narrative = f"""
Mashreq Credit Card Portfolio Overview

Total monthly spend across the portfolio is approximately {round(total_spend,2)} AED.

The strongest performing product currently is {top_card.card_name}, which contributes
a significant share of spend within the portfolio.

Market signals across the UAE suggest increasing competitive pressure in cashback
and travel rewards segments. Maintaining growth will likely require optimization of
reward economics, targeted acquisition campaigns, and deeper customer engagement
within high spending segments.

Strategic focus should be placed on maximizing interchange yield while controlling
reward cost leakage.
"""

        return narrative.strip()