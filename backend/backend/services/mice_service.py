from __future__ import annotations

from backend.repositories import mice_repository
from backend.schemas.api import Mouse


def list_mice() -> list[Mouse]:
    return mice_repository.list_mice()


def get_mouse(mouse_id: str) -> Mouse | None:
    return mice_repository.get_mouse(mouse_id)


def list_scoreable_mice() -> list[Mouse]:
    return mice_repository.list_scoreable_mice()
