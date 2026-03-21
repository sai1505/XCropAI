from fastapi import Header, HTTPException, Depends, Request
from jose import jwt
import requests
import os
from dotenv import load_dotenv

load_dotenv(override=True)

SUPABASE_URL = os.getenv("SUPABASE_URL")
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"

# We'll use a global variable to cache the keys
cached_jwks = None


def get_jwks(force_refresh=False):
    global cached_jwks
    if cached_jwks is None or force_refresh:
        response = requests.get(JWKS_URL)
        if response.status_code == 200:
            cached_jwks = response.json().get("keys", [])
        else:
            raise Exception("Could not fetch JWKS from Supabase")
    return cached_jwks


def verify_token(request: Request, authorization: str = Header(None)):

    if request.method == "OPTIONS":
        return None

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, detail="Invalid or missing Authorization header"
        )

    token = authorization.split(" ")[1]

    try:
        # 1. Get the kid from the header
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")

        # 2. Find the key in the cache
        keys = get_jwks()
        jwk = next((k for k in keys if k["kid"] == kid), None)

        # 3. If kid not found, refresh cache once (handles rotation)
        if not jwk:
            keys = get_jwks(force_refresh=True)
            jwk = next((k for k in keys if k["kid"] == kid), None)

        if not jwk:
            raise HTTPException(status_code=401, detail="Key ID not found")

        # 4. Decode and verify
        # Note: 'jose' handles the RSA conversion automatically if you pass the JWK dict
        payload = jwt.decode(
            token,
            jwk,
            algorithms=["RS256", "ES256"],
            audience="authenticated",  # Better security than verify_aud: False
            options={"verify_sub": True},
        )

        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")
