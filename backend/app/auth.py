"""
Clerk JWT verification dependency.

FastAPI endpoints should use `Depends(verify_clerk_jwt)`.
The client must send the default Clerk session token (RS256, no template):
  Authorization: Bearer <token from getToken()>

NOT the "supabase" template token (HS256) — that is only for Supabase RLS.
"""

from __future__ import annotations

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import settings

_bearer = HTTPBearer()
_jwks_client = jwt.PyJWKClient(settings.clerk_jwks_url, cache_keys=True)


async def verify_clerk_jwt(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """
    Validate a Clerk RS256 session JWT.
    Returns the decoded payload (contains 'sub', 'iss', etc.).
    Raises HTTP 401 on any validation failure.
    """
    token = credentials.credentials
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        payload: dict = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        )
