"""
Utility functions for the application
"""
import os
from datetime import datetime
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # OpenAI
    openai_api_key: str
    model_id: str = "gpt-5"
    
    # Supabase
    supabase_url: str
    supabase_service_role_key: str
    
    # Storage Buckets
    bucket_legal: str = "legal-docs"
    bucket_images: str = "images"
    
    # Application
    environment: str = "development"
    allowed_origins: str = "http://localhost:3000"
    
    # Admin
    admin_token: Optional[str] = None
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        protected_namespaces = ('settings_',)


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


def get_allowed_origins() -> list:
    """Parse allowed origins from settings"""
    settings = get_settings()
    return [origin.strip() for origin in settings.allowed_origins.split(",")]


def verify_admin_key(api_key: Optional[str]) -> bool:
    """Verify admin token"""
    settings = get_settings()
    if not settings.admin_token:
        return False
    return api_key == settings.admin_token


def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe storage"""
    import re
    # Remove any path components
    filename = os.path.basename(filename)
    # Replace unsafe characters
    filename = re.sub(r'[^\w\s\-\.]', '_', filename)
    return filename


def generate_file_path(user_id: str, filename: str) -> str:
    """Generate a unique file path for storage"""
    import uuid
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    safe_filename = sanitize_filename(filename)
    return f"{user_id}/{timestamp}_{unique_id}_{safe_filename}"
