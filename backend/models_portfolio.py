from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON
from backend.database import Base
import datetime


class BankPortfolioSnapshot(Base):
    """Bank-level (Head of Cards) metrics — one snapshot per period."""

    __tablename__ = "bank_portfolio_snapshots"

    id     = Column(Integer, primary_key=True)
    period = Column(String)   # "YYYY-MM" e.g. "2026-03"

    # ── Market Position ────────────────────────────────────────────────────────
    market_share        = Column(Float, default=0.0)   # % of UAE CC market by spend
    nim                 = Column(Float, default=0.0)   # Net Interest Margin %
    cost_income_ratio   = Column(Float, default=0.0)   # Cost-to-Income Ratio %

    # ── Capital Efficiency ─────────────────────────────────────────────────────
    rwa                 = Column(Float, default=0.0)   # Risk-Weighted Assets AED M
    raroc               = Column(Float, default=0.0)   # Risk-Adj Return on Capital %
    roe                 = Column(Float, default=0.0)   # Return on Equity %
    provision_coverage  = Column(Float, default=0.0)   # Provision Coverage Ratio %

    # ── Budget & Operational Cost ──────────────────────────────────────────────
    ntb_budget          = Column(Integer, default=0)   # Monthly NTB card issuance target
    revenue_budget      = Column(Float, default=0.0)   # Monthly revenue target (AED)
    op_cost             = Column(Float, default=0.0)   # Monthly operational cost (AED)

    # ── Customer Intelligence ──────────────────────────────────────────────────
    nps                 = Column(Float, default=0.0)   # Net Promoter Score  (-100 to 100)
    avg_bureau_score    = Column(Float, default=0.0)   # Portfolio avg credit bureau score
    digital_penetration = Column(Float, default=0.0)   # % customers on mobile / digital

    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class MashreqCardPerformance(Base):

    __tablename__ = "mashreq_card_performance"

    id = Column(Integer, primary_key=True)

    card_name = Column(String)
    segment = Column(String)

    # ── Portfolio Volume ─────────────────────────────────────────────────────
    total_enr = Column(Integer, default=0)        # Total enrolled/issued (open accounts)
    active_cards = Column(Integer, default=0)      # Transacting-active cards (spent in last 90d)
    activation_rate = Column(Float, default=0.0)  # active / total_enr
    attrition_rate = Column(Float, default=0.0)   # annual voluntary + involuntary churn (0–1)

    # ── Product Design ────────────────────────────────────────────────────────
    annual_fee = Column(Float, default=0.0)
    reward_rate = Column(Float, default=0.0)       # cashback / miles earn rate (fraction)
    fx_markup = Column(Float, default=0.0)         # FX transaction markup %

    # ── Spend & Credit ────────────────────────────────────────────────────────
    monthly_spend = Column(Float, default=0.0)             # total card spend in AED
    avg_credit_limit = Column(Float, default=0.0)          # average limit per card in AED
    outstanding_balance = Column(Float, default=0.0)       # total revolving balance in AED
    utilization_rate = Column(Float, default=0.0)          # outstanding / (enr × avg_limit)
    revolve_rate = Column(Float, default=0.0)              # % of spend that revolves

    # ── Revenue ───────────────────────────────────────────────────────────────
    interchange_income = Column(Float, default=0.0)
    interest_income = Column(Float, default=0.0)

    # ── Costs & Risk ──────────────────────────────────────────────────────────
    reward_cost = Column(Float, default=0.0)
    credit_loss = Column(Float, default=0.0)               # realized credit loss in AED
    npl_rate = Column(Float, default=0.0)                  # non-performing loan rate (0–1)
    delinquency_30dpd = Column(Float, default=0.0)         # 30+ days past due rate (0–1)

    # ── Acquisition ───────────────────────────────────────────────────────────
    acquisition_ntb = Column(Integer, default=0)           # new-to-bank acquisitions this month
    acquisition_etb = Column(Integer, default=0)           # existing-to-bank (cross-sell)
    cac_cost = Column(Float, default=0.0)                  # customer acquisition cost per card (AED)

    timestamp = Column(DateTime, default=datetime.datetime.utcnow)


class StrategyRecord(Base):
    """
    Persistent log of every strategy generated + its execution and performance.
    One row per strategy — deduplicated by action_hash so the same strategy is
    never suggested again.
    """
    __tablename__ = "strategy_records"

    id = Column(Integer, primary_key=True)

    # ── Strategy identity ─────────────────────────────────────────────────────
    card_name      = Column(String, nullable=False, index=True)
    title          = Column(String)
    action         = Column(Text)
    rationale      = Column(Text)
    priority       = Column(Integer, default=1)

    # SHA-256 of (card_name + action[:120]) — prevents repeat suggestions
    action_hash    = Column(String(64), unique=True, index=True)

    # ── Recommended parameters ────────────────────────────────────────────────
    param_reward_rate = Column(Float)
    param_annual_fee  = Column(Float)
    param_features    = Column(Float)

    # ── Projected impact ──────────────────────────────────────────────────────
    projected_profit_aed  = Column(Float, default=0.0)
    projected_roe_lift_pp = Column(Float, default=0.0)
    risk_level            = Column(String, default="Medium")
    confidence_pct        = Column(Integer, default=70)
    quick_win             = Column(Integer, default=0)   # bool as int

    # ── Execution tracking ────────────────────────────────────────────────────
    # pending | approved | in_progress | completed | rejected | monitoring
    status      = Column(String, default="pending")
    approved_at = Column(DateTime)
    executed_at = Column(DateTime)
    completed_at= Column(DateTime)
    notes       = Column(Text)

    # ── Performance delta (filled at 30/60/90-day check-ins) ─────────────────
    actual_profit_delta_30d = Column(Float)
    actual_profit_delta_60d = Column(Float)
    actual_profit_delta_90d = Column(Float)
    actual_roe_delta        = Column(Float)
    performance_notes       = Column(Text)

    # ── Metadata ──────────────────────────────────────────────────────────────
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)
    generated_by = Column(String, default="AI")