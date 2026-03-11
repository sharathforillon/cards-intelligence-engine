from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Boolean
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
    """
    Full-fidelity UAE credit card intelligence record.

    Covers every commercially significant attribute across 14 dimensions:
    identity, fees, eligibility, rewards, lounge, travel, lifestyle,
    digital wallets, forex, financing, insurance, co-brand, spend
    conditions, and metadata.
    """

    __tablename__ = "competitor_cards"

    id = Column(Integer, primary_key=True)

    # ── 1. Core Identity ──────────────────────────────────────────────────────
    bank_name       = Column(String)
    card_name       = Column(String)
    network         = Column(String)        # Visa / Mastercard / Amex / UnionPay
    product_type    = Column(String)        # credit / debit / prepaid
    card_category   = Column(String)        # cashback/travel/lifestyle/premium/islamic/rewards
    card_tier       = Column(String)        # Classic/Gold/Platinum/Signature/Infinite/World Elite
    target_segment  = Column(String)        # Mass / Mass Affluent / Affluent / HNW
    is_islamic      = Column(Boolean, default=False)
    is_cobrand      = Column(Boolean, default=False)

    # ── 2. Fee Structure ─────────────────────────────────────────────────────
    annual_fee                  = Column(Float)   # AED
    annual_fee_waiver_condition = Column(String)  # "Spend AED 120k/year"
    joining_fee                 = Column(Float)   # AED one-time
    supplementary_card_fee      = Column(Float)   # AED per supp card
    late_payment_fee            = Column(Float)   # AED
    overlimit_fee               = Column(Float)   # AED
    card_replacement_fee        = Column(Float)   # AED

    # ── 3. Eligibility ───────────────────────────────────────────────────────
    min_salary              = Column(Float)   # monthly AED
    min_income_annual       = Column(Float)   # annual AED
    nationality_eligibility = Column(String)  # "All" / "UAE Nationals only" / "Expats"
    employment_type         = Column(String)  # "Salaried" / "Self-Employed" / "Both"
    min_age                 = Column(Integer) # years

    # ── 4. Rewards & Earn ────────────────────────────────────────────────────
    reward_type                 = Column(String)  # cashback / miles / points / skywards
    base_reward_rate            = Column(Float)   # decimal  e.g. 0.01 = 1%
    dining_reward_rate          = Column(Float)
    grocery_reward_rate         = Column(Float)
    fuel_reward_rate            = Column(Float)
    travel_reward_rate          = Column(Float)
    online_reward_rate          = Column(Float)
    international_reward_rate   = Column(Float)
    cashback_rate               = Column(JSON)    # legacy + structured breakdown dict
    miles_rate                  = Column(Float)   # miles per AED
    reward_cap_monthly          = Column(Float)   # AED cap per month
    reward_cap_annual           = Column(Float)   # AED cap per year
    reward_expiry_months        = Column(Integer) # 0 = never expires
    reward_currency             = Column(String)  # "AED" / "miles" / "Skywards"
    reward_exclusions           = Column(String)  # "Govt txns, utilities excluded"
    reward_redemption_rate      = Column(Float)   # AED value per point/mile

    # ── 5. Welcome / Acquisition Offer ───────────────────────────────────────
    welcome_bonus               = Column(Float)   # total value in AED
    welcome_bonus_miles         = Column(Integer)
    welcome_bonus_points        = Column(Integer)
    welcome_bonus_cashback_aed  = Column(Float)
    welcome_spend_requirement   = Column(Float)   # AED to spend to unlock
    welcome_period_days         = Column(Integer) # window in days

    # ── 6. Airport Lounge Access ─────────────────────────────────────────────
    lounge_access               = Column(String)  # "Unlimited" / "8x/year" / "None"
    lounge_program              = Column(String)  # LoungeKey / DragonPass / Priority Pass
    lounge_visits_primary       = Column(String)  # "Unlimited" or "8"
    lounge_visits_guest         = Column(Integer) # free guest visits per year
    lounge_visits_supplementary = Column(String)  # "Unlimited" / "4" / "None"
    lounge_guest_fee_usd        = Column(Float)   # USD fee after free-guest limit
    lounge_spend_condition      = Column(String)  # "Spend AED 5k previous month"

    # ── 7. Travel Benefits ───────────────────────────────────────────────────
    travel_insurance            = Column(String)  # "Comprehensive" / "Basic" / "None"
    airport_transfer            = Column(String)  # "2x/year" / "None"
    airport_fast_track          = Column(String)  # "Yes" / "None"
    concierge_service           = Column(String)  # "Visa Infinite Concierge" / "None"
    hotel_status                = Column(String)  # "Hilton Gold" / "Marriott Gold" / "None"
    global_wifi                 = Column(String)  # "Boingo" / "None"
    roadside_assistance         = Column(String)  # "Yes" / "None"

    # ── 8. Lifestyle & Entertainment ─────────────────────────────────────────
    golf_rounds_annual          = Column(Integer) # complimentary rounds
    dining_benefits             = Column(String)  # "Buy 1 Get 1 at 200+ restaurants"
    cinema_benefits             = Column(String)  # "50% off VOX / Reel / Novo"
    fitness_benefit             = Column(String)  # "Talabat Pro / Fitness First"
    spa_benefit                 = Column(String)
    ride_hailing_benefit        = Column(String)  # "Careem cashback"
    entertainer_access          = Column(Boolean, default=False)

    # ── 9. Digital Wallet Compatibility ──────────────────────────────────────
    apple_pay   = Column(Boolean, default=False)
    google_pay  = Column(Boolean, default=False)
    samsung_pay = Column(Boolean, default=False)
    garmin_pay  = Column(Boolean, default=False)

    # ── 10. Forex & Cash Advance ─────────────────────────────────────────────
    fx_markup               = Column(Float)   # % foreign txn fee  e.g. 3.09
    cash_advance_fee_pct    = Column(Float)   # % of advance  e.g. 3.0
    cash_advance_min_fee    = Column(Float)   # AED minimum
    cash_advance_interest   = Column(Float)   # monthly rate %

    # ── 11. Financing / Revolving ────────────────────────────────────────────
    interest_rate_monthly       = Column(Float)   # % per month  e.g. 3.49
    balance_transfer_rate       = Column(Float)   # promotional BT rate %
    balance_transfer_months     = Column(Integer) # 0% promo period
    balance_transfer_fee_pct    = Column(Float)   # BT processing fee %
    installment_tenures         = Column(String)  # "3/6/12/24 months"
    min_payment_pct             = Column(Float)   # minimum payment % of outstanding

    # ── 12. Insurance & Purchase Protection ──────────────────────────────────
    purchase_protection_days    = Column(Integer) # days covered
    extended_warranty_months    = Column(Integer) # extra months
    price_protection            = Column(Boolean, default=False)
    mobile_phone_protection     = Column(Boolean, default=False)
    lost_card_liability         = Column(Float)   # AED max liability

    # ── 13. Co-brand & Miles Transfer ────────────────────────────────────────
    cobrand_partner         = Column(String)  # "Emirates" / "noon" / "Carrefour"
    cobrand_industry        = Column(String)  # "Travel" / "Retail" / "E-commerce"
    miles_transfer_partners = Column(JSON)    # ["Emirates", "Etihad", "Air Arabia"]
    miles_transfer_ratio    = Column(String)  # "1:1" / "2:1"

    # ── 14. Spend Conditions (Hidden Benefits) ────────────────────────────────
    spend_conditions        = Column(JSON)    # {"lounge": "Spend 5k/mo", ...}

    # ── Metadata & Summary ────────────────────────────────────────────────────
    reward_summary  = Column(String)  # one-line human-readable benefit summary
    page_hash       = Column(String)
    last_updated    = Column(DateTime, default=lambda: datetime.now(timezone.utc))


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
