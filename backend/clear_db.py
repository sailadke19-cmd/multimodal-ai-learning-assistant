import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

async def clear():
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    result = await db.study_materials.delete_many({})
    print(f'Deleted {result.deleted_count} materials')
    client.close()

asyncio.run(clear())