"""
Worker and WorkerVitals database models
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Enum, Uuid
from sqlalchemy.orm import relationship
import enum

from ..database import Base


class RiskState(str, enum.Enum):
    """Risk state enumeration"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class Worker(Base):
    """Worker registration table"""
    __tablename__ = "workers"
    
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    worker_id = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=True)
    department = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationship to vitals
    vitals = relationship("WorkerVitals", back_populates="worker", order_by="desc(WorkerVitals.timestamp)")


class WorkerVitals(Base):
    """Worker vital signs from ESP32 sensors"""
    __tablename__ = "worker_vitals"
    
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    worker_id = Column(String(20), ForeignKey("workers.worker_id"), nullable=False, index=True)
    
    # Vital signs
    heart_rate = Column(Integer, nullable=False)  # BPM
    hrv = Column(Integer, nullable=False)  # Heart rate variability in ms
    temperature = Column(Float, nullable=False)  # Body temperature in Celsius
    
    # Activity metrics
    jerk_count = Column(Integer, default=0)  # Sudden movements
    machine_stress_index = Column(Integer, default=0)  # 0-100
    vibration_rms = Column(Float, default=0.0)  # RMS vibration value
    
    # Computed scores
    cis_score = Column(Integer, nullable=False)  # Composite Index Score 0-100
    risk_state = Column(String(10), nullable=False)  # LOW, MEDIUM, HIGH
    
    # Flags
    break_flag = Column(Boolean, default=False)
    
    # Timestamp
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationship
    worker = relationship("Worker", back_populates="vitals")
