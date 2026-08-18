#!/usr/bin/env python3
"""Send an OpenAI-compatible chat request through the local New API relay."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

try:
    import requests
except ImportError:
    print("Falta 'requests'. Instale con: python -m pip install requests", file=sys.stderr)
    raise SystemExit(2)


def load_dotenv(path: Path = Path(".env")) -> None:
    """Load the small KEY=VALUE subset needed by this local test project."""
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


def message_text(data: dict[str, Any]) -> str:
    choices = data.get("choices") or []
    if not choices:
        return "(la respuesta no contiene choices)"
    content = (choices[0].get("message") or {}).get("content")
    if isinstance(content, str):
        return content
    return json.dumps(content, ensure_ascii=False)


def main() -> int:
    load_dotenv()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=os.getenv("NEW_API_BASE_URL", "http://localhost:3000/v1"))
    parser.add_argument("--api-key", default=os.getenv("NEW_API_KEY", ""))
    parser.add_argument("--model", default=os.getenv("TEST_MODEL", "gpt-4o-mini"))
    parser.add_argument("--prompt", default="Responde solamente: relay local funcionando")
    parser.add_argument("--timeout", type=float, default=float(os.getenv("REQUEST_TIMEOUT", "120")))
    args = parser.parse_args()

    api_key = require_api_key(args.api_key)
    url = f"{args.base_url.rstrip('/')}/chat/completions"
    payload = {
        "model": args.model,
        "messages": [{"role": "user", "content": args.prompt}],
        "max_tokens": 80,
        "temperature": 0,
        "stream": False,
    }

    try:
        response = requests.post(
            url,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
            timeout=args.timeout,
        )
    except requests.RequestException as exc:
        print(f"Error de conexion: {exc}", file=sys.stderr)
        return 1

    print(f"Codigo HTTP: {response.status_code}")
    try:
        data = response.json()
    except ValueError:
        print(f"Respuesta no JSON: {response.text[:2000]}", file=sys.stderr)
        return 1

    if not response.ok:
        print(json.dumps(data, ensure_ascii=False, indent=2), file=sys.stderr)
        return 1

    usage = data.get("usage") or {}
    print(f"Modelo: {data.get('model', args.model)}")
    print(f"Respuesta: {message_text(data)}")
    print(f"Tokens prompt: {usage.get('prompt_tokens', 'N/D')}")
    print(f"Tokens completion: {usage.get('completion_tokens', 'N/D')}")
    print(f"Tokens total: {usage.get('total_tokens', 'N/D')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
