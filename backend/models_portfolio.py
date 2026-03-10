from sqlalchemy import Column, Integer, String, Float, DateTime
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