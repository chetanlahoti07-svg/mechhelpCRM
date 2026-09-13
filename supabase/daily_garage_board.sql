-- Migration: Setup daily_garage_board_entries table
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_dgb_status CHECK (status IN ('pending', 'arrived', 'done')),
  CONSTRAINT chk_dgb_source CHECK (source IN ('salesiq', 'custom'))
);

CREATE INDEX IF NOT EXISTS idx_dgb_entries_date ON daily_garage_board_entries(created_date);
CREATE INDEX IF NOT EXISTS idx_dgb_entries_garage ON daily_garage_board_entries(garage_id);

-- Enable RLS
ALTER TABLE daily_garage_board_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to daily_garage_board_entries"
  ON daily_garage_board_entries FOR ALL USING (true);
