from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/budget"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    DEBUG: bool = False
    AUTH_DISABLED: bool = False
    SECRET_KEY: str = "change-me-in-production"
    ADMIN_EMAIL: str = "admin@localhost"
    ADMIN_NAME: str = "Administrator"
    AZURE_CLIENT_ID: str = ""
    AZURE_TENANT_ID: str = ""
    AZURE_ADMIN_GROUP_ID: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
