from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class TargetWeight(BaseModel):
    min: Optional[float] = None
    max: Optional[float] = None


class RagPreferences(BaseModel):
    grip: Optional[str] = None
    shape: Optional[str] = None
    wireless: Optional[bool] = None
    targetWeight: Optional[TargetWeight] = None


class RagQuery(BaseModel):
    session_id: str
    query: str
    top_k: int = 8
    prefs: Optional[RagPreferences] = None


class RagSource(BaseModel):
    id: str
    text: str
    meta: Dict[str, Any] = Field(default_factory=dict)
    score: float


class RagAnswer(BaseModel):
    answer: str
    sources: List[RagSource]


class CandidateProfile(BaseModel):
    grip: Optional[str] = None
    length_mm: Optional[float] = None
    width_mm: Optional[float] = None
    wireless: Optional[bool] = None
    budget: Optional[float] = None
    targetWeight: Optional[TargetWeight] = None


class CandidateRequest(BaseModel):
    profile: CandidateProfile = Field(default_factory=CandidateProfile)
    k: int = 48


class Candidate(BaseModel):
    id: str
    brand: str
    model: str
    length_mm: Optional[float] = None
    width_mm: Optional[float] = None
    height_mm: Optional[float] = None
    weight_g: Optional[float] = None
    shape: Optional[str] = None


class CandidateResponse(BaseModel):
    candidates: List[Candidate]


class RerankRequest(BaseModel):
    profile: CandidateProfile = Field(default_factory=CandidateProfile)
    candidates: List[Candidate]


class RerankItem(BaseModel):
    id: str
    score: Optional[float] = None
    reason: Optional[str] = None
    flags: List[str] = Field(default_factory=list)


class RerankResponse(BaseModel):
    grip: Optional[str] = None
    ranked: List[RerankItem]
    best_id: Optional[str] = None


class ReportRequest(BaseModel):
    profile: CandidateProfile = Field(default_factory=CandidateProfile)
    candidates: List[Candidate]


class ReportResponse(BaseModel):
    report: str
