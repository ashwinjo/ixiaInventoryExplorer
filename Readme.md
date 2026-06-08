# Ixia Inventory Explorer v2.0

Web app for managing Ixia chassis inventory. FastAPI backend + React frontend.

**Stack:** Python 3.11 / FastAPI / SQLite | React 18 / Vite / Tailwind / shadcn/ui | Docker

---

## Quick Start

### Docker (recommended)

```bash
./docker-rebuild.sh
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5174 |
| Backend API | http://localhost:3001 |
| API Docs (Swagger) | http://localhost:3001/docs |

```bash
# Stop
docker-compose -f docker-compose.separate.yml down

# Rebuild without cache
./docker-rebuild.sh --no-cache

# Fresh database
CLEAN_DB_ON_START=true docker-compose -f docker-compose.separate.yml up -d
```

**Separate vs combined containers:**
- `docker-compose.separate.yml` — frontend (5174) + backend (3001), hot reload, dev use
- `docker-compose.combined.yml` — single container on port 8080, production use

### Local Development

```bash
# Backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python init_db.py
uvicorn main:app --reload --host 0.0.0.0 --port 3001

# Frontend
npm install && npm run dev
```

---

## Configuration

`.env` file (all optional):

```env
PORT=3001
DATABASE_PATH=./data/inventory.db
CORS_ORIGINS=*
ADK_URL=http://host.docker.internal:8000
CLEAN_DB_ON_START=false

# Polling intervals (seconds) — defaults shown
CHASSIS_POLL_INTERVAL=60
CARDS_POLL_INTERVAL=120
PORTS_POLL_INTERVAL=120
SENSORS_POLL_INTERVAL=180
PERF_POLL_INTERVAL=60
LICENSING_POLL_INTERVAL=300
DATA_PURGE_INTERVAL=86400
IXNETWORK_POLL_INTERVAL=60
```

Override intervals at runtime via Config page in UI or `POST /api/config/polling-intervals` (all 7 fields required: `chassis`, `cards`, `ports`, `sensors`, `licensing`, `perf`, `purge`).

### Chassis Configuration

Upload via Config page or `POST /api/config/upload`. CSV format:

```csv
ADD,192.168.1.100,admin,password
DELETE,192.168.1.101,admin,password
```

---

## API Endpoints

| Resource | GET | POST (poll) |
|----------|-----|-------------|
| Chassis | `/api/chassis` | `/api/poll/chassis` |
| Cards | `/api/cards` | `/api/poll/cards` |
| Ports | `/api/ports` | `/api/poll/ports` |
| Licenses | `/api/licenses` | `/api/poll/licensing` |
| Sensors | `/api/sensors` | `/api/poll/sensors` |
| IxNetwork | `/api/ixnetwork` | `/api/poll/ixnetwork` |
| Performance | `/api/performance/metrics/{ip}` | — |
| Health | `/health` | — |

Other: `POST /api/tags/add`, `POST /api/tags/remove`, `POST /api/logs/collect`

---

## Project Structure

```
ixiaInventoryExplorer/
├── main.py                      # FastAPI entry point
├── app/
│   ├── api/                     # Route handlers
│   ├── models/                  # Pydantic models
│   └── database.py              # Async DB utilities
├── src/                         # React frontend
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   └── lib/
├── data/                        # SQLite DB (created on first run)
├── docker-compose.separate.yml
├── docker-compose.combined.yml
├── docker-rebuild.sh
└── requirements.txt
```

---

## Troubleshooting

**Port in use:** `BACKEND_PORT=9000 docker-compose -f docker-compose.separate.yml up -d`

**Database errors:** `rm -rf data/ && docker-compose -f docker-compose.separate.yml up -d`

**DB locking:** Check poller logs: `docker logs ixia-backend | grep -i "\[DB\]"`

**Frontend can't reach API:** `curl http://localhost:3001/health` — check `VITE_BACKEND_URL` and CORS config.

**Poller status:**
```bash
./check-pollers.sh
# or
docker exec ixia-backend ps aux | grep data_poller
docker logs ixia-backend | grep -i "\[POLL\]"
```

**ADK chat not working:** Verify ADK agent on port 8000, check `ADK_URL` env var.

---

## References

- Chassis REST API: `https://<chassisIp>/chassis/swagger/index.html`
- [IxOS Python Utilities](https://github.com/OpenIxia/IxOS/tree/master/Utilities/Python)
- [Docker Deployment Guide](docs/DOCKER_DEPLOYMENT_GUIDE.md)
- [ADK Configuration](ADK_CONFIGURATION.md)

---

Maintained by Keysight Technologies — ashwin.joshi@keysight.com | See [LICENSE](LICENSE)
