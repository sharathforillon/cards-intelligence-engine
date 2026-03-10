from fastapi import FastAPI
from backend.database import init_db
from backend.finance_engine import FinanceEngine

app = FastAPI()

# Initialize DB on import (FastAPI startup)
init_db()

finance_engine = FinanceEngine()


@app.get("/")
def home():
    return {"message": "UAE Credit Card Strategy Engine Running"}


@app.get("/simulate")
def simulate():

    result = finance_engine.calculate_profit(
        spend=1000000,
        interchange_rate=0.02,
        revolve_balance=200000,
        interest_rate=0.36,
        reward_cost=15000,
        credit_loss=5000
    )

    return result


# Allows running DB init manually via `python -m backend.main`
def main():
    print("Initializing database...")
    init_db()
    print("Database initialized successfully.")


if __name__ == "__main__":
    main()