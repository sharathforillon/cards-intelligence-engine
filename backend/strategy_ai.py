import anthropic
import logging
from backend.config import ANTHROPIC_API_KEY

logger = logging.getLogger("StrategyAI")

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


def generate_strategy(market_data, focus_bank):

    prompt = f"""
You are a senior credit card product strategist.

Analyze competitor cards and propose strategies for {focus_bank}.

Market Data:
{market_data}

Provide:

1. Market gaps
2. Competitor weaknesses
3. New card ideas
4. Pricing strategy
5. Rewards strategy
"""

    try:

        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=1200,
            temperature=0.3,
            messages=[
                {"role": "user", "content": prompt}
            ],
        )

        return response.content[0].text

    except Exception as e:

        logger.error(f"Claude strategy failed: {e}")

        return None