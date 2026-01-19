from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    """Application settings and configuration."""
    
    # Database
    database_url: str = "postgresql://ricardonigro@localhost:5432/cuptracker"
    
    # Security
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Application
    app_name: str = "Cup Tracker API"
    debug: bool = True
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    """Get cached settings instance."""
    return Settings()
