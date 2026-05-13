import { query } from "./pool.js";

export async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_oa_accounts (
      id BIGSERIAL PRIMARY KEY,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bot_line_oas (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      channel_access_token TEXT NOT NULL,
      channel_secret TEXT NOT NULL,
      webhook_key TEXT UNIQUE NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_bot_assignments (
      user_oa_id BIGINT NOT NULL REFERENCES user_oa_accounts(id) ON DELETE CASCADE,
      bot_id BIGINT NOT NULL REFERENCES bot_line_oas(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_oa_id, bot_id)
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS recipients (
      id BIGSERIAL PRIMARY KEY,
      bot_id BIGINT REFERENCES bot_line_oas(id) ON DELETE CASCADE,
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
      bot_id BIGINT REFERENCES bot_line_oas(id) ON DELETE CASCADE,
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
      id INTEGER PRIMARY KEY DEFAULT 1,
      bot_id BIGINT REFERENCES bot_line_oas(id) ON DELETE CASCADE,
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

    CREATE TABLE IF NOT EXISTS delivery_logs (
      id BIGSERIAL PRIMARY KEY,
      bot_id BIGINT REFERENCES bot_line_oas(id) ON DELETE SET NULL,
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
      bot_id BIGINT REFERENCES bot_line_oas(id) ON DELETE CASCADE,
      event_type TEXT,
      source_type TEXT,
      source_id TEXT,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    ALTER TABLE recipients ADD COLUMN IF NOT EXISTS bot_id BIGINT REFERENCES bot_line_oas(id) ON DELETE CASCADE;
    ALTER TABLE uploaded_images ADD COLUMN IF NOT EXISTS bot_id BIGINT REFERENCES bot_line_oas(id) ON DELETE CASCADE;
    ALTER TABLE daily_campaign ADD COLUMN IF NOT EXISTS bot_id BIGINT REFERENCES bot_line_oas(id) ON DELETE CASCADE;
    ALTER TABLE delivery_logs ADD COLUMN IF NOT EXISTS bot_id BIGINT REFERENCES bot_line_oas(id) ON DELETE SET NULL;
    ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS bot_id BIGINT REFERENCES bot_line_oas(id) ON DELETE CASCADE;
    ALTER TABLE daily_campaign DROP CONSTRAINT IF EXISTS daily_campaign_id_check;
    ALTER TABLE recipients DROP CONSTRAINT IF EXISTS recipients_line_id_key;
    CREATE SEQUENCE IF NOT EXISTS daily_campaign_id_seq;
    ALTER TABLE daily_campaign ALTER COLUMN id SET DEFAULT nextval('daily_campaign_id_seq');
    SELECT setval(
      'daily_campaign_id_seq',
      COALESCE((SELECT MAX(id) FROM daily_campaign), 0) + 1,
      false
    );
  `);

  const migration = await query(
    "SELECT 1 FROM schema_migrations WHERE id = $1",
    ["multi_bot_v1_reset"]
  );

  if (!migration.rowCount) {
    await query(`
      DELETE FROM webhook_events;
      DELETE FROM delivery_logs;
      DELETE FROM daily_campaign;
      DELETE FROM uploaded_images;
      DELETE FROM recipients;
      DROP TABLE IF EXISTS line_settings;
      INSERT INTO schema_migrations (id) VALUES ('multi_bot_v1_reset');
    `);
  }

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS recipients_bot_line_id_uidx
      ON recipients(bot_id, line_id);
    CREATE UNIQUE INDEX IF NOT EXISTS daily_campaign_bot_id_uidx
      ON daily_campaign(bot_id);
    CREATE INDEX IF NOT EXISTS recipients_bot_type_display_name_idx
      ON recipients(bot_id, type, display_name);
    CREATE INDEX IF NOT EXISTS delivery_logs_bot_sent_at_idx
      ON delivery_logs(bot_id, sent_at DESC);
    CREATE INDEX IF NOT EXISTS uploaded_images_bot_created_at_idx
      ON uploaded_images(bot_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS user_bot_assignments_bot_idx
      ON user_bot_assignments(bot_id);
  `);
}
