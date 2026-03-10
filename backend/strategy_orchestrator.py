import logging

from backend.profitability_simulator import ProfitabilitySimulator
from backend.acquisition_elasticity_engine import AcquisitionElasticityEngine
from backend.market_game_simulator import MarketGameSimulator
from backend.capital_efficiency_simulator import CapitalEfficiencySimulator


logger = logging.getLogger("StrategyOrchestrator")


class StrategyOrchestrator:
    """
    Central strategy intelligence engine.

    Coordinates:
    - Profitability simulator (CLV)
    - Acquisition elasticity model
    - Market game simulation
    - Capital efficiency model (ROE / RAROC)
    """

    def __init__(self, db, config):

        self.db = db
        self.config = config

        self.clv_engine = ProfitabilitySimulator(db, config)
        self.acquisition_engine = AcquisitionElasticityEngine()
        self.market_engine = MarketGameSimulator()
        self.capital_engine = CapitalEfficiencySimulator()

    # --------------------------------------------------

    def generate_strategy_grid(self):

        """
        Generates candidate product strategies.
        """

        reward_rates = [0.01, 0.02, 0.03, 0.05]
        annual_fees = [0, 200, 500]
        feature_levels = [0.4, 0.6, 0.8]

        strategies = []

        for r in reward_rates:
            for f in annual_fees:
                for feat in feature_levels:

                    strategies.append({
                        "reward_rate": r,
                        "annual_fee": f,
                        "features": feat
                    })

        return strategies

    # --------------------------------------------------

    def evaluate_strategy(self, strategy):

        """
        Runs full strategy simulation pipeline.
        """

        reward = strategy["reward_rate"]
        annual_fee = strategy["annual_fee"]
        features = strategy["features"]
        baseline = strategy.get("baseline")

        logger.info(f"Evaluating strategy reward={reward} fee={annual_fee}")

        # -----------------------------
        # PROFITABILITY
        # -----------------------------

        try:

            clv_result = self.clv_engine.simulate_strategy({
                "reward_rate": reward,
                "annual_fee": annual_fee
            })

        except Exception as e:

            logger.error(f"CLV simulation failed: {e}")

            clv_result = {
                "portfolio_clv": 0,
                "segments": []
            }

        # -----------------------------
        # ACQUISITION MODEL
        # -----------------------------

        try:

            acquisition = self.acquisition_engine.simulate_acquisition(
                reward_rate=reward
            )

        except Exception as e:

            logger.error(f"Acquisition model failed: {e}")

            acquisition = {
                "portfolio_acquisition_multiplier": 1.0
            }

        # -----------------------------
        # MARKET GAME SIMULATION
        # -----------------------------

        try:

            market = self.market_engine.simulate_market({

                "Mashreq": {
                    "reward": reward,
                    "fee": annual_fee,
                    "features": features
                },

                "ADCB": {"reward": 0.04, "fee": 300, "features": 0.6},
                "EmiratesNBD": {"reward": 0.02, "fee": 500, "features": 0.8},
                "FAB": {"reward": 0.03, "fee": 200, "features": 0.5},
                "HSBC": {"reward": 0.02, "fee": 800, "features": 0.9}

            })

        except Exception as e:

            logger.error(f"Market simulation failed: {e}")

            market = {
                "salary_bank_customers": {"Mashreq": 0.2}
            }

        # -----------------------------
        # CAPITAL EFFICIENCY
        # -----------------------------

        try:

            # use simulated profit and loss for capital analytics.
            # The simulator accumulates over each segment's full lifespan
            # (24–60 months). Annualise so that RAROC/ROE represent a
            # single year's risk-adjusted return — weighted avg tenure ≈ 4.3 yrs.
            _raw_profit = clv_result.get("expected_profit", 0.0)
            _raw_credit_loss = clv_result.get("expected_credit_loss", 0.0)
            _avg_tenure_years = 4.32          # weighted avg of segment lifespan caps
            expected_profit = _raw_profit / _avg_tenure_years
            expected_credit_loss = _raw_credit_loss / _avg_tenure_years

            # portfolio capital usage (RWA)
            rwa_consumption = self.clv_engine.capital_efficiency(strategy)

            # economic capital per Basel-style formula
            exposure = rwa_consumption / self.capital_engine.risk_weight
            capital_required = (
                exposure *
                self.capital_engine.risk_weight *
                self.capital_engine.capital_ratio
            )

            raroc = 0.0
            if capital_required > 0:
                raroc = (expected_profit - expected_credit_loss) / capital_required

            # ROE uses same capital base as RAROC to keep metrics consistent
            roe = round(raroc * 100, 2) if capital_required > 0 else 0.0

            capital = {
                "rwa_consumption": round(rwa_consumption, 0),
                "capital_required": round(capital_required, 0),
                "raroc": round(raroc * 100, 2),
                "roe": roe,
            }

        except Exception as e:

            logger.error(f"Capital model failed: {e}")

            capital = {
                "rwa_consumption": 0,
                "capital_required": 0,
                "raroc": 0,
                "roe": 0,
            }

        # -----------------------------
        # STRATEGY SCORE
        # -----------------------------

        score = self.score_strategy(
            clv_result,
            acquisition,
            market,
            capital
        )

        # ------------------------------------
        # SEGMENT VIEW
        # ------------------------------------
        segments_summary = []
        acq_segments = {
            seg["segment"]: seg
            for seg in acquisition.get("segment_breakdown", [])
        }

        for seg in clv_result.get("segments", []):
            name = seg.get("segment", "unknown")
            acq = acq_segments.get(name, {})
            acq_mult = acq.get("acquisition_multiplier", 1.0)
            spend_lift = (acq_mult - 1.0) * 100

            segments_summary.append({
                "segment": name,
                "spend_lift": round(spend_lift, 1),
                "profit_delta": round(seg.get("clv", 0.0), 2),
            })

        # ------------------------------------
        # COMPETITOR RESPONSE
        # ------------------------------------
        try:
            from backend.customer_segments import CustomerSegments

            segments_cfg = CustomerSegments().get_segments()
            portfolio_share = self.market_engine.aggregate_market_share(
                market,
                segments_cfg
            )
        except Exception:
            portfolio_share = {}

        def retaliation_prob(share: float) -> float:
            return round(
                max(0.05, min(0.95, share * 1.6)),
                2,
            )

        competitive_response = {
            "ENBD": retaliation_prob(
                portfolio_share.get("EmiratesNBD", 0.0)
            ),
            "FAB": retaliation_prob(
                portfolio_share.get("FAB", 0.0)
            ),
            "ADCB": retaliation_prob(
                portfolio_share.get("ADCB", 0.0)
            ),
        }

        # ------------------------------------
        # RISK FLAGS
        # ------------------------------------
        risk_flags = []
        portfolio_clv = clv_result.get("portfolio_clv", 0.0)
        raroc_pct = capital.get("raroc", 0.0)

        if strategy["reward_rate"] >= 0.04 and raroc_pct < 18:
            risk_flags.append("reward cost unsustainable")

        if strategy["reward_rate"] >= 0.035 and strategy["annual_fee"] <= 200:
            risk_flags.append("cannibalization risk on existing premium cards")

        if strategy["annual_fee"] >= 600:
            risk_flags.append("regulatory fee constraints – high annual fee")

        if portfolio_clv <= 0:
            risk_flags.append("strategy destroys portfolio value (negative CLV)")

        strategy_score = round(score, 2)

        # ------------------------------------
        # DELTAS VS BASELINE
        # ------------------------------------
        spend_lift_pct = None

        if baseline and baseline.get("monthly_spend"):
            base_spend = baseline["monthly_spend"]
            # approximate new spend via acquisition multiplier
            acq_mult = acquisition.get(
                "portfolio_acquisition_multiplier",
                1.0
            )
            new_spend = base_spend * acq_mult
            if base_spend > 0:
                spend_lift_pct = round(
                    (new_spend - base_spend) / base_spend * 100,
                    1
                )

        # capital impact vs. baseline
        capital_impact = None

        if baseline:
            try:
                base_clv = self.clv_engine.simulate_strategy({
                    "reward_rate": baseline.get("reward_rate", reward),
                    "annual_fee": baseline.get("annual_fee", annual_fee),
                    "reward_type": "cashback"
                })

                base_expected_profit = base_clv.get("expected_profit", 0.0)
                base_expected_credit_loss = base_clv.get(
                    "expected_credit_loss",
                    0.0
                )

                base_rwa = self.clv_engine.capital_efficiency({
                    "reward_rate": baseline.get("reward_rate", reward),
                    "annual_fee": baseline.get("annual_fee", annual_fee),
                    "features": features
                })

                exposure_base = (
                    base_rwa / self.capital_engine.risk_weight
                )
                base_capital_required = (
                    exposure_base *
                    self.capital_engine.risk_weight *
                    self.capital_engine.capital_ratio
                )

                if base_capital_required > 0:
                    base_raroc = (
                        (base_expected_profit - base_expected_credit_loss) /
                        base_capital_required
                    )
                else:
                    base_raroc = 0.0

                capital["baseline_capital_required"] = round(
                    base_capital_required,
                    0
                )
                capital["baseline_raroc"] = round(base_raroc * 100, 2)

                capital_impact = round(
                    capital["capital_required"] -
                    capital["baseline_capital_required"],
                    0
                )

            except Exception as e:
                logger.error(f"Baseline capital computation failed: {e}")

        # headline competitor response probability (max across key banks)
        max_competitor_prob = max(
            competitive_response.values() or [0.0]
        )

        return {
            "strategy": strategy,
            "financials": {
                "portfolio_clv": round(portfolio_clv, 2),
                "expected_roe": capital.get("roe", 0.0),
                "raroc": raroc_pct,
                "annual_profit": round(
                    clv_result.get("expected_profit", 0.0)
                    - clv_result.get("expected_credit_loss", 0.0),
                    2,
                ),
            },
            "capital": capital,
            "segments": segments_summary,
            "competitive_response": competitive_response,
            "risk_flags": risk_flags,
            "strategy_score": strategy_score,
            "spend_lift": spend_lift_pct,
            "capital_impact": capital_impact,
            "competitor_response_probability": max_competitor_prob,
        }

    # --------------------------------------------------

    def score_strategy(self, clv, acquisition, market, capital):

        """
        Composite scoring model.

        Combines:
        - CLV
        - acquisition elasticity
        - market share
        - capital efficiency
        """

        clv_score = clv.get("portfolio_clv", 0)

        acquisition_score = acquisition.get(
            "portfolio_acquisition_multiplier",
            1
        )

        roe_score = capital.get("roe", 0)

        market_share = market.get(
            "salary_bank_customers",
            {}
        ).get("Mashreq", 0)

        score = (

            0.35 * clv_score +
            0.25 * acquisition_score +
            0.20 * roe_score +
            0.20 * market_share

        )

        return score

    # --------------------------------------------------

    def run(self):

        """
        Runs strategy search and returns best strategies.
        """

        strategies = self.generate_strategy_grid()

        results = []

        for s in strategies:

            try:

                result = self.evaluate_strategy(s)

                results.append(result)

            except Exception as e:

                logger.error(f"Strategy evaluation failed: {e}")

        results.sort(
            key=lambda x: x["strategy_score"],
            reverse=True
        )

        top = results[:5]

        logger.info(f"Top strategies generated: {len(top)}")

        return top