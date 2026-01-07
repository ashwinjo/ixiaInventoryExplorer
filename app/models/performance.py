"""
Pydantic models for Performance endpoints
"""
from pydantic import BaseModel, Field
from typing import List, Optional


class PerformanceMetricResponse(BaseModel):
    """Performance metric response model"""
    chassisIp: str = Field(..., description="Chassis IP address")
    mem_utilization: float = Field(..., description="Memory utilization percentage")
    cpu_utilization: float = Field(..., description="CPU utilization percentage")
    lastUpdatedAt_UTC: str = Field(..., description="Last update timestamp in UTC")

    class Config:
        json_schema_extra = {
            "example": {
                "chassisIp": "192.168.1.100",
                "mem_utilization": 45.5,
                "cpu_utilization": 32.1,
                "lastUpdatedAt_UTC": "2024-01-01 12:00:00"
            }
        }


class PerformanceMetricListResponse(BaseModel):
    """List of performance metrics response model"""
    metrics: List[PerformanceMetricResponse] = Field(..., description="List of performance metrics")
    count: int = Field(..., description="Total number of metrics")
    chassisIp: Optional[str] = Field(None, description="Chassis IP if filtered")

    class Config:
        json_schema_extra = {
            "example": {
                "metrics": [],
                "count": 0,
                "chassisIp": None
            }
        }


class ChassisListItem(BaseModel):
    """Chassis item for metrics selection"""
    ip: str = Field(..., description="Chassis IP address")
    username: str = Field(..., description="Username")
    password: str = Field(..., description="Password")

    class Config:
        json_schema_extra = {
            "example": {
                "ip": "192.168.1.100",
                "username": "admin",
                "password": "password"
            }
        }


class ChassisListForMetrics(BaseModel):
    """List of chassis for metrics selection"""
    chassis: List[ChassisListItem] = Field(..., description="List of chassis")
    count: int = Field(..., description="Total number of chassis")

    class Config:
        json_schema_extra = {
            "example": {
                "chassis": [],
                "count": 0
            }
        }

