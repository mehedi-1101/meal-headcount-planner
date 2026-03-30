"""
JWT authentication.

How JWT works (interview version):
  1. User logs in → server creates a signed token containing user data
  2. Client stores token (localStorage) and sends it on every request
     as:  Authorization: Bearer <token>
  3. Server verifies the signature — no DB lookup needed on every request
     (stateless, unlike sessions which require a session store)

Libraries used:
  joserfc   — JWT signing/verification (replaces abandoned python-jose)
  pwdlib    — password hashing (replaces abandoned passlib; wraps bcrypt 5.x)
"""

import os
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from joserfc import jwt
from joserfc.jwk import OctKey
from joserfc.errors import JoseError
from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))  # 24 hours

# joserfc uses a key object rather than a raw string
_jwt_key = OctKey.import_key(SECRET_KEY.encode())

# pwdlib password hasher — bcrypt backend, same algorithm as Node.js bcrypt
# Explicitly use bcrypt — recommended() defaults to argon2 which requires a separate install
pwd_hasher = PasswordHash((BcryptHasher(),))

# HTTPBearer extracts the token from "Authorization: Bearer <token>" header
bearer_scheme = HTTPBearer()


def hash_password(plain: str) -> str:
    return pwd_hasher.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_hasher.verify(plain, hashed)


def create_token(user: dict) -> str:
    """
    Create a JWT containing user identity.
    We embed id, name, username, role, teamId so routes never need a DB
    lookup just to identify who is making a request.
    """
    claims = {
        "sub": user["id"],
        "name": user["name"],
        "username": user["username"],
        "role": user["role"],
        "teamId": user.get("teamId"),
        "exp": int((datetime.now(timezone.utc) + timedelta(minutes=EXPIRE_MINUTES)).timestamp()),
    }
    return jwt.encode({"alg": ALGORITHM}, claims, _jwt_key)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    FastAPI dependency — inject into any route that requires auth.
    Usage:  async def my_route(user = Depends(get_current_user)): ...

    Decodes + validates the JWT. Raises 401 if missing/invalid/expired.
    """
    token = credentials.credentials
    try:
        decoded = jwt.decode(token, _jwt_key)
        claims = decoded.claims
        return {
            "id": claims["sub"],
            "name": claims["name"],
            "username": claims["username"],
            "role": claims["role"],
            "teamId": claims.get("teamId"),
        }
    except JoseError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_roles(allowed_roles: list[str]):
    """
    Role-check dependency factory. Usage:
        Depends(require_roles([Roles.ADMIN, Roles.LOGISTICS]))
    Returns the current user if role matches, raises 403 otherwise.
    """
    def check(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user
    return check
