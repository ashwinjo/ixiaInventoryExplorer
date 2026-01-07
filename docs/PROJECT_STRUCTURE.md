# Ixia Inventory Explorer - Project Structure & Running Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Project Structure](#project-structure)
3. [FastAPI Backend Structure](#fastapi-backend-structure)
4. [Frontend Structure](#frontend-structure)
5. [How to Run Locally](#how-to-run-locally)
6. [Environment Variables](#environment-variables)
7. [API Endpoints](#api-endpoints)

## Project Overview

Ixia Inventory Explorer is a full-stack application migrated from Flask to FastAPI, featuring:
- **Backend**: FastAPI (Python 3.8+)
- **Frontend**: React 18 + Vite + Tailwind CSS + shadcn/ui
- **Database**: SQLite (with async support via aiosqlite)
- **Architecture**: RESTful API with SPA frontend

## Project Structure

```
ixiaInventoryExplorer/
├── main.py                      # FastAPI application entry point
├── requirements.txt             # Python dependencies
├── package.json                 # Node.js dependencies
├── vite.config.js              # Vite configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── Dockerfile                   # Docker build configuration
├── runApplication.sh            # Application startup script
│
├── app/                         # Backend application
│   ├── __init__.py
│   ├── database.py              # Async database utilities
│   │
│   ├── api/                     # API route handlers
│   │   ├── __init__.py
│   │   ├── chassis.py           # Chassis endpoints
│   │   ├── cards.py             # Card endpoints
│   │   ├── ports.py             # Port endpoints
│   │   ├── licenses.py          # License endpoints
│   │   ├── sensors.py          # Sensor endpoints
│   │   ├── performance.py       # Performance metrics endpoints
│   │   ├── config.py           # Configuration endpoints
│   │   ├── tags.py             # Tag management endpoints
│   │   ├── poll.py             # Polling endpoints
│   │   └── logs.py             # Log collection endpoints
│   │
│   ├── models/                  # Pydantic models
│   │   ├── __init__.py
│   │   ├── chassis.py
│   │   ├── cards.py
│   │   ├── ports.py
│   │   ├── licenses.py
│   │   ├── sensors.py
│   │   ├── performance.py
│   │   ├── config.py
│   │   ├── tags.py
│   │   └── logs.py
│   │
│   ├── static/                  # Static files (legacy)
│   │   ├── assets/
│   │   ├── css/
│   │   └── js/
│   │
│   └── templates/               # Jinja2 templates (legacy)
│       └── *.html
│
├── src/                         # Frontend React application
│   ├── main.jsx                 # React entry point
│   ├── App.jsx                  # Root component
│   ├── index.css                # Global styles
│   │
│   ├── components/              # React components
│   │   ├── layout/             # Layout components
│   │   │   ├── Layout.jsx
│   │   │   └── Navbar.jsx
│   │   └── ui/                 # shadcn/ui components
│   │       ├── button.jsx
│   │       ├── card.jsx
│   │       ├── dialog.jsx
│   │       ├── input.jsx
│   │       ├── select.jsx
│   │       ├── table.jsx
│   │       ├── tabs.jsx
│   │       └── toaster.jsx
│   │
│   ├── pages/                   # Page components
│   │   ├── ChassisPage.jsx
│   │   ├── CardsPage.jsx
│   │   ├── PortsPage.jsx
│   │   ├── LicensesPage.jsx
│   │   ├── SensorsPage.jsx
│   │   ├── PerformancePage.jsx
│   │   ├── ConfigPage.jsx
│   │   └── SettingsPage.jsx
│   │
│   ├── routes/                  # Routing configuration
│   │   └── AppRoutes.jsx
│   │
│   ├── lib/                     # Utility libraries
│   │   ├── api.js              # Axios instance
│   │   ├── api/
│   │   │   └── endpoints.js    # API endpoint functions
│   │   └── utils.js            # Utility functions
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── use-api.js          # API hooks
│   │   └── use-toast.js        # Toast notifications
│   │
│   └── context/                 # React context
│       └── AppContext.jsx       # Global app context
│
├── RestApi/                     # Ixia REST API integration
│   ├── IxOSRestInterface.py
│   └── requirements.txt
│
├── data_poller.py               # Background polling service
├── init_db.py                   # Database initialization
├── IxOSRestAPICaller.py         # REST API caller utilities
└── sqlite3_utilities.py         # Legacy database utilities (deprecated)
```

## FastAPI Backend Structure

### Main Application (`main.py`)

The FastAPI application is initialized in `main.py`:

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Ixia Inventory Explorer",
    version="2.0.0"
)
```

**Key Features:**
- CORS middleware for frontend communication
- Static file serving for legacy assets
- Router registration for all API endpoints
- Environment variable configuration

### API Routes (`app/api/`)

Each API module follows a consistent pattern:

```python
from fastapi import APIRouter
from app.models.chassis import ChassisListResponse
from app.database import read_data_from_database

router = APIRouter(prefix="/api/chassis", tags=["chassis"])

@router.get("/", response_model=ChassisListResponse)
async def get_chassis():
    # Implementation
    pass
```

**Route Organization:**
- `/api/chassis` - Chassis management
- `/api/cards` - Card information
- `/api/ports` - Port details
- `/api/licenses` - License information
- `/api/sensors` - Sensor readings
- `/api/performance` - Performance metrics
- `/api/config` - Configuration management
- `/api/tags` - Tag management
- `/api/poll` - On-demand polling
- `/api/logs` - Log collection

### Database Layer (`app/database.py`)

All database operations use async/await pattern:

```python
import aiosqlite

async def read_data_from_database(table_name: str) -> List[Dict]:
    conn = await get_db_connection()
    # ... async operations
    await conn.close()
```

**Key Functions:**
- `read_data_from_database()` - Read records
- `write_data_to_database()` - Write records
- `read_tags()` / `write_tags()` - Tag management
- `get_perf_metrics_from_db()` - Performance metrics

### Pydantic Models (`app/models/`)

Request/response validation using Pydantic:

```python
from pydantic import BaseModel, Field

class ChassisResponse(BaseModel):
    chassisIp: str
    chassisSerialNumber: str
    # ... other fields
```

## Frontend Structure

### React Application (`src/`)

**Entry Point:**
- `main.jsx` - React DOM rendering
- `App.jsx` - Root component with routing

**Routing:**
- `routes/AppRoutes.jsx` - Route definitions
- React Router v6 for navigation

**State Management:**
- `context/AppContext.jsx` - Global state
- Custom hooks for API calls
- Local component state

**API Integration:**
- `lib/api.js` - Axios instance with interceptors
- `lib/api/endpoints.js` - API endpoint functions
- `hooks/use-api.js` - Custom hooks for data fetching

## How to Run Locally

### Prerequisites

- Python 3.8 or higher
- Node.js 18+ and npm
- SQLite3

### Backend Setup

1. **Create virtual environment:**
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

3. **Initialize database:**
```bash
python init_db.py
```

4. **Set environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. **Run FastAPI server:**
```bash
# Development mode with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 3000

# Or use Python directly
python main.py
```

The API will be available at `http://localhost:3000`

**API Documentation:**
- Swagger UI: `http://localhost:3000/docs`
- ReDoc: `http://localhost:3000/redoc`

### Frontend Setup

1. **Install Node.js dependencies:**
```bash
npm install
```

2. **Start development server:**
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

**Build for production:**
```bash
npm run build
```

The built files will be in the `dist/` directory.

### Running Both Services

**Terminal 1 - Backend:**
```bash
cd /path/to/ixiaInventoryExplorer
source venv/bin/activate
uvicorn main:app --reload --port 3000
```

**Terminal 2 - Frontend:**
```bash
cd /path/to/ixiaInventoryExplorer
npm run dev
```

**Terminal 3 - Background Poller (Optional):**
```bash
cd /path/to/ixiaInventoryExplorer
source venv/bin/activate
python data_poller.py --category=chassis --interval=60
```

## Environment Variables

Create a `.env` file in the project root:

```env
# Application Settings
APP_NAME=Ixia Inventory Explorer
APP_VERSION=2.0.0
DEBUG=False
HOST=0.0.0.0
PORT=3000

# Database
DATABASE_PATH=inventory.db

# Polling Intervals (in seconds)
CHASSIS_POLL_INTERVAL=60
CARDS_POLL_INTERVAL=60
PORTS_POLL_INTERVAL=60
SENSORS_POLL_INTERVAL=60
PERF_POLL_INTERVAL=60
LICENSING_POLL_INTERVAL=120
DATA_PURGE_INTERVAL=86400

# CORS Settings (for frontend)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

**Frontend Environment Variables:**

Create `.env` in project root for Vite:

```env
VITE_API_URL=http://localhost:3000
```

## API Endpoints

### Chassis
- `GET /api/chassis` - Get all chassis
- `POST /api/poll/chassis` - Poll latest chassis data

### Cards
- `GET /api/cards` - Get all cards
- `POST /api/poll/cards` - Poll latest card data

### Ports
- `GET /api/ports` - Get all ports
- `POST /api/poll/ports` - Poll latest port data

### Licenses
- `GET /api/licenses` - Get all licenses
- `POST /api/poll/licensing` - Poll latest license data

### Sensors
- `GET /api/sensors` - Get all sensors
- `POST /api/poll/sensors` - Poll latest sensor data

### Performance
- `GET /api/performance/chassis-list` - Get chassis list for metrics
- `GET /api/performance/metrics/{ip}` - Get performance metrics for chassis

### Configuration
- `POST /api/config/upload` - Upload chassis configuration (CSV)
- `POST /api/config/polling-intervals` - Set polling intervals

### Tags
- `POST /api/tags/add` - Add tags to chassis/cards
- `POST /api/tags/remove` - Remove tags from chassis/cards

### Logs
- `POST /api/logs/collect` - Collect logs from chassis

### Health Check
- `GET /health` - Health check endpoint
- `GET /` - API information

## Development Tips

1. **Hot Reload**: Both FastAPI (`--reload`) and Vite (`npm run dev`) support hot reload
2. **API Testing**: Use Swagger UI at `/docs` for interactive API testing
3. **Database**: SQLite database file is created automatically on first run
4. **Logs**: Check console output for debugging information
5. **CORS**: Ensure frontend URL is in `CORS_ORIGINS` environment variable

## Troubleshooting

**Backend Issues:**
- Ensure Python virtual environment is activated
- Check that all dependencies are installed: `pip install -r requirements.txt`
- Verify database file exists and is writable
- Check port 3000 is not in use

**Frontend Issues:**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check that backend is running on port 3000
- Verify `VITE_API_URL` in `.env` matches backend URL
- Check browser console for errors

**Database Issues:**
- Run `python init_db.py` to recreate database schema
- Check file permissions on `inventory.db`
- Verify SQLite3 is installed

