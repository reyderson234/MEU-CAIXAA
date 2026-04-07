-- Add whatsapp column to accesses table
ALTER TABLE accesses ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Allow public inserts for registration
CREATE POLICY "Allow public inserts for registration" ON accesses
  FOR INSERT WITH CHECK (true);

-- Allow public select for email check during registration
CREATE POLICY "Allow public select for email check" ON accesses
  FOR SELECT USING (true);
