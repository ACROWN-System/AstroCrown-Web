"""Browser smoke tests for the AstroCrown homepage preview.

Serves checked-out repository files on loopback only, forces browser-memory demo mode,
blocks non-loopback requests, and writes a JSON report, source/performance budgets, plus desktop/mobile screenshots.
No production credentials or external services are used.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import threading
from xml.etree import ElementTree
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[3]
RESULTS: list[dict] = []
PAGE_ERRORS: list[str] = []
CONSOLE_ERRORS: list[str] = []
BLOCKED_NETWORK: list[dict] = []
SOURCE_SIZE_METRICS: dict = {}
PERFORMANCE_METRICS: dict = {}
BROWSER_METRICS: dict = {}
MAX_HTML_SOURCE_BYTES = 112 * 1024
MAX_RUNTIME_ASSET_BYTES = 48 * 1024
MAX_INITIAL_DECODED_BYTES = 160 * 1024
MAX_INITIAL_RESOURCE_ENTRIES = 8
MAX_SPACE_ART_ASSET_BYTES = 24 * 1024
SPACE_ART_ASSET_PATHS = (
    ROOT / "preview" / "assets" / "primitive-earth-moon.svg",
    ROOT / "preview" / "assets" / "rocky-planet.svg",
    ROOT / "preview" / "assets" / "spiral-nebula.svg",
)


def record(name: str, status: str, detail=None) -> None:
    RESULTS.append({"test": name, "result": status, "detail": detail})


def check(name: str, condition: bool, detail=None) -> None:
    record(name, "PASS" if condition else "FAIL", detail)


class QuietHandler(SimpleHTTPRequestHandler):
    def do_GET(self) -> None:
        if urlparse(self.path).path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
            return
        super().do_GET()

    def log_message(self, _format: str, *args) -> None:
        return


def attach_diagnostics(page) -> None:
    page.on("pageerror", lambda error: PAGE_ERRORS.append(str(error)))
    page.on("console", lambda message: CONSOLE_ERRORS.append(message.text) if message.type == "error" else None)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, default=Path("/tmp/homepage-browser-smoke"))
    args = parser.parse_args()
    out = args.output_dir.resolve()
    out.mkdir(parents=True, exist_ok=True)
    if not (ROOT / "preview" / "index.html").is_file():
        print(f"ERROR: preview/index.html not found under repository root {ROOT}", file=sys.stderr)
        return 2

    source_files = {
        "homepage_html": ROOT / "preview" / "index.html",
        "account_stylesheet": ROOT / "preview" / "account-prototype.css",
        "account_script": ROOT / "preview" / "account-ui.js",
    }
    missing_source_files = [str(path.relative_to(ROOT)) for path in source_files.values() if not path.is_file()]
    if missing_source_files:
        print(f"ERROR: critical homepage source asset missing: {missing_source_files}", file=sys.stderr)
        return 2

    source_sizes = {name: path.stat().st_size for name, path in source_files.items()}
    missing_art_assets = [str(path.relative_to(ROOT)) for path in SPACE_ART_ASSET_PATHS if not path.is_file()]
    if missing_art_assets:
        print(f"ERROR: required transparent space-art assets missing: {missing_art_assets}", file=sys.stderr)
        return 2
    art_asset_sizes = {str(path.relative_to(ROOT)): path.stat().st_size for path in SPACE_ART_ASSET_PATHS}
    art_asset_bytes = sum(art_asset_sizes.values())
    art_asset_roots = {}
    for path in SPACE_ART_ASSET_PATHS:
        try:
            root = ElementTree.parse(path).getroot()
        except (ElementTree.ParseError, OSError) as exc:
            print(f"ERROR: invalid SVG space-art asset {path.relative_to(ROOT)}: {exc}", file=sys.stderr)
            return 2
        if not root.tag.endswith("svg") or not root.attrib.get("viewBox"):
            print(f"ERROR: SVG space-art asset needs an svg root and viewBox: {path.relative_to(ROOT)}", file=sys.stderr)
            return 2
        art_asset_roots[str(path.relative_to(ROOT))] = {"viewBox": root.attrib["viewBox"], "root": root.tag}
    art_asset_metrics = {
        "asset_bytes": art_asset_sizes,
        "combined_bytes": art_asset_bytes,
        "combined_budget_bytes": MAX_SPACE_ART_ASSET_BYTES,
        "svg_metadata": art_asset_roots,
    }
    SOURCE_SIZE_METRICS["transparent_space_art"] = art_asset_metrics
    check(
        "three original transparent SVG background assets remain within 24 KiB combined",
        art_asset_bytes <= MAX_SPACE_ART_ASSET_BYTES
        and all(size <= 12 * 1024 for size in art_asset_sizes.values()),
        art_asset_metrics,
    )
    runtime_asset_bytes = source_sizes["account_stylesheet"] + source_sizes["account_script"]
    critical_source_bytes = source_sizes["homepage_html"] + runtime_asset_bytes
    SOURCE_SIZE_METRICS.update({
        "source_bytes": source_sizes,
        "runtime_css_js_bytes": runtime_asset_bytes,
        "critical_html_css_js_bytes": critical_source_bytes,
        "budgets_bytes": {
            "homepage_html": MAX_HTML_SOURCE_BYTES,
            "runtime_css_js": MAX_RUNTIME_ASSET_BYTES,
            "critical_html_css_js": MAX_INITIAL_DECODED_BYTES,
        },
    })
    check(
        "homepage HTML source remains within the 112 KiB budget",
        source_sizes["homepage_html"] <= MAX_HTML_SOURCE_BYTES,
        {"bytes": source_sizes["homepage_html"], "budget_bytes": MAX_HTML_SOURCE_BYTES,
         "kib": round(source_sizes["homepage_html"] / 1024, 2)},
    )
    check(
        "critical runtime CSS and JavaScript remain within the 48 KiB budget",
        runtime_asset_bytes <= MAX_RUNTIME_ASSET_BYTES,
        {"bytes": runtime_asset_bytes, "budget_bytes": MAX_RUNTIME_ASSET_BYTES,
         "css_bytes": source_sizes["account_stylesheet"], "javascript_bytes": source_sizes["account_script"]},
    )
    check(
        "homepage HTML plus critical CSS and JavaScript remain within the 160 KiB budget",
        critical_source_bytes <= MAX_INITIAL_DECODED_BYTES,
        {"bytes": critical_source_bytes, "budget_bytes": MAX_INITIAL_DECODED_BYTES,
         "kib": round(critical_source_bytes / 1024, 2)},
    )

    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT)))
    server.daemon_threads = True
    threading.Thread(target=server.serve_forever, daemon=True).start()
    port = server.server_address[1]
    origin = f"http://127.0.0.1:{port}"
    test_url = f"{origin}/preview/?account-preview-demo=1"
    browser = None

    def guard_network(route) -> None:
        parsed = urlparse(route.request.url)
        if parsed.scheme == "http" and parsed.hostname == "127.0.0.1" and parsed.port == port:
            route.continue_()
        elif parsed.scheme in ("about", "data"):
            route.continue_()
        else:
            BLOCKED_NETWORK.append({"url": route.request.url, "type": route.request.resource_type})
            route.abort()

    try:
        with sync_playwright() as playwright:
            browser_executable = os.environ.get("CHROME_BIN")
            launch_options = {"headless": True}
            if browser_executable:
                launch_options["executable_path"] = browser_executable
            browser = playwright.chromium.launch(**launch_options)
            BROWSER_METRICS.update({
                "engine": "chromium",
                "version": browser.version,
                "launch_source": "runner-provided-browser" if browser_executable else "playwright-managed",
                "executable_name": Path(browser_executable).name if browser_executable else None,
            })
            context = browser.new_context(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
            context.route("**/*", guard_network)
            page = context.new_page()
            page.set_default_timeout(7000)
            attach_diagnostics(page)
            response = page.goto(test_url, wait_until="load", timeout=15000)
            page.wait_for_timeout(150)

            performance_snapshot = page.evaluate("""() => {
              const navigation = performance.getEntriesByType("navigation")[0];
              const resources = performance.getEntriesByType("resource");
              const externalHttpResources = resources
                .filter((entry) => /^https?:/i.test(entry.name) && new URL(entry.name).origin !== location.origin)
                .map((entry) => entry.name);
              const resourceDecodedBytes = resources.reduce((sum, entry) => sum + (entry.decodedBodySize || 0), 0);
              const resourceTransferBytes = resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0);
              const initialDecodedBytes = (navigation ? navigation.decodedBodySize || 0 : 0) + resourceDecodedBytes;
              const initialTransferBytes = (navigation ? navigation.transferSize || 0 : 0) + resourceTransferBytes;
              return {
                navigation: {
                  responseStartMs: navigation ? Math.round(navigation.responseStart) : null,
                  domContentLoadedMs: navigation ? Math.round(navigation.domContentLoadedEventEnd) : null,
                  loadEventMs: navigation ? Math.round(navigation.loadEventEnd) : null,
                  decodedBodyBytes: navigation ? navigation.decodedBodySize || 0 : 0,
                  transferBytes: navigation ? navigation.transferSize || 0 : 0
                },
                resourceCount: resources.length,
                resourceDecodedBytes,
                resourceTransferBytes,
                initialDecodedBytes,
                initialTransferBytes,
                externalHttpResources,
                resources: resources.map((entry) => ({
                  pathname: new URL(entry.name).pathname,
                  initiatorType: entry.initiatorType,
                  decodedBodyBytes: entry.decodedBodySize || 0,
                  transferBytes: entry.transferSize || 0,
                  durationMs: Math.round(entry.duration)
                }))
              };
            }""")
            PERFORMANCE_METRICS.update(performance_snapshot)
            check(
                "initial decoded homepage resources remain within the 160 KiB budget",
                performance_snapshot["initialDecodedBytes"] <= MAX_INITIAL_DECODED_BYTES,
                {"decoded_bytes": performance_snapshot["initialDecodedBytes"],
                 "budget_bytes": MAX_INITIAL_DECODED_BYTES,
                 "timings": performance_snapshot["navigation"]},
            )
            check(
                "initial homepage resource count remains within eight requests",
                performance_snapshot["resourceCount"] <= MAX_INITIAL_RESOURCE_ENTRIES,
                {"count": performance_snapshot["resourceCount"],
                 "budget": MAX_INITIAL_RESOURCE_ENTRIES,
                 "resources": performance_snapshot["resources"]},
            )
            check(
                "initial page load does not depend on remote HTTP(S) resources",
                not performance_snapshot["externalHttpResources"],
                performance_snapshot["externalHttpResources"],
            )

            space_art_metrics = page.evaluate("""async () => {
              const art = document.querySelector("#space-intro-art");
              if (!art || art.getAttribute("aria-hidden") !== "true") return {found:false, assets:[]};
              const images = Array.from(art.querySelectorAll("img"));
              const assets = await Promise.all(images.map(async (img) => {
                try { await img.decode(); } catch (_) {}
                if (!img.complete || !img.naturalWidth || !img.naturalHeight) {
                  return {className:img.className, path:new URL(img.src).pathname, loaded:false};
                }
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext("2d", {willReadFrequently:true});
                ctx.drawImage(img, 0, 0);
                const cornerAlpha = [
                  ctx.getImageData(0,0,1,1).data[3],
                  ctx.getImageData(img.naturalWidth-1,0,1,1).data[3],
                  ctx.getImageData(0,img.naturalHeight-1,1,1).data[3],
                  ctx.getImageData(img.naturalWidth-1,img.naturalHeight-1,1,1).data[3]
                ];
                let visibleSamples = 0;
                for (let y=16; y<img.naturalHeight; y+=48) {
                  for (let x=16; x<img.naturalWidth; x+=48) {
                    if (ctx.getImageData(x,y,1,1).data[3] > 20) visibleSamples += 1;
                  }
                }
                return {
                  className:img.className,
                  path:new URL(img.src).pathname,
                  loaded:true,
                  naturalWidth:img.naturalWidth,
                  naturalHeight:img.naturalHeight,
                  alt:img.getAttribute("alt"),
                  hiddenFromAT:img.getAttribute("aria-hidden")==="true",
                  cornerAlpha,
                  visibleSamples
                };
              }));
              return {found:true, ariaHidden:art.getAttribute("aria-hidden")==="true", count:images.length, assets};
            }""")
            check(
                "Earth-Moon, rocky-planet and spiral-nebula SVG layers load from same-origin paths",
                space_art_metrics["found"] and space_art_metrics["count"] == 3
                and all(asset.get("loaded") for asset in space_art_metrics["assets"])
                and all(asset.get("alt") == "" and asset.get("hiddenFromAT") for asset in space_art_metrics["assets"]),
                space_art_metrics,
            )
            check(
                "each foreground SVG preserves genuine transparency and visible artwork",
                len(space_art_metrics.get("assets", [])) == 3
                and all(asset.get("cornerAlpha") == [0,0,0,0] and asset.get("visibleSamples",0) > 10
                        for asset in space_art_metrics.get("assets", [])),
                space_art_metrics,
            )
            page.evaluate("""() => {
              const workspace = document.getElementById("market-directory");
              window.scrollTo(0, workspace.getBoundingClientRect().top + window.scrollY + 5);
            }""")
            page.wait_for_function("document.getElementById('space-intro-art').classList.contains('is-fading')")
            check(
                "foreground space art fades as the market workspace enters the reading area",
                page.evaluate("document.getElementById('space-intro-art').classList.contains('is-fading')"),
            )
            page.evaluate("window.scrollTo(0, 0)")
            page.wait_for_function("!document.getElementById('space-intro-art').classList.contains('is-fading')")

            check("loopback preview route responds successfully", response is not None and response.status == 200,
                  {"status": response.status if response else None, "url": page.url})
            secure = page.evaluate("() => ({secure: isSecureContext, subtle: !!(crypto && crypto.subtle), origin: location.origin})")
            check("loopback preview has secure-context Web Crypto", secure["secure"] and secure["subtle"], secure)
            check("preview title is correct", page.title() == "AstroCrown — Live Homepage Test Preview", page.title())
            robots = page.locator('meta[name="robots"]').get_attribute("content")
            check("noindex directive is preserved", robots == "noindex, nofollow, noarchive", robots)
            ribbon = page.locator(".preview-ribbon").inner_text()
            check("visible demo warning says values are illustrative and real credentials prohibited",
                  "ILLUSTRATIVE MARKET VALUES" in ribbon and "NEVER ENTER REAL CREDENTIALS" in ribbon, ribbon)
            header_metrics = page.evaluate("""() => {
              const header = document.querySelector('.site-header');
              const mark = document.querySelector('.brand-mark');
              const nav = document.querySelector('.nav-trigger');
              const gold = getComputedStyle(document.documentElement).getPropertyValue('--gold').trim();
              const parseColor = (value) => {
                if (value.startsWith('#')) {
                  const hex = value.slice(1);
                  const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
                  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
                }
                return value.match(/[0-9.]+/g).slice(0, 3).map(Number);
              };
              const luminance = (color) => parseColor(color).map(value => value / 255).map(value =>
                value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)
              ).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
              const contrast = (foreground, background) => {
                const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
                return (values[0] + 0.05) / (values[1] + 0.05);
              };
              const hb = header.getBoundingClientRect();
              const mb = mark.getBoundingClientRect();
              const bg = getComputedStyle(header);
              const navColor = getComputedStyle(nav).color;
              return {
                background: bg.backgroundColor,
                backgroundImage: bg.backgroundImage,
                headerHeight: hb.height,
                markWidth: mb.width,
                markHeight: mb.height,
                markTopClearance: mb.top - hb.top,
                markBottomClearance: hb.bottom - mb.bottom,
                navTextContrast: contrast(navColor, bg.backgroundColor),
                goldContrast: contrast(gold, bg.backgroundColor),
                borderBottomColor: bg.borderBottomColor
              };
            }""")
            check(
                "header uses the evaluated opaque Space Blue surface",
                header_metrics["background"] == "rgb(16, 41, 71)"
                and header_metrics["backgroundImage"] == "none",
                header_metrics
            )
            check(
                "desktop header and brand mark match the compact target geometry",
                59 <= header_metrics["headerHeight"] <= 61
                and header_metrics["markWidth"] == 50
                and header_metrics["markHeight"] == 50
                and 3 <= header_metrics["markTopClearance"] <= 6
                and 3 <= header_metrics["markBottomClearance"] <= 6,
                header_metrics
            )
            check(
                "header navigation text and gold controls exceed 4.5:1 contrast",
                header_metrics["navTextContrast"] >= 4.5
                and header_metrics["goldContrast"] >= 4.5,
                {
                    "navTextContrast": round(header_metrics["navTextContrast"], 2),
                    "goldContrast": round(header_metrics["goldContrast"], 2),
                    "background": header_metrics["background"]
                }
            )
            layout_metrics = page.evaluate("""() => {
              const header = document.querySelector(".site-header").getBoundingClientRect();
              const shell = document.querySelector(".page-shell");
              const shellBox = shell.getBoundingClientRect();
              const shellStyle = getComputedStyle(shell);
              const contentWidth = shellBox.width - parseFloat(shellStyle.paddingLeft) - parseFloat(shellStyle.paddingRight);
              const info = document.querySelector(".info-bar");
              const infoBox = info.getBoundingClientRect();
              const infoStyle = getComputedStyle(info);
              const priorityStyle = getComputedStyle(document.querySelector(".info-priority"));
              const heroBox = document.querySelector(".hero-section").getBoundingClientRect();
              return {
                headerToInfoGap: Math.round((infoBox.top - header.bottom) * 100) / 100,
                infoBarHeight: Math.round(infoBox.height * 100) / 100,
                infoBarWidth: Math.round(infoBox.width * 100) / 100,
                infoBarWidthPercent: Math.round(infoBox.width / contentWidth * 10000) / 100,
                infoOuterBorderTop: parseFloat(infoStyle.borderTopWidth),
                priorityDividerWidth: parseFloat(priorityStyle.borderRightWidth),
                heroWidth: Math.round(heroBox.width * 100) / 100,
                heroWidthPercent: Math.round(heroBox.width / contentWidth * 10000) / 100,
                contentWidth: Math.round(contentWidth * 100) / 100
              };
            }""")
            check(
                "desktop information bar has the target 45px header clearance",
                44.5 <= layout_metrics["headerToInfoGap"] <= 45.5,
                layout_metrics,
            )
            check(
                "desktop information bar preserves its 53px target height and 78% width",
                52.5 <= layout_metrics["infoBarHeight"] <= 53.5
                and 77.5 <= layout_metrics["infoBarWidthPercent"] <= 78.5,
                layout_metrics,
            )
            check(
                "information bar outer outline and priority divider have the evaluated 2px weight",
                layout_metrics["infoOuterBorderTop"] == 2
                and layout_metrics["priorityDividerWidth"] == 2,
                layout_metrics,
            )
            check(
                "desktop hero-card group uses the evaluated 88% width cap",
                87.5 <= layout_metrics["heroWidthPercent"] <= 88.5
                and layout_metrics["heroWidth"] <= 1320,
                layout_metrics,
            )

            resources = page.evaluate("() => performance.getEntriesByType('resource').map(x => x.name)")
            check("same-origin CSS and account JS are loaded",
                  any("account-prototype.css" in x for x in resources) and any("account-ui.js" in x for x in resources),
                  [x for x in resources if "account-" in x])
            ids = page.locator("[id]").evaluate_all("(nodes) => nodes.map(n => n.id)")
            duplicates = sorted({x for x in ids if ids.count(x) > 1})
            check("DOM IDs are unique", not duplicates, duplicates)
            rows = page.locator("#asset-rows tr").count()
            summary = page.locator("#directory-result-summary").inner_text()
            check("directory renders 12 rows of a 24-item illustrative dataset",
                  rows == 12 and "of 24" in summary, {"rows": rows, "summary": summary})

            categories = {"AI": 4, "Gaming": 4, "Meme": 2, "RWA": 2, "DePIN": 3, "Stable": 3}
            for category, wanted in categories.items():
                button = page.locator(f'[data-filter="{category}"]')
                button.click()
                count = page.locator("#asset-rows tr").count()
                check(f"{category} filter updates rows and pressed state",
                      count == wanted and button.get_attribute("aria-pressed") == "true",
                      {"rows": count, "expected": wanted})
            page.locator('[data-filter="all"]').click()
            check("All filter restores first page", page.locator("#asset-rows tr").count() == 12,
                  page.locator("#directory-result-summary").inner_text())

            sort_first = {"name": "ARB", "price": "BTC", "marketcap": "BTC", "change": "RENDER", "featured": "BTC"}
            for mode, wanted in sort_first.items():
                page.locator("#sort-select").select_option(mode)
                actual = page.locator("#asset-rows tr").first.get_attribute("data-row-symbol")
                check(f"sort mode {mode} orders the sample fixtures", actual == wanted,
                      {"first_symbol": actual, "expected": wanted})

            page.get_by_role("button", name="Page 2").click()
            page.wait_for_timeout(30)
            p2 = {"count": page.locator("#asset-rows tr").count(),
                  "first": page.locator("#asset-rows tr").first.get_attribute("data-row-symbol"),
                  "current": page.locator('[data-page][aria-current="page"]').inner_text()}
            check("page 2 renders expected remaining sample assets",
                  p2 == {"count": 12, "first": "ONDO", "current": "2"}, p2)
            check("next page is disabled at final page", page.locator('[aria-label="Next page"]').is_disabled(),
                  page.locator("#pagination-summary").inner_text())
            page.locator('[aria-label="Previous page"]').click()
            check("previous-page control returns to page 1",
                  page.locator('[data-page][aria-current="page"]').inner_text() == "1",
                  page.locator("#pagination-summary").inner_text())

            search = page.locator("#site-search")
            search.fill("B")
            check("one-character search does not display suggestions",
                  "is-visible" not in (page.locator("#search-results").get_attribute("class") or ""),
                  page.locator("#search-results").get_attribute("class"))
            search.fill("BTC")
            check("search displays the matching Bitcoin sample",
                  page.locator("#search-results").is_visible() and "Bitcoin" in page.locator("#search-results").inner_text(),
                  page.locator("#search-results").inner_text())
            search.press("ArrowDown")
            selected = page.locator('#search-results [role="option"]').first.get_attribute("aria-selected")
            check("keyboard ArrowDown selects a suggestion", selected == "true", selected)
            search.press("Enter")
            page.wait_for_timeout(220)
            symbols = [page.locator("#asset-rows tr").nth(i).get_attribute("data-row-symbol")
                       for i in range(page.locator("#asset-rows tr").count())]
            check("keyboard Enter filters to the selected asset", symbols == ["BTC"], symbols)
            search.fill("zzzz-no-result")
            empty = page.locator("#empty-state").inner_text()
            check("no-match search displays recovery guidance",
                  page.locator("#asset-rows tr").count() == 0 and "No sample assets match" in empty
                  and "Try another search term" in empty, {"summary": page.locator("#directory-result-summary").inner_text(), "empty": empty})
            search.fill("")
            page.locator('[data-filter="all"]').click()

            markets = page.locator('[data-menu="markets-menu"]')
            swap = page.locator('[data-menu="swap-menu"]')
            markets.click()
            check("primary menu opens and sets aria-expanded",
                  markets.get_attribute("aria-expanded") == "true"
                  and markets.evaluate('(b) => b.closest(".menu-slot").classList.contains("is-open")'),
                  markets.get_attribute("aria-expanded"))
            swap.click()
            check("opening one menu closes the previous menu",
                  markets.get_attribute("aria-expanded") == "false" and swap.get_attribute("aria-expanded") == "true",
                  {"markets": markets.get_attribute("aria-expanded"), "swap": swap.get_attribute("aria-expanded")})
            page.keyboard.press("Escape")
            check("Escape closes an open menu", swap.get_attribute("aria-expanded") == "false",
                  swap.get_attribute("aria-expanded"))
            markets.click()
            page.locator("main").click(position={"x": 5, "y": 5})
            check("click-away closes a menu", markets.get_attribute("aria-expanded") == "false",
                  markets.get_attribute("aria-expanded"))

            favorite = page.locator('#asset-rows [data-favorite="BTC"]')
            before = favorite.get_attribute("aria-pressed")
            favorite.click()
            after = favorite.get_attribute("aria-pressed")
            check("favorite toggles its accessible pressed state",
                  before == "false" and after == "true", {"before": before, "after": after})
            page.locator('#asset-rows [data-open-asset="BTC"]').click()
            detail_open = page.locator("#preview-dialog").evaluate("(d) => d.open")
            detail_text = page.locator("#dialog-copy").inner_text()
            page.keyboard.press("Escape")
            detail_closed = not page.locator("#preview-dialog").evaluate("(d) => d.open")
            check("asset detail dialog opens with sample context and closes with Escape",
                  detail_open and "illustrative directory" in detail_text and detail_closed,
                  {"opened": detail_open, "closed": detail_closed})
            page.locator("button[data-concept]").first.click()
            concept_title = page.locator("#dialog-title").inner_text()
            page.locator("#dialog-close").click()
            check("ecosystem concept dialog opens and closes", bool(concept_title)
                  and not page.locator("#preview-dialog").evaluate("(d) => d.open"), concept_title)

            page.locator("#open-account-dialog").click()
            account_open = page.locator("#account-dialog").evaluate("(d) => d.open")
            notice = page.locator("#account-demo-notice").inner_text()
            check("account modal displays disposable-demo warning",
                  account_open and "disappear on reload" in notice and "Use invented details only" in notice,
                  notice)

            page.locator('[data-account-mode="recover"]').click()
            warning = page.locator(".account-recovery-warning").inner_text()
            page.locator('#account-reset-request-form [name="email"]').fill("reset-test@example.invalid")
            page.locator("#account-reset-request-form").evaluate("(f) => f.requestSubmit()")
            feedback = page.locator("#account-feedback").inner_text()
            check("password reset explicitly states no email is sent",
                  "No email will be sent" in warning and "No email was sent" in feedback,
                  {"warning": warning, "feedback": feedback})

            page.get_by_role("tab", name="Sign Up").click()
            form = page.locator("#account-create-form")
            blank_valid = form.evaluate("(f) => f.checkValidity()")
            fake_email = "github-actions-homepage-smoke@example.invalid"
            fake_password = "Only-An-Invented-Test-Phrase-20261022!"
            form.locator('[name="email"]').fill(fake_email)
            form.locator('[name="password"]').fill("short")
            form.locator('[name="termsAccepted"]').check()
            short_valid = form.evaluate("(f) => f.checkValidity()")
            form.locator('[name="password"]').fill(fake_password)
            full_valid = form.evaluate("(f) => f.checkValidity()")
            newsletter = form.locator('[name="newsletterOptIn"]').is_checked()
            check("account form enforces required fields and minimum password length",
                  not blank_valid and not short_valid and full_valid,
                  {"blank_valid": blank_valid, "short_password_valid": short_valid, "complete_fake_form_valid": full_valid})
            check("newsletter opt-in defaults off", not newsletter, newsletter)

            if secure["secure"] and secure["subtle"]:
                form.evaluate("(f) => f.requestSubmit()")
                page.locator(".account-account-card").wait_for(timeout=20000)
                create_feedback = page.locator("#account-feedback").inner_text()
                card_text = page.locator(".account-account-card").inner_text()
                check("fake-only account creation works in browser memory",
                      "Test account created" in create_feedback and fake_email in card_text,
                      {"feedback": create_feedback, "contains_synthetic_account": fake_email in card_text})

                page.locator("#account-signout").click()
                page.locator("#account-signin-form").wait_for(timeout=7000)
                signout_text = page.locator("#account-feedback").inner_text()
                check("sign-out returns to the sign-in form",
                      "Signed out of the development test account" in signout_text,
                      signout_text)

                sign_in = page.locator("#account-signin-form")
                sign_in.locator('[name="email"]').fill(fake_email)
                sign_in.locator('[name="password"]').fill(fake_password)
                sign_in.evaluate("(f) => f.requestSubmit()")
                page.locator(".account-account-card").wait_for(timeout=20000)
                login_text = page.locator("#account-feedback").inner_text()
                check("sign-in verifies the synthetic account",
                      "development test account" in login_text.lower()
                      and fake_email in page.locator(".account-account-card").inner_text(),
                      {"feedback": login_text, "account_present": fake_email in page.locator(".account-account-card").inner_text()})

                page.locator("#account-signout").click()
                page.locator("#account-signin-form").wait_for(timeout=7000)
                page.locator("#account-dialog-close").click()
                page.reload(wait_until="load", timeout=15000)
                page.locator("#open-account-dialog").click()
                page.locator("#account-signin-form").wait_for(timeout=7000)
                check("demo account and sign-in state do not persist after reload",
                      page.locator(".account-account-card").count() == 0
                      and page.locator("#account-signin-form").count() == 1,
                      {"account_card_count": page.locator(".account-account-card").count()})
            else:
                record("account creation/login/reload persistence", "BLOCKED",
                       "Loopback browser did not expose Web Crypto; a successful secure-context registration cannot be established.")
            page.locator("#account-dialog-close").click()
            check("account modal closes cleanly",
                  not page.locator("#account-dialog").evaluate("(d) => d.open"),
                  page.locator("#account-dialog").evaluate("(d) => d.open"))

            for width, height in [(1440, 1000), (1280, 900), (1024, 900), (768, 900), (390, 844), (320, 780)]:
                page.set_viewport_size({"width": width, "height": height})
                page.evaluate("window.scrollTo(0, 0)")
                metrics = page.evaluate("""() => ({
                  viewport: innerWidth,
                  documentWidth: document.documentElement.scrollWidth,
                  bodyWidth: document.body.scrollWidth,
                  headerHeight: Math.round(document.querySelector('.site-header').getBoundingClientRect().height),
                  visibleHeaderControls: [...document.querySelectorAll('header a,header button,header input')].filter(e => {
                    const r = e.getBoundingClientRect();
                    return r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth;
                  }).length
                })""")
                check(f"viewport {width}px has no document-level horizontal overflow",
                      metrics["documentWidth"] <= width and metrics["bodyWidth"] <= width, metrics)
                check(f"viewport {width}px retains visible header controls",
                      metrics["visibleHeaderControls"] >= 5, metrics)

            # Reload to reset transient interaction state, then disable smooth scrolling
            # while positioning screenshot captures at the actual top of the document.
            page.reload(wait_until="load", timeout=15000)
            page.evaluate("""() => {
              document.documentElement.style.scrollBehavior = "auto";
              history.scrollRestoration = "manual";
              document.documentElement.scrollTop = 0;
              document.body.scrollTop = 0;
              window.scrollTo({top: 0, left: 0, behavior: "instant"});
            }""")
            page.wait_for_function("window.scrollY === 0")
            check("desktop viewport screenshot starts at the top of the page",
                  page.evaluate("window.scrollY") == 0,
                  {"scrollY": page.evaluate("window.scrollY"), "title": page.title()})
            page.set_viewport_size({"width": 1440, "height": 1000})
            page.screenshot(path=str(out / "homepage-desktop-1440x1000.png"), full_page=False)
            page.screenshot(path=str(out / "homepage-full-page-1440.png"), full_page=True)
            page.set_viewport_size({"width": 390, "height": 844})
            page.evaluate("""() => {
              document.documentElement.style.scrollBehavior = "auto";
              document.documentElement.scrollTop = 0;
              document.body.scrollTop = 0;
              window.scrollTo({top: 0, left: 0, behavior: "instant"});
            }""")
            page.wait_for_function("window.scrollY === 0")
            page.screenshot(path=str(out / "homepage-mobile-smoke-390x844.png"), full_page=False)

            check("no page-level JavaScript exceptions", not PAGE_ERRORS, PAGE_ERRORS[:20])
            check("no browser console errors", not CONSOLE_ERRORS, CONSOLE_ERRORS[:20])
            check("no non-loopback HTTP(S) requests", not BLOCKED_NETWORK, BLOCKED_NETWORK[:20])
            browser.close()
            browser = None
    except Exception as exc:
        record("test harness completes without an unexpected exception", "FAIL",
               {"type": type(exc).__name__, "message": str(exc)})
    finally:
        if browser is not None:
            try:
                browser.close()
            except Exception:
                pass
        server.shutdown()
        server.server_close()

    report = {
        "scope": "Loopback browser smoke for checked-out preview source; browser-memory account demo forced; non-loopback HTTP(S) blocked.",
        "repository_root": str(ROOT),
        "test_url": test_url,
        "tests": RESULTS,
        "totals": {
            "pass": sum(x["result"] == "PASS" for x in RESULTS),
            "fail": sum(x["result"] == "FAIL" for x in RESULTS),
            "blocked": sum(x["result"] == "BLOCKED" for x in RESULTS),
            "count": len(RESULTS),
        },
        "diagnostics": {
            "page_errors": PAGE_ERRORS,
            "console_errors": CONSOLE_ERRORS,
            "blocked_non_loopback_requests": BLOCKED_NETWORK,
            "source_size_budget": SOURCE_SIZE_METRICS,
            "initial_navigation_performance": PERFORMANCE_METRICS,
            "browser": BROWSER_METRICS,
        },
    }
    (out / "homepage-browser-smoke-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 1 if report["totals"]["fail"] or report["totals"]["blocked"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
