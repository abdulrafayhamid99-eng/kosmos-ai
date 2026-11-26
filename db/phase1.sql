CREATE TABLE IF NOT EXISTS kosmos_accounts (
  user_id text PRIMARY KEY,
  credits integer NOT NULL DEFAULT 0 CHECK (credits >= 0)
);

CREATE TABLE IF NOT EXISTS kosmos_renders (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES kosmos_accounts(user_id),
  credits integer NOT NULL CHECK (credits >= 0),
  is_preview boolean NOT NULL,
  state text NOT NULL DEFAULT 'processing' CHECK (state IN ('processing', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kosmos_renders_owner ON kosmos_renders (user_id, created_at);

CREATE TABLE IF NOT EXISTS kosmos_payments (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES kosmos_accounts(user_id),
  credits integer NOT NULL CHECK (credits > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
