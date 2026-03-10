from fastapi import FastAPI, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.database import SessionLocal, init_db
from backend.config import load_bank_config

from backend.strategy_orchestrator import StrategyOrchestrator
from backend.terminal_router import TerminalRouter
from backend.competitor_intelligence import CompetitorIntelligence
from backend.strategy_engine import StrategyEngine
from backend.profitability_simulator import ProfitabilitySimulator

from backend.models import CompetitorCard
from backend.models_portfolio import MashreqCardPerformance


app = FastAPI(title="Cards Strategy Engine")


# ---------------------------------------------------
# CORS
# ---------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------
# DATABASE DEPENDENCY
# ---------------------------------------------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------
# STARTUP EVENT (creates tables)
# ---------------------------------------------------

@app.on_event("startup")
def startup():
    init_db()


# ---------------------------------------------------
# GLOBAL COMPONENTS
# ---------------------------------------------------

config = load_bank_config()
terminal = TerminalRouter()


# ---------------------------------------------------
# INPUT MODELS
# ---------------------------------------------------

class StrategyInput(BaseModel):
    card_name: str | None = None
    reward_rate: float
    annual_fee: int
    features: float | None = 0.6


class QueryInput(BaseModel):
    query: str


# ---------------------------------------------------
# COMPETITOR INTELLIGENCE
# ---------------------------------------------------

@app.get("/competitor-feed")
def competitor_feed(db: Session = Depends(get_db)):

    intel = CompetitorIntelligence(db)

    events = intel.latest_events()

    return events


# ---------------------------------------------------
# STRATEGY OPTIMIZER
# ---------------------------------------------------

@app.get("/strategy/optimizer")
def strategy_optimizer(db: Session = Depends(get_db)):

    simulator = ProfitabilitySimulator(db, config)

    strategies = []

    reward_levels = [0.02, 0.03, 0.04, 0.05]
    fee_levels = [0, 200, 400]

    for reward in reward_levels:

        for fee in fee_levels:

            result = simulator.simulate_strategy({

                "reward_rate": reward,
                "annual_fee": fee,
                "reward_type": "cashback"

            })

            strategies.append({

                "reward_rate": reward,
                "annual_fee": fee,
                "portfolio_clv": result["portfolio_clv"]

            })

    strategies.sort(key=lambda x: x["portfolio_clv"], reverse=True)

    return strategies[:5]


# ---------------------------------------------------
# CARD DATABASE
# ---------------------------------------------------

@app.get("/cards")
def get_cards(db: Session = Depends(get_db)):

    cards = db.query(CompetitorCard).all()

    results = []

    for c in cards:

        # cashback_rate is stored as JSON dict; extract base rate as a scalar
        cb = c.cashback_rate
        if isinstance(cb, dict):
            cashback_scalar = cb.get("base") or next(iter(cb.values()), None)
        elif isinstance(cb, (int, float)):
            cashback_scalar = float(cb)
        else:
            cashback_scalar = None

        results.append({

            "card_name": c.card_name,
            "bank": c.bank_name,
            "network": c.network,
            "annual_fee": c.annual_fee,
            "cashback_rate": cashback_scalar,
            "miles_rate": c.miles_rate,
            "welcome_bonus": c.welcome_bonus,
            "fx_markup": c.fx_markup,
            "min_salary": c.min_salary,
            "reward_summary": c.reward_summary,
            "category": c.card_category,

        })

    return results


# ---------------------------------------------------
# STRATEGY NARRATIVE ENGINE
# ---------------------------------------------------

@app.get("/strategy/narrative")
def strategy_narrative(db: Session = Depends(get_db)):

    engine = StrategyEngine(db)

    insight = engine.generate_narrative()

    return {

        "summary": insight

    }


# ---------------------------------------------------
# STRATEGY SIMULATION
# ---------------------------------------------------

@app.post("/simulate")
def simulate(input: StrategyInput, db: Session = Depends(get_db)):

    orchestrator = StrategyOrchestrator(db, config)

    baseline = None

    if input.card_name:
        record = (
            db.query(MashreqCardPerformance)
            .filter(MashreqCardPerformance.card_name == input.card_name)
            .order_by(MashreqCardPerformance.timestamp.desc())
            .first()
        )
        if record:
            baseline = {
                "card_name": record.card_name,
                "segment": record.segment,
                "annual_fee": record.annual_fee,
                "reward_rate": record.reward_rate,
                "fx_markup": record.fx_markup,
                "active_cards": record.active_cards,
                "monthly_spend": record.monthly_spend,
                "utilization_rate": record.utilization_rate,
            }

    result = orchestrator.evaluate_strategy(
        {
            "card_name": input.card_name,
            "reward_rate": input.reward_rate,
            "annual_fee": input.annual_fee,
            "features": input.features or 0.6,
            "baseline": baseline,
        }
    )

    return result


