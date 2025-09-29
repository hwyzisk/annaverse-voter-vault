// Quick test script to verify email functionality
import { sendEmail, EmailTemplates } from './server/emailService';

async function testEmail() {
  console.log('Testing email service...');

  if (!process.env.SENDGRID_API_KEY) {
    console.log('❌ SENDGRID_API_KEY not set - this will simulate what happens in production');
    console.log('To test with real emails, set SENDGRID_API_KEY environment variable');
  } else {
    console.log('✅ SENDGRID_API_KEY is set');
  }

  // Test registration confirmation email
  const testEmail = EmailTemplates.registrationConfirmation('test@example.com', 'Test User');
  console.log('\n📧 Registration confirmation email template:');
  console.log('To:', testEmail.to);
  console.log('From:', testEmail.from);
  console.log('Subject:', testEmail.subject);

  // Test sending (will show warning if no API key)
  const result = await sendEmail(testEmail);
  console.log('Send result:', result);

  // Test admin notification email
  const adminEmail = EmailTemplates.adminNotification('admin@example.com', 'Test User', 'test@example.com', '555-1234');
  console.log('\n📧 Admin notification email template:');
  console.log('To:', adminEmail.to);
  console.log('Subject:', adminEmail.subject);

  const adminResult = await sendEmail(adminEmail);
  console.log('Admin email result:', adminResult);
}

testEmail().catch(console.error);