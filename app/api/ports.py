"""
Ports API endpoints
"""
from fastapi import APIRouter, HTTPException
from app.models.ports import PortResponse, PortListResponse
from app.database import read_data_from_database

router = APIRouter(prefix="/api/ports", tags=["ports"])


@router.get("", response_model=PortListResponse)
async def get_ports():
    """Get port details"""
    try:
        # Read port data from database
        records = await read_data_from_database(table_name="chassis_port_details")
        
        # Helper function to convert 'NA' or invalid values to None for integers
        def to_int_or_none(value):
            if value is None or value == '' or value == 'NA':
                return None
            try:
                return int(value)
            except (ValueError, TypeError):
                return None
        
        # Transform records to response format
        port_list = []
        for record in records:
            port_data = {
                "chassisIp": record["chassisIp"],
                "typeOfChassis": record["typeOfChassis"],
                "cardNumber": to_int_or_none(record.get("cardNumber")),
                "portNumber": to_int_or_none(record.get("portNumber")),
                "linkState": record.get("linkState", "NA"),
                "phyMode": record.get("phyMode", "NA"),
                "transceiverModel": record.get("transceiverModel", "NA"),
                "transceiverManufacturer": record.get("transceiverManufacturer", "NA"),
                "owner": record.get("owner", "Free"),
                "speed": record.get("speed", "NA"),
                "type": record.get("type", "NA"),
                "totalPorts": to_int_or_none(record.get("totalPorts")),
                "ownedPorts": to_int_or_none(record.get("ownedPorts")),
                "freePorts": to_int_or_none(record.get("freePorts")),
                "transmitState": record.get("transmitState", "NA"),
                "lastUpdatedAt_UTC": record.get("lastUpdatedAt_UTC", "")
            }
            port_list.append(PortResponse(**port_data))
        
        return PortListResponse(ports=port_list, count=len(port_list))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching port data: {str(e)}")

