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


DEFAULT_ALLOWED_HOSTS = ("inference.nosana.com",)


class _NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Do not follow endpoint-controlled redirects with a bearer credential."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


@dataclass(frozen=True)
class ProviderConfig:
    base_url: str
    model: str | None
    api_key: str = field(repr=False)
    timeout_seconds: int = 120
    max_response_bytes: int = 262_144
    allowed_hosts: tuple[str, ...] = DEFAULT_ALLOWED_HOSTS
    allow_local_http: bool = False

    def __post_init__(self) -> None:
        validate_base_url(
            self.base_url,
            allowed_hosts=self.allowed_hosts,
            allow_local_http=self.allow_local_http,
        )
        if self.timeout_seconds <= 0:
            raise ProviderError("RSI provider timeout must be positive.")
        if self.max_response_bytes <= 0:
            raise ProviderError("RSI provider response-size limit must be positive.")

    @classmethod
    def from_environment(
        cls,
        *,
        base_url_env: str = "RSI_AI_BASE_URL",
        model_env: str = "RSI_AI_MODEL",
        api_key_env: str = "NOSANA_LLM_API_KEY_01",
        default_base_url: str | None = None,
        timeout_seconds: int = 120,
        max_response_bytes: int = 262_144,
        allowed_hosts: tuple[str, ...] | list[str] | None = None,
        allow_local_http: bool = False,
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
        configured_hosts = (
            tuple(allowed_hosts)
            if allowed_hosts is not None
            else DEFAULT_ALLOWED_HOSTS
        )
        validate_base_url(
            base_url,
            allowed_hosts=configured_hosts,
            allow_local_http=allow_local_http,
        )
        return cls(
            base_url=base_url.rstrip("/"),
            model=model,
            api_key=api_key,
            timeout_seconds=timeout_seconds,
            max_response_bytes=max_response_bytes,
            allowed_hosts=configured_hosts,
            allow_local_http=allow_local_http,
        )


def validate_base_url(
    base_url: str,
    *,
    allowed_hosts: tuple[str, ...] | list[str] | None = None,
    allow_local_http: bool = False,
) -> None:
    parsed = urllib.parse.urlparse(base_url)
    if parsed.scheme not in {"https", "http"} or not parsed.netloc:
        raise ProviderError("RSI provider base URL must be an absolute HTTP(S) URL.")
    if parsed.username is not None or parsed.password is not None:
        raise ProviderError("RSI provider base URL must not contain embedded credentials.")
    if parsed.query or parsed.fragment:
        raise ProviderError("RSI provider base URL must not contain a query or fragment.")
    try:
        port = parsed.port
    except ValueError as exc:
        raise ProviderError("RSI provider base URL contains an invalid port.") from exc

    host = (parsed.hostname or "").lower().rstrip(".")
    if not host:
        raise ProviderError("RSI provider base URL has no valid hostname.")
    local_hosts = {"127.0.0.1", "localhost", "::1"}
    if parsed.scheme == "http":
        if allow_local_http and host in local_hosts:
            return
        raise ProviderError(
            "RSI provider traffic must use HTTPS; local HTTP requires an explicit test-only opt-in."
        )

    raw_hosts = DEFAULT_ALLOWED_HOSTS if allowed_hosts is None else allowed_hosts
    if not isinstance(raw_hosts, (tuple, list)) or not raw_hosts:
        raise ProviderError("RSI provider host allowlist is empty or malformed.")
    if any(not isinstance(item, str) or not item.strip() for item in raw_hosts):
        raise ProviderError("RSI provider host allowlist contains an invalid entry.")
    approved_hosts = {item.strip().lower().rstrip(".") for item in raw_hosts}
    if host not in approved_hosts:
        raise ProviderError(
            f"RSI provider hostname is not in the protected allowlist: {host}."
        )
    if port not in (None, 443):
        raise ProviderError("RSI provider HTTPS endpoint must use the standard port 443.")


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
        opener = urllib.request.build_opener(
            _NoRedirectHandler,
            urllib.request.HTTPSHandler(context=ssl.create_default_context()),
        )
        with opener.open(request, timeout=config.timeout_seconds) as response:
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
