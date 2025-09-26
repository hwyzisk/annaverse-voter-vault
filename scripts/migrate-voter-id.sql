-- Add voter_id column if it doesn't exist
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS voter_id VARCHAR;

-- Create index for voter_id
CREATE INDEX IF NOT EXISTS idx_contacts_voter_id ON contacts(voter_id);

-- Update voter_id by extracting the full number from redacted format
-- Example: "***0438" becomes "0438" (this is a placeholder - real data may vary)
UPDATE contacts
SET voter_id = CASE
  WHEN voter_id_redacted IS NOT NULL AND voter_id_redacted LIKE '***%'
  THEN SUBSTRING(voter_id_redacted FROM 4)
  ELSE voter_id_redacted
END
WHERE voter_id IS NULL;