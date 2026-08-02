from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # Supabase
    SUPABASE_PROJECT_URL: str
    SUPABASE_JWT_SECRET: str
    
    # CORS (comma-separated in .env, parsed into a list at runtime)
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    
    # Environment
    ENVIRONMENT: str = "development"
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
