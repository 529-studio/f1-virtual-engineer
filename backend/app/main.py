from fastapi import FastAPI
from pydantic import BaseModel

from app.schemas.telemetry import ApiError, TelemetryQueryRequest, TelemetryResponse, TelemetrySummary
from tools.fastf1_helper import get_session_telemetry_summary

app = FastAPI(title="Apex-Intelligence: Virtual Race Engineer API")

class QueryRequest(BaseModel):
    query: str
    driver: str
    session_info: dict

@app.get("/")
async def root():
    return {"message": "Welcome to Apex-Intelligence Virtual Race Engineer API"}

@app.post("/analyze")
async def analyze_race_data(request: QueryRequest):
    # This will be the entry point for our LangGraph Agent
    return {
        "status": "success",
        "agent_response": f"Analyzing data for {request.driver}... (Agent logic coming soon)",
        "query": request.query
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
