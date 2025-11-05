@echo off
REM Quick start script for local development on Windows

echo Starting Calix Backend...

REM Check if .env exists
if not exist .env (
    echo .env file not found. Copying from .env.sample...
    copy .env.sample .env
    echo Please edit .env with your credentials before running again.
    exit /b 1
)

REM Check if virtual environment exists
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Run the server
echo Starting server on http://localhost:8080
echo API docs available at http://localhost:8080/docs
uvicorn app.main:app --reload --port 8080
