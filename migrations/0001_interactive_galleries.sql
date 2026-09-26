CREATE TABLE gallery_settings (
  event_slug TEXT PRIMARY KEY,
  uploads_enabled INTEGER NOT NULL DEFAULT 0 CHECK (uploads_enabled IN (0, 1)),
  password_salt TEXT,
  password_hash TEXT,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  CHECK (
    (password_salt IS NULL AND password_hash IS NULL)
    OR (password_salt IS NOT NULL AND password_hash IS NOT NULL)
  )
);

CREATE TABLE guest_photos (
  id TEXT PRIMARY KEY,
  event_slug TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL,
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  alt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  published_at INTEGER
);

CREATE INDEX guest_photos_event_status
  ON guest_photos (event_slug, status, created_at);

CREATE TABLE hidden_photos (
  event_slug TEXT NOT NULL,
  filename TEXT NOT NULL,
  hidden_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (event_slug, filename)
);
