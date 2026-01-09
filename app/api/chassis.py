"""
Chassis API endpoints
"""
from fastapi import APIRouter, HTTPException
from typing import List
from app.models.chassis import ChassisResponse, ChassisListResponse
from app.database import read_data_from_database, read_tags

router = APIRouter(prefix="/api/chassis", tags=["chassis"])


@router.get("", response_model=ChassisListResponse)
async def get_chassis():
    """Get chassis summary details"""
    try:
        # Get tags for chassis
        ip_tags_dict = await read_tags(type_of_update="chassis")
        
        # Read chassis data from database
        records = await read_data_from_database(table_name="chassis_summary_details")
        
        # Transform records to response format
        list_of_chassis = []
        for record in records:
            tags = record.get("tags", "")
            tags_list = tags.split(",") if tags else []
            
            # Merge tags from ip_tags_dict if available
            if record["ip"] in ip_tags_dict:
                tags_list = ip_tags_dict[record["ip"]]
            
            # Convert physicalCards to string (handles None, "NA", or numeric values)
            physical_cards = record["physicalCards"]
            if physical_cards is None:
                physical_cards = "NA"
            else:
                physical_cards = str(physical_cards)
            
            # Create chassis data using field names (not aliases) so frontend can use dot notation
            chassis_data = {
                "chassisIp": record["ip"],
                "chassisSerialNumber": record["chassisSN"],  # Use field name, not alias
                "controllerSerialNumber": record["controllerSN"],  # Use field name, not alias
                "chassisType": record["type_of_chassis"],
                "physicalCardsNumber": physical_cards,  # Use field name, not alias
                "chassisStatus": record["status_status"],
                "lastUpdatedAt_UTC": record["lastUpdatedAt_UTC"],
                "IxOS": record["ixOS"],
                "IxNetworkProtocols": record["ixNetwork_Protocols"],  # Use field name
                "IxOSREST": record["ixOS_REST"],  # Use field name
                "tags": tags_list,
                "mem_bytes": str(record["mem_bytes"]),
                "mem_bytes_total": str(record["mem_bytes_total"]),
                "cpu_pert_usage": str(record["cpu_pert_usage"]),
                "os": record["os"]
            }
            list_of_chassis.append(ChassisResponse(**chassis_data))
        
        return ChassisListResponse(chassis=list_of_chassis, count=len(list_of_chassis))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching chassis data: {str(e)}")

