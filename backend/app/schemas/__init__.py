# Schema package for API contracts.

from app.schemas.common import (
    ApiErrorDetail,
    COMMON_AUTH_RESPONSES,
    COMMON_PROTECTED_RESPONSES,
    COMMON_RATE_LIMIT_RESPONSES,
    ErrorResponse,
)

__all__ = [
    "ApiErrorDetail",
    "COMMON_AUTH_RESPONSES",
    "COMMON_PROTECTED_RESPONSES",
    "COMMON_RATE_LIMIT_RESPONSES",
    "ErrorResponse",
]
