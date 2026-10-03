# X Account Registry — 2026-10-03

## Purpose

Current X-account mapping for the external verification ecosystem already identified by AstroCrown.

Status:
- VERIFIED — official source or current organization-controlled source identifies the handle.
- OBSERVED — matching X account found but first-party ownership is not sufficiently established in this pass.
- HISTORICAL / REPLACED — former handle with documented current state.
- NOT VERIFIED — no sufficiently reliable current handle established.
- N/A — not meaningfully represented by a single organizational X account.

Do not use an X account for substantive contact until its identity is cross-checked against the entity's current official website or verification page.

## Verified / current

| Entity | X account | State |
|---|---|---|
| NIST | @NIST | VERIFIED |
| NIST Cyber | @NISTCyber | VERIFIED |
| OWASP Foundation | @owasp | VERIFIED |
| Center for Internet Security | @CISecurity | VERIFIED |
| ISO | @isostandards | VERIFIED |
| Cloud Security Alliance | @cloudsa | VERIFIED |
| PCI Security Standards Council | @PCISSC | VERIFIED |
| Google Chrome | @googlechrome | VERIFIED |
| Chrome for Developers | @ChromiumDev | VERIFIED |
| MDN Web Docs | @MozDevNet | VERIFIED |
| WebAIM | @WebAIM | VERIFIED |
| Deque Systems | @dequesystems | VERIFIED |
| U.S. SEC | @SECGov | VERIFIED |
| ESMA | @ESMAComms | VERIFIED |
| UK FCA | @TheFCA | VERIFIED |
| SEBI | @SEBI_updates | VERIFIED |
| SEBI Investor Education | @SEBI_India | VERIFIED |
| Monetary Authority of Singapore | @MAS_sg | VERIFIED |
| CoinGecko | @coingecko | VERIFIED |
| CoinMarketCap | @CoinMarketCap | VERIFIED |
| Token Terminal | @tokenterminal | VERIFIED |
| Nansen | @nansen_ai | VERIFIED |
| Arkham | @arkhamintel | VERIFIED |
| Kaiko | @KaikoData | VERIFIED |
| Coinbase | @coinbase | VERIFIED |
| Binance | @binance | VERIFIED |
| Kraken | @krakenfx | VERIFIED |
| Kraken Support | @krakensupport | VERIFIED |
| OKX | @okx | VERIFIED |
| KuCoin | @kucoincom | VERIFIED |
| KuCoin temporary/update channel | @KuCoinUpdates | VERIFIED |
| WazirX | @WazirXIndia | VERIFIED |
| WazirX Support | @WazirXCares | VERIFIED |
| Trail of Bits | @trailofbits | VERIFIED |
| ChainSecurity | @chain_security | VERIFIED |
| Zellic | @zellic_io | VERIFIED |
| Runtime Verification | @rv_inc | VERIFIED |
| Immunefi | @Immunefi | VERIFIED |
| HackerOne | @Hacker0x01 | VERIFIED |
| Bitcoin Core | @bitcoincoreorg | VERIFIED |
| Ethereum community | @ethereum | VERIFIED |
| Ethereum Foundation | @ethereumfndn | VERIFIED |
| ethereum.org | @ethdotorg | VERIFIED |
| Uniswap | @Uniswap | VERIFIED |
| Paxos | @PaxosGlobal | VERIFIED |
| Reuters | @Reuters | VERIFIED |
| Bloomberg | @business | VERIFIED |
| Forbes | @Forbes | VERIFIED |
| CoinDesk | @CoinDesk | VERIFIED |
| Cointelegraph | @Cointelegraph | VERIFIED |
| GitHub | @github | VERIFIED |
| CISA | @CISAgov | VERIFIED |
| arXiv | @arxiv | VERIFIED |
| Tally | @tallyxyz | VERIFIED |
| Discord | @discord | VERIFIED |
| Discord Support | @discord_support | VERIFIED |

## Current but requiring special handling

| Entity | X account | State | Note |
|---|---|---|---|
| Cantina | @cantinasecurity | VERIFIED CURRENT | Former @cantinaxyz explicitly says it has moved to @cantinasecurity. |
| Cantina legacy | @cantinaxyz | HISTORICAL / REPLACED | Do not use as the current Cantina destination. |
| Code4rena | @code4rena | HISTORICAL / CLOSED | Current account states that Code4rena has closed its doors and points ongoing work to @zellic_io, @v12sec and @zenith256. |
| Sherlock | @sherlockdefi | OBSERVED | Current X activity matches Sherlock; confirm against its current official site before substantive contact. |
| Certora | @Certora | OBSERVED | Current X profile matches Certora; direct first-party linkage should be rechecked before substantive contact. |
| CERT/CC | @certcc | OBSERVED | Current indexed account matches CERT/CC; recheck through Carnegie Mellon / SEI before substantive contact. |
| ORCID | @orcid_org | OBSERVED | Organization identity is established, but the accessible first-party page did not expose a direct X link in this pass. |

