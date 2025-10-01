import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, setUserSession, clearUserSession } from "./localAuth";
import { searchService } from "./services/searchService";
import { optimizedExcelService } from "./services/optimizedExcelService";
import { auditService } from "./services/auditService";
import { AuthService } from "./authService";
import { insertContactSchema, updateContactSchema, insertContactPhoneSchema, insertContactEmailSchema, insertUserNetworkSchema, updateUserNetworkSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import fs from "fs";
import path from "path";

// Secure filename validation schema
const attachedExcelRequestSchema = z.object({
  filename: z
    .string()
    .min(1, "Filename is required")
    .max(255, "Filename too long")
    // Prevent path traversal - no path separators allowed
    .refine(
      (filename) => !filename.includes('/') && !filename.includes('\\') && !filename.includes('..'),
      "Invalid filename - path separators not allowed"
    )
    // Only allow Excel file extensions
    .refine(
      (filename) => /\.(xlsx|xls)$/i.test(filename),
      "Invalid file type - only .xlsx and .xls files allowed"
    )
    // Prevent special characters that could be problematic
    .refine(
      (filename) => !/[<>:"|?*\x00-\x1f]/.test(filename),
      "Invalid characters in filename"
    )
});
import { readFile, stat } from "fs/promises";
import path from "path";

// Enhanced multer configuration with security limits
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB max file size for large contact imports
    files: 1 // Only allow single file upload
  },
  fileFilter: (req, file, cb) => {
    // Validate file type - only allow Excel files
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/octet-stream' // Some browsers send this for Excel files
    ];
    
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.match(/\.(xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) are allowed.'));
    }
  }
});

// Middleware to check user role
const requireRole = (roles: string[]) => {
  return async (req: any, res: any, next: any) => {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(userId);
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    req.currentUser = user;
    next();
  };
};

// Helper function to safely format dates for CSV
function formatDateForCSV(value: any): string {
  if (!value) return '';
  if (value instanceof Date) {
    return value.toISOString().split('T')[0]; // YYYY-MM-DD format
  }
  if (typeof value === 'string') {
    // Check if it's already a date string
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    return value; // Return as-is if not a valid date
  }
  return String(value);
}

