import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ServerSelectionTimeoutError

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://your_mongo_user:your_mongo_password@localhost:27017/smartattend_db?authSource=admin")
MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME", "smartattend_db")

client: AsyncIOMotorClient = None
db = None

async def connect_db():
    global client, db
    client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    db = client[MONGO_DB_NAME]

    # Retry ping until Mongo is ready (handles race vs healthcheck)
    for attempt in range(12):  # up to ~60s total
        try:
            await client.admin.command("ping")
            print(f"✅ MongoDB reachable after {attempt} retries")
            break
        except ServerSelectionTimeoutError as e:
            if attempt == 11:
                raise RuntimeError(f"MongoDB not reachable after 12 attempts: {e}") from e
            print(f"⏳ Waiting for MongoDB... attempt {attempt + 1}/12")
            await asyncio.sleep(5)

    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.subjects.create_index([("owner_id", 1), ("name", 1)])
    await db.attendance.create_index([("subject_id", 1), ("date", -1)])
    await db.alerts.create_index([("owner_id", 1), ("is_read", 1)])
    print("✅ Connected to MongoDB and indexes created")

async def disconnect_db():
    global client
    if client:
        client.close()
        print("🔌 Disconnected from MongoDB")

def get_db():
    return db
