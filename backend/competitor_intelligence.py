from backend.models import CompetitorCard
from datetime import datetime


class CompetitorIntelligence:

    def __init__(self, db):

        self.db = db

    def latest_events(self, limit=10):
        """
        Return recent competitor card intelligence events.
        Excludes Mashreq's own cards — this is a *competitor* monitor only.
        Only includes cards with real scraped data (page_hash is not None).
        """
        cards = (
            self.db.query(CompetitorCard)
            .filter(
                CompetitorCard.bank_name != "Mashreq",
                CompetitorCard.page_hash.isnot(None),      # scraped data only
            )
            .order_by(CompetitorCard.last_updated.desc())
            .limit(limit)
            .all()
        )

        events = []

        for c in cards:

            impact = "medium"

            if c.cashback_rate and c.cashback_rate.get("base", 0) >= 0.05:
                impact = "high"
            elif c.cashback_rate and c.cashback_rate.get("base", 0) >= 0.03:
                impact = "medium"
            else:
                impact = "low"

            events.append({
                "bank": c.bank_name,
                "card": c.card_name,
                "event": self._describe_event(c),
                "impact": impact,
                "time": c.last_updated.isoformat() if c.last_updated else None,
            })

        return events

    def _describe_event(self, card):
        """Generate a concise, informative description of what a competitor is offering."""
        parts = []

        if card.cashback_rate:
            base = card.cashback_rate.get("base")
            boosted = {k: v for k, v in card.cashback_rate.items() if k != "base" and isinstance(v, (int, float))}
            if base:
                parts.append(f"{base * 100:.0f}% base cashback")
            if boosted:
                top_cat = max(boosted, key=lambda k: boosted[k])
                top_rate = boosted[top_cat]
                parts.append(f"up to {top_rate * 100:.0f}% on {top_cat}")

        if card.welcome_bonus:
            bonus_str = str(card.welcome_bonus)
            if len(bonus_str) > 40:
                bonus_str = bonus_str[:40] + "…"
            parts.append(f"welcome bonus: {bonus_str}")

        if card.annual_fee is not None:
            if card.annual_fee == 0:
                parts.append("no annual fee")
            else:
                parts.append(f"AED {card.annual_fee:.0f} annual fee")

        if parts:
            return " · ".join(parts[:2])  # keep concise — max 2 highlights

        return "Card terms updated"