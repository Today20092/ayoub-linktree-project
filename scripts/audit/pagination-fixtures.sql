-- Local-only fixtures: never apply to preview or production.
DELETE FROM gallery_photos WHERE event_slug LIKE 'pagination-test-%';
DELETE FROM event_galleries WHERE event_slug LIKE 'pagination-test-%';
INSERT INTO event_galleries (event_slug, title, summary, coming_soon, status, is_unlisted, share_token) VALUES
('pagination-test-unlisted', 'Pagination test', 'Local fixture', 0, 'published', 1, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'),
('pagination-test-hidden', 'Hidden test', 'Local fixture', 0, 'hidden', 1, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'),
('pagination-test-exact', 'Exact page test', 'Local fixture', 0, 'published', 0, NULL),
('pagination-test-empty', 'Empty test', 'Local fixture', 1, 'coming_soon', 0, NULL);
WITH RECURSIVE numbers(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM numbers WHERE n<43)
INSERT INTO gallery_photos (id, event_slug, object_key, original_filename, width, height, alt, source, created_at)
SELECT 'pagination-test-unlisted-' || n, 'pagination-test-unlisted', 'events/pagination-test-unlisted/photos/' || printf('%03d.jpg', n), printf('%03d.jpg', n), 100, 100, 'Fixture photo ' || n, CASE WHEN n<=39 THEN 'admin' ELSE 'guest' END, n FROM numbers;
WITH RECURSIVE numbers(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM numbers WHERE n<40)
INSERT INTO gallery_photos (id, event_slug, object_key, original_filename, width, height, alt, source, created_at)
SELECT 'pagination-test-exact-' || n, 'pagination-test-exact', 'events/pagination-test-exact/photos/' || printf('%03d.jpg', n), printf('%03d.jpg', n), 100, 100, 'Fixture photo ' || n, 'admin', n FROM numbers;
