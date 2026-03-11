"""
AI Parser — comprehensive credit card attribute extractor.

Uses GPT-4o-mini to extract up to 60 structured fields from raw bank
marketing page text.  The schema mirrors CompetitorCard exactly so the
scraper can write results straight to the DB.
"""

import json
import logging
import re
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

# Always resolve .env from the project root
_project_root = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=_project_root / ".env", override=True)

import os
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY not found. Check your .env file.")

client = OpenAI(api_key=OPENAI_API_KEY)
logger = logging.getLogger("AIParser")


# ── Schema defaults (all nullable) ───────────────────────────────────────────

CARD_SCHEMA: dict = {
    # Identity
    "card_name": None, "bank": None, "network": None,
    "card_tier": None, "card_category": None, "target_segment": None,
    "is_islamic": False, "is_cobrand": False,
    # Fees
    "annual_fee": None, "annual_fee_waiver_condition": None, "joining_fee": None,
    "supplementary_card_fee": None, "late_payment_fee": None,
    "overlimit_fee": None, "card_replacement_fee": None,
    # Eligibility
    "min_salary": None, "min_income_annual": None,
    "nationality_eligibility": None, "employment_type": None, "min_age": None,
    # Rewards
    "reward_type": None, "base_reward_rate": None,
    "dining_reward_rate": None, "grocery_reward_rate": None,
    "fuel_reward_rate": None, "travel_reward_rate": None,
    "online_reward_rate": None, "international_reward_rate": None,
    "cashback_rate": None, "miles_rate": None,
    "reward_cap_monthly": None, "reward_cap_annual": None,
    "reward_expiry_months": None, "reward_currency": None,
    "reward_exclusions": None, "reward_redemption_rate": None,
    # Welcome offer
    "welcome_bonus": None, "welcome_bonus_miles": None,
    "welcome_bonus_points": None, "welcome_bonus_cashback_aed": None,
    "welcome_spend_requirement": None, "welcome_period_days": None,
    # Lounge
    "lounge_access": None, "lounge_program": None,
    "lounge_visits_primary": None, "lounge_visits_guest": None,
    "lounge_visits_supplementary": None, "lounge_guest_fee_usd": None,
    "lounge_spend_condition": None,
    # Travel
    "travel_insurance": None, "airport_transfer": None,
    "airport_fast_track": None, "concierge_service": None,
    "hotel_status": None, "global_wifi": None, "roadside_assistance": None,
    # Lifestyle
    "golf_rounds_annual": None, "dining_benefits": None,
    "cinema_benefits": None, "fitness_benefit": None,
    "spa_benefit": None, "ride_hailing_benefit": None, "entertainer_access": False,
    # Digital wallets
    "apple_pay": False, "google_pay": False,
    "samsung_pay": False, "garmin_pay": False,
    # Forex & cash
    "fx_markup": None, "cash_advance_fee_pct": None,
    "cash_advance_min_fee": None, "cash_advance_interest": None,
    # Financing
    "interest_rate_monthly": None, "balance_transfer_rate": None,
    "balance_transfer_months": None, "balance_transfer_fee_pct": None,
    "installment_tenures": None, "min_payment_pct": None,
    # Insurance
    "purchase_protection_days": None, "extended_warranty_months": None,
    "price_protection": False, "mobile_phone_protection": False,
    "lost_card_liability": None,
    # Co-brand
    "cobrand_partner": None, "cobrand_industry": None,
    "miles_transfer_partners": None, "miles_transfer_ratio": None,
    # Spend conditions
    "spend_conditions": None,
    # Summary
    "reward_summary": None,
}

_SYSTEM_PROMPT = (
    "You are a senior credit card product analyst at a UAE bank. "
    "Extract precise, structured card attributes from marketing page text. "
    "Return ONLY valid JSON — no prose, no markdown fences. "
    "Use null for any field not explicitly stated. "
    "All monetary values in AED unless stated otherwise. "
    "Rates as decimals (5% → 0.05). Boolean fields: true/false."
)

_USER_TEMPLATE = """Extract credit card attributes for:
Card: {card_name}
Bank: {bank}

Return JSON with EXACTLY these keys (null where not found):

IDENTITY: card_name, bank, network (Visa/Mastercard/Amex/UnionPay), card_tier (Classic/Gold/Platinum/Signature/Infinite/World Elite), card_category (cashback/travel/lifestyle/premium/islamic/rewards), target_segment (Mass/Mass Affluent/Affluent/HNW), is_islamic (bool), is_cobrand (bool)

FEES (AED): annual_fee, annual_fee_waiver_condition, joining_fee, supplementary_card_fee, late_payment_fee, overlimit_fee, card_replacement_fee

ELIGIBILITY: min_salary (monthly AED), min_income_annual (AED), nationality_eligibility, employment_type, min_age

REWARDS: reward_type (cashback/miles/points/skywards), base_reward_rate (decimal), dining_reward_rate, grocery_reward_rate, fuel_reward_rate, travel_reward_rate, online_reward_rate, international_reward_rate, cashback_rate (JSON dict eg {{"base":0.01,"dining":0.05}}), miles_rate (miles per AED), reward_cap_monthly (AED), reward_cap_annual (AED), reward_expiry_months (0=never), reward_currency, reward_exclusions, reward_redemption_rate (AED value per point)

WELCOME OFFER: welcome_bonus (AED value), welcome_bonus_miles, welcome_bonus_points, welcome_bonus_cashback_aed, welcome_spend_requirement (AED), welcome_period_days

LOUNGE: lounge_access ("Unlimited"/"8x per year"/"None"), lounge_program (LoungeKey/DragonPass/Priority Pass/Marhaba), lounge_visits_primary (string: "Unlimited" or number), lounge_visits_guest (integer), lounge_visits_supplementary, lounge_guest_fee_usd (USD), lounge_spend_condition

TRAVEL: travel_insurance (Comprehensive/Basic/None), airport_transfer, airport_fast_track, concierge_service, hotel_status, global_wifi, roadside_assistance

LIFESTYLE: golf_rounds_annual (integer), dining_benefits, cinema_benefits, fitness_benefit, spa_benefit, ride_hailing_benefit, entertainer_access (bool)

DIGITAL WALLETS: apple_pay (bool), google_pay (bool), samsung_pay (bool), garmin_pay (bool)

FOREX & CASH: fx_markup (%), cash_advance_fee_pct (%), cash_advance_min_fee (AED), cash_advance_interest (monthly %)

FINANCING: interest_rate_monthly (%), balance_transfer_rate (%), balance_transfer_months, balance_transfer_fee_pct (%), installment_tenures, min_payment_pct (%)

INSURANCE: purchase_protection_days, extended_warranty_months, price_protection (bool), mobile_phone_protection (bool), lost_card_liability (AED)

CO-BRAND: cobrand_partner, cobrand_industry (Travel/Retail/E-commerce/Dining), miles_transfer_partners (JSON array), miles_transfer_ratio

SPEND CONDITIONS: spend_conditions (JSON dict of hidden thresholds eg {{"lounge":"Spend AED 5k/month"}})

SUMMARY: reward_summary (one sentence: the card's best value proposition)

--- PAGE TEXT ---
{page_text}
"""


def extract_metrics_ai(card_name: str, bank: str, page_text: str) -> dict:
    """
    Extract all 60+ card attributes from scraped page text via GPT-4o-mini.

    Returns a dict with keys matching CARD_SCHEMA.  All missing fields are
    set to their schema defaults (None / False).  Never raises.
    """
    prompt = _USER_TEMPLATE.format(
        card_name=card_name,
        bank=bank,
        page_text=page_text[:14_000],
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user",   "content": prompt},
            ],
        )
        data = json.loads(response.choices[0].message.content)

        # Merge into schema so every key is always present
        result = CARD_SCHEMA.copy()
        result.update({k: v for k, v in data.items() if k in CARD_SCHEMA})

        # Ensure identity
        result["card_name"] = result.get("card_name") or card_name
        result["bank"]      = result.get("bank")      or bank

        # Normalise cashback_rate to always be a dict
        cb = result.get("cashback_rate")
        if isinstance(cb, (int, float)):
            result["cashback_rate"] = {"base": float(cb)}
        elif not isinstance(cb, dict):
            rates: dict = {}
            if result.get("base_reward_rate"):
                rates["base"] = result["base_reward_rate"]
            for cat in ("dining", "grocery", "fuel", "travel", "online", "international"):
                v = result.get(f"{cat}_reward_rate")
                if v:
                    rates[cat] = v
            result["cashback_rate"] = rates or None

        return result

    except Exception as e:
        logger.error(f"AI parsing failed for {card_name} ({bank}): {e}")
        fallback = CARD_SCHEMA.copy()
        fallback["card_name"] = card_name
        fallback["bank"]      = bank
        return fallback
