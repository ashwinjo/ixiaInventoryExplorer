# IxNetwork API Server Inventory Feature

This document describes the implementation of the IxNetwork API Server inventory management feature.

## Overview

The IxNetwork API Server Configuration feature allows users to track and manage IxNetwork Client Instances (API Servers) alongside the existing Ixia Chassis inventory.

## Architecture

The feature follows the same pattern as chassis management:

1. **Credentials Table** (`ixnetwork_user_db`) - Stores API server credentials
2. **Details Table** (`ixnetwork_api_server_details`) - Stores polled data from API servers

### Workflow

```
User adds credentials → ixnetwork_user_db → Poller reads credentials → 
Queries IxNetwork instances → Stores data in ixnetwork_api_server_details
```

## Database Schema

### Table: `ixnetwork_user_db`

Stores credentials for IxNetwork API Servers (JSON format, similar to `user_db` for chassis).

```sql
CREATE TABLE IF NOT EXISTS ixnetwork_user_db (
    ixnetwork_servers_json TEXT
);
```

JSON Structure:
```json
[
  {
    "ip": "192.168.1.200",
    "username": "admin",
    "password": "admin"
  }
]
```

### Table: `ixnetwork_api_server_details`

Stores polled data from IxNetwork API Servers.

```sql
CREATE TABLE IF NOT EXISTS ixnetwork_api_server_details (
    ixnetwork_api_server_ip VARCHAR(255) NOT NULL,
    ixnetwork_api_server_type TEXT,
    ixnetwork_api_server_sessions TEXT,
    ixnetwork_api_server_running_sessions TEXT,
    ixnetwork_api_server_idle_sessions TEXT,
    lastUpdatedAt_UTC TEXT
);
```

| Column | Description |
|--------|-------------|
| `ixnetwork_api_server_ip` | IP address of the API Server |
| `ixnetwork_api_server_type` | Type of server (Linux/Windows) |
| `ixnetwork_api_server_sessions` | Total number of sessions |
| `ixnetwork_api_server_running_sessions` | Number of running sessions |
| `ixnetwork_api_server_idle_sessions` | Number of idle sessions |
| `lastUpdatedAt_UTC` | Last update timestamp |

## API Endpoints

### Credentials Management

#### GET `/api/config/ixnetwork-servers`
Returns a list of all configured IxNetwork API Servers (without passwords).

**Response:**
```json
{
  "api_servers": [
    {"ip": "192.168.1.200", "username": "admin"},
    {"ip": "192.168.1.201", "username": "admin"}
  ],
  "count": 2
}
```

#### GET `/api/config/ixnetwork-credentials`
Returns full credentials including passwords (for internal use/MCP servers).

**Response:**
```json
{
  "success": true,
  "count": 2,
  "credentials": [
    {"ip": "192.168.1.200", "username": "admin", "password": "admin"},
    {"ip": "192.168.1.201", "username": "admin", "password": "admin"}
  ]
}
```

#### POST `/api/config/ixnetwork-servers/upload`
Add, delete, or update API Server credentials.

**Request Body:**
```json
{
  "text": "ADD,192.168.1.200,admin,admin\nADD,192.168.1.201,admin,admin\nDELETE,192.168.1.202,admin,admin"
}
```

**Response:**
```json
{
  "message": "IxNetwork API Server configuration uploaded successfully",
  "success": true
}
```

### Polled Data

#### GET `/api/config/ixnetwork-server-details`
Returns polled IxNetwork API Server session details.

**Response:**
```json
{
  "servers": [
    {
      "ixnetwork_api_server_ip": "192.168.1.200",
      "ixnetwork_api_server_type": "Linux",
      "ixnetwork_api_server_sessions": "10",
      "ixnetwork_api_server_running_sessions": "5",
      "ixnetwork_api_server_idle_sessions": "5",
      "lastUpdatedAt_UTC": "2024-01-01 12:00:00"
    }
  ],
  "count": 1
}
```

## Configuration Format

The configuration uses CSV format (same as chassis):

```
operation,ip,username,password
```

### Operations
| Operation | Description |
|-----------|-------------|
| `ADD` | Add a new API Server with credentials |
| `DELETE` | Remove an API Server |
| `UPDATE` | Update credentials for existing API Server |

### Examples
```
ADD,192.168.1.200,admin,admin
ADD,192.168.1.201,admin,admin
UPDATE,192.168.1.200,admin,newpassword
DELETE,192.168.1.201,admin,admin
```

## Files Modified

