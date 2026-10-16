-- Run once in the D1 Console BEFORE pushing booking update 4.
ALTER TABLE bookings ADD COLUMN arrived_at TEXT;
ALTER TABLE bookings ADD COLUMN notes TEXT;
