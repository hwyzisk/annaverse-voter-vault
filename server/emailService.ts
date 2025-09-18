// SendGrid email service integration - Referenced from javascript_sendgrid blueprint
import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text || '', // Provide empty string if undefined
      html: params.html,
    });
    console.log(`Email sent successfully to ${params.to || 'unknown recipient'}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

// Email templates for the registration and approval workflow
export const EmailTemplates = {
  // User registration confirmation
  registrationConfirmation: (userEmail: string, userName: string) => ({
    to: userEmail,
    from: 'noreply@voterui.replit.app', // Replace with your verified sender
    subject: 'Registration Received - VoterVault Access Pending',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Registration Received</h2>
        <p>Hello ${userName},</p>
        <p>Thank you for registering for VoterVault access. Your registration request has been received and is currently under review by our team.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">What happens next?</h3>
          <ul>
            <li>Our admin team will review your registration</li>
            <li>You'll receive an email notification once your account is approved or if we need additional information</li>
            <li>Once approved, you'll be able to log in with your email and password</li>
          </ul>
        </div>
        <p>If you have any questions, please contact our support team.</p>
        <p>Best regards,<br>VoterVault Team</p>
      </div>
    `,
    text: `Hello ${userName},\n\nThank you for registering for VoterVault access. Your registration request has been received and is currently under review by our team.\n\nWhat happens next?\n- Our admin team will review your registration\n- You'll receive an email notification once your account is approved\n- Once approved, you'll be able to log in with your email and password\n\nIf you have any questions, please contact our support team.\n\nBest regards,\nVoterVault Team`
  }),

  // Admin notification of new registration
  adminNotification: (adminEmail: string, userName: string, userEmail: string, userPhone: string) => ({
    to: adminEmail,
    from: 'noreply@voterui.replit.app',
    subject: 'New User Registration - Action Required',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">New User Registration</h2>
        <p>A new user has registered and is awaiting approval:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">User Details:</h3>
          <p><strong>Name:</strong> ${userName}</p>
          <p><strong>Email:</strong> ${userEmail}</p>
          <p><strong>Phone:</strong> ${userPhone}</p>
        </div>
        <p>Please log into the VoterVault admin dashboard to review and approve/reject this registration.</p>
        <p><a href="https://voterui.replit.app" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Review Registration</a></p>
      </div>
    `,
    text: `New User Registration\n\nA new user has registered and is awaiting approval:\n\nName: ${userName}\nEmail: ${userEmail}\nPhone: ${userPhone}\n\nPlease log into the VoterVault admin dashboard to review and approve/reject this registration.`
  }),

  // User approval notification
  approvalNotification: (userEmail: string, userName: string, role: string) => ({
    to: userEmail,
    from: 'noreply@voterui.replit.app',
    subject: 'Welcome to VoterVault - Account Approved!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Welcome to VoterVault!</h2>
        <p>Hello ${userName},</p>
        <p>Great news! Your VoterVault account has been approved. You now have access to the voter database with <strong>${role}</strong> permissions.</p>
        <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
          <h3 style="margin-top: 0;">Getting Started:</h3>
          <ol>
            <li>Visit the VoterVault login page</li>
            <li>Sign in with your email and password</li>
            <li>Complete your profile information if needed</li>
            <li>Start accessing voter contact information</li>
          </ol>
        </div>
        <p><a href="https://voterui.replit.app" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Access VoterVault</a></p>
        <p>If you need help getting started, please contact our support team.</p>
        <p>Best regards,<br>VoterVault Team</p>
      </div>
    `,
    text: `Welcome to VoterVault!\n\nHello ${userName},\n\nGreat news! Your VoterVault account has been approved. You now have access to the voter database with ${role} permissions.\n\nGetting Started:\n1. Visit the VoterVault login page\n2. Sign in with your email and password\n3. Complete your profile information if needed\n4. Start accessing voter contact information\n\nBest regards,\nVoterVault Team`
  }),

  // User rejection notification
  rejectionNotification: (userEmail: string, userName: string, reason?: string) => ({
    to: userEmail,
    from: 'noreply@voterui.replit.app',
    subject: 'VoterVault Registration Update',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Registration Update</h2>
        <p>Hello ${userName},</p>
        <p>Thank you for your interest in VoterVault. After reviewing your registration, we are unable to approve access at this time.</p>
        ${reason ? `<div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <p><strong>Reason:</strong> ${reason}</p>
        </div>` : ''}
        <p>If you believe this is an error or have questions about this decision, please contact our support team for further assistance.</p>
        <p>Best regards,<br>VoterVault Team</p>
      </div>
    `,
    text: `Hello ${userName},\n\nThank you for your interest in VoterVault. After reviewing your registration, we are unable to approve access at this time.\n\n${reason ? `Reason: ${reason}\n\n` : ''}If you believe this is an error or have questions about this decision, please contact our support team for further assistance.\n\nBest regards,\nVoterVault Team`
  }),

  // Password reset email
  passwordReset: (userEmail: string, userName: string, resetToken: string) => ({
    to: userEmail,
    from: 'noreply@voterui.replit.app',
    subject: 'Reset Your VoterVault Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>Hello ${userName},</p>
        <p>You requested a password reset for your VoterVault account. Click the link below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://voterui.replit.app/reset-password?token=${resetToken}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reset Password</a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This link will expire in 24 hours. If you didn't request this reset, you can safely ignore this email.</p>
        <p>Best regards,<br>VoterVault Team</p>
      </div>
    `,
    text: `Hello ${userName},\n\nYou requested a password reset for your VoterVault account. Visit this link to set a new password:\n\nhttps://voterui.replit.app/reset-password?token=${resetToken}\n\nThis link will expire in 24 hours. If you didn't request this reset, you can safely ignore this email.\n\nBest regards,\nVoterVault Team`
  })
};