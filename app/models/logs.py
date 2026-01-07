"""
Pydantic models for Logs endpoints
"""
from pydantic import BaseModel, Field


class LogCollectionRequest(BaseModel):
    """Log collection request model"""
    ip: str = Field(..., description="Chassis IP address")

    class Config:
        json_schema_extra = {
            "example": {
                "ip": "192.168.1.100"
            }
        }


class LogCollectionResponse(BaseModel):
    """Log collection response model"""
    resultUrl: str = Field(..., description="URL to download logs")
    message: str = Field(..., description="Response message")

    class Config:
        json_schema_extra = {
            "example": {
                "resultUrl": "https://192.168.1.100/logs/download/abc123",
                "message": "Please login to your chassis and enter this url in browser to download logs"
            }
        }

