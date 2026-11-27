-- Private health state for the AstroCrown-owned cross-chain USDT receipt monitor.
-- Payment acceptance stays closed until a recent completed cycle proves all three
-- chains are caught up and the qualifying-receipt settlement queue is not deferred.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS genesis_treasury_monitor_health (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  status TEXT NOT NULL DEFAULT 'DISABLED'
    CHECK (status IN ('DISABLED', 'RUNNING', 'HEALTHY', 'DEGRADED')),
  last_cycle_started_at INTEGER,
  last_cycle_completed_at INTEGER,
  ethereum_caught_up INTEGER NOT NULL DEFAULT 0 CHECK (ethereum_caught_up IN (0,1)),
  tron_caught_up INTEGER NOT NULL DEFAULT 0 CHECK (tron_caught_up IN (0,1)),
  solana_caught_up INTEGER NOT NULL DEFAULT 0 CHECK (solana_caught_up IN (0,1)),
  ethereum_head_occurred_at INTEGER,
  tron_head_occurred_at INTEGER,
  solana_head_occurred_at INTEGER,
  settlement_queue_deferred INTEGER NOT NULL DEFAULT 1 CHECK (settlement_queue_deferred IN (0,1)),
  updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO genesis_treasury_monitor_health(
  singleton,status,last_cycle_started_at,last_cycle_completed_at,
  ethereum_caught_up,tron_caught_up,solana_caught_up,
  ethereum_head_occurred_at,tron_head_occurred_at,solana_head_occurred_at,
  settlement_queue_deferred,updated_at
) VALUES(1,'DISABLED',NULL,NULL,0,0,0,NULL,NULL,NULL,1,unixepoch());

CREATE TRIGGER IF NOT EXISTS genesis_treasury_monitor_health_no_delete
BEFORE DELETE ON genesis_treasury_monitor_health
BEGIN SELECT RAISE(ABORT, 'Genesis treasury monitor health singleton cannot be deleted'); END;
