"""
Licenses API endpoints
"""
from fastapi import APIRouter, HTTPException
from app.models.licenses import LicenseResponse, LicenseListResponse
from app.database import read_data_from_database

router = APIRouter(prefix="/api/licenses", tags=["licenses"])


@router.get("/", response_model=LicenseListResponse)
async def get_licenses():
    """Get license details"""
    try:
        # Read license data from database
        records = await read_data_from_database(table_name="license_details_records")
        
        # Transform records to response format
        list_of_licenses = []
        for record in records:
            license_data = {
                "chassisIp": record["chassisIp"],
                "typeOfChassis": record["typeOfChassis"],
                "hostId": record["hostId"],
                "partNumber": record["partNumber"],
                "activationCode": record["activationCode"],
                "quantity": record["quantity"],
                "description": record["description"],
                "maintenanceDate": record["maintenanceDate"],
                "expiryDate": record["expiryDate"],
                "isExpired": record["isExpired"],
                "lastUpdatedAt_UTC": record["lastUpdatedAt_UTC"]
            }
            list_of_licenses.append(LicenseResponse(**license_data))
        
        return LicenseListResponse(licenses=list_of_licenses, count=len(list_of_licenses))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching license data: {str(e)}")

