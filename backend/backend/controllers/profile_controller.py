from __future__ import annotations

from fastapi import HTTPException, Request

from backend.middleware.request_context import request_id, request_profile_seed, require_authenticated_user
from backend.schemas.api import MeOut, ProfileOut, ProfileUpdateIn
from backend.services import profile_service


def get_profile_me(request: Request) -> ProfileOut:
    user_id, user_email = require_authenticated_user(request)
    seed_display_name, seed_avatar_url = request_profile_seed(request)
    try:
        row = profile_service.ensure_profile(user_id, user_email, seed_display_name, seed_avatar_url)
    except LookupError as exc:
        raise HTTPException(status_code=500, detail={"code": "profile_missing", "message": str(exc)}) from exc
    return profile_service.row_to_profile(row, request_id(request))


def get_me(request: Request) -> MeOut:
    user_id, user_email = require_authenticated_user(request)
    seed_display_name, seed_avatar_url = request_profile_seed(request)
    try:
        row = profile_service.ensure_profile(user_id, user_email, seed_display_name, seed_avatar_url)
    except LookupError as exc:
        raise HTTPException(status_code=500, detail={"code": "profile_missing", "message": str(exc)}) from exc
    return profile_service.row_to_me(row, request_id(request))


def update_profile_me(payload: ProfileUpdateIn, request: Request) -> ProfileOut:
    user_id, user_email = require_authenticated_user(request)
    _, seed_avatar_url = request_profile_seed(request)
    try:
        row = profile_service.ensure_profile(
            user_id,
            user_email,
            payload.display_name,
            seed_avatar_url,
            theme=payload.theme,
            update_display_name=True,
        )
    except LookupError as exc:
        raise HTTPException(status_code=500, detail={"code": "profile_missing", "message": str(exc)}) from exc
    return profile_service.row_to_profile(row, request_id(request))


def complete_survey(request: Request) -> MeOut:
    user_id, user_email = require_authenticated_user(request)
    seed_display_name, seed_avatar_url = request_profile_seed(request)
    try:
        row = profile_service.ensure_profile(
            user_id,
            user_email,
            seed_display_name,
            seed_avatar_url,
            metadata_updates={"has_completed_survey": True, "survey_dismissed_until": None},
        )
    except LookupError as exc:
        raise HTTPException(status_code=500, detail={"code": "profile_missing", "message": str(exc)}) from exc
    return profile_service.row_to_me(row, request_id(request))


def dismiss_survey(request: Request) -> MeOut:
    user_id, user_email = require_authenticated_user(request)
    seed_display_name, seed_avatar_url = request_profile_seed(request)
    try:
        row = profile_service.ensure_profile(
            user_id,
            user_email,
            seed_display_name,
            seed_avatar_url,
            metadata_updates={"survey_dismissed_until": profile_service.dismiss_until_timestamp()},
        )
    except LookupError as exc:
        raise HTTPException(status_code=500, detail={"code": "profile_missing", "message": str(exc)}) from exc
    return profile_service.row_to_me(row, request_id(request))
