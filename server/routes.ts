import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { searchService } from "./services/searchService";
import { excelService } from "./services/excelService";
import { excelBatchService } from "./services/excelBatchService";
import { auditService } from "./services/auditService";
import { AuthService } from "./authService";
import { insertContactSchema, updateContactSchema, insertContactPhoneSchema, insertContactEmailSchema, insertContactAliasSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";

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
    fileSize: 50 * 1024 * 1024, // 50MB max file size
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

export async function registerRoutes(app: Express): Promise<Server> {
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

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await AuthService.loginUser({ email, password });
      
      if (result.success && result.user) {
        // Set session or token here (for now just return user data)
        res.json(result);
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      console.error('Login error:', error);
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
        firstName: firstName || undefined,
        middleName: middleName || undefined,
        lastName: lastName || undefined,
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
      const [aliases, phones, emails, auditLogs] = await Promise.all([
        storage.getContactAliases(contact.id),
        storage.getContactPhones(contact.id),
        storage.getContactEmails(contact.id),
        storage.getAuditLogs(contact.id, undefined, 50)
      ]);

      res.json({
        ...contact,
        aliases,
        phones,
        emails,
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

  // Contact aliases
  app.post('/api/contacts/:id/aliases', isAuthenticated, requireRole(['admin', 'editor']), async (req: any, res) => {
    try {
      const aliasData = insertContactAliasSchema.parse({
        ...req.body,
        contactId: req.params.id
      });

      const alias = await storage.addContactAlias(aliasData);
      res.json(alias);
    } catch (error) {
      console.error("Error adding alias:", error);
      res.status(500).json({ message: "Failed to add alias" });
    }
  });

  app.delete('/api/aliases/:id', isAuthenticated, requireRole(['admin', 'editor']), async (req, res) => {
    try {
      await storage.removeContactAlias(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing alias:", error);
      res.status(500).json({ message: "Failed to remove alias" });
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

  app.get('/api/admin/stats', isAuthenticated, requireRole(['admin']), async (req, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
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

  app.post('/api/admin/revert/:logId', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    try {
      await storage.revertAuditLog(req.params.logId, req.currentUser.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error reverting change:", error);
      res.status(500).json({ message: "Failed to revert change" });
    }
  });

  app.post('/api/admin/bulk-revert/:userId', isAuthenticated, requireRole(['admin']), async (req: any, res) => {
    try {
      await storage.bulkRevertUserChanges(req.params.userId, req.currentUser.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error bulk reverting changes:", error);
      res.status(500).json({ message: "Failed to bulk revert changes" });
    }
  });

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
          return res.status(413).json({ message: 'File too large. Maximum size is 50MB.' });
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

      const result = await excelBatchService.processExcelFileStream(
        req.file.buffer, 
        req.currentUser.id,
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
      const result = await excelBatchService.processExcelFileStream(buffer, req.currentUser.id);
      
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

  const httpServer = createServer(app);
  return httpServer;
}
