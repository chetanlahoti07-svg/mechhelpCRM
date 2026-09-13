-- Migration: Setup / update daily_garage_board_entries table

-- 1. Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS daily_garage_board_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  garage_id TEXT NOT NULL,
  created_date DATE NOT NULL,
  customer_name TEXT NOT NULL,
  car_name TEXT NOT NULL,
  number_plate TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  source TEXT NOT NULL DEFAULT 'custom',
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add columns if table already existed previously
ALTER TABLE daily_garage_board_entries ADD COLUMN IF NOT EXISTS number_plate TEXT;
ALTER TABLE daily_garage_board_entries ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'custom';
ALTER TABLE daily_garage_board_entries ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;
ALTER TABLE daily_garage_board_entries ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- 3. Migrate any previous 'converted' status entries to 'done'
UPDATE daily_garage_board_entries SET status = 'done' WHERE status = 'converted';

-- 4. Add check constraints safely
ALTER TABLE daily_garage_board_entries DROP CONSTRAINT IF EXISTS chk_dgb_status;
ALTER TABLE daily_garage_board_entries ADD CONSTRAINT chk_dgb_status CHECK (status IN ('pending', 'arrived', 'done'));

ALTER TABLE daily_garage_board_entries DROP CONSTRAINT IF EXISTS chk_dgb_source;
ALTER TABLE daily_garage_board_entries ADD CONSTRAINT chk_dgb_source CHECK (source IN ('salesiq', 'custom'));

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_dgb_entries_date ON daily_garage_board_entries(created_date);
CREATE INDEX IF NOT EXISTS idx_dgb_entries_garage ON daily_garage_board_entries(garage_id);

-- 6. Enable RLS Policy
ALTER TABLE daily_garage_board_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to daily_garage_board_entries" ON daily_garage_board_entries;
CREATE POLICY "Allow all access to daily_garage_board_entries"
  ON daily_garage_board_entries FOR ALL USING (true);
