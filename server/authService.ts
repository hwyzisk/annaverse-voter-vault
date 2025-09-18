// Authentication service with password hashing and validation
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { storage } from './storage';
import { sendEmail, EmailTemplates } from './emailService';

export interface RegisterUserData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  dateOfBirth: string; // YYYY-MM-DD format
  password: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export class AuthService {
  // Hash password with bcrypt
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  // Verify password against hash
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Generate secure random token
  static generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  // Register new user (pending approval)
  static async registerUser(userData: RegisterUserData): Promise<{ success: boolean; message: string; userId?: string }> {
    try {
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return { success: false, message: 'A user with this email already exists' };
      }

      // Hash password
      const passwordHash = await this.hashPassword(userData.password);

      // Create user with pending status
      const newUser = await storage.upsertUser({
        // Don't pass id, let DB generate UUID
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash,
        phone: userData.phone,
        address: userData.address,
        dateOfBirth: userData.dateOfBirth, // Keep as string, will be converted by DB
        status: 'pending',
        role: 'viewer', // Default role, admin can change during approval
        isActive: false, // Inactive until approved
      });

      // Send confirmation email to user
      const userFullName = `${userData.firstName} ${userData.lastName}`;
      await sendEmail(EmailTemplates.registrationConfirmation(userData.email, userFullName));

      // Send notification to all admins
      const admins = await storage.getAdminUsers();
      for (const admin of admins) {
        if (admin.email) {
          await sendEmail(EmailTemplates.adminNotification(
            admin.email,
            userFullName,
            userData.email,
            userData.phone
          ));
        }
      }

      return { 
        success: true, 
        message: 'Registration successful. Your account is pending approval.',
        userId: newUser.id 
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed. Please try again.' };
    }
  }

  // Login with email and password
  static async loginUser(credentials: LoginCredentials): Promise<{ success: boolean; user?: any; message: string }> {
    try {
      // Get user by email
      const user = await storage.getUserByEmail(credentials.email);
      if (!user || !user.passwordHash) {
        return { success: false, message: 'Invalid email or password' };
      }

      // Check if user is approved and active
      if (user.status !== 'approved') {
        return { success: false, message: 'Your account is pending approval or has been rejected' };
      }
      
      if (!user.isActive) {
        return { success: false, message: 'Your account is inactive. Please contact support.' };
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(credentials.password, user.passwordHash);
      if (!isValidPassword) {
        return { success: false, message: 'Invalid email or password' };
      }

      // Update last login
      await storage.upsertUser({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        lastLoginAt: new Date(),
      });

      // Return only safe user fields (explicit whitelist)
      const safeUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      };
      return { success: true, user: safeUser, message: 'Login successful' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed. Please try again.' };
    }
  }

  // Approve user registration
  static async approveUser(userId: string, role: 'admin' | 'editor' | 'viewer' = 'viewer'): Promise<{ success: boolean; message: string }> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Update user status and role
      await storage.upsertUser({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: 'approved',
        role,
        isActive: true,
        updatedAt: new Date(),
      });

      // Send approval email
      const userFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
      if (user.email) {
        await sendEmail(EmailTemplates.approvalNotification(user.email, userFullName, role));
      }

      return { success: true, message: 'User approved successfully' };
    } catch (error) {
      console.error('User approval error:', error);
      return { success: false, message: 'Failed to approve user' };
    }
  }

  // Reject user registration
  static async rejectUser(userId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Update user status
      await storage.upsertUser({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: 'rejected',
        updatedAt: new Date(),
      });

      // Send rejection email
      const userFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
      if (user.email) {
        await sendEmail(EmailTemplates.rejectionNotification(user.email, userFullName, reason));
      }

      return { success: true, message: 'User registration rejected' };
    } catch (error) {
      console.error('User rejection error:', error);
      return { success: false, message: 'Failed to reject user' };
    }
  }

  // Generate password reset token
  static async generatePasswordResetToken(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal whether email exists for security
        return { success: true, message: 'If an account exists with this email, you will receive a password reset link.' };
      }

      const resetToken = this.generateToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Save token
      await storage.upsertUser({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        invitationToken: resetToken,
        tokenExpiresAt: expiresAt,
      });

      // Send reset email
      const userFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
      if (user.email) {
        await sendEmail(EmailTemplates.passwordReset(user.email, userFullName, resetToken));
      }

      return { success: true, message: 'If an account exists with this email, you will receive a password reset link.' };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, message: 'Failed to process password reset request' };
    }
  }

  // Reset password with token
  static async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await storage.getUserByResetToken(token);
      if (!user || !user.tokenExpiresAt || user.tokenExpiresAt < new Date()) {
        return { success: false, message: 'Invalid or expired reset token' };
      }

      // Hash new password
      const passwordHash = await this.hashPassword(newPassword);

      // Update password and clear token
      await storage.upsertUser({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        passwordHash,
        invitationToken: null, // Explicitly clear the token
        tokenExpiresAt: null, // Explicitly clear the expiration
        updatedAt: new Date(),
      });

      return { success: true, message: 'Password reset successfully' };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, message: 'Failed to reset password' };
    }
  }
}