from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Ixia Inventory Explorer",
    version="2.0.0",
    description="FastAPI-based Ixia Inventory Explorer"
)

# CORS configuration
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount frontend static files (built React app)
if os.path.exists("dist"):
    # Mount assets directory
    if os.path.exists("dist/assets"):
        app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")
    
    # Serve index.html and other static files from dist
    from fastapi.responses import FileResponse
    from fastapi import Request
    from fastapi.exceptions import HTTPException
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str, request: Request):
        # Don't serve frontend for API routes or docs
        if (full_path.startswith("api") or 
            full_path.startswith("docs") or 
            full_path.startswith("redoc") or 
            full_path.startswith("openapi.json") or
            full_path == "health"):
            raise HTTPException(status_code=404)
        
        # Serve static files from dist (like favicon.ico)
        file_path = os.path.join("dist", full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Serve index.html for all other routes (SPA routing)
        if os.path.exists("dist/index.html"):
            return FileResponse("dist/index.html")
        
        raise HTTPException(status_code=404)

@app.get("/api")
async def api_info():
    return {"message": "Ixia Inventory Explorer API", "version": "2.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# API routes
from app.api import chassis, cards, ports, licenses, sensors, performance, config, tags, poll, logs

# Register routers
app.include_router(chassis.router)
app.include_router(cards.router)
app.include_router(ports.router)
app.include_router(licenses.router)
app.include_router(sensors.router)
app.include_router(performance.router)
app.include_router(config.router)
app.include_router(tags.router)
app.include_router(poll.router)
app.include_router(logs.router)

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 3000))
    uvicorn.run(app, host=host, port=port)

