"""
Pydantic models for Sensors endpoints
"""
from pydantic import BaseModel, Field
from typing import List


class SensorResponse(BaseModel):
    """Sensor details response model"""
    chassisIp: str = Field(..., description="Chassis IP address")
    typeOfChassis: str = Field(..., description="Type of chassis")
    sensorType: str = Field(..., description="Type of sensor")
    sensorName: str = Field(..., description="Sensor name")
    sensorValue: str = Field(..., description="Sensor value")
    unit: str = Field(..., description="Sensor unit")
    lastUpdatedAt_UTC: str = Field(..., description="Last update timestamp in UTC")

    class Config:
        json_schema_extra = {
            "example": {
                "chassisIp": "192.168.1.100",
                "typeOfChassis": "XGS12",
                "sensorType": "Temperature",
                "sensorName": "CPU Temperature",
                "sensorValue": "45",
                "unit": "45 °C",
                "lastUpdatedAt_UTC": "2024-01-01 12:00:00"
            }
        }


class SensorListResponse(BaseModel):
    """List of sensors response model"""
    sensors: List[SensorResponse] = Field(..., description="List of sensors")
    count: int = Field(..., description="Total number of sensors")

    class Config:
        json_schema_extra = {
            "example": {
                "sensors": [],
                "count": 0
            }
        }

