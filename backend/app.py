import sys
import os
import shutil
import subprocess

# Ensure UTF-8 output
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Resolve paths
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, ".."))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Check if running inside Docker container
IN_DOCKER = os.getenv("IN_DOCKER") == "1" or os.path.exists("/.dockerenv")

def launch_docker_container():
    """Build and run the Docker container using docker compose or docker build/run."""
    print("=" * 55)
    print("       QUEBOOK — LAUNCHING IN DOCKER CONTAINER")
    print("=" * 55)
    
    docker_bin = shutil.which("docker")
    if not docker_bin:
        print("\n[!] Docker is not installed or not running in system PATH.")
        print("    Download/Install Docker Desktop: https://www.docker.com/products/docker-desktop/")
        print("    Falling back to native Python execution...\n")
        return False

    # Check if docker-compose / docker compose is available
    compose_file = os.path.join(project_root, "docker-compose.yml")
    if os.path.exists(compose_file):
        cmd = ["docker", "compose", "up", "--build"]
    else:
        cmd = ["docker", "build", "-t", "quebook-app", project_root]

    print(f"Executing: {' '.join(cmd)}\n")
    try:
        subprocess.run(cmd, cwd=project_root)
        return True
    except KeyboardInterrupt:
        print("\nStopping Docker container...")
        if os.path.exists(compose_file):
            subprocess.run(["docker", "compose", "down"], cwd=project_root)
        return True
    except Exception as e:
        print(f"[!] Docker execution failed: {e}")
        return False

# Check if user requested docker execution via argument or environment
if not IN_DOCKER and ("--docker" in sys.argv or os.getenv("RUN_WITH_DOCKER") == "1"):
    if launch_docker_container():
        sys.exit(0)

# Check and auto-switch to .venv if requirements are missing in current Python
try:
    import uvicorn
    from dotenv import load_dotenv
    import sqlalchemy
except ImportError as err:
    venv_python_win = os.path.join(project_root, ".venv", "Scripts", "python.exe")
    venv_python_posix = os.path.join(project_root, ".venv", "bin", "python")
    venv_python = venv_python_win if os.name == "nt" else venv_python_posix

    if os.path.exists(venv_python) and os.path.abspath(sys.executable) != os.path.abspath(venv_python):
        print(f"[Notice] Missing dependency ({getattr(err, 'name', err)}). Auto-switching to project .venv...")
        os.execv(venv_python, [venv_python] + sys.argv)
    else:
        if not IN_DOCKER and shutil.which("docker"):
            print("[Notice] Missing Python dependencies locally. Launching via Docker...")
            if launch_docker_container():
                sys.exit(0)
        raise err

# 1. Load environment variables (.env in backend/ or root)
env_path = os.path.join(current_dir, ".env")
if not os.path.exists(env_path):
    env_path = os.path.join(project_root, ".env")
if os.path.exists(env_path):
    load_dotenv(env_path, encoding="utf-8")

# Delay database & main imports until environment variables are loaded
from database import engine, test_connection
import main

def print_startup_message(db_status_msg: str, host: str, port: int):
    mode = "DOCKER CONTAINER" if IN_DOCKER else "LOCAL HOST"
    print("=" * 55)
    print("                  QUEBOOK APPLICATION")
    print(f"            [Mode: {mode}]")
    print("=" * 55)
    print("")
    print(db_status_msg)
    print("✓ API routes registered")
    print("✓ Recommendation engine ready")
    print("✓ Backend & Frontend server running")
    print("")
    display_host = "localhost" if host in ("0.0.0.0", "127.0.0.1") else host
    print(f"→ Application URL: http://{display_host}:{port}")
    print(f"→ API Docs:        http://{display_host}:{port}/docs")
    print("")
    print("Press CTRL+C to stop the server.")
    print("=" * 55)

def start_backend():
    # 2. Test database connection safely
    is_connected, msg = test_connection()
    db_status_msg = f"✓ {msg}" if is_connected else f"✗ {msg}"

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))

    # 3. Print startup banner
    print_startup_message(db_status_msg, host, port)

    # 4. Start the Uvicorn web server
    uvicorn.run(main.app, host=host, port=port, log_level="warning")

if __name__ == "__main__":
    try:
        start_backend()
    except Exception as e:
        print(f"\n[Error] Backend failed to start: {e}")
