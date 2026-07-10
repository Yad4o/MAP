import os
import sys

# Add parent directory to sys.path to allow importing the app module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
print(f"DATABASE_URL: {settings.DATABASE_URL}")
print(f"CORS_ALLOWED_ORIGINS: {settings.CORS_ALLOWED_ORIGINS}")
print(f"Processed origins: {settings.cors_origins_list}")
