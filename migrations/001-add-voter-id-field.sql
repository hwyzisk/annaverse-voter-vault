-- Migration: Add voter_id field and clean up data
-- This migration can be safely applied to both local and production databases

-- Step 1: Add voter_id column if it doesn't exist
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS voter_id VARCHAR;

-- Step 2: Create index for voter_id
CREATE INDEX IF NOT EXISTS idx_contacts_voter_id ON contacts(voter_id);

-- Step 3: Remove all existing voter ID aliases (we don't want voter IDs in nicknames)
DELETE FROM contact_aliases WHERE alias LIKE 'Voter-%';

-- Step 4: Drop voter_id_redacted column and its index (we no longer need redacted voter IDs)
DROP INDEX IF EXISTS idx_contacts_voter_id_redacted;
ALTER TABLE contacts DROP COLUMN IF EXISTS voter_id_redacted;

-- Step 5: Add comment to document the change
COMMENT ON COLUMN contacts.voter_id IS 'Full voter ID number from voter registration data';