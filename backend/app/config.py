"""
App configuration via pydantic-settings.
Reads from environment variables / .env file.
"""

import base64

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    anthropic_api_key: str
    clerk_publishable_key: str

    @computed_field  # type: ignore[misc]
    @property
    def clerk_jwks_url(self) -> str:
        """
        Derive the Clerk JWKS URL from the publishable key.

        Clerk publishable keys are structured as:
          pk_test_<base64url(frontend_api_domain)> or pk_live_<base64url(frontend_api_domain)>

        Decoding the base64 suffix gives the frontend API domain, e.g.:
          romantic-seal-68.clerk.accounts.dev
        """
        key = self.clerk_publishable_key
        # Strip the pk_test_ or pk_live_ prefix
        if "_" not in key:
            raise ValueError("Invalid Clerk publishable key format")
        suffix = key.split("_", 2)[-1]  # everything after pk_test_ or pk_live_
        # Add padding if needed
        padding = 4 - len(suffix) % 4
        if padding != 4:
            suffix += "=" * padding
        domain = base64.urlsafe_b64decode(suffix).decode("utf-8").rstrip("$")
        return f"https://{domain}/.well-known/jwks.json"


settings = Settings()  # type: ignore[call-arg]
