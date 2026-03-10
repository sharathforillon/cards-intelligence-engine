from backend.models import CompetitorCard
from datetime import datetime


class CompetitorIntelligence:

    def __init__(self, db):

        self.db = db

    def latest_events(self, limit=10):

        cards = self.db.query(CompetitorCard).order_by(
            CompetitorCard.last_updated.desc()
        ).limit(limit).all()

        events = []

        for c in cards:

            impact = "medium"

            if c.cashback_rate and c.cashback_rate.get("base", 0) >= 0.05:
                impact = "high"

            events.append({

                "bank": c.bank_name,
                "card": c.card_name,
                "event": self._describe_event(c),
                "impact": impact,
                "time": c.last_updated.isoformat() if c.last_updated else None

            })

        return events

    def _describe_event(self, card):

        if card.cashback_rate:

            rate = card.cashback_rate.get("base")

            if rate:
                return f"{rate*100:.0f}% cashback offer"

        if card.welcome_bonus:

            return f"Welcome bonus {card.welcome_bonus}"

        return "Card offer updated"