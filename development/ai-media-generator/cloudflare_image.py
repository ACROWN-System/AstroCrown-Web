#!/usr/bin/env python3
"""Small, dependency-free Cloudflare Workers AI image adapter for AstroCrown.

This is a development-only first slice. It supports one explicitly selected model,
accepts raw PNG or the documented JSON/base64 image envelope, validates the PNG
container, and writes a local provenance sidecar. It does not approve commercial use.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import struct
import sys
import urllib.error
import urllib.request
import zlib
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

API_HOST = "api.cloudflare.com"
API_PREFIX = "/client/v4/accounts"
MODEL_ID = "@cf/bytedance/stable-diffusion-xl-lightning"
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
MAX_RESPONSE_BYTES = 32 * 1024 * 1024
MAX_PROMPT_LENGTH = 8_000
ACCOUNT_ID_PATTERN = re.compile(r"^[0-9a-fA-F]{32}$")


class ImageGenerationError(RuntimeError):
    """Safe-to-display error without secret or full response-body leakage."""


@dataclass(frozen=True)
class CloudflareConfig:
    account_id: str
    api_token: str = field(repr=False)

    def __post_init__(self) -> None:
        if not ACCOUNT_ID_PATTERN.fullmatch(self.account_id):
            raise ImageGenerationError(
                "CLOUDFLARE_ACCOUNT_ID must be a 32-character hexadecimal account ID."
            )
        if not self.api_token or not self.api_token.strip():
            raise ImageGenerationError("CLOUDFLARE_API_KEY_01 is empty or missing.")
        if any(ch in self.api_token for ch in "\r\n"):
            raise ImageGenerationError("Cloudflare token contains invalid newline characters.")

    @classmethod
    def from_environment(
        cls,
        environ: Mapping[str, str] | None = None,
    ) -> "CloudflareConfig":
        env = os.environ if environ is None else environ
        account_id = env.get("CLOUDFLARE_ACCOUNT_ID", "").strip()
        token = env.get("CLOUDFLARE_API_KEY_01", "")
        if not account_id:
            raise ImageGenerationError("Missing environment variable CLOUDFLARE_ACCOUNT_ID.")
        if not token:
            raise ImageGenerationError("Missing environment variable CLOUDFLARE_API_KEY_01.")
        return cls(account_id=account_id, api_token=token)


class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Reject redirects so a bearer credential cannot be forwarded to another host."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ANN001
        return None


def _validate_inputs(
    prompt: str,
    width: int,
    height: int,
    num_steps: int,
    negative_prompt: str | None,
) -> None:
    if not isinstance(prompt, str) or not prompt.strip():
        raise ImageGenerationError("Prompt must contain non-whitespace text.")
    if len(prompt) > MAX_PROMPT_LENGTH:
        raise ImageGenerationError(f"Prompt exceeds the {MAX_PROMPT_LENGTH}-character limit.")
    if negative_prompt is not None and len(negative_prompt) > MAX_PROMPT_LENGTH:
        raise ImageGenerationError(
            f"Negative prompt exceeds the {MAX_PROMPT_LENGTH}-character limit."
        )
    for label, value in (("width", width), ("height", height)):
        if isinstance(value, bool) or not isinstance(value, int) or not 256 <= value <= 2048:
            raise ImageGenerationError(f"{label} must be an integer between 256 and 2048.")
    if isinstance(num_steps, bool) or not isinstance(num_steps, int) or not 1 <= num_steps <= 20:
        raise ImageGenerationError("num_steps must be an integer between 1 and 20.")


def build_payload(
    prompt: str,
    width: int = 1024,
    height: int = 1024,
    num_steps: int = 4,
    negative_prompt: str | None = None,
    seed: int | None = None,
) -> dict[str, Any]:
    """Build the narrow request contract; no model/provider selection from user input."""
    _validate_inputs(prompt, width, height, num_steps, negative_prompt)
    payload: dict[str, Any] = {
        "prompt": prompt.strip(),
        "width": width,
        "height": height,
        "num_steps": num_steps,
    }
    if negative_prompt:
        payload["negative_prompt"] = negative_prompt
    if seed is not None:
        if isinstance(seed, bool) or not isinstance(seed, int) or seed < 0:
            raise ImageGenerationError("seed must be a non-negative integer.")
        payload["seed"] = seed
    return payload


def validate_png(data: bytes, expected_width: int, expected_height: int) -> dict[str, int]:
    """Validate PNG signature, chunk structure/CRCs, compressed image data and dimensions."""
    if not isinstance(data, bytes) or len(data) < 45 or not data.startswith(PNG_SIGNATURE):
        raise ImageGenerationError("Provider output is not a valid PNG image.")
    if len(data) > MAX_RESPONSE_BYTES:
        raise ImageGenerationError("PNG output exceeds the configured size limit.")

    if (
        isinstance(expected_width, bool)
        or isinstance(expected_height, bool)
        or not isinstance(expected_width, int)
        or not isinstance(expected_height, int)
        or not 256 <= expected_width <= 2048
        or not 256 <= expected_height <= 2048
    ):
        raise ImageGenerationError("Expected dimensions must be between 256 and 2048.")

    offset = len(PNG_SIGNATURE)
    width = height = 0
    bit_depth = color_type = 0
    seen_ihdr = False
    seen_idat = False
    seen_iend = False
    idat_parts: list[bytes] = []
    chunk_count = 0

    while offset + 12 <= len(data):
        chunk_count += 1
        if chunk_count > 10_000:
            raise ImageGenerationError("PNG has too many chunks.")
        chunk_length = struct.unpack(">I", data[offset : offset + 4])[0]
        chunk_type = data[offset + 4 : offset + 8]
        chunk_end = offset + 12 + chunk_length
        if chunk_length > MAX_RESPONSE_BYTES or chunk_end > len(data):
            raise ImageGenerationError("PNG contains a truncated or oversized chunk.")
        chunk_data = data[offset + 8 : offset + 8 + chunk_length]
        declared_crc = struct.unpack(">I", data[offset + 8 + chunk_length : chunk_end])[0]
        actual_crc = zlib.crc32(chunk_type)
        actual_crc = zlib.crc32(chunk_data, actual_crc) & 0xFFFFFFFF
        if actual_crc != declared_crc:
            raise ImageGenerationError("PNG chunk checksum verification failed.")

        if not seen_ihdr:
            if chunk_type != b"IHDR" or chunk_length != 13:
                raise ImageGenerationError("PNG is missing its required IHDR header.")
            width, height, bit_depth, color_type, compression, filtering, interlace = struct.unpack(
                ">IIBBBBB", chunk_data
            )
            if width <= 0 or height <= 0:
                raise ImageGenerationError("PNG declares invalid dimensions.")
            if bit_depth not in (1, 2, 4, 8, 16) or color_type not in (0, 2, 3, 4, 6):
                raise ImageGenerationError("PNG declares an unsupported color format.")
            if compression != 0 or filtering != 0 or interlace not in (0, 1):
                raise ImageGenerationError("PNG declares unsupported encoding flags.")
            seen_ihdr = True
        elif chunk_type == b"IHDR":
            raise ImageGenerationError("PNG contains more than one IHDR header.")

        if chunk_type == b"IDAT":
            seen_idat = True
            idat_parts.append(chunk_data)
        if chunk_type == b"IEND":
            if chunk_length != 0:
                raise ImageGenerationError("PNG IEND chunk must be empty.")
            seen_iend = True
            offset = chunk_end
            break

        offset = chunk_end

    if not (seen_ihdr and seen_idat and seen_iend) or offset != len(data):
        raise ImageGenerationError("PNG is incomplete or contains unexpected trailing data.")
    if width != expected_width or height != expected_height:
        raise ImageGenerationError(
            f"PNG dimensions were {width}x{height}; expected {expected_width}x{expected_height}."
        )
    # Bound decompression to the maximum plausible 16-bit RGBA image of the
    # requested dimensions plus per-row/interlace overhead. This avoids a
    # compressed-response expansion bomb from exhausting runner memory.
    max_decoded_bytes = expected_width * expected_height * 8 + expected_height * 8 + 4096
    decoder = zlib.decompressobj()
    try:
        decoded = decoder.decompress(b"".join(idat_parts), max_decoded_bytes + 1)
    except zlib.error as exc:
        raise ImageGenerationError("PNG image data is not valid compressed data.") from exc
    if len(decoded) > max_decoded_bytes or decoder.unconsumed_tail:
        raise ImageGenerationError("PNG decompressed image data exceeds the configured size limit.")
    if not decoder.eof or decoder.unused_data:
        raise ImageGenerationError("PNG compressed image data is incomplete or contains trailing data.")
    if not decoded:
        raise ImageGenerationError("PNG contains empty decoded image data.")
    return {"width": width, "height": height}


def _extract_png(
    response_body: bytes,
    content_type: str,
    expected_width: int,
    expected_height: int,
) -> tuple[bytes, str | None]:
    # Cloudflare's current SDXL-Lightning REST schema specifies binary image/png.
    # Do not accept generic JSON/base64 alternatives unless the official model
    # contract changes and is deliberately requalified.
    if content_type != "image/png":
        raise ImageGenerationError(
            f"Cloudflare returned content type {content_type or 'unknown'}; expected image/png."
        )
    validate_png(response_body, expected_width, expected_height)
    return response_body, None


def request_image(
    config: CloudflareConfig,
    prompt: str,
    width: int = 1024,
    height: int = 1024,
    num_steps: int = 4,
    negative_prompt: str | None = None,
    seed: int | None = None,
    timeout_seconds: int = 120,
    opener=None,
) -> tuple[bytes, str | None]:
    """Call the one fixed Cloudflare endpoint and return validated PNG bytes + request ID."""
    payload = build_payload(prompt, width, height, num_steps, negative_prompt, seed)
    if isinstance(timeout_seconds, bool) or not isinstance(timeout_seconds, int) or not 1 <= timeout_seconds <= 300:
        raise ImageGenerationError("timeout_seconds must be an integer between 1 and 300.")
    url = (
        f"https://{API_HOST}{API_PREFIX}/{config.account_id}/ai/run/"
        f"{MODEL_ID}"
    )
    request = urllib.request.Request(
        url=url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {config.api_token}",
            "Content-Type": "application/json",
            "Accept": "application/json, image/png",
            "User-Agent": "AstroCrown-Image-MVP/0.1",
        },
        method="POST",
    )
    safe_opener = opener or urllib.request.build_opener(NoRedirectHandler())
    try:
        with safe_opener.open(request, timeout=timeout_seconds) as response:
            body = response.read(MAX_RESPONSE_BYTES + 1)
            content_type = response.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
            if len(body) > MAX_RESPONSE_BYTES:
                raise ImageGenerationError("Cloudflare response exceeds the configured size limit.")
            return _extract_png(body, content_type, width, height)
    except urllib.error.HTTPError as exc:
        if exc.code in (301, 302, 303, 307, 308):
            raise ImageGenerationError(
                f"Cloudflare endpoint returned HTTP {exc.code}; redirects are rejected."
            ) from exc
        raise ImageGenerationError(
            f"Cloudflare image request failed with HTTP {exc.code}; check endpoint access, permissions and quota."
        ) from exc
    except urllib.error.URLError as exc:
        reason = getattr(exc, "reason", None)
        if isinstance(reason, TimeoutError):
            raise ImageGenerationError("Cloudflare image request timed out.") from exc
        raise ImageGenerationError("Cloudflare image endpoint could not be reached.") from exc
    except TimeoutError as exc:
        raise ImageGenerationError("Cloudflare image request timed out.") from exc


def write_artifact(
    output_path: str | Path,
    png_bytes: bytes,
    prompt: str,
    width: int,
    height: int,
    num_steps: int,
    seed: int | None,
    request_id: str | None,
) -> tuple[Path, Path]:
    """Create a PNG and provenance sidecar without overwriting either existing file."""
    output = Path(output_path).expanduser()
    if output.suffix.lower() != ".png":
        raise ImageGenerationError("Output path must end in .png.")
    build_payload(prompt, width, height, num_steps, seed=seed)
    validated = validate_png(png_bytes, width, height)
    metadata_path = output.with_name(output.name + ".metadata.json")
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists() or metadata_path.exists():
        raise ImageGenerationError("Output or metadata file already exists; refusing to overwrite.")

    metadata = {
        "schema_version": 1,
        "provider": "cloudflare_workers_ai",
        "model": MODEL_ID,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "prompt": prompt.strip(),
        "parameters": {
            "width": width,
            "height": height,
            "num_steps": num_steps,
            "seed": seed,
        },
        "output": {
            "file_name": output.name,
            "mime_type": "image/png",
            "sha256": hashlib.sha256(png_bytes).hexdigest(),
            "bytes": len(png_bytes),
            **validated,
        },
        "provider_request_id": request_id,
        "rights_status": "NOT_YET_QUALIFIED_FOR_COMMERCIAL_PROMOTION",
        "alpha_status": "NOT_ASSERTED; inspect the PNG alpha channel and edge quality before using as a transparent layer",
    }
    created_output = False
    created_metadata = False
    try:
        with output.open("xb") as image_file:
            created_output = True
            image_file.write(png_bytes)
        with metadata_path.open("x", encoding="utf-8") as metadata_file:
            created_metadata = True
            json.dump(metadata, metadata_file, ensure_ascii=False, indent=2)
            metadata_file.write("\n")
    except Exception:
        # Only remove files this invocation successfully created; never delete a
        # concurrently created or pre-existing file after an exclusive-open failure.
        if created_output:
            try:
                output.unlink(missing_ok=True)
            except OSError:
                pass
        if created_metadata:
            try:
                metadata_path.unlink(missing_ok=True)
            except OSError:
                pass
        raise
    return output, metadata_path


def generate_to_file(
    config: CloudflareConfig,
    prompt: str,
    output_path: str | Path,
    width: int = 1024,
    height: int = 1024,
    num_steps: int = 4,
    negative_prompt: str | None = None,
    seed: int | None = None,
    timeout_seconds: int = 120,
    opener=None,
) -> tuple[Path, Path]:
    png_bytes, request_id = request_image(
        config=config,
        prompt=prompt,
        width=width,
        height=height,
        num_steps=num_steps,
        negative_prompt=negative_prompt,
        seed=seed,
        timeout_seconds=timeout_seconds,
        opener=opener,
    )
    return write_artifact(
        output_path=output_path,
        png_bytes=png_bytes,
        prompt=prompt,
        width=width,
        height=height,
        num_steps=num_steps,
        seed=seed,
        request_id=request_id,
    )


def _argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    prompt = parser.add_mutually_exclusive_group(required=True)
    prompt.add_argument("--prompt", help="Non-sensitive visual prompt. Do not supply secrets or private data.")
    prompt.add_argument(
        "--prompt-env",
        metavar="ENV_NAME",
        help="Read prompt text from the named environment variable (recommended in CI).",
    )
    parser.add_argument("--output", required=True, help="Output PNG path; existing files are never overwritten.")
    parser.add_argument("--width", type=int, default=1024)
    parser.add_argument("--height", type=int, default=1024)
    parser.add_argument("--steps", type=int, default=4)
    parser.add_argument("--negative-prompt")
    parser.add_argument("--seed", type=int)
    parser.add_argument("--timeout-seconds", type=int, default=120)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _argument_parser().parse_args(argv)
    try:
        if args.prompt_env:
            prompt = os.environ.get(args.prompt_env)
            if prompt is None:
                raise ImageGenerationError(f"Prompt environment variable {args.prompt_env} is missing.")
        else:
            prompt = args.prompt
        config = CloudflareConfig.from_environment()
        image_path, metadata_path = generate_to_file(
            config=config,
            prompt=prompt,
            output_path=args.output,
            width=args.width,
            height=args.height,
            num_steps=args.steps,
            negative_prompt=args.negative_prompt,
            seed=args.seed,
            timeout_seconds=args.timeout_seconds,
        )
    except ImageGenerationError as exc:
        print(f"Image generation blocked: {exc}", file=sys.stderr)
        return 2
    except OSError:
        print("Image generation failed while writing output files.", file=sys.stderr)
        return 3

    print(f"Validated image saved: {image_path}")
    print(f"Provenance saved: {metadata_path}")
    print("Commercial use and alpha transparency remain unqualified until separately verified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
