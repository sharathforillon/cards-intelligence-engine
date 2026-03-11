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
from backend.models_portfolio import MashreqCardPerformance, BankPortfolioSnapshot, StrategyRecord


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
    """
    Return the full card intelligence dataset.
    All 60+ attributes per card are included so the frontend can render
    rich detail drawers without additional API calls.
    """
    cards = db.query(CompetitorCard).all()
    results = []

    for c in cards:
        # Normalise cashback_rate: always return both the raw dict AND a scalar
        cb = c.cashback_rate
        if isinstance(cb, dict):
            cashback_scalar = cb.get("base") or next(iter(cb.values()), None)
        elif isinstance(cb, (int, float)):
            cashback_scalar = float(cb)
            cb = {"base": cashback_scalar}
        else:
            cashback_scalar = None
            cb = None

        results.append({
            # ── Core identity ───────────────────────────────────────────────
            "id":              c.id,
            "bank":            c.bank_name,
            "card_name":       c.card_name,
            "network":         c.network,
            "product_type":    c.product_type,
            "category":        c.card_category,
            "card_tier":       c.card_tier,
            "target_segment":  c.target_segment,
            "is_islamic":      c.is_islamic,
            "is_cobrand":      c.is_cobrand,
            # ── Fees ─────────────────────────────────────────────────────────
            "annual_fee":                  c.annual_fee,
            "annual_fee_waiver_condition": c.annual_fee_waiver_condition,
            "joining_fee":                 c.joining_fee,
            "supplementary_card_fee":      c.supplementary_card_fee,
            "late_payment_fee":            c.late_payment_fee,
            "overlimit_fee":               c.overlimit_fee,
            # ── Eligibility ──────────────────────────────────────────────────
            "min_salary":              c.min_salary,
            "min_income_annual":       c.min_income_annual,
            "nationality_eligibility": c.nationality_eligibility,
            "employment_type":         c.employment_type,
            "min_age":                 c.min_age,
            # ── Rewards ──────────────────────────────────────────────────────
            "reward_type":               c.reward_type,
            "cashback_rate":             cashback_scalar,
            "cashback_rate_detail":      cb,
            "base_reward_rate":          c.base_reward_rate,
            "dining_reward_rate":        c.dining_reward_rate,
            "grocery_reward_rate":       c.grocery_reward_rate,
            "fuel_reward_rate":          c.fuel_reward_rate,
            "travel_reward_rate":        c.travel_reward_rate,
            "online_reward_rate":        c.online_reward_rate,
            "international_reward_rate": c.international_reward_rate,
            "miles_rate":                c.miles_rate,
            "reward_cap_monthly":        c.reward_cap_monthly,
            "reward_cap_annual":         c.reward_cap_annual,
            "reward_expiry_months":      c.reward_expiry_months,
            "reward_currency":           c.reward_currency,
            "reward_exclusions":         c.reward_exclusions,
            "reward_redemption_rate":    c.reward_redemption_rate,
            # ── Welcome offer ─────────────────────────────────────────────────
            "welcome_bonus":              c.welcome_bonus,
            "welcome_bonus_miles":        c.welcome_bonus_miles,
            "welcome_bonus_points":       c.welcome_bonus_points,
            "welcome_spend_requirement":  c.welcome_spend_requirement,
            "welcome_period_days":        c.welcome_period_days,
            # ── Lounge ───────────────────────────────────────────────────────
            "lounge_access":               c.lounge_access,
            "lounge_program":              c.lounge_program,
            "lounge_visits_primary":       c.lounge_visits_primary,
            "lounge_visits_guest":         c.lounge_visits_guest,
            "lounge_visits_supplementary": c.lounge_visits_supplementary,
            "lounge_guest_fee_usd":        c.lounge_guest_fee_usd,
            "lounge_spend_condition":      c.lounge_spend_condition,
            # ── Travel ───────────────────────────────────────────────────────
            "travel_insurance":   c.travel_insurance,
            "airport_transfer":   c.airport_transfer,
            "airport_fast_track": c.airport_fast_track,
            "concierge_service":  c.concierge_service,
            "hotel_status":       c.hotel_status,
            "global_wifi":        c.global_wifi,
            # ── Lifestyle ─────────────────────────────────────────────────────
            "golf_rounds_annual":   c.golf_rounds_annual,
            "dining_benefits":      c.dining_benefits,
            "cinema_benefits":      c.cinema_benefits,
            "fitness_benefit":      c.fitness_benefit,
            "spa_benefit":          c.spa_benefit,
            "ride_hailing_benefit": c.ride_hailing_benefit,
            "entertainer_access":   c.entertainer_access,
            # ── Digital wallets ───────────────────────────────────────────────
            "apple_pay":   c.apple_pay,
            "google_pay":  c.google_pay,
            "samsung_pay": c.samsung_pay,
            "garmin_pay":  c.garmin_pay,
            # ── Forex & cash ──────────────────────────────────────────────────
            "fx_markup":             c.fx_markup,
            "cash_advance_fee_pct":  c.cash_advance_fee_pct,
            "cash_advance_interest": c.cash_advance_interest,
            # ── Financing ────────────────────────────────────────────────────
            "interest_rate_monthly":  c.interest_rate_monthly,
            "balance_transfer_rate":  c.balance_transfer_rate,
            "balance_transfer_months":c.balance_transfer_months,
            "installment_tenures":    c.installment_tenures,
            # ── Insurance ────────────────────────────────────────────────────
            "purchase_protection_days": c.purchase_protection_days,
            "extended_warranty_months": c.extended_warranty_months,
            "price_protection":         c.price_protection,
            "mobile_phone_protection":  c.mobile_phone_protection,
            # ── Co-brand ─────────────────────────────────────────────────────
            "cobrand_partner":         c.cobrand_partner,
            "cobrand_industry":        c.cobrand_industry,
            "miles_transfer_partners": c.miles_transfer_partners,
            "miles_transfer_ratio":    c.miles_transfer_ratio,
            # ── Spend conditions ──────────────────────────────────────────────
            "spend_conditions": c.spend_conditions,
            # ── Summary ───────────────────────────────────────────────────────
            "reward_summary": c.reward_summary,
            "last_updated":   c.last_updated.isoformat() if c.last_updated else None,
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


@app.get("/portfolio/strategy/history/{card_name}")
def strategy_history(card_name: str, db: Session = Depends(get_db)):
    """Return all previously generated (and stored) strategies for a card."""
    from urllib.parse import unquote
    card_name = unquote(card_name)
    records = (
        db.query(StrategyRecord)
        .filter(StrategyRecord.card_name == card_name)
        .order_by(StrategyRecord.generated_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "card_name": r.card_name,
            "title": r.title,
            "action": r.action,
            "rationale": r.rationale,
            "priority": r.priority,
            "status": r.status,
            "risk_level": r.risk_level,
            "confidence_pct": r.confidence_pct,
            "quick_win": bool(r.quick_win),
            "projected_profit_aed": r.projected_profit_aed,
            "projected_roe_lift_pp": r.projected_roe_lift_pp,
            "param_reward_rate": r.param_reward_rate,
            "param_annual_fee": r.param_annual_fee,
            "param_features": r.param_features,
            "actual_profit_delta_30d": r.actual_profit_delta_30d,
            "actual_profit_delta_60d": r.actual_profit_delta_60d,
            "actual_profit_delta_90d": r.actual_profit_delta_90d,
            "actual_roe_delta": r.actual_roe_delta,
            "performance_notes": r.performance_notes,
            "notes": r.notes,
            "generated_at": r.generated_at.isoformat() if r.generated_at else None,
            "approved_at": r.approved_at.isoformat() if r.approved_at else None,
            "executed_at": r.executed_at.isoformat() if r.executed_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        }
        for r in records
    ]


@app.patch("/portfolio/strategy/{strategy_id}/status")
def update_strategy_status(
    strategy_id: int,
    data: dict = Body(...),
    db: Session = Depends(get_db),
):
    """Update status/notes/performance for a strategy record."""
    from fastapi import HTTPException
    from datetime import datetime, timezone
    rec = db.query(StrategyRecord).filter(StrategyRecord.id == strategy_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Strategy not found")

    new_status = data.get("status")
    if new_status:
        rec.status = new_status
        now = datetime.now(timezone.utc)
        if new_status == "approved"    and not rec.approved_at:  rec.approved_at  = now
        if new_status == "in_progress" and not rec.executed_at:  rec.executed_at  = now
        if new_status in ("completed", "rejected") and not rec.completed_at: rec.completed_at = now

    if "notes" in data:                          rec.notes                 = data["notes"]
    if "actual_profit_delta_30d" in data:        rec.actual_profit_delta_30d = data["actual_profit_delta_30d"]
    if "actual_profit_delta_60d" in data:        rec.actual_profit_delta_60d = data["actual_profit_delta_60d"]
    if "actual_profit_delta_90d" in data:        rec.actual_profit_delta_90d = data["actual_profit_delta_90d"]
    if "actual_roe_delta"        in data:        rec.actual_roe_delta        = data["actual_roe_delta"]
    if "performance_notes"       in data:        rec.performance_notes       = data["performance_notes"]

    db.commit()
    return {"status": "updated", "id": strategy_id, "new_status": rec.status}


@app.post("/portfolio/strategy/generate/{card_name}")
def generate_card_strategy(card_name: str, db: Session = Depends(get_db)):
    """
    Manually triggered: generate 3 NEW AI strategies for a card.
    - Does NOT auto-call on every page load (POST requires explicit user action)
    - Deduplicates by action hash — never resurfaces the same strategy
    - Stores each new strategy in strategy_records table
    - Returns only the freshly generated strategies (not history)
    """
    import hashlib
    import anthropic
    from backend.config import ANTHROPIC_API_KEY
    from urllib.parse import unquote

    card_name = unquote(card_name)

    from fastapi import HTTPException

    # Load card data
    record = (
        db.query(MashreqCardPerformance)
        .filter(MashreqCardPerformance.card_name == card_name)
        .order_by(MashreqCardPerformance.timestamp.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Card not found")

    # Load existing action hashes to exclude from new suggestions
    existing_hashes = {
        r.action_hash
        for r in db.query(StrategyRecord.action_hash)
                   .filter(StrategyRecord.card_name == card_name)
                   .all()
    }

    # Compute derived metrics
    monthly_revenue = (record.interchange_income or 0) + (record.interest_income or 0)
    monthly_cost = (record.reward_cost or 0) + (record.credit_loss or 0)
    net_monthly = monthly_revenue - monthly_cost
    annual_profit = net_monthly * 12
    spend_per_card = (record.monthly_spend or 0) / max(record.active_cards or 1, 1)

    # Load top 3 competitor cashback rates for context
    from backend.models import CompetitorCard
    import json as _json
    competitors = db.query(CompetitorCard).filter(CompetitorCard.cashback_rate.isnot(None)).limit(10).all()
    comp_context = []
    for c in competitors[:5]:
        try:
            cb = _json.loads(c.cashback_rate) if isinstance(c.cashback_rate, str) else c.cashback_rate
            base = cb.get("base", 0) if isinstance(cb, dict) else 0
            comp_context.append(f"{c.bank_name} {c.card_name}: {base*100:.1f}% base cashback, AED {c.annual_fee or 0:.0f} annual fee")
        except Exception:
            pass

    card_context = f"""
CARD: {record.card_name}
Segment: {record.segment}
Active Cards: {record.active_cards:,}
Annual Fee: AED {record.annual_fee:.0f}
Reward Rate: {record.reward_rate*100:.1f}%
FX Markup: {record.fx_markup:.2f}%
Monthly Spend: AED {record.monthly_spend/1e6:.1f}M  (AED {spend_per_card:,.0f}/card)
Revolve Rate: {record.revolve_rate*100:.0f}%
NPL Rate: {record.npl_rate*100:.1f}%
Attrition Rate: {record.attrition_rate*100:.0f}%/yr
Monthly Revenue: AED {monthly_revenue:,.0f}
Monthly Costs: AED {monthly_cost:,.0f}
Net Monthly Profit: AED {net_monthly:,.0f}
Est. Annual Profit: AED {annual_profit/1e6:.1f}M

TOP COMPETITORS (for reference):
{chr(10).join(comp_context) if comp_context else "No competitor data available"}
"""

    already_tried = "\n".join(
        f"- {r.action[:100]}"
        for r in db.query(StrategyRecord)
                   .filter(StrategyRecord.card_name == card_name)
                   .order_by(StrategyRecord.generated_at.desc())
                   .limit(10)
                   .all()
    ) or "None yet"

    prompt = f"""You are the Head of Cards Strategy at Mashreq Bank UAE. Analyze this card's performance and provide exactly 3 NEW, DIFFERENT proactive strategies in strict JSON format.

{card_context}

STRATEGIES ALREADY TRIED (do NOT repeat these):
{already_tried}

Return ONLY valid JSON with this exact structure (no prose, no markdown):
{{
  "card_summary": "One sentence on the card's current strategic position",
  "strategies": [
    {{
      "priority": 1,
      "title": "Short action title (5-8 words)",
      "action": "Specific actionable imperative (what to change and to what value)",
      "rationale": "2-sentence explanation of why this improves profitability",
      "parameter_changes": {{
        "reward_rate": null,
        "annual_fee": null,
        "features": null
      }},
      "profit_impact_aed_annual": 0,
      "roe_improvement_pp": 0.0,
      "risk_level": "Low|Medium|High",
      "confidence_pct": 0,
      "quick_win": true
    }}
  ]
}}

Rules:
- Do NOT repeat strategies already tried above
- parameter_changes: null if unchanged, else new value (reward_rate decimal, annual_fee AED, features 0.3-1.0)
- profit_impact_aed_annual: realistic AED (positive = gain)
- confidence_pct: 60-95
- quick_win: true if implementable in < 90 days
- Prioritize by profit_impact_aed_annual descending
"""

    def _make_hash(cn: str, act: str) -> str:
        return hashlib.sha256(f"{cn}|{act[:120]}".encode()).hexdigest()

    def _save_strategies(strategies: list, card_summary: str) -> list:
        """Persist new strategies to DB, skip duplicates, return saved ones."""
        saved = []
        for s in strategies:
            h = _make_hash(card_name, s.get("action", ""))
            if h in existing_hashes:
                continue   # already in history — skip
            pc = s.get("parameter_changes", {})
            row = StrategyRecord(
                card_name          = record.card_name,
                title              = s.get("title"),
                action             = s.get("action"),
                rationale          = s.get("rationale"),
                priority           = s.get("priority", 1),
                action_hash        = h,
                param_reward_rate  = pc.get("reward_rate"),
                param_annual_fee   = pc.get("annual_fee"),
                param_features     = pc.get("features"),
                projected_profit_aed  = s.get("profit_impact_aed_annual", 0),
                projected_roe_lift_pp = s.get("roe_improvement_pp", 0),
                risk_level         = s.get("risk_level", "Medium"),
                confidence_pct     = s.get("confidence_pct", 70),
                quick_win          = 1 if s.get("quick_win") else 0,
                status             = "pending",
                generated_by       = "AI",
            )
            try:
                db.add(row)
                db.flush()   # get id before commit
                s["id"] = row.id
                saved.append(s)
            except Exception:
                db.rollback()
        try:
            db.commit()
        except Exception:
            db.rollback()
        return saved

    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=1200,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}],
        )
        import json as _json2
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = _json2.loads(raw)
        saved = _save_strategies(result.get("strategies", []), result.get("card_summary", ""))
        return {
            "card_name":        record.card_name,
            "card_summary":     result.get("card_summary", ""),
            "annual_profit_aed": round(annual_profit),
            "monthly_spend_aed": record.monthly_spend,
            "active_cards":     record.active_cards,
            "strategies":       saved,
            "generated_fresh":  True,
        }
    except Exception as e:
        # Fallback: rule-based strategies (also deduplicated + saved)
        fallback = []
        candidates = [
            {
                "priority": 1,
                "title": "Reduce churn with anniversary cashback",
                "action": f"Introduce AED {max(100, int(record.annual_fee * 0.3)):,} anniversary cashback credit to reduce {record.attrition_rate*100:.0f}% attrition",
                "rationale": f"High attrition costs ~AED {int(record.active_cards * record.attrition_rate * spend_per_card * 0.009 * 12):,}/yr in lost interchange. Anniversary reward has 4:1 ROI on retained customers.",
                "parameter_changes": {"reward_rate": None, "annual_fee": None, "features": round(min(1.0, (record.reward_rate or 0.02) * 5 + 0.1), 1)},
                "profit_impact_aed_annual": int(record.active_cards * record.attrition_rate * spend_per_card * 0.009 * 12 * 0.3),
                "roe_improvement_pp": 1.8, "risk_level": "Low", "confidence_pct": 78, "quick_win": True,
            },
            {
                "priority": 2,
                "title": "Boost reward rate to grow spend volume",
                "action": f"Raise base reward rate from {record.reward_rate*100:.1f}% to {min(record.reward_rate*100 + 0.5, 3.0):.1f}% to grow active spend",
                "rationale": "Below-market reward rate caps spend activation. A 0.5pp increase drives ~8% spend uplift, with net revenue gain at 4:1 revenue-to-reward ratio.",
                "parameter_changes": {"reward_rate": round(record.reward_rate + 0.005, 3), "annual_fee": None, "features": None},
                "profit_impact_aed_annual": int(record.monthly_spend * 0.08 * 0.009 * 12),
                "roe_improvement_pp": 1.2, "risk_level": "Low", "confidence_pct": 72, "quick_win": True,
            },
            {
                "priority": 3,
                "title": "Launch instalment plan to convert revolvers",
                "action": "Offer 0% instalment plan for purchases > AED 2,000 with 1.5% processing fee",
                "rationale": f"Revolve rate of {record.revolve_rate*100:.0f}% signals instalment demand. Processing fee generates incremental income while reducing credit risk concentration.",
                "parameter_changes": {"reward_rate": None, "annual_fee": None, "features": None},
                "profit_impact_aed_annual": int((record.outstanding_balance or 0) * 0.015 * 12 * 0.2),
                "roe_improvement_pp": 0.8, "risk_level": "Low", "confidence_pct": 68, "quick_win": True,
            },
            {
                "priority": 1,
                "title": "Reduce FX markup to capture international spend",
                "action": f"Lower FX markup from {record.fx_markup:.2f}% to 1.5% and add complimentary lounge visit",
                "rationale": "International spend carries 0.15pp higher interchange. Lower FX markup drives 15% more FX transactions at net positive margin.",
                "parameter_changes": {"reward_rate": None, "annual_fee": None, "features": 0.8},
                "profit_impact_aed_annual": int(record.monthly_spend * 0.15 * 0.009 * 12),
                "roe_improvement_pp": 1.0, "risk_level": "Medium", "confidence_pct": 65, "quick_win": False,
            },
        ]
        # Filter out already-tried, take up to 3 new ones
        for c in candidates:
            h = _make_hash(card_name, c["action"])
            if h not in existing_hashes:
                fallback.append(c)
            if len(fallback) == 3:
                break

        saved = _save_strategies(fallback, "")
        return {
            "card_name":        record.card_name,
            "card_summary":     f"{record.card_name}: AED {annual_profit/1e6:.1f}M annual profit, {record.attrition_rate*100:.0f}% attrition rate.",
            "annual_profit_aed": round(annual_profit),
            "monthly_spend_aed": record.monthly_spend,
            "active_cards":     record.active_cards,
            "strategies":       saved,
            "generated_fresh":  True,
        }


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