from typing import Literal

from pydantic import BaseModel

from app.schemas.telemetry import TelemetrySummary


class StrategySummary(BaseModel):
    recommended_pit_window_laps: list[int]
    undercut_risk: str
    overcut_risk: str
    confidence_band: str
    assumptions: list[str]
    rationale: list[str]
    fallback: bool = False
    fallback_reason: str | None = None


class AnalyzeIntent(BaseModel):
    intent: str | None = None
    intent_type: Literal["telemetry", "strategy"] | None = None
    driver: str | None = None
    driver_candidates: list[str] = []
    year: int | None = None
    event: str | None = None
    session_type: str | None = None
    needs_clarification: bool = False
    clarification_message: str | None = None


class AnalyzeMemory(BaseModel):
    history_size: int
    retention_cap: int
    last_driver: str | None = None


class AnalyzeExecution(BaseModel):
    step_limit: int
    duration_limit_seconds: float
    duration_ms: float
    termination_reason: str


class AnalyzeRetry(BaseModel):
    count: int
    max_retries: int
    retryable_exhausted: bool
    retry_backoff_seconds: float | None = None


class AnalyzeResponse(BaseModel):
    status: Literal["success", "error"]
    agent_response: str
    query: str
    intent: AnalyzeIntent
    telemetry_data: TelemetrySummary | dict = {}
    strategy_data: StrategySummary | None = None
    error: str | None = None
    memory: AnalyzeMemory | None = None
    execution: AnalyzeExecution | None = None
    retry: AnalyzeRetry | None = None
