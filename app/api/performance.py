"""
Performance metrics API endpoints
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
import json
from app.models.performance import PerformanceMetricResponse, PerformanceMetricListResponse, ChassisListForMetrics, ChassisListItem
from app.database import get_perf_metrics_from_db, read_username_password_from_database

router = APIRouter(prefix="/api/performance", tags=["performance"])


@router.get("/chassis-list", response_model=ChassisListForMetrics)
async def get_chassis_list():
    """Get list of chassis for performance metrics selection"""
    try:
        serv_list = await read_username_password_from_database()
        chassis_list = []
        if serv_list:
            chassis_data = json.loads(serv_list)
            chassis_list = [ChassisListItem(**chassis) for chassis in chassis_data]
        
        return ChassisListForMetrics(chassis=chassis_list, count=len(chassis_list))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching chassis list: {str(e)}")


@router.get("/metrics/{ip}", response_model=PerformanceMetricListResponse)
async def get_performance_metrics_by_ip(ip: str):
    """Get performance metrics for a specific chassis IP"""
    try:
        if ip == "fresh":
            return PerformanceMetricListResponse(
                metrics=[],
                count=0,
                chassisIp=None
            )
        
        records = await get_perf_metrics_from_db(ip)
        
        # Transform records to response format
        metrics_list = []
        for record in records:
            metric_data = {
                "chassisIp": record["chassisIp"],
                "mem_utilization": float(record["mem_utilization"]),
                "cpu_utilization": float(record["cpu_utilization"]),
                "lastUpdatedAt_UTC": record["lastUpdatedAt_UTC"]
            }
            metrics_list.append(PerformanceMetricResponse(**metric_data))
        
        # Return last 10 records
        metrics_list = metrics_list[-10:]
        
        return PerformanceMetricListResponse(
            metrics=metrics_list,
            count=len(metrics_list),
            chassisIp=ip
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching performance metrics: {str(e)}")

