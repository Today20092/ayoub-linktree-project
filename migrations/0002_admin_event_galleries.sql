CREATE TABLE event_galleries (
  event_slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  event_date TEXT,
  event_time TEXT,
  event_venue TEXT,
  summary TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Event Photography',
  flyer_object_key TEXT,
  flyer_width INTEGER CHECK (flyer_width IS NULL OR flyer_width > 0),
  flyer_height INTEGER CHECK (flyer_height IS NULL OR flyer_height > 0),
  flyer_alt TEXT,
  coming_soon INTEGER NOT NULL DEFAULT 1 CHECK (coming_soon IN (0, 1)),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE gallery_photos (
  id TEXT PRIMARY KEY,
  event_slug TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL,
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  alt TEXT NOT NULL,
  uploader_name TEXT,
  source TEXT NOT NULL CHECK (source IN ('admin', 'guest')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX gallery_photos_event_created
  ON gallery_photos (event_slug, created_at);

CREATE TABLE gallery_invites (
  token TEXT PRIMARY KEY,
  event_slug TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  last_used_at INTEGER
);

CREATE INDEX gallery_invites_event_created
  ON gallery_invites (event_slug, created_at);
