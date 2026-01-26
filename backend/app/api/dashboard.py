"""
Dashboard API endpoints
- GET /api/dashboard/stats - Summary statistics for header
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from pydantic import BaseModel

from ..database import get_db
from ..models.worker import Worker, WorkerVitals
from ..models.machine import Machine, MachineTelemetry


router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


class DashboardStats(BaseModel):
    """Dashboard summary statistics"""
    system_status: str
    total_active_workers: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    total_machines: int
    machines_operational: int
    machines_warning: int
    machines_maintenance: int


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(db: Session = Depends(get_db)):
    """Get summary statistics for dashboard header"""
    
    # Worker stats
    workers = db.query(Worker).filter(Worker.is_active == True).all()
    
    high_risk = 0
    medium_risk = 0
    low_risk = 0
    
    for worker in workers:
        latest_vitals = db.query(WorkerVitals).filter(
            WorkerVitals.worker_id == worker.worker_id
        ).order_by(desc(WorkerVitals.timestamp)).first()
        
        if latest_vitals:
            if latest_vitals.risk_state == "HIGH":
                high_risk += 1
            elif latest_vitals.risk_state == "MEDIUM":
                medium_risk += 1
            else:
                low_risk += 1
    
    # Machine stats
    machines = db.query(Machine).filter(Machine.is_active == True).all()
    
    operational = 0
    warning = 0
    maintenance = 0
    
    for machine in machines:
        latest_telemetry = db.query(MachineTelemetry).filter(
            MachineTelemetry.machine_id == machine.machine_id
        ).order_by(desc(MachineTelemetry.timestamp)).first()
        
        if latest_telemetry:
            if latest_telemetry.status == "OPERATIONAL":
                operational += 1
            elif latest_telemetry.status == "WARNING":
                warning += 1
            else:
                maintenance += 1
    
    # Determine system status
    if high_risk > 2 or maintenance > 1:
        system_status = "DEGRADED"
    elif high_risk > 0 or warning > 0 or maintenance > 0:
        system_status = "ONLINE"
    else:
        system_status = "ONLINE"
    
    return DashboardStats(
        system_status=system_status,
        total_active_workers=len(workers),
        high_risk_count=high_risk,
        medium_risk_count=medium_risk,
        low_risk_count=low_risk,
        total_machines=len(machines),
        machines_operational=operational,
        machines_warning=warning,
        machines_maintenance=maintenance,
    )
