import requests
import json

# Test the complete session flow

BASE_URL = "http://localhost:8000"

def test_session_creation_and_invitation():
    """Test creating a session and sending invitations"""
    
    # Step 1: Create a session
    print("Step 1: Creating a session...")
    create_url = f"{BASE_URL}/interview/api/sessions/create/"
    session_id = "test_session_123"
    
    create_payload = {
        "session_id": session_id,
        "title": "Test Interview Session",
        "duration": 3600
    }
    
    try:
        response = requests.post(create_url, json=create_payload)
        print(f"Create Session Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Session created successfully: {json.dumps(data, indent=2)}")
            
            # Step 2: Send invitation to interviewer
            print("\nStep 2: Sending invitation to interviewer...")
            invite_url = f"{BASE_URL}/interview/api/sessions/send-invitation/"
            invite_payload = {
                "session_id": session_id,
                "email": "interviewer@example.com",
                "role": "interviewer"
            }
            
            invite_response = requests.post(invite_url, json=invite_payload)
            print(f"Send Invitation Status: {invite_response.status_code}")
            
            if invite_response.status_code == 200:
                invite_data = invite_response.json()
                print(f"Invitation sent successfully: {json.dumps(invite_data, indent=2)}")
            else:
                print(f"Error sending invitation: {invite_response.text}")
                
        else:
            print(f"Error creating session: {response.text}")
            
    except Exception as e:
        print(f"Exception: {e}")

def test_nonexistent_session_invitation():
    """Test sending invitation to a non-existent session (should create session)"""
    
    print("\n\nTest: Sending invitation to non-existent session...")
    invite_url = f"{BASE_URL}/interview/api/sessions/send-invitation/"
    invite_payload = {
        "session_id": "nonexistent_session_456",
        "email": "candidate@example.com",
        "role": "candidate"
    }
    
    try:
        response = requests.post(invite_url, json=invite_payload)
        print(f"Send Invitation Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Invitation processed: {json.dumps(data, indent=2)}")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    print("Testing Session Creation and Invitation Flow")
    print("=" * 50)
    
    test_session_creation_and_invitation()
    test_nonexistent_session_invitation()