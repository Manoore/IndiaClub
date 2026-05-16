import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "icgd")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

async def close():
    client.close()
