"""
IxNetwork API Servers endpoints
"""
from fastapi import APIRouter, HTTPException
from app.models.config import IxNetworkServerDetailsListResponse, IxNetworkServerDetails
from app.database import read_ixnetwork_server_details_from_database

router = APIRouter(prefix="/api/ixnetwork", tags=["ixnetwork"])


@router.get("", response_model=IxNetworkServerDetailsListResponse)
async def get_ixnetwork_servers():
    """Get IxNetwork API Server details (sessions info) from database"""
    try:
        records = await read_ixnetwork_server_details_from_database()
        
        # Transform records to response format
        server_list = []
        for record in records:
            server_data = {
                "ixnetwork_api_server_ip": record["ixnetwork_api_server_ip"],
                "ixnetwork_api_server_sessions": record.get("ixnetwork_api_server_sessions", "0"),
                "lastUpdatedAt_UTC": record.get("lastUpdatedAt_UTC", "")
            }
            server_list.append(IxNetworkServerDetails(**server_data))
        
        return IxNetworkServerDetailsListResponse(servers=server_list, count=len(server_list))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching IxNetwork server data: {str(e)}")
