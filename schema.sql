-- Run once in Cloudflare: Storage & databases > D1 > purrfect-bookings > Console.
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,                 -- booking reference, e.g. PC-7K3QD
  date TEXT NOT NULL,                  -- visit date, YYYY-MM-DD (UK time)
  hour INTEGER NOT NULL,               -- slot start hour, e.g. 14
  adults INTEGER NOT NULL,
  children INTEGER NOT NULL DEFAULT 0,
  child_ages TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  access TEXT,
  price_each REAL,
  total REAL,
  payment TEXT NOT NULL DEFAULT 'on_arrival',
  status TEXT NOT NULL DEFAULT 'confirmed',   -- confirmed | cancelled
  disclaimer_at TEXT NOT NULL,         -- when the customer agreed to the disclaimer
  disclaimer_version TEXT,
  created_at TEXT NOT NULL,
  cancelled_at TEXT,
  reminder_sent INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'online',     -- online | phone | walk-in | other
  arrived_at TEXT,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings (date, hour, status);

-- Louise's changes to a slot: fewer places for walk-ins, or 0 to block it.
CREATE TABLE IF NOT EXISTS slot_overrides (
  date TEXT NOT NULL,
  hour INTEGER NOT NULL,
  max_guests INTEGER NOT NULL,
  PRIMARY KEY (date, hour)
);
