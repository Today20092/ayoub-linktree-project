-- Device keys are hashed and revocable. Receipts intentionally survive photo deletion.
CREATE TABLE gallery_devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE gallery_upload_receipts (
  event_slug TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  owner TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('uploading', 'complete')),
  lease_until INTEGER NOT NULL,
  photo_id TEXT,
  PRIMARY KEY (event_slug, sha256)
);
