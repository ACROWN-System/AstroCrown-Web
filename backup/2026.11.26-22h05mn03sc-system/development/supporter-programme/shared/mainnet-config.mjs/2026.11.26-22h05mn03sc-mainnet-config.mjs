// Public, owner-designated Genesis mainnet USD₮ treasury configuration.
// These addresses are not secrets. This configuration does not establish wallet control
// and must never enable payment acceptance by itself.

export const MAINNET_USDT_CONFIG = Object.freeze({
  ethereum: Object.freeze({
    networkIdentifier: "eip155:1",
    tokenIdentifier: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    tokenDecimals: 6,
    treasuryAddress: "0xbbb77071149a5F113Df15E78c58518917afa950A",
  }),
  tron: Object.freeze({
    networkIdentifier: "tron:mainnet",
    tokenIdentifier: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    tokenDecimals: 6,
    treasuryAddress: "TAKHQcuJ3RLsZZxCorWc3rav6M28dS6VTR",
  }),
  solana: Object.freeze({
    networkIdentifier: "solana:mainnet",
    tokenIdentifier: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    tokenDecimals: 6,
    treasuryAddress: "AWyq9E7Wsdjv9VyoTs84XGiubQGZM7fETnZ8ddfArwkG",
  }),
});
