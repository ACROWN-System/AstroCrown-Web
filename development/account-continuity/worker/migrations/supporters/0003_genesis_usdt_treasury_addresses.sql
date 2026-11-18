-- Record the owner-supplied public Genesis USD₮ receiving addresses.
-- This migration deliberately keeps all three networks disabled.
-- It does not prove signing control, verify token decimals, or enable payment intake.

UPDATE supporter_network_config
SET treasury_address = '0xbbb77071149a5F113Df15E78c58518917afa950A',
    enabled = 0,
    decimals_verified_at = NULL,
    config_version = NULL,
    updated_at = unixepoch()
WHERE network = 'ethereum';

UPDATE supporter_network_config
SET treasury_address = 'TAKHQcuJ3RLsZZxCorWc3rav6M28dS6VTR',
    enabled = 0,
    decimals_verified_at = NULL,
    config_version = NULL,
    updated_at = unixepoch()
WHERE network = 'tron';

UPDATE supporter_network_config
SET treasury_address = 'AWyq9E7Wsdjv9VyoTs84XGiubQGZM7fETnZ8ddfArwkG',
    enabled = 0,
    decimals_verified_at = NULL,
    config_version = NULL,
    updated_at = unixepoch()
WHERE network = 'solana';
