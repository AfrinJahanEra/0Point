import asyncio
import websockets
import json
import sys

async def send_message():
    uri = "ws://localhost:8000/ws/interview/test123/"
    
    # Get role from command line or default to interviewer
    role = sys.argv[1] if len(sys.argv) > 1 else "interviewer"
    uri = f"{uri}?role={role}"
    
    async with websockets.connect(uri) as websocket:
        print(f"Connected as {role}")
        
        # Receive initial state
        response = await websocket.recv()
        print("Initial state received")
        
        # Send code change
        message = {
            "type": "code_change",
            "content": "function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n-1) + fibonacci(n-2);\n}\n\nconsole.log(fibonacci(10));",
            "language": "javascript"
        }
        
        await websocket.send(json.dumps(message))
        print("Code change sent")
        
        # Keep connection open to receive responses
        while True:
            response = await websocket.recv()
            data = json.loads(response)
            print(f"Received: {data['type']}")
            if data['type'] == 'code_change':
                print(f"Code updated by {data['username']}: {data['content'][:50]}...")

if __name__ == "__main__":
    asyncio.run(send_message())