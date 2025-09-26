// Fix the voter aliases to remove the asterisk
import pkg from 'pg';
const { Client } = pkg;

async function fixAliases() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // Fix aliases by removing the asterisk - updated regex
    const aliasResult = await client.query(`
      UPDATE contact_aliases
      SET alias = CONCAT('Voter-', SUBSTRING(alias FROM 10))
      WHERE alias LIKE 'Voter-*%'
    `);
    console.log(`✅ Updated ${aliasResult.rowCount} voter aliases`);

    // Show updated results
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

    console.log('📊 Updated aliases:');
    console.table(sample.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixAliases();