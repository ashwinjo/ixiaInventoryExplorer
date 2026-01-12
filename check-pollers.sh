#!/bin/bash

# =============================================================================
# Poller Status Check Script - Ixia Inventory Explorer
# =============================================================================
# This script checks if background pollers are running and working correctly
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

CONTAINER_NAME="ixia-backend"

echo "============================================="
echo "Checking Poller Status"
echo "============================================="
echo ""

# Check if container is running
if ! docker ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}✗ Container '${CONTAINER_NAME}' is not running${NC}"
    echo ""
    echo "Start the container first:"
    echo "  docker-compose -f docker-compose.separate.yml up -d"
    exit 1
fi

echo -e "${GREEN}✓ Container '${CONTAINER_NAME}' is running${NC}"
echo ""

# Check 1: Poller processes
echo -e "${BLUE}[1] Checking for poller processes...${NC}"
POLLER_PROCESSES=$(docker exec ${CONTAINER_NAME} ps aux | grep -E "data_poller.py|python.*poll" | grep -v grep || true)

if [ -z "$POLLER_PROCESSES" ]; then
    echo -e "${RED}✗ No poller processes found${NC}"
    echo ""
    echo "Possible reasons:"
    echo "  - MINIMAL_MODE=true is set (pollers disabled)"
    echo "  - Pollers crashed and didn't restart"
    echo "  - Container just started (wait a few seconds)"
else
    echo -e "${GREEN}✓ Poller processes found:${NC}"
    echo "$POLLER_PROCESSES" | while read line; do
        echo "  $line"
    done
fi
echo ""

# Check 2: Recent poller logs
echo -e "${BLUE}[2] Checking recent poller activity in logs...${NC}"
RECENT_LOGS=$(docker logs ${CONTAINER_NAME} --tail 100 2>&1 | grep -iE "\[POLL\]|polling|chassis|cards|ports|ixnetwork" | tail -10 || true)

if [ -z "$RECENT_LOGS" ]; then
    echo -e "${YELLOW}⚠ No recent poller activity in logs${NC}"
    echo "  (This might be normal if pollers just started)"
else
    echo -e "${GREEN}✓ Recent poller activity:${NC}"
    echo "$RECENT_LOGS" | while read line; do
        echo "  $line"
    done
fi
echo ""

# Check 3: Database - Check for recent data
echo -e "${BLUE}[3] Checking database for recent data...${NC}"
if [ -f "./data/inventory.db" ]; then
    # Check if database has chassis data
    CHASSIS_COUNT=$(docker exec ${CONTAINER_NAME} python3 -c "
import sqlite3
conn = sqlite3.connect('/app/data/inventory.db')
cursor = conn.cursor()
try:
    cursor.execute('SELECT COUNT(*) FROM chassis')
    print(cursor.fetchone()[0])
except:
    print('0')
conn.close()
" 2>/dev/null || echo "0")

    if [ "$CHASSIS_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✓ Database has $CHASSIS_COUNT chassis record(s)${NC}"
        
        # Check for recent updates (within last hour)
        RECENT_UPDATES=$(docker exec ${CONTAINER_NAME} python3 -c "
import sqlite3
from datetime import datetime, timedelta
conn = sqlite3.connect('/app/data/inventory.db')
cursor = conn.cursor()
try:
    # Try to find a timestamp column (adjust based on your schema)
    cursor.execute('SELECT COUNT(*) FROM chassis WHERE rowid IN (SELECT rowid FROM chassis LIMIT 1)')
    print('1')
except:
    print('0')
conn.close()
" 2>/dev/null || echo "0")
        
        if [ "$RECENT_UPDATES" = "1" ]; then
            echo -e "${GREEN}  → Database appears to have data${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Database exists but has no chassis data${NC}"
        echo "  → Pollers may not have run yet, or no chassis configured"
    fi
else
    echo -e "${YELLOW}⚠ Database file not found at ./data/inventory.db${NC}"
fi
echo ""

# Check 4: MINIMAL_MODE setting
echo -e "${BLUE}[4] Checking MINIMAL_MODE setting...${NC}"
MINIMAL_MODE=$(docker exec ${CONTAINER_NAME} env | grep MINIMAL_MODE || echo "MINIMAL_MODE=false")
if echo "$MINIMAL_MODE" | grep -q "MINIMAL_MODE=true"; then
    echo -e "${YELLOW}⚠ MINIMAL_MODE=true - Pollers are DISABLED${NC}"
    echo "  To enable pollers, set MINIMAL_MODE=false in docker-compose file"
else
    echo -e "${GREEN}✓ MINIMAL_MODE=false - Pollers should be enabled${NC}"
fi
echo ""

# Check 5: Container startup logs
echo -e "${BLUE}[5] Checking container startup logs...${NC}"
STARTUP_LOGS=$(docker logs ${CONTAINER_NAME} 2>&1 | grep -E "\[INIT\]|Background polling|MINIMAL_MODE" | head -5 || true)

if echo "$STARTUP_LOGS" | grep -q "Skipping background polling"; then
    echo -e "${RED}✗ Pollers were skipped during startup${NC}"
elif echo "$STARTUP_LOGS" | grep -q "Background polling processes started"; then
    echo -e "${GREEN}✓ Pollers were started during container startup${NC}"
else
    echo -e "${YELLOW}⚠ Could not determine poller startup status from logs${NC}"
fi
echo ""

# Summary
echo "============================================="
echo "Summary & Recommendations"
echo "============================================="
echo ""
echo "To view live poller logs:"
echo "  docker logs -f ${CONTAINER_NAME} | grep -i poll"
echo ""
echo "To manually trigger a poll via API:"
echo "  curl -X POST http://localhost:3001/api/poll/chassis"
echo "  curl -X POST http://localhost:3001/api/poll/ixnetwork"
echo ""
echo "To check all container logs:"
echo "  docker-compose -f docker-compose.separate.yml logs -f backend"
echo ""
echo "To restart pollers (restart container):"
echo "  docker-compose -f docker-compose.separate.yml restart backend"
echo ""

