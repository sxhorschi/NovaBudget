from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/budget"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    DEBUG: bool = False
    AUTH_DISABLED: bool = True
    SECRET_KEY: str = "change-me-in-production"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
