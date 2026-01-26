"""
Machine API endpoints
- POST /api/machines/telemetry - ESP32 pushes sensor data
- GET /api/machines - Dashboard fetches machine list
- GET /api/machines/{id}/history - Historical data for charts
"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models.machine import Machine, MachineTelemetry
from ..schemas.machine import (
    MachineTelemetryCreate,
    MachineCreate,
    MachineResponse,
    MachineListResponse,
    MachineHistoryResponse,
    MachineTelemetryResponse,
)

router = APIRouter(prefix="/api/machines", tags=["Machines"])


def calculate_health_score(telemetry: MachineTelemetryCreate) -> int:
    """
    Calculate machine health score based on telemetry
    Higher score = healthier machine
    """
    score = 100
    
    # Stress index penalties
    if telemetry.stress_index > 80:
        score -= 30
    elif telemetry.stress_index > 60:
        score -= 15
    elif telemetry.stress_index > 40:
        score -= 5
    
    # Temperature penalties
    if telemetry.temperature > 90:
        score -= 30
    elif telemetry.temperature > 75:
        score -= 15
    elif telemetry.temperature > 60:
        score -= 5
    
    # Vibration penalties
    if telemetry.vibration_rms > 3.0:
        score -= 25
    elif telemetry.vibration_rms > 2.0:
        score -= 15
    elif telemetry.vibration_rms > 1.5:
        score -= 5
    
    # Oil pressure penalties
    if telemetry.oil_pressure < 20:
        score -= 25
    elif telemetry.oil_pressure < 30:
        score -= 10
    
    return max(0, min(100, score))


def calculate_failure_probability(health_score: int, telemetry: MachineTelemetryCreate) -> int:
    """Calculate failure probability based on health and metrics"""
    # Base probability inversely related to health
    prob = max(0, 100 - health_score)
    
    # Additional factors
    if telemetry.vibration_rms > 2.5:
        prob += 15
    if telemetry.temperature > 80:
        prob += 10
    if telemetry.oil_pressure < 25:
        prob += 15
    
    return min(100, max(0, prob))


def determine_status(health_score: int, failure_prob: int) -> str:
    """Determine machine status based on health"""
    if health_score < 40 or failure_prob > 70:
        return "MAINTENANCE"
    elif health_score < 60 or failure_prob > 50:
        return "WARNING"
    return "OPERATIONAL"


@router.post("/telemetry", response_model=MachineTelemetryResponse)
async def create_machine_telemetry(
    telemetry: MachineTelemetryCreate,
    db: Session = Depends(get_db)
):
    """
    ESP32 endpoint: Push machine telemetry
    Automatically creates machine if doesn't exist
    """
    # Check if machine exists
    machine = db.query(Machine).filter(Machine.machine_id == telemetry.machine_id).first()
    if not machine:
        raise HTTPException(
            status_code=404,
            detail=f"Machine {telemetry.machine_id} not registered. Please register first."
        )
    
    # Calculate health metrics
    health_score = calculate_health_score(telemetry)
    failure_prob = calculate_failure_probability(health_score, telemetry)
    status = determine_status(health_score, failure_prob)
    predicted_days = max(1, int((100 - failure_prob) / 3))
    
    # Create telemetry record
    db_telemetry = MachineTelemetry(
        machine_id=telemetry.machine_id,
        status=status,
        stress_index=telemetry.stress_index,
        temperature=telemetry.temperature,
        vibration_rms=telemetry.vibration_rms,
        operating_hours=telemetry.operating_hours,
        fuel_level=telemetry.fuel_level,
        oil_pressure=telemetry.oil_pressure,
        failure_probability=failure_prob,
        health_score=health_score,
        predicted_maintenance_days=predicted_days,
    )
    db.add(db_telemetry)
    db.commit()
    db.refresh(db_telemetry)
    
    return db_telemetry


@router.post("/register", response_model=MachineResponse)
async def register_machine(
    machine: MachineCreate,
    db: Session = Depends(get_db)
):
    """Register a new machine"""
    existing = db.query(Machine).filter(Machine.machine_id == machine.machine_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Machine already exists")
    
    db_machine = Machine(**machine.model_dump())
    db.add(db_machine)
    db.commit()
    db.refresh(db_machine)
    
    return MachineResponse(
        machine_id=db_machine.machine_id,
        name=db_machine.name,
        type=db_machine.type,
        model=db_machine.model,
        serial_number=db_machine.serial_number,
        is_active=db_machine.is_active,
        created_at=db_machine.created_at,
    )


@router.get("", response_model=MachineListResponse)
async def get_machines(
    active_only: bool = Query(True, description="Only return active machines"),
    db: Session = Depends(get_db)
):
    """Get all machines with their latest telemetry"""
    query = db.query(Machine)
    if active_only:
        query = query.filter(Machine.is_active == True)
    
    machines = query.all()
    result = []
    
    for machine in machines:
        # Get latest telemetry
        latest_telemetry = db.query(MachineTelemetry).filter(
            MachineTelemetry.machine_id == machine.machine_id
        ).order_by(desc(MachineTelemetry.timestamp)).first()
        
        machine_data = MachineResponse(
            machine_id=machine.machine_id,
            name=machine.name,
            type=machine.type,
            model=machine.model,
            serial_number=machine.serial_number,
            is_active=machine.is_active,
            created_at=machine.created_at,
        )
        
        if latest_telemetry:
            machine_data.status = latest_telemetry.status
            machine_data.stress_index = latest_telemetry.stress_index
            machine_data.temperature = latest_telemetry.temperature
            machine_data.vibration_rms = latest_telemetry.vibration_rms
            machine_data.operating_hours = latest_telemetry.operating_hours
            machine_data.fuel_level = latest_telemetry.fuel_level
            machine_data.oil_pressure = latest_telemetry.oil_pressure
            machine_data.failure_probability = latest_telemetry.failure_probability
            machine_data.health_score = latest_telemetry.health_score
            machine_data.predicted_maintenance_days = latest_telemetry.predicted_maintenance_days
            machine_data.last_updated = latest_telemetry.timestamp
        
        result.append(machine_data)
    
    return MachineListResponse(machines=result, total=len(result))


@router.get("/{machine_id}", response_model=MachineResponse)
async def get_machine(
    machine_id: str,
    db: Session = Depends(get_db)
):
    """Get single machine with latest telemetry"""
    machine = db.query(Machine).filter(Machine.machine_id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    latest_telemetry = db.query(MachineTelemetry).filter(
        MachineTelemetry.machine_id == machine_id
    ).order_by(desc(MachineTelemetry.timestamp)).first()
    
    machine_data = MachineResponse(
        machine_id=machine.machine_id,
        name=machine.name,
        type=machine.type,
        model=machine.model,
        serial_number=machine.serial_number,
        is_active=machine.is_active,
        created_at=machine.created_at,
    )
    
    if latest_telemetry:
        machine_data.status = latest_telemetry.status
        machine_data.stress_index = latest_telemetry.stress_index
        machine_data.temperature = latest_telemetry.temperature
        machine_data.vibration_rms = latest_telemetry.vibration_rms
        machine_data.operating_hours = latest_telemetry.operating_hours
        machine_data.fuel_level = latest_telemetry.fuel_level
        machine_data.oil_pressure = latest_telemetry.oil_pressure
        machine_data.failure_probability = latest_telemetry.failure_probability
        machine_data.health_score = latest_telemetry.health_score
        machine_data.predicted_maintenance_days = latest_telemetry.predicted_maintenance_days
        machine_data.last_updated = latest_telemetry.timestamp
    
    return machine_data


@router.get("/{machine_id}/history", response_model=MachineHistoryResponse)
async def get_machine_history(
    machine_id: str,
    hours: int = Query(24, description="Hours of history to return"),
    db: Session = Depends(get_db)
):
    """Get historical telemetry for charts"""
    machine = db.query(Machine).filter(Machine.machine_id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")
    
    since = datetime.utcnow() - timedelta(hours=hours)
    
    telemetry = db.query(MachineTelemetry).filter(
        MachineTelemetry.machine_id == machine_id,
        MachineTelemetry.timestamp >= since
    ).order_by(MachineTelemetry.timestamp).all()
    
    return MachineHistoryResponse(
        machine_id=machine_id,
        history=[MachineTelemetryResponse.model_validate(t) for t in telemetry]
    )
