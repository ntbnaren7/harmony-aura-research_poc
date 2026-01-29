"""
Configuration settings for the FastAPI application
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database
    database_url: str = "postgresql://postgres:password@localhost:5432/harmony_aura"
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True
    
    # CORS
    cors_origins: str = "http://localhost:3000"
    
    # Twilio (Emergency Alerts)
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""
    supervisor_phone: str = ""
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance"""
    return Settings()
