"""
Sensors API endpoints
"""
from fastapi import APIRouter, HTTPException
from app.models.sensors import SensorResponse, SensorListResponse
from app.database import read_data_from_database

router = APIRouter(prefix="/api/sensors", tags=["sensors"])


@router.get("", response_model=SensorListResponse)
async def get_sensors():
    """Get sensor details"""
    try:
        # Read sensor data from database
        records = await read_data_from_database(table_name="chassis_sensor_details")
        
        # Transform records to response format
        sensor_list = []
        for record in records:
            sensor_data = {
                "chassisIp": record["chassisIp"],
                "typeOfChassis": record["typeOfChassis"],
                "sensorType": record["sensorType"],
                "sensorName": record["sensorName"],
                "sensorValue": record["sensorValue"],
                "unit": record["unit"],
                "lastUpdatedAt_UTC": record["lastUpdatedAt_UTC"]
            }
            sensor_list.append(SensorResponse(**sensor_data))
        
        return SensorListResponse(sensors=sensor_list, count=len(sensor_list))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sensor data: {str(e)}")

