"""
SmartAttend Recommendation Engine
Generates personalized recovery & improvement strategies based on:
- Risk level
- Attendance history
- Subject-specific data
- Behavioral patterns
"""
from typing import List, Optional


class RecommendationEngine:
    def _classify_pattern(self, series: List[int]) -> str:
        if not series or len(series) < 5:
            return "insufficient_data"
        recent = series[-10:]
        rate = sum(recent) / len(recent)
        older = series[:-10] if len(series) > 10 else series
        old_rate = sum(older) / max(len(older), 1)
        if rate > old_rate + 0.1:
            return "improving"
        elif rate < old_rate - 0.1:
            return "declining"
        elif rate > 0.8:
            return "excellent"
        elif rate > 0.65:
            return "average"
        else:
            return "poor"

    def generate_recommendations(
        self,
        risk_level: str,
        current_pct: float,
        target_pct: float,
        subject_name: str,
        safe_leaves: int,
        classes_needed_for_recovery: int = 0,
        attendance_series: Optional[List[int]] = None,
    ) -> List[dict]:
        pattern = self._classify_pattern(attendance_series or [])
        recs = []

        if risk_level == "Danger":
            recs.append({
                "type": "critical",
                "icon": "🚨",
                "title": "Immediate Action Required",
                "description": f"Your attendance in {subject_name} is critically low at {current_pct:.1f}%.",
                "action": f"Attend the next {classes_needed_for_recovery} consecutive classes without exception.",
                "priority": 1,
            })
            recs.append({
                "type": "warning",
                "icon": "📞",
                "title": "Communicate with Professor",
                "description": "Inform your professor about your situation.",
                "action": "Request for condoned attendance or makeup assignments if eligible.",
                "priority": 2,
            })
            if pattern == "declining":
                recs.append({
                    "type": "behavioral",
                    "icon": "📉",
                    "title": "Declining Pattern Detected",
                    "description": "Your attendance has been consistently declining. This is a serious trend.",
                    "action": "Set daily alarm reminders 30 minutes before each class. Sit near the front to stay engaged.",
                    "priority": 3,
                })
        elif risk_level == "Warning":
            recs.append({
                "type": "caution",
                "icon": "⚠️",
                "title": "Stay Consistent This Week",
                "description": f"You're close to the boundary in {subject_name} ({current_pct:.1f}%). A few absences could push you to Danger.",
                "action": "Do not miss any classes for the next 2 weeks. Even one absence could be risky.",
                "priority": 1,
            })
            recs.append({
                "type": "planning",
                "icon": "📅",
                "title": "Plan Your Schedule",
                "description": "Only plan important leaves now. Avoid casual skipping.",
                "action": f"You have {safe_leaves} safe leave(s) remaining. Use them wisely.",
                "priority": 2,
            })
        else:
            recs.append({
                "type": "success",
                "icon": "✅",
                "title": "Great Attendance!",
                "description": f"{subject_name} attendance: {current_pct:.1f}% — well above the {target_pct:.0f}% target.",
                "action": f"You can afford up to {safe_leaves} more absence(s) and still remain safe.",
                "priority": 1,
            })
            if safe_leaves > 5:
                recs.append({
                    "type": "tip",
                    "icon": "💡",
                    "title": "Smart Buffer",
                    "description": "You have a comfortable buffer. Use planned leaves for important events.",
                    "action": "Consider attending optional study sessions to further boost your standing.",
                    "priority": 2,
                })

        # Pattern-based general tips
        if pattern == "declining":
            recs.append({
                "type": "behavioral",
                "icon": "🔄",
                "title": "Reverse the Declining Trend",
                "description": "Analysis shows your attendance is declining over time.",
                "action": "Find an accountability partner. Study with a friend who has good attendance.",
                "priority": 4,
            })
        elif pattern == "excellent":
            recs.append({
                "type": "achievement",
                "icon": "🏆",
                "title": "Excellent Consistency! Keep it up!",
                "description": "Your attendance pattern is outstanding.",
                "action": "Maintain this habit — it directly correlates with academic performance.",
                "priority": 4,
            })

        return sorted(recs, key=lambda r: r["priority"])

    def generate_study_tips(self, risk_level: str) -> List[str]:
        base_tips = [
            "Set phone reminders 20 minutes before each class.",
            "Create a weekly schedule and stick to it.",
            "Use the SmartAttend calendar to track upcoming classes.",
            "Sleep at least 7 hours to ensure you wake up for morning classes.",
        ]
        if risk_level == "Danger":
            return [
                "🚨 Your attendance is critical. Make class attendance your TOP priority.",
                "🗓 Mark all your class times in your phone calendar with alarms.",
                "📚 Talk to your professor immediately about your situation.",
                "👥 Find a study partner who will hold you accountable.",
                "🏠 Eliminate distractions on class days — no late nights before.",
            ] + base_tips[:2]
        elif risk_level == "Warning":
            return [
                "⚠️ You are near the danger zone. Avoid all non-essential absences.",
                "📅 Use the leave planner before skipping any class.",
                "🔔 Use SmartAttend's reminder system for all upcoming classes.",
            ] + base_tips
        else:
            return [
                "✅ You're doing great! Keep maintaining this attendance rate.",
                "💡 Use your safe leaves strategically for important events.",
                "📊 Check your trend weekly to catch any dips early.",
            ] + base_tips


recommendation_engine = RecommendationEngine()