# ---------------------------------------------------
# TERMINAL QUERY ENGINE
# ---------------------------------------------------

@app.post("/query")
def query(input: QueryInput):

    return terminal.handle_query(input.query)


# ---------------------------------------------------
# PORTFOLIO ANALYTICS
# ---------------------------------------------------

@app.get("/portfolio/cards")
def portfolio_cards(db: Session = Depends(get_db)):

    records = db.query(MashreqCardPerformance).order_by(MashreqCardPerformance.timestamp.desc()).all()

    cards = []

    for r in records:

        cards.append({

            "id": r.id,
            "card_name": r.card_name,
            "segment": r.segment,

            # Portfolio Volume
            "total_enr": r.total_enr or 0,
            "active_cards": r.active_cards or 0,
            "activation_rate": r.activation_rate or 0.0,
            "attrition_rate": r.attrition_rate or 0.0,

            # Product Design
            "annual_fee": r.annual_fee or 0.0,
            "reward_rate": r.reward_rate or 0.0,
            "fx_markup": r.fx_markup or 0.0,

            # Spend & Credit
            "monthly_spend": r.monthly_spend or 0.0,
            "avg_credit_limit": r.avg_credit_limit or 0.0,
            "outstanding_balance": r.outstanding_balance or 0.0,
            "utilization_rate": r.utilization_rate or 0.0,
            "revolve_rate": r.revolve_rate or 0.0,

            # Revenue
            "interchange_income": r.interchange_income or 0.0,
            "interest_income": r.interest_income or 0.0,

            # Costs & Risk
            "reward_cost": r.reward_cost or 0.0,
            "credit_loss": r.credit_loss or 0.0,
            "npl_rate": r.npl_rate or 0.0,
            "delinquency_30dpd": r.delinquency_30dpd or 0.0,

            # Acquisition
            "acquisition_ntb": r.acquisition_ntb or 0,
            "acquisition_etb": r.acquisition_etb or 0,
            "cac_cost": r.cac_cost or 0.0,

            "timestamp": r.timestamp.isoformat() if r.timestamp else None,

        })

    return cards


@app.post("/portfolio/update")
def update_portfolio(data: dict = Body(...), db: Session = Depends(get_db)):

    record = MashreqCardPerformance(

        card_name=data["card_name"],
        segment=data.get("segment", "portfolio"),

        # Portfolio Volume
        total_enr=data.get("total_enr", 0),
        active_cards=data.get("active_cards", 0),
        activation_rate=data.get("activation_rate", 0.0),
        attrition_rate=data.get("attrition_rate", 0.0),

        # Product Design
        annual_fee=data.get("annual_fee", 0.0),
        reward_rate=data.get("reward_rate", 0.0),
        fx_markup=data.get("fx_markup", 0.0),

        # Spend & Credit
        monthly_spend=data.get("monthly_spend", 0.0),
        avg_credit_limit=data.get("avg_credit_limit", 0.0),
        outstanding_balance=data.get("outstanding_balance", 0.0),
        utilization_rate=data.get("utilization_rate", 0.0),
        revolve_rate=data.get("revolve_rate", 0.35),

        # Revenue
        interchange_income=data.get("interchange_income", 0.0),
        interest_income=data.get("interest_income", 0.0),

        # Costs & Risk
        reward_cost=data.get("reward_cost", 0.0),
        credit_loss=data.get("credit_loss", 0.0),
        npl_rate=data.get("npl_rate", 0.0),
        delinquency_30dpd=data.get("delinquency_30dpd", 0.0),

        # Acquisition
        acquisition_ntb=data.get("acquisition_ntb", 0),
        acquisition_etb=data.get("acquisition_etb", 0),
        cac_cost=data.get("cac_cost", 0.0),

    )

    db.add(record)
    db.commit()

    return {"status": "portfolio updated", "id": record.id}


@app.delete("/portfolio/cards/{card_id}")
def delete_portfolio_card(card_id: int, db: Session = Depends(get_db)):

    record = db.query(MashreqCardPerformance).filter(MashreqCardPerformance.id == card_id).first()

    if not record:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Card not found")

    db.delete(record)
    db.commit()

    return {"status": "deleted", "id": card_id}