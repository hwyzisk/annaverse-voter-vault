// Fix voter aliases to match the voter_id field
import pkg from 'pg';
const { Client } = pkg;

async function fixAliasesFinal() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // Update aliases to match the voter_id
    const aliasResult = await client.query(`
      UPDATE contact_aliases
      SET alias = CONCAT('Voter-', c.voter_id)
      FROM contacts c
      WHERE contact_aliases.contact_id = c.id
        AND contact_aliases.alias LIKE 'Voter-%'
        AND c.voter_id IS NOT NULL
    `);
    console.log(`✅ Updated ${aliasResult.rowCount} voter aliases`);

    // Show final results
    const sample = await client.query(`
      SELECT
        c.full_name,
        c.voter_id,
        ca.alias as voter_alias
      FROM contacts c
      JOIN contact_aliases ca ON c.id = ca.contact_id
      WHERE ca.alias LIKE 'Voter-%'
      LIMIT 5
    `);

    console.log('📊 Final aliases:');
    console.table(sample.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixAliasesFinal();