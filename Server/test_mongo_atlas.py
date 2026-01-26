#!/usr/bin/env python
"""
Test script to verify MongoDB Atlas connection
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from mongoengine import connect, disconnect

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Load environment variables
load_dotenv()

def test_mongo_connection():
    """Test MongoDB Atlas connection"""
    print("Testing MongoDB Atlas connection...")
    
    try:
        # Get connection parameters
        mongo_uri = os.getenv('MONGO_URI')
        db_name = os.getenv('MONGO_DB_NAME', 'zeropoint')
        
        if not mongo_uri:
            print("❌ MONGO_URI not found in environment variables")
            return False
            
        print(f"MongoDB URI: {mongo_uri}")
        print(f"Database name: {db_name}")
        
        # Disconnect any existing connections
        disconnect()
        
        # Connect to MongoDB Atlas with updated parameters
        connect(
            db=db_name,
            host=mongo_uri,
            alias='default',
            tls=True,
            tlsAllowInvalidCertificates=True,
            connectTimeoutMS=30000,
            socketTimeoutMS=30000,
            serverSelectionTimeoutMS=30000,
            retryWrites=True,
            w='majority'
        )
        
        print("✅ Successfully connected to MongoDB Atlas!")
        
        # Test basic operations
        from account.models import Account
        
        # Count existing accounts
        account_count = Account.objects.count()
        print(f"✅ Found {account_count} accounts in the database")
        
        # Test creating a dummy account (don't save it)
        test_account = Account(
            name="Test User",
            email="test@example.com",
            password="testpass123",
            role="user"
        )
        print("✅ Account model instantiation successful")
        
        return True
        
    except Exception as e:
        print(f"❌ Error connecting to MongoDB Atlas: {e}")
        return False

if __name__ == "__main__":
    success = test_mongo_connection()
    if success:
        print("\n🎉 MongoDB Atlas is ready for use!")
        sys.exit(0)
    else:
        print("\n💥 MongoDB Atlas connection failed!")
        sys.exit(1)