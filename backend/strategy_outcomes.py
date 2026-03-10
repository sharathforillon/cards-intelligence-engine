from sqlalchemy import Column, Integer, Float, DateTime, String, JSON
from sqlalchemy.sql import func
from backend.database import Base


class StrategyOutcome(Base):

    """
    Stores the outcome of strategy simulations and real-world results.

    Used for:
    - strategy experimentation tracking
    - model validation
    - dashboard analytics
    """

    __tablename__ = "strategy_outcomes"

    # --------------------------------------------------
    # Primary Key
    # --------------------------------------------------

    id = Column(Integer, primary_key=True, index=True)

    # --------------------------------------------------
    # Strategy Parameters
    # --------------------------------------------------

    reward_rate = Column(Float, nullable=False)
    annual_fee = Column(Float, nullable=False)
    feature_score = Column(Float)

    # --------------------------------------------------
    # Simulation Outputs
    # --------------------------------------------------

    expected_clv = Column(Float)
    expected_roe = Column(Float)
    expected_acquisition_multiplier = Column(Float)
    expected_market_share = Column(Float)

    strategy_score = Column(Float)

    # --------------------------------------------------
    # Portfolio Impact
    # --------------------------------------------------

    projected_portfolio_clv = Column(Float)
    projected_annual_profit = Column(Float)

    # --------------------------------------------------
    # Actual Observed Results
    # --------------------------------------------------

    actual_clv = Column(Float)
    actual_roe = Column(Float)
    actual_acquisition = Column(Float)
    actual_market_share = Column(Float)

    # --------------------------------------------------
    # Simulation Metadata
    # --------------------------------------------------

    strategy_version = Column(String, default="v1")

    simulation_payload = Column(JSON)

    # --------------------------------------------------
    # Timestamps
    # --------------------------------------------------

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())