from typing import Literal
from pydantic import BaseModel, Field

WheelPosition = Literal["FL", "FR", "RL", "RR"]
ThermalStatus = Literal["COLD", "OPTIMAL", "WARM", "OVERHEATING", "BLISTERING"]
PressureStatus = Literal["OPTIMAL", "OVER_INFLATED", "UNDER_INFLATED"]


class TyreZoneTemps(BaseModel):
    inner_c: float = Field(..., description="Inner shoulder temperature in °C (camber sensitive)")
    center_c: float = Field(..., description="Center tread temperature in °C (pressure sensitive)")
    outer_c: float = Field(..., description="Outer shoulder temperature in °C (cornering slip sensitive)")


class TyreWheelThermalData(BaseModel):
    position: WheelPosition
    compound: str = Field(default="MEDIUM", description="SOFT, MEDIUM, HARD, etc.")
    surface_temp: TyreZoneTemps
    carcass_temp_c: float = Field(..., description="Deep internal core carcass temperature in °C")
    bulk_temp_c: float = Field(..., description="Weighted average wheel temperature in °C")
    thermal_status: ThermalStatus
    pressure_status: PressureStatus
    pressure_psi: float = Field(..., description="Current tyre pressure in PSI")
    camber_deg: float = Field(..., description="Static camber angle in degrees")
    graining_risk: bool = Field(default=False)
    blistering_risk: bool = Field(default=False)
    thermal_cliff_risk: bool = Field(default=False)
    camber_bias_c: float = Field(..., description="Inner minus outer temperature difference in °C")


class TyreThermalResponse(BaseModel):
    status: Literal["success", "fallback", "error"]
    year: int
    event: str
    session: str
    driver: str
    lap_number: int
    stint_laps: int
    wheels: dict[WheelPosition, TyreWheelThermalData]
    critical_alerts: list[str] = Field(default_factory=list)
