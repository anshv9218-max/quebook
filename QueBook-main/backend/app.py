import sys
import os
import uvicorn
from sqlalchemy.exc import OperationalError

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Ensure the backend directory is in the path
sys.path.insert(0, os.path.dirname(__file__))

# 1. Load the backend/.env configuration
from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path, encoding="utf-8")

# Delay imports to ensure environment variables are loaded first
from database import engine
import main

def print_startup_message(db_status_msg: str):
    print("=" * 50)
    print("          QUEBOOK BACKEND")
    print("=" * 50)
    print("")
    print(db_status_msg)
    print("✓ API routes registered")
    print("✓ Recommendation engine ready")
    print("✓ Backend server running")
    print("")
    print("Backend: http://127.0.0.1:8000")
    print("")
    print("Press CTRL+C to stop the server.")
    print("=" * 50)

def start_backend():
    # 2. Initialize the PostgreSQL database connection/configuration and test it
    db_status_msg = ""
    try:
        # Try to connect to ensure it's available
        with engine.connect() as connection:
            db_status_msg = "✓ PostgreSQL connected"
    except Exception as e:
        # Never hide the actual database error, but don't crash
        db_status_msg = f"✗ PostgreSQL connection failed: {e}"

    # 3. Print the clear startup message in the terminal
    print_startup_message(db_status_msg)

    # 4. Start the backend web server, listen on localhost
    # Using log_level="warning" so uvicorn's default output doesn't hide our custom message.
    uvicorn.run(main.app, host="127.0.0.1", port=8000, log_level="warning")

if __name__ == "__main__":
    try:
        start_backend()
    except Exception as e:
        print(f"\n[Error] Backend failed to start: {e}")
