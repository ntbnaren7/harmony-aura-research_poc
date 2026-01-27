"""
Pydantic schemas for Worker API
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum


class RiskState(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


# ============== Request Schemas (ESP32 sends these) ==============

class WorkerVitalsCreate(BaseModel):
    """Schema for ESP32 to POST worker vitals"""
    worker_id: str = Field(..., example="WK-7822")
    heart_rate: int = Field(..., ge=40, le=220, example=85)
    hrv: int = Field(..., ge=0, le=200, example=45)
    temperature: float = Field(..., ge=30.0, le=45.0, example=36.8)
    jerk_count: int = Field(0, ge=0, example=2)
    machine_stress_index: int = Field(0, ge=0, le=100, example=35)
    vibration_rms: float = Field(0.0, ge=0, example=0.8)


class WorkerCreate(BaseModel):
    """Schema for registering a new worker"""
    worker_id: str = Field(..., example="WK-7822")
    name: Optional[str] = Field(None, example="John Doe")
    department: Optional[str] = Field(None, example="Construction Team A")


class IssueBreakRequest(BaseModel):
    """Schema for issuing a break"""
    worker_id: str


# ============== Response Schemas (Dashboard receives these) ==============

class WorkerVitalsResponse(BaseModel):
    """Response schema for worker vitals"""
    worker_id: str
    heart_rate: int
    hrv: int
    temperature: float
    jerk_count: int
    machine_stress_index: int
    vibration_rms: float
    cis_score: int
    risk_state: str
    break_flag: bool
    timestamp: datetime
    
    class Config:
        from_attributes = True


class WorkerResponse(BaseModel):
    """Response schema for worker with latest vitals"""
    worker_id: str
    name: Optional[str]
    department: Optional[str]
    is_active: bool
    created_at: datetime
    # Latest vitals (flattened)
    heart_rate: Optional[int] = None
    hrv: Optional[int] = None
    temperature: Optional[float] = None
    jerk_count: Optional[int] = None
    machine_stress_index: Optional[int] = None
    vibration_rms: Optional[float] = None
    cis_score: Optional[int] = None
    risk_state: Optional[str] = None
    break_flag: Optional[bool] = None
    last_updated: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class WorkerListResponse(BaseModel):
    """Response with list of workers"""
    workers: List[WorkerResponse]
    total: int
    last_esp32_payload: Optional[dict] = None


class WorkerHistoryResponse(BaseModel):
    """Response with historical vitals for charts"""
    worker_id: str
    history: List[WorkerVitalsResponse]
