"""
Pydantic models for Ports endpoints
"""
from pydantic import BaseModel, Field
from typing import List, Optional


class PortResponse(BaseModel):
    """Port details response model"""
    chassisIp: str = Field(..., description="Chassis IP address")
    typeOfChassis: str = Field(..., description="Type of chassis")
    cardNumber: Optional[int] = Field(None, description="Card number")
    portNumber: Optional[int] = Field(None, description="Port number")
    linkState: str = Field(..., description="Link state")
    phyMode: str = Field(..., description="Physical mode")
    transceiverModel: str = Field(..., description="Transceiver model")
    transceiverManufacturer: str = Field(..., description="Transceiver manufacturer")
    owner: str = Field(..., description="Port owner")
    speed: str = Field(..., description="Port speed")
    type: str = Field(..., description="Port type")
    totalPorts: Optional[int] = Field(None, description="Total ports")
    ownedPorts: Optional[int] = Field(None, description="Owned ports")
    freePorts: Optional[int] = Field(None, description="Free ports")
    transmitState: str = Field(..., description="Transmit state")
    lastUpdatedAt_UTC: str = Field(..., description="Last update timestamp in UTC")

    class Config:
        json_schema_extra = {
            "example": {
                "chassisIp": "192.168.1.100",
                "typeOfChassis": "XGS12",
                "cardNumber": 1,
                "portNumber": 1,
                "linkState": "Up",
                "phyMode": "1000BASE-X",
                "transceiverModel": "SFP-1G-SX",
                "transceiverManufacturer": "Keysight",
                "owner": "IxNetwork",
                "speed": "1000",
                "type": "Ethernet",
                "totalPorts": 4,
                "ownedPorts": 2,
                "freePorts": 2,
                "transmitState": "Idle",
                "lastUpdatedAt_UTC": "2024-01-01 12:00:00"
            }
        }


class PortListResponse(BaseModel):
    """List of ports response model"""
    ports: List[PortResponse] = Field(..., description="List of ports")
    count: int = Field(..., description="Total number of ports")

    class Config:
        json_schema_extra = {
            "example": {
                "ports": [],
                "count": 0
            }
        }

