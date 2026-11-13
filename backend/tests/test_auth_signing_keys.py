"""Regression tests for Supabase signing-key migration.

Once a project moves to asymmetric JWT signing keys and revokes HS256, a token
signed with the retired `SUPABASE_JWT_SECRET` must not authenticate anything. The
secret was exposed, so the legacy path is opt-in: it needs both the secret and
`SUPABASE_ALLOW_LEGACY_HS256=1`.

These tests also pin the PostgREST header contract: an opaque `sb_secret_...`
key travels in `apikey` only, because PostgREST rejects it as a bearer token.
"""

from __future__ import annotations

import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec

from backend.core import auth, persistence

LEGACY_SECRET = "legacy-hs256-secret-that-was-exposed"


@pytest.fixture(autouse=True)
def _clean_env(monkeypatch):
    for name in ("SUPABASE_JWT_SECRET", "SUPABASE_ALLOW_LEGACY_HS256", "SUPABASE_URL"):
        monkeypatch.delenv(name, raising=False)
    auth._reset_clients_for_tests()
    yield
    auth._reset_clients_for_tests()


def _claims(sub: str = "user-1") -> dict:
    now = int(time.time())
    return {"sub": sub, "aud": "authenticated", "iat": now, "exp": now + 300}


def test_hs256_token_rejected_when_only_the_secret_is_present(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", LEGACY_SECRET)
    token = jwt.encode(_claims(), LEGACY_SECRET, algorithm="HS256")

    assert auth.verify_supabase_jwt(token) is None


def test_hs256_token_rejected_when_only_the_flag_is_present(monkeypatch):
    monkeypatch.setenv("SUPABASE_ALLOW_LEGACY_HS256", "1")
    token = jwt.encode(_claims(), LEGACY_SECRET, algorithm="HS256")

    assert auth.verify_supabase_jwt(token) is None


def test_hs256_token_accepted_only_with_secret_and_explicit_flag(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", LEGACY_SECRET)
    monkeypatch.setenv("SUPABASE_ALLOW_LEGACY_HS256", "1")
    token = jwt.encode(_claims("user-legacy"), LEGACY_SECRET, algorithm="HS256")

    claims = auth.verify_supabase_jwt(token)

    assert claims is not None and claims["sub"] == "user-legacy"


def test_es256_token_verified_against_jwks_even_with_legacy_secret_present(monkeypatch):
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()
    token = jwt.encode(_claims("user-es256"), private_key, algorithm="ES256", headers={"kid": "k1"})

    class _SigningKey:
        key = public_key

    class _Client:
        def get_signing_key_from_jwt(self, _token):
            return _SigningKey()

    monkeypatch.setenv("SUPABASE_JWT_SECRET", LEGACY_SECRET)
    monkeypatch.setattr(auth, "_get_jwks_client", lambda: _Client())

    claims = auth.verify_supabase_jwt(token)

    assert claims is not None and claims["sub"] == "user-es256"


def test_es256_token_rejected_when_signature_does_not_match(monkeypatch):
    signing_key = ec.generate_private_key(ec.SECP256R1())
    other_key = ec.generate_private_key(ec.SECP256R1())
    token = jwt.encode(_claims(), signing_key, algorithm="ES256", headers={"kid": "k1"})

    class _SigningKey:
        key = other_key.public_key()

    class _Client:
        def get_signing_key_from_jwt(self, _token):
            return _SigningKey()

    monkeypatch.setattr(auth, "_get_jwks_client", lambda: _Client())

    assert auth.verify_supabase_jwt(token) is None


def test_opaque_secret_key_is_sent_in_apikey_only():
    headers = persistence._auth_headers("sb_secret_abcdef123456")

    assert headers["apikey"] == "sb_secret_abcdef123456"
    assert "Authorization" not in headers


def test_legacy_jwt_key_is_sent_in_both_headers():
    legacy = jwt.encode(_claims(), LEGACY_SECRET, algorithm="HS256")
    headers = persistence._auth_headers(legacy)

    assert headers["apikey"] == legacy
    assert headers["Authorization"] == f"Bearer {legacy}"
