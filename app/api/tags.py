"""
Tags API endpoints
"""
from fastapi import APIRouter, HTTPException
from app.models.tags import TagRequest, TagResponse
from app.database import write_tags

router = APIRouter(prefix="/api/tags", tags=["tags"])


@router.post("/add", response_model=TagResponse)
async def add_tags(request: TagRequest):
    """Add tags to chassis/cards"""
    try:
        if not request.ip and not request.serialNumber:
            raise HTTPException(
                status_code=400,
                detail="Either 'ip' or 'serialNumber' must be provided"
            )
        
        if request.ip:
            resp = await write_tags(
                ip=request.ip,
                tags=request.tags,
                type_of_update="chassis",
                operation="add"
            )
            return TagResponse(
                message=resp,
                ip=request.ip,
                tags=request.tags
            )
        
        if request.serialNumber:
            resp = await write_tags(
                ip=request.serialNumber,
                tags=request.tags,
                type_of_update="card",
                operation="add"
            )
            return TagResponse(
                message=resp,
                serialNumber=request.serialNumber,
                tags=request.tags
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding tags: {str(e)}")


@router.post("/remove", response_model=TagResponse)
async def remove_tags(request: TagRequest):
    """Remove tags from chassis/cards"""
    try:
        if not request.ip and not request.serialNumber:
            raise HTTPException(
                status_code=400,
                detail="Either 'ip' or 'serialNumber' must be provided"
            )
        
        if request.ip:
            resp = await write_tags(
                ip=request.ip,
                tags=request.tags,
                type_of_update="chassis",
                operation="remove"
            )
            return TagResponse(
                message=resp,
                ip=request.ip,
                tags=request.tags
            )
        
        if request.serialNumber:
            resp = await write_tags(
                ip=request.serialNumber,
                tags=request.tags,
                type_of_update="card",
                operation="remove"
            )
            return TagResponse(
                message=resp,
                serialNumber=request.serialNumber,
                tags=request.tags
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing tags: {str(e)}")

