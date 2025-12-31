# test_websocket.py
# Run this script to test your WebSocket setup

import asyncio
import websockets
import json

async def test_contest_websocket():
    """Test contest-specific WebSocket"""
    uri = "ws://localhost:8000/ws/contest/test_contest_id/"
    
    try:
        async with websockets.connect(uri) as websocket:
            # Wait for connection message
            response = await websocket.recv()
            print(f"Contest WS Connected: {response}")
            
            # Send ping
            await websocket.send(json.dumps({"type": "ping"}))
            
            # Wait for pong
            pong = await websocket.recv()
            print(f"Contest WS Pong: {pong}")
            
            print("✅ Contest WebSocket working!")
            
    except Exception as e:
        print(f"❌ Contest WebSocket Error: {e}")

async def test_global_websocket():
    """Test global WebSocket"""
    uri = "ws://localhost:8000/ws/contest/global/"
    
    try:
        async with websockets.connect(uri) as websocket:
            # Wait for connection message
            response = await websocket.recv()
            print(f"Global WS Connected: {response}")
            
            # Send ping
            await websocket.send(json.dumps({"type": "ping"}))
            
            # Wait for pong
            pong = await websocket.recv()
            print(f"Global WS Pong: {pong}")
            
            print("✅ Global WebSocket working!")
            
    except Exception as e:
        print(f"❌ Global WebSocket Error: {e}")

async def main():
    print("Testing WebSocket connections...\n")
    await test_contest_websocket()
    print()
    await test_global_websocket()

if __name__ == "__main__":
    asyncio.run(main())