-- Personal Dashboard Schema
-- Run this against your Supabase project via: supabase db push
-- Or paste directly in Supabase SQL editor

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── tasks ────────────────────────────────────────────────────────────────────
CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','in_progress','done','deferred','archived')),
  priority_score  FLOAT DEFAULT 0,
  manual_priority TEXT CHECK (manual_priority IN ('P1','P2','P3','pinned','not_today') OR manual_priority IS NULL),
  due_date        TIMESTAMPTZ,
  source          TEXT NOT NULL
                    CHECK (source IN ('manual','gmail','slack','monday','notion','calendar')),
  source_item_id  TEXT,   -- external ID in the source system
  source_url      TEXT,   -- link back to original item
  confidence      FLOAT DEFAULT 1.0,
  notion_page_id  TEXT,
  monday_item_id  TEXT,
  slack_thread_ts TEXT,
  gmail_thread_id TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  deferred_until  TIMESTAMPTZ,
  user_edited     BOOLEAN DEFAULT false,
  tags            TEXT[] DEFAULT '{}',
  notes           TEXT
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_source ON tasks(source);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_priority_score ON tasks(priority_score DESC);
CREATE INDEX idx_tasks_notion_page_id ON tasks(notion_page_id);
CREATE INDEX idx_tasks_monday_item_id ON tasks(monday_item_id);

-- ─── source_items ─────────────────────────────────────────────────────────────
CREATE TABLE source_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source      TEXT NOT NULL,
  external_id TEXT NOT NULL,
  raw_data    JSONB,
  fetched_at  TIMESTAMPTZ DEFAULT now(),
  task_id     UUID REFERENCES tasks(id) ON DELETE SET NULL,
  reviewed    BOOLEAN DEFAULT false,
  UNIQUE (source, external_id)
);

CREATE INDEX idx_source_items_source ON source_items(source);
CREATE INDEX idx_source_items_task_id ON source_items(task_id);

-- ─── sync_log ─────────────────────────────────────────────────────────────────
CREATE TABLE sync_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source         TEXT NOT NULL,
  started_at     TIMESTAMPTZ DEFAULT now(),
  completed_at   TIMESTAMPTZ,
  status         TEXT CHECK (status IN ('running','success','partial','failed')),
  items_found    INT DEFAULT 0,
  tasks_created  INT DEFAULT 0,
  tasks_updated  INT DEFAULT 0,
  error_detail   TEXT
);

CREATE INDEX idx_sync_log_source ON sync_log(source);
CREATE INDEX idx_sync_log_started_at ON sync_log(started_at DESC);

-- ─── config ───────────────────────────────────────────────────────────────────
CREATE TABLE config (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- Seed defaults
INSERT INTO config (key, value) VALUES
  ('sync_interval_minutes',   '30'),
  ('confidence_threshold',    '0.65'),
  ('email_lookback_hours',    '48'),
  ('slack_lookback_hours',    '24'),
  ('monday_due_days_ahead',   '14'),
  ('max_top_priorities',      '7'),
  ('follow_up_threshold_hours','24'),
  ('meeting_prep_window_hours','3'),
  ('monday_board_ids',        '[]'),
  ('notion_database_id',      '""'),
  ('timezone',                '"America/New_York"')
ON CONFLICT (key) DO NOTHING;

-- ─── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
