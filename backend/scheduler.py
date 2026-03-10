import schedule
import time

from backend.strategy_alert_engine import StrategyAlertEngine

engine = StrategyAlertEngine()


def run_alerts():

    engine.generate_daily_report()


schedule.every().day.at("08:00").do(run_alerts)

while True:

    schedule.run_pending()
    time.sleep(60)