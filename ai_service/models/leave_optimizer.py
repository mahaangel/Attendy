"""
SmartAttend Leave Optimizer
Uses constraint-based optimization (scipy) to find the maximum number of
classes a student can safely skip while maintaining target attendance.
"""
import numpy as np
from scipy.optimize import minimize_scalar
from typing import Optional


class LeaveOptimizer:
    def max_safe_leaves(
        self,
        total_classes: int,
        attended_classes: int,
        target_pct: float = 75.0,
        future_classes: int = 20,
    ) -> int:
        """
        Find the maximum number of future classes that can be skipped
        while keeping final attendance >= target_pct.

        Formula:
          (attended + (future - skips)) / (total + future) >= target/100
          => skips <= future + attended - target/100 * (total + future)
        """
        if total_classes == 0:
            return 0

        max_skips = future_classes + attended_classes - (target_pct / 100) * (total_classes + future_classes)
        return max(0, int(np.floor(max_skips)))

    def optimal_skip_schedule(
        self,
        total_classes: int,
        attended_classes: int,
        target_pct: float = 75.0,
        future_classes: int = 20,
        classes_per_week: int = 5,
    ) -> dict:
        """
        Determine how to spread skips optimally across weeks.
        Returns per-week skip recommendation.
        """
        max_skips = self.max_safe_leaves(total_classes, attended_classes, target_pct, future_classes)
        n_weeks = max(1, future_classes // classes_per_week)

        if max_skips <= 0:
            return {
                "max_safe_skips": 0,
                "weekly_plan": [{"week": i + 1, "can_skip": 0, "must_attend": classes_per_week} for i in range(n_weeks)],
                "message": "You cannot afford to skip any classes. Attend all upcoming classes.",
            }

        # Spread skips evenly but safely (don't put all skips in one week)
        skips_per_week = max_skips // n_weeks
        extra_skips = max_skips % n_weeks

        weekly_plan = []
        for week_i in range(n_weeks):
            week_skips = skips_per_week + (1 if week_i < extra_skips else 0)
            week_skips = min(week_skips, classes_per_week - 1)  # keep at least 1 attendance per week
            weekly_plan.append({
                "week": week_i + 1,
                "can_skip": week_skips,
                "must_attend": classes_per_week - week_skips,
            })

        return {
            "max_safe_skips": max_skips,
            "weekly_plan": weekly_plan,
            "message": f"You can safely skip {max_skips} classes over the next {n_weeks} weeks.",
        }

    def recovery_plan(
        self,
        total_classes: int,
        attended_classes: int,
        target_pct: float = 75.0,
    ) -> dict:
        """
        If below target, calculate minimum consecutive classes to attend to recover.
        Uses binary search / formula for efficiency.
        """
        current_pct = (attended_classes / total_classes * 100) if total_classes > 0 else 100.0

        if current_pct >= target_pct:
            return {
                "needs_recovery": False,
                "current_percentage": round(current_pct, 2),
                "target_percentage": target_pct,
                "classes_needed": 0,
                "message": "Attendance is above target. No recovery needed!",
            }

        # Minimize: find x such that (attended + x) / (total + x) >= target/100
        # (attended + x) >= target/100 * (total + x)
        # attended + x >= target*total/100 + target*x/100
        # x(1 - target/100) >= target*total/100 - attended
        # x >= (target*total/100 - attended) / (1 - target/100)
        needed_num = (target_pct / 100) * total_classes - attended_classes
        needed_den = 1 - (target_pct / 100)

        if needed_den <= 0:
            return {
                "needs_recovery": True,
                "current_percentage": round(current_pct, 2),
                "target_percentage": target_pct,
                "classes_needed": 999,
                "message": "Cannot recover mathematically. Contact your institution.",
            }

        classes_needed = max(0, int(np.ceil(needed_num / needed_den)))

        return {
            "needs_recovery": True,
            "current_percentage": round(current_pct, 2),
            "target_percentage": target_pct,
            "classes_needed": classes_needed,
            "message": f"Attend the next {classes_needed} consecutive classes to reach {target_pct:.0f}% attendance.",
        }


# Singleton
leave_optimizer = LeaveOptimizer()
