#!/usr/bin/env python3
"""Read the quota attached to a local New API sub-key."""

from __future__ import annotations

import argparse
import os
import sys
from decimal import Decimal, InvalidOperation
from pathlib import Path

try:
    import requests
except ImportError:
    print("Falta 'requests'. Instale con: python -m pip install requests", file=sys.stderr)
    raise SystemExit(2)


def load_dotenv(path: Path = Path(".env")) -> None:
    if not path.is_file():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        os.environ.setdefault(key.strip(), value)


def require_api_key(value: str) -> str:
    if not value or "replace-with" in value:
        print(
            "Configure NEW_API_KEY en .env o use --api-key con la sub-clave local.",
            file=sys.stderr,
        )
        raise SystemExit(2)
    return value


def origin_from_base_url(base_url: str) -> str:
    value = base_url.rstrip("/")
    return value[:-3] if value.endswith("/v1") else value


def format_usd(quota: object, quota_per_unit: object) -> str:
    try:
        amount = Decimal(str(quota)) / Decimal(str(quota_per_unit))
    except (InvalidOperation, ZeroDivisionError):
        return "N/D"
    return f"USD {amount:.6f}"


def main() -> int:
    load_dotenv()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=os.getenv("NEW_API_BASE_URL", "http://localhost:3000/v1"))
    parser.add_argument("--api-key", default=os.getenv("NEW_API_KEY", ""))
    parser.add_argument("--timeout", type=float, default=float(os.getenv("REQUEST_TIMEOUT", "120")))
    args = parser.parse_args()

    api_key = require_api_key(args.api_key)
    origin = origin_from_base_url(args.base_url)
    headers = {"Authorization": f"Bearer {api_key}"}

    try:
        response = requests.get(f"{origin}/api/usage/token/", headers=headers, timeout=args.timeout)
    except requests.RequestException as exc:
        print(f"Error de conexion: {exc}", file=sys.stderr)
        return 1

    print(f"Codigo HTTP: {response.status_code}")
    try:
        body = response.json()
    except ValueError:
        print(f"Respuesta no JSON: {response.text[:2000]}", file=sys.stderr)
        return 1
    if not response.ok or not body.get("code"):
        print(f"Error: {body}", file=sys.stderr)
        return 1

    usage = body.get("data") or {}
    quota_per_unit: object = 500000
    try:
        status_response = requests.get(f"{origin}/api/status", timeout=args.timeout)
        if status_response.ok:
            quota_per_unit = (status_response.json().get("data") or {}).get(
                "quota_per_unit", quota_per_unit
            )
    except (requests.RequestException, ValueError):
        pass

    print(f"Sub-clave: {usage.get('name', 'N/D')}")
    print(f"Cuota otorgada: {usage.get('total_granted', 'N/D')} unidades")
    print(f"Cuota consumida: {usage.get('total_used', 'N/D')} unidades")
    print(f"Saldo restante: {usage.get('total_available', 'N/D')} unidades")
    print(f"Saldo aproximado: {format_usd(usage.get('total_available'), quota_per_unit)}")
    print(f"Cuota ilimitada: {usage.get('unlimited_quota', False)}")
    print(f"Vencimiento Unix: {usage.get('expires_at', 0)} (0 = sin vencimiento)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
