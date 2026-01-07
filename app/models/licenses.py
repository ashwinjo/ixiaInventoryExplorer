"""
Pydantic models for Licenses endpoints
"""
from pydantic import BaseModel, Field
from typing import List


class LicenseResponse(BaseModel):
    """License details response model"""
    chassisIp: str = Field(..., description="Chassis IP address")
    typeOfChassis: str = Field(..., description="Type of chassis")
    hostId: str = Field(..., description="Host ID")
    partNumber: str = Field(..., description="Part number")
    activationCode: str = Field(..., description="Activation code")
    quantity: str = Field(..., description="License quantity")
    description: str = Field(..., description="License description")
    maintenanceDate: str = Field(..., description="Maintenance date")
    expiryDate: str = Field(..., description="Expiry date")
    isExpired: str = Field(..., description="Whether license is expired")
    lastUpdatedAt_UTC: str = Field(..., description="Last update timestamp in UTC")

    class Config:
        json_schema_extra = {
            "example": {
                "chassisIp": "192.168.1.100",
                "typeOfChassis": "XGS12",
                "hostId": "HOST123456",
                "partNumber": "PART789",
                "activationCode": "ACT123",
                "quantity": "1",
                "description": "IxNetwork License",
                "maintenanceDate": "2024-12-31",
                "expiryDate": "2025-12-31",
                "isExpired": "False",
                "lastUpdatedAt_UTC": "2024-01-01 12:00:00"
            }
        }


class LicenseListResponse(BaseModel):
    """List of licenses response model"""
    licenses: List[LicenseResponse] = Field(..., description="List of licenses")
    count: int = Field(..., description="Total number of licenses")

    class Config:
        json_schema_extra = {
            "example": {
                "licenses": [],
                "count": 0
            }
        }

