"""Common Pydantic models and OpenAPI response specifications."""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


class ApiErrorDetail(BaseModel):
    loc: list[str | int] = Field(default_factory=list, description="Error location path")
    msg: str = Field(..., description="Error message")
    type: str = Field(..., description="Error type identifier")


class ErrorResponse(BaseModel):
    """Standard OpenAPI error response payload."""

    detail: str | list[ApiErrorDetail] | dict[str, Any] = Field(
        ...,
        description="Detailed description or validation details of the error",
    )
    error: str | None = Field(
        default=None,
        description="Optional high-level error summary or rate-limit message",
    )


COMMON_AUTH_RESPONSES = {
    401: {
        "model": ErrorResponse,
        "description": "Unauthorized — missing, invalid, or expired Bearer token",
    },
}

COMMON_RATE_LIMIT_RESPONSES = {
    429: {
        "model": ErrorResponse,
        "description": "Too Many Requests — rate limit exceeded",
    },
}

COMMON_PROTECTED_RESPONSES = {
    **COMMON_AUTH_RESPONSES,
    **COMMON_RATE_LIMIT_RESPONSES,
}
