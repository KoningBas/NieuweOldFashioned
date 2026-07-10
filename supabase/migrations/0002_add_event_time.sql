-- Adds an optional start time to quote requests. The quote wizard's step 3 now
-- collects a "begintijd" (event start time) alongside the event date. Existing
-- rows predate this column, so it is nullable; new inserts from the public form
-- always supply it (the wizard makes it required client-side).
--
-- Stored as a bare `time` (no timezone): it is a wall-clock start time for the
-- event, interpreted in the business's local time, same convention as the
-- availability.start_time / end_time columns.
alter table quote_requests add column event_time time;
