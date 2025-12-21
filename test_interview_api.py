import requests
import json

# Test the interview session API endpoints

BASE_URL = "http://localhost:8000"

def test_create_session():
    """Test creating a basic interview session"""
    url = f"{BASE_URL}/interview/api/sessions/create/"
    payload = {
        "title": "Test Interview Session",
        "duration": 3600
    }
    
    try:
        response = requests.post(url, json=payload)
        print(f"Create Session Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            return data.get('session_id')
        else:
            print(f"Error: {response.text}")
            return None
    except Exception as e:
        print(f"Exception: {e}")
        return None

def test_create_session_with_email():
    """Test creating a session with email invitations"""
    url = f"{BASE_URL}/interview/api/sessions/create-with-email/"
    payload = {
        "title": "Test Email Interview Session",
        "interviewer_email": "interviewer@example.com",
        "candidate_email": "candidate@example.com",
        "duration": 3600
    }
    
    try:
        response = requests.post(url, json=payload)
        print(f"Create Session with Email Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            return data.get('session_id')
        else:
            print(f"Error: {response.text}")
            return None
    except Exception as e:
        print(f"Exception: {e}")
        return None

def test_send_invitation(session_id):
    """Test sending an additional invitation"""
    if not session_id:
        print("No session ID provided")
        return
    
    url = f"{BASE_URL}/interview/api/sessions/send-invitation/"
    payload = {
        "session_id": session_id,
        "email": "another_interviewer@example.com",
        "role": "interviewer"
    }
    
    try:
        response = requests.post(url, json=payload)
        print(f"Send Invitation Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Exception: {e}")

def test_health_check():
    """Test the health check endpoint"""
    url = f"{BASE_URL}/interview/api/health/"
    
    try:
        response = requests.get(url)
        print(f"Health Check Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    print("Testing Interview API Endpoints")
    print("=" * 40)
    
    # Test health check
    print("\n1. Testing Health Check:")
    test_health_check()
    
    # Test basic session creation
    print("\n2. Testing Basic Session Creation:")
    session_id = test_create_session()
    
    # Test session creation with email
    print("\n3. Testing Session Creation with Email:")
    email_session_id = test_create_session_with_email()
    
    # Test sending additional invitation
    print("\n4. Testing Send Invitation:")
    test_send_invitation(email_session_id)