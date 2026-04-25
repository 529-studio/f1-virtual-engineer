from fastapi import FastAPI

from agents.race_engineer import analyze_query
from app.schemas.analyze import AnalyzeResponse
from app.schemas.telemetry import ApiError, TelemetryQueryRequest, TelemetryResponse, TelemetrySummary
from pydantic import BaseModel
from tools.fastf1_helper import get_session_telemetry_summary

app = FastAPI(title="Apex-Intelligence: Virtual Race Engineer API")


class QueryRequest(BaseModel):
    query: str
    driver: str | None = None
    session_info: dict | None = None


@app.get("/")
async def root():
    return {"message": "Welcome to Apex-Intelligence Virtual Race Engineer API"}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_race_data(request: QueryRequest):
    result = analyze_query(request.query)
    return {
        "status": "error" if result.get("error") else "success",
        "agent_response": result["response_text"],
        "query": request.query,
        "intent": result["intent"],
        "telemetry_data": result["telemetry_data"],
        "strategy_data": result.get("strategy_data"),
        "error": result["error"],
        "memory": result.get("memory"),
        "execution": result.get("execution"),
        "retry": result.get("retry"),
    }


@app.post("/telemetry", response_model=TelemetryResponse)
async def get_telemetry(request: TelemetryQueryRequest):
    telemetry = get_session_telemetry_summary(
        year=request.year,
        event=request.event,
        session_type=request.session_type,
        driver=request.driver,
    )
    summary = TelemetrySummary(**telemetry)
    if summary.fallback:
        return TelemetryResponse(
            status="error",
            data=summary,
            error=ApiError(code="TELEMETRY_UNAVAILABLE", message=summary.fallback_reason or "Telemetry unavailable."),
        )
    return TelemetryResponse(status="success", data=summary, error=None)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
