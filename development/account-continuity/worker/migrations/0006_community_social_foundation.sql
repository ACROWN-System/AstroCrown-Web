-- AstroCrown-native community and social foundation.
-- Every identity is an existing AstroCrown account; no social-only identity,
-- external network dependency, financial weighting or election authority is created.

CREATE TABLE IF NOT EXISTS community_spaces (
  space_id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  purpose TEXT NOT NULL DEFAULT '',
  rules_text TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL CHECK (visibility IN ('public','restricted','private')),
  membership_policy TEXT NOT NULL CHECK (membership_policy IN ('open','request','invite_only')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','suspended')),
  parent_space_id TEXT REFERENCES community_spaces(space_id),
  created_by_account_id TEXT REFERENCES auth_accounts(account_id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (visibility <> 'private' OR membership_policy = 'invite_only'),
  CHECK (visibility <> 'restricted' OR membership_policy <> 'open')
);
CREATE INDEX IF NOT EXISTS community_spaces_discovery_idx
  ON community_spaces(status, visibility, name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS community_memberships (
  space_id TEXT NOT NULL REFERENCES community_spaces(space_id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES auth_accounts(account_id) ON DELETE CASCADE,
  membership_status TEXT NOT NULL CHECK (membership_status IN ('pending','active','left','banned')),
  member_role TEXT NOT NULL DEFAULT 'member' CHECK (member_role IN ('owner','moderator','member')),
  requested_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (space_id, account_id)
);
CREATE INDEX IF NOT EXISTS community_memberships_account_idx
  ON community_memberships(account_id, membership_status, updated_at);
CREATE INDEX IF NOT EXISTS community_memberships_space_idx
  ON community_memberships(space_id, membership_status, member_role);

CREATE TABLE IF NOT EXISTS community_posts (
  post_id TEXT PRIMARY KEY,
  author_account_id TEXT NOT NULL REFERENCES auth_accounts(account_id),
  space_id TEXT REFERENCES community_spaces(space_id),
  parent_post_id TEXT REFERENCES community_posts(post_id),
  content TEXT NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 10000),
  visibility TEXT NOT NULL CHECK (visibility IN ('public','members')),
  created_at INTEGER NOT NULL,
  edited_at INTEGER,
  deleted_at INTEGER,
  moderation_status TEXT NOT NULL DEFAULT 'visible'
    CHECK (moderation_status IN ('visible','hidden','removed')),
  CHECK (space_id IS NOT NULL OR visibility = 'public')
);
CREATE INDEX IF NOT EXISTS community_posts_global_feed_idx
  ON community_posts(space_id, visibility, moderation_status, deleted_at, created_at DESC, post_id DESC);
CREATE INDEX IF NOT EXISTS community_posts_author_idx
  ON community_posts(author_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_parent_idx
  ON community_posts(parent_post_id, created_at, post_id);

CREATE TABLE IF NOT EXISTS community_post_reactions (
  post_id TEXT NOT NULL REFERENCES community_posts(post_id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES auth_accounts(account_id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('like','insightful','support')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (post_id, account_id, reaction)
);
CREATE INDEX IF NOT EXISTS community_post_reactions_post_idx
  ON community_post_reactions(post_id, reaction, created_at);

CREATE TABLE IF NOT EXISTS community_post_bookmarks (
  post_id TEXT NOT NULL REFERENCES community_posts(post_id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES auth_accounts(account_id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (post_id, account_id)
);
CREATE INDEX IF NOT EXISTS community_post_bookmarks_account_idx
  ON community_post_bookmarks(account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS community_account_controls (
  account_id TEXT NOT NULL REFERENCES auth_accounts(account_id) ON DELETE CASCADE,
  target_account_id TEXT NOT NULL REFERENCES auth_accounts(account_id) ON DELETE CASCADE,
  control_type TEXT NOT NULL CHECK (control_type IN ('block','mute')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, target_account_id, control_type),
  CHECK (account_id <> target_account_id)
);
CREATE INDEX IF NOT EXISTS community_account_controls_target_idx
  ON community_account_controls(target_account_id, control_type);

CREATE TABLE IF NOT EXISTS community_content_reports (
  report_id TEXT PRIMARY KEY,
  reporter_account_id TEXT NOT NULL REFERENCES auth_accounts(account_id),
  target_type TEXT NOT NULL CHECK (target_type IN ('post','community')),
  target_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('spam','harassment','impersonation','privacy','illegal','other')),
  details TEXT NOT NULL DEFAULT '',
  report_status TEXT NOT NULL DEFAULT 'open'
    CHECK (report_status IN ('open','in_review','resolved','dismissed')),
  created_at INTEGER NOT NULL,
  reviewed_by_account_id TEXT REFERENCES auth_accounts(account_id),
  reviewed_at INTEGER,
  resolution TEXT NOT NULL DEFAULT '',
  UNIQUE (reporter_account_id, target_type, target_id)
);
CREATE INDEX IF NOT EXISTS community_content_reports_queue_idx
  ON community_content_reports(report_status, created_at);

CREATE TABLE IF NOT EXISTS community_moderation_audit (
  audit_id TEXT PRIMARY KEY,
  actor_account_id TEXT REFERENCES auth_accounts(account_id),
  event_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  detail_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS community_moderation_audit_target_idx
  ON community_moderation_audit(target_type, target_id, created_at);
CREATE TRIGGER IF NOT EXISTS community_moderation_audit_no_update
BEFORE UPDATE ON community_moderation_audit
BEGIN
  SELECT RAISE(ABORT, 'community moderation audit is append-only');
END;
CREATE TRIGGER IF NOT EXISTS community_moderation_audit_no_delete
BEFORE DELETE ON community_moderation_audit
BEGIN
  SELECT RAISE(ABORT, 'community moderation audit is append-only');
END;

-- Initial discoverable spaces are platform defaults, not a closed taxonomy.
INSERT OR IGNORE INTO community_spaces
  (space_id,slug,name,description,purpose,rules_text,visibility,membership_policy,status,created_by_account_id,created_at,updated_at)
VALUES
  ('space_finance_tokenomics','finance-tokenomics','Finance & Tokenomics','Discussion of financial systems, tokenomics, markets and economic design.','Research and discuss economic mechanisms, market structure and token system design.','Discuss evidence and assumptions clearly. Do not present speculation as financial advice.','public','open','active',NULL,unixepoch(),unixepoch()),
  ('space_aerospace','aerospace','Aerospace','A community for aerospace, spaceflight, exploration and related engineering.','Share research, engineering work and developments in aerospace and space systems.','Distinguish measured results, simulations and proposals.','public','open','active',NULL,unixepoch(),unixepoch()),
  ('space_computing_power','computing-power-infrastructure','Computing Power & Infrastructure','Computing infrastructure, distributed systems, energy and high-performance compute.','Coordinate research and discussion around resilient computing resources and infrastructure.','Include reproducible measurements and source information where possible.','public','open','active',NULL,unixepoch(),unixepoch()),
  ('space_superintelligence','superintelligence-ai-systems','Superintelligence & AI Systems','AI, superintelligence, model systems, agent architectures and evaluations.','Share research and engineering on intelligent systems and their evaluation.','Label claims, benchmarks, simulations and conjectures distinctly.','public','open','active',NULL,unixepoch(),unixepoch()),
  ('space_ethics_governance','ethics-governance','Ethics & Governance','Ethical analysis, governance design, institutions and accountability.','Develop transparent, evidence-led governance and ethical reasoning.','Preserve disagreement and distinguish proposals from adopted decisions.','public','open','active',NULL,unixepoch(),unixepoch()),
  ('space_science_research','science-research','Science & Research','Cross-disciplinary scientific discussion and collaborative research.','Share research questions, methods, data and reproducible findings.','Cite sources and disclose uncertainty and limitations.','public','open','active',NULL,unixepoch(),unixepoch());
