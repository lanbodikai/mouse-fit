from __future__ import annotations

from typing import Optional

from backend.repositories import reports_repository
from backend.schemas.api import GripOut, MeasurementOut, Mouse, MouseRecommendation, Report
from backend.utils.common import utc_now


def score_mouse(mouse: Mouse, measurement: MeasurementOut, grip: Optional[GripOut]) -> MouseRecommendation:
    length_diff = abs((mouse.length_mm or 0) - measurement.length_mm)
    width_diff = abs((mouse.width_mm or 0) - measurement.width_mm)
    base_score = max(0.0, 100 - (length_diff * 1.2 + width_diff * 1.4))
    reason_parts = [
        f"Length off by {length_diff:.1f} mm",
        f"width off by {width_diff:.1f} mm",
    ]
    if grip and mouse.grips:
        if grip.grip.lower() in [saved_grip.lower() for saved_grip in mouse.grips]:
            base_score += 8
            reason_parts.append("matches grip preference")
        else:
            base_score -= 6
            reason_parts.append("different grip profile")
    return MouseRecommendation(
        id=mouse.id,
        brand=mouse.brand,
        model=mouse.model,
        score=round(base_score, 2),
        reason="; ".join(reason_parts),
    )


def build_report(
    session_id: str,
    user_id: Optional[str],
    measurement: MeasurementOut,
    grip: Optional[GripOut],
    mice: list[Mouse],
    correlation_id: str,
) -> Report:
    scored = [score_mouse(mouse, measurement, grip) for mouse in mice if mouse.length_mm and mouse.width_mm]
    scored.sort(key=lambda item: item.score, reverse=True)
    recommendations = scored[:5]

    if grip:
        summary = (
            f"Based on a {measurement.length_mm:.1f} x {measurement.width_mm:.1f} mm hand and "
            f"{grip.grip} grip, these mice fit your profile best."
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


def save_report(report: Report) -> None:
    reports_repository.insert_report(report.session_id, report.user_id, report.model_dump(), report.created_at)


def read_latest_report(session_id: str, user_id: Optional[str], correlation_id: str) -> Report | None:
    row = reports_repository.latest_report_row(session_id, user_id)
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
