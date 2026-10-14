import io
import json
import os
import struct
import tempfile
import unittest
import sys
import urllib.error
import zlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from cloudflare_image import (
    CloudflareConfig,
    ImageGenerationError,
    MODEL_ID,
    build_payload,
    request_image,
    validate_jpeg,
    validate_png,
    write_artifact,
)


def png_chunk(kind: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(kind)
    crc = zlib.crc32(data, crc) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", crc)


def make_jpeg(width: int = 256, height: int = 256) -> bytes:
    # Synthetic JPEG container fixture for testing marker parsing and dimensions.
    # This exercises structural validation, not a full JPEG entropy decode.
    sof_payload = bytes([8]) + struct.pack(">HH", height, width) + bytes([3]) + b"\x01\x11\x00\x02\x11\x00\x03\x11\x00"
    sos_payload = bytes([3]) + b"\x01\x00\x02\x11\x03\x11" + bytes([0, 63, 0])
    return (
        b"\xff\xd8"
        + b"\xff\xe0" + struct.pack(">H", 4) + b"\x00\x00"
        + b"\xff\xc0" + struct.pack(">H", 17) + sof_payload
        + b"\xff\xda" + struct.pack(">H", 12) + sos_payload
        + b"\x01\x02\x03\x04"
        + b"\xff\xd9"
    )


def make_png(width: int = 256, height: int = 256) -> bytes:
    # Valid, single-frame RGBA PNG used only as a deterministic test fixture.
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    raw = b"".join(b"\x00" + b"\x00\x00\x00\xff" * width for _ in range(height))
    return (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", ihdr)
        + png_chunk(b"IDAT", zlib.compress(raw))
        + png_chunk(b"IEND", b"")
    )


class FakeResponse:
    def __init__(self, body: bytes, content_type: str = "application/json"):
        self.body = body
        self.headers = {"Content-Type": content_type}
        self.closed = False

    def read(self, size: int = -1) -> bytes:
        if size >= 0:
            return self.body[:size]
        return self.body

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        self.closed = True


class FakeOpener:
    def __init__(self, response=None, error=None):
        self.response = response
        self.error = error
        self.request = None
        self.timeout = None

    def open(self, request, timeout=0):
        self.request = request
        self.timeout = timeout
        if self.error:
            raise self.error
        return self.response


class CloudflareImageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.png = make_png()

    def setUp(self):
        self.config = CloudflareConfig(
            account_id="192d02742a7bc26050754deac97c1dff",
            api_token="test-token-never-log",
        )

    def test_payload_uses_fixed_model_and_only_supported_optional_fields(self):
        payload = build_payload("  deep space  ", width=512, height=768, num_steps=4)
        self.assertEqual(payload, {
            "prompt": "deep space",
            "width": 512,
            "height": 768,
            "num_steps": 4,
        })
        self.assertEqual(MODEL_ID, "@cf/bytedance/stable-diffusion-xl-lightning")
        self.assertEqual(build_payload("odd-but-documented-dimension", width=1025)["width"], 1025)

    def test_payload_rejects_empty_prompt_invalid_dimensions_steps_and_seed(self):
        for args in (
            ("   ", 1024, 1024, 4, None),
            ("x", 255, 1024, 4, None),
            ("x", 1024, 1024, 0, None),
            ("x", 2049, 1024, 4, None),
        ):
            with self.subTest(args=args), self.assertRaises(ImageGenerationError):
                build_payload(*args)
        with self.assertRaises(ImageGenerationError):
            build_payload("x", seed=-1)

    def test_missing_or_invalid_credentials_fail_before_network(self):
        with self.assertRaisesRegex(ImageGenerationError, "ASTROCROWN_CLOUDFLARE_AI_TOKEN"):
            CloudflareConfig.from_environment({"CLOUDFLARE_ACCOUNT_ID": self.config.account_id})
        with self.assertRaisesRegex(ImageGenerationError, "32-character hexadecimal"):
            CloudflareConfig("not-an-account-id", "token")
        with self.assertRaisesRegex(ImageGenerationError, "newline"):
            CloudflareConfig(self.config.account_id, "token\n")

    def test_accepts_raw_png_and_sends_authorized_fixed_host_request(self):
        opener = FakeOpener(FakeResponse(self.png, "image/png"))
        result, request_id, provider_content_type = request_image(
            self.config, "space nebula", width=256, height=256, opener=opener
        )
        self.assertEqual(result, self.png)
        self.assertIsNone(request_id)
        self.assertEqual(provider_content_type, "image/png")
        self.assertIn("https://api.cloudflare.com/client/v4/accounts/", opener.request.full_url)
        self.assertIn(MODEL_ID, opener.request.full_url)
        self.assertEqual(opener.request.get_header("Authorization"), "Bearer test-token-never-log")
        sent = json.loads(opener.request.data.decode("utf-8"))
        self.assertEqual(sent["prompt"], "space nebula")
        self.assertEqual(opener.timeout, 120)

    def test_rejects_unverified_json_response_format(self):
        body = json.dumps({"success": True, "result": {"image": "not-used"}}).encode()
        with self.assertRaisesRegex(ImageGenerationError, "unexpected content type") as caught:
            request_image(
                self.config, "logo", 256, 256,
                opener=FakeOpener(FakeResponse(body, "application/json")),
            )
        self.assertNotIn("not-used", str(caught.exception))

    def test_accepts_validated_jpeg_even_when_cloudflare_declares_image_png(self):
        jpeg = make_jpeg()
        image, request_id, declared_content_type = request_image(
            self.config, "space nebula", width=256, height=256,
            opener=FakeOpener(FakeResponse(jpeg, "image/png")),
        )
        self.assertEqual(image, jpeg)
        self.assertIsNone(request_id)
        self.assertEqual(declared_content_type, "image/png")

    def test_rejects_malformed_response_and_dimension_mismatch(self):
        with self.assertRaisesRegex(ImageGenerationError, "unexpected content type"):
            request_image(self.config, "logo", 256, 256, opener=FakeOpener(FakeResponse(b"not image")))
        with self.assertRaisesRegex(ImageGenerationError, "not a recognized PNG or JPEG") as caught:
            request_image(
                self.config, "logo", 256, 256,
                opener=FakeOpener(FakeResponse(b'{"errors":["secret-like"],"success":false}', "image/png")),
            )
        self.assertNotIn("secret-like", str(caught.exception))
        with self.assertRaisesRegex(ImageGenerationError, "Refusing MIME mismatch"):
            request_image(
                self.config, "logo", 256, 256,
                opener=FakeOpener(FakeResponse(self.png, "image/jpeg")),
            )
        other_size = make_png(512, 256)
        with self.assertRaisesRegex(ImageGenerationError, "expected 256x256"):
            request_image(
                self.config, "logo", 256, 256,
                opener=FakeOpener(FakeResponse(other_size, "image/png")),
            )

    def test_rejects_http_errors_and_redirects_without_echoing_body(self):
        http_error = urllib.error.HTTPError(
            "https://api.cloudflare.com/", 503, "unavailable", {}, io.BytesIO(b"token=private")
        )
        with self.assertRaisesRegex(ImageGenerationError, "HTTP 503") as caught:
            request_image(self.config, "logo", 256, 256, opener=FakeOpener(error=http_error))
        self.assertNotIn("token=private", str(caught.exception))

        redirect = urllib.error.HTTPError(
            "https://api.cloudflare.com/", 302, "redirect", {}, io.BytesIO(b"")
        )
        with self.assertRaisesRegex(ImageGenerationError, "redirects are rejected"):
            request_image(self.config, "logo", 256, 256, opener=FakeOpener(error=redirect))

    def test_validates_png_signature_chunk_crc_compression_and_dimensions(self):
        self.assertEqual(validate_png(self.png, 256, 256), {"width": 256, "height": 256})
        corrupted = bytearray(self.png)
        # IHDR checksum starts at byte 29 in this test fixture.
        corrupted[29] ^= 0x01
        with self.assertRaisesRegex(ImageGenerationError, "checksum"):
            validate_png(bytes(corrupted), 256, 256)
        with self.assertRaisesRegex(ImageGenerationError, "not a valid PNG"):
            validate_png(b"not a png", 256, 256)
        with self.assertRaisesRegex(ImageGenerationError, "trailing data|incomplete"):
            validate_png(self.png + b"junk", 256, 256)

    def test_validates_jpeg_structure_and_dimensions_and_rejects_truncation(self):
        jpeg = make_jpeg()
        self.assertEqual(validate_jpeg(jpeg, 256, 256), {"width": 256, "height": 256})
        with self.assertRaisesRegex(ImageGenerationError, "expected 256x256"):
            validate_jpeg(make_jpeg(512, 256), 256, 256)
        with self.assertRaisesRegex(ImageGenerationError, "end marker"):
            validate_jpeg(jpeg[:-2], 256, 256)

    def test_rejects_compressed_image_expansion_bomb(self):
        ihdr = struct.pack(">IIBBBBB", 256, 256, 8, 6, 0, 0, 0)
        oversized_decoded = zlib.compress(b"\x00" * 600_000)
        malicious = (
            b"\x89PNG\r\n\x1a\n"
            + png_chunk(b"IHDR", ihdr)
            + png_chunk(b"IDAT", oversized_decoded)
            + png_chunk(b"IEND", b"")
        )
        with self.assertRaisesRegex(ImageGenerationError, "decompressed image data exceeds"):
            validate_png(malicious, 256, 256)

    def test_writes_provenance_and_refuses_to_overwrite(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            target = Path(temp_dir) / "first-image.png"
            image_path, metadata_path = write_artifact(
                target, self.png, "AstroCrown logo test", 256, 256, 4, 17, "req-1"
            )
            self.assertEqual(image_path.read_bytes(), self.png)
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
            self.assertEqual(metadata["provider"], "cloudflare_workers_ai")
            self.assertEqual(metadata["model"], MODEL_ID)
            self.assertEqual(metadata["prompt"], "AstroCrown logo test")
            self.assertEqual(metadata["parameters"]["seed"], 17)
            self.assertEqual(metadata["output"]["sha256"], __import__("hashlib").sha256(self.png).hexdigest())
            self.assertEqual(metadata["alpha_status"].split(";")[0], "NOT_ASSERTED")
            with self.assertRaisesRegex(ImageGenerationError, "refusing to overwrite"):
                write_artifact(target, self.png, "second run", 256, 256, 4, None, None)
            self.assertEqual(image_path.read_bytes(), self.png)

    def test_jpeg_output_uses_truthful_extension_and_records_mime_drift(self):
        jpeg = make_jpeg()
        with tempfile.TemporaryDirectory() as temp_dir:
            requested = Path(temp_dir) / "first-image.png"
            image_path, metadata_path = write_artifact(
                requested, jpeg, "AstroCrown image test", 256, 256, 4, None, None,
                provider_content_type="image/png",
            )
            self.assertEqual(image_path.name, "first-image.jpg")
            self.assertEqual(image_path.read_bytes(), jpeg)
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
            self.assertEqual(metadata["provider_response"]["declared_content_type"], "image/png")
            self.assertEqual(metadata["provider_response"]["detected_format"], "jpeg")
            self.assertEqual(metadata["provider_response"]["detected_mime_type"], "image/jpeg")
            self.assertFalse(metadata["provider_response"]["content_type_matches_detected_format"])
            self.assertTrue(metadata["provider_response"]["known_cloudflare_jpeg_png_mime_drift_tolerated"])
            self.assertEqual(metadata["output"]["mime_type"], "image/jpeg")
            self.assertEqual(metadata["output"]["file_name"], "first-image.jpg")
            self.assertTrue(metadata["alpha_status"].startswith("NOT_SUPPORTED_BY_JPEG"))
            self.assertIn("does not preserve alpha transparency", metadata["alpha_status"])

    def test_metadata_collision_does_not_overwrite_existing_metadata(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            target = Path(temp_dir) / "first-image.png"
            metadata = Path(temp_dir) / "first-image.png.metadata.json"
            metadata.write_text("preserve", encoding="utf-8")
            with self.assertRaisesRegex(ImageGenerationError, "refusing to overwrite"):
                write_artifact(target, self.png, "logo", 256, 256, 4, None, None)
            self.assertFalse(target.exists())
            self.assertEqual(metadata.read_text(encoding="utf-8"), "preserve")


if __name__ == "__main__":
    unittest.main()
