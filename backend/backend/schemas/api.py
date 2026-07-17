from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


class Mouse(BaseModel):
    id: str
    brand: str
    model: str
    variant: Optional[str] = None
    length_mm: Optional[float] = None
    width_mm: Optional[float] = None
    height_mm: Optional[float] = None
    weight_g: Optional[float] = None
    ergo: Optional[bool] = None
    wired: Optional[bool] = None
    shape: Optional[str] = None
    hump: Optional[str] = None
    grips: List[str] = Field(default_factory=list)
    hands: List[str] = Field(default_factory=list)
    product_url: Optional[str] = None
    image_url: Optional[str] = None
    image_urls: List[str] = Field(default_factory=list)
    source_handle: Optional[str] = None
    availability_status: Optional[str] = None
    shape_raw: Optional[str] = None
    hump_raw: Optional[str] = None
    hump_bucket: Optional[str] = None
    front_flare_raw: Optional[str] = None
    side_curvature_raw: Optional[str] = None
    side_profile: Optional[str] = None
    hand_compatibility: Optional[str] = None
    affiliate_links: List[Dict[str, Any]] = Field(default_factory=list)
    brand_discount: Optional[str] = None
    discount_code: Optional[str] = None
    price_usd: Optional[float] = None
    price_status: Optional[str] = None
    source_payload: Optional[Dict[str, Any]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class MeasurementIn(BaseModel):
    session_id: str
    length_mm: float
    width_mm: float


class MeasurementOut(BaseModel):
    session_id: str
    length_mm: float
    width_mm: float
    length_cm: float
    width_cm: float
    user_id: Optional[str] = None
    request_id: Optional[str] = None
    created_at: str


class GripIn(BaseModel):
    session_id: str
    grip: str
    confidence: Optional[float] = 0.0


class GripOut(BaseModel):
    session_id: str
    grip: str
    confidence: float
    user_id: Optional[str] = None
    request_id: Optional[str] = None
    created_at: str


class MouseRecommendation(BaseModel):
    id: str
    brand: str
    model: str
    score: float
    reason: str


class Report(BaseModel):
    session_id: str
    user_id: Optional[str] = None
    measurement: MeasurementOut
    grip: Optional[GripOut]
    recommendations: List[MouseRecommendation]
    summary: str
    request_id: Optional[str] = None
    created_at: str


class ProfileOut(BaseModel):
    id: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    theme: Optional[Literal["light", "dark"]] = None
    created_at: str
    updated_at: str
    request_id: Optional[str] = None


class ProfileUpdateIn(BaseModel):
    display_name: Optional[str] = None
    theme: Optional[Literal["light", "dark"]] = None

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            return None
        if len(normalized) > 80:
            raise ValueError("display_name must be 80 characters or fewer.")
        return normalized


class MeOut(BaseModel):
    id: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    theme: Optional[Literal["light", "dark"]] = None
    hasCompletedSurvey: bool = False
    surveyDismissedUntil: Optional[str] = None
    created_at: str
    updated_at: str
    request_id: Optional[str] = None
