#!/usr/bin/env python3
"""Small OpenAI-compatible HTTP client used by NOVA RSI.

The client deliberately has no third-party dependency so the protected RSI path
can run on a clean GitHub Actions runner. Provider credentials are read only from
the process environment and are never included in returned errors.
"""

from __future__ import annotations

import json
import os
import ssl
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from typing import Any


class ProviderError(RuntimeError):
    """A provider connection or protocol failure that is safe to log."""


@dataclass(frozen=True)
class ProviderConfig:
    base_url: str
    model: str | None
    api_key: str = field(repr=False)
    timeout_seconds: int = 120
    max_response_bytes: int = 262_144

    @classmethod
    def from_environment(
        cls,
        *,
        base_url_env: str = "RSI_AI_BASE_URL",
        model_env: str = "RSI_AI_MODEL",
        api_key_env: str = "NOVA_RSI_NOSANA_LLM_API_KEY",
        default_base_url: str | None = None,
        timeout_seconds: int = 120,
        max_response_bytes: int = 262_144,
    ) -> "ProviderConfig":
        base_url = os.environ.get(base_url_env, "").strip() or (default_base_url or "").strip()
        if not base_url:
            raise ProviderError(
                f"{base_url_env} or a protected provider default must be configured."
            )
        model = os.environ.get(model_env, "").strip() or "auto"
        api_key = os.environ.get(api_key_env, "").strip()
        if not api_key:
            raise ProviderError(f"{api_key_env} must be configured before provider access.")
        validate_base_url(base_url)
        return cls(
            base_url=base_url.rstrip("/"),
            model=model,
            api_key=api_key,
            timeout_seconds=timeout_seconds,
            max_response_bytes=max_response_bytes,
        )


def validate_base_url(base_url: str) -> None:
    parsed = urllib.parse.urlparse(base_url)
    if parsed.scheme not in {"https", "http"} or not parsed.netloc:
        raise ProviderError("RSI provider base URL must be an absolute HTTP(S) URL.")
    host = (parsed.hostname or "").lower()
    if parsed.scheme != "https" and host not in {"127.0.0.1", "localhost", "::1"}:
        raise ProviderError("RSI provider traffic must use HTTPS except for local test endpoints.")


def endpoint(base_url: str, suffix: str) -> str:
    normalized = base_url.rstrip("/")
    if normalized.endswith(suffix):
        return normalized
    if normalized.endswith("/v1"):
        return normalized + suffix[3:]
    return normalized + suffix


def _read_limited(response: Any, max_bytes: int) -> bytes:
    content_length = response.headers.get("Content-Length")
    if content_length:
        try:
            if int(content_length) > max_bytes:
                raise ProviderError("RSI provider response exceeded the protected response-size limit.")
        except ValueError:
            pass
    body = response.read(max_bytes + 1)
    if len(body) > max_bytes:
        raise ProviderError("RSI provider response exceeded the protected response-size limit.")
    return body


def _redact(message: str, secret: str) -> str:
    return message.replace(secret, "[REDACTED]")


def _request(
    config: ProviderConfig,
    method: str,
    url: str,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    headers = {
        "Accept": "application/json",
        "User-Agent": "NOVA-RSI/2.0",
        "Authorization": f"Bearer {config.api_key}",
    }
    data = None
    if payload is not None:
        data = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(
            request,
            timeout=config.timeout_seconds,
            context=ssl.create_default_context(),
        ) as response:
            body = _read_limited(response, config.max_response_bytes)
    except urllib.error.HTTPError as exc:
        detail = exc.read(4096).decode("utf-8", errors="replace")
        detail = _redact(detail, config.api_key)
        raise ProviderError(f"RSI provider HTTP {exc.code}: {detail[:1000]}") from exc
    except urllib.error.URLError as exc:
        raise ProviderError(
            f"RSI provider connection failure: {_redact(str(exc), config.api_key)}"
        ) from exc
    except TimeoutError as exc:
        raise ProviderError("RSI provider request timed out.") from exc

    try:
        parsed_payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ProviderError("RSI provider returned a non-JSON response.") from exc
    if not isinstance(parsed_payload, dict):
        raise ProviderError("RSI provider returned a JSON value that is not an object.")
    return parsed_payload


def list_models(config: ProviderConfig) -> list[dict[str, Any]]:
    payload = _request(config, "GET", endpoint(config.base_url, "/v1/models"))
    models = payload.get("data")
    if not isinstance(models, list):
        raise ProviderError("RSI provider model-list response has no data array.")
    return [
        item
        for item in models
        if isinstance(item, dict)
        and isinstance(item.get("id"), str)
        and item["id"].strip()
    ]


def select_model(config: ProviderConfig) -> str:
    requested = (config.model or "auto").strip()
    if requested and requested.lower() != "auto":
        return requested
    models = list_models(config)
    available = [
        str(item["id"]).strip()
        for item in models
        if item.get("available", True) is not False
    ]
    if not available:
        raise ProviderError("RSI provider returned no available models for automatic model selection.")
    return available[0]


def chat_completion(
    config: ProviderConfig,
    messages: list[dict[str, str]],
    max_output_tokens: int,
    temperature: float = 0.1,
) -> tuple[dict[str, Any], str]:
    model = select_model(config)
    payload = _request(
        config,
        "POST",
        endpoint(config.base_url, "/v1/chat/completions"),
        {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_output_tokens,
        },
    )
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        raise ProviderError("RSI provider returned no choices.")
    message = choices[0].get("message") if isinstance(choices[0], dict) else None
    content = message.get("content") if isinstance(message, dict) else None
    if not isinstance(content, str) or not content.strip():
        raise ProviderError("RSI provider returned no textual message content.")
    return payload, model
