"""
API routes package
"""
from .workers import router as workers_router
from .machines import router as machines_router
from .dashboard import router as dashboard_router

__all__ = ["workers_router", "machines_router", "dashboard_router"]
