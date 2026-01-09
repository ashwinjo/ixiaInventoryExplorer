"""
Credential Provider with API-first fallback to local file

This module provides a unified way to fetch Ixia chassis credentials with the following priority:
1. Try to fetch from the FastAPI backend (if running)
2. Fallback to a local JSON file if API is unavailable

Usage:
    from credential_provider import get_credentials
    
    credentials = await get_credentials()
    # Returns: [{"ip": "10.1.1.1", "username": "admin", "password": "secret"}, ...]
"""

import json
import os
from typing import List, Dict, Optional
import httpx
from pathlib import Path


# Configuration
API_BASE_URL = os.getenv("IXIA_API_URL", "http://localhost:3001")
CREDENTIALS_ENDPOINT = f"{API_BASE_URL}/api/config/credentials"
FALLBACK_FILE = os.getenv("IXIA_CREDENTIALS_FILE", "credentials.json")
API_TIMEOUT = 5.0  # seconds


async def get_credentials_from_api() -> Optional[List[Dict[str, str]]]:
    """
    Fetch credentials from the FastAPI backend.
    
    Returns:
        List of credential dictionaries or None if API is unavailable
    """
    try:
        async with httpx.AsyncClient(timeout=API_TIMEOUT) as client:
            response = await client.get(CREDENTIALS_ENDPOINT)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    print(f"[CredProvider] ✓ Fetched {data.get('count', 0)} credentials from API")
                    return data.get("credentials", [])
            else:
                print(f"[CredProvider] ✗ API returned status {response.status_code}")
                return None
                
    except httpx.ConnectError:
        print(f"[CredProvider] ✗ Cannot connect to API at {CREDENTIALS_ENDPOINT}")
        return None
    except httpx.TimeoutException:
        print(f"[CredProvider] ✗ API request timed out after {API_TIMEOUT}s")
        return None
    except Exception as e:
        print(f"[CredProvider] ✗ Unexpected error fetching from API: {e}")
        return None


def get_credentials_from_file() -> Optional[List[Dict[str, str]]]:
    """
    Fetch credentials from local JSON file.
    
    Expected file format:
    [
        {"ip": "10.1.1.1", "username": "admin", "password": "secret"},
        {"ip": "10.1.1.2", "username": "admin", "password": "secret"}
    ]
    
    Returns:
        List of credential dictionaries or None if file doesn't exist or is invalid
    """
    try:
        file_path = Path(FALLBACK_FILE)
        
        if not file_path.exists():
            print(f"[CredProvider] ✗ Fallback file not found: {FALLBACK_FILE}")
            return None
        
        with open(file_path, 'r') as f:
            credentials = json.load(f)
            
        if not isinstance(credentials, list):
            print(f"[CredProvider] ✗ Invalid format in {FALLBACK_FILE}: expected a list")
            return None
        
        print(f"[CredProvider] ✓ Loaded {len(credentials)} credentials from file: {FALLBACK_FILE}")
        return credentials
        
    except json.JSONDecodeError as e:
        print(f"[CredProvider] ✗ Invalid JSON in {FALLBACK_FILE}: {e}")
        return None
    except Exception as e:
        print(f"[CredProvider] ✗ Error reading file {FALLBACK_FILE}: {e}")
        return None


async def get_credentials() -> List[Dict[str, str]]:
    """
    Get credentials with fallback logic: API → Local File → Empty List
    
    Returns:
        List of credential dictionaries (may be empty if both sources fail)
    """
    print("[CredProvider] Attempting to fetch credentials...")
    
    # Try API first
    credentials = await get_credentials_from_api()
    
    if credentials is not None:
        return credentials
    
    # Fallback to local file
    print("[CredProvider] Falling back to local file...")
    credentials = get_credentials_from_file()
    
    if credentials is not None:
        return credentials
    
    # Both failed
    print("[CredProvider] ⚠ No credentials available from API or file")
    return []


def save_credentials_to_file(credentials: List[Dict[str, str]], file_path: Optional[str] = None) -> bool:
    """
    Save credentials to a local JSON file (useful for creating the fallback file).
    
    Args:
        credentials: List of credential dictionaries
        file_path: Optional custom file path (defaults to FALLBACK_FILE)
    
    Returns:
        True if successful, False otherwise
    """
    target_file = file_path or FALLBACK_FILE
    
    try:
        with open(target_file, 'w') as f:
            json.dump(credentials, f, indent=2)
        
        print(f"[CredProvider] ✓ Saved {len(credentials)} credentials to {target_file}")
        return True
        
    except Exception as e:
        print(f"[CredProvider] ✗ Error saving to {target_file}: {e}")
        return False


# Synchronous version for non-async contexts
def get_credentials_sync() -> List[Dict[str, str]]:
    """
    Synchronous version that only uses the file fallback.
    Use this in non-async contexts (e.g., MCP server initialization).
    
    Returns:
        List of credential dictionaries from file or empty list
    """
    print("[CredProvider] Using synchronous file-only mode...")
    credentials = get_credentials_from_file()
    return credentials if credentials is not None else []


if __name__ == "__main__":
    # Test the credential provider
    import asyncio
    
    async def test():
        print("=" * 60)
        print("Testing Credential Provider")
        print("=" * 60)
        
        creds = await get_credentials()
        
        print("\n" + "=" * 60)
        print(f"Result: {len(creds)} credentials fetched")
        print("=" * 60)
        
        for i, cred in enumerate(creds, 1):
            # Mask password for display
            masked = {**cred, "password": "***" if "password" in cred else None}
            print(f"{i}. {masked}")
    
    asyncio.run(test())
