-- Run once in the D1 Console BEFORE pushing booking update 2.
ALTER TABLE bookings ADD COLUMN source TEXT NOT NULL DEFAULT 'online';
