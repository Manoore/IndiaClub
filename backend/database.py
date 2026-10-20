import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL")
if not MONGO_URL:
    raise RuntimeError("MONGO_URL is not set — add it in the Render dashboard (Environment) or backend/.env")
DB_NAME = os.environ.get("DB_NAME", "icgd")

# Fail fast (10s) instead of hanging requests for 30s when Atlas is paused or blocks the server's IP
client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=10000, connectTimeoutMS=10000)
db = client[DB_NAME]

async def close():
    client.close()
