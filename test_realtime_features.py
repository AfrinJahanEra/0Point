#!/usr/bin/env python3
"""
Test script for real-time features in the interview platform
"""

import requests
import json
import time
import threading
import websocket

# Configuration
BASE_URL = "http://localhost:8000"
SESSION_ID = "test_session_123"

def test_session_management():
    """Test session creation and management APIs"""
    print("=== Testing Session Management ===")
    
    # 1. Create a new session
    print("1. Creating new session...")
    create_url = f"{BASE_URL}/interview/api/sessions/create/"
    create_payload = {
        "title": "Real-time Interview Test Session",
        "duration": 3600
    }
    
    try:
        response = requests.post(create_url, json=create_payload)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Session ID: {data.get('session_id')}")
            print(f"   Title: {data.get('title')}")
            global SESSION_ID
            SESSION_ID = data.get('session_id')
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    # 2. Get session status
    print("\n2. Getting session status...")
    status_url = f"{BASE_URL}/interview/api/sessions/status/?session_id={SESSION_ID}"
    try:
        response = requests.get(status_url)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Interviewer Count: {data.get('interviewer_count')}")
            print(f"   Candidate Count: {data.get('candidate_count')}")
            print(f"   Active Participants: {data.get('total_participants')}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")

def test_document_sharing():
    """Test document sharing functionality"""
    print("\n=== Testing Document Sharing ===")
    
    # 1. Update session document with text content
    print("1. Updating session document with text content...")
    doc_url = f"{BASE_URL}/interview/api/sessions/document/"
    doc_payload = {
        "session_id": SESSION_ID,
        "content": "# Two Sum Problem\n\nGiven an array of integers nums and an integer target, return indices of the two numbers such that they add up to target."
    }
    
    try:
        response = requests.post(doc_url, json=doc_payload)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Message: {data.get('message')}")
            print(f"   Document Version: {data.get('document_version')}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    # 2. Get session document
    print("\n2. Getting session document...")
    get_doc_url = f"{BASE_URL}/interview/api/sessions/document/?session_id={SESSION_ID}"
    try:
        response = requests.get(get_doc_url)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Content Preview: {data.get('content')[:100]}...")
            print(f"   Document Version: {data.get('document_version')}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")

def test_collaborative_editing():
    """Test collaborative code editing"""
    print("\n=== Testing Collaborative Editing ===")
    
    # 1. Get current code state
    print("1. Getting current code state...")
    code_url = f"{BASE_URL}/interview/api/sessions/code/?session_id={SESSION_ID}"
    try:
        response = requests.get(code_url)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Language: {data.get('language')}")
            print(f"   Version: {data.get('version')}")
            print(f"   Content Preview: {data.get('content')[:100]}...")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    # 2. Update code
    print("\n2. Updating code...")
    update_code_url = f"{BASE_URL}/interview/api/sessions/code/"
    code_payload = {
        "session_id": SESSION_ID,
        "content": "function twoSum(nums, target) {\n  const map = new Map();\n  \n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    \n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    \n    map.set(nums[i], i);\n  }\n  \n  return [];\n}\n\n// Test\ntwoSum([2,7,11,15], 9);",
        "language": "javascript",
        "version": 1,
        "user_id": "test_user_1"
    }
    
    try:
        response = requests.post(update_code_url, json=code_payload)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Message: {data.get('message')}")
            print(f"   Version: {data.get('version')}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    # 3. Get updated code state
    print("\n3. Getting updated code state...")
    try:
        response = requests.get(code_url)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Language: {data.get('language')}")
            print(f"   Version: {data.get('version')}")
            print(f"   Content Preview: {data.get('content')[:100]}...")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Exception: {e}")

def on_message(ws, message):
    """Handle incoming WebSocket messages"""
    try:
        data = json.loads(message)
        print(f"   Received: {data.get('type', 'unknown')}")
        if data.get('type') == 'initial_state':
            print(f"   Initial state received - Interviewer count: {data.get('interviewer_count')}, Candidate count: {data.get('candidate_count')}")
        elif data.get('type') == 'presence_update':
            print(f"   Presence update - {data.get('username')} ({data.get('role')}) {data.get('action')}")
        elif data.get('type') == 'code_change':
            print(f"   Code updated by {data.get('username')}")
        elif data.get('type') == 'question_update':
            print(f"   Question updated by {data.get('username')}")
    except Exception as e:
        print(f"   Error processing message: {e}")

def on_error(ws, error):
    """Handle WebSocket errors"""
    print(f"   WebSocket Error: {error}")

def on_close(ws, close_status_code, close_msg):
    """Handle WebSocket closure"""
    print("   WebSocket connection closed")

def on_open(ws):
    """Handle WebSocket opening"""
    print("   WebSocket connection opened")
    
    # Send a code change after connecting
    def send_code_change():
        time.sleep(2)
        message = {
            "type": "code_change",
            "content": "# Updated by WebSocket test\nprint('Hello from WebSocket!')",
            "language": "python",
            "version": 2
        }
        ws.send(json.dumps(message))
        print("   Sent code change message")
    
    threading.Thread(target=send_code_change).start()

def test_websocket_connection():
    """Test WebSocket connection"""
    print("\n=== Testing WebSocket Connection ===")
    
    # WebSocket URL for interviewer
    ws_url = f"ws://localhost:8000/ws/interview/{SESSION_ID}/?role=interviewer&username=TestInterviewer"
    print(f"Connecting to: {ws_url}")
    
    try:
        ws = websocket.WebSocketApp(ws_url,
                                    on_open=on_open,
                                    on_message=on_message,
                                    on_error=on_error,
                                    on_close=on_close)
        
        # Run for 5 seconds to see messages
        wst = threading.Thread(target=ws.run_forever)
        wst.daemon = True
        wst.start()
        
        time.sleep(5)
        ws.close()
        print("   WebSocket test completed")
        
    except Exception as e:
        print(f"   WebSocket Exception: {e}")

def main():
    """Main test function"""
    print("Interview Platform Real-time Features Test Script")
    print("=" * 50)
    
    # Test session management
    test_session_management()
    
    # Test document sharing
    test_document_sharing()
    
    # Test collaborative editing
    test_collaborative_editing()
    
    # Test WebSocket connection
    # Note: This requires the websocket-client package
    # Install with: pip install websocket-client
    try:
        import websocket
        test_websocket_connection()
    except ImportError:
        print("\n=== WebSocket Test ===")
        print("   websocket-client package not installed.")
        print("   Install with: pip install websocket-client")
        print("   Skipping WebSocket test.")
    
    print("\nTest script completed!")

if __name__ == "__main__":
    main()