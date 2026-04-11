from app.config import settings
print(f"DATABASE_URL: {settings.DATABASE_URL}")
print(f"CORS_ALLOWED_ORIGINS: {settings.CORS_ALLOWED_ORIGINS}")
print(f"Processed origins: {settings.cors_origins_list}")
