from statistics import mean
from backend.models import CompetitorCard


class MarketIntelligence:

    def __init__(self, db):
        self.db = db


    def get_all_cards(self):

        return self.db.query(CompetitorCard).filter(
            CompetitorCard.product_type == "credit"
        ).all()


    def category_leaderboard(self, category="grocery", limit=5):

        cards = self.get_all_cards()

        results = []

        for card in cards:

            rate = 0

            if isinstance(card.cashback_rate, dict):

                rate = card.cashback_rate.get(
                    category,
                    card.cashback_rate.get("base", 0)
                )

            results.append({
                "bank": card.bank_name,
                "card": card.card_name,
                "rate": rate
            })

        ranked = sorted(results, key=lambda x: x["rate"], reverse=True)

        return ranked[:limit]


    def cashback_benchmarks(self):

        cards = self.get_all_cards()

        rates = []

        for card in cards:

            if isinstance(card.cashback_rate, dict):

                base = card.cashback_rate.get("base")

                if base:
                    rates.append(base)

        if not rates:
            return None

        return {
            "max_cashback": max(rates),
            "avg_cashback": mean(rates),
            "min_cashback": min(rates)
        }


    def annual_fee_benchmarks(self):

        cards = self.get_all_cards()

        fees = []

        for card in cards:

            if card.annual_fee:
                fees.append(card.annual_fee)

        if not fees:
            return None

        return {
            "max_fee": max(fees),
            "avg_fee": mean(fees),
            "min_fee": min(fees)
        }


    def segment_distribution(self):

        cards = self.get_all_cards()

        segments = {}

        for card in cards:

            segment = card.card_type or "unknown"

            if segment not in segments:
                segments[segment] = 0

            segments[segment] += 1

        return segments


    def bank_market_share(self):

        cards = self.get_all_cards()

        banks = {}

        for card in cards:

            bank = card.bank_name

            if bank not in banks:
                banks[bank] = 0

            banks[bank] += 1

        return dict(sorted(banks.items(), key=lambda x: x[1], reverse=True))


    def detect_market_gaps(self):

        segments = self.segment_distribution()

        gaps = []

        if segments.get("travel", 0) < 5:
            gaps.append("Travel segment underdeveloped")

        if segments.get("cashback", 0) < 5:
            gaps.append("Cashback segment opportunity")

        if segments.get("premium", 0) < 3:
            gaps.append("Premium card segment gap")

        return gaps


    def generate_market_summary(self):

        return {
            "cashback_benchmarks": self.cashback_benchmarks(),
            "annual_fee_benchmarks": self.annual_fee_benchmarks(),
            "segment_distribution": self.segment_distribution(),
            "bank_market_share": self.bank_market_share(),
            "market_gaps": self.detect_market_gaps()
        }