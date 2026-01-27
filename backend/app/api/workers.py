"""
Worker API endpoints
- POST /api/workers/vitals - ESP32 pushes sensor data
- GET /api/workers - Dashboard fetches worker list
- GET /api/workers/{id}/history - Historical data for charts
"""
from datetime import datetime, timedelta
from typing import Optional
import random
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
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



# ============== Worker Simulation Logic ==============

def generate_correlated_machine_data(target_state: str = None) -> dict:
    """Generate machine data correlated with the worker state"""
    # Defaults (Fair)
    ranges = {
        "actuator": (0.4, 0.7),
        "torque": (0.4, 0.6),
        "duty": (0.5, 0.7),
        "vib": (0.3, 0.6),
        "rpm": (0.1, 0.3),
        "temp_eng": (80, 90),
        "temp_oil": (75, 85),
        "hours": 1200,
        "health": 85,
        "maint": "normal"
    }

    if target_state == "good":
        ranges.update({
            "actuator": (0.2, 0.5), "torque": (0.2, 0.4), "duty": (0.3, 0.6),
            "vib": (0.05, 0.25), "rpm": (0.0, 0.1), "temp_eng": (70, 80), "temp_oil": (65, 75),
            "health": 95, "maint": "optimal"
        })
    elif target_state == "poor":
        ranges.update({
            "actuator": (0.7, 0.95), "torque": (0.7, 0.95), "duty": (0.8, 0.98),
            "vib": (0.7, 0.95), "rpm": (0.3, 0.6), "temp_eng": (95, 110), "temp_oil": (90, 105),
            "health": 60, "maint": "critical"
        })
    
    def r(k): return round(random.uniform(*ranges[k]), 2)
    
    return {
        "operational_intensity": {
          "actuator_speed_norm": r("actuator"),
          "torque_load_norm": r("torque"),
          "duty_cycle": r("duty")
        },
        "mechanical_stress": {
          "vibration_rms_norm": r("vib"),
          "shock_event": target_state == "poor" and random.random() < 0.3,
          "rpm_instability": r("rpm")
        },
        "thermal_stress": {
          "engine_temperature_c": r("temp_eng"),
          "oil_temperature_c": r("temp_oil")
        },
        "usage_fatigue": {
          "operating_hours_total": ranges["hours"] + random.randint(0, 100),
          "continuous_run_minutes": random.randint(30, 240)
        },
        "health_context": {
          "machine_health_score": ranges["health"] - random.randint(0, 5),
          "maintenance_state": ranges["maint"]
        }
    }

def generate_comprehensive_worker_telemetry(current_values: dict = None, target_state: str = None) -> dict:
    """
    Generate comprehensive telemetry data for Worker ESP32 computation.
    """
    is_incremental = current_values is not None
    
    # Define targets
    targets = {
        "good": {"hr": (60, 80), "hrv": (65, 95), "temp": (36.3, 36.8), "stress": (0.0, 0.25)},
        "fair": {"hr": (80, 100), "hrv": (35, 60), "temp": (36.9, 37.3), "stress": (0.3, 0.5)},
        "poor": {"hr": (115, 155), "hrv": (15, 30), "temp": (37.4, 38.3), "stress": (0.6, 0.9)}
    }
    tgt = targets.get(target_state)
    
    # Helper for incremental or random generation
    def get_value(key: str, default: float, delta_range: tuple, clamp_range: tuple = None) -> float:
        # STRICT MODE for target state
        if tgt:
            if key == "heart_rate_bpm": return random.uniform(*tgt["hr"])
            if key == "heart_rate_variability_ms": return random.uniform(*tgt["hrv"])
            if key == "body_temperature_c": return random.uniform(*tgt["temp"])
            if key == "movement_intensity_norm": return random.uniform(*tgt["stress"])

        if is_incremental and key in current_values:
            delta = random.uniform(*delta_range)
            value = current_values[key] + delta
        else:
            value = default if isinstance(default, (int, float)) else random.uniform(*default)
        
        if clamp_range:
            value = max(clamp_range[0], min(clamp_range[1], value))
        return value
    
    # ===== PHYSIOLOGICAL STATUS =====
    heart_rate = int(get_value("heart_rate_bpm", (60, 95), (-3, 3), (45, 180)))
    hrv = int(get_value("heart_rate_variability_ms", (30, 80), (-5, 5), (10, 150)))
    
    temp_base = 36.8
    body_temp = round(get_value("body_temperature_c", (36.5, 37.2), (-0.1, 0.1), (35.0, 40.0)), 1)
    spo2 = int(get_value("blood_oxygen_pct", (96, 100), (-1, 1), (90, 100)))
    
    # ===== ENVIRONMENTAL =====
    ambient_temp = round(get_value("ambient_temperature_c", (20, 32), (-0.5, 0.5), (0, 45)), 1)
    noise_level = int(get_value("noise_level_db", (60, 85), (-2, 2), (40, 110)))
    air_quality = int(get_value("air_quality_index", (20, 60), (-2, 2), (0, 200)))
    
    # ===== ACTIVITY =====
    movement_intensity = round(get_value("movement_intensity_norm", (0.2, 0.7), (-0.05, 0.05), (0.0, 1.0)), 2)
    step_count = int(get_value("step_count_session", (500, 5000), (0, 10), (0, 30000)))
    posture_strain = int(get_value("posture_strain_index", (10, 50), (-2, 2), (0, 100)))
    jerk_count = int(movement_intensity * 10) + (1 if random.random() < 0.1 else 0)
    
    # ===== SAFETY =====
    score = 100
    if heart_rate > 110: score -= 20
    if hrv < 25: score -= 20
    if body_temp > 38.0: score -= 25
    cis_score = max(0, min(100, int(score)))
    
    risk_state = determine_risk_state(cis_score).lower()
    fatigue_level = int(max(0, min(100, (100 - cis_score) * 0.8)))
    
    # Mapping to DB fields
    machine_stress = int(movement_intensity * 100)
    vibration_rms = round(movement_intensity * 0.5, 2)
    
    return {
        "heart_rate": heart_rate,
        "hrv": hrv,
        "temperature": body_temp,
        "jerk_count": jerk_count,
        "machine_stress_index": machine_stress,
        "vibration_rms": vibration_rms,
        "cis_score": cis_score,
        "risk_state": risk_state.upper(),
        
        # User requested human format matches roughly with physiological_status etc.
        # We will map it precisely in the payload builder if needed, but this structure provides the raw data.
        "physiological_status": { "heart_rate_bpm": heart_rate, "heart_rate_variability_ms": hrv, "body_temperature_c": body_temp },
        "environmental_stress": { "skin_temperature_c": body_temp - 2, "temperature_drift_rate": 0.02 }, # Mocking specific fields requested
        "behavioral": { "continuous_work_minutes": random.uniform(10, 240), "break_gap_minutes": 45, "shift_hours_accumulated": random.uniform(0, 8) },
        "motion_posture": { "motion_magnitude": movement_intensity * 0.05, "motion_cadence": 0.05, "sudden_jerks_count": jerk_count, "over_corrections_count": 0, "reaction_latency_ms": 400 }
    }


def generate_incremental_worker_telemetry(current_values: dict, target_state: str = None) -> dict:
    """Generate incremental telemetry changes for smooth transitions"""
    # Flatten the nested structure for easy previous value lookups if needed, 
    # but our generator handles flat dictionary for incremental lookups just fine
    # if we pass the right keys.
    # We'll rely on the generator extracting what it needs from the flat DB structure + extra retained state if available
    # For now, we'll just pass the standard DB values and let the generator jitter them.
    
    # Map DB keys to the keys expected by get_value in generator
    mapped_values = {
        "heart_rate_bpm": current_values.get("heart_rate"),
        "heart_rate_variability_ms": current_values.get("hrv"),
        "body_temperature_c": current_values.get("temperature"),
        "movement_intensity_norm": current_values.get("machine_stress_index", 0) / 100.0,
        # Default others if not in DB, they will drift from these defaults
        "blood_oxygen_pct": 98,
        "ambient_temperature_c": 25,
        "noise_level_db": 65,
        "air_quality_index": 40,
        "step_count_session": 1000,
        "posture_strain_index": 20
    }
    return generate_comprehensive_worker_telemetry(mapped_values, target_state)


async def send_worker_to_esp32(esp32_url: str, data: dict):
    """Send worker data to ESP32"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(esp32_url, json=data)
            if response.status_code == 200:
                print(f"Successfully sent worker data to ESP32: {esp32_url}")
            else:
                print(f"ESP32 returned status {response.status_code}")
    except Exception as e:
        print(f"Failed to send to ESP32: {e}")


@router.post("/{worker_id}/simulate", response_model=WorkerVitalsResponse)
async def simulate_worker_vitals(
    worker_id: str,
    background_tasks: BackgroundTasks,
    esp32_url: Optional[str] = Query(None, description="Optional ESP32 URL"),
    db: Session = Depends(get_db)
):
    """
    Simulate vitals for a single worker.
    Generates realistic, incremental data and optionally sends to ESP32.
    """
    worker = db.query(Worker).filter(Worker.worker_id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")
        
    # Get latest vitals for incremental generation
    latest = db.query(WorkerVitals).filter(
        WorkerVitals.worker_id == worker_id
    ).order_by(desc(WorkerVitals.timestamp)).first()
    
    current_values = {}
    if latest:
        current_values = {
            "heart_rate": latest.heart_rate,
            "hrv": latest.hrv,
            "temperature": latest.temperature,
            "machine_stress_index": latest.machine_stress_index
        }
        simulated = generate_incremental_worker_telemetry(current_values)
    else:
        simulated = generate_comprehensive_worker_telemetry(None)
        
    # Create DB record
    db_vitals = WorkerVitals(
        worker_id=worker_id,
        heart_rate=simulated["heart_rate"],
        hrv=simulated["hrv"],
        temperature=simulated["temperature"],
        jerk_count=simulated["jerk_count"],
        machine_stress_index=simulated["machine_stress_index"],
        vibration_rms=simulated["vibration_rms"],
        cis_score=simulated["cis_score"],
        risk_state=simulated["risk_state"],
        break_flag=False
    )
    db.add(db_vitals)
    db.commit()
    db.refresh(db_vitals)
    
    # Send to ESP32
    if esp32_url:
        payload = {
            "worker_id": worker.worker_id,
            "name": worker.name,
            "timestamp": datetime.utcnow().isoformat(),
            "worker": {
                "physiological_status": simulated["physiological_status"],
                "environmental_stress": simulated["environmental_stress"],
                "activity_metrics": simulated["activity_metrics"],
                "safety_context": simulated["safety_context"]
            }
        }
        background_tasks.add_task(send_worker_to_esp32, esp32_url, payload)
        
    return db_vitals


@router.post("/simulate-all", response_model=WorkerListResponse)
@router.post("/simulate-all", response_model=WorkerListResponse)
async def simulate_all_workers(
    background_tasks: BackgroundTasks,
    esp32_url: Optional[str] = Query(None, description="Optional ESP32 URL"),
    target_state: Optional[str] = Query(None, description="Target: good, fair, poor"),
    db: Session = Depends(get_db)
):
    """Simulate vitals for ALL active workers"""
    workers = db.query(Worker).filter(Worker.is_active == True).limit(6).all()
    if not workers:
        raise HTTPException(status_code=404, detail="No active workers found")
        
    results = []
    
    for worker in workers:
        # Incremental generation
        latest = db.query(WorkerVitals).filter(
            WorkerVitals.worker_id == worker.worker_id
        ).order_by(desc(WorkerVitals.timestamp)).first()
        
        current_values = {}
        if latest:
            current_values = {
                "heart_rate": latest.heart_rate,
                "hrv": latest.hrv,
                "temperature": latest.temperature,
                "machine_stress_index": latest.machine_stress_index
            }
            simulated = generate_incremental_worker_telemetry(current_values, target_state)
        else:
            simulated = generate_comprehensive_worker_telemetry(None, target_state)
            
        # Create DB record
        db_vitals = WorkerVitals(
            worker_id=worker.worker_id,
            heart_rate=simulated["heart_rate"],
            hrv=simulated["hrv"],
            temperature=simulated["temperature"],
            jerk_count=simulated["jerk_count"],
            machine_stress_index=simulated["machine_stress_index"],
            vibration_rms=simulated["vibration_rms"],
            cis_score=simulated["cis_score"],
            risk_state=simulated["risk_state"],
            break_flag=False
        )
        db.add(db_vitals)
        
        # Build response object (simplified)
        w_data = WorkerResponse(
            worker_id=worker.worker_id,
            name=worker.name,
            department=worker.department,
            is_active=worker.is_active,
            created_at=worker.created_at,
            heart_rate=simulated["heart_rate"],
            hrv=simulated["hrv"],
            temperature=simulated["temperature"],
            jerk_count=simulated["jerk_count"],
            machine_stress_index=simulated["machine_stress_index"],
            vibration_rms=simulated["vibration_rms"],
            cis_score=simulated["cis_score"],
            risk_state=simulated["risk_state"],
            break_flag=False,
            last_updated=datetime.utcnow()
        )
        results.append(w_data)
        
        # Construct and Send Full Payload (Human + Machine)
        machine_metrics = generate_correlated_machine_data(target_state)
        human_metrics = {
            "cardiovascular": {
                "heart_rate_bpm": simulated["physiological_status"]["heart_rate_bpm"],
                "heart_rate_variability_ms": simulated["physiological_status"]["heart_rate_variability_ms"],
                "hr_recovery_rate": 0.12 # Mock
            },
            "motion_posture": simulated["motion_posture"],
            "physiological_stress": simulated["environmental_stress"], # using remapped values
            "behavioral": simulated["behavioral"]
        }
        
        payload = {
            "machine": machine_metrics,
            "human": human_metrics
        }
        last_payload = payload
        
        if esp32_url and len(results) == 1:
            background_tasks.add_task(send_worker_to_esp32, esp32_url, payload)
    
    db.commit()
    return WorkerListResponse(workers=results, total=len(results), last_esp32_payload=last_payload)


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
