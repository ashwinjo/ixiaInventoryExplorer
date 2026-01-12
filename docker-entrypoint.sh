#!/bin/bash
set -e

# =====================================
# DEPLOYMENT-AGNOSTIC ENTRYPOINT
# =====================================
# Works on: Cloud Run, Docker, Kubernetes, VM, etc.
# Uses PORT environment variable (Cloud Run default: 8080)

echo "============================================="
echo "Ixia Inventory Explorer - Starting up..."
echo "============================================="
echo "Environment: ${ENVIRONMENT:-production}"
echo "Port: ${PORT:-8080}"
echo "============================================="

# Set database path from environment or use default
DB_PATH="${DATABASE_PATH:-/app/data/inventory.db}"
DB_DIR=$(dirname "$DB_PATH")

# Create database directory if it doesn't exist
mkdir -p "$DB_DIR" 2>/dev/null || true

# Change to app directory
cd /app

# Check if we should start with a clean database
if [ "${CLEAN_DB_ON_START:-false}" = "true" ]; then
    echo "[INIT] CLEAN_DB_ON_START=true - Removing existing database..."
    rm -f "$DB_PATH" "/app/inventory.db" 2>/dev/null || true
    # Also remove WAL and SHM files if they exist
    rm -f "${DB_PATH}-wal" "${DB_PATH}-shm" "/app/inventory.db-wal" "/app/inventory.db-shm" 2>/dev/null || true
    echo "[INIT] Existing database removed - starting fresh"
fi

# Initialize database if it doesn't exist
if [ ! -f "$DB_PATH" ]; then
    echo "[INIT] Initializing database at $DB_PATH..."
    # Set DATABASE_PATH environment variable for init_db.py
    export DATABASE_PATH="$DB_PATH"
    python3 /app/init_db.py
    if [ -f "/app/inventory.db" ] && [ "$DB_PATH" != "/app/inventory.db" ]; then
        mv /app/inventory.db "$DB_PATH"
        echo "[INIT] Database created and moved to $DB_PATH"
    else
        echo "[INIT] Database initialized"
    fi
    # Ensure WAL mode is set (init_db.py should have done this, but verify)
    if [ -f "$DB_PATH" ]; then
        python3 -c "
import sqlite3
conn = sqlite3.connect('$DB_PATH')
conn.execute('PRAGMA journal_mode=WAL;')
conn.commit()
conn.close()
print('[INIT] Verified WAL mode is enabled')
" 2>/dev/null || true
    fi
fi

# Create symlink for compatibility (if needed)
if [ "$DB_PATH" != "/app/inventory.db" ] && [ ! -L /app/inventory.db ]; then
    ln -sf "$DB_PATH" /app/inventory.db 2>/dev/null || true
    echo "[INIT] Created symlink: /app/inventory.db -> $DB_PATH"
fi

# Start background polling processes (only if not in minimal mode)
if [ "${MINIMAL_MODE:-false}" != "true" ]; then
    echo "[INIT] Starting background polling processes..."
python3 /app/data_poller.py --category=chassis &
CHASSIS_PID=$!
    sleep 1

python3 /app/data_poller.py --category=cards &
CARDS_PID=$!
    sleep 1

python3 /app/data_poller.py --category=ports &
PORTS_PID=$!
    sleep 1

python3 /app/data_poller.py --category=licensing &
LICENSING_PID=$!
    sleep 1

python3 /app/data_poller.py --category=perf &
PERF_PID=$!
    sleep 1

python3 /app/data_poller.py --category=sensors &
SENSORS_PID=$!
    sleep 1

python3 /app/data_poller.py --category=data_purge &
PURGE_PID=$!
    sleep 1

python3 /app/data_poller.py --category=ixnetwork &
IXNETWORK_PID=$!

    echo "[INIT] Background polling processes started"
else
    echo "[INIT] Minimal mode: Skipping background polling"
fi

# Function to handle shutdown
cleanup() {
    echo "[SHUTDOWN] Shutting down background processes..."
    kill $CHASSIS_PID $CARDS_PID $PORTS_PID $LICENSING_PID $PERF_PID $SENSORS_PID $PURGE_PID $IXNETWORK_PID 2>/dev/null || true
    wait
    exit 0
}

# Set trap for cleanup
trap cleanup SIGTERM SIGINT

echo "[INIT] Starting main application on port ${PORT:-8080}..."

# Start the main application (this will block)
exec "$@"

