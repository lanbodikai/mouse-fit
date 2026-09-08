from __future__ import annotations

from typing import Optional

from backend.repositories import reports_repository
from backend.schemas.api import GripOut, MeasurementOut, Mouse, MouseRecommendation, Report, ReportPreferences
from backend.services import legacy_matcher
from backend.utils.common import utc_now


def build_report(
    session_id: str,
    user_id: Optional[str],
    measurement: MeasurementOut,
    grip: Optional[GripOut],
    mice: list[Mouse],
    correlation_id: str,
    preferences: Optional[ReportPreferences] = None,
) -> Report:
    preferences = preferences or ReportPreferences()
    matched = legacy_matcher.match(mice, measurement, preferences, grip.grip if grip else None)
    recommendations = [
        MouseRecommendation(
            id=candidate.mouse.id,
            brand=candidate.mouse.brand,
            model=candidate.mouse.model,
            score=round(score, 2),
            reason=(
                f"Legacy fit match: {candidate.length:.1f} mm body, "
                f"{candidate.grip_width:.1f} mm estimated grip width, "
                f"{candidate.shape} shell and {candidate.hump} hump."
            ),
        )
        for candidate, score in matched
    ]

    if grip:
        summary = (
            f"Legacy matcher results for a {measurement.length_mm:.1f} x {measurement.width_mm:.1f} mm hand and "
            f"{preferences.primaryGrip or grip.grip} grip."
        )
    else:
        summary = (
            f"Based on a {measurement.length_mm:.1f} x {measurement.width_mm:.1f} mm hand, "
            "these mice fit your profile best."
        )

    return Report(
        session_id=session_id,
        user_id=user_id,
        measurement=measurement,
        grip=grip,
        recommendations=recommendations,
        summary=summary,
        request_id=correlation_id,
        created_at=utc_now(),
    )


def save_report(report: Report, idempotency_key: Optional[str] = None) -> None:
    reports_repository.insert_report(
        report.session_id, report.user_id, report.model_dump(), report.created_at, idempotency_key
    )


def read_latest_report(
    session_id: str,
    user_id: Optional[str],
    correlation_id: str,
    allow_guest_fallback: bool = True,
) -> Report | None:
    row = reports_repository.latest_report_row(session_id, user_id, allow_guest_fallback)
    if not row:
        return None

    report_json = row.get("report_json")
    if isinstance(report_json, dict):
        report = Report.model_validate(report_json)
        report.request_id = correlation_id
        return report
    if isinstance(report_json, str):
        try:
            report = Report.model_validate_json(report_json)
            report.request_id = correlation_id
            return report
        except ValueError:
            raise ValueError("Invalid stored report format")
    raise ValueError("Invalid stored report format")
