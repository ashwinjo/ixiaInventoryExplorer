#!/bin/bash

# Initialize database if it doesn't exist
if [ ! -f "inventory.db" ]; then
    echo "Initializing database..."
    python3 init_db.py
fi

# Start background polling processes
echo "Starting background polling processes..."
python3 data_poller.py --category=chassis &
sleep 15
python3 data_poller.py --category=cards &
python3 data_poller.py --category=ports &
python3 data_poller.py --category=licensing --interval=120 &

# Start FastAPI application
echo "Starting FastAPI application..."
python3 -m uvicorn main:app --host 0.0.0.0 --port 3000
