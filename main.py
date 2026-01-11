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
    description="FastAPI-based Ixia Inventory Explorer",
    # IMPORTANT: Disable redirect_slashes to prevent 307 redirects
    # that break reverse proxy/ngrok setups (the redirect URL contains 
    # the internal server address which clients can't reach)
    redirect_slashes=False
)

# CORS configuration - Deployment Agnostic
# =========================================
# In production (Cloud Run, etc.), frontend and API are served from the same origin,
# so CORS is not needed. However, we enable it for:
# - Local development (frontend on :5173, API on :3000)
# - ngrok tunneling
# - Any other cross-origin scenarios
#
# Set CORS_ORIGINS="*" to allow all origins, or specify specific origins
cors_origins_env = os.getenv("CORS_ORIGINS", "*")

if cors_origins_env == "*":
    # Allow all origins (useful for development and flexible deployments)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,  # Cannot use credentials with allow_origins=["*"]
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # Use specific origins from environment variable
    cors_origins_list = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins_list,
        allow_origin_regex=r"https?://.*\.ngrok(-free)?\.app|https?://.*\.ngrok\.io|http://localhost:\d+|http://127\.0\.0\.1:\d+|https?://.*\.run\.app",
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
from app.api import chassis, cards, ports, licenses, sensors, performance, config, tags, poll, logs, ixnetwork_servers

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
app.include_router(ixnetwork_servers.router)

# ADK Proxy Route
# ================
import httpx
from fastapi import Request, Response

@app.api_route("/adk/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_adk(path: str, request: Request):
    adk_url = f"http://localhost:8000/{path}"
    
    # Get request body
    body = await request.body()
    
    # Forward the request to the ADK agent
    async with httpx.AsyncClient() as client:
        # Filter out host header to avoid conflicts
        headers = {k: v for k, v in request.headers.items() if k.lower() != "host"}
        
        try:
            resp = await client.request(
                method=request.method,
                url=adk_url,
                params=request.query_params,
                headers=headers,
                content=body,
                timeout=60.0 # Agent can take time to think
            )
            
            return Response(
                content=resp.content,
                status_code=resp.status_code,
                headers=dict(resp.headers)
            )
        except Exception as e:
            return Response(
                content=f"ADK Proxy Error: {str(e)}",
                status_code=502
            )

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    # Cloud Run uses PORT=8080 by default, but support any port
    port = int(os.getenv("PORT", 8080))
    print(f"Starting server on {host}:{port}")
    uvicorn.run(app, host=host, port=port)

