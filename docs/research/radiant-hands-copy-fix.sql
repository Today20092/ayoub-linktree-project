-- Managed gallery content correction, applied and read back November 5, 2026.
-- Target: production ayoub-gallery-data; date/status preserved. Repeat is a no-op.
-- Review the current row first. A changed summary/status/date makes this a no-op.
-- Keep the gallery coming soon: no delivery date has been confirmed.
-- Preview only in an explicitly isolated local/preview database containing this row.
-- Do not run against a dev server's bindings without checking whether they are remote.
-- For production, apply this reviewed content correction through the gallery
-- dashboard or an explicitly authorized D1 operation, then read back the row.

SELECT event_slug, event_date, summary, status
FROM event_galleries
WHERE event_slug = 'radiant-hands-annual-event-giving-that-never-ends';

UPDATE event_galleries
SET summary = 'Radiant Hands’ annual fundraising event, Giving That Never Ends — Share the Goodness / Khair, took place on October 17, 2026, at Embassy Suites Tampa USF. Photos and video coverage are coming soon.',
    updated_at = unixepoch()
WHERE event_slug = 'radiant-hands-annual-event-giving-that-never-ends'
  AND event_date = '2026-10-17'
  AND status = 'coming_soon'
  AND summary = 'Radiant Hands’ annual fundraising event, Giving That Never Ends — Share the Goodness / Khair. Join the community on Saturday, October 17, 2026, at Embassy Suites Tampa USF. Reception begins at 4:30 PM, and the event starts at 5 PM. I’ll be attending to photograph the event and create a video. Photos and video coverage are coming soon.';

SELECT changes() AS updated_rows;

SELECT event_slug, event_date, summary, status
FROM event_galleries
WHERE event_slug = 'radiant-hands-annual-event-giving-that-never-ends';
