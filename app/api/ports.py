"""
Ports API endpoints
"""
import asyncio
import json
import os
from fastapi import APIRouter, HTTPException
import httpx
from app.models.ports import PortResponse, PortListResponse, ReleaseOwnershipRequest, ReleaseOwnershipResponse
from app.database import read_data_from_database, read_username_password_from_database
from RestApi.IxOSRestInterface import IxRestSession

router = APIRouter(prefix="/api/ports", tags=["ports"])

SESSIONS_URL = os.getenv("SESSIONS_URL", "http://host.docker.internal:8080/sessions/")


async def _build_session_map() -> dict:
    """Fetch /sessions/ once and return (chassis_ip, card_int, port_int) -> session_name.
    Returns empty dict on any failure so callers gracefully fall back to 'NA'."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(SESSIONS_URL)
            resp.raise_for_status()
            data = resp.json()
        session_map = {}
        for server in data.get("data", {}).get("servers", []):
            server_host = server.get("host", server.get("name", ""))
            for session in server.get("sessions", []):
                session_name = session.get("name", "")
                display = f"{server_host}/{session_name}"
                for p in session.get("ports", []):
                    key = (str(p["chassis_name"]), int(p["card"]), int(p["port"]))
                    session_map[key] = display
        return session_map
    except Exception:
        return {}


def _lookup_session(session_map: dict, record: dict) -> str:
    """Return session name for a port record, or 'NA' if not found."""
    if not session_map:
        return "NA"
    chassis_ip = str(record.get("chassisIp", ""))
    card_raw = record.get("cardNumber")
    port_raw = record.get("portNumber")
    if card_raw is None or port_raw is None:
        return "NA"

    # Case 1: both card and port are plain ints (e.g. XGS12: card=3, port=1)
    try:
        key = (chassis_ip, int(card_raw), int(port_raw))
        if key in session_map:
            return session_map[key]
    except (ValueError, TypeError):
        pass

    # Case 2: portNumber stored as "card.port" dot notation (e.g. AresOne: "4.2")
    port_str = str(port_raw)
    if '.' in port_str:
        parts = port_str.split('.')
        if len(parts) == 2:
            try:
                key = (chassis_ip, int(parts[0]), int(parts[1]))
                if key in session_map:
                    return session_map[key]
            except (ValueError, TypeError):
                pass

    # Case 3: portNumber stored as "card/port" slash notation (e.g. "3/1")
    if '/' in port_str:
        parts = port_str.split('/')
        if len(parts) == 2:
            try:
                key = (chassis_ip, int(parts[0]), int(parts[1]))
                if key in session_map:
                    return session_map[key]
            except (ValueError, TypeError):
                pass

    return "NA"


@router.get("", response_model=PortListResponse)
async def get_ports():
    """Get port details"""
    try:
        # Read port data from database and fetch live session mapping in parallel
        records, session_map = await asyncio.gather(
            read_data_from_database(table_name="chassis_port_details"),
            _build_session_map()
        )
        
        # Helper function to convert 'NA' or invalid values to None for integers
        def to_int_or_none(value):
            if value is None or value == '' or value == 'NA':
                return None
            try:
                return int(value)
            except (ValueError, TypeError):
                return None
        
        # Helper function to handle portNumber as either int or string (for fullyQualifiedPortName like "4.2")
        def to_port_number(value):
            if value is None or value == '' or value == 'NA':
                return None
            # If it's already a string that looks like a fully qualified name (e.g., "4.2"), return as-is
            if isinstance(value, str) and '.' in value:
                return value
            # Try to convert to int, but if it fails, return as string
            try:
                return int(value)
            except (ValueError, TypeError):
                # If conversion fails, return as string (might be a fully qualified name)
                return str(value) if value else None
        
        # Transform records to response format
        port_list = []
        for record in records:
            port_data = {
                "chassisIp": record["chassisIp"],
                "typeOfChassis": record["typeOfChassis"],
                "cardNumber": to_int_or_none(record.get("cardNumber")),
                "portNumber": to_port_number(record.get("portNumber")),
                "linkState": record.get("linkState", "NA"),
                "phyMode": record.get("phyMode", "NA"),
                "transceiverModel": record.get("transceiverModel", "NA"),
                "transceiverManufacturer": record.get("transceiverManufacturer", "NA"),
                "owner": record.get("owner", "Free"),
                "speed": record.get("speed", "NA"),
                "type": record.get("type", "NA"),
                "totalPorts": to_int_or_none(record.get("totalPorts")),
                "ownedPorts": to_int_or_none(record.get("ownedPorts")),
                "freePorts": to_int_or_none(record.get("freePorts")),
                "transmitState": record.get("transmitState", "NA"),
                "lastUpdatedAt_UTC": record.get("lastUpdatedAt_UTC", ""),
                "ixNetworkSession": _lookup_session(session_map, record),
            }
            port_list.append(PortResponse(**port_data))
        
        return PortListResponse(ports=port_list, count=len(port_list))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching port data: {str(e)}")


def _parse_card_port(card_number: int, port_number_raw) -> tuple:
    """Parse (card_int, port_int) from DB values.
    portNumber may be int, '1', '4.2', or '3/1'."""
    port_str = str(port_number_raw)
    if '.' in port_str:
        parts = port_str.split('.')
        return int(card_number), int(parts[1])
    if '/' in port_str:
        parts = port_str.split('/')
        return int(card_number), int(parts[1])
    return int(card_number), int(port_str)


@router.post("/release-ownership", response_model=ReleaseOwnershipResponse)
async def release_port_ownership(request: ReleaseOwnershipRequest):
    """Release ownership of a port on the chassis."""
    try:
        chassis_list_data = await read_username_password_from_database()
        if not chassis_list_data:
            raise HTTPException(status_code=404, detail="No chassis configured")

        chassis_list = json.loads(chassis_list_data)
        chassis = next((c for c in chassis_list if c["ip"] == request.chassisIp), None)
        if not chassis:
            raise HTTPException(status_code=404, detail=f"Chassis {request.chassisIp} not found")

        card_int, port_int = _parse_card_port(request.cardNumber, request.portNumber)

        session = IxRestSession(chassis["ip"], chassis["username"], chassis["password"])
        ports = session.get_ports(params={"cardNumber": card_int, "portNumber": port_int}).data
        if not ports:
            raise HTTPException(status_code=404, detail=f"Port {card_int}/{port_int} not found on chassis")

        port_id = ports[0]["id"]
        session.release_ownership(port_id)

        return ReleaseOwnershipResponse(
            message="Port ownership released successfully",
            chassisIp=request.chassisIp,
            portIdentifier=f"{card_int}/{port_int}"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error releasing port ownership: {str(e)}")

