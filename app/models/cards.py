"""
Pydantic models for Cards endpoints
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class CardResponse(BaseModel):
    """Card details response model"""
    chassisIp: str = Field(..., description="Chassis IP address")
    chassisType: str = Field(..., description="Type of chassis")
    cardNumber: Optional[int] = Field(None, description="Card number")
    serialNumber: str = Field(..., description="Card serial number")
    cardType: str = Field(..., description="Type of card")
    cardState: str = Field(..., description="Card state")
    numberOfPorts: Optional[int] = Field(None, description="Number of ports on the card")
    lastUpdatedAt_UTC: str = Field(..., description="Last update timestamp in UTC")
    tags: List[str] = Field(default_factory=list, description="Tags associated with card")

    class Config:
        json_schema_extra = {
            "example": {
                "chassisIp": "192.168.1.100",
                "chassisType": "XGS12",
                "cardNumber": 1,
                "serialNumber": "CARD123456",
                "cardType": "XGS12-SD",
                "cardState": "Ready",
                "numberOfPorts": 4,
                "lastUpdatedAt_UTC": "2024-01-01 12:00:00",
                "tags": []
            }
        }


class CardListResponse(BaseModel):
    """List of cards response model"""
    cards: List[CardResponse] = Field(..., description="List of cards")
    count: int = Field(..., description="Total number of cards")

    class Config:
        json_schema_extra = {
            "example": {
                "cards": [],
                "count": 0
            }
        }

