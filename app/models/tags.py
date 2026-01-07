"""
Pydantic models for Tags endpoints
"""
from pydantic import BaseModel, Field
from typing import Optional


class TagRequest(BaseModel):
    """Tag request model"""
    ip: Optional[str] = Field(None, description="Chassis IP address (for chassis tags)")
    serialNumber: Optional[str] = Field(None, description="Serial number (for card tags)")
    tags: str = Field(..., description="Comma-separated list of tags")

    class Config:
        json_schema_extra = {
            "example": {
                "ip": "192.168.1.100",
                "tags": "production,lab"
            }
        }


class TagResponse(BaseModel):
    """Tag response model"""
    message: str = Field(..., description="Response message")
    ip: Optional[str] = Field(None, description="Chassis IP address")
    serialNumber: Optional[str] = Field(None, description="Serial number")
    tags: str = Field(..., description="Tags that were added/removed")

    class Config:
        json_schema_extra = {
            "example": {
                "message": "Records successfully updated",
                "ip": "192.168.1.100",
                "tags": "production,lab"
            }
        }

