from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-5-5"
    internal_api_key: str = "change-me-internal"
    api_base_url: str = "http://localhost:4000"  # NestJS, source of tool data
    max_steps: int = 6


settings = Settings()
