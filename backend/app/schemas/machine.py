"""
Pydantic schemas for Machine API
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum


class MachineStatus(str, Enum):
    OPERATIONAL = "OPERATIONAL"
    WARNING = "WARNING"
    MAINTENANCE = "MAINTENANCE"
    OFFLINE = "OFFLINE"


class MachineType(str, Enum):
    CRANE = "CRANE"
    EXCAVATOR = "EXCAVATOR"
    LOADER = "LOADER"
    DRILL = "DRILL"
    COMPRESSOR = "COMPRESSOR"
    GENERATOR = "GENERATOR"


# ============== Request Schemas (ESP32 sends these) ==============

class MachineTelemetryCreate(BaseModel):
    """Schema for ESP32 to POST machine telemetry"""
    machine_id: str = Field(..., example="MCH-1000")
    status: MachineStatus = Field(MachineStatus.OPERATIONAL)
    stress_index: int = Field(0, ge=0, le=100, example=45)
    temperature: float = Field(..., ge=0, le=200, example=62.5)
    vibration_rms: float = Field(0.0, ge=0, example=1.2)
    operating_hours: float = Field(0.0, ge=0, example=6.5)
    fuel_level: int = Field(100, ge=0, le=100, example=78)
    oil_pressure: int = Field(40, ge=0, le=100, example=42)


class MachineCreate(BaseModel):
    """Schema for registering a new machine"""
    machine_id: str = Field(..., example="MCH-1000")
    name: str = Field(..., example="Crane-01")
    type: MachineType = Field(..., example=MachineType.CRANE)
    model: Optional[str] = Field(None, example="CAT 330")
    serial_number: Optional[str] = Field(None, example="SN-12345")


# ============== Response Schemas (Dashboard receives these) ==============

class MachineTelemetryResponse(BaseModel):
    """Response schema for machine telemetry"""
    machine_id: str
    status: str
    stress_index: int
    temperature: float
    vibration_rms: float
    operating_hours: float
    fuel_level: int
    oil_pressure: int
    failure_probability: int
    health_score: int
    predicted_maintenance_days: int
    timestamp: datetime
    
    class Config:
        from_attributes = True


class MachineResponse(BaseModel):
    """Response schema for machine with latest telemetry"""
    machine_id: str
    name: str
    type: str
    model: Optional[str]
    serial_number: Optional[str]
    is_active: bool
    created_at: datetime
    # Latest telemetry (flattened)
    status: Optional[str] = None
    stress_index: Optional[int] = None
    temperature: Optional[float] = None
    vibration_rms: Optional[float] = None
    operating_hours: Optional[float] = None
    fuel_level: Optional[int] = None
    oil_pressure: Optional[int] = None
    failure_probability: Optional[int] = None
    health_score: Optional[int] = None
    predicted_maintenance_days: Optional[int] = None
    last_updated: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class MachineListResponse(BaseModel):
    """Response with list of machines"""
    machines: List[MachineResponse]
    total: int


class MachineHistoryResponse(BaseModel):
    """Response with historical telemetry for charts"""
    machine_id: str
    history: List[MachineTelemetryResponse]
