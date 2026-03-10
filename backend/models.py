from sqlalchemy import Column, Integer, String, Float, DateTime, JSON
from sqlalchemy.orm import declarative_base
from datetime import datetime, timezone

Base = declarative_base()


class CompetitorAlert(Base):

    __tablename__ = "competitor_alerts"

    id = Column(Integer, primary_key=True)
    bank_name = Column(String)
    change_type = Column(String)
    detected_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Bank(Base):

    __tablename__ = "banks"

    id = Column(Integer, primary_key=True)
    bank_name = Column(String, unique=True)


class CompetitorCard(Base):

    __tablename__ = "competitor_cards"

    id = Column(Integer, primary_key=True)

    bank_name = Column(String)
    card_name = Column(String)
    network = Column(String)                 # Visa / Mastercard / AMEX
    product_type = Column(String)            # credit / debit / loan_card
    card_category = Column(String)           # cashback / travel / lifestyle / premium / islamic / rewards

    annual_fee = Column(Float)
    min_salary = Column(Float)               # minimum monthly salary in AED

    cashback_rate = Column(JSON)             # JSON: {"base": 0.01, "dining": 0.05, ...}
    miles_rate = Column(Float)              # miles/points per AED spent
    welcome_bonus = Column(Float)           # welcome bonus value in AED

    fx_markup = Column(Float)               # FX markup %
    reward_cap = Column(Float)

    lounge_access = Column(String)          # "Unlimited" / "8x/year" / "None"
    travel_insurance = Column(String)       # "Included" / "Not included"
    reward_summary = Column(String)         # one-line benefit summary

    page_hash = Column(String)
    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class PortfolioData(Base):

    __tablename__ = "portfolio_data"

    id = Column(Integer, primary_key=True)

    active_cards = Column(Integer)

    avg_spend = Column(Float)

    revolve_rate = Column(Float)

    interest_rate = Column(Float)

    reward_cost = Column(Float)

    default_rate = Column(Float)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AOPTargets(Base):

    __tablename__ = "aop_targets"

    id = Column(Integer, primary_key=True)

    month = Column(String)

    target_spend = Column(Float)

    target_profit = Column(Float)


class SystemConfig(Base):

    __tablename__ = "system_config"

    id = Column(Integer, primary_key=True)

    focus_bank = Column(String, default="Mashreq")