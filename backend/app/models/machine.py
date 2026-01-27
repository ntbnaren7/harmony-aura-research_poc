"""
Machine and MachineTelemetry database models
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Uuid
from sqlalchemy.orm import relationship
import enum

from ..database import Base


class MachineType(str, enum.Enum):
    """Machine type enumeration"""
    CRANE = "CRANE"
    EXCAVATOR = "EXCAVATOR"
    LOADER = "LOADER"
    DRILL = "DRILL"
    COMPRESSOR = "COMPRESSOR"
    GENERATOR = "GENERATOR"


class MachineStatus(str, enum.Enum):
    """Machine operational status"""
    OPERATIONAL = "OPERATIONAL"
    WARNING = "WARNING"
    MAINTENANCE = "MAINTENANCE"
    OFFLINE = "OFFLINE"


class Machine(Base):
    """Machine registration table"""
    __tablename__ = "machines"
    
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    machine_id = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False)  # CRANE, EXCAVATOR, etc.
    model = Column(String(100), nullable=True)
    serial_number = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationship to telemetry
    telemetry = relationship("MachineTelemetry", back_populates="machine", order_by="desc(MachineTelemetry.timestamp)")


class MachineTelemetry(Base):
    """Machine telemetry from IoT sensors"""
    __tablename__ = "machine_telemetry"
    
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    machine_id = Column(String(20), ForeignKey("machines.machine_id"), nullable=False, index=True)
    
    # Status
    status = Column(String(20), nullable=False)  # OPERATIONAL, WARNING, etc.
    
    # Performance metrics
    stress_index = Column(Integer, default=0)  # 0-100
    temperature = Column(Float, nullable=False)  # Operating temp °C
    vibration_rms = Column(Float, default=0.0)  # Vibration measurement
    
    # Operational data
    operating_hours = Column(Float, default=0.0)  # Hours today
    fuel_level = Column(Integer, default=100)  # 0-100%
    oil_pressure = Column(Integer, default=40)  # PSI
    
    # Predictive maintenance
    failure_probability = Column(Integer, default=0)  # AI-predicted 0-100%
    health_score = Column(Integer, default=100)  # 0-100
    predicted_maintenance_days = Column(Integer, default=30)  # Days until maintenance
    
    # Timestamp
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationship
    machine = relationship("Machine", back_populates="telemetry")
