ALTER TABLE event_galleries
  ADD COLUMN cover_src TEXT;

ALTER TABLE event_galleries
  ADD COLUMN cover_width INTEGER CHECK (cover_width IS NULL OR cover_width > 0);

ALTER TABLE event_galleries
  ADD COLUMN cover_height INTEGER CHECK (cover_height IS NULL OR cover_height > 0);

ALTER TABLE event_galleries
  ADD COLUMN cover_alt TEXT;
