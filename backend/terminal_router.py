from backend.strategy_orchestrator import StrategyOrchestrator
from backend.database import SessionLocal
from backend.config import load_bank_config


class TerminalRouter:

    def __init__(self):

        self.db = SessionLocal()
        self.config = load_bank_config()

        self.engine = StrategyOrchestrator(self.db, self.config)

    # --------------------------------------------------

    def handle_query(self, query: str):

        query = query.lower()

        if "best strategy" in query:
            return self.engine.run()

        if "simulate" in query:
            return self.engine.evaluate_strategy({

                "reward_rate": 0.03,
                "annual_fee": 200,
                "features": 0.6

            })

        if "portfolio" in query:
            return self.engine.clv_engine.portfolio_snapshot()

        return {

            "message": "Unknown query",
            "examples": [
                "best strategy",
                "simulate card",
                "portfolio snapshot"
            ]

        }