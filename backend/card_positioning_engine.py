from collections import defaultdict
from backend.models import CompetitorCard


class CardPositioningEngine:

    def __init__(self, db):
        self.db = db


    def get_cards(self):

        return self.db.query(CompetitorCard).filter(
            CompetitorCard.product_type == "credit"
        ).all()


    def classify_card(self, card):

        """
        Determine strategic segment for a card.
        """

        if card.annual_fee and card.annual_fee > 1000:
            return "premium"

        if card.cashback_rate:
            return "cashback"

        if card.miles_rate:
            return "travel"

        return "rewards"


    def build_segments(self):

        cards = self.get_cards()

        segments = defaultdict(list)

        for card in cards:

            segment = self.classify_card(card)

            segments[segment].append({
                "bank": card.bank_name,
                "card": card.card_name,
                "annual_fee": card.annual_fee
            })

        return segments


    def segment_summary(self):

        segments = self.build_segments()

        summary = {}

        for segment, cards in segments.items():

            summary[segment] = {
                "card_count": len(cards),
                "banks": list(set([c["bank"] for c in cards]))
            }

        return summary


    def segment_leaders(self):

        segments = self.build_segments()

        leaders = {}

        for segment, cards in segments.items():

            bank_counts = defaultdict(int)

            for card in cards:
                bank_counts[card["bank"]] += 1

            leader = sorted(
                bank_counts.items(),
                key=lambda x: x[1],
                reverse=True
            )[0]

            leaders[segment] = {
                "bank": leader[0],
                "cards": leader[1]
            }

        return leaders


    def detect_positioning_gaps(self):

        segments = self.segment_summary()

        gaps = []

        if segments.get("premium", {}).get("card_count", 0) < 5:
            gaps.append("Premium segment opportunity")

        if segments.get("travel", {}).get("card_count", 0) < 5:
            gaps.append("Travel segment opportunity")

        if segments.get("cashback", {}).get("card_count", 0) > 20:
            gaps.append("Cashback segment overcrowded")

        return gaps


    def generate_positioning_report(self):

        return {
            "segment_summary": self.segment_summary(),
            "segment_leaders": self.segment_leaders(),
            "positioning_gaps": self.detect_positioning_gaps()
        }