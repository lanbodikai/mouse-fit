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
    budgetMin: Optional[float] = None
    budgetMax: Optional[float] = None
    weightPreference: Optional[str] = None
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


class FitSource(BaseModel):
    id: str
    title: str
    url: Optional[str] = None
    kind: str = "rag"
    snippet: Optional[str] = None


class FitRecommendation(BaseModel):
    id: str
    brand: str
    model: str
    score: float
    reason: str
    length_mm: Optional[float] = None
    width_mm: Optional[float] = None
    height_mm: Optional[float] = None
    weight_g: Optional[float] = None
    citations: List[str] = Field(default_factory=list)


class FitRequest(BaseModel):
    profile: CandidateProfile = Field(default_factory=CandidateProfile)
    top_k: int = 3
    candidate_k: int = 36
    llm_mode: str = "auto"  # auto | xai_only | google_only | rule_only
    allow_fallback: bool = True
    llm_model: Optional[str] = None


class FitResponse(BaseModel):
    recommendations: List[FitRecommendation]
    sources: List[FitSource] = Field(default_factory=list)
    provider: str
    model: str
