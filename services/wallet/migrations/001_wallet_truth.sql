CREATE TABLE IF NOT EXISTS ctrl_wallet_jobs (
  id uuid PRIMARY KEY,
  wallet text NOT NULL,
  mint text NOT NULL,
  request_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','complete','failed')),
  lease uuid,
  lease_until timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ctrl_wallet_jobs_queue ON ctrl_wallet_jobs(status,created_at);
CREATE TABLE IF NOT EXISTS ctrl_wallet_analyses (
  id uuid PRIMARY KEY REFERENCES ctrl_wallet_jobs(id),
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
