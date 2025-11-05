"""
Pydantic models for request/response validation
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field, validator


# Chat Models
class ChatCreate(BaseModel):
    user_id: str
    title: Optional[str] = None
    
    @validator('user_id')
    def validate_user_id(cls, v):
        """Validate that user_id is a valid UUID"""
        try:
            UUID(v)
            return v
        except ValueError:
            raise ValueError(f'user_id must be a valid UUID, got: {v}')


class ChatResponse(BaseModel):
    id: str
    user_id: str
    title: Optional[str]
    created_at: datetime
    updated_at: datetime


# Message Models
class MessageCreate(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str


class MessageResponse(BaseModel):
    id: str
    chat_id: str
    role: str
    content: str
    created_at: datetime
    metadata: Optional[Dict[str, Any]] = {}


class ChatMessageRequest(BaseModel):
    message: str
    user_id: str
    file_ids: Optional[List[str]] = []
    stream: bool = True
    
    @validator('user_id')
    def validate_user_id(cls, v):
        """Validate that user_id is a valid UUID"""
        try:
            UUID(v)
            return v
        except ValueError:
            raise ValueError(f'user_id must be a valid UUID, got: {v}')


# File Models
class FileSignRequest(BaseModel):
    filename: str
    content_type: str
    user_id: str
    chat_id: Optional[str] = None  # ✅ Link files to chats
    
    @validator('user_id')
    def validate_user_id(cls, v):
        """Validate that user_id is a valid UUID"""
        try:
            UUID(v)
            return v
        except ValueError:
            raise ValueError(f'user_id must be a valid UUID, got: {v}')


class FileSignResponse(BaseModel):
    upload_url: str
    file_path: str
    file_id: str
    token: Optional[str] = None  # API key for direct upload


class FileIngestRequest(BaseModel):
    file_id: str
    user_id: str
    chat_id: Optional[str] = None
    
    @validator('user_id')
    def validate_user_id(cls, v):
        """Validate that user_id is a valid UUID"""
        try:
            UUID(v)
            return v
        except ValueError:
            raise ValueError(f'user_id must be a valid UUID, got: {v}')


class FileIngestResponse(BaseModel):
    file_id: str
    status: str
    chunks_created: int
    message: str


class FileDeleteRequest(BaseModel):
    user_id: str
    
    @validator('user_id')
    def validate_user_id(cls, v):
        """Validate that user_id is a valid UUID"""
        try:
            UUID(v)
            return v
        except ValueError:
            raise ValueError(f'user_id must be a valid UUID, got: {v}')


class FileResponse(BaseModel):
    id: str
    chat_id: Optional[str]
    user_id: str
    filename: str
    file_path: str
    file_size: Optional[int]
    mime_type: Optional[str]
    status: str
    created_at: datetime
    processed_at: Optional[datetime]


# Admin Models
class AdminOverviewResponse(BaseModel):
    total_users: int
    total_chats: int
    total_messages: int
    total_files: int
    recent_activity: List[Dict[str, Any]]


# LLM Models
class LLMMessage(BaseModel):
    role: str
    content: str


class LLMRequest(BaseModel):
    model: str
    messages: List[LLMMessage]
    stream: bool = True
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 4096
