from backend.market_intelligence import MarketIntelligence
from backend.profitability_simulator import ProfitabilitySimulator
from backend.models import CompetitorCard


class ProductStrategyEngine:

    def __init__(self, db, focus_bank="Mashreq"):

        self.db = db
        self.focus_bank = focus_bank

        self.intel = MarketIntelligence(db)
        self.simulator = ProfitabilitySimulator(db)

        self.categories = [
            "grocery",
            "dining",
            "travel",
            "fuel",
            "base"
        ]


    def find_focus_bank_cards(self):

        return self.db.query(CompetitorCard).filter(
            CompetitorCard.bank_name == self.focus_bank
        ).all()


    def analyze_category_gaps(self):

        gaps = []

        focus_cards = self.find_focus_bank_cards()

        if not focus_cards:
            return []

        for category in self.categories:

            leaderboard = self.intel.category_leaderboard(category, limit=5)

            if not leaderboard:
                continue

            leader = leaderboard[0]

            focus_rate = 0

            for card in focus_cards:

                if isinstance(card.cashback_rate, dict):

                    focus_rate = card.cashback_rate.get(
                        category,
                        card.cashback_rate.get("base", 0)
                    )

                    break

            gap = leader["rate"] - focus_rate

            if gap <= 0:
                continue

            gaps.append({
                "category": category,
                "leader_bank": leader["bank"],
                "leader_card": leader["card"],
                "leader_rate": leader["rate"],
                "focus_rate": focus_rate,
                "gap": gap
            })

        return gaps


    def generate_strategy_insights(self):

        insights = []

        gaps = self.analyze_category_gaps()

        for gap in gaps:

            simulation = self.simulator.simulate_cashback_change(
                self.focus_bank,
                gap["leader_rate"]
            )

            insights.append({
                "category": gap["category"],
                "competitor": gap["leader_bank"],
                "leader_card": gap["leader_card"],
                "current_rate": gap["focus_rate"],
                "target_rate": gap["leader_rate"],
                "gap": gap["gap"],
                "profit_simulation": simulation[:1]
            })

        return insights


    def executive_summary(self):

        insights = self.generate_strategy_insights()

        summary = []

        for insight in insights:

            profit = insight["profit_simulation"][0]["portfolio_profit"]

            summary.append(f"""
CATEGORY: {insight['category'].upper()}

Market Leader: {insight['competitor']} — {insight['leader_card']}
Leader Rate: {insight['target_rate']*100:.1f}%

Focus Bank: {self.focus_bank}
Current Rate: {insight['current_rate']*100:.1f}%

Recommended Strategy:
Increase cashback to {insight['target_rate']*100:.1f}%

Projected Monthly Portfolio Impact:
AED {profit:,}
""")

        return summary