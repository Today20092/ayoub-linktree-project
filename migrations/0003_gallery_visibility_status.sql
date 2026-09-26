ALTER TABLE event_galleries
  ADD COLUMN status TEXT NOT NULL DEFAULT 'coming_soon'
  CHECK (status IN ('published', 'coming_soon', 'hidden'));

UPDATE event_galleries
SET status = CASE coming_soon
  WHEN 1 THEN 'coming_soon'
  ELSE 'published'
END;
