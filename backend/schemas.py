from pydantic import BaseModel
from typing import Dict, List, Optional


class CardMetrics(BaseModel):

    annual_fee: float

    cashback_rate: Dict[str, float]

    welcome_bonus_value: Optional[float]

    fx_markup: Optional[float]

    minimum_salary: Optional[int]

    lounge_access: Optional[int]

    reward_type: Optional[str]

    top_benefits: List[str]