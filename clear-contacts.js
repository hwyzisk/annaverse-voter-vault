import { Pool } from '@neondatabase/serverless';
import 'dotenv/config';

async function clearAllContacts() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('🗑️  Clearing all contact data...');

    // Clear audit logs first (they reference contacts but don't cascade)
    console.log('   Clearing audit logs...');
    const auditResult = await pool.query('DELETE FROM audit_logs WHERE contact_id IS NOT NULL');
    console.log(`   ✅ Deleted ${auditResult.rowCount} audit log entries`);

    // Clear all contacts (this will cascade delete aliases, phones, emails)
    console.log('   Clearing contacts (and related data via cascade)...');
    const contactResult = await pool.query('DELETE FROM contacts');
    console.log(`   ✅ Deleted ${contactResult.rowCount} contacts`);

    // Verify tables are empty
    console.log('🔍 Verifying database is clean...');

    const checks = await Promise.all([
      pool.query('SELECT COUNT(*) FROM contacts'),
      pool.query('SELECT COUNT(*) FROM contact_aliases'),
      pool.query('SELECT COUNT(*) FROM contact_phones'),
      pool.query('SELECT COUNT(*) FROM contact_emails'),
      pool.query('SELECT COUNT(*) FROM audit_logs WHERE contact_id IS NOT NULL')
    ]);

    const [contacts, aliases, phones, emails, audits] = checks;

    console.log('📊 Final counts:');
    console.log(`   Contacts: ${contacts.rows[0].count}`);
    console.log(`   Aliases: ${aliases.rows[0].count}`);
    console.log(`   Phones: ${phones.rows[0].count}`);
    console.log(`   Emails: ${emails.rows[0].count}`);
    console.log(`   Contact Audit Logs: ${audits.rows[0].count}`);

    if (contacts.rows[0].count === '0') {
      console.log('✅ Database successfully cleared! Ready for fresh import.');
    } else {
      console.log('❌ Some contacts remain. Check for errors.');
    }

  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

clearAllContacts()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });