import { query } from "./pool.js";

export async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS recipients (
      id BIGSERIAL PRIMARY KEY,
      line_id TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('user', 'group', 'room')),
      display_name TEXT NOT NULL,
      picture_url TEXT,
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_source JSONB NOT NULL DEFAULT '{}'::jsonb,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS recipients_type_display_name_idx
      ON recipients(type, display_name);

    CREATE TABLE IF NOT EXISTS uploaded_images (
      id BIGSERIAL PRIMARY KEY,
      public_id TEXT NOT NULL,
      original_url TEXT NOT NULL,
      preview_url TEXT NOT NULL,
      bytes INTEGER,
      format TEXT,
      width INTEGER,
      height INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS daily_campaign (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      send_time TEXT NOT NULL DEFAULT '09:00',
      timezone TEXT NOT NULL DEFAULT 'Asia/Bangkok',
      message_text TEXT NOT NULL DEFAULT '',
      image_id BIGINT REFERENCES uploaded_images(id) ON DELETE SET NULL,
      all_recipients BOOLEAN NOT NULL DEFAULT TRUE,
      recipient_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      last_sent_date TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    INSERT INTO daily_campaign (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING;

    CREATE TABLE IF NOT EXISTS delivery_logs (
      id BIGSERIAL PRIMARY KEY,
      campaign_id INTEGER,
      mode TEXT NOT NULL CHECK (mode IN ('manual', 'scheduled')),
      recipient_id BIGINT REFERENCES recipients(id) ON DELETE SET NULL,
      recipient_line_id TEXT NOT NULL,
      recipient_type TEXT NOT NULL,
      recipient_display_name TEXT NOT NULL,
      message_text TEXT,
      image_id BIGINT REFERENCES uploaded_images(id) ON DELETE SET NULL,
      status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
      error_message TEXT,
      request_id TEXT,
      sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS delivery_logs_sent_at_idx
      ON delivery_logs(sent_at DESC);

    CREATE TABLE IF NOT EXISTS webhook_events (
      webhook_event_id TEXT PRIMARY KEY,
      event_type TEXT,
      source_type TEXT,
      source_id TEXT,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}
