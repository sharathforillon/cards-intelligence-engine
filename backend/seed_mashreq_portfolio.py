"""
Seed script — Mashreq UAE Credit Card Portfolio (8 cards, realistic 2026 data).

Run once (or re-run; it upserts by card_name, keeping only latest row):
  PYTHONPATH=/path/to/repo python -m backend.seed_mashreq_portfolio
"""

from datetime import datetime, timezone
from backend.database import SessionLocal, init_db
from backend.models_portfolio import MashreqCardPerformance


MASHREQ_CARDS = [
    # ── 1. Cashback Credit Card — flagship mass-affluent product ──────────────
    {
        "card_name":         "Mashreq Cashback Credit Card",
        "segment":           "core_professionals",
        # volume
        "total_enr":         98_000,
        "active_cards":      78_000,
        "activation_rate":   0.80,
        "attrition_rate":    0.14,
        # product design
        "annual_fee":        750.0,
        "reward_rate":       0.020,   # blended (5% dining, 1% others)
        "fx_markup":         3.20,
        # spend & credit
        "monthly_spend":     175_000_000.0,
        "avg_credit_limit":  28_000.0,
        "outstanding_balance": 42_500_000.0,
        "utilization_rate":  0.195,
        "revolve_rate":      0.35,
        # revenue
        "interchange_income": 1_575_000.0,   # ~0.9% of spend
        "interest_income":    3_400_000.0,   # 2.89%/month on revolving balance (partial)
        # costs & risk
        "reward_cost":       3_500_000.0,    # 2% × AED 175M
        "credit_loss":       680_000.0,
        "npl_rate":          0.016,
        "delinquency_30dpd": 0.028,
        # acquisition
        "acquisition_ntb":   3_200,
        "acquisition_etb":   1_100,
        "cac_cost":          420.0,
    },

    # ── 2. Smiles Credit Card — e& co-brand, mass-market volume driver ────────
    {
        "card_name":         "Mashreq Smiles Credit Card",
        "segment":           "salary_bank_customers",
        "total_enr":         122_000,
        "active_cards":      95_000,
        "activation_rate":   0.78,
        "attrition_rate":    0.18,
        "annual_fee":        1_050.0,
        "reward_rate":       0.015,
        "fx_markup":         2.99,
        "monthly_spend":     165_000_000.0,
        "avg_credit_limit":  18_000.0,
        "outstanding_balance": 52_000_000.0,
        "utilization_rate":  0.237,
        "revolve_rate":      0.42,
        "interchange_income": 1_485_000.0,
        "interest_income":    4_160_000.0,
        "reward_cost":       2_475_000.0,
        "credit_loss":       1_040_000.0,
        "npl_rate":          0.020,
        "delinquency_30dpd": 0.038,
        "acquisition_ntb":   4_800,
        "acquisition_etb":   900,
        "cac_cost":          310.0,
    },

    # ── 3. Platinum Elite — affluent segment, high-spend card ─────────────────
    {
        "card_name":         "Mashreq Platinum Elite Credit Card",
        "segment":           "affluent_lifestyle",
        "total_enr":         34_000,
        "active_cards":      28_000,
        "activation_rate":   0.82,
        "attrition_rate":    0.10,
        "annual_fee":        2_000.0,
        "reward_rate":       0.025,
        "fx_markup":         1.75,
        "monthly_spend":     85_000_000.0,
        "avg_credit_limit":  65_000.0,
        "outstanding_balance": 14_500_000.0,
        "utilization_rate":  0.134,
        "revolve_rate":      0.22,
        "interchange_income": 850_000.0,
        "interest_income":    1_160_000.0,
        "reward_cost":       2_125_000.0,
        "credit_loss":       145_000.0,
        "npl_rate":          0.008,
        "delinquency_30dpd": 0.012,
        "acquisition_ntb":   820,
        "acquisition_etb":   540,
        "cac_cost":          680.0,
    },

    # ── 4. Solitaire — premium ladies card, Visa Infinite ────────────────────
    {
        "card_name":         "Mashreq Solitaire Credit Card",
        "segment":           "affluent_lifestyle",
        "total_enr":         18_500,
        "active_cards":      15_000,
        "activation_rate":   0.81,
        "attrition_rate":    0.09,
        "annual_fee":        2_500.0,
        "reward_rate":       0.020,
        "fx_markup":         1.75,
        "monthly_spend":     52_000_000.0,
        "avg_credit_limit":  72_000.0,
        "outstanding_balance": 7_800_000.0,
        "utilization_rate":  0.118,
        "revolve_rate":      0.18,
        "interchange_income": 572_000.0,
        "interest_income":    624_000.0,
        "reward_cost":       1_040_000.0,
        "credit_loss":       62_400.0,
        "npl_rate":          0.006,
        "delinquency_30dpd": 0.009,
        "acquisition_ntb":   380,
        "acquisition_etb":   210,
        "cac_cost":          850.0,
    },

    # ── 5. Visa Infinite — HNW flagship, ultra-premium ───────────────────────
    {
        "card_name":         "Mashreq Visa Infinite Credit Card",
        "segment":           "premium_travelers",
        "total_enr":         10_200,
        "active_cards":      8_500,
        "activation_rate":   0.83,
        "attrition_rate":    0.07,
        "annual_fee":        3_500.0,
        "reward_rate":       0.015,
        "fx_markup":         1.50,
        "monthly_spend":     68_000_000.0,
        "avg_credit_limit":  150_000.0,
        "outstanding_balance": 5_200_000.0,
        "utilization_rate":  0.082,
        "revolve_rate":      0.10,
        "interchange_income": 748_000.0,
        "interest_income":    416_000.0,
        "reward_cost":       1_020_000.0,
        "credit_loss":       26_000.0,
        "npl_rate":          0.004,
        "delinquency_30dpd": 0.006,
        "acquisition_ntb":   210,
        "acquisition_etb":   140,
        "cac_cost":          1_200.0,
    },

    # ── 6. Neo — digital-first, young professionals ───────────────────────────
    {
        "card_name":         "Mashreq Neo Credit Card",
        "segment":           "core_professionals",
        "total_enr":         54_000,
        "active_cards":      42_000,
        "activation_rate":   0.78,
        "attrition_rate":    0.19,
        "annual_fee":        0.0,
        "reward_rate":       0.020,
        "fx_markup":         1.99,
        "monthly_spend":     73_000_000.0,
        "avg_credit_limit":  22_000.0,
        "outstanding_balance": 16_200_000.0,
        "utilization_rate":  0.175,
        "revolve_rate":      0.28,
        "interchange_income": 730_000.0,
        "interest_income":    1_296_000.0,
        "reward_cost":       1_460_000.0,
        "credit_loss":       324_000.0,
        "npl_rate":          0.018,
        "delinquency_30dpd": 0.030,
        "acquisition_ntb":   2_400,
        "acquisition_etb":   650,
        "cac_cost":          280.0,
    },

    # ── 7. Rank — miles-based, frequent traveler segment ─────────────────────
    {
        "card_name":         "Mashreq Rank Credit Card",
        "segment":           "premium_travelers",
        "total_enr":         22_000,
        "active_cards":      18_000,
        "activation_rate":   0.82,
        "attrition_rate":    0.11,
        "annual_fee":        1_200.0,
        "reward_rate":       0.015,
        "fx_markup":         2.00,
        "monthly_spend":     64_000_000.0,
        "avg_credit_limit":  55_000.0,
        "outstanding_balance": 7_600_000.0,
        "utilization_rate":  0.105,
        "revolve_rate":      0.15,
        "interchange_income": 640_000.0,
        "interest_income":    608_000.0,
        "reward_cost":       960_000.0,
        "credit_loss":       76_000.0,
        "npl_rate":          0.009,
        "delinquency_30dpd": 0.014,
        "acquisition_ntb":   620,
        "acquisition_etb":   320,
        "cac_cost":          720.0,
    },

    # ── 8. Cashback Gold — entry-level, mass-market acquisition engine ────────
    {
        "card_name":         "Mashreq Cashback Gold Credit Card",
        "segment":           "salary_bank_customers",
        "total_enr":         80_000,
        "active_cards":      62_000,
        "activation_rate":   0.775,
        "attrition_rate":    0.22,
        "annual_fee":        300.0,
        "reward_rate":       0.010,
        "fx_markup":         3.50,
        "monthly_spend":     98_000_000.0,
        "avg_credit_limit":  12_000.0,
        "outstanding_balance": 32_000_000.0,
        "utilization_rate":  0.270,
        "revolve_rate":      0.48,
        "interchange_income": 980_000.0,
        "interest_income":    2_560_000.0,
        "reward_cost":       980_000.0,
        "credit_loss":       960_000.0,
        "npl_rate":          0.030,
        "delinquency_30dpd": 0.052,
        "acquisition_ntb":   5_500,
        "acquisition_etb":   1_800,
        "cac_cost":          240.0,
    },
]


def seed():
    init_db()
    db = SessionLocal()
    try:
        inserted = 0
        updated  = 0
        ts       = datetime.now(timezone.utc)

        for card_data in MASHREQ_CARDS:
            # Upsert: keep only the latest row per card_name
            existing = (
                db.query(MashreqCardPerformance)
                .filter(MashreqCardPerformance.card_name == card_data["card_name"])
                .first()
            )
            if existing:
                for k, v in card_data.items():
                    setattr(existing, k, v)
                existing.timestamp = ts
                updated += 1
            else:
                db.add(MashreqCardPerformance(**card_data, timestamp=ts))
                inserted += 1

        db.commit()
        print(f"✓ Mashreq portfolio seed complete: {inserted} inserted, {updated} updated.")
        print(f"  Total portfolio: {sum(c['active_cards'] for c in MASHREQ_CARDS):,} active cards")
        print(f"  Monthly spend:   AED {sum(c['monthly_spend'] for c in MASHREQ_CARDS)/1e6:.0f}M")

    except Exception as e:
        db.rollback()
        print(f"✗ Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