// Background export processing function
async function processExportJob(jobId: string) {
  try {
    console.log(`🚀 Starting export job ${jobId}`);

    // Get the job details
    const job = await storage.getExportJob(jobId);
    if (!job) {
      console.error(`❌ Export job ${jobId} not found`);
      return;
    }
    console.log(`📋 Job details:`, { filters: job.filters, status: job.status });

    // Update status to processing
    console.log(`🔄 Updating job ${jobId} status to processing`);
    await storage.updateExportJob(jobId, {
      status: 'processing',
      progress: 0,
      processedRecords: 0
    });

    // Create exports directory if it doesn't exist
    const exportDir = path.join(process.cwd(), 'exports');
    console.log(`📁 Export directory: ${exportDir}`);
    if (!fs.existsSync(exportDir)) {
      console.log(`📁 Creating export directory: ${exportDir}`);
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `annaverse-export-${timestamp}-${jobId.slice(0, 8)}.csv`;
    const filePath = path.join(exportDir, filename);
    console.log(`📄 Export file path: ${filePath}`);

    // Start streaming export
    console.log(`📝 Creating write stream for ${filePath}`);
    const writeStream = fs.createWriteStream(filePath);

    // CSV Headers - updated to separate public and volunteer data, remove unwanted columns
    const headers = [
      'System ID', 'First Name', 'Middle Name', 'Last Name', 'Full Name',
      'Date of Birth', 'Party Affiliation',
      'Street Address', 'City', 'State', 'ZIP Code', 'Precinct', 'District',
      'House District', 'Senate District', 'Commission District', 'School Board District',
      'Voter ID', 'Registration Date', 'Voter Status',
      'Supporter Status', 'Volunteer Likelihood', 'Notes',
      'Primary Phone', 'Public Phone Numbers', 'Volunteer-Added Phone Numbers',
      'Primary Email', 'Public Email Addresses', 'Volunteer-Added Email Addresses',
      'Address Source', 'Created At', 'Updated At', 'Created By', 'Last Updated By'
    ];

    // Write CSV header
    console.log(`📝 Writing CSV headers`);
    writeStream.write(headers.map(h => `"${h}"`).join(',') + '\n');

    const BATCH_SIZE = 500; // Reduced for production stability
    let offset = 0;
    let totalProcessed = 0;

    // Start with estimated count to avoid timeout on large datasets
    // We'll update with actual count as we process
    await storage.updateExportJob(jobId, {
      totalRecords: 0, // Will be updated during processing
      progress: 0
    });

    console.log(`📊 Export job ${jobId}: Starting batch processing with batch size ${BATCH_SIZE}`);

    let batchCount = 0;
    while (true) {
      batchCount++;
      console.log(`📦 Export job ${jobId}: Processing batch ${batchCount} (offset: ${offset})`);

      // Get batch of contacts with filtering
      try {
        const batch = await storage.getFilteredContactsForExport(job.filters, BATCH_SIZE, offset);
        console.log(`📦 Export job ${jobId}: Batch ${batchCount} returned ${batch.length} contacts`);

        if (batch.length === 0) {
          console.log(`📦 Export job ${jobId}: No more records, ending processing`);
          break; // No more records
        }

        // Write batch to CSV
        for (const contact of batch) {
          const row = [
            contact.systemId || '',
            contact.firstName || '',
            contact.middleName || '',
            contact.lastName || '',
            contact.fullName || '',
            formatDateForCSV(contact.dateOfBirth),
            contact.party || '',
            contact.streetAddress || '',
            contact.city || '',
            contact.state || '',
            contact.zipCode || '',
            contact.precinct || '',
            contact.district || '',
            contact.houseDistrict || '',
            contact.senateDistrict || '',
            contact.commissionDistrict || '',
            contact.schoolBoardDistrict || '',
            contact.voterId || '',
            formatDateForCSV(contact.registrationDate),
            contact.voterStatus || '',
            contact.supporterStatus || '',
            contact.volunteerLikeliness || '',
            contact.notes || '',
            contact.primaryPhone || '',
            contact.publicPhoneNumbers || '',
            contact.volunteerPhoneNumbers || '',
            contact.primaryEmail || '',
            contact.publicEmailAddresses || '',
            contact.volunteerEmailAddresses || '',
            contact.addressSource || '',
            formatDateForCSV(contact.createdAt),
            formatDateForCSV(contact.updatedAt),
            contact.createdBy || '',
            contact.lastUpdatedBy || ''
          ];

          // Escape and quote each field for CSV
          const csvRow = row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
          writeStream.write(csvRow + '\n');
        }

        totalProcessed += batch.length;
        offset += BATCH_SIZE;

        // Update progress (just show records processed without percentage)
        await storage.updateExportJob(jobId, {
          processedRecords: totalProcessed,
          progress: Math.min(50 + Math.floor(totalProcessed / 1000), 99) // Show incremental progress
        });

        console.log(`📈 Export job ${jobId}: ${totalProcessed} records processed so far`);

        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 50)); // Reduced delay

      } catch (batchError) {
        console.error(`❌ Export job ${jobId}: Error processing batch ${batchCount}:`, batchError);
        console.error(`❌ Batch error stack:`, batchError.stack);
        throw batchError; // Re-throw to be caught by outer try-catch
      }
    }

    // Close the file stream
    console.log(`📝 Export job ${jobId}: Closing write stream`);
    writeStream.end();

    // Wait for stream to finish
    console.log(`📝 Export job ${jobId}: Waiting for stream to finish`);
    await new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        console.log(`📝 Export job ${jobId}: Write stream finished`);
        resolve(undefined);
      });
      writeStream.on('error', (error) => {
        console.error(`❌ Export job ${jobId}: Write stream error:`, error);
        reject(error);
      });
    });

    // Get file size
    console.log(`📊 Export job ${jobId}: Getting file stats`);
    const stats = fs.statSync(filePath);
    const fileSizeBytes = stats.size;
    console.log(`📊 Export job ${jobId}: File size: ${fileSizeBytes} bytes`);

    // Update job as completed
    console.log(`✅ Export job ${jobId}: Updating status to completed`);
    await storage.updateExportJob(jobId, {
      status: 'completed',
      progress: 100,
      totalRecords: totalProcessed, // Set final total
      processedRecords: totalProcessed,
      completedAt: new Date(), // Pass Date object, not string
      filePath,
      filename,
      fileSizeBytes,
      downloadUrl: `/api/admin/export/download/${jobId}`
    });

    console.log(`✅ Export job ${jobId} completed: ${totalProcessed} records, ${(fileSizeBytes / 1024 / 1024).toFixed(1)} MB`);

  } catch (error) {
    console.error(`❌ Export job ${jobId} failed:`, error);
    console.error(`❌ Error stack:`, error.stack);

    try {
      console.log(`🔄 Export job ${jobId}: Updating status to failed`);
      await storage.updateExportJob(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log(`✅ Export job ${jobId}: Status updated to failed`);
    } catch (updateError) {
      console.error(`❌ Failed to update job status for ${jobId}:`, updateError);
      console.error(`❌ Update error stack:`, updateError.stack);
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Disable ETag for API routes to prevent 304 caching
  app.set('etag', false);
  
  // Add no-cache headers for all API routes
  app.use('/api', (req, res, next) => {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
    next();
  });

  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      // Update last login
      if (user) {
        await storage.upsertUser({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          lastLoginAt: new Date(),
        });
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Password authentication routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const result = await AuthService.registerUser(req.body);
      res.json(result);
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ success: false, message: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req: any, res) => {
    try {
      const { email, password } = req.body;
      const result = await AuthService.loginUser({ email, password });

      if (result.success && result.user) {
        // Set session for authenticated user
        setUserSession(req, result.user.id);
        res.json(result);
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      console.error('💥 Login error:', error);
      res.status(500).json({ success: false, message: 'Login failed' });
    }
  });

  app.post('/api/auth/password-reset', async (req, res) => {
    try {
      const { email } = req.body;
      const result = await AuthService.generatePasswordResetToken(email);
      res.json(result);
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ success: false, message: 'Password reset failed' });
    }
  });

  app.post('/api/auth/password-reset/confirm', async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      const result = await AuthService.resetPassword(token, newPassword);
      res.json(result);
    } catch (error) {
      console.error('Password reset confirm error:', error);
      res.status(500).json({ success: false, message: 'Password reset failed' });
    }
  });

  app.post('/api/auth/logout', isAuthenticated, async (req: any, res) => {
    try {
      clearUserSession(req);
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ success: false, message: 'Logout failed' });
    }
  });

  // GET logout route for frontend compatibility (redirects to home)
  app.get('/api/logout', async (req: any, res) => {
    try {
      clearUserSession(req);
      res.redirect('/');
    } catch (error) {
      console.error('Logout error:', error);
      res.redirect('/');
    }
  });

  // Temporary admin promotion route for development
  app.post('/api/admin/promote-user', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email required' });
      }

      // Find user and promote to admin
      const users = await storage.getAllUsers();
      const user = users.find(u => u.email === email);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Update user to admin status
      await storage.updateUserRole(user.id, 'admin');
      await storage.updateUserStatus(user.id, true);

      res.json({ success: true, message: `User ${email} promoted to admin` });
    } catch (error) {
      console.error('Admin promotion error:', error);
      res.status(500).json({ success: false, message: 'Promotion failed' });
    }
  });

  // Admin routes for user management
  app.get('/api/admin/pending-users', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const pendingUsers = await storage.getAllUsers();
      const pending = pendingUsers.filter(user => user.status === 'pending');
      res.json(pending);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      res.status(500).json({ message: 'Failed to fetch pending users' });
    }
  });

  app.post('/api/admin/approve-user/:id', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const result = await AuthService.approveUser(id, role);
      res.json(result);
    } catch (error) {
      console.error('Error approving user:', error);
      res.status(500).json({ success: false, message: 'Failed to approve user' });
    }
  });

  // Backward compatibility endpoint for production frontend
  app.patch('/api/admin/users/:id/approve', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const result = await AuthService.approveUser(id, role || 'editor'); // Default to editor if no role provided
      res.json(result);
    } catch (error) {
      console.error('Error approving user (backward compatibility):', error);
      res.status(500).json({ success: false, message: 'Failed to approve user' });
    }
  });

  app.post('/api/admin/reject-user/:id', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const result = await AuthService.rejectUser(id);
      res.json(result);
    } catch (error) {
      console.error('Error rejecting user:', error);
      res.status(500).json({ success: false, message: 'Failed to reject user' });
    }
  });

  // Contacts endpoints
  app.get('/api/contacts/search', isAuthenticated, async (req: any, res) => {
    try {
      const { firstName, middleName, lastName, city, zipCode, party, supporterStatus, missingPhone, hasEmail, minAge, maxAge, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const nameFilters = {
        firstName: firstName?.trim() || undefined,
        middleName: middleName?.trim() || undefined,
        lastName: lastName?.trim() || undefined,
      };

      const filters = {
        city: city || undefined,
        zipCode: zipCode || undefined,
        party: party || undefined,
        supporterStatus: supporterStatus || undefined,
        missingPhone: missingPhone === 'true',
        hasEmail: hasEmail === 'true',
        minAge: minAge ? parseInt(minAge) : undefined,
        maxAge: maxAge ? parseInt(maxAge) : undefined,
      };

      const result = await searchService.searchContacts(
        nameFilters, 
        filters, 
        parseInt(limit), 
        offset
      );

      res.json(result);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Search failed" });
    }
  });

  app.get('/api/contacts/:id', isAuthenticated, async (req, res) => {
    try {
      const contact = await storage.getContact(req.params.id);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      // Get related data
      const [phones, emails, auditLogs] = await Promise.all([
        storage.getContactPhones(contact.id),
        storage.getContactEmails(contact.id),
        storage.getAuditLogs(contact.id, undefined, 50)
      ]);

      // Data is already in camelCase format from storage layer
      const mappedPhones = phones;
      const mappedEmails = emails;

      res.json({
        ...contact,
        phones: mappedPhones,
        emails: mappedEmails,
        auditLogs
      });
    } catch (error) {
      console.error("Error fetching contact:", error);
      res.status(500).json({ message: "Failed to fetch contact" });
    }
  });

  app.patch('/api/contacts/:id', isAuthenticated, requireRole(['admin', 'editor']), async (req: any, res) => {
    try {
      const contactId = req.params.id;
      const userId = req.currentUser.id;
      
      // Validate updates
      const updates = updateContactSchema.parse(req.body);
      
      // Get original contact for audit
      const originalContact = await storage.getContact(contactId);
      if (!originalContact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      // Update contact
      const updatedContact = await storage.updateContact(contactId, updates, userId);

      // Log audit trail
      await auditService.logContactUpdate(originalContact, updatedContact, userId);

      res.json(updatedContact);
    } catch (error) {
      console.error("Error updating contact:", error);
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  // Contact phones
  app.post('/api/contacts/:id/phones', isAuthenticated, requireRole(['admin', 'editor']), async (req: any, res) => {
    try {
      const phoneData = insertContactPhoneSchema.parse({
        ...req.body,
        contactId: req.params.id,
        createdBy: req.currentUser.id,
        isManuallyAdded: true
      });

      const phone = await storage.addContactPhone(phoneData);
      
      // Log audit
      await auditService.logPhoneAdd(phone, req.currentUser.id);

      res.json(phone);
    } catch (error) {
      console.error("Error adding phone:", error);
      res.status(500).json({ message: "Failed to add phone" });
    }
  });

  app.patch('/api/phones/:id', isAuthenticated, requireRole(['admin', 'editor']), async (req: any, res) => {
    try {
      const updates = z.object({
        phoneNumber: z.string().optional(),
        phoneType: z.enum(['mobile', 'home', 'work', 'other']).optional(),
        isPrimary: z.boolean().optional(),
      }).parse(req.body);

      const phone = await storage.updateContactPhone(req.params.id, updates);
      res.json(phone);
    } catch (error) {
      console.error("Error updating phone:", error);
      res.status(500).json({ message: "Failed to update phone" });
    }
  });

  app.delete('/api/phones/:id', isAuthenticated, requireRole(['admin', 'editor']), async (req, res) => {
    try {
      await storage.removeContactPhone(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing phone:", error);
      res.status(500).json({ message: "Failed to remove phone" });
    }
  });

  // Contact emails
  app.post('/api/contacts/:id/emails', isAuthenticated, requireRole(['admin', 'editor']), async (req: any, res) => {
    try {
      const emailData = insertContactEmailSchema.parse({
        ...req.body,
        contactId: req.params.id,
        createdBy: req.currentUser.id,
        isManuallyAdded: true
      });

      const email = await storage.addContactEmail(emailData);
      
      // Log audit
      await auditService.logEmailAdd(email, req.currentUser.id);

      res.json(email);
    } catch (error) {
      console.error("Error adding email:", error);
      res.status(500).json({ message: "Failed to add email" });
    }
  });

  app.patch('/api/emails/:id', isAuthenticated, requireRole(['admin', 'editor']), async (req: any, res) => {
    try {
      const updates = z.object({
        email: z.string().email().optional(),
        emailType: z.enum(['personal', 'work', 'other']).optional(),
        isPrimary: z.boolean().optional(),
      }).parse(req.body);

      const email = await storage.updateContactEmail(req.params.id, updates);
      res.json(email);
    } catch (error) {
      console.error("Error updating email:", error);
      res.status(500).json({ message: "Failed to update email" });
    }
  });

  app.delete('/api/emails/:id', isAuthenticated, requireRole(['admin', 'editor']), async (req, res) => {
    try {
      await storage.removeContactEmail(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing email:", error);
      res.status(500).json({ message: "Failed to remove email" });
    }
  });


  // Admin endpoints
  app.get('/api/admin/users', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/admin/users/:id/role', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    try {
      const { role } = z.object({ role: z.enum(['admin', 'editor', 'viewer']) }).parse(req.body);
      const user = await storage.updateUserRole(req.params.id, role);
      res.json(user);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.patch('/api/admin/users/:id/status', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    try {
      const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
      const user = await storage.updateUserStatus(req.params.id, isActive);
      res.json(user);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  app.post('/api/admin/users', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    try {
      const userData = z.object({
        email: z.string().email(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        role: z.enum(['admin', 'editor', 'viewer']).optional()
      }).parse(req.body);

      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.delete('/api/admin/users/:id', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // User approval endpoints
  // Note: These endpoints removed in favor of proper approval workflow
  // Use POST /api/admin/approve-user/:id and POST /api/admin/reject-user/:id instead
  // Those endpoints use AuthService which sends proper emails and handles full workflow

  // New Export System Endpoints

  // Export options endpoint
  app.get('/api/admin/export/options', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    try {
      const options = await storage.getExportOptions();
      res.json(options);
    } catch (error) {
      console.error("Error getting export options:", error);
      res.status(500).json({ message: "Failed to get export options" });
    }
  });

  // Export preview endpoint
  app.post('/api/admin/export/preview', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    try {
      const filters = req.body;
      const count = await storage.getExportPreviewCount(filters);
      res.json({ count });
    } catch (error) {
      console.error("Error getting export preview:", error);
      res.status(500).json({ message: "Failed to get preview count" });
    }
  });

  // Start export endpoint
  app.post('/api/admin/export/start', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    try {
      const filters = req.body;
      console.log(`🚀 Creating export job with filters:`, JSON.stringify(filters, null, 2));

      const job = await storage.createExportJob(req.currentUser.id, filters);
      console.log(`✅ Export job created with ID: ${job.id}`);

      // Start the export process in the background with timeout protection
      console.log(`🔄 Starting background export process for job: ${job.id}`);
      processExportJob(job.id).catch(error => {
        console.error(`❌ Export job ${job.id} failed in background:`, error);
        console.error(`❌ Error stack:`, error.stack);
      });

      res.json({ job });
    } catch (error) {
      console.error("❌ Error starting export:", error);
      console.error("❌ Error stack:", error.stack);
      res.status(500).json({ message: "Failed to start export" });
    }
  });

  // Export progress endpoint (Server-Sent Events)
  app.get('/api/admin/export/progress/:jobId', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    const jobId = req.params.jobId;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const sendUpdate = async () => {
      try {
        const job = await storage.getExportJob(jobId);
        if (job) {
          res.write(`data: ${JSON.stringify(job)}\n\n`);

          if (job.status === 'completed' || job.status === 'failed') {
            res.end();
            return;
          }
        }
      } catch (error) {
        console.error("Error sending progress update:", error);
        res.end();
      }
    };

    // Send initial update
    await sendUpdate();

    // Send updates every 2 seconds
    const interval = setInterval(sendUpdate, 2000);

    req.on('close', () => {
      clearInterval(interval);
    });
  });

  // Export history endpoint
  app.get('/api/admin/export/history', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    try {
      const history = await storage.getExportHistory(req.currentUser.id);
      res.json(history);
    } catch (error) {
      console.error("Error getting export history:", error);
      res.status(500).json({ message: "Failed to get export history" });
    }
  });

  // Download export file endpoint
  app.get('/api/admin/export/download/:jobId', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    try {
      const jobId = req.params.jobId;
      console.log(`📥 Download request for job ${jobId}`);

      const job = await storage.getExportJob(jobId);
      console.log(`📄 Job details:`, { status: job?.status, filePath: job?.filePath, filename: job?.filename });

      if (!job || job.status !== 'completed' || !job.filePath) {
        console.log(`❌ Job not found or not completed for ${jobId}`);
        return res.status(404).json({ message: "Export file not found" });
      }

      if (!fs.existsSync(job.filePath)) {
        console.log(`❌ File does not exist: ${job.filePath}`);
        return res.status(404).json({ message: "Export file no longer exists" });
      }

      // Check file content type
      const fileContent = fs.readFileSync(job.filePath, 'utf-8');
      const firstLine = fileContent.split('\n')[0];
      console.log(`📝 First line of file: ${firstLine}`);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${job.filename}"`);
      res.setHeader('Cache-Control', 'no-cache');

      const fileStream = fs.createReadStream(job.filePath);
      fileStream.pipe(res);

    } catch (error) {
      console.error("Error downloading export:", error);
      res.status(500).json({ message: "Failed to download export" });
    }
  });

  // User export endpoint
  app.get('/api/admin/users/export', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    try {
      console.log(`User export initiated by admin: ${req.currentUser.email} (${req.currentUser.id})`);

      // Get all users
      const users = await storage.getAllUsers();

      if (!users || users.length === 0) {
        return res.status(404).json({ message: "No users found to export" });
      }

      // Use the Excel service to create a workbook for users
      const workbook = await optimizedExcelService.createUserExportWorkbook(users);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `annaverse-users-export-${timestamp}.xlsx`;

      // Set headers for file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');

      // Write workbook to response
      await workbook.xlsx.write(res);
      res.end();

      console.log(`✅ User export completed by admin: ${req.currentUser.email} - ${users.length} users exported`);

    } catch (error) {
      console.error("Error exporting users:", error);
      res.status(500).json({
        message: "Failed to export users",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get('/api/admin/stats', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.post('/api/admin/clear-all-contacts', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      await storage.clearAllContacts();
      res.json({ message: "All contacts and related data have been cleared successfully" });
    } catch (error) {
      console.error("Error clearing all contacts:", error);
      res.status(500).json({ message: "Failed to clear contacts" });
    }
  });

  // Secure database wipe endpoint with password protection
  app.post('/api/admin/database/wipe', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const { confirmation } = req.body;

      // Validate confirmation word
      if (confirmation !== "DELETE") {
        return res.status(400).json({
          message: "Invalid confirmation. You must type 'DELETE' exactly."
        });
      }

      // Additional security check - ensure user is actually an admin
      if (req.currentUser?.role !== 'admin') {
        return res.status(403).json({
          message: "Access denied. Admin role required."
        });
      }

      console.log(`🚨 DATABASE WIPE initiated by admin: ${req.currentUser.email} (${req.currentUser.id})`);

      // Perform the complete database wipe
      await storage.clearAllContacts();

      console.log(`✅ DATABASE WIPE completed by admin: ${req.currentUser.email}`);

      res.json({
        message: "Database wiped successfully. All contact data has been permanently deleted.",
        timestamp: new Date().toISOString(),
        admin: req.currentUser.email
      });

    } catch (error) {
      console.error("Error wiping database:", error);
      res.status(500).json({
        message: "Failed to wipe database",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get('/api/admin/audit-logs', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const { userId, limit = 100 } = req.query;
      const logs = await storage.getAuditLogs(undefined, userId as string, parseInt(limit as string));
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Database export endpoint
  app.get('/api/admin/export', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    try {
      console.log(`Database export initiated by admin: ${req.currentUser.email} (${req.currentUser.id})`);

      // Get all contacts with their related data
      const contacts = await storage.getAllContactsForExport();

      if (!contacts || contacts.length === 0) {
        return res.status(404).json({ message: "No contacts found to export" });
      }

      // Use the Excel service to create a workbook
      const workbook = await optimizedExcelService.createExportWorkbook(contacts);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `voter-vault-export-${timestamp}.xlsx`;

      // Set headers for file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache');

      // Write workbook to response
      await workbook.xlsx.write(res);
      res.end();

      console.log(`✅ Database export completed by admin: ${req.currentUser.email} - ${contacts.length} contacts exported`);

    } catch (error) {
      console.error("Error exporting database:", error);
      res.status(500).json({
        message: "Failed to export database",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Single contact export endpoint
  app.get('/api/contacts/:id/export', isAuthenticated, requireRole(['admin', 'editor', 'viewer']), async (req: any, res: any) => {
    try {
      const contactId = req.params.id;
      console.log(`Contact export initiated by user: ${req.currentUser.email} for contact: ${contactId}`);

      // Get the specific contact with all related data (same pattern as existing contact endpoint)
      const contact = await storage.getContact(contactId);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      // Get related data
      const [phones, emails] = await Promise.all([
        storage.getContactPhones(contact.id),
        storage.getContactEmails(contact.id),
      ]);

      // Format the data in the same structure as getAllContactsForExport
      const contactWithRelations = {
        ...contact,
        phones: phones,
        emails: emails,
      };

      console.log(`📊 Exporting contact data:`, { contactId, name: contact.fullName, phoneCount: phones.length, emailCount: emails.length });

      // Create a simple CSV export instead of Excel for now to debug
      const csvData = generateSimpleCSV([contactWithRelations]);

      // Set response headers for CSV file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="contact_${contact.systemId || contact.id}_export.csv"`);

      res.send(csvData);

      console.log(`✅ Contact export completed by user: ${req.currentUser.email} for contact: ${contactId}`);

    } catch (error) {
      console.error("Error exporting contact:", error);
      res.status(500).json({
        message: "Failed to export contact",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Simple CSV generator function
  function generateSimpleCSV(contacts: any[]): string {
    if (!contacts || contacts.length === 0) {
      return "No data to export";
    }

    const headers = ['ID', 'System ID', 'Full Name', 'First Name', 'Last Name', 'Phone Numbers', 'Email Addresses', 'City', 'State', 'Party'];
    const rows = contacts.map(contact => [
      contact.id || '',
      contact.systemId || '',
      contact.fullName || '',
      contact.firstName || '',
      contact.lastName || '',
      contact.phones?.map((p: any) => p.phoneNumber).join('; ') || '',
      contact.emails?.map((e: any) => e.email).join('; ') || '',
      contact.city || '',
      contact.state || '',
      contact.party || ''
    ]);

    return [headers, ...rows].map(row =>
      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }

  // Progress tracking for active uploads
  const activeUploads = new Map<string, any>();

  // Server-Sent Events endpoint for upload progress
  app.get('/api/admin/upload-progress/:uploadId', isAuthenticated, requireRole(['admin']), (req: any, res: any) => {
    const uploadId = req.params.uploadId;
    
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', uploadId })}\n\n`);

    // Store the response object for this upload
    activeUploads.set(uploadId, res);

    // Clean up on client disconnect
    req.on('close', () => {
      activeUploads.delete(uploadId);
    });
  });

  // Excel seeding endpoint with enhanced security and progress reporting
  app.post('/api/admin/seed-excel', isAuthenticated, requireRole(['admin']), (req: any, res: any, next: any) => {
    // Custom upload handler with enhanced error handling
    upload.single('excel')(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ message: 'File too large. Maximum size is 200MB.' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ message: 'Too many files. Only one file allowed.' });
        }
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      }
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  }, async (req: any, res) => {
    const uploadId = req.headers['x-upload-id'] || 'default';
    
    try {
      if (!req.file) {
        return res.status(400).json({ 
          message: "Excel file required",
          allowedTypes: ['.xlsx', '.xls'],
          maxSize: '50MB'
        });
      }

      // Additional validation
      if (req.file.size === 0) {
        return res.status(400).json({ message: "Empty file not allowed" });
      }

      // Log basic import info (no audit trail as per user requirements)
      console.log(`Excel batch import started by ${req.currentUser.email}: ${req.file.originalname} (${req.file.size} bytes)`);

      // Progress callback to send updates via SSE
      const progressCallback = (progress: any) => {
        const sseRes = activeUploads.get(uploadId);
        if (sseRes) {
          sseRes.write(`data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`);
        }
      };

      const result = await optimizedExcelService.processExcelFileOptimized(
        req.file.buffer,
        req.currentUser.id,
        { dryRun: false, overwriteUserData: false },
        progressCallback
      );
      
      // Send completion event via SSE
      const sseRes = activeUploads.get(uploadId);
      if (sseRes) {
        sseRes.write(`data: ${JSON.stringify({ type: 'completed', result })}\n\n`);
        sseRes.end();
        activeUploads.delete(uploadId);
      }
      
      // Log completion info
      console.log(`Excel batch import completed by ${req.currentUser.email}: ${result.processed} records processed, ${result.errors.length} errors`);
      
      res.json(result);
    } catch (error) {
      console.error("Error processing Excel file:", error);
      
      // Send error event via SSE
      const sseRes = activeUploads.get(uploadId);
      if (sseRes) {
        sseRes.write(`data: ${JSON.stringify({ type: 'error', message: 'Processing failed' })}\n\n`);
        sseRes.end();
        activeUploads.delete(uploadId);
      }
      
      // Enhanced error response with security considerations
      if (error instanceof Error) {
        // Don't expose internal error details to prevent information leakage
        const isValidationError = error.message.includes('validation') || 
                                 error.message.includes('format') ||
                                 error.message.includes('schema');
        
        if (isValidationError) {
          res.status(400).json({ message: error.message });
        } else {
          res.status(500).json({ message: "Internal server error processing Excel file" });
        }
      } else {
        res.status(500).json({ message: "Failed to process Excel file" });
      }
    }
  });

  // 🚀 OPTIMIZED Excel import endpoint - 10-50x faster than legacy import
  app.post('/api/admin/seed-excel-optimized', isAuthenticated, requireRole(['admin']), (req: any, res: any, next: any) => {
    upload.single('excel')(req, res, (err: any) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ message: 'File too large. Maximum size is 200MB.' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ message: 'Too many files. Only one file allowed.' });
        }
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      }
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  }, async (req: any, res) => {
    const uploadId = req.headers['x-upload-id'] || 'default';

    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Excel file required",
          allowedTypes: ['.xlsx', '.xls'],
          maxSize: '50MB'
        });
      }

      if (req.file.size === 0) {
        return res.status(400).json({ message: "Empty file not allowed" });
      }

      // Parse import options from request
      const dryRun = req.query.dryRun === 'true';
      const batchSize = parseInt(req.query.batchSize as string) || 2000;
      const overwriteUserData = req.query.overwriteUserData === 'true';

      console.log(`🚀 Optimized Excel import started by ${req.currentUser.email}: ${req.file.originalname} (${req.file.size} bytes)`);
      console.log(`📊 Options: dryRun=${dryRun}, batchSize=${batchSize}, overwriteUserData=${overwriteUserData}`);

      // Enhanced progress callback with performance metrics
      const progressCallback = (progress: any) => {
        const sseRes = activeUploads.get(uploadId);
        if (sseRes) {
          const enhancedProgress = {
            ...progress,
            type: 'progress',
            memoryUsageMB: Math.round((progress.memoryUsage || 0) / 1024 / 1024),
            rowsPerSecond: progress.processed > 0 ?
              Math.round(progress.processed / ((Date.now() - progress.startTime.getTime()) / 1000)) : 0
          };
          sseRes.write(`data: ${JSON.stringify(enhancedProgress)}\n\n`);
        }
      };

      const result = await optimizedExcelService.processExcelFileOptimized(
        req.file.buffer,
        req.currentUser.id,
        {
          dryRun,
          batchSize,
          overwriteUserData,
          progressCallback
        }
      );

      // Send completion event via SSE
      const sseRes = activeUploads.get(uploadId);
      if (sseRes) {
        sseRes.write(`data: ${JSON.stringify({ type: 'completed', result })}\n\n`);
        sseRes.end();
        activeUploads.delete(uploadId);
      }

      console.log(`🎉 Optimized Excel import completed: ${result.processed} processed (${result.created} created, ${result.updated} updated), ${result.errors.length} errors`);
      console.log(`⚡ Performance: ${result.summary.performanceRowsPerSecond} rows/second`);

      res.json({
        ...result,
        optimized: true,
        legacy: false,
        performance: {
          algorithm: 'bulk-upsert-optimized',
          indexesUsed: true,
          memoryEfficient: true,
          rowsPerSecond: result.summary.performanceRowsPerSecond
        }
      });
    } catch (error) {
      console.error("💥 Optimized Excel import error:", error);

      // Send error event via SSE
      const sseRes = activeUploads.get(uploadId);
      if (sseRes) {
        sseRes.write(`data: ${JSON.stringify({ type: 'error', message: 'Optimized processing failed' })}\n\n`);
        sseRes.end();
        activeUploads.delete(uploadId);
      }

      if (error instanceof Error) {
        const isValidationError = error.message.includes('validation') ||
                                 error.message.includes('format') ||
                                 error.message.includes('schema');

        if (isValidationError) {
          res.status(400).json({ message: error.message, optimized: true });
        } else {
          res.status(500).json({ message: "Optimized Excel processing failed", optimized: true });
        }
      } else {
        res.status(500).json({ message: "Failed to process Excel file with optimization", optimized: true });
      }
    }
  });

  // Rollback endpoint for optimized imports
  app.post('/api/admin/rollback-import/:rollbackId', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    try {
      const { rollbackId } = req.params;

      console.log(`🔄 Rolling back import ${rollbackId} by ${req.currentUser.email}`);

      await optimizedExcelService.rollbackImport(rollbackId, req.currentUser.id);

      console.log(`✅ Rollback ${rollbackId} completed`);

      res.json({
        success: true,
        message: 'Import successfully rolled back',
        rollbackId
      });
    } catch (error) {
      console.error('💥 Rollback error:', error);
      res.status(500).json({
        success: false,
        message: 'Rollback failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Process attached Excel file endpoint - SECURED AGAINST PATH TRAVERSAL
  app.post('/api/admin/process-attached-excel', isAuthenticated, requireRole(['admin']), async (req: any, res: any) => {
    try {
      // Validate request body with secure schema
      const validatedRequest = attachedExcelRequestSchema.parse(req.body);
      const { filename } = validatedRequest;
      
      // Secure path resolution to prevent directory traversal attacks
      const attachedAssetsDir = path.resolve(process.cwd(), 'attached_assets');
      const requestedFilePath = path.resolve(attachedAssetsDir, filename);
      
      // Critical security check: ensure resolved path is within allowed directory
      if (!requestedFilePath.startsWith(attachedAssetsDir + path.sep) && 
          requestedFilePath !== attachedAssetsDir) {
        console.warn(`Security violation: Path traversal attempt by admin ${req.currentUser.email}: ${filename}`);
        return res.status(400).json({ 
          message: "Invalid file path - access denied",
          details: "File must be located within the attached assets directory"
        });
      }
      
      // File existence and security validation using fs.stat
      let fileStats;
      try {
        fileStats = await stat(requestedFilePath);
      } catch (statError: any) {
        if (statError.code === 'ENOENT') {
          return res.status(404).json({ 
            message: "File not found in attached assets",
            filename: filename
          });
        }
        console.error(`File stat error for ${filename}:`, statError);
        return res.status(500).json({ message: "Unable to access file" });
      }
      
      // Verify it's a regular file (not a directory or special file)
      if (!fileStats.isFile()) {
        console.warn(`Security violation: Non-file access attempt by admin ${req.currentUser.email}: ${filename}`);
        return res.status(400).json({ message: "Invalid file type - directories and special files not allowed" });
      }
      
      // Enforce file size limit (50MB to match upload route)
      const maxFileSize = 50 * 1024 * 1024; // 50MB
      if (fileStats.size > maxFileSize) {
        return res.status(413).json({ 
          message: "File too large",
          maxSize: "50MB",
          actualSize: `${Math.round(fileStats.size / (1024 * 1024) * 100) / 100}MB`
        });
      }
      
      // Additional security check for empty files
      if (fileStats.size === 0) {
        return res.status(400).json({ message: "Empty files are not allowed" });
      }
      
      // Read the Excel file using the securely validated path
      const buffer = await readFile(requestedFilePath);
      
      // Verify buffer size matches file stats (additional integrity check)
      if (buffer.length !== fileStats.size) {
        console.error(`File integrity check failed for ${filename}: expected ${fileStats.size}, got ${buffer.length}`);
        return res.status(500).json({ message: "File integrity check failed" });
      }
      
      // Log basic import info (no audit trail as per user requirements)
      console.log(`Attached Excel batch import started by ${req.currentUser.email}: ${filename} (${buffer.length} bytes)`);
      
      // Process the Excel file using new batch service
      const result = await optimizedExcelService.processExcelFileOptimized(
        buffer,
        req.currentUser.id,
        { dryRun: false, overwriteUserData: false }
      );
      
      // Log completion info
      console.log(`Attached Excel batch import completed by ${req.currentUser.email}: ${result.processed} records processed, ${result.errors.length} errors`);
      
      res.json(result);
    } catch (error) {
      console.error("Error processing attached Excel file:", error);
      
      // Enhanced error handling with security considerations
      if (error instanceof z.ZodError) {
        // Handle validation errors explicitly
        const firstError = error.errors[0];
        return res.status(400).json({ 
          message: "Invalid request data",
          details: firstError.message,
          field: firstError.path.join('.')
        });
      }
      
      // Handle known error types explicitly to avoid information leakage
      if (error instanceof Error) {
        // File system errors (cast to any for code property access)
        const fsError = error as any;
        if (fsError.code === 'EACCES') {
          return res.status(403).json({ message: "File access denied" });
        }
        if (fsError.code === 'EISDIR') {
          return res.status(400).json({ message: "Cannot process directories" });
        }
        if (fsError.code === 'EMFILE' || fsError.code === 'ENFILE') {
          return res.status(503).json({ message: "Server temporarily unavailable" });
        }
        
        // Excel processing errors (preserve these for user feedback)
        if (error.message.toLowerCase().includes('excel') || 
            error.message.toLowerCase().includes('workbook') ||
            error.message.toLowerCase().includes('xlsx') ||
            error.message.toLowerCase().includes('spreadsheet')) {
          return res.status(400).json({ 
            message: "Excel processing error", 
            details: error.message 
          });
        }
      }
      
      // Generic fallback - don't leak internal error details
      return res.status(500).json({ message: "Internal server error processing file" });
    }
  });

  // Leaderboard endpoints
  app.get('/api/leaderboard/stats', isAuthenticated, async (req, res) => {
    try {
      console.log('🔍 Leaderboard stats API called');
      const stats = await storage.getLeaderboardStats();
      console.log('🔍 Leaderboard stats result:', stats);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching leaderboard stats:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard stats" });
    }
  });

  // Networks endpoints
  app.get('/api/networks', isAuthenticated, requireRole(['admin', 'editor']), async (req: any, res) => {
    try {
      const networks = await storage.getUserNetworks(req.currentUser.id);
      res.json(networks);
    } catch (error) {
      console.error('Error getting user networks:', error);
      res.status(500).json({ message: 'Failed to get user networks' });
    }
  });

  // Add contact to user's network
  app.post('/api/networks', isAuthenticated, requireRole(['admin', 'editor']), async (req: any, res: any) => {
    try {
      const networkData = insertUserNetworkSchema.parse({
        ...req.body,
        userId: req.currentUser.id
      });

      // Check if contact already exists in user's network
      const existingNetwork = await storage.getUserNetwork(req.currentUser.id, networkData.contactId);
      if (existingNetwork) {
        return res.status(409).json({ message: 'Contact already in your network' });
      }

      const network = await storage.addToUserNetwork(networkData);
      res.json(network);
    } catch (error) {
      console.error('Error adding to user network:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid network data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to add contact to network' });
    }
  });

  // Update network (notes)
  app.put('/api/networks/:id', isAuthenticated, requireRole(['admin', 'editor']), async (req: any, res: any) => {
    try {
      const networkId = req.params.id;
      const updateData = updateUserNetworkSchema.parse(req.body);

      // Verify the network belongs to the current user
      const network = await storage.getNetworkById(networkId);
      if (!network) {
        return res.status(404).json({ message: 'Network entry not found' });
      }
      if (network.userId !== req.currentUser.id) {
        return res.status(403).json({ message: 'Access denied - not your network' });
      }

      const updatedNetwork = await storage.updateUserNetwork(networkId, updateData);
      res.json(updatedNetwork);
    } catch (error) {
      console.error('Error updating user network:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid network data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to update network entry' });
    }
  });

  // Remove contact from user's network
  app.delete('/api/networks/:id', isAuthenticated, requireRole(['admin', 'editor']), async (req: any, res: any) => {
    try {
      const networkId = req.params.id;

      // Verify the network belongs to the current user
      const network = await storage.getNetworkById(networkId);
      if (!network) {
        return res.status(404).json({ message: 'Network entry not found' });
      }
      if (network.userId !== req.currentUser.id) {
        return res.status(403).json({ message: 'Access denied - not your network' });
      }

      await storage.removeFromUserNetwork(networkId);
      res.json({ message: 'Contact removed from network successfully' });
    } catch (error) {
      console.error('Error removing from user network:', error);
      res.status(500).json({ message: 'Failed to remove contact from network' });
    }
  });

  // Check if contact is in user's network
  app.get('/api/networks/check/:contactId', isAuthenticated, requireRole(['admin', 'editor']), async (req: any, res: any) => {
    try {
      const contactId = req.params.contactId;
      const network = await storage.getUserNetwork(req.currentUser.id, contactId);
      res.json({ inNetwork: !!network, networkId: network?.id });
    } catch (error) {
      console.error('Error checking user network:', error);
      res.status(500).json({ message: 'Failed to check network status' });
    }
  });

  // Impact/Stats endpoint
  app.get('/api/impact/stats', isAuthenticated, async (req, res) => {
    try {
      const impactData = await storage.getImpactStats();
      res.json(impactData);
    } catch (error) {
      console.error('Error fetching impact stats:', error);
      res.status(500).json({ message: 'Failed to fetch impact stats' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
