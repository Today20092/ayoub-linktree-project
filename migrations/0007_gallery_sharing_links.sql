ALTER TABLE event_galleries ADD COLUMN is_unlisted INTEGER NOT NULL DEFAULT 0 CHECK(is_unlisted IN (0, 1));
ALTER TABLE event_galleries ADD COLUMN share_token TEXT;
CREATE UNIQUE INDEX event_gallery_share_token ON event_galleries(share_token) WHERE share_token IS NOT NULL;
ALTER TABLE gallery_settings ADD COLUMN upload_token TEXT;
