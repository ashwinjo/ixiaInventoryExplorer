"""
Pydantic models for API requests and responses
"""
from .chassis import ChassisResponse, ChassisListResponse
from .cards import CardResponse, CardListResponse
from .ports import PortResponse, PortListResponse
from .licenses import LicenseResponse, LicenseListResponse
from .sensors import SensorResponse, SensorListResponse
from .performance import PerformanceMetricResponse, PerformanceMetricListResponse, ChassisListForMetrics
from .tags import TagRequest, TagResponse
from .config import ConfigUploadRequest, ConfigUploadResponse, PollingIntervalsRequest, PollingIntervalsResponse, ChassisConfigItem, ChassisConfigListResponse
from .logs import LogCollectionRequest, LogCollectionResponse

__all__ = [
    "ChassisResponse",
    "ChassisListResponse",
    "CardResponse",
    "CardListResponse",
    "PortResponse",
    "PortListResponse",
    "LicenseResponse",
    "LicenseListResponse",
    "SensorResponse",
    "SensorListResponse",
    "PerformanceMetricResponse",
    "PerformanceMetricListResponse",
    "ChassisListForMetrics",
    "TagRequest",
    "TagResponse",
    "ConfigUploadRequest",
    "ConfigUploadResponse",
    "PollingIntervalsRequest",
    "PollingIntervalsResponse",
    "ChassisConfigItem",
    "ChassisConfigListResponse",
    "LogCollectionRequest",
    "LogCollectionResponse",
]

