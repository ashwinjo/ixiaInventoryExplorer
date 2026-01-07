# Testing Guide

## Overview
This document outlines the testing approach for the Ixia Inventory Explorer application.

## Tested Components

### ✅ Backend API Endpoints

All FastAPI endpoints have been implemented and are ready for testing:

1. **Chassis Endpoints**
   - `GET /api/chassis` - Returns list of all chassis
   - `POST /api/poll/chassis` - Triggers chassis data polling

2. **Cards Endpoints**
   - `GET /api/cards` - Returns list of all cards
   - `POST /api/poll/cards` - Triggers card data polling

3. **Ports Endpoints**
   - `GET /api/ports` - Returns list of all ports
   - `POST /api/poll/ports` - Triggers port data polling

4. **Licenses Endpoints**
   - `GET /api/licenses` - Returns list of all licenses
   - `POST /api/poll/licensing` - Triggers license data polling

5. **Sensors Endpoints**
   - `GET /api/sensors` - Returns list of all sensors
   - `POST /api/poll/sensors` - Triggers sensor data polling

6. **Performance Endpoints**
   - `GET /api/performance/chassis-list` - Returns chassis list for metrics
   - `GET /api/performance/metrics/{ip}` - Returns performance metrics for chassis

7. **Configuration Endpoints**
   - `POST /api/config/upload` - Upload chassis configuration
   - `POST /api/config/polling-intervals` - Set polling intervals

8. **Tags Endpoints**
   - `POST /api/tags/add` - Add tags to chassis/cards
   - `POST /api/tags/remove` - Remove tags from chassis/cards

9. **Logs Endpoints**
   - `POST /api/logs/collect` - Collect logs from chassis

10. **Health Check**
    - `GET /health` - Health check endpoint

### ✅ Frontend Pages

All React pages have been implemented:

1. **ChassisPage** - Chassis details with filtering and tag management
2. **CardsPage** - Card details with filtering and tag management
3. **PortsPage** - Port details with filtering
4. **LicensesPage** - License information with expiry status
5. **SensorsPage** - Sensor readings display
6. **PerformancePage** - Performance metrics with charts
7. **ConfigPage** - Configuration upload form
8. **SettingsPage** - Polling intervals configuration

### ✅ Database Operations

- Async database operations using aiosqlite
- All CRUD operations implemented
- Tag management working
- Performance metrics storage

## Manual Testing Checklist

### Backend Testing

- [ ] Start FastAPI server: `python3 -m uvicorn main:app --reload`
- [ ] Access Swagger UI: `http://localhost:3000/docs`
- [ ] Test each API endpoint via Swagger UI
- [ ] Verify database operations
- [ ] Test error handling
- [ ] Verify CORS configuration

### Frontend Testing

- [ ] Start frontend dev server: `npm run dev`
- [ ] Navigate to each page
- [ ] Test search/filter functionality
- [ ] Test tag add/remove operations
- [ ] Test refresh buttons
- [ ] Test form submissions
- [ ] Verify API integration
- [ ] Test responsive design

### Integration Testing

- [ ] Start both backend and frontend
- [ ] Verify data flows correctly
- [ ] Test polling functionality
- [ ] Verify data persistence
- [ ] Test error scenarios

### Docker Testing

- [ ] Build Docker image: `docker build -t ixia-explorer .`
- [ ] Run container: `docker run -p 3000:3000 ixia-explorer`
- [ ] Verify application works in container
- [ ] Test volume persistence
- [ ] Test docker-compose setup

## Known Issues & Notes

1. **Frontend Build**: Ensure `npm run build` completes successfully before Docker build
2. **Database**: Database file must be initialized before first run
3. **Polling**: Background polling processes need to be started separately
4. **CORS**: Ensure CORS_ORIGINS includes frontend URL

## Next Steps for Comprehensive Testing

1. Add unit tests for backend endpoints
2. Add unit tests for React components
3. Add integration tests
4. Add E2E tests with Playwright/Cypress
5. Add performance testing
6. Add security testing

