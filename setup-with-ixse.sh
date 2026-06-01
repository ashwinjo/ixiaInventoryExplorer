#!/usr/bin/env bash
# =============================================================================
# setup-with-ixse.sh
#
# Sets up ixiaInventoryExplorer + IxNetworkSessionExplorer sidecar together.
#
# Expects both repos as siblings:
#   parent/
#     ixiaInventoryExplorer/      ← run this script from here
#     IxNetworkSessionExplorer/
#
# Usage:
#   ./setup-with-ixse.sh              # normal build + start
#   ./setup-with-ixse.sh --no-cache   # force full Docker rebuild
#   ./setup-with-ixse.sh --down       # stop and remove everything
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IXSE_BACKEND_DIR="$(cd "$SCRIPT_DIR/../IxNetworkSessionExplorer/backend" 2>/dev/null && pwd || true)"
COMPOSE_FILE="docker-compose.combined.yml"

# ── colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; }
ok()   { echo -e "${GREEN}[ OK ]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
info() { echo -e "${CYAN}[INFO]${NC} $*"; }
die()  { err "$*"; exit 1; }

# ── --down shortcut ───────────────────────────────────────────────────────────
if [[ "${1:-}" == "--down" ]]; then
    echo -e "${BOLD}Stopping stack...${NC}"
    cd "$SCRIPT_DIR"
    docker compose -f "$COMPOSE_FILE" down
    ok "Stack stopped."
    exit 0
fi

NO_CACHE=""
[[ "${1:-}" == "--no-cache" ]] && NO_CACHE="--no-cache"

# =============================================================================
# STEP 1 — Prerequisites
# =============================================================================
echo ""
echo -e "${BOLD}[1/6] Checking prerequisites...${NC}"

command -v docker &>/dev/null || die "docker not found. Install Docker Desktop first."

# Require Docker Compose v2 (plugin form: 'docker compose')
if ! docker compose version &>/dev/null; then
    die "'docker compose' (v2 plugin) not found. Update Docker Desktop or install the Compose plugin."
fi

ok "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
ok "Docker Compose $(docker compose version --short)"

# =============================================================================
# STEP 2 — Repo structure check
# =============================================================================
echo ""
echo -e "${BOLD}[2/6] Checking repo structure...${NC}"

[[ -d "$SCRIPT_DIR" ]] || die "Cannot resolve ixiaInventoryExplorer dir: $SCRIPT_DIR"

if [[ -z "$IXSE_BACKEND_DIR" || ! -d "$IXSE_BACKEND_DIR" ]]; then
    die "IxNetworkSessionExplorer/backend not found at: $SCRIPT_DIR/../IxNetworkSessionExplorer/backend
    Both repos must be siblings. Clone IxNetworkSessionExplorer next to ixiaInventoryExplorer."
fi

ok "ixiaInventoryExplorer:        $SCRIPT_DIR"
ok "IxNetworkSessionExplorer:     $IXSE_BACKEND_DIR"

# =============================================================================
# STEP 3 — ixse_config.yaml
# =============================================================================
echo ""
echo -e "${BOLD}[3/6] Checking IxNSE config (ixse_config.yaml)...${NC}"

IXSE_CONFIG="$IXSE_BACKEND_DIR/ixse_config.yaml"
IXSE_EXAMPLE="$IXSE_BACKEND_DIR/ixse_config.yaml.example"

if [[ ! -f "$IXSE_CONFIG" ]]; then
    if [[ ! -f "$IXSE_EXAMPLE" ]]; then
        die "Neither ixse_config.yaml nor ixse_config.yaml.example found in $IXSE_BACKEND_DIR"
    fi
    warn "ixse_config.yaml not found. Copying from example..."
    cp "$IXSE_EXAMPLE" "$IXSE_CONFIG"
    echo ""
    echo -e "${YELLOW}  ┌─────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${YELLOW}  │  ACTION REQUIRED: edit $IXSE_CONFIG  │${NC}"
    echo -e "${YELLOW}  │                                                                 │${NC}"
    echo -e "${YELLOW}  │  Set the host/username for each IxNetwork server.              │${NC}"
    echo -e "${YELLOW}  │  Passwords go in .env (IXNET_PASSWORD / IXOS_PASSWORD).        │${NC}"
    echo -e "${YELLOW}  └─────────────────────────────────────────────────────────────────┘${NC}"
    echo ""
    read -rp "  Press ENTER after editing ixse_config.yaml, or Ctrl-C to abort: "
fi

# Warn if config still contains placeholder host
if grep -q "10.1.1.100" "$IXSE_CONFIG" 2>/dev/null; then
    warn "ixse_config.yaml still has placeholder host (10.1.1.100). Update it with your IxNetwork server IP."
fi

ok "ixse_config.yaml: $IXSE_CONFIG"

# =============================================================================
# STEP 4 — .env / credentials
# =============================================================================
echo ""
echo -e "${BOLD}[4/6] Checking .env and credentials...${NC}"

ENV_FILE="$SCRIPT_DIR/.env"
ENV_EXAMPLE="$SCRIPT_DIR/.env.example"

if [[ ! -f "$ENV_FILE" ]]; then
    if [[ ! -f "$ENV_EXAMPLE" ]]; then
        die ".env.example not found in $SCRIPT_DIR"
    fi
    warn ".env not found. Copying from .env.example..."
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    echo ""
    echo -e "${YELLOW}  ┌─────────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${YELLOW}  │  ACTION REQUIRED: edit $ENV_FILE              │${NC}"
    echo -e "${YELLOW}  │                                                                 │${NC}"
    echo -e "${YELLOW}  │  Set IXNET_PASSWORD (required)                                 │${NC}"
    echo -e "${YELLOW}  │  Set IXOS_PASSWORD  (required if monitoring IxOS chassis)      │${NC}"
    echo -e "${YELLOW}  └─────────────────────────────────────────────────────────────────┘${NC}"
    echo ""
    read -rp "  Press ENTER after editing .env, or Ctrl-C to abort: "
fi

# Source .env so we can inspect variables
set -a; source "$ENV_FILE"; set +a

# IXNET_PASSWORD must be set (non-empty) — either from .env or shell environment
if [[ -z "${IXNET_PASSWORD:-}" ]]; then
    die "IXNET_PASSWORD is not set. Add it to $ENV_FILE or export it in your shell."
fi

ok "IXNET_PASSWORD: set"
[[ -n "${IXOS_PASSWORD:-}" ]] && ok "IXOS_PASSWORD: set" || warn "IXOS_PASSWORD: not set (OK if no IxOS chassis configured)"

# =============================================================================
# STEP 5 — Build
# =============================================================================
echo ""
echo -e "${BOLD}[5/6] Building Docker images...${NC}"
[[ -n "$NO_CACHE" ]] && info "Using --no-cache (full rebuild)"

# IxNSE Dockerfile has: COPY vendor/ /vendor/
# Docker fails if the directory is completely absent on the host.
# Create it if empty — the Dockerfile handles empty vendor/ gracefully.
VENDOR_DIR="$IXSE_BACKEND_DIR/vendor"
if [[ ! -d "$VENDOR_DIR" ]]; then
    info "Creating $VENDOR_DIR/ (required by IxNSE Dockerfile COPY instruction)"
    mkdir -p "$VENDOR_DIR"
fi

cd "$SCRIPT_DIR"

docker compose -f "$COMPOSE_FILE" build $NO_CACHE

ok "Images built."

# =============================================================================
# STEP 6 — Start + health wait
# =============================================================================
echo ""
echo -e "${BOLD}[6/6] Starting stack...${NC}"

docker compose -f "$COMPOSE_FILE" up -d

# Wait for all containers to become healthy (max 120s)
echo ""
info "Waiting for services to become healthy (max 120s)..."

TIMEOUT=120
ELAPSED=0
POLL=5

while true; do
    # Count containers not yet in 'healthy' state
    UNHEALTHY=$(docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null \
        | python3 -c "
import sys, json
data = sys.stdin.read().strip()
# docker compose ps --format json emits one JSON object per line (not an array)
lines = [l for l in data.splitlines() if l.strip()]
states = []
for line in lines:
    try:
        obj = json.loads(line)
        states.append(obj.get('Health', obj.get('State', 'unknown')))
    except Exception:
        pass
not_healthy = [s for s in states if s not in ('healthy', '')]
print(len(not_healthy))
" 2>/dev/null || echo "0")

    if [[ "$UNHEALTHY" -eq 0 ]]; then
        break
    fi

    if [[ "$ELAPSED" -ge "$TIMEOUT" ]]; then
        warn "Timed out waiting for healthy status. Showing container state:"
        docker compose -f "$COMPOSE_FILE" ps
        echo ""
        warn "Check logs: docker compose -f $COMPOSE_FILE logs"
        exit 1
    fi

    echo -n "."
    sleep "$POLL"
    ELAPSED=$((ELAPSED + POLL))
done

echo ""

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${BOLD}=============================================${NC}"
echo -e "${GREEN}${BOLD}  Stack is up and healthy!${NC}"
echo -e "${BOLD}=============================================${NC}"
echo ""
docker compose -f "$COMPOSE_FILE" ps
echo ""
echo -e "  ${BOLD}Main app:${NC}        http://localhost:${PORT:-8080}"
echo -e "  ${BOLD}API docs:${NC}        http://localhost:${PORT:-8080}/docs"
echo -e "  ${BOLD}IxSE proxy:${NC}      http://localhost:${PORT:-8080}/api/ixse/sessions"
echo -e "  ${BOLD}Prometheus:${NC}      (internal) ixse-backend:8080/metrics"
echo ""
echo -e "  Logs:   docker compose -f $COMPOSE_FILE logs -f"
echo -e "  Stop:   $0 --down"
echo ""