| File | Changes |
|------|---------|
| `db_queries.py` | Added `create_ixnetwork_user_db_table` and `create_ixnetwork_api_server_details_table` |
| `init_db.py` | Added table creation calls and updated `delete_table()` |
| `app/database.py` | Added credential and data management functions |
| `app/models/config.py` | Added Pydantic models for credentials and server details |
| `app/api/config.py` | Added endpoints for credentials and polled data |
| `src/lib/api/endpoints.js` | Added frontend API functions |
| `src/pages/ConfigPage.jsx` | Updated UI to use credentials format |

## Database Functions

### Credential Management (`ixnetwork_user_db`)

| Function | Description |
|----------|-------------|
| `write_ixnetwork_credentials_to_database(str)` | Write credentials to database |
| `read_ixnetwork_credentials_from_database()` | Read credentials from database |
| `create_ixnetwork_config_dict(str)` | Process ADD/DELETE/UPDATE operations |
| `is_ixnetwork_input_in_correct_format(str)` | Validate input format |

### Data Management (`ixnetwork_api_server_details`)

| Function | Description |
|----------|-------------|
| `write_ixnetwork_server_details_to_database(List[Dict])` | Write polled data |
| `read_ixnetwork_server_details_from_database()` | Read polled data |

## UI Location

The API Server configuration section is located on the **Config Page** (`/config`), positioned between:
- Chassis Configuration section (above)
- Polling Settings section (below)

The section features:
- Purple-themed styling to differentiate from the cyan-themed chassis config
- Textarea for CSV input with credentials (operation,ip,username,password)
- Upload, Load Example, and Clear buttons
- Format reference card with examples
- Support for ADD, DELETE, and UPDATE operations

## Poller Implementation

The IxNetwork API Server poller follows the same pattern as the chassis poller.

### Poller Functions

| Function | Description |
|----------|-------------|
| `fetch_ixnetwork_server_for_one(server, retry_count)` | Fetch session data for single server with retry logic |
| `get_ixnetwork_server_data()` | Main async function to poll all IxNetwork servers |

### Running the Poller

```bash
# Run IxNetwork poller with default interval (60 seconds)
python data_poller.py --category ixnetwork

# Run with custom interval (in seconds)
python data_poller.py --category ixnetwork --interval 120
```

### Poller Categories

The `data_poller.py` now supports the following categories:

| Category | Description | Default Interval |
|----------|-------------|------------------|
| `chassis` | Chassis summary data | 60s |
| `cards` | Card details | 120s |
| `ports` | Port details | 120s |
| `licensing` | License information | 300s |
| `sensors` | Sensor data | 180s |
| `perf` | Performance metrics | 60s |
| `data_purge` | Clean old data | 86400s (24h) |
| `ixnetwork` | IxNetwork API server sessions | 60s |

### REST API Methods

The `IxNetworkRestAPICaller.py` provides:

| Method | Description |
|--------|-------------|
| `IxNRestSessions.get_sessions()` | Get all sessions from API server |
| `IxNRestSessions.get_server_info()` | Get server reachability info |
| `get_ixnetwork_session_summary(session, server_ip)` | Get session statistics |

### Session States

The poller categorizes sessions based on their state:

| State | Category |
|-------|----------|
| `ACTIVE`, `RUNNING`, `IN_PROGRESS` | Running sessions |
| `STOPPED`, `IDLE`, `INITIAL` | Idle sessions |
| Other states | Counted as idle |

## Usage Notes

1. **Credentials are required** - API servers require username/password for authentication to query session data.

2. **Polling workflow** - The poller reads credentials from `ixnetwork_user_db`, connects to each IxNetwork API server, and stores session information in `ixnetwork_api_server_details`.

3. **Session tracking** - The polled data includes:
   - Total sessions on the API server
   - Running sessions (active traffic)
   - Idle sessions (available for use)

4. **Retry Logic** - The poller includes retry logic with exponential backoff (3 attempts by default).

5. **Reset Database** - The reset functionality will clear both `ixnetwork_user_db` and `ixnetwork_api_server_details` tables.

## Files Modified for Poller

| File | Changes |
|------|---------|
| `IxNetworkRestAPICaller.py` | Added `get_sessions()`, `get_server_info()`, `get_ixnetwork_session_summary()` |
| `data_poller.py` | Added `fetch_ixnetwork_server_for_one()`, `get_ixnetwork_server_data()`, updated `categoryToFuntionMap` |

## Future Enhancements

- [x] Add IxNetwork API Server poller (similar to chassis poller)
- [ ] Create dedicated IxNetwork Servers page to display session details
- [ ] Add session-level details (owner, configuration, ports used)
- [ ] Add support for session lifecycle management
