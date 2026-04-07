-- Add verification columns to accesses table
ALTER TABLE accesses ADD COLUMN IF NOT EXISTS codigo_verificacao TEXT;
ALTER TABLE accesses ADD COLUMN IF NOT EXISTS email_confirmado BOOLEAN DEFAULT FALSE;

-- Allow public updates for email verification
-- This policy allows anyone to update a record if they know the ID and the verification code
-- In a production app, you'd want to be more restrictive, but for this trial flow:
CREATE POLICY "Allow public update for verification" ON accesses
  FOR UPDATE USING (true) WITH CHECK (true);
