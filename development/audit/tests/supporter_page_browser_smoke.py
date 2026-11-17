"""Isolated browser smoke for Genesis wallet-first identity and display-only wallet paths.

Uses mock providers injected into Chromium, serves only loopback files, blocks external
network access, and fails if an unexpected wallet method is requested. No real wallet,
credentials, RPC endpoint, signing, transfer or payment is used.
"""
from __future__ import annotations

import argparse
import json
import os
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[3]
RESULTS: list[dict] = []
PAGE_ERRORS: list[str] = []
CONSOLE_ERRORS: list[str] = []
BLOCKED_NETWORK: list[str] = []
EVM_ADDRESS = "0x" + "1" * 40
TRON_ADDRESS = "T" + "1" * 33
SOLANA_ADDRESS = "So11111111111111111111111111111111111111112"


class QuietHandler(SimpleHTTPRequestHandler):
    def do_GET(self) -> None:
        if urlparse(self.path).path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
            return
        super().do_GET()

    def log_message(self, _format: str, *args) -> None:
        return


def record(name: str, passed: bool, detail=None) -> None:
    RESULTS.append({"test": name, "result": "PASS" if passed else "FAIL", "detail": detail})


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, default=Path("/tmp/genesis-browser-smoke"))
    args = parser.parse_args()
    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)

    html = ROOT / "preview" / "supporters" / "index.html"
    js = ROOT / "preview" / "supporters" / "supporters.js"
    if not html.is_file() or not js.is_file():
        print("ERROR: Genesis Programme page source or wallet script is missing.")
        return 2

    server = ThreadingHTTPServer(
        ("127.0.0.1", 0),
        partial(QuietHandler, directory=str(ROOT / "preview")),
    )
    server.daemon_threads = True
    threading.Thread(target=server.serve_forever, daemon=True).start()
    port = server.server_address[1]
    origin = f"http://127.0.0.1:{port}"
    browser = None

    def guard_network(route) -> None:
        parsed = urlparse(route.request.url)
        if parsed.scheme == "http" and parsed.hostname == "127.0.0.1" and parsed.port == port:
            route.continue_()
        elif parsed.scheme in ("about", "data", "blob"):
            route.continue_()
        else:
            BLOCKED_NETWORK.append(route.request.url)
            route.abort()

    init_script = """
    (() => {
      window.__walletCalls = [];
      window.__forbiddenWalletCalls = [];

      const record = (label, method) => {
        window.__walletCalls.push(label + ":" + method);
      };
      const unexpected = method => {
        window.__forbiddenWalletCalls.push(method);
        throw new Error("Unexpected wallet method in display-only smoke: " + method);
      };

      const evmAddress = "0x" + "1".repeat(40);
      const tronAddress = "T" + "1".repeat(33);
      const evm = {
        isMetaMask: true,
        on() {},
        request: async ({method}) => {
          record("evm", method);
          if (method === "eth_requestAccounts") return [evmAddress];
          if (method === "eth_chainId") return "0x1";
          return unexpected(method);
        }
      };
      const tron = {
        isTronLink: true,
        tronWeb: {defaultAddress: {base58: tronAddress}},
        on() {},
        request: async ({method}) => {
          record("tron", method);
          if (method === "eth_requestAccounts") return [tronAddress];
          if (method === "eth_chainId") return "0x2b6653dc";
          return unexpected(method);
        }
      };
      const solanaWallet = {
        name: "Mock Solana Wallet",
        icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
        chains: ["solana:mainnet"],
        features: {
          "standard:connect": {
            connect: async () => {
              record("solana", "standard:connect");
              return {
                accounts: [{
                  address: "So11111111111111111111111111111111111111112",
                  publicKey: new Uint8Array(32),
                  chains: ["solana:mainnet"],
                  features: ["solana:signMessage"]
                }]
              };
            }
          }
        }
      };

      window.addEventListener("eip6963:requestProvider", () => {
        window.dispatchEvent(new CustomEvent("eip6963:announceProvider", {
          detail: {
            info: {uuid:"mock-evm-wallet", name:"Mock EVM Wallet", rdns:"test.mock.evm"},
            provider: evm
          }
        }));
      });
      window.addEventListener("TIP6963:requestProvider", () => {
        window.dispatchEvent(new CustomEvent("TIP6963:announceProvider", {
          detail: {
            info: {uuid:"mock-tron-wallet", name:"Mock TronLink"},
            provider: tron
          }
        }));
      });
      window.addEventListener("wallet-standard:app-ready", event => {
        if (event.detail && typeof event.detail.register === "function") {
          event.detail.register(solanaWallet);
        }
      });
    })();
    """

    try:
        with sync_playwright() as playwright:
            executable = os.environ.get("CHROME_BIN")
            options = {"headless": True}
            if executable:
                options["executable_path"] = executable
            browser = playwright.chromium.launch(**options)
            context = browser.new_context(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
            context.add_init_script(init_script)
            context.route("**/*", guard_network)
            page = context.new_page()
            page.set_default_timeout(8000)
            page.on("pageerror", lambda error: PAGE_ERRORS.append(str(error)))
            page.on("console", lambda message: CONSOLE_ERRORS.append(message.text) if message.type == "error" else None)
            response = page.goto(f"{origin}/supporters/", wait_until="load", timeout=15000)
            record("Genesis preview responds successfully", bool(response and response.status == 200),
                   {"status": response.status if response else None, "title": page.title()})

            page.wait_for_function("""() => {
              return !document.querySelector("#supporter-evm-wallet-choice").disabled
                && !document.querySelector("#supporter-tron-wallet-choice").disabled
                && !document.querySelector("#supporter-wallet-choice").disabled;
            }""", timeout=8000)
            record("EVM, TronLink and Solana mock wallets are discovered", True)

            page.select_option("#supporter-evm-wallet-choice", label="Mock EVM Wallet")
            page.locator("#supporter-evm-wallet-connect").click()
            page.wait_for_function(
                "() => document.querySelector('#supporter-evm-wallet-address').textContent.startsWith('0x')"
            )
            evm_display = page.locator("#supporter-evm-wallet-address").inner_text()
            evm_feedback = page.locator("#supporter-evm-wallet-feedback").inner_text()
            record("EVM address is displayed pending primary-wallet identity proof",
                   evm_display == EVM_ADDRESS and "not yet verified as the primary genesis wallet" in evm_feedback.lower(),
                   {"address": evm_display, "feedback": evm_feedback})

            page.select_option("#supporter-tron-wallet-choice", label="Mock TronLink")
            page.locator("#supporter-tron-wallet-connect").click()
            page.wait_for_function(
                "() => document.querySelector('#supporter-tron-wallet-address').textContent.startsWith('T')"
            )
            tron_display = page.locator("#supporter-tron-wallet-address").inner_text()
            tron_feedback = page.locator("#supporter-tron-wallet-feedback").inner_text()
            record("TRON address is displayed pending primary-wallet identity proof",
                   tron_display == TRON_ADDRESS and "not yet verified as the primary genesis wallet" in tron_feedback.lower(),
                   {"address": tron_display, "feedback": tron_feedback})

            page.select_option("#supporter-wallet-choice", label="Mock Solana Wallet")
            page.locator("#supporter-wallet-connect").click()
            page.wait_for_function(
                "() => document.querySelector('#supporter-wallet-address').textContent.startsWith('So')"
            )
            solana_display = page.locator("#supporter-wallet-address").inner_text()
            solana_feedback = page.locator("#supporter-wallet-feedback").inner_text()
            record("Solana address is displayed pending primary-wallet identity proof",
                   solana_display == SOLANA_ADDRESS and "not yet verified as the primary genesis wallet" in solana_feedback.lower(),
                   {"address": solana_display, "feedback": solana_feedback})

            wallet_calls = page.evaluate("window.__walletCalls")
            forbidden_calls = page.evaluate("window.__forbiddenWalletCalls")
            allowed_calls = {
                "evm:eth_requestAccounts", "evm:eth_chainId",
                "tron:eth_requestAccounts", "tron:eth_chainId", "solana:standard:connect"
            }
            record("only wallet account/connection methods were called",
                   set(wallet_calls) == allowed_calls and not forbidden_calls,
                   {"calls": wallet_calls, "forbidden": forbidden_calls})
            record("no external HTTP(S) network calls occurred", not BLOCKED_NETWORK, BLOCKED_NETWORK)
            record("no browser JavaScript or console errors occurred",
                   not PAGE_ERRORS and not CONSOLE_ERRORS,
                   {"page_errors": PAGE_ERRORS, "console_errors": CONSOLE_ERRORS})

            page.screenshot(path=str(output / "genesis-desktop-1440x1000.png"), full_page=False)
            page.set_viewport_size({"width": 390, "height": 844})
            page.screenshot(path=str(output / "genesis-mobile-390x844.png"), full_page=False)

            report = {
                "scope": "Mock-wallet browser test on loopback; no real wallet, RPC, signing or transfer.",
                "url": f"{origin}/supporters/",
                "browser": {"engine": "chromium", "version": browser.version},
                "results": RESULTS,
                "totals": {
                    "pass": sum(x["result"] == "PASS" for x in RESULTS),
                    "fail": sum(x["result"] == "FAIL" for x in RESULTS),
                },
                "diagnostics": {
                    "page_errors": PAGE_ERRORS,
                    "console_errors": CONSOLE_ERRORS,
                    "blocked_external_requests": BLOCKED_NETWORK,
                    "wallet_calls": wallet_calls,
                    "forbidden_wallet_calls": forbidden_calls,
                }
            }
            (output / "genesis-browser-smoke-report.json").write_text(
                json.dumps(report, indent=2), encoding="utf-8"
            )
            print(json.dumps(report, indent=2))
            return 1 if report["totals"]["fail"] else 0
    except Exception as exc:
        RESULTS.append({"test":"browser harness completes without exception","result":"FAIL",
                        "detail":{"type":type(exc).__name__,"message":str(exc)}})
        print(json.dumps({"results":RESULTS}, indent=2))
        return 1
    finally:
        # The sync_playwright context manager already closes Chromium on exit.
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    raise SystemExit(main())
