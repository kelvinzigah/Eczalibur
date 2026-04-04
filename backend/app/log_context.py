"""
Log context helpers — port of lib/logContext.ts and computeLogSummary from
appointment-summary+api.ts.
"""

from __future__ import annotations

from datetime import datetime, timezone

from .schemas import FlareLog


def build_chat_log_context(logs: list[FlareLog]) -> str:
    """Port of buildChatLogContext() from lib/logContext.ts."""
    if not logs:
        return "No flare logs available yet."

    recent = logs[-30:]
    sorted_logs = sorted(recent, key=lambda l: l.timestamp)

    # Zone counts
    zone_counts: dict[str, int] = {"green": 0, "yellow": 0, "red": 0}
    for log in recent:
        zone_counts[log.zone] = zone_counts.get(log.zone, 0) + 1

    dominant_zone = max(zone_counts.items(), key=lambda x: x[1])

    # Area counts
    area_counts: dict[str, int] = {}
    for log in recent:
        for area in log.affected_areas:
            area_counts[area] = area_counts.get(area, 0) + 1
    top_areas = ", ".join(
        f"{area} ({count}x)"
        for area, count in sorted(area_counts.items(), key=lambda x: -x[1])[:2]
    ) or "none recorded"

    # Day-of-week pattern
    day_counts: dict[str, int] = {}
    for log in recent:
        try:
            dt = datetime.fromisoformat(log.timestamp.replace("Z", "+00:00"))
            day = dt.strftime("%A")
        except ValueError:
            day = "Unknown"
        day_counts[day] = day_counts.get(day, 0) + 1
    top_day = max(day_counts.items(), key=lambda x: x[1])[0] if day_counts else "N/A"

    # Average mood
    avg_mood = sum(l.mood_score for l in recent) / len(recent)

    # Period
    period_start = _format_date(sorted_logs[0].timestamp)
    period_end = _format_date(sorted_logs[-1].timestamp)

    pattern_header = (
        f"Dominant zone: {dominant_zone[0].upper()} ({dominant_zone[1]}/{len(recent)} entries). "
        f"Most affected areas: {top_areas}.\n"
        f"Avg itch score: {avg_mood:.1f}/5. Red zone events: {zone_counts['red']}. "
        f"Flares most frequent on: {top_day}."
    )

    summary_block = (
        f"Period: {period_start} → {period_end} | {len(recent)} entries | "
        f"Green: {zone_counts['green']}  Yellow: {zone_counts['yellow']}  Red: {zone_counts['red']}"
    )

    entries = "\n".join(
        f"[{_format_date(log.timestamp)}] {log.zone.upper()} | Mood: {log.mood_score}/5 | "
        f"Areas: {', '.join(log.affected_areas)} | "
        f"Notes: {'[child-entered, unverified] ' + log.notes if log.notes else 'none'}"
        for log in recent
    )

    return (
        f"=== PATTERN HEADER ===\n{pattern_header}\n\n"
        f"=== LOG SUMMARY ===\n{summary_block}\n\n"
        f"=== INDIVIDUAL ENTRIES (last {len(recent)}) ===\n{entries}"
    )


def compute_log_summary(logs: list[FlareLog], appointment_date: str) -> dict:
    """Port of computeLogSummary() from app/api/appointment-summary+api.ts."""
    if not logs:
        return {
            "period_start": "N/A",
            "period_end": "N/A",
            "total_logs": 0,
            "green_count": 0,
            "yellow_count": 0,
            "red_count": 0,
            "average_mood_score": 0.0,
            "recent_zone": "unknown",
            "notable_events": [],
        }

    sorted_logs = sorted(logs, key=lambda l: l.timestamp)
    green_count = sum(1 for l in logs if l.zone == "green")
    yellow_count = sum(1 for l in logs if l.zone == "yellow")
    red_count = sum(1 for l in logs if l.zone == "red")
    avg_mood = sum(l.mood_score for l in logs) / len(logs)

    notable_events: list[str] = []

    # Flag red zone events
    for log in logs:
        if log.zone == "red":
            date = _format_date(log.timestamp)
            areas = ", ".join(log.affected_areas)
            notes_part = f" Notes: {log.notes}" if log.notes else ""
            notable_events.append(
                f"RED zone event on {date} — areas: {areas}. Mood: {log.mood_score}/5.{notes_part}"
            )

    # Flag high itch scores (non-red)
    high_itch = [l for l in logs if l.mood_score >= 4 and l.zone != "red"][:3]
    for log in high_itch:
        date = _format_date(log.timestamp)
        notable_events.append(
            f"High itch score ({log.mood_score}/5) on {date} — {log.zone} zone."
        )

    return {
        "period_start": _format_date(sorted_logs[0].timestamp),
        "period_end": _format_date(sorted_logs[-1].timestamp),
        "total_logs": len(logs),
        "green_count": green_count,
        "yellow_count": yellow_count,
        "red_count": red_count,
        "average_mood_score": avg_mood,
        "recent_zone": sorted_logs[-1].zone,
        "notable_events": notable_events[:6],
    }


def _format_date(iso_timestamp: str) -> str:
    try:
        dt = datetime.fromisoformat(iso_timestamp.replace("Z", "+00:00"))
        return dt.strftime("%-m/%-d/%Y")
    except ValueError:
        return iso_timestamp
