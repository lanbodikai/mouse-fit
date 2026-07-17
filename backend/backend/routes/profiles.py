from __future__ import annotations

from fastapi import APIRouter, Request

from backend.controllers import profile_controller
from backend.schemas.api import MeOut, ProfileOut, ProfileUpdateIn

router = APIRouter()


@router.get("/api/profile/me", response_model=ProfileOut)
def get_profile_me(request: Request) -> ProfileOut:
    return profile_controller.get_profile_me(request)


@router.get("/api/me", response_model=MeOut)
def get_me(request: Request) -> MeOut:
    return profile_controller.get_me(request)


@router.post("/api/profile/me", response_model=ProfileOut)
def update_profile_me(payload: ProfileUpdateIn, request: Request) -> ProfileOut:
    return profile_controller.update_profile_me(payload, request)


@router.post("/api/survey/complete", response_model=MeOut)
def complete_survey(request: Request) -> MeOut:
    return profile_controller.complete_survey(request)


@router.post("/api/survey/dismiss", response_model=MeOut)
def dismiss_survey(request: Request) -> MeOut:
    return profile_controller.dismiss_survey(request)
