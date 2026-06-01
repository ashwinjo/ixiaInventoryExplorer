#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Docker Rebuild Script - Ixia Inventory Explorer
# =============================================================================
# Checks and installs prerequisites, then rebuilds and starts containers.
# Supports: macOS (Docker Desktop), Ubuntu, WSL2 (Docker Desktop or native)
#
# Usage:
#   ./docker-rebuild.sh
#   ./docker-rebuild.sh --no-cache   # Force rebuild without layer cache
# =============================================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Set to "sudo" after a fresh Docker install so remaining calls use sudo
# (group membership not effective until next login)
DOCKER_SUDO=""

# =============================================================================
# Helpers
# =============================================================================

# Wrapper: all docker compose calls go through here so sudo is applied if needed
dc() {
    if [[ -n "$DOCKER_SUDO" ]]; then
        sudo docker compose "$@"
    else
        docker compose "$@"
    fi
}

# Check if systemd is PID 1 (not always true in WSL)
is_systemd_running() {
    [[ "$(ps --no-headers -o comm 1 2>/dev/null)" == "systemd" ]]
}

# Guard: apt-get may not exist on non-Debian Linux
require_apt() {
    if ! command -v apt-get &>/dev/null; then
        echo -e "${RED}[ERROR]${NC} apt-get not found."
        echo "Auto-install only supports Debian/Ubuntu-based systems."
        echo "Install Docker manually: https://docs.docker.com/get-docker/"
        exit 1
    fi
}

# =============================================================================
# OS Detection
# =============================================================================

detect_os() {
    case "$(uname -s)" in
        Darwin)
            echo "macos"
            ;;
        Linux)
            if grep -qi microsoft /proc/version 2>/dev/null; then
                echo "wsl"
            else
                echo "linux"
            fi
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

OS=$(detect_os)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_DIR="$(cd "$SCRIPT_DIR/../ixia-inventory-management-mcp" 2>/dev/null && pwd || true)"

# =============================================================================
# Prerequisite: sudo available (Linux/WSL only)
# =============================================================================

check_sudo() {
    if [[ "$OS" == "linux" || "$OS" == "wsl" ]]; then
        if [[ "$EUID" -ne 0 ]] && ! command -v sudo &>/dev/null; then
            echo -e "${RED}[ERROR]${NC} Not root and sudo not found. Cannot install packages."
            exit 1
        fi
    fi
}

# =============================================================================
# Prerequisite: curl
# =============================================================================

check_install_curl() {
    if command -v curl &>/dev/null; then
        echo -e "${GREEN}[OK]${NC} curl $(curl --version | head -1 | awk '{print $2}')"
        return
    fi

    echo -e "${YELLOW}[INSTALL]${NC} curl not found - installing..."
    case "$OS" in
        macos)
            if ! command -v brew &>/dev/null; then
                echo -e "${RED}[ERROR]${NC} Homebrew not found. Install it: https://brew.sh"
                exit 1
            fi
            brew install curl
            ;;
        linux|wsl)
            require_apt
            sudo apt-get update -qq && sudo apt-get install -y -q curl
            ;;
        *)
            echo -e "${RED}[ERROR]${NC} Cannot auto-install curl on this OS."
            exit 1
            ;;
    esac
    echo -e "${GREEN}[OK]${NC} curl installed"
}

# =============================================================================
# Prerequisite: Docker daemon
# =============================================================================

start_docker_daemon() {
    # Try systemctl first (works when systemd is PID 1)
    if is_systemd_running; then
        echo "Starting Docker daemon via systemctl..."
        sudo systemctl start docker
        return
    fi

    # WSL without systemd: try 'service' command (SysV init wrapper)
    if command -v service &>/dev/null; then
        echo "Starting Docker daemon via service..."
        sudo service docker start
        return
    fi

    echo -e "${RED}[ERROR]${NC} Cannot start Docker: neither systemd nor service found."
    echo ""
    echo "WSL users: enable systemd in /etc/wsl.conf and restart WSL:"
    echo "  [boot]"
    echo "  systemd=true"
    echo ""
    echo "Or enable Docker Desktop WSL integration from Docker Desktop settings."
    exit 1
}

check_install_docker() {
    # Happy path: binary present and daemon responds
    if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
        echo -e "${GREEN}[OK]${NC} Docker $(docker --version | awk '{print $3}' | tr -d ',')"
        return
    fi

    # Binary present but daemon not responding
    if command -v docker &>/dev/null; then
        echo -e "${YELLOW}[WARN]${NC} Docker installed but daemon not running."
        case "$OS" in
            macos)
                echo -e "${RED}[ERROR]${NC} Start Docker Desktop and re-run this script."
                exit 1
                ;;
            linux|wsl)
                # WSL with Docker Desktop: socket exists via Windows-side daemon
                if [[ -S /var/run/docker.sock ]]; then
                    echo "Docker socket found (Docker Desktop integration). Checking..."
                else
                    start_docker_daemon
                fi

                # Verify daemon is now reachable
                if ! docker info &>/dev/null 2>&1; then
                    echo -e "${RED}[ERROR]${NC} Docker daemon still not responding after start attempt."
                    exit 1
                fi
                echo -e "${GREEN}[OK]${NC} Docker daemon reachable"
                return
                ;;
        esac
    fi

    # Not installed at all
    echo -e "${YELLOW}[INSTALL]${NC} Docker not found - installing..."
    case "$OS" in
        macos)
            echo -e "${RED}[ERROR]${NC} Docker Desktop must be installed manually on macOS."
            echo "Download: https://docs.docker.com/desktop/install/mac-install/"
            echo "After installing, start Docker Desktop and re-run this script."
            exit 1
            ;;
        linux|wsl)
            require_apt
            curl -fsSL https://get.docker.com | sudo sh
            if is_systemd_running; then
                sudo systemctl enable --now docker
            elif command -v service &>/dev/null; then
                sudo service docker start
            fi
            sudo usermod -aG docker "$USER"
            # Group change not effective in current shell - use sudo for this session
            DOCKER_SUDO="sudo"
            echo -e "${YELLOW}[NOTE]${NC} Added $USER to the docker group."
            echo "  Re-login or run 'newgrp docker' after this script to drop sudo requirement."
            echo -e "${GREEN}[OK]${NC} Docker installed"
            ;;
        *)
            echo -e "${RED}[ERROR]${NC} Unsupported OS. Install Docker manually: https://docs.docker.com/get-docker/"
            exit 1
            ;;
    esac
}

# =============================================================================
# Prerequisite: Docker Compose plugin
# =============================================================================

check_install_compose() {
    if ${DOCKER_SUDO:+sudo} docker compose version &>/dev/null 2>&1; then
        local ver
        ver=$(${DOCKER_SUDO:+sudo} docker compose version 2>/dev/null \
            | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
        echo -e "${GREEN}[OK]${NC} Docker Compose v${ver}"
        return
    fi

    echo -e "${YELLOW}[INSTALL]${NC} Docker Compose plugin not found - installing..."
    case "$OS" in
        macos)
            echo -e "${RED}[ERROR]${NC} Docker Compose is bundled with Docker Desktop."
            echo "Update Docker Desktop: https://docs.docker.com/desktop/"
            exit 1
            ;;
        linux|wsl)
            require_apt
            sudo apt-get update -qq && sudo apt-get install -y -q docker-compose-plugin
            echo -e "${GREEN}[OK]${NC} Docker Compose plugin installed"
            ;;
        *)
            echo -e "${RED}[ERROR]${NC} Install Docker Compose manually: https://docs.docker.com/compose/install/"
            exit 1
            ;;
    esac
}

# =============================================================================
# Guard: must run from project root
# =============================================================================

check_project_root() {
    if [[ ! -f "docker-compose.separate.yml" || ! -f "docker-compose.combined.yml" ]]; then
        echo -e "${RED}[ERROR]${NC} Compose files not found in current directory."
        echo "Run this script from the ixiaInventoryExplorer project root."
        exit 1
    fi
}

# =============================================================================
# Main
# =============================================================================

echo "============================================="
echo "Ixia Inventory Explorer - Docker Rebuild"
echo "============================================="
echo -e "${BLUE}Platform:${NC} $OS"
echo ""

echo -e "${BLUE}--- Checking Prerequisites ---${NC}"
check_project_root
check_sudo
check_install_curl
check_install_docker
check_install_compose
echo ""

# Parse flags
NO_CACHE_FLAG=""
if [[ "${1:-}" == "--no-cache" ]]; then
    NO_CACHE_FLAG="--no-cache"
    echo -e "${YELLOW}Mode: --no-cache (full rebuild, no layer cache)${NC}"
    echo ""
fi

# Step 1: Stop existing containers (ignore errors if nothing running)
echo -e "${GREEN}[1/4] Cleaning up existing containers...${NC}"
dc -f docker-compose.separate.yml down 2>/dev/null || true
dc -f docker-compose.combined.yml down 2>/dev/null || true
echo "Done"

# Step 2: Rebuild images
echo ""
echo -e "${GREEN}[2/4] Rebuilding Docker images...${NC}"
if [[ -n "$NO_CACHE_FLAG" ]]; then
    dc -f docker-compose.separate.yml build --no-cache
else
    DOCKER_BUILDKIT=1 dc -f docker-compose.separate.yml build
fi
echo "Done"

# Step 3: Start containers
echo ""
echo -e "${GREEN}[3/4] Starting containers...${NC}"
dc -f docker-compose.separate.yml up -d
echo "Done"

echo ""
echo "Waiting for services to be ready..."
sleep 5

echo ""
echo "============================================="
echo "Container Status:"
echo "============================================="
dc -f docker-compose.separate.yml ps

# Step 4: Start MCP Server
echo ""
echo -e "${GREEN}[4/4] Starting MCP Server...${NC}"
if [[ -n "$MCP_DIR" && -d "$MCP_DIR" ]]; then
    echo "Found MCP server at: $MCP_DIR"
    (cd "$MCP_DIR" && docker compose up -d --build)
    echo "Done"
else
    echo -e "${YELLOW}[SKIP]${NC} MCP server repo not found. Clone it to start automatically:"
    echo "  git clone https://github.com/ashwinjo/ixia-inventory-management-mcp ../ixia-inventory-management-mcp"
fi

echo ""
echo -e "${GREEN}Rebuild complete!${NC}"
echo ""
echo "Access points:"
echo "  Frontend:   http://localhost:5174"
echo "  Backend:    http://localhost:3001"
echo "  API Docs:   http://localhost:3001/docs"
if [[ -n "$MCP_DIR" && -d "$MCP_DIR" ]]; then
echo "  MCP Server: http://localhost:8888/mcp"
echo "  MCP Docs:   http://localhost:8888/docs"
fi
echo ""
echo "View logs:"
echo "  docker compose -f docker-compose.separate.yml logs -f"
echo ""
