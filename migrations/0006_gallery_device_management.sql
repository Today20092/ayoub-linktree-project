-- Existing upload keys retain their original permissions.
ALTER TABLE gallery_devices ADD COLUMN can_manage INTEGER NOT NULL DEFAULT 0 CHECK (can_manage IN (0, 1));
