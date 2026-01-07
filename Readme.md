# Ixia Inventory Explorer v2.0

A modern web application for managing Ixia chassis inventory, migrated from Flask to FastAPI with a React frontend.

## Overview

Ixia Inventory Explorer is a full-stack application that provides a unified interface for managing Ixia chassis inventory. The application has been migrated from Flask to FastAPI, featuring:

- **Backend**: FastAPI (Python 3.8+) with async database operations
- **Frontend**: React 18 + Vite + Tailwind CSS + shadcn/ui
- **Database**: SQLite with async support
- **Architecture**: RESTful API with Single Page Application (SPA)

## Features

- ✅ Unified preview of available Ixia Chassis with custom tagging
- ✅ License statistics for every Ixia Chassis
- ✅ Card Statistics with custom tagging feature
- ✅ Port Statistics with owner and transceiver information
- ✅ Sensor readings and monitoring
- ✅ Performance metrics with real-time charts (CPU & Memory)
- ✅ One-click IxOS chassis log collection
- ✅ On-demand data refresh
- ✅ Advanced filtering and search capabilities
- ✅ Modern, responsive UI

## Prerequisites

- **For Local Development:**
  - Python 3.8 or higher
  - Node.js 18+ and npm
  - SQLite3

- **For Docker Deployment:**
  - Docker Engine 20.10+
  - Docker Compose (optional)

- **Network Access:**
  - Access to Ixia chassis REST APIs
  - Internet access for package installation

## Quick Start

### Option 1: Docker (Recommended)

**Build and run with Docker:**

```bash
# Build the image
docker build --platform linux/amd64 -t ixia-inventory-explorer:latest .

# Run the container
docker run -d \
  --name ixia-explorer \
  -p 3000:3000 \
  -v ixia-data:/python-docker \
  ixia-inventory-explorer:latest
```

**Or use Docker Compose:**

```bash
docker-compose up -d
```

Access the application at `http://localhost:3000`

### Option 2: Local Development

**Backend Setup:**

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Initialize database
python init_db.py

# Run FastAPI server
uvicorn main:app --reload --port 3000
```

**Frontend Setup:**

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Backend: `http://localhost:3000`  
Frontend: `http://localhost:5173`

## API Documentation

Once the backend is running, access interactive API documentation:

- **Swagger UI**: `http://localhost:3000/docs`
- **ReDoc**: `http://localhost:3000/redoc`

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
- `GET /api/performance/metrics/{ip}` - Get performance metrics

### Configuration
- `POST /api/config/upload` - Upload chassis configuration (CSV format)
- `POST /api/config/polling-intervals` - Set polling intervals

### Tags
- `POST /api/tags/add` - Add tags to chassis/cards
- `POST /api/tags/remove` - Remove tags from chassis/cards

### Logs
- `POST /api/logs/collect` - Collect logs from chassis

### Health
- `GET /health` - Health check endpoint

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Application Settings
PORT=3000
DEBUG=False
HOST=0.0.0.0

# Database
DATABASE_PATH=inventory.db

# CORS Settings
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Polling Intervals (seconds)
CHASSIS_POLL_INTERVAL=60
CARDS_POLL_INTERVAL=60
PORTS_POLL_INTERVAL=60
SENSORS_POLL_INTERVAL=60
PERF_POLL_INTERVAL=60
LICENSING_POLL_INTERVAL=120
DATA_PURGE_INTERVAL=86400
```

### Chassis Configuration

Upload chassis configuration via the Config page or API:

**CSV Format:**
```
ADD,192.168.1.100,admin,password
ADD,192.168.1.101,admin,password
DELETE,192.168.1.100,admin,password
```

**Operations:**
- `ADD` - Add a new chassis
- `DELETE` - Remove a chassis
- `UPDATE` - Update chassis credentials

## Project Structure

```
ixiaInventoryExplorer/
├── main.py                 # FastAPI application entry point
├── app/
│   ├── api/               # API route handlers
│   ├── models/            # Pydantic models
│   ├── database.py        # Async database utilities
│   └── static/            # Static files
├── src/                   # React frontend
│   ├── components/        # React components
│   ├── pages/            # Page components
│   ├── hooks/            # Custom hooks
│   └── lib/              # Utilities
├── docs/                  # Documentation
│   ├── PROJECT_STRUCTURE.md
│   └── DOCKER_DEPLOYMENT.md
└── requirements.txt       # Python dependencies
```

For detailed project structure, see [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)

## Docker Deployment

For detailed Docker build and deployment instructions, see [docs/DOCKER_DEPLOYMENT.md](docs/DOCKER_DEPLOYMENT.md)

**Quick Docker Commands:**

```bash
# Build for Linux AMD64
docker build --platform linux/amd64 -t ixia-inventory-explorer:latest .

# Run container
docker run -d -p 3000:3000 -v ixia-data:/python-docker ixia-inventory-explorer:latest

# View logs
docker logs -f ixia-explorer

# Stop container
docker stop ixia-explorer
```

## Background Polling

The application includes background polling services for automatic data collection:

```bash
# Start polling processes
python data_poller.py --category=chassis --interval=60 &
python data_poller.py --category=cards --interval=60 &
python data_poller.py --category=ports --interval=60 &
python data_poller.py --category=sensors --interval=60 &
python data_poller.py --category=perf --interval=60 &
python data_poller.py --category=licensing --interval=120 &
```

Or use the Settings page in the UI to configure polling intervals.

## Development

### Running Tests

See [TESTING.md](TESTING.md) for testing guidelines.

### Building for Production

**Frontend:**
```bash
npm run build
```

**Backend:**
The FastAPI application is ready for production. Use a production ASGI server:

```bash
uvicorn main:app --host 0.0.0.0 --port 3000 --workers 4
```

## Migration from Flask

This application has been migrated from Flask to FastAPI. Key changes:

- ✅ Async/await database operations
- ✅ Pydantic models for request/response validation
- ✅ Modern React frontend with Vite
- ✅ Improved API documentation (Swagger/ReDoc)
- ✅ Better type safety and error handling

## Troubleshooting

### Backend Issues

- **Port already in use**: Change port in `.env` or use `-p` flag
- **Database errors**: Run `python init_db.py` to recreate database
- **Import errors**: Ensure virtual environment is activated

### Frontend Issues

- **API connection errors**: Verify backend is running and CORS is configured
- **Build errors**: Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`

### Docker Issues

- **Build failures**: Check Dockerfile syntax and dependencies
- **Container won't start**: Check logs: `docker logs ixia-explorer`
- **Permission errors**: Ensure volumes have correct permissions

## REST API References

Ixia Chassis REST API documentation:
- `https://(chassisIp)/chassis/swagger/index.html`
- `https://(chassisIp)/platform/swagger/index.html`

Open IxOS APIs: https://github.com/OpenIxia/IxOS/tree/master/Utilities/Python

## Contributing

This project is maintained by Keysight Technologies. For feedback or issues, please contact: ashwin.joshi@keysight.com

## License

See [LICENSE](LICENSE) file for details.

## Disclaimer

This Python-based tool is provided as-is, without any warranty or guarantee of fitness for any particular purpose. The authors provide no support for feature requests, bug fixes, or modifications. However, users are welcome to modify the code for their own use.

## Version History

- **v2.0.0** - Migrated to FastAPI with React frontend
- **v1.0.0** - Original Flask-based version
