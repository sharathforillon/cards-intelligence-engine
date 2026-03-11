import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the project root regardless of the current working directory
_project_root = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=_project_root / ".env", override=True)

# ------------------------------------------------
# API KEYS
# ------------------------------------------------

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY not found in environment")

if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY not found in environment")


# ------------------------------------------------
# BANK STRATEGY CONFIGURATION
# ------------------------------------------------

class StrategyConfig:
    """
    Configuration object used across profitability
    and strategy simulators.
    """

    def __init__(self):

        # Portfolio assumptions
        self.avg_credit_limit = 12000
        self.avg_monthly_spend = 3500

        # Revenue assumptions
        self.interchange_rate = 0.0175
        self.interest_rate = 0.26

        # Behaviour assumptions
        self.revolve_rate = 0.35
        self.default_rate = 0.025

        # Acquisition economics
        self.acquisition_cost = 650

        # Operating cost
        self.operating_cost_per_card = 120


# ------------------------------------------------
# CONFIG LOADER
# ------------------------------------------------

def load_bank_config():
    """
    Returns the default bank configuration used
    by the strategy engines.
    """

    return StrategyConfig()