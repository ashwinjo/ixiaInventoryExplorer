"""
Polling API endpoints
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.database import read_username_password_from_database
import json
import asyncio
from data_poller import controller

router = APIRouter(prefix="/api/poll", tags=["poll"])

# Map category to function
category_to_function_map = {
    "chassis": "/api/chassis",
    "cards": "/api/cards",
    "ports": "/api/ports",
    "licensing": "/api/licenses",
    "sensors": "/api/sensors"
}


@router.post("/{category}")
async def poll_latest_data(category: str, background_tasks: BackgroundTasks):
    """Poll latest data for a specific category"""
    try:
        valid_categories = ["chassis", "cards", "ports", "licensing", "sensors", "perf"]
        if category not in valid_categories:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid category. Valid categories are: {', '.join(valid_categories)}"
            )
        
        # Run polling in background
        background_tasks.add_task(controller, category_of_poll=category)
        
        redirect_url = category_to_function_map.get(category, "/")
        
        return {
            "message": f"Polling started for {category}",
            "status": "initiated",
            "redirect_url": redirect_url
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error initiating poll: {str(e)}")

