"""
rag/api/schemas.py
Request/response models for the rag API.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class VendorPair(BaseModel):
    """A supported translation direction, e.g. source=cisco -> target=junos."""
    source: str
    target: str


class TranslateRequest(BaseModel):
    source_vendor: str = Field(..., description="Vendor of the input config (e.g. cisco)")
    target_vendor: str = Field(..., description="Vendor to convert to (e.g. junos)")
    config_text: str = Field(..., description="Raw configuration text")
    use_llm: bool = True
    persist: bool = True


class AskRequest(BaseModel):
    question: str = Field(..., description="Natural language question about Cisco/Junos config")
    show_sources: bool = True


class MemoryFeedbackRequest(BaseModel):
    source_line: str = Field(..., min_length=1)
    target: Optional[str] = None
    mapping: str = "human_review"
    description: str = ""
    confidence: float = Field(1.0, ge=0.0, le=1.0)