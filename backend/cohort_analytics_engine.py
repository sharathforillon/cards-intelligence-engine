import logging
from collections import defaultdict

logger = logging.getLogger("CohortAnalytics")


class CohortAnalyticsEngine:

    """
    Tracks performance of customer acquisition cohorts
    and derives behavioral curves used by the strategy engine.
    """

    def __init__(self):

        self.cohorts = defaultdict(list)


    def record_monthly_metrics(
        self,
        cohort_month,
        tenure_month,
        spend,
        revolve_rate,
        credit_loss,
        active_customers
    ):

        self.cohorts[cohort_month].append({

            "tenure": tenure_month,
            "spend": spend,
            "revolve": revolve_rate,
            "loss": credit_loss,
            "active": active_customers

        })


    def compute_spend_ramp(self):

        ramp = defaultdict(list)

        for cohort, data in self.cohorts.items():

            for entry in data:

                ramp[entry["tenure"]].append(entry["spend"])

        ramp_curve = {}

        for month, values in ramp.items():

            ramp_curve[month] = sum(values) / len(values)

        max_spend = max(ramp_curve.values())

        for m in ramp_curve:

            ramp_curve[m] = ramp_curve[m] / max_spend

        return ramp_curve


    def compute_churn_curve(self):

        churn = defaultdict(list)

        for cohort, data in self.cohorts.items():

            initial = data[0]["active"]

            for entry in data:

                survival = entry["active"] / initial

                churn[entry["tenure"]].append(survival)

        churn_curve = {}

        for month, values in churn.items():

            churn_curve[month] = sum(values) / len(values)

        return churn_curve


    def compute_loss_curve(self):

        losses = defaultdict(list)

        for cohort, data in self.cohorts.items():

            for entry in data:

                losses[entry["tenure"]].append(entry["loss"])

        loss_curve = {}

        for month, values in losses.items():

            loss_curve[month] = sum(values) / len(values)

        return loss_curve


    def export_behavioral_curves(self):

        return {

            "spend_ramp": self.compute_spend_ramp(),
            "churn_curve": self.compute_churn_curve(),
            "loss_curve": self.compute_loss_curve()

        }