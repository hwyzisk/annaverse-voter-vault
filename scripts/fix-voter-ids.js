// Simple Node.js script to fix voter IDs
import pkg from 'pg';
const { Client } = pkg;

async function fixVoterIds() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // Add voter_id column if it doesn't exist
    await client.query(`
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS voter_id VARCHAR
    `);
    console.log('✅ Added voter_id column');

    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_voter_id ON contacts(voter_id)
    `);
    console.log('✅ Added index');

    // Extract voter ID from redacted format
    const updateResult = await client.query(`
      UPDATE contacts
      SET voter_id = SUBSTRING(voter_id_redacted FROM 4)
      WHERE voter_id_redacted IS NOT NULL
        AND voter_id_redacted LIKE '***%'
        AND (voter_id IS NULL OR voter_id = '')
    `);
    console.log(`✅ Updated ${updateResult.rowCount} contact voter IDs`);

    // Update nicknames
    const aliasResult = await client.query(`
      UPDATE contact_aliases
      SET alias = CONCAT('Voter-', SUBSTRING(alias FROM 9))
      WHERE alias LIKE 'Voter-***%'
    `);
    console.log(`✅ Updated ${aliasResult.rowCount} voter aliases`);

    // Show sample results
    const sample = await client.query(`
      SELECT
        full_name,
        voter_id_redacted,
        voter_id,
        (SELECT alias FROM contact_aliases WHERE contact_id = contacts.id AND alias LIKE 'Voter-%' LIMIT 1) as voter_alias
      FROM contacts
      WHERE voter_id_redacted IS NOT NULL
      LIMIT 5
    `);

    console.log('📊 Sample results:');
    console.table(sample.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixVoterIds();