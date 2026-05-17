import os
import jwt
from datetime import datetime, timedelta
from passlib.hash import bcrypt_sha256
from fastapi import HTTPException, Header
from typing import Optional

SECRET = os.environ.get("JWT_SECRET", "icgd-default-secret-change-in-prod-2026")
ALGO = "HS256"
EXPIRE_DAYS = 7


def hash_password(pw: str) -> str:
    return bcrypt_sha256.hash(pw)


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt_sha256.verify(pw, hashed)
    except Exception:
        return False


def create_token(sub: str, typ: str = "admin") -> str:
    payload = {
        "sub": sub,
        "typ": typ,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(days=EXPIRE_DAYS),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGO)


def decode_token(token: str, expected_typ: Optional[str] = None) -> Optional[str]:
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGO])
        if expected_typ and payload.get("typ", "admin") != expected_typ:
            return None
        return payload.get("sub")
    except jwt.PyJWTError:
        return None


async def require_admin(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1].strip()
    username = decode_token(token, expected_typ="admin")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return username


async def require_member(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ", 1)[1].strip()
    member_id = decode_token(token, expected_typ="member")
    if not member_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return member_id
