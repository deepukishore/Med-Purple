from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator


class Settings(BaseSettings):
    database_url: str = (
        "mysql+pymysql://medpurple:medpurple@localhost:13306/medpurple?charset=utf8mb4"
    )
    jwt_secret: str = "local-development-only-change-before-deploy-64-characters"
    environment: str = "development"
    cors_origins: str = (
        "http://localhost:4173,http://localhost:5173,http://127.0.0.1:4173,http://127.0.0.1:5173,http://[::1]:4173,http://[::1]:5173"
    )
    access_minutes: int = 15
    refresh_days: int = 30
    cookie_secure: bool = False
    seed_content: bool = True
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @model_validator(mode="after")
    def production_guard(self):
        if self.environment == "production":
            if self.jwt_secret.startswith("local-") or len(self.jwt_secret) < 48:
                raise ValueError(
                    "Production requires a random JWT_SECRET of at least 48 characters"
                )
            if not self.cookie_secure:
                raise ValueError("Production requires COOKIE_SECURE=true and HTTPS")
            if not self.database_url.startswith("mysql+pymysql://"):
                raise ValueError("Production requires MySQL")
        return self


settings = Settings()
