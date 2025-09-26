// Quick script to populate voter_id from voter_id_redacted for testing
// This extracts what we can from the redacted format
// Note: This won't give you the real full voter ID, just removes the *** prefix

import { db } from '../server/db';
import { contacts } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function fixVoterIds() {
  console.log('🔧 Fixing voter IDs for testing...');

  // Add voter_id column if it doesn't exist
  await db.execute(sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS voter_id VARCHAR`);

  // Extract numbers from redacted format (e.g., "***0438" -> "0438")
  // This is just for testing - real voter IDs would be longer
  const result = await db.execute(sql`
    UPDATE contacts
    SET voter_id = CASE
      WHEN voter_id_redacted IS NOT NULL AND voter_id_redacted LIKE '***%'
      THEN SUBSTRING(voter_id_redacted FROM 4)
      ELSE NULL
    END
    WHERE voter_id IS NULL
  `);

  console.log('✅ Updated voter IDs from redacted format');

  // Also update any existing "Voter-***" aliases to use the extracted ID
  await db.execute(sql`
    UPDATE contact_aliases
    SET alias = CONCAT('Voter-', SUBSTRING(alias FROM 9))
    WHERE alias LIKE 'Voter-***%'
  `);

  console.log('✅ Updated voter ID aliases');
}

fixVoterIds().catch(console.error);