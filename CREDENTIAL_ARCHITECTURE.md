# Credential Management Architecture

## Overview

This document describes the **Hybrid Credential Provider** architecture for the Ixia Inventory Explorer ecosystem. This approach ensures that all components (GUI, MCP servers, monitoring tools) can access chassis credentials from a single source of truth with automatic fallback.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Interface (Port 5173)                   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Add/Update/Delete Chassis Credentials                   │  │
│  │  POST /api/config/upload                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              FastAPI Backend (Port 8080)                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  SQLite Database (inventory.db)                          │  │
│  │  - user_db table (JSON blob of credentials)              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  API Endpoints:                                          │  │
│  │  - GET /api/config/chassis (without passwords)           │  │
│  │  - GET /api/config/credentials (with passwords) ← NEW!   │  │
│  │  - POST /api/config/upload                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Credential Provider (credential_provider.py)   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Fallback Logic:                                         │  │
│  │  1. Try API: GET /api/config/credentials                 │  │
│  │  2. If API fails → Read credentials.json                 │  │
│  │  3. If both fail → Return empty list                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Consumers                               │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ MCP Server   │  │ Data Poller  │  │ Monitoring Solution  │  │
│  │ (Port 8888)  │  │              │  │ (Future)             │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. FastAPI Backend (Single Source of Truth)

**Location**: `/Users/ashwin.joshi/ixNtrafficAsync/ixiaInventoryExplorer/`

**Database**: `inventory.db` → `user_db` table

**New API Endpoint**:
```
GET /api/config/credentials
```

**Response Format**:
```json
{
  "success": true,
  "count": 2,
  "credentials": [
    {
      "ip": "10.1.1.1",
      "username": "admin",
      "password": "secret"
    },
    {
      "ip": "10.1.1.2",
      "username": "admin",
      "password": "secret"
    }
  ]
}
```

### 2. Credential Provider (credential_provider.py)

**Purpose**: Unified credential fetching with automatic fallback

**Key Functions**:
- `get_credentials()` - Async version with API → File fallback
- `get_credentials_sync()` - Sync version (file-only)
- `get_credentials_from_api()` - Fetch from FastAPI backend
- `get_credentials_from_file()` - Fetch from local JSON file
- `save_credentials_to_file()` - Create/update fallback file

**Environment Variables**:
```bash
# API endpoint (default: http://localhost:8080)
export IXIA_API_URL="http://localhost:8080"

# Fallback file path (default: credentials.json)
export IXIA_CREDENTIALS_FILE="/path/to/credentials.json"
```

### 3. Fallback File (credentials.json)

**Format**:
```json
[
  {
    "ip": "10.1.1.1",
    "username": "admin",
    "password": "admin"
  }
]
```

**When to Use**:
- Running MCP server standalone (without GUI backend)
- Development/testing
- Backup when API is temporarily unavailable

## Usage Examples

### Example 1: MCP Server Integration

```python
# In your MCP server code
from credential_provider import get_credentials
import asyncio

async def initialize_mcp_tools():
    # Automatically tries API first, falls back to file
    credentials = await get_credentials()
    
    for cred in credentials:
        print(f"Configuring tools for chassis: {cred['ip']}")
        # Initialize your MCP tools with these credentials
        
asyncio.run(initialize_mcp_tools())
```

### Example 2: Monitoring Solution

```python
from credential_provider import get_credentials

async def start_monitoring():
    credentials = await get_credentials()
    
    for chassis in credentials:
        # Start monitoring for each chassis
        monitor = ChassisMonitor(
            ip=chassis['ip'],
            username=chassis['username'],
            password=chassis['password']
        )
        await monitor.start()
```

### Example 3: Data Poller (Already in same codebase)

```python
# Your data_poller.py can continue using the database directly
from app.database import read_username_password_from_database

# Or use the credential provider for consistency
from credential_provider import get_credentials

async def poll_chassis():
    credentials = await get_credentials()
    # Poll each chassis...
```

## Workflow Scenarios

### Scenario 1: Normal Operation (GUI + MCP)

1. User adds chassis via GUI (Port 5173)
2. GUI calls `POST /api/config/upload` → Updates SQLite
3. MCP server calls `get_credentials()`:
   - ✓ API available → Fetches from `/api/config/credentials`
   - Returns fresh credentials from database

### Scenario 2: MCP Standalone (No GUI)

1. MCP server starts without GUI backend running
2. MCP calls `get_credentials()`:
   - ✗ API unavailable (connection refused)
   - ✓ Falls back to `credentials.json`
   - Returns credentials from file

### Scenario 3: Both Sources Available

1. Both API and file exist
2. MCP calls `get_credentials()`:
   - ✓ API takes priority
   - File is ignored (but available as backup)

## Setup Instructions

### Step 1: Create Fallback File

```bash
cd /Users/ashwin.joshi/ixNtrafficAsync/ixiaInventoryExplorer

# Copy the example file
cp credentials.json.example credentials.json

# Edit with your actual credentials
nano credentials.json
```

### Step 2: Add to .gitignore

```bash
echo "credentials.json" >> .gitignore
```

### Step 3: Test the Provider

```bash
# Test with API running
python credential_provider.py

# Test with API stopped (fallback mode)
# Stop your FastAPI server first
python credential_provider.py
```

### Step 4: Integrate into Your MCP Server

```python
# At the top of your MCP server file
from credential_provider import get_credentials

# In your initialization
async def setup():
    creds = await get_credentials()
    # Use creds to configure your tools
```

## Security Considerations

### ⚠️ Important Security Notes

1. **API Endpoint Protection**: The `/api/config/credentials` endpoint exposes passwords. For production:
   - Add authentication (API key, OAuth, etc.)
   - Restrict to localhost only
   - Use HTTPS in production

2. **File Permissions**: Protect the fallback file:
   ```bash
   chmod 600 credentials.json
   ```

3. **Environment Variables**: Consider using environment variables for sensitive data:
   ```bash
   export CHASSIS_PASSWORD="secret"
   ```

4. **Encryption**: For production, consider encrypting passwords in the database and file.

## Testing

### Test API Endpoint

```bash
# Start the backend
uvicorn main:app --port 8080

# Test the endpoint
curl http://localhost:8080/api/config/credentials
```

### Test Credential Provider

```bash
# With API running
python credential_provider.py

# Expected output:
# [CredProvider] Attempting to fetch credentials...
# [CredProvider] ✓ Fetched 2 credentials from API
# Result: 2 credentials fetched
```

### Test Fallback

```bash
# Stop the API server
# Then run:
python credential_provider.py

# Expected output:
# [CredProvider] Attempting to fetch credentials...
# [CredProvider] ✗ Cannot connect to API at http://localhost:8080/api/config/credentials
# [CredProvider] Falling back to local file...
# [CredProvider] ✓ Loaded 2 credentials from file: credentials.json
# Result: 2 credentials fetched
```

## Future Enhancements

1. **Credential Caching**: Cache API responses to reduce load
2. **Auto-sync**: Periodically sync credentials from API to file
3. **Encryption**: Add encryption layer for stored credentials
4. **Audit Logging**: Track credential access and modifications
5. **Multi-source**: Support additional sources (HashiCorp Vault, AWS Secrets Manager)

## Troubleshooting

### Issue: "No credentials available from API or file"

**Solution**:
1. Check if API is running: `curl http://localhost:8080/health`
2. Verify file exists: `ls -la credentials.json`
3. Check file format: `cat credentials.json | python -m json.tool`

### Issue: "Invalid JSON in credentials.json"

**Solution**:
```bash
# Validate JSON
python -m json.tool credentials.json
```

### Issue: API timeout

**Solution**:
- Increase timeout in `credential_provider.py`:
  ```python
  API_TIMEOUT = 10.0  # Increase from 5.0
  ```

## Summary

The Hybrid Credential Provider gives you:

✅ **Single Source of Truth**: GUI database is the master  
✅ **High Availability**: Automatic fallback to local file  
✅ **Flexibility**: Run MCP standalone or with GUI  
✅ **Simplicity**: One function call to get credentials  
✅ **Future-proof**: Easy to add monitoring and other tools  

**Next Steps**:
1. ✓ API endpoint created
2. ✓ Credential provider implemented
3. ⏭ Integrate into your MCP server
4. ⏭ Create fallback file with your chassis IPs
5. ⏭ Test both modes (API + fallback)
