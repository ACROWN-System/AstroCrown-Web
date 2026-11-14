#!/usr/bin/env python3
"""Dependency-free static checks for the Privacy & Transparency Centre preview."""

from __future__ import annotations

import re
import unittest
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
PAGE = ROOT / "preview" / "privacy-transparency.html"
HOME = ROOT / "preview" / "index.html"
ACCOUNT = ROOT / "preview" / "account-ui.js"


class DocumentInspector(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.hrefs: list[str] = []
        self.scripts = 0
        self.external_assets: list[str] = []
        self.headings: list[tuple[int, str]] = []
        self._heading_level: int | None = None
        self._heading_text: list[str] = []
        self.title_text: list[str] = []
        self._in_title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if "id" in values:
            self.ids.append(values["id"] or "")
        if tag == "a" and values.get("href"):
            self.hrefs.append(values["href"] or "")
        if tag == "script":
            self.scripts += 1
        if tag in {"script", "img", "iframe", "link"}:
            candidate = values.get("src") or values.get("href")
            if candidate and re.match(r"^https?://", candidate, flags=re.I):
                self.external_assets.append(candidate)
        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            self._heading_level = int(tag[1])
            self._heading_text = []
        if tag == "title":
            self._in_title = True

    def handle_endtag(self, tag: str) -> None:
        if self._heading_level is not None and tag == f"h{self._heading_level}":
            self.headings.append((self._heading_level, " ".join(self._heading_text).strip()))
            self._heading_level = None
            self._heading_text = []
        if tag == "title":
            self._in_title = False

    def handle_data(self, data: str) -> None:
        if self._heading_level is not None:
            self._heading_text.append(data)
        if self._in_title:
            self.title_text.append(data)


class PrivacyTransparencyStaticSmoke(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        if not PAGE.is_file() or not HOME.is_file() or not ACCOUNT.is_file():
            raise AssertionError("Run from the repository checkout containing preview/ files.")
        cls.page_source = PAGE.read_text(encoding="utf-8")
        cls.home_source = HOME.read_text(encoding="utf-8")
        cls.account_source = ACCOUNT.read_text(encoding="utf-8")
        cls.page = DocumentInspector()
        cls.page.feed(cls.page_source)
        cls.page.close()
        cls.home = DocumentInspector()
        cls.home.feed(cls.home_source)
        cls.home.close()

    def test_one_descriptive_title_and_one_h1(self) -> None:
        self.assertIn("Privacy", "".join(self.page.title_text))
        h1 = [text for level, text in self.page.headings if level == 1]
        self.assertEqual(len(h1), 1)
        self.assertIn("Privacy", h1[0])

    def test_unique_ids(self) -> None:
        self.assertEqual(len(self.page.ids), len(set(self.page.ids)))
        self.assertNotIn("", self.page.ids)

    def test_all_local_anchor_targets_exist(self) -> None:
        ids = set(self.page.ids)
        for href in self.page.hrefs:
            if href.startswith("#"):
                self.assertIn(href[1:], ids, f"Missing local anchor target: {href}")

    def test_required_education_sections_exist(self) -> None:
        for required_id in (
            "meaning", "public-blockchains", "third-parties", "astro-protection",
            "misconceptions", "emerging-tech", "current-status", "user-checklist", "sources"
        ):
            self.assertIn(required_id, self.page.ids)

    def test_transparency_and_status_caveats_exist(self) -> None:
        required_phrases = (
            "pseudonymous", "public", "third parties", "not a Privacy Policy",
            "does not claim that ACROWN or USD₮ transfers are confidential",
            "not enabled", "14 November 2026", "heightened risk", "issuer-specific token controls"
        )
        lowered = self.page_source.lower()
        for phrase in required_phrases:
            self.assertIn(phrase.lower(), lowered)

    def test_no_scripts_or_remote_assets(self) -> None:
        self.assertEqual(self.page.scripts, 0, "Static education page should not need JavaScript.")
        self.assertEqual(self.page.external_assets, [], "No remote scripts, styles, fonts or images.")

    def test_preview_is_not_indexed(self) -> None:
        self.assertRegex(self.page_source, r'<meta name="robots" content="noindex, nofollow, noarchive">')

    def test_homepage_links_to_centre_from_wallet_and_footer(self) -> None:
        self.assertIn('href="privacy-transparency.html#public-blockchains"', self.home_source)
        self.assertIn('href="privacy-transparency.html"', self.home_source)

    def test_account_consent_links_guide_separately_from_legal_policies(self) -> None:
        self.assertIn('href="./terms-of-use.html"', self.account_source)
        self.assertIn('href="./privacy-policy.html"', self.account_source)
        self.assertIn('href="./privacy-transparency.html"', self.account_source)
        self.assertIn("does not replace either policy", self.account_source)

    def test_reduced_motion_and_keyboard_accessibility_hooks_exist(self) -> None:
        self.assertIn("prefers-reduced-motion", self.page_source)
        self.assertIn(":focus-visible", self.page_source)
        self.assertIn('href="#main-content"', self.page_source)
        self.assertIn('aria-label="On this page"', self.page_source)

    def test_no_formal_anonymity_or_security_guarantee(self) -> None:
        self.assertIn("Do not promise absolute anonymity", self.page_source)
        self.assertIn("No complete product security certification is claimed", self.page_source)
        self.assertIn("this current AstroCrown preview is not a production-secure environment", self.page_source)
        self.assertIn("https://tether.to/en/legal/", self.page_source)


if __name__ == "__main__":
    unittest.main(verbosity=2)
