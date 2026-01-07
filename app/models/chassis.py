"""
Pydantic models for Chassis endpoints
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class ChassisResponse(BaseModel):
    """Chassis summary details response model"""
    chassisIp: str = Field(..., description="Chassis IP address")
    chassisSerialNumber: str = Field(..., alias="chassisSerial#", description="Chassis serial number")
    controllerSerialNumber: str = Field(..., alias="controllerSerial#", description="Controller serial number")
    chassisType: str = Field(..., description="Type of chassis")
    physicalCardsNumber: str = Field(..., alias="physicalCards#", description="Number of physical cards")
    chassisStatus: str = Field(..., description="Chassis status")
    lastUpdatedAt_UTC: str = Field(..., description="Last update timestamp in UTC")
    IxOS: str = Field(..., description="IxOS version")
    IxNetworkProtocols: str = Field(..., alias="IxNetwork Protocols", description="IxNetwork Protocols version")
    IxOSREST: str = Field(..., alias="IxOS REST", description="IxOS REST API version")
    tags: List[str] = Field(default_factory=list, description="Tags associated with chassis")
    mem_bytes: str = Field(..., description="Memory used in bytes")
    mem_bytes_total: str = Field(..., description="Total memory in bytes")
    cpu_pert_usage: str = Field(..., description="CPU utilization percentage")
    os: str = Field(..., description="Operating system")

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "chassisIp": "192.168.1.100",
                "chassisSerial#": "SN123456",
                "controllerSerial#": "CTRL789",
                "chassisType": "XGS12",
                "physicalCards#": "4",
                "chassisStatus": "Ready",
                "lastUpdatedAt_UTC": "2024-01-01 12:00:00",
                "IxOS": "9.10",
                "IxNetwork Protocols": "9.10",
                "IxOS REST": "9.10",
                "tags": ["production", "lab"],
                "mem_bytes": "8589934592",
                "mem_bytes_total": "17179869184",
                "cpu_pert_usage": "45.5",
                "os": "Linux"
            }
        }


class ChassisListResponse(BaseModel):
    """List of chassis response model"""
    chassis: List[ChassisResponse] = Field(..., description="List of chassis")
    count: int = Field(..., description="Total number of chassis")

    class Config:
        json_schema_extra = {
            "example": {
                "chassis": [],
                "count": 0
            }
        }

