# test_broadcast.py
# Test if broadcasts are actually being sent through Redis
import asyncio
import websockets
import json
import requests
import time

async def listen_for_broadcasts():
    """Connect and listen for broadcast messages"""
    print("🔌 Connecting to WebSockets...")
    
    # Connect to both WebSockets
    contest_uri = "ws://localhost:8000/ws/contest/test_contest_id/"
    global_uri = "ws://localhost:8000/ws/contest/global/"
    
    try:
        async with websockets.connect(contest_uri) as contest_ws, \
                   websockets.connect(global_uri) as global_ws:
            
            # Wait for connection messages
            contest_msg = await contest_ws.recv()
            print(f"✅ Contest WS: {contest_msg}")
            
            global_msg = await global_ws.recv()
            print(f"✅ Global WS: {global_msg}")
            
            print("\n📡 Listening for broadcasts... (waiting 30 seconds)")
            print("👉 Now trigger some actions in your Django app:")
            print("   - Register for a contest")
            print("   - Create a submission")
            print("   - Post an announcement")
            print("   - Visit contest list page\n")
            
            # Listen for messages for 30 seconds
            async def listen_ws(ws, name):
                try:
                    while True:
                        message = await asyncio.wait_for(ws.recv(), timeout=30)
                        data = json.loads(message)
                        print(f"\n📩 {name} received:")
                        print(f"   Event: {data.get('event', 'unknown')}")
                        print(f"   Data: {json.dumps(data, indent=2)}")
                except asyncio.TimeoutError:
                    print(f"\n⏱️  {name} timeout (no messages)")
                except Exception as e:
                    print(f"\n❌ {name} error: {e}")
            
            # Listen to both WebSockets simultaneously
            await asyncio.gather(
                listen_ws(contest_ws, "Contest WS"),
                listen_ws(global_ws, "Global WS")
            )
            
    except Exception as e:
        print(f"❌ Connection Error: {e}")

async def trigger_test_broadcast():
    """Trigger a test broadcast by calling the test endpoint"""
    print("\n🧪 Triggering test broadcast...")
    try:
        response = requests.get("http://localhost:8000/test/")
        print(f"✅ Test endpoint response: {response.json()}")
    except Exception as e:
        print(f"❌ Failed to trigger test: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("WebSocket Broadcast Tester")
    print("=" * 60)
    
    # Option 1: Just listen for broadcasts
    asyncio.run(listen_for_broadcasts())
    
    # Option 2: Trigger test broadcast (uncomment if you have /test/ endpoint)
    # asyncio.run(trigger_test_broadcast())
    # asyncio.run(listen_for_broadcasts())