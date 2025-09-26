-- Add voter_id column if it doesn't exist
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS voter_id VARCHAR;

-- Create index for voter_id
CREATE INDEX IF NOT EXISTS idx_contacts_voter_id ON contacts(voter_id);

-- Extract voter ID from redacted format (e.g., "***7539" -> "7539")
UPDATE contacts
SET voter_id = SUBSTRING(voter_id_redacted FROM 4)
WHERE voter_id_redacted IS NOT NULL
  AND voter_id_redacted LIKE '***%'
  AND (voter_id IS NULL OR voter_id = '');

-- Update nicknames from "Voter-***7539" to "Voter-7539"
UPDATE contact_aliases
SET alias = CONCAT('Voter-', SUBSTRING(alias FROM 9))
WHERE alias LIKE 'Voter-***%';

-- Show results
SELECT
  full_name,
  voter_id_redacted,
  voter_id,
  (SELECT alias FROM contact_aliases WHERE contact_id = contacts.id AND alias LIKE 'Voter-%' LIMIT 1) as voter_alias
FROM contacts
WHERE voter_id_redacted IS NOT NULL
LIMIT 5;