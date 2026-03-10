import os
import json
import logging
import re
from dotenv import load_dotenv
from openai import OpenAI

logger = logging.getLogger("AIParser")

# Load environment variables
load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY not found. Check your .env file.")

client = OpenAI(api_key=OPENAI_API_KEY)


CARD_SCHEMA = {
    "card_name": None,
    "bank": None,
    "network": None,
    "annual_fee": None,
    "annual_fee_currency": None,
    "welcome_bonus": None,
    "cashback_rate": None,
    "miles_rate": None,
    "lounge_access": None,
    "minimum_income": None,
    "interest_rate": None,
    "foreign_txn_fee": None,
    "card_type": None
}


def extract_json(text):
    """
    Extract JSON safely even if the model returns extra text.
    """
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group())
    raise ValueError("No JSON found in model response")


def extract_metrics_ai(card_name, bank, page_text):
    """
    Uses OpenAI to extract structured credit card metrics from scraped page text.
    """

    try:

        prompt = f"""
You are a financial product analyst.

Extract structured data about this credit card.

Return ONLY valid JSON.

If a value is not found, return null.

Card Name: {card_name}
Bank: {bank}

Fields to extract:

card_name
bank
network
annual_fee
annual_fee_currency
welcome_bonus
cashback_rate
miles_rate
lounge_access
minimum_income
interest_rate
foreign_txn_fee
card_type

Website Text:
{page_text[:12000]}
"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0,
            messages=[
                {"role": "system", "content": "You extract structured financial product data."},
                {"role": "user", "content": prompt}
            ],
        )

        content = response.choices[0].message.content.strip()

        data = extract_json(content)

        # Ensure schema consistency
        for key in CARD_SCHEMA:
            if key not in data:
                data[key] = None

        return data

    except Exception as e:

        logger.error(f"AI parsing failed for {card_name}: {e}")

        fallback = CARD_SCHEMA.copy()
        fallback["card_name"] = card_name
        fallback["bank"] = bank

        return fallback