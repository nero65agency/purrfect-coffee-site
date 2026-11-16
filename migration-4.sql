-- Run once in the D1 Console BEFORE pushing the SumUp payments update.
ALTER TABLE bookings ADD COLUMN hold_until TEXT;
ALTER TABLE bookings ADD COLUMN checkout_id TEXT;
ALTER TABLE bookings ADD COLUMN pay_url TEXT;
ALTER TABLE bookings ADD COLUMN paid_at TEXT;
