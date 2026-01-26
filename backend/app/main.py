"""
Harmony Aura OS - FastAPI Backend
Construction Safety Monitoring API
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import engine, Base
from .api import workers_router, machines_router, dashboard_router

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
settings = get_settings()

app = FastAPI(
    title="Harmony Aura OS API",
    description="AI-Powered Construction Safety Monitoring Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(workers_router)
app.include_router(machines_router)
app.include_router(dashboard_router)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "name": "Harmony Aura OS API",
        "version": "1.0.0",
    }


@app.get("/health")
async def health_check():
    """Health check for monitoring"""
    return {"status": "healthy"}
