"""
Seed script — Mashreq UAE Credit Card Portfolio.

Pulls card names, annual fees, and cashback rates directly from the scraped
CompetitorCard table (bank_name = 'Mashreq') and supplements with realistic
portfolio-performance figures for the 4 live products:

  1. Cashback Credit Card       — free, mass market, online/grocery 5%
  2. noon Credit Card           — free, noon co-brand, 10% noon cashback
  3. Platinum Plus Credit Card  — AED 400/yr, mass-affluent, rewards
  4. Solitaire Credit Card      — AED 1,500/yr, HNW premium

Run:
  PYTHONPATH=/path/to/repo python -m backend.seed_mashreq_portfolio
"""

from datetime import datetime, timezone
from backend.database import SessionLocal, init_db
from backend.models import CompetitorCard
from backend.models_portfolio import MashreqCardPerformance

# ──────────────────────────────────────────────────────────────────────────────
# Canonical card names as they appear (or should appear) in the scraped DB.
# We prefer the richer scraped rows (ids 36-39) that have tier/segment data.
# ──────────────────────────────────────────────────────────────────────────────
CANONICAL_NAMES = [
    "Cashback Credit Card",
    "noon Credit Card",
    "Platinum Plus Credit Card",
    "Solitaire Credit Card",
]

# Performance figures that cannot be scraped from public pages.
# Values are realistic estimates for a mid-tier UAE bank (2025-2026).
PERF_OVERLAY = {
    "Cashback Credit Card": {
        "segment":           "core_professionals",
        "total_enr":         85_000,
        "active_cards":      68_000,
        "activation_rate":   0.80,
        "attrition_rate":    0.16,
        "fx_markup":         2.30,
        "monthly_spend":     148_000_000.0,   # AED 68K cards × ~AED 2,200/card/mo
        "avg_credit_limit":  15_000.0,
        "outstanding_balance": 35_000_000.0,
        "utilization_rate":  0.21,
        "revolve_rate":      0.32,
        "interchange_income": 1_332_000.0,    # 0.9% × spend
        "interest_income":    2_800_000.0,    # ~26% APR on revolving balance
        "reward_cost":       2_220_000.0,     # blended ~1.5% × spend
        "credit_loss":       560_000.0,
        "npl_rate":          0.016,
        "delinquency_30dpd": 0.028,
        "acquisition_ntb":   3_500,
        "acquisition_etb":   1_200,
        "cac_cost":          380.0,
    },
    "noon Credit Card": {
        "segment":           "salary_bank_customers",
        "total_enr":         55_000,
        "active_cards":      42_000,
        "activation_rate":   0.76,
        "attrition_rate":    0.20,
        "fx_markup":         2.30,
        "monthly_spend":     78_000_000.0,    # lower spend, online-heavy
        "avg_credit_limit":  12_000.0,
        "outstanding_balance": 22_000_000.0,
        "utilization_rate":  0.26,
        "revolve_rate":      0.38,
        "interchange_income": 702_000.0,      # 0.9% × spend
        "interest_income":    1_760_000.0,
        "reward_cost":       1_950_000.0,     # ~2.5% blended (10% noon is heavy)
        "credit_loss":       440_000.0,
        "npl_rate":          0.020,
        "delinquency_30dpd": 0.035,
        "acquisition_ntb":   2_800,
        "acquisition_etb":   700,
        "cac_cost":          290.0,
        # Override blended rate: ~25% spend on noon (10%) + 75% base (1%) = 3.25%
        # But noon pays subsidy to cover most noon cashback, net cost ~2.5%
        "reward_rate":       0.025,
    },
    "Platinum Plus Credit Card": {
        "segment":           "affluent_lifestyle",
        "total_enr":         48_000,
        "active_cards":      38_000,
        "activation_rate":   0.79,
        "attrition_rate":    0.12,
        "fx_markup":         2.30,
        "monthly_spend":     114_000_000.0,   # AED 38K × ~AED 3,000/card/mo
        "avg_credit_limit":  40_000.0,
        "outstanding_balance": 21_000_000.0,
        "utilization_rate":  0.16,
        "revolve_rate":      0.25,
        "interchange_income": 1_026_000.0,
        "interest_income":    1_680_000.0,
        "reward_cost":       2_280_000.0,     # ~2% blended rewards
        "credit_loss":       210_000.0,
        "npl_rate":          0.010,
        "delinquency_30dpd": 0.016,
        "acquisition_ntb":   1_200,
        "acquisition_etb":   680,
        "cac_cost":          520.0,
    },
    "Solitaire Credit Card": {
        "segment":           "premium_travelers",
        "total_enr":         14_000,
        "active_cards":      11_500,
        "activation_rate":   0.82,
        "attrition_rate":    0.08,
        "fx_markup":         2.30,
        "monthly_spend":     69_000_000.0,    # AED 11.5K × ~AED 6,000/card/mo
        "avg_credit_limit":  80_000.0,
        "outstanding_balance": 9_200_000.0,
        "utilization_rate":  0.11,
        "revolve_rate":      0.14,
        "interchange_income": 690_000.0,
        "interest_income":    737_000.0,
        "reward_cost":       1_380_000.0,     # 2% blended premium rewards
        "credit_loss":       55_000.0,
        "npl_rate":          0.006,
        "delinquency_30dpd": 0.009,
        "acquisition_ntb":   320,
        "acquisition_etb":   180,
        "cac_cost":          920.0,
    },
}


def _blended_rate(cashback_dict: dict) -> float:
    """Convert a cashback_rate dict to a blended reward_rate float."""
    if not cashback_dict:
        return 0.015
    base = cashback_dict.get("base", 0.01)
    boosted = [v for k, v in cashback_dict.items() if k != "base"]
    if boosted:
        # Weight: 60% base spend, 40% split across boosted categories
        n = len(boosted)
        return round(base * 0.60 + sum(boosted) / n * 0.40, 4)
    return base


def seed():
    init_db()
    db = SessionLocal()
    try:
        # ── 1. Load scraped Mashreq cards ──────────────────────────────────
        scraped: dict[str, CompetitorCard] = {}
        for name in CANONICAL_NAMES:
            # Prefer the richer/later scraped rows (higher id)
            row = (
                db.query(CompetitorCard)
                .filter(
                    CompetitorCard.bank_name == "Mashreq",
                    CompetitorCard.card_name == name,
                )
                .order_by(CompetitorCard.id.desc())
                .first()
            )
            if row:
                scraped[name] = row
            else:
                print(f"  ⚠ '{name}' not found in scraped DB — skipping")

        if not scraped:
            print("✗ No Mashreq cards found in CompetitorCard table. Run the scraper first.")
            return

        # ── 2. Wipe old portfolio rows (removes fake cards from previous seed) ──
        db.query(MashreqCardPerformance).delete()
        db.flush()

        # ── 3. Insert fresh rows ────────────────────────────────────────────
        ts = datetime.now(timezone.utc)
        inserted = 0
        for name, scraped_card in scraped.items():
            perf = PERF_OVERLAY.get(name, {}).copy()
            annual_fee = scraped_card.annual_fee if scraped_card.annual_fee is not None else 0.0
            # Use override from PERF_OVERLAY if present, else compute from scraped cashback dict
            reward_rate = perf.pop("reward_rate", None) or _blended_rate(scraped_card.cashback_rate or {})

            row = MashreqCardPerformance(
                card_name=name,
                annual_fee=annual_fee,
                reward_rate=reward_rate,
                timestamp=ts,
                **perf,
            )
            db.add(row)
            inserted += 1

        db.commit()

        total_active = sum(PERF_OVERLAY[n]["active_cards"] for n in scraped)
        total_spend  = sum(PERF_OVERLAY[n]["monthly_spend"] for n in scraped) / 1e6
        print(f"✓ Mashreq portfolio seed complete: {inserted} cards inserted (all fake cards removed)")
        print(f"  Cards:         {', '.join(scraped.keys())}")
        print(f"  Active cards:  {total_active:,}")
        print(f"  Monthly spend: AED {total_spend:.0f}M")

    except Exception as e:
        db.rollback()
        print(f"✗ Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