## Not sufficiently verified in this pass

- FIU-IND
- FATF
- DefiLlama
- CCData
- Bybit
- OpenZeppelin
- CertiK
- Halborn
- Quantstamp
- Veridise
- Bugcrowd
- GTmetrix
- WebPageTest
- Snapshot
- Telegram
- Google Project Zero
- Crossref
- individual academic journals/conferences
- individual universities/research centers
- individual accounting firms
- individual threat-intelligence vendors
- individual national CERTs

A plausible-looking username is deliberately not promoted to VERIFIED without adequate evidence.

## Entity types without one single X identity

The following represent classes rather than one organization and therefore require separate entity selection before X verification:
- peer-reviewed journals;
- universities / research centers;
- independent researchers;
- independent journalists;
- national CERT organizations;
- threat-intelligence providers;
- independent accounting firms;
- jurisdiction-specific regulators beyond the specific authorities already mapped.

## Security / authenticity observations

### SEC
The SEC identifies @SECGov as an official account and also documents a prior compromise of that account. SEC materials state that Commission actions are published on SEC.gov first; social media amplifies those announcements.

### FCA
The FCA publishes its genuine X accounts and warns about impersonation.

### WazirX
WazirX identifies @WazirXIndia and @WazirXCares and warns about fake social-media profiles.

### Bitcoin Core
Bitcoin Core identifies @bitcoincoreorg and warns about impersonation. Important announcements are also distributed through the project's website and signed mailing list.

### Kraken
Kraken publishes a current official X roster and explicitly warns about phishing.

### KuCoin
KuCoin documented that @KuCoincom had been temporarily unavailable and identified @KuCoinUpdates as an official update channel during that period.

### Cantina
The legacy @cantinaxyz account explicitly says that the account is now at @cantinasecurity.

### Code4rena
The current @code4rena identity says Code4rena has closed its doors. Historical Code4rena references therefore must not be interpreted as evidence of an active current audit venue without fresh verification.

## Interaction rule

For every intended external interaction:

official entity website / verification page
→ current X handle
→ identity cross-check
→ intended purpose
→ non-sensitive public communication

X is primarily a communication/discovery channel unless the entity explicitly provides an operational workflow through X.

Never send private keys, seed phrases, wallet credentials, API secrets, financial credentials or similarly sensitive material through X.

## Source references used in this baseline

- NIST official social media: https://www.nist.gov/social-media
- OWASP current organization identity: https://owasp.org/about
- CIS current official site: https://www.cisecurity.org/
- ISO official material: https://www.iso.org/
- Cloud Security Alliance: https://cloudsecurityalliance.org/
- PCI SSC: https://www.pcisecuritystandards.org/
- WebAIM community: https://webaim.org/community/
- SEC social media: https://www.sec.gov/opa/socialmedia
- SEC @SECGov incident page: https://www.sec.gov/secgov-x-account
- ESMA newsletter / social media: https://www.esma.europa.eu/
- FCA genuine accounts: https://www.fca.org.uk/consumers/fake-fca-communications
- SEBI social-media disclaimer: https://www.sebi.gov.in/social_media_rel_disclaimer.html
- MAS: https://x.com/MAS_sg
- CoinGecko official channels: https://support.coingecko.com/hc/en-us/articles/4539244206105-What-are-the-Official-Channels-for-CoinGecko
- Kraken official social accounts: https://support.kraken.com/in/articles/201351886-how-to-follow-kraken-on-social-media
- WazirX official social warning: https://wazirx.com/blog/warning-about-fake-wazirx-social-media-profiles-emails/
- Trail of Bits contact: https://trailofbits.com/contact/
- ChainSecurity verified organization: https://github.com/chainsecurity
- Runtime Verification verified organization: https://github.com/runtimeverification
- Immunefi official account ecosystem: https://linktr.ee/immunefi
- Zellic audit report identifying @zellic_io: https://docs.celestia.org/audits/Blobstream_X-Zellic_Audit.pdf
- HackerOne disclosure guidelines: https://www.hackerone.com/terms/disclosure-guidelines
- Bitcoin Core contact / impersonation notices: https://bitcoincore.org/en/contact/ and https://bitcoincore.org/en/twitter-impersonation/
- Ethereum online communities: https://ethereum.org/community/online/
- Uniswap official links: https://support.uniswap.org/hc/en-us/articles/17522892515341-Official-Uniswap-Labs-links
- Paxos support: https://support.paxos.com/
- Reuters: https://x.com/Reuters
- Bloomberg: https://x.com/business
- Forbes: https://x.com/Forbes
- CoinDesk contact: https://www.coindesk.com/contact-us/
- Cointelegraph: https://x.com/Cointelegraph
- CISA: https://github.com/cisagov
- Tally: https://github.com/withtally
- Discord X Support FAQ: https://support.discord.com/hc/en-us/articles/14286636704919-Discord-X-Support-Account-discord-support-FAQ
- arXiv: https://x.com/arxiv
