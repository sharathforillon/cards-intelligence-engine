"""
Spend Category Intelligence Engine
Analyses reward rates across 6 spend categories by mining CompetitorCard.cashback_rate JSON.
"""

import logging
from backend.models import CompetitorCard

logger = logging.getLogger("SpendCategoryEngine")

MASHREQ_BANK = "Mashreq"

# Spend-share of total portfolio spend (UAE market mix)
CATEGORY_SPEND_SHARES = {
    "dining":        0.18,
    "grocery":       0.22,
    "travel":        0.15,
    "online":        0.20,
    "fuel":          0.08,
    "luxury_retail": 0.07,
}

# Aliases: keys in cashback_rate JSON → our category keys
CATEGORY_ALIASES = {
    "dining":    ["dining", "restaurant", "food", "eat"],
    "grocery":   ["grocery", "groceries", "supermarket", "lulu", "carrefour"],
    "travel":    ["travel", "hotel", "airline", "flight", "airport"],
    "online":    ["online", "ecommerce", "e-commerce", "shopping", "internet"],
    "fuel":      ["fuel", "petrol", "gas", "enoc", "adnoc"],
    "luxury_retail": ["luxury", "retail", "lifestyle", "fashion", "mall"],
}

CATEGORY_META = {
    "dining":        {"label": "Dining & Restaurants", "icon": "🍽️",  "color": "#e11d48"},
    "grocery":       {"label": "Groceries",             "icon": "🛒",  "color": "#059669"},
    "travel":        {"label": "Travel",                "icon": "✈️",  "color": "#2563eb"},
    "online":        {"label": "Online Shopping",       "icon": "💻",  "color": "#7c3aed"},
    "fuel":          {"label": "Fuel",                  "icon": "⛽",  "color": "#d97706"},
    "luxury_retail": {"label": "Luxury Retail",         "icon": "💎",  "color": "#0891b2"},
}


def _extract_rate_for_category(cashback_dict: dict, category: str) -> float | None:
    """Extract the best matching rate for a category from a cashback JSON dict."""
    if not isinstance(cashback_dict, dict):
        return None
    aliases = CATEGORY_ALIASES.get(category, [category])
    best = None
    for key, val in cashback_dict.items():
        if isinstance(val, (int, float)):
            key_lower = key.lower()
            for alias in aliases:
                if alias in key_lower:
                    if best is None or val > best:
                        best = float(val)
    return best


class SpendCategoryEngine:

    def __init__(self, db):
        self.db = db

    def _get_all_rates(self) -> dict[str, dict[str, list[float]]]:
        """
        Query all cards and build:
          { category: { bank_name: [rate, ...] } }
        """
        cards = self.db.query(CompetitorCard).all()
        category_bank_rates: dict[str, dict[str, list[float]]] = {
            cat: {} for cat in CATEGORY_SPEND_SHARES
        }

        for card in cards:
            cb = card.cashback_rate
            if not isinstance(cb, dict):
                if isinstance(cb, (int, float)):
                    # Use base rate for all categories
                    cb = {"base": float(cb)}
                else:
                    continue

            base_rate = float(cb.get("base") or next(iter(cb.values()), 0))

            for cat in CATEGORY_SPEND_SHARES:
                cat_rate = _extract_rate_for_category(cb, cat)
                effective = cat_rate if cat_rate is not None else base_rate
                bank = card.bank_name
                if bank not in category_bank_rates[cat]:
                    category_bank_rates[cat][bank] = []
                category_bank_rates[cat][bank].append(effective)

        return category_bank_rates

    def _mashreq_rate_for_category(self, category: str) -> float:
        """Get Mashreq's effective rate for a specific category."""
        cards = (
            self.db.query(CompetitorCard)
            .filter(CompetitorCard.bank_name == MASHREQ_BANK)
            .all()
        )
        best = 0.0
        for card in cards:
            cb = card.cashback_rate
            if not isinstance(cb, dict):
                if isinstance(cb, (int, float)):
                    cb = {"base": float(cb)}
                else:
                    continue
            base = float(cb.get("base") or next(iter(cb.values()), 0))
            rate = _extract_rate_for_category(cb, category)
            effective = rate if rate is not None else base
            if effective > best:
                best = effective
        return best

    def compute_category_metrics(self) -> list[dict]:
        """
        For each category return:
        - mashreq_rate, market_leader_rate, market_avg_rate
        - competitor_strength (0-1), opportunity_index (0-1)
        - spend_share, estimated reward cost at Mashreq rate
        - top 3 banks by rate
        """
        all_rates = self._get_all_rates()
        results = []

        # Monthly portfolio spend assumption
        PORTFOLIO_MONTHLY_SPEND = 375_000 * 3_500  # cards × avg spend

        for cat, spend_share in CATEGORY_SPEND_SHARES.items():
            bank_rates = all_rates[cat]
            mashreq_rate = self._mashreq_rate_for_category(cat)

            # Aggregate: best rate per bank
            best_per_bank: dict[str, float] = {
                bank: max(rates) for bank, rates in bank_rates.items() if rates
            }

            if not best_per_bank:
                continue

            sorted_banks = sorted(best_per_bank.items(), key=lambda x: x[1], reverse=True)
            market_leader_bank, market_leader_rate = sorted_banks[0]
            top_3 = sorted_banks[:3]

            all_rates_flat = list(best_per_bank.values())
            market_avg = sum(all_rates_flat) / len(all_rates_flat) if all_rates_flat else 0

            # Competitor strength: avg of top-3 rates normalised by market max
            top3_avg = sum(r for _, r in top_3) / len(top_3)
            competitor_strength = min(top3_avg / market_leader_rate, 1.0) if market_leader_rate > 0 else 0

            # Opportunity index: how far Mashreq is below market leader
            if market_leader_rate > 0 and mashreq_rate < market_leader_rate:
                opportunity_index = (market_leader_rate - mashreq_rate) / market_leader_rate
            else:
                opportunity_index = 0.0

            category_monthly_spend = PORTFOLIO_MONTHLY_SPEND * spend_share
            reward_cost_monthly = category_monthly_spend * mashreq_rate * (1 - 0.15)

            meta = CATEGORY_META.get(cat, {"label": cat, "icon": "💳", "color": "#4a6480"})

            results.append({
                "key": cat,
                "label": meta["label"],
                "icon": meta["icon"],
                "color": meta["color"],
                "spend_share": spend_share,
                "mashreq_rate": round(mashreq_rate, 4),
                "market_leader_rate": round(market_leader_rate, 4),
                "market_leader_bank": market_leader_bank,
                "market_avg_rate": round(market_avg, 4),
                "competitor_strength": round(competitor_strength, 3),
                "opportunity_index": round(opportunity_index, 3),
                "reward_cost_monthly_aed": round(reward_cost_monthly, 0),
                "top_3_banks": [{"bank": b, "rate": round(r, 4)} for b, r in top_3],
                "underperforming": opportunity_index > 0.2,
            })

        # Sort by opportunity_index descending
        results.sort(key=lambda x: x["opportunity_index"], reverse=True)
        return results

    def find_underperforming_categories(self) -> list[dict]:
        """Return categories where Mashreq lags market leader by > 20%."""
        return [c for c in self.compute_category_metrics() if c["underperforming"]]
