"""Six-brand Genesis wallet-provider browser smoke.

Uses synthetic providers injected into Chromium, serves only loopback files, blocks
external network access, and fails on signatures, transactions, approvals or transfers.
This qualifies our browser adapters' discovery/account-display contract only; it does
not claim an installed wallet or live-chain qualification.
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
TRON_ADDRESSES = {
    "Bitget Wallet": "T" + "1" * 33,
    "TokenPocket": "T" + "2" * 33,
    "OKX Wallet": "T" + "3" * 33,
    "Trust Wallet": "T" + "4" * 33,
    "TronLink": "T" + "5" * 33,
}
SOLANA_ADDRESSES = {
    "MetaMask": "11111111111111111111111111111111",
    "Trust Wallet": "So11111111111111111111111111111111111111112",
    "Bitget Wallet": "Vote111111111111111111111111111111111111111",
    "OKX Wallet": "Stake11111111111111111111111111111111111111",
    "Coin98": "SysvarRent111111111111111111111111111111111",
    "TokenPocket": "ComputeBudget111111111111111111111111111111",
}
EXPECTED_EVM = ["MetaMask", "Trust Wallet", "Bitget Wallet", "TokenPocket", "Coin98", "OKX Wallet"]
EXPECTED_SOLANA = ["MetaMask", "Trust Wallet", "Bitget Wallet", "OKX Wallet", "Coin98", "TokenPocket"]
EXPECTED_TRON = ["Bitget Wallet", "TokenPocket", "OKX Wallet", "Trust Wallet", "TronLink"]


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
    adapters = ROOT / "preview" / "supporters" / "wallet-provider-adapters.mjs"
    if not html.is_file() or not js.is_file() or not adapters.is_file():
        print("ERROR: Genesis Programme page source or wallet adapter module is missing.")
        return 2

    server = ThreadingHTTPServer(
        ("127.0.0.1", 0),
        partial(QuietHandler, directory=str(ROOT / "preview")),
    )
    server.daemon_threads = True
    threading.Thread(target=server.serve_forever, daemon=True).start()
    port = server.server_address[1]
    origin = f"http://127.0.0.1:{port}"

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
      const calls = window.__walletCalls;
      const forbidden = window.__forbiddenWalletCalls;
      const record = (wallet, method) => calls.push(wallet + ":" + method);
      const reject = (wallet, method) => {
        forbidden.push(wallet + ":" + method);
        throw new Error("Forbidden wallet call in display-only qualification smoke: " + wallet + ":" + method);
      };

      const evmAddress = "0x" + "1".repeat(40);
      function evm(name, extra = {}) {
        return {
          ...extra,
          on() {},
          request: async ({method}) => {
            record(name, method);
            if (method === "eth_requestAccounts") return [evmAddress];
            if (method === "eth_chainId") return "0x1";
            return reject(name, method);
          }
        };
      }
      const metaEvm = evm("MetaMask", {isMetaMask:true});
      const trustEvm = evm("Trust Wallet", {isTrust:true});
      const bitgetEvm = evm("Bitget Wallet");
      const tokenPocketEvm = evm("TokenPocket", {isTokenPocket:true});
      const coin98Evm = evm("Coin98");
      const okxEvm = evm("OKX Wallet", {isOkxWallet:true});

      window.ethereum = metaEvm;
      window.trustwallet = {ethereum:trustEvm};
      window.bitkeep = {};
      window.tokenpocket = {};
      window.coin98 = {};
      window.okxwallet = {};

      function tronWeb(name, address) {
        return {
          defaultAddress: {base58:address},
          trx: {
            signMessageV2: async () => reject(name, "signMessageV2"),
            sign: async () => reject(name, "sign")
          }
        };
      }
      function tronProvider(name, address, connectMethod) {
        const provider = {
          on() {},
          request: async ({method}) => {
            record(name, method);
            if (method === connectMethod) return connectMethod === "eth_requestAccounts" ? [address] : {code:200};
            if (method === "eth_chainId") return "0x2b6653dc";
            return reject(name, method);
          }
        };
        provider.tronWeb = tronWeb(name, address);
        return provider;
      }

      const bitgetTron = tronProvider("Bitget Wallet", "T" + "1".repeat(33), "tron_requestAccounts");
      const tokenPocketTron = tronProvider("TokenPocket", "T" + "2".repeat(33), "eth_requestAccounts");
      const okxTron = tronProvider("OKX Wallet", "T" + "3".repeat(33), "tron_requestAccounts");
      const trustTron = tronProvider("Trust Wallet", "T" + "4".repeat(33), "eth_requestAccounts");
      const tronLink = tronProvider("TronLink", "T" + "5".repeat(33), "eth_requestAccounts");
      window.bitkeep.tronLink = bitgetTron;
      window.bitkeep.tronWeb = bitgetTron.tronWeb;
      window.tokenpocket.tron = tokenPocketTron;
      window.tokenpocket.tronWeb = tokenPocketTron.tronWeb;
      window.okxwallet.tronLink = okxTron;
      window.tron = tronLink;

      window.addEventListener("eip6963:requestProvider", () => {
        for (const [uuid, name, rdns, provider] of [
          ["mock-meta", "MetaMask", "io.metamask", metaEvm],
          ["mock-trust", "Trust Wallet", "com.trustwallet.app", trustEvm]
        ]) {
          window.dispatchEvent(new CustomEvent("eip6963:announceProvider", {
            detail: {info:{uuid,name,rdns,icon:""}, provider}
          }));
        }
      });
      window.addEventListener("TIP6963:requestProvider", () => {
        window.dispatchEvent(new CustomEvent("TIP6963:announceProvider", {
          detail: {
            info: {uuid:"mock-trust-tron", name:"Trust Wallet"},
            provider: trustTron
          }
        }));
      });

      function walletStandard(name, address) {
        return {
          name,
          icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>",
          chains: ["solana:mainnet"],
          features: {
            "standard:connect": {
              connect: async () => {
                record(name, "standard:connect");
                return {accounts:[{
                  address,
                  publicKey:new Uint8Array(32),
                  chains:["solana:mainnet"],
                  features:["solana:signMessage"]
                }]};
              }
            },
            "solana:signMessage": {
              signMessage: async () => reject(name, "signMessage")
            }
          }
        };
      }

      const bitgetAddress = "Vote111111111111111111111111111111111111111";
      const okxAddress = "Stake11111111111111111111111111111111111111";
      const coin98Address = "SysvarRent111111111111111111111111111111111";
      const tokenPocketAddress = "ComputeBudget111111111111111111111111111111";

      const bitgetSolana = {
        connect: async () => {
          record("Bitget Wallet", "connect");
          return {accounts:[{address:bitgetAddress, chains:["solana:mainnet"]}]};
        },
        getAccount: async () => bitgetAddress,
        signMessage: async () => reject("Bitget Wallet", "signMessage")
      };
      const okxSolana = {
        publicKey: {toString:() => okxAddress},
        connect: async () => {
          record("OKX Wallet", "connect");
          return {publicKey:{toString:() => okxAddress}};
        },
        getGenesisHash: async () => {
          record("OKX Wallet", "getGenesisHash");
          return "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
        },
        signMessage: async () => reject("OKX Wallet", "signMessage")
      };
      const coin98Solana = {
        request: async ({method}) => {
          record("Coin98", method);
          if (method === "sol_requestAccounts" || method === "sol_accounts") return [coin98Address];
          if (method === "getGenesisHash") return "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
          return reject("Coin98", method);
        }
      };
      const tokenPocketSolana = {
        network: "mainnet-beta",
        publicKey: {toBase58:() => tokenPocketAddress},
        connect: async () => {
          record("TokenPocket", "connect");
          return {publicKey:{toBase58:() => tokenPocketAddress}};
        },
        signMessage: async () => reject("TokenPocket", "signMessage")
      };

      window.bitkeep.ethereum = bitgetEvm;
      window.bitkeep.solana = bitgetSolana;
      window.tokenpocket.ethereum = tokenPocketEvm;
      window.solana = tokenPocketSolana;
      window.coin98.provider = coin98Evm;
      window.coin98.sol = coin98Solana;
      window.okxwallet.ethereum = okxEvm;
      window.okxwallet.solana = okxSolana;

      window.addEventListener("wallet-standard:app-ready", event => {
        if (event.detail && typeof event.detail.register === "function") {
          event.detail.register(
            walletStandard("MetaMask", "11111111111111111111111111111111"),
            walletStandard("Trust Wallet", "So11111111111111111111111111111111111111112")
          );
        }
      });
    })();
    """

    browser = None
    try:
        with sync_playwright() as playwright:
            executable = os.environ.get("CHROME_BIN")
            options = {"headless": True}
            if executable:
                options["executable_path"] = executable
            browser = playwright.chromium.launch(**options)
            context = browser.new_context(viewport={"width":1440, "height":1000}, device_scale_factor=1)
            context.add_init_script(init_script)
            context.route("**/*", guard_network)
            page = context.new_page()
            page.set_default_timeout(8000)
            page.on("pageerror", lambda error: PAGE_ERRORS.append(str(error)))
            page.on("console", lambda message: CONSOLE_ERRORS.append(message.text) if message.type == "error" else None)
            response = page.goto(f"{origin}/supporters/", wait_until="load", timeout=15000)
            record("Genesis preview responds successfully", bool(response and response.status == 200),
                   {"status":response.status if response else None, "title":page.title()})

            def option_labels(selector: str) -> list[str]:
                return page.locator(selector + " option").all_text_contents()[1:]

            def connect_and_clear(select_id: str, connect_id: str, clear_id: str,
                                  address_id: str, label: str, expected_address: str,
                                  test_name: str) -> None:
                page.select_option(select_id, label=label)
                page.locator(connect_id).click()
                page.wait_for_function(
                    """args => document.querySelector(args.address).textContent.trim() === args.expected""",
                    {"address":address_id, "expected":expected_address}
                )
                actual = page.locator(address_id).inner_text().strip()
                record(test_name, actual == expected_address, {"wallet":label, "address":actual})
                page.locator(clear_id).click()
                page.wait_for_function(
                    "(selector) => document.querySelector(selector).textContent.trim() === 'Not connected'",
                    address_id
                )

            page.wait_for_function("""() =>
              !document.querySelector("#supporter-evm-wallet-choice").disabled &&
              !document.querySelector("#supporter-tron-wallet-choice").disabled &&
              !document.querySelector("#supporter-wallet-choice").disabled
            """)
            evm_labels = option_labels("#supporter-evm-wallet-choice")
            record("all six EVM candidate providers are discovered",
                   all(name in evm_labels for name in EXPECTED_EVM), evm_labels)
            for name in EXPECTED_EVM:
                connect_and_clear(
                    "#supporter-evm-wallet-choice", "#supporter-evm-wallet-connect",
                    "#supporter-evm-wallet-clear", "#supporter-evm-wallet-address",
                    name, EVM_ADDRESS, "EVM public-account connection: " + name
                )

            tron_labels = option_labels("#supporter-tron-wallet-choice")
            record("supported direct and announced TRON providers are discovered",
                   all(name in tron_labels for name in EXPECTED_TRON), tron_labels)
            for name in EXPECTED_TRON:
                connect_and_clear(
                    "#supporter-tron-wallet-choice", "#supporter-tron-wallet-connect",
                    "#supporter-tron-wallet-clear", "#supporter-tron-wallet-address",
                    name, TRON_ADDRESSES[name], "TRON public-account connection: " + name
                )

            solana_labels = option_labels("#supporter-wallet-choice")
            record("all six Solana candidate providers are discovered",
                   all(name in solana_labels for name in EXPECTED_SOLANA), solana_labels)
            for name in EXPECTED_SOLANA:
                connect_and_clear(
                    "#supporter-wallet-choice", "#supporter-wallet-connect",
                    "#supporter-wallet-clear", "#supporter-wallet-address",
                    name, SOLANA_ADDRESSES[name], "Solana public-account connection: " + name
                )

            wallet_calls = page.evaluate("window.__walletCalls")
            forbidden_calls = page.evaluate("window.__forbiddenWalletCalls")
            record("the browser never requested a signature, transaction, approval or transfer",
                   not forbidden_calls, {"forbidden":forbidden_calls})
            record("external HTTP(S) network access was blocked and never attempted",
                   not BLOCKED_NETWORK, BLOCKED_NETWORK)
            record("no browser JavaScript or console errors occurred",
                   not PAGE_ERRORS and not CONSOLE_ERRORS,
                   {"page_errors":PAGE_ERRORS, "console_errors":CONSOLE_ERRORS})

            page.screenshot(path=str(output / "genesis-desktop-1440x1000.png"), full_page=False)
            page.set_viewport_size({"width":390, "height":844})
            page.screenshot(path=str(output / "genesis-mobile-390x844.png"), full_page=False)

            report = {
                "scope":"Synthetic six-brand wallet-provider discovery/account-display test on loopback; no real wallet, RPC, signature or transfer.",
                "url":f"{origin}/supporters/",
                "browser":{"engine":"chromium", "version":browser.version},
                "results":RESULTS,
                "totals":{
                    "pass":sum(x["result"] == "PASS" for x in RESULTS),
                    "fail":sum(x["result"] == "FAIL" for x in RESULTS),
                },
                "diagnostics":{
                    "page_errors":PAGE_ERRORS,
                    "console_errors":CONSOLE_ERRORS,
                    "blocked_external_requests":BLOCKED_NETWORK,
                    "wallet_calls":wallet_calls,
                    "forbidden_wallet_calls":forbidden_calls,
                    "discovered_wallets":{
                        "evm":evm_labels, "tron":tron_labels, "solana":solana_labels
                    }
                }
            }
            (output / "genesis-browser-smoke-report.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
            print(json.dumps(report,indent=2))
            return 1 if report["totals"]["fail"] else 0
    except Exception as exc:
        RESULTS.append({"test":"browser harness completes without exception","result":"FAIL",
                        "detail":{"type":type(exc).__name__,"message":str(exc)}})
        print(json.dumps({"results":RESULTS},indent=2))
        return 1
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    raise SystemExit(main())
