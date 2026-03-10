import logging

from backend.strategy_engine import StrategyEngine
from backend.finance_engine import FinanceEngine
from backend.models import SystemConfig
from backend.product_strategy_engine import ProductStrategyEngine


logger = logging.getLogger("StrategyOrchestrator")


class StrategyOrchestrator:

    def __init__(self, db_session):

        self.db = db_session

        # legacy engines
        self.strategy_engine = StrategyEngine(db_session)
        self.finance_engine = FinanceEngine(db_session)

        # NEW intelligence engine
        self.product_engine = ProductStrategyEngine(db_session)


    async def get_focus_bank(self):
        """
        Returns the bank the system should optimize for.
        """

        config = self.db.query(SystemConfig).first()

        if config and config.focus_bank:
            return config.focus_bank

        return "Mashreq"


    async def handle_competitor_change(self, competitor_name, new_cashback, new_fee):
        """
        Triggered automatically when scraper detects a competitor change.
        Runs the full intelligence analysis pipeline.
        """

        focus_bank = await self.get_focus_bank()

        logger.info(
            f"Competitive change detected: {competitor_name}. "
            f"Running strategy intelligence against focus bank: {focus_bank}"
        )

        try:

            insights = self.product_engine.executive_summary()

            if not insights:

                logger.info("Product strategy engine returned no insights")

                return

            for insight in insights:

                logger.warning(
                    f"\nSTRATEGY INTELLIGENCE ALERT\n{insight}"
                )

                # Future integrations
                # await telegram_bot.send_message(insight)
                # await slack_bot.post_message(insight)

        except Exception as e:

            logger.error(
                f"Product strategy intelligence failure: {e}"
            )


    def generate_executive_memo(self, bank, rec):
        """
        Legacy formatting method for StrategyEngine outputs.
        """

        return f"""
🚀 STRATEGY ENGINE ALERT: COMPETITIVE SHIFT

Focus Bank: {rec.get('focus_bank', 'Mashreq')}
Competitor: {bank}

Observation:
A change in {bank}'s commercial offering has created a market opportunity.

Strategic Recommendation:
{rec.get('strategy', 'No strategy provided')}

Metric Analysis:
- Gap Type: {rec.get('gap_type', 'unknown')}
- Projected Profit Impact: {rec.get('projected_profit_impact', 'N/A')}
- Confidence Score: {int(rec.get('confidence_score', 0) * 100)}%

System Status:
P&L bridge analysis suggests prioritizing this update in the next strategy cycle.
"""


    async def run_full_cycle(self):
        """
        Manual trigger to run full product strategy intelligence analysis.
        """

        logger.info("Running full product strategy intelligence cycle")

        try:

            insights = self.product_engine.executive_summary()

            return insights

        except Exception as e:

            logger.error(f"Full intelligence cycle failed: {e}")

            return []