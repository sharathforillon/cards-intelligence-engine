"""
Acquisition Funnel Engine
Computes funnel conversion metrics and channel CAC from MashreqCardPerformance data.
"""

import logging
from backend.models_portfolio import MashreqCardPerformance
from backend.customer_segments import CustomerSegments

logger = logging.getLogger("AcquisitionFunnelEngine")

# Approximate approval rate from application to issued card
APPROVAL_RATE = 0.55
# Typical channel volume distribution
CHANNEL_VOLUME_SHARE = {
    "Digital":          0.45,
    "Branch":           0.20,
    "Affiliate":        0.18,
    "Salary Transfer":  0.17,
}
# CAC multipliers vs blended base
CHANNEL_CAC_MULTIPLIER = {
    "Digital":          0.70,
    "Branch":           1.40,
    "Affiliate":        1.20,
    "Salary Transfer":  0.50,
}
CHANNEL_COLORS = {
    "Digital":          "#2563eb",
    "Branch":           "#7c3aed",
    "Affiliate":        "#d97706",
    "Salary Transfer":  "#059669",
}


class AcquisitionFunnelEngine:

    def __init__(self, db, config=None):
        self.db = db
        self.config = config
        self.segments = CustomerSegments().get_segments()

    # ── Helpers ────────────────────────────────────────────────────────────

    def _portfolio_totals(self):
        records = self.db.query(MashreqCardPerformance).all()
        if not records:
            # Return illustrative baseline if no data seeded
            return {
                "total_ntb":          2_400,
                "total_etb":          1_200,
                "total_active":       50_000,
                "total_enr":          65_000,
                "avg_activation":     0.77,
                "blended_cac":        650,
            }
        total_ntb = sum(r.acquisition_ntb or 0 for r in records)
        total_etb = sum(r.acquisition_etb or 0 for r in records)
        total_active = sum(r.active_cards or 0 for r in records)
        total_enr = sum(r.total_enr or 0 for r in records)
        total_cac = sum(r.cac_cost or 0 for r in records)
        avg_activation = (
            sum((r.activation_rate or 0) for r in records) / len(records)
            if records else 0.77
        )
        blended_cac = total_cac / len(records) if records else 650
        return {
            "total_ntb": total_ntb,
            "total_etb": total_etb,
            "total_active": total_active,
            "total_enr": total_enr,
            "avg_activation": avg_activation,
            "blended_cac": blended_cac,
        }

    # ── Main methods ───────────────────────────────────────────────────────

    def compute_funnel_metrics(self) -> dict:
        """
        Return funnel stages and conversion rates.
        Applications are back-calculated from approved cards.
        """
        t = self._portfolio_totals()

        total_issued = t["total_ntb"] + t["total_etb"]
        total_approvals = total_issued                       # 1:1 issue:approve
        total_applications = int(total_approvals / APPROVAL_RATE)
        total_activated = int(total_issued * t["avg_activation"])
        total_active_spenders = t["total_active"]

        def conv(a, b):
            return round(b / a * 100, 1) if a > 0 else 0

        stages = [
            {
                "stage": "Applications",
                "count": total_applications,
                "conversion_pct": None,
                "color": "#2563eb",
            },
            {
                "stage": "Approvals",
                "count": total_approvals,
                "conversion_pct": conv(total_applications, total_approvals),
                "color": "#0891b2",
            },
            {
                "stage": "Cards Issued",
                "count": total_issued,
                "conversion_pct": conv(total_approvals, total_issued),
                "color": "#7c3aed",
            },
            {
                "stage": "Activated",
                "count": total_activated,
                "conversion_pct": conv(total_issued, total_activated),
                "color": "#059669",
            },
            {
                "stage": "Active Spenders",
                "count": total_active_spenders,
                "conversion_pct": conv(total_activated, total_active_spenders),
                "color": "#d97706",
            },
        ]

        overall_conversion = conv(total_applications, total_active_spenders)

        return {
            "stages": stages,
            "overall_conversion_pct": overall_conversion,
            "total_applications": total_applications,
            "total_issued": total_issued,
            "total_active": total_active_spenders,
            "blended_cac": round(t["blended_cac"], 2),
        }

    def compute_channel_cac(self) -> list[dict]:
        """
        Return CAC and estimated volume by acquisition channel.
        """
        t = self._portfolio_totals()
        blended = t["blended_cac"] if t["blended_cac"] > 0 else 650
        total_issued = max(t["total_ntb"] + t["total_etb"], 1)

        channels = []
        for channel, share in CHANNEL_VOLUME_SHARE.items():
            cac = blended * CHANNEL_CAC_MULTIPLIER[channel]
            volume = int(total_issued * share)
            channels.append({
                "channel": channel,
                "cac_aed": round(cac, 2),
                "volume_cards": volume,
                "volume_share_pct": round(share * 100, 1),
                "color": CHANNEL_COLORS[channel],
                "efficiency_vs_blended": round(
                    (blended - cac) / blended * 100, 1
                ),  # positive = cheaper than blended
            })

        channels.sort(key=lambda x: x["cac_aed"])
        return channels

    def compute_acquisition_efficiency(self) -> dict:
        """
        Returns efficiency score, payback period, and blended CAC.
        """
        t = self._portfolio_totals()
        total_issued = max(t["total_ntb"] + t["total_etb"], 1)
        blended_cac = t["blended_cac"] if t["blended_cac"] > 0 else 650

        # Monthly profit per card (simplified: interchange on avg spend)
        avg_monthly_spend = getattr(self.config, "avg_monthly_spend", 3500) if self.config else 3500
        interchange = getattr(self.config, "interchange_rate", 0.0175) if self.config else 0.0175
        avg_monthly_profit = avg_monthly_spend * interchange - 8  # minus OpEx

        payback_months = (
            round(blended_cac / max(avg_monthly_profit, 0.01))
            if avg_monthly_profit > 0 else None
        )

        # Efficiency score: normalised active rate / CAC (higher = better)
        active_rate = t["total_active"] / max(t["total_enr"], 1)
        efficiency_score = round((active_rate / max(blended_cac, 1)) * 100_000, 1)

        total_apps = int(total_issued / APPROVAL_RATE)
        return {
            "efficiency_score": efficiency_score,
            "payback_months": payback_months,
            "blended_cac_aed": round(blended_cac, 2),
            "avg_monthly_profit_per_card": round(avg_monthly_profit, 2),
            "approval_rate_pct": round(APPROVAL_RATE * 100, 1),
            "activation_rate_pct": round(t["avg_activation"] * 100, 1),
            "active_rate_pct": round(active_rate * 100, 1),
            "total_applications_monthly": total_apps,
            "total_issued_monthly": total_issued,
        }
