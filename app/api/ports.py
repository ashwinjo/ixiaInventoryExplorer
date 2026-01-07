"""
Ports API endpoints
"""
from fastapi import APIRouter, HTTPException
from app.models.ports import PortResponse, PortListResponse
from app.database import read_data_from_database

router = APIRouter(prefix="/api/ports", tags=["ports"])


@router.get("/", response_model=PortListResponse)
async def get_ports():
    """Get port details"""
    try:
        # Read port data from database
        records = await read_data_from_database(table_name="chassis_port_details")
        
        # Transform records to response format
        port_list = []
        for record in records:
            port_data = {
                "chassisIp": record["chassisIp"],
                "typeOfChassis": record["typeOfChassis"],
                "cardNumber": record["cardNumber"],
                "portNumber": record["portNumber"],
                "linkState": record["linkState"],
                "phyMode": record["phyMode"],
                "transceiverModel": record["transceiverModel"],
                "transceiverManufacturer": record["transceiverManufacturer"],
                "owner": record["owner"],
                "speed": record["speed"],
                "type": record["type"],
                "totalPorts": record["totalPorts"],
                "ownedPorts": record["ownedPorts"],
                "freePorts": record["freePorts"],
                "transmitState": record["transmitState"],
                "lastUpdatedAt_UTC": record["lastUpdatedAt_UTC"]
            }
            port_list.append(PortResponse(**port_data))
        
        return PortListResponse(ports=port_list, count=len(port_list))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching port data: {str(e)}")

