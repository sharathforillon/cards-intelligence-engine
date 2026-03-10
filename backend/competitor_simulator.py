from collections import defaultdict
from backend.models import CompetitorCard


class CompetitorReactionSimulator:

    def __init__(self, db):
        self.db = db


    def get_cards(self):

        return self.db.query(CompetitorCard).filter(
            CompetitorCard.product_type == "credit"
        ).all()


    def build_bank_profiles(self):

        cards = self.get_cards()

        profiles = defaultdict(lambda: {
            "cashback_cards": 0,
            "travel_cards": 0,
            "premium_cards": 0,
            "avg_fee": 0,
            "card_count": 0
        })

        for card in cards:

            bank = card.bank_name

            profiles[bank]["card_count"] += 1

            if card.annual_fee:
                profiles[bank]["avg_fee"] += card.annual_fee

            if card.card_type == "cashback":
                profiles[bank]["cashback_cards"] += 1

            if card.card_type == "travel":
                profiles[bank]["travel_cards"] += 1

            if card.card_type == "premium":
                profiles[bank]["premium_cards"] += 1


        for bank in profiles:

            if profiles[bank]["card_count"] > 0:
                profiles[bank]["avg_fee"] /= profiles[bank]["card_count"]

        return profiles


    def predict_reaction(self, new_card_segment):

        profiles = self.build_bank_profiles()

        reactions = []

        for bank, profile in profiles.items():

            strategy = "monitor"

            if new_card_segment == "cashback":

                if profile["cashback_cards"] > 3:
                    strategy = "increase cashback rewards"

                else:
                    strategy = "launch cashback variant"

            elif new_card_segment == "travel":

                if profile["travel_cards"] > 2:
                    strategy = "increase miles earn rate"

                else:
                    strategy = "launch airline partnership"

            elif new_card_segment == "premium":

                if profile["premium_cards"] > 1:
                    strategy = "add premium benefits"

                else:
                    strategy = "launch new premium card"


            reactions.append({
                "bank": bank,
                "predicted_strategy": strategy
            })

        return reactions


    def simulate_market_response(self, new_card):

        segment = new_card.get("card_type")

        reactions = self.predict_reaction(segment)

        return {
            "new_card": new_card,
            "competitor_reactions": reactions
        }