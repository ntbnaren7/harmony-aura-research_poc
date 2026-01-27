"""
Machine API endpoints
- POST /api/machines/telemetry - ESP32 pushes sensor data
- GET /api/machines - Dashboard fetches machine list
- GET /api/machines/{id}/history - Historical data for charts
- POST /api/machines/{id}/simulate - Generate simulated telemetry
"""
import random
import httpx
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
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


# ============== Simulation Endpoints ==============

# Type profiles define normal operating ranges for each machine type
TYPE_PROFILES = {
    "CRANE": {
        "temp_range": (45, 85),
        "vibration_range": (0.5, 2.5),
        "stress_range": (20, 70),
        "fuel_range": (30, 95),
        "oil_range": (35, 55),
    },
    "EXCAVATOR": {
        "temp_range": (50, 95),
        "vibration_range": (0.8, 3.2),
        "stress_range": (30, 80),
        "fuel_range": (20, 90),
        "oil_range": (30, 50),
    },
    "LOADER": {
        "temp_range": (45, 80),
        "vibration_range": (0.6, 2.8),
        "stress_range": (25, 75),
        "fuel_range": (25, 85),
        "oil_range": (32, 52),
    },
    "DRILL": {
        "temp_range": (55, 100),
        "vibration_range": (1.0, 4.0),
        "stress_range": (40, 90),
        "fuel_range": (15, 80),
        "oil_range": (28, 48),
    },
    "COMPRESSOR": {
        "temp_range": (60, 95),
        "vibration_range": (0.4, 2.0),
        "stress_range": (20, 60),
        "fuel_range": (40, 100),
        "oil_range": (38, 58),
    },
    "GENERATOR": {
        "temp_range": (50, 85),
        "vibration_range": (0.3, 1.8),
        "stress_range": (15, 55),
        "fuel_range": (10, 100),
        "oil_range": (35, 55),
    },
}


def generate_initial_telemetry(machine_type: str) -> dict:
    """
    Generate initial random telemetry values for a new machine.
    Used when no previous data exists.
    """
    profile = TYPE_PROFILES.get(machine_type.upper(), TYPE_PROFILES["CRANE"])
    
    # Generate comprehensive telemetry matching ESP32 format
    return generate_comprehensive_telemetry(profile, None)


def generate_comprehensive_telemetry(profile: dict, current_values: dict = None, target_state: str = None) -> dict:
    """
    Generate comprehensive telemetry data for ESP32 computation.
    target_state: 'good', 'fair', or 'poor' - biases generated values
    """
    is_incremental = current_values is not None
    
    # Define ranges based on target state (Good=Low Stress, Poor=High Stress)
    TARGET_RANGES = {
        "good": {"norm": (0.05, 0.35), "temp_offset": (-10, -2)},
        "fair": {"norm": (0.40, 0.65), "temp_offset": (-2, 5)},
        "poor": {"norm": (0.70, 0.95), "temp_offset": (5, 15)}
    }
    
    target_range = TARGET_RANGES.get(target_state) if target_state else None
    
    # Helper for incremental or random generation with optional targeting
    def get_value(key: str, default: float, delta_range: tuple, clamp_range: tuple = None) -> float:
        # If target_state is set, use its range as the attractor or default
        effective_default = default
        if target_range and key.endswith("_norm"):
            effective_default = target_range["norm"]
        elif target_range and "temperature" in key:
             # Temp needs careful handling below
             pass

        # STRICT MODE: If target_state is specified for this key, IGNORE history and force value into range.
        if target_range and key.endswith("_norm"):
             value = random.uniform(*target_range["norm"])
        elif is_incremental and key in current_values:
            delta = random.uniform(*delta_range)
            value = current_values[key] + delta
        else:
            value = effective_default if isinstance(effective_default, (int, float)) else random.uniform(*effective_default)
        
        if clamp_range:
            value = max(clamp_range[0], min(clamp_range[1], value))
        return value
    
    # ===== OPERATIONAL INTENSITY =====
    actuator_speed_norm = round(get_value("actuator_speed_norm", (0.4, 0.9), (-0.05, 0.05), (0.1, 1.0)), 2)
    torque_load_norm = round(get_value("torque_load_norm", (0.3, 0.85), (-0.04, 0.04), (0.1, 1.0)), 2)
    duty_cycle = round(get_value("duty_cycle", (0.5, 0.95), (-0.03, 0.03), (0.2, 1.0)), 2)
    
    # ===== MECHANICAL STRESS =====
    # Scale vibration range from RMS to normalized (0-1) for default generation
    vib_min, vib_max = profile["vibration_range"]
    vib_default = (vib_min / 4.0, vib_max / 4.0)
    
    # Override default if target state is present
    if target_range:
        vib_default = target_range["norm"]

    vibration_rms_norm = round(get_value("vibration_rms_norm", vib_default, (-0.08, 0.08), (0.1, 1.0)), 2)
    
    # Shock event logic
    shock_prob = 0.08
    if target_state == "good": shock_prob = 0.01
    elif target_state == "poor": shock_prob = 0.25
    shock_event = random.random() < shock_prob
    
    rpm_instability_default = (0.05, 0.4)
    if target_range: rpm_instability_default = target_range["norm"] # Use same norm scale roughly
    
    rpm_instability = round(get_value("rpm_instability", rpm_instability_default, (-0.03, 0.03), (0.0, 1.0)), 2)
    
    # ===== THERMAL STRESS =====
    # Apply temp offset based on state
    temp_profile = profile["temp_range"]
    if target_range:
        # Shift the range
        mid = (temp_profile[0] + temp_profile[1]) / 2
        offset = random.uniform(*target_range["temp_offset"])
        temp_center = mid + offset
        effective_temp_range = (temp_center - 5, temp_center + 5)
    else:
        effective_temp_range = temp_profile

    engine_temperature_c = round(get_value("engine_temperature_c", effective_temp_range, (-2.0, 2.0), (40, 120)), 1)
    oil_temperature_c = round(engine_temperature_c - random.uniform(2, 8), 1)
    
    # ===== USAGE FATIGUE =====
    try:
        current_hours = current_values["operating_hours_total"] if current_values else None
    except:
        current_hours = None
        
    operating_hours_total = int(get_value("operating_hours_total", (500, 3000), (0.1, 0.5), (0, 10000)))
    continuous_run_minutes = int(get_value("continuous_run_minutes", (30, 240), (-5, 10), (0, 480)))
    
    # ===== DERIVED VALUES =====
    # Calculate stress index from mechanical stress factors
    stress_index = int(min(100, max(0, 
        vibration_rms_norm * 40 + 
        (20 if shock_event else 0) + 
        rpm_instability * 30 +
        (engine_temperature_c - 70) * 0.5
    )))
    
    # Calculate health score inversely from stress factors
    health_score = int(max(0, min(100, 
        100 - stress_index * 0.4 - 
        (10 if shock_event else 0) -
        max(0, engine_temperature_c - 95) * 2
    )))
    
    # Determine maintenance state
    if health_score >= 80:
        maintenance_state = "normal"
    elif health_score >= 60:
        maintenance_state = "attention"
    elif health_score >= 40:
        maintenance_state = "warning"
    else:
        maintenance_state = "critical"
    
    # Legacy compatibility values
    fuel_level = int(get_value("fuel_level", profile["fuel_range"], (-1.5, 0.5), (5, 100)))
    oil_pressure = int(get_value("oil_pressure", profile["oil_range"], (-1.0, 1.0), (20, 60)))
    
    return {
        # Legacy fields for backward compatibility
        "temperature": engine_temperature_c,
        "vibration_rms": round(vibration_rms_norm * 4.0, 2),  # Scale to RMS units
        "stress_index": stress_index,
        "fuel_level": fuel_level,
        "oil_pressure": oil_pressure,
        "operating_hours": round(continuous_run_minutes / 60, 1),
        
        # Comprehensive ESP32 data structure
        "operational_intensity": {
            "actuator_speed_norm": actuator_speed_norm,
            "torque_load_norm": torque_load_norm,
            "duty_cycle": duty_cycle,
        },
        "mechanical_stress": {
            "vibration_rms_norm": vibration_rms_norm,
            "shock_event": shock_event,
            "rpm_instability": rpm_instability,
        },
        "thermal_stress": {
            "engine_temperature_c": engine_temperature_c,
            "oil_temperature_c": oil_temperature_c,
        },
        "usage_fatigue": {
            "operating_hours_total": operating_hours_total,
            "continuous_run_minutes": continuous_run_minutes,
        },
        "health_context": {
            "machine_health_score": health_score,
            "maintenance_state": maintenance_state,
        },
    }


def generate_incremental_telemetry(machine_type: str, current_values: dict, target_state: str = None) -> dict:
    """
    Generate small incremental changes from current values.
    Uses comprehensive telemetry format with gradual changes.
    """
    profile = TYPE_PROFILES.get(machine_type.upper(), TYPE_PROFILES["CRANE"])
    
    # Extract previous values for incremental generation
    prev_values = {
        "actuator_speed_norm": current_values.get("actuator_speed_norm", 0.7),
        "torque_load_norm": current_values.get("torque_load_norm", 0.6),
        "duty_cycle": current_values.get("duty_cycle", 0.75),
        "vibration_rms_norm": current_values.get("vibration_rms", 1.5) / 4.0,  # Convert from RMS to norm
        "rpm_instability": current_values.get("rpm_instability", 0.2),
        "engine_temperature_c": current_values.get("temperature", 75),
        "operating_hours_total": current_values.get("operating_hours_total", 1000),
        "continuous_run_minutes": int(current_values.get("operating_hours", 2) * 60),
        "fuel_level": current_values.get("fuel_level", 70),
        "oil_pressure": current_values.get("oil_pressure", 45),
    }
    
    return generate_comprehensive_telemetry(profile, prev_values, target_state)


async def send_to_esp32(esp32_url: str, data: dict):
    """
    Send simulation data to ESP32 for computation.
    This is a background task that won't block the response.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(esp32_url, json=data)
            if response.status_code == 200:
                print(f"Successfully sent data to ESP32: {esp32_url}")
            else:
                print(f"ESP32 returned status {response.status_code}")
    except Exception as e:
        print(f"Failed to send to ESP32: {e}")


@router.post("/{machine_id}/simulate", response_model=MachineTelemetryResponse)
async def simulate_machine_telemetry(
    machine_id: str,
    background_tasks: BackgroundTasks,
    esp32_url: Optional[str] = Query(None, description="Optional ESP32 URL to send data for computation"),
    target_state: Optional[str] = Query(None, description="Target state bias: good, fair, or poor"),
    db: Session = Depends(get_db)
):
    """
    Generate simulated telemetry for a machine.
    - Generates small incremental changes from current values for realistic transitions
    - Stores telemetry in database
    - Optionally sends basic values to ESP32 for further computation
    """
    # Check if machine exists
    machine = db.query(Machine).filter(Machine.machine_id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail=f"Machine {machine_id} not found")
    
    # Get the latest telemetry to base increments on
    latest_telemetry = db.query(MachineTelemetry).filter(
        MachineTelemetry.machine_id == machine_id
    ).order_by(MachineTelemetry.timestamp.desc()).first()
    
    # Generate telemetry - incremental if we have previous data, otherwise initial
    if latest_telemetry:
        current_values = {
            "temperature": latest_telemetry.temperature,
            "vibration_rms": latest_telemetry.vibration_rms,
            "stress_index": latest_telemetry.stress_index,
            "fuel_level": latest_telemetry.fuel_level,
            "oil_pressure": latest_telemetry.oil_pressure,
            "operating_hours": latest_telemetry.operating_hours,
        }
        simulated_data = generate_incremental_telemetry(machine.type, current_values, target_state)
    else:
        # Pass target_state to initial generation too (we need to update generate_initial_telemetry simply to check signature compatibility or usage)
        # Actually generate_initial_telemetry calls generate_comprehensive, so we can just call generate_comprehensive directly here if we wanted, 
        # but let's stick to existing wrapper usage. Wait, view didn't show generate_initial_telemetry accepting arguments.
        # I'll modify generate_initial_telemetry in a separate step if strictly needed, or just bypass it if logic allows.
        # Let's inspect generate_initial_telemetry first. But for now I'll assume I can just use generate_comprehensive_telemetry directly if needed.
        # Or better, just pass target_state if I can update it.
        # I will update `generate_initial_telemetry` as well in this same call or assume I can use `generate_comprehensive` equivalent.
        # Actually, let's just bypass the wrapper for this turn since I know what it does.
        profile = TYPE_PROFILES.get(machine.type.upper(), TYPE_PROFILES["CRANE"])
        simulated_data = generate_comprehensive_telemetry(profile, None, target_state)
    
    # Create telemetry schema for health calculations
    from ..schemas.machine import MachineTelemetryCreate
    telemetry_input = MachineTelemetryCreate(
        machine_id=machine_id,
        stress_index=simulated_data["stress_index"],
        temperature=simulated_data["temperature"],
        vibration_rms=simulated_data["vibration_rms"],
        operating_hours=simulated_data["operating_hours"],
        fuel_level=simulated_data["fuel_level"],
        oil_pressure=simulated_data["oil_pressure"],
    )
    
    # Calculate health metrics
    health_score = calculate_health_score(telemetry_input)
    failure_prob = calculate_failure_probability(health_score, telemetry_input)
    status = determine_status(health_score, failure_prob)
    predicted_days = max(1, int((100 - failure_prob) / 3))
    
    # Create telemetry record
    db_telemetry = MachineTelemetry(
        machine_id=machine_id,
        status=status,
        stress_index=simulated_data["stress_index"],
        temperature=simulated_data["temperature"],
        vibration_rms=simulated_data["vibration_rms"],
        operating_hours=simulated_data["operating_hours"],
        fuel_level=simulated_data["fuel_level"],
        oil_pressure=simulated_data["oil_pressure"],
        failure_probability=failure_prob,
        health_score=health_score,
        predicted_maintenance_days=predicted_days,
    )
    db.add(db_telemetry)
    db.commit()
    db.refresh(db_telemetry)
    
    # Optionally send to ESP32 for additional computation
    if esp32_url:
        # Send comprehensive ESP32 payload with all telemetry data
        esp32_payload = {
            "machine_id": machine_id,
            "machine_type": machine.type,
            "machine_name": machine.name,
            "timestamp": datetime.utcnow().isoformat(),
            "machine": {
                "operational_intensity": simulated_data.get("operational_intensity", {}),
                "mechanical_stress": simulated_data.get("mechanical_stress", {}),
                "thermal_stress": simulated_data.get("thermal_stress", {}),
                "usage_fatigue": simulated_data.get("usage_fatigue", {}),
                "health_context": simulated_data.get("health_context", {}),
            }
        }
        background_tasks.add_task(send_to_esp32, esp32_url, esp32_payload)
    
    return db_telemetry


@router.post("/simulate-all", response_model=MachineListResponse)
async def simulate_all_machines(
    background_tasks: BackgroundTasks,
    esp32_url: Optional[str] = Query(None, description="Optional ESP32 URL to send data for computation"),
    target_state: Optional[str] = Query(None, description="Target state bias: good, fair, or poor"),
    db: Session = Depends(get_db)
):
    """
    Generate simulated telemetry for ALL active machines.
    Useful for testing and demos.
    """
    machines = db.query(Machine).filter(Machine.is_active == True).all()
    
    if not machines:
        raise HTTPException(status_code=404, detail="No active machines found")
    
    result = []
    last_payload = None
    from ..schemas.machine import MachineTelemetryCreate
    
    for machine in machines:
        # Get the latest telemetry to base increments on
        latest_telemetry = db.query(MachineTelemetry).filter(
            MachineTelemetry.machine_id == machine.machine_id
        ).order_by(MachineTelemetry.timestamp.desc()).first()
        
        # Generate telemetry - incremental if we have previous data, otherwise initial
        if latest_telemetry:
            current_values = {
                "temperature": latest_telemetry.temperature,
                "vibration_rms": latest_telemetry.vibration_rms,
                "stress_index": latest_telemetry.stress_index,
                "fuel_level": latest_telemetry.fuel_level,
                "oil_pressure": latest_telemetry.oil_pressure,
                "operating_hours": latest_telemetry.operating_hours,
            }
            simulated_data = generate_incremental_telemetry(machine.type, current_values, target_state)
        else:
            profile = TYPE_PROFILES.get(machine.type.upper(), TYPE_PROFILES["CRANE"])
            simulated_data = generate_comprehensive_telemetry(profile, None, target_state)
        
        telemetry_input = MachineTelemetryCreate(
            machine_id=machine.machine_id,
            stress_index=simulated_data["stress_index"],
            temperature=simulated_data["temperature"],
            vibration_rms=simulated_data["vibration_rms"],
            operating_hours=simulated_data["operating_hours"],
            fuel_level=simulated_data["fuel_level"],
            oil_pressure=simulated_data["oil_pressure"],
        )
        
        # Calculate health metrics
        health_score = calculate_health_score(telemetry_input)
        failure_prob = calculate_failure_probability(health_score, telemetry_input)
        status = determine_status(health_score, failure_prob)
        predicted_days = max(1, int((100 - failure_prob) / 3))
        
        # Create telemetry record
        db_telemetry = MachineTelemetry(
            machine_id=machine.machine_id,
            status=status,
            stress_index=simulated_data["stress_index"],
            temperature=simulated_data["temperature"],
            vibration_rms=simulated_data["vibration_rms"],
            operating_hours=simulated_data["operating_hours"],
            fuel_level=simulated_data["fuel_level"],
            oil_pressure=simulated_data["oil_pressure"],
            failure_probability=failure_prob,
            health_score=health_score,
            predicted_maintenance_days=predicted_days,
        )
        db.add(db_telemetry)
        
        # Build response
        machine_data = MachineResponse(
            machine_id=machine.machine_id,
            name=machine.name,
            type=machine.type,
            model=machine.model,
            serial_number=machine.serial_number,
            is_active=machine.is_active,
            created_at=machine.created_at,
            status=status,
            stress_index=simulated_data["stress_index"],
            temperature=simulated_data["temperature"],
            vibration_rms=simulated_data["vibration_rms"],
            operating_hours=simulated_data["operating_hours"],
            fuel_level=simulated_data["fuel_level"],
            oil_pressure=simulated_data["oil_pressure"],
            failure_probability=failure_prob,
            health_score=health_score,
            predicted_maintenance_days=predicted_days,
            last_updated=datetime.utcnow(),
        )
        result.append(machine_data)
        
        # Construct ESP32 Payload (always, for UI capture)
        esp32_payload = {
            "machine_id": machine.machine_id,
            "machine_type": machine.type,
            "machine_name": machine.name,
            "timestamp": datetime.utcnow().isoformat(),
            "machine": {
                "operational_intensity": simulated_data.get("operational_intensity", {}),
                "mechanical_stress": simulated_data.get("mechanical_stress", {}),
                "thermal_stress": simulated_data.get("thermal_stress", {}),
                "usage_fatigue": simulated_data.get("usage_fatigue", {}),
                "health_context": simulated_data.get("health_context", {
                    "machine_health_score": health_score,
                    "maintenance_state": status.lower(),
                }),
            }
        }
        last_payload = esp32_payload
        
        # Optionally send to ESP32
        if esp32_url:
            background_tasks.add_task(send_to_esp32, esp32_url, esp32_payload)
    
    db.commit()
    
    return MachineListResponse(
        machines=result, 
        total=len(result),
        last_esp32_payload=last_payload
    )
