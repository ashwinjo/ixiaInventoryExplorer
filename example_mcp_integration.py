"""
Example: Integrating Credential Provider into MCP Server

This example shows how to use the credential_provider in your MCP server
to fetch chassis credentials with automatic API → File fallback.
"""

import asyncio
from credential_provider import get_credentials


async def initialize_mcp_tools():
    """
    Initialize MCP tools with credentials from the provider.
    This will automatically try the API first, then fall back to the local file.
    """
    print("Initializing MCP Tools...")
    print("-" * 60)
    
    # Get credentials with automatic fallback
    credentials = await get_credentials()
    
    if not credentials:
        print("⚠️  No credentials available. Please configure chassis credentials.")
        print("   Option 1: Add via GUI at http://localhost:5173")
        print("   Option 2: Create credentials.json file")
        return []
    
    print(f"\n✓ Found {len(credentials)} chassis configurations")
    print("-" * 60)
    
    # Initialize tools for each chassis
    tools = []
    for cred in credentials:
        chassis_ip = cred.get('ip')
        username = cred.get('username')
        password = cred.get('password')
        
        print(f"\n📡 Configuring tools for chassis: {chassis_ip}")
        print(f"   Username: {username}")
        
        # Here you would initialize your actual MCP tools
        # Example:
        # tool = IxiaChassisTools(
        #     ip=chassis_ip,
        #     username=username,
        #     password=password
        # )
        # tools.append(tool)
        
        # For this example, we'll just create a mock tool
        tool = {
            "chassis_ip": chassis_ip,
            "username": username,
            "status": "configured"
        }
        tools.append(tool)
    
    print("\n" + "=" * 60)
    print(f"✓ Successfully configured {len(tools)} chassis tools")
    print("=" * 60)
    
    return tools


async def periodic_credential_refresh(interval_seconds=300):
    """
    Periodically refresh credentials from the API.
    This ensures your MCP server picks up new chassis added via the GUI.
    
    Args:
        interval_seconds: How often to refresh (default: 5 minutes)
    """
    while True:
        print(f"\n🔄 Refreshing credentials (every {interval_seconds}s)...")
        credentials = await get_credentials()
        
        # Update your tools with new credentials
        # This is where you'd reconfigure your MCP tools
        
        print(f"   Current chassis count: {len(credentials)}")
        
        await asyncio.sleep(interval_seconds)


async def main():
    """
    Main entry point for MCP server with credential provider integration.
    """
    print("=" * 60)
    print("MCP Server - Credential Provider Integration Example")
    print("=" * 60)
    
    # Initialize tools on startup
    tools = await initialize_mcp_tools()
    
    # Optionally: Start periodic refresh in background
    # asyncio.create_task(periodic_credential_refresh(interval_seconds=300))
    
    # Your MCP server logic here
    print("\n🚀 MCP Server is ready!")
    print("   Listening for tool calls...")
    
    # Keep the server running
    # await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(main())
