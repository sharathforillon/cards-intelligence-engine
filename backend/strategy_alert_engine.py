from backend.strategy_orchestrator import StrategyOrchestrator
from backend.telegram_alerts import send_telegram


class StrategyAlertEngine:

    def __init__(self):

        self.engine = StrategyOrchestrator()


    def generate_daily_report(self):

        strategies = self.engine.run()

        top = strategies[0]

        message = f"""
📊 *Daily Strategy Intelligence*

Top Strategy

Reward: {top['strategy']['reward_rate']*100:.1f}%
Annual Fee: {top['strategy']['annual_fee']} AED

Key Metrics
CLV: {top['clv']['portfolio_clv']:.0f} AED
ROE: {top['roe']['roe']}%

Acquisition Lift
{top['acquisition']['portfolio_acquisition_multiplier']:.2f}x

Recommendation
Monitor competitor response in cashback category.
"""

        send_telegram(message)