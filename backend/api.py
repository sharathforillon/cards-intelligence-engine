from fastapi import FastAPI, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import asyncio
import threading
import json
from pathlib import Path
from datetime import datetime, timezone

from backend.database import SessionLocal, init_db
from backend.config import load_bank_config

from backend.strategy_orchestrator import StrategyOrchestrator
from backend.terminal_router import TerminalRouter
from backend.competitor_intelligence import CompetitorIntelligence
from backend.strategy_engine import StrategyEngine
from backend.profitability_simulator import ProfitabilitySimulator

from backend.segment_intelligence_engine import SegmentIntelligenceEngine
from backend.spend_category_engine import SpendCategoryEngine
from backend.acquisition_funnel_engine import AcquisitionFunnelEngine
from backend.cannibalization_engine import CannibalizationEngine
from backend.ai_advisor import AIAdvisor
from backend.executive_report_engine import ExecutiveReportEngine

from backend.models import CompetitorCard
from backend.models_portfolio import MashreqCardPerformance, BankPortfolioSnapshot


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


class ProductLaunchInput(BaseModel):
    card_name: str | None = "New Card"
    annual_fee: int = 200
    reward_rate: float = 0.025
    category_rewards: dict | None = None  # e.g. {"dining": 0.05, "grocery": 0.03}
    fx_markup: float | None = 0.0
    benefits_strength: float | None = 0.65
    target_segment: str | None = None
    min_salary: int | None = None


class CannibalizationInput(BaseModel):
    reward_rate: float
    annual_fee: int = 200
    features_strength: float = 0.65
    target_segment: str | None = None
    category_rewards: dict | None = None


class AdvisorChatInput(BaseModel):
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


# ── Bank-level (Head of Cards) portfolio endpoints ───────────────────────────

@app.get("/portfolio/bank")
def get_bank_snapshot(db: Session = Depends(get_db)):
    """Return the most recent bank-level portfolio snapshot."""
    record = (
        db.query(BankPortfolioSnapshot)
        .order_by(BankPortfolioSnapshot.timestamp.desc())
        .first()
    )
    if not record:
        return {}
    return {
        "id":                 record.id,
        "period":             record.period,
        "market_share":       record.market_share,
        "nim":                record.nim,
        "cost_income_ratio":  record.cost_income_ratio,
        "rwa":                record.rwa,
        "raroc":              record.raroc,
        "roe":                record.roe,
        "provision_coverage": record.provision_coverage,
        "ntb_budget":         record.ntb_budget,
        "revenue_budget":     record.revenue_budget,
        "op_cost":            record.op_cost,
        "nps":                record.nps,
        "avg_bureau_score":   record.avg_bureau_score,
        "digital_penetration":record.digital_penetration,
        "timestamp":          record.timestamp.isoformat() if record.timestamp else None,
    }


@app.post("/portfolio/bank")
def save_bank_snapshot(data: dict = Body(...), db: Session = Depends(get_db)):
    """Save a new bank-level portfolio snapshot."""
    record = BankPortfolioSnapshot(
        period=data.get("period", ""),
        market_share=data.get("market_share", 0.0),
        nim=data.get("nim", 0.0),
        cost_income_ratio=data.get("cost_income_ratio", 0.0),
        rwa=data.get("rwa", 0.0),
        raroc=data.get("raroc", 0.0),
        roe=data.get("roe", 0.0),
        provision_coverage=data.get("provision_coverage", 0.0),
        ntb_budget=data.get("ntb_budget", 0),
        revenue_budget=data.get("revenue_budget", 0.0),
        op_cost=data.get("op_cost", 0.0),
        nps=data.get("nps", 0.0),
        avg_bureau_score=data.get("avg_bureau_score", 0.0),
        digital_penetration=data.get("digital_penetration", 0.0),
    )
    db.add(record)
    db.commit()
    return {"status": "saved", "id": record.id}


@app.get("/portfolio/bank/history")
def get_bank_history(db: Session = Depends(get_db)):
    """Return all bank-level snapshots ordered by period."""
    records = (
        db.query(BankPortfolioSnapshot)
        .order_by(BankPortfolioSnapshot.timestamp.desc())
        .limit(24)
        .all()
    )
    return [
        {
            "id":                 r.id,
            "period":             r.period,
            "market_share":       r.market_share,
            "nim":                r.nim,
            "cost_income_ratio":  r.cost_income_ratio,
            "rwa":                r.rwa,
            "raroc":              r.raroc,
            "roe":                r.roe,
            "provision_coverage": r.provision_coverage,
            "ntb_budget":         r.ntb_budget,
            "revenue_budget":     r.revenue_budget,
            "op_cost":            r.op_cost,
            "nps":                r.nps,
            "avg_bureau_score":   r.avg_bureau_score,
            "digital_penetration":r.digital_penetration,
            "timestamp":          r.timestamp.isoformat() if r.timestamp else None,
        }
        for r in records
    ]


# ============================================================
# SEGMENT INTELLIGENCE
# ============================================================

@app.get("/segments/profitability")
def segments_profitability(db: Session = Depends(get_db)):
    engine = SegmentIntelligenceEngine(db, config)
    return engine.rank_segments_by_profit()


@app.get("/segments/churn-risk")
def segments_churn_risk(db: Session = Depends(get_db)):
    engine = SegmentIntelligenceEngine(db, config)
    return engine.compute_churn_risk()


@app.get("/segments/growth-opportunities")
def segments_growth_opportunities(db: Session = Depends(get_db)):
    engine = SegmentIntelligenceEngine(db, config)
    return engine.compute_growth_opportunities()


# ============================================================
# SPEND CATEGORY INTELLIGENCE
# ============================================================

@app.get("/categories/metrics")
def categories_metrics(db: Session = Depends(get_db)):
    engine = SpendCategoryEngine(db)
    return engine.compute_category_metrics()


@app.get("/categories/underperforming")
def categories_underperforming(db: Session = Depends(get_db)):
    engine = SpendCategoryEngine(db)
    return engine.find_underperforming_categories()


# ============================================================
# ACQUISITION FUNNEL
# ============================================================

@app.get("/funnel/metrics")
def funnel_metrics(db: Session = Depends(get_db)):
    engine = AcquisitionFunnelEngine(db, config)
    return engine.compute_funnel_metrics()


@app.get("/funnel/channel-cac")
def funnel_channel_cac(db: Session = Depends(get_db)):
    engine = AcquisitionFunnelEngine(db, config)
    return engine.compute_channel_cac()


@app.get("/funnel/efficiency")
def funnel_efficiency(db: Session = Depends(get_db)):
    engine = AcquisitionFunnelEngine(db, config)
    return engine.compute_acquisition_efficiency()


# ============================================================
# PRODUCT LAUNCH SIMULATOR
# ============================================================

# Spend shares used to compute effective reward rate from category dict
_SPEND_SHARES = {
    "dining": 0.18, "grocery": 0.22, "travel": 0.15,
    "online": 0.20, "fuel": 0.08, "luxury_retail": 0.07,
}


def _effective_reward_rate(base_rate: float, category_rewards: dict | None) -> float:
    if not category_rewards:
        return base_rate
    weighted = sum(
        _SPEND_SHARES.get(cat, 0) * rate
        for cat, rate in category_rewards.items()
    )
    covered = sum(_SPEND_SHARES.get(cat, 0) for cat in category_rewards)
    return weighted + base_rate * max(0, 1 - covered)


@app.post("/simulate/product-launch")
def simulate_product_launch(input: ProductLaunchInput, db: Session = Depends(get_db)):
    effective_rr = _effective_reward_rate(
        input.reward_rate, input.category_rewards
    )

    orchestrator = StrategyOrchestrator(db, config)
    strategy_result = orchestrator.evaluate_strategy({
        "card_name": input.card_name,
        "reward_rate": effective_rr,
        "annual_fee": input.annual_fee,
        "features": input.benefits_strength or 0.65,
    })

    # Cannibalization sub-simulation
    cann_engine = CannibalizationEngine(db, config)
    cann_params = {
        "reward_rate": effective_rr,
        "annual_fee": input.annual_fee,
        "features_strength": input.benefits_strength or 0.65,
        "target_segment": input.target_segment,
        "category_rewards": input.category_rewards or {},
    }
    cann_result = cann_engine.simulate_cannibalization(cann_params)

    return {
        "card_name": input.card_name,
        "effective_reward_rate": round(effective_rr, 4),
        "strategy": strategy_result,
        "cannibalization": cann_result,
    }


# ============================================================
# CANNIBALIZATION ENGINE
# ============================================================

@app.post("/cannibalization/simulate")
def cannibalization_simulate(input: CannibalizationInput, db: Session = Depends(get_db)):
    engine = CannibalizationEngine(db, config)
    params = {
        "reward_rate": input.reward_rate,
        "annual_fee": input.annual_fee,
        "features_strength": input.features_strength,
        "target_segment": input.target_segment,
        "category_rewards": input.category_rewards or {},
    }
    return engine.simulate_cannibalization(params)


# ============================================================
# AI STRATEGY ADVISOR
# ============================================================

@app.get("/advisor/suggested-prompts")
def advisor_suggested_prompts(db: Session = Depends(get_db)):
    advisor = AIAdvisor(db, config)
    return advisor.get_suggested_prompts()


@app.post("/advisor/chat")
def advisor_chat(input: AdvisorChatInput, db: Session = Depends(get_db)):
    advisor = AIAdvisor(db, config)
    return advisor.chat(input.query)


# ============================================================
# EXECUTIVE STRATEGY OUTPUT
# ============================================================

@app.get("/executive/quarterly-memo")
def executive_quarterly_memo(db: Session = Depends(get_db)):
    engine = ExecutiveReportEngine(db, config)
    return engine.generate_quarterly_memo()


# ============================================================
# SCRAPER MANAGEMENT
# ============================================================

# ── Persistent scraper state ─────────────────────────────────────────────────
# State is written to disk so it survives browser closes, tab refreshes, and
# even full server restarts.  On startup the file is read back automatically.

_STATE_FILE = Path(__file__).resolve().parent.parent / "scraper_state.json"

_scraper_state: dict = {
    "running": False,
    "started_at": None,
    "finished_at": None,
    "cards_found": 0,
    "error": None,
}


def _load_scraper_state() -> None:
    """Read persisted state from disk.  Called once at import time."""
    try:
        if _STATE_FILE.exists():
            data = json.loads(_STATE_FILE.read_text())
            # If the server died while a scrape was in progress, correct it.
            if data.get("running"):
                data["running"] = False
                data["error"] = "Server restarted during scrape — please re-run."
                data["finished_at"] = datetime.now(timezone.utc).isoformat()
            _scraper_state.update(data)
    except Exception:
        pass  # fall back to defaults


def _save_scraper_state() -> None:
    """Write current state to disk so it outlives this process."""
    try:
        _STATE_FILE.write_text(json.dumps(_scraper_state, indent=2))
    except Exception:
        pass


# Restore state immediately when the module is loaded
_load_scraper_state()


def _run_scraper_in_thread() -> None:
    """
    Run the async scraper inside a dedicated event loop on a non-daemon
    background thread.  Using daemon=False means the thread will finish
    even if the FastAPI process receives SIGTERM — the OS will not kill it
    until the scrape completes or the machine shuts down.
    """
    from backend.scraper import run_scraper
    from backend.database import SessionLocal

    _scraper_state["running"] = True
    _scraper_state["started_at"] = datetime.now(timezone.utc).isoformat()
    _scraper_state["error"] = None
    _save_scraper_state()   # persist "running" immediately

    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(run_scraper())
        loop.close()

        db = SessionLocal()
        try:
            from backend.models import CompetitorCard as CC
            _scraper_state["cards_found"] = db.query(CC).count()
        finally:
            db.close()
    except Exception as e:
        _scraper_state["error"] = str(e)
    finally:
        _scraper_state["running"] = False
        _scraper_state["finished_at"] = datetime.now(timezone.utc).isoformat()
        _save_scraper_state()   # persist final state


@app.post("/scraper/run")
def scraper_run():
    """Trigger a background scrape of all bank card pages."""
    if _scraper_state["running"]:
        return {"status": "already_running", "started_at": _scraper_state["started_at"]}

    # daemon=False → thread keeps running even if the server receives SIGTERM
    t = threading.Thread(target=_run_scraper_in_thread, daemon=False)
    t.start()
    return {"status": "started", "started_at": _scraper_state["started_at"]}


@app.get("/scraper/status")
def scraper_status(db: Session = Depends(get_db)):
    """Return current scraper status + last-scraped timestamp from DB."""
    from backend.models import CompetitorCard as CC
    from sqlalchemy import func

    # Latest last_updated across all cards
    try:
        latest = db.query(func.max(CC.last_updated)).scalar()
        last_scraped = latest.isoformat() if latest else None
    except Exception:
        last_scraped = None

    total_cards = db.query(CC).count()

    return {
        "running": _scraper_state["running"],
        "started_at": _scraper_state["started_at"],
        "finished_at": _scraper_state["finished_at"],
        "error": _scraper_state["error"],
        "cards_in_db": total_cards,
        "last_scraped_at": last_scraped,   # from DB if available
    }