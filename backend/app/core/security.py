import hashlib, secrets
from datetime import datetime, timedelta, timezone
from ipaddress import IPv4Address, ip_address, ip_network
from urllib.parse import urlparse
import jwt
from pwdlib import PasswordHash
from fastapi import Depends, HTTPException, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import select
from .config import settings
from .database import get_db
from app.models import User, RefreshSession
from app.schemas.contracts import TokenOut, UserOut

passwords = PasswordHash.recommended()
bearer = HTTPBearer(auto_error=False)


def decode_user(credentials, db):
    if not credentials:
        return None
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.jwt_secret,
            algorithms=["HS256"],
            audience="med-purple",
            issuer="med-purple-api",
        )
        return db.get(User, payload["sub"])
    except (jwt.PyJWTError, KeyError):
        return None


def optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
):
    return decode_user(credentials, db)


def current_user(user=Depends(optional_user)):
    if not user:
        raise HTTPException(401, "Your session expired. Sign in again.")
    return user


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def issue_tokens(user, db, response, native=False):
    now = datetime.now(timezone.utc)
    access = jwt.encode(
        {
            "sub": user.id,
            "iat": now,
            "exp": now + timedelta(minutes=settings.access_minutes),
            "aud": "med-purple",
            "iss": "med-purple-api",
        },
        settings.jwt_secret,
        algorithm="HS256",
    )
    refresh = secrets.token_urlsafe(48)
    db.add(
        RefreshSession(
            user_id=user.id,
            token_hash=token_hash(refresh),
            expires_at=now + timedelta(days=settings.refresh_days),
        )
    )
    db.commit()
    if not native:
        response.set_cookie(
            "mp_refresh",
            refresh,
            httponly=True,
            secure=settings.cookie_secure,
            samesite="strict",
            max_age=settings.refresh_days * 86400,
            path="/api/v1/auth",
        )
    return TokenOut(
        access_token=access,
        refresh_token=refresh if native else None,
        user=UserOut.model_validate(user),
    )


def normalize_origin(origin):
    if not origin:
        return None
    parsed = urlparse(origin.strip())
    if not parsed.scheme or not parsed.netloc:
        return None
    return f"{parsed.scheme.lower()}://{parsed.netloc.lower().rstrip('/')}"


PRIVATE_IPV4_NETWORKS = (
    ip_network("10.0.0.0/8"),
    ip_network("172.16.0.0/12"),
    ip_network("192.168.0.0/16"),
)


def is_development_origin(origin: str) -> bool:
    try:
        parsed = urlparse(origin.strip())
        hostname = (parsed.hostname or "").lower().rstrip(".")
        parsed.port  # Reject malformed ports before trusting this origin.
    except ValueError:
        return False

    if (
        parsed.scheme.lower() not in {"http", "https"}
        or parsed.username
        or parsed.password
        or parsed.path
        or parsed.params
        or parsed.query
        or parsed.fragment
    ):
        return False

    if hostname in {"localhost", "127.0.0.1", "::1"}:
        return True

    try:
        address = ip_address(hostname)
    except ValueError:
        return False

    # Vite may move to the next port when another development server is
    # already listening. LAN clients use that same origin through the proxy.
    return isinstance(address, IPv4Address) and any(
        address in network for network in PRIVATE_IPV4_NETWORKS
    )


def check_origin(request: Request):
    origin = request.headers.get("origin")
    if not origin:
        return

    normalized_origin = normalize_origin(origin)
    allowed_origins = {
        normalize_origin(item)
        for item in settings.cors_origins.split(",")
        if item and item.strip()
    }
    if normalized_origin in allowed_origins:
        return

    if settings.environment == "development" and is_development_origin(origin):
        return

    raise HTTPException(403, "Request origin is not allowed.")
