from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict
from datetime import datetime

Role = Literal["system", "user", "assistant"]

class Message(BaseModel):
    role: Role
    content: str
    ts: datetime = Field(default_factory=datetime.utcnow)

class ChatSession(BaseModel):
    id: str
    title: str
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    messages: List[Message] = Field(default_factory=list)
    # memoria ligera que crece
    memory: Dict[str, str] = Field(default_factory=dict)

class CreateChatIn(BaseModel):
    title: Optional[str] = None

class ChatIn(BaseModel):
    message: str

class ExportQuery(BaseModel):
    fmt: Literal["json", "csv", "pdf"]
