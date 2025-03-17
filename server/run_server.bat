@echo off
call venv\Scripts\activate
pip install fastapi uvicorn python-multipart aiofiles pydantic python-dotenv
uvicorn main:app --reload --host 0.0.0.0 --port 8000 