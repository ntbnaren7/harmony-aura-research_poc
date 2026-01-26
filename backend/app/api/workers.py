"""
Worker API endpoints
- POST /api/workers/vitals - ESP32 pushes sensor data
- GET /api/workers - Dashboard fetches worker list
- GET /api/workers/{id}/history - Historical data for charts
"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models.worker import Worker, WorkerVitals
from ..schemas.worker import (
    WorkerVitalsCreate,
    WorkerCreate,
    WorkerResponse,
    WorkerListResponse,
    WorkerHistoryResponse,
    WorkerVitalsResponse,
    IssueBreakRequest,
)

router = APIRouter(prefix="/api/workers", tags=["Workers"])


def calculate_cis_score(vitals: WorkerVitalsCreate) -> int:
    """
    Calculate Composite Index Score based on vitals
    Higher score = safer worker
    """
    score = 100
    
    # Heart rate penalties
    if vitals.heart_rate > 120:
        score -= 30
    elif vitals.heart_rate > 100:
        score -= 15
    elif vitals.heart_rate < 50:
        score -= 20
    
    # HRV penalties (low HRV = high stress)
    if vitals.hrv < 20:
        score -= 30
    elif vitals.hrv < 35:
        score -= 15
    
    # Temperature penalties
    if vitals.temperature > 38.5:
        score -= 30
    elif vitals.temperature > 37.5:
        score -= 15
    elif vitals.temperature < 35.5:
        score -= 20
    
    # Machine stress penalty
    if vitals.machine_stress_index > 70:
        score -= 20
    elif vitals.machine_stress_index > 50:
        score -= 10
    
    # Jerk count penalty
    score -= min(vitals.jerk_count * 2, 15)
    
    return max(0, min(100, score))


def determine_risk_state(cis_score: int) -> str:
    """Determine risk state based on CIS score"""
    if cis_score <= 30:
        return "HIGH"
    elif cis_score <= 70:
        return "MEDIUM"
    return "LOW"


@router.post("/vitals", response_model=WorkerVitalsResponse)
async def create_worker_vitals(
    vitals: WorkerVitalsCreate,
    db: Session = Depends(get_db)
):
    """
    ESP32 endpoint: Push worker vital signs
    Automatically creates worker if doesn't exist
    """
    # Check if worker exists, create if not
    worker = db.query(Worker).filter(Worker.worker_id == vitals.worker_id).first()
    if not worker:
        worker = Worker(worker_id=vitals.worker_id, is_active=True)
        db.add(worker)
        db.commit()
    
    # Calculate CIS score and risk state
    cis_score = calculate_cis_score(vitals)
    risk_state = determine_risk_state(cis_score)
    
    # Create vitals record
    db_vitals = WorkerVitals(
        worker_id=vitals.worker_id,
        heart_rate=vitals.heart_rate,
        hrv=vitals.hrv,
        temperature=vitals.temperature,
        jerk_count=vitals.jerk_count,
        machine_stress_index=vitals.machine_stress_index,
        vibration_rms=vitals.vibration_rms,
        cis_score=cis_score,
        risk_state=risk_state,
        break_flag=False,
    )
    db.add(db_vitals)
    db.commit()
    db.refresh(db_vitals)
    
    return db_vitals


@router.post("/register", response_model=WorkerResponse)
async def register_worker(
    worker: WorkerCreate,
    db: Session = Depends(get_db)
):
    """Register a new worker"""
    existing = db.query(Worker).filter(Worker.worker_id == worker.worker_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Worker already exists")
    
    db_worker = Worker(**worker.model_dump())
    db.add(db_worker)
    db.commit()
    db.refresh(db_worker)
    
    return WorkerResponse(
        worker_id=db_worker.worker_id,
        name=db_worker.name,
        department=db_worker.department,
        is_active=db_worker.is_active,
        created_at=db_worker.created_at,
    )


@router.get("", response_model=WorkerListResponse)
async def get_workers(
    active_only: bool = Query(True, description="Only return active workers"),
    db: Session = Depends(get_db)
):
    """Get all workers with their latest vitals"""
    query = db.query(Worker)
    if active_only:
        query = query.filter(Worker.is_active == True)
    
    workers = query.all()
    result = []
    
    for worker in workers:
        # Get latest vitals
        latest_vitals = db.query(WorkerVitals).filter(
            WorkerVitals.worker_id == worker.worker_id
        ).order_by(desc(WorkerVitals.timestamp)).first()
        
        worker_data = WorkerResponse(
            worker_id=worker.worker_id,
            name=worker.name,
            department=worker.department,
            is_active=worker.is_active,
            created_at=worker.created_at,
        )
        
        if latest_vitals:
            worker_data.heart_rate = latest_vitals.heart_rate
            worker_data.hrv = latest_vitals.hrv
            worker_data.temperature = latest_vitals.temperature
            worker_data.jerk_count = latest_vitals.jerk_count
            worker_data.machine_stress_index = latest_vitals.machine_stress_index
            worker_data.vibration_rms = latest_vitals.vibration_rms
            worker_data.cis_score = latest_vitals.cis_score
            worker_data.risk_state = latest_vitals.risk_state
            worker_data.break_flag = latest_vitals.break_flag
            worker_data.last_updated = latest_vitals.timestamp
        
        result.append(worker_data)
    
    return WorkerListResponse(workers=result, total=len(result))


@router.get("/{worker_id}", response_model=WorkerResponse)
async def get_worker(
    worker_id: str,
    db: Session = Depends(get_db)
):
    """Get single worker with latest vitals"""
    worker = db.query(Worker).filter(Worker.worker_id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    latest_vitals = db.query(WorkerVitals).filter(
        WorkerVitals.worker_id == worker_id
    ).order_by(desc(WorkerVitals.timestamp)).first()
    
    worker_data = WorkerResponse(
        worker_id=worker.worker_id,
        name=worker.name,
        department=worker.department,
        is_active=worker.is_active,
        created_at=worker.created_at,
    )
    
    if latest_vitals:
        worker_data.heart_rate = latest_vitals.heart_rate
        worker_data.hrv = latest_vitals.hrv
        worker_data.temperature = latest_vitals.temperature
        worker_data.jerk_count = latest_vitals.jerk_count
        worker_data.machine_stress_index = latest_vitals.machine_stress_index
        worker_data.vibration_rms = latest_vitals.vibration_rms
        worker_data.cis_score = latest_vitals.cis_score
        worker_data.risk_state = latest_vitals.risk_state
        worker_data.break_flag = latest_vitals.break_flag
        worker_data.last_updated = latest_vitals.timestamp
    
    return worker_data


@router.get("/{worker_id}/history", response_model=WorkerHistoryResponse)
async def get_worker_history(
    worker_id: str,
    hours: int = Query(8, description="Hours of history to return"),
    db: Session = Depends(get_db)
):
    """Get historical vitals for charts"""
    worker = db.query(Worker).filter(Worker.worker_id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    since = datetime.utcnow() - timedelta(hours=hours)
    
    vitals = db.query(WorkerVitals).filter(
        WorkerVitals.worker_id == worker_id,
        WorkerVitals.timestamp >= since
    ).order_by(WorkerVitals.timestamp).all()
    
    return WorkerHistoryResponse(
        worker_id=worker_id,
        history=[WorkerVitalsResponse.model_validate(v) for v in vitals]
    )


@router.post("/{worker_id}/break")
async def issue_break(
    worker_id: str,
    db: Session = Depends(get_db)
):
    """Issue a break flag for a worker"""
    latest_vitals = db.query(WorkerVitals).filter(
        WorkerVitals.worker_id == worker_id
    ).order_by(desc(WorkerVitals.timestamp)).first()
    
    if not latest_vitals:
        raise HTTPException(status_code=404, detail="No vitals found for worker")
    
    latest_vitals.break_flag = True
    db.commit()
    
    return {"status": "success", "message": f"Break issued for {worker_id}"}
