from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/budget_tool"
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    DEBUG: bool = False

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
