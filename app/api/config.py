"""
Configuration API endpoints
"""
from fastapi import APIRouter, HTTPException
import json
from app.models.config import ConfigUploadRequest, ConfigUploadResponse, PollingIntervalsRequest, PollingIntervalsResponse, ChassisConfigListResponse, ChassisConfigItem
from app.database import write_username_password_to_database, write_polling_intervals_into_database, is_input_in_correct_format, read_username_password_from_database

router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("/chassis", response_model=ChassisConfigListResponse)
async def get_configured_chassis():
    """Get list of configured chassis IPs (without passwords)"""
    try:
        serv_list = await read_username_password_from_database()
        chassis_list = []
        if serv_list:
            chassis_data = json.loads(serv_list)
            # Return chassis config without passwords
            chassis_list = [
                ChassisConfigItem(ip=chassis["ip"], username=chassis["username"])
                for chassis in chassis_data
            ]
        
        return ChassisConfigListResponse(chassis=chassis_list, count=len(chassis_list))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching configured chassis: {str(e)}")


@router.post("/upload", response_model=ConfigUploadResponse)
async def upload_config(request: ConfigUploadRequest):
    """Upload configuration"""
    try:
        # Validate input format
        valid_input = is_input_in_correct_format(request.text)
        if not valid_input:
            raise HTTPException(
                status_code=400,
                detail="Incorrect Input Formatting. Please check your csv format. Expected format: operation,ip,username,password"
            )
        
        # Write to database
        await write_username_password_to_database(request.text)
        
        return ConfigUploadResponse(
            message="Configuration uploaded successfully",
            success=True
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading configuration: {str(e)}")


@router.post("/polling-intervals", response_model=PollingIntervalsResponse)
async def set_polling_intervals(request: PollingIntervalsRequest):
    """Set polling intervals"""
    try:
        # Write polling intervals to database
        await write_polling_intervals_into_database(
            chassis=request.chassis,
            cards=request.cards,
            ports=request.ports,
            sensors=request.sensors,
            licensing=request.licensing,
            perf=request.perf,
            data_purge=request.purge
        )
        
        return PollingIntervalsResponse(
            message="Polling intervals updated successfully",
            intervals=request
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating polling intervals: {str(e)}")

