"""
Logs API endpoints
"""
from fastapi import APIRouter, HTTPException
import json
from app.models.logs import LogCollectionRequest, LogCollectionResponse
from app.database import read_username_password_from_database
from RestApi.IxOSRestInterface import IxRestSession

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.post("/collect", response_model=LogCollectionResponse)
async def collect_logs(request: LogCollectionRequest):
    """Collect logs from Ixia chassis"""
    try:
        chassis_list_data = await read_username_password_from_database()
        if not chassis_list_data:
            raise HTTPException(status_code=404, detail="No chassis configured")
        
        chassis_list = json.loads(chassis_list_data)
        chassis = None
        
        for chassis_item in chassis_list:
            if chassis_item["ip"] == request.ip:
                chassis = chassis_item
                break
        
        if not chassis:
            raise HTTPException(status_code=404, detail=f"Chassis with IP {request.ip} not found")
        
        # Create REST session and collect logs
        session = IxRestSession(chassis["ip"], chassis["username"], chassis["password"])
        result_url = session.collect_chassis_logs(session)
        
        return LogCollectionResponse(
            resultUrl=result_url,
            message="Please login to your chassis and enter this url in browser to download logs"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error collecting logs: {str(e)}")

