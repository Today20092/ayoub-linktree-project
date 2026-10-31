-- Local-only R2 image regression fixtures. Never apply remotely; remove before audits.
INSERT INTO event_galleries (event_slug, title, summary, coming_soon, status, cover_src, cover_width, cover_height, flyer_object_key, flyer_width, flyer_height, flyer_alt) VALUES
('image-test-published', 'Image test', 'Local fixture', 0, 'published', '/api/gallery-media/events/image-test-published/photos/sample.jpg/', 1200, 630, NULL, NULL, NULL, NULL),
('image-test-coming-soon', 'Flyer test', 'Local fixture', 1, 'coming_soon', NULL, NULL, NULL, 'events/image-test-published/photos/sample.jpg', 1200, 630, 'Fixture flyer');
INSERT INTO gallery_photos (id, event_slug, object_key, original_filename, width, height, alt, source) VALUES
('image-test-photo', 'image-test-published', 'events/image-test-published/photos/sample.jpg', 'sample.jpg', 1200, 630, 'Fixture photograph', 'admin');
