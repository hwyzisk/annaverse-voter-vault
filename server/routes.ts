import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { searchService } from "./services/searchService";
// Excel and audit services will be imported when needed
// import { excelService } from "./services/excelService";
// import { auditService } from "./services/auditService";
import { insertContactSchema, updateContactSchema, insertContactPhoneSchema, insertContactEmailSchema, insertContactAliasSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

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

  // Contacts endpoints
  app.get('/api/contacts/search', isAuthenticated, async (req: any, res) => {
    try {
      const { q, city, zipCode, supporterStatus, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const filters = {
        city: city || undefined,
        zipCode: zipCode || undefined,
        supporterStatus: supporterStatus || undefined,
      };

      const result = await searchService.searchContacts(
        q || '', 
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

      // Log audit trail - to be implemented
      // await auditService.logContactUpdate(originalContact, updatedContact, userId);

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
        createdBy: req.currentUser.id
      });

      const phone = await storage.addContactPhone(phoneData);
      
      // Log audit - to be implemented
      // await auditService.logPhoneAdd(phone, req.currentUser.id);

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
        createdBy: req.currentUser.id
      });

      const email = await storage.addContactEmail(emailData);
      
      // Log audit - to be implemented
      // await auditService.logEmailAdd(email, req.currentUser.id);

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

  // Excel seeding endpoint
  app.post('/api/admin/seed-excel', isAuthenticated, requireRole(['admin']), upload.single('excel'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Excel file required" });
      }

      // Excel service functionality to be implemented
      const result = { processed: 0, errors: ["Excel import not yet implemented"], summary: { totalRows: 0, successfullyProcessed: 0, duplicates: 0, errors: 1 } };
      res.json(result);
    } catch (error) {
      console.error("Error processing Excel file:", error);
      res.status(500).json({ message: "Failed to process Excel file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
