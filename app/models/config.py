"""
Pydantic models for Configuration endpoints
"""
from pydantic import BaseModel, Field
from typing import Optional, List


class ConfigUploadRequest(BaseModel):
    """Configuration upload request model"""
    text: str = Field(..., description="CSV formatted configuration text (operation,ip,username,password)")

    class Config:
        json_schema_extra = {
            "example": {
                "text": "ADD,192.168.1.100,admin,password\nADD,192.168.1.101,admin,password"
            }
        }


class ConfigUploadResponse(BaseModel):
    """Configuration upload response model"""
    message: str = Field(..., description="Response message")
    success: bool = Field(..., description="Whether upload was successful")

    class Config:
        json_schema_extra = {
            "example": {
                "message": "Configuration uploaded successfully",
                "success": True
            }
        }


class PollingIntervalsRequest(BaseModel):
    """Polling intervals request model"""
    chassis: int = Field(..., description="Chassis polling interval in seconds", ge=1)
    cards: int = Field(..., description="Cards polling interval in seconds", ge=1)
    ports: int = Field(..., description="Ports polling interval in seconds", ge=1)
    sensors: int = Field(..., description="Sensors polling interval in seconds", ge=1)
    licensing: int = Field(..., description="Licensing polling interval in seconds", ge=1)
    perf: int = Field(..., description="Performance polling interval in seconds", ge=1)
    purge: int = Field(..., description="Data purge interval in seconds", ge=1)

    class Config:
        json_schema_extra = {
            "example": {
                "chassis": 60,
                "cards": 60,
                "ports": 60,
                "sensors": 60,
                "licensing": 120,
                "perf": 60,
                "purge": 86400
            }
        }


class PollingIntervalsResponse(BaseModel):
    """Polling intervals response model"""
    message: str = Field(..., description="Response message")
    intervals: PollingIntervalsRequest = Field(..., description="Updated polling intervals")

    class Config:
        json_schema_extra = {
            "example": {
                "message": "Polling intervals updated successfully",
                "intervals": {
                    "chassis": 60,
                    "cards": 60,
                    "ports": 60,
                    "sensors": 60,
                    "licensing": 120,
                    "perf": 60,
                    "purge": 86400
                }
            }
        }


class ChassisConfigItem(BaseModel):
    """Chassis configuration item (without password for GET responses)"""
    ip: str = Field(..., description="Chassis IP address")
    username: str = Field(..., description="Username")

    class Config:
        json_schema_extra = {
            "example": {
                "ip": "192.168.1.100",
                "username": "admin"
            }
        }


class ChassisConfigListResponse(BaseModel):
    """List of configured chassis response model"""
    chassis: List[ChassisConfigItem] = Field(..., description="List of configured chassis")
    count: int = Field(..., description="Total number of configured chassis")

    class Config:
        json_schema_extra = {
            "example": {
                "chassis": [
                    {"ip": "192.168.1.100", "username": "admin"},
                    {"ip": "192.168.1.101", "username": "admin"}
                ],
                "count": 2
            }
        }


# =====================================================================
# IxNetwork API Server Models
# =====================================================================

class IxNetworkCredentialsUploadRequest(BaseModel):
    """IxNetwork API Server credentials upload request model"""
    text: str = Field(..., description="CSV formatted configuration text (operation,ip,username,password)")

    class Config:
        json_schema_extra = {
            "example": {
                "text": "ADD,192.168.1.100,admin,admin\nADD,192.168.1.101,admin,admin\nDELETE,192.168.1.102,admin,admin"
            }
        }


class IxNetworkCredentialsUploadResponse(BaseModel):
    """IxNetwork API Server credentials upload response model"""
    message: str = Field(..., description="Response message")
    success: bool = Field(..., description="Whether upload was successful")

    class Config:
        json_schema_extra = {
            "example": {
                "message": "IxNetwork API Server configuration uploaded successfully",
                "success": True
            }
        }


class IxNetworkConfigItem(BaseModel):
    """IxNetwork API Server configuration item (without password for GET responses)"""
    ip: str = Field(..., description="API Server IP address")
    username: str = Field(..., description="Username")

    class Config:
        json_schema_extra = {
            "example": {
                "ip": "192.168.1.100",
                "username": "admin"
            }
        }


class IxNetworkConfigListResponse(BaseModel):
    """List of configured IxNetwork API servers response model"""
    api_servers: List[IxNetworkConfigItem] = Field(..., description="List of configured API servers")
    count: int = Field(..., description="Total number of configured API servers")

    class Config:
        json_schema_extra = {
            "example": {
                "api_servers": [
                    {"ip": "192.168.1.100", "username": "admin"},
                    {"ip": "192.168.1.101", "username": "admin"}
                ],
                "count": 2
            }
        }


class IxNetworkServerDetails(BaseModel):
    """IxNetwork API Server polled details"""
    ixnetwork_api_server_ip: str = Field(..., description="API Server IP address")
    ixnetwork_api_server_type: str = Field(..., description="API Server type (Linux/Windows)")
    ixnetwork_api_server_sessions: str = Field(..., description="Total number of sessions")
    ixnetwork_api_server_running_sessions: str = Field(..., description="Number of running sessions")
    ixnetwork_api_server_idle_sessions: str = Field(..., description="Number of idle sessions")
    lastUpdatedAt_UTC: str = Field(..., description="Last update timestamp in UTC")

    class Config:
        json_schema_extra = {
            "example": {
                "ixnetwork_api_server_ip": "192.168.1.100",
                "ixnetwork_api_server_type": "Linux",
                "ixnetwork_api_server_sessions": "10",
                "ixnetwork_api_server_running_sessions": "5",
                "ixnetwork_api_server_idle_sessions": "5",
                "lastUpdatedAt_UTC": "2024-01-01 12:00:00"
            }
        }


class IxNetworkServerDetailsListResponse(BaseModel):
    """List of IxNetwork API server details response model"""
    servers: List[IxNetworkServerDetails] = Field(..., description="List of API server details")
    count: int = Field(..., description="Total number of API servers")

    class Config:
        json_schema_extra = {
            "example": {
                "servers": [
                    {
                        "ixnetwork_api_server_ip": "192.168.1.100",
                        "ixnetwork_api_server_type": "Linux",
                        "ixnetwork_api_server_sessions": "10",
                        "ixnetwork_api_server_running_sessions": "5",
                        "ixnetwork_api_server_idle_sessions": "5",
                        "lastUpdatedAt_UTC": "2024-01-01 12:00:00"
                    }
                ],
                "count": 1
            }
        }

