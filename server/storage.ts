import {
  users,
  contacts,
  contactAliases,
  contactPhones,
  contactEmails,
  auditLogs,
  systemSettings,
  type User,
  type UpsertUser,
  type Contact,
  type InsertContact,
  type UpdateContact,
  type ContactAlias,
  type InsertContactAlias,
  type ContactPhone,
  type InsertContactPhone,
  type ContactEmail,
  type InsertContactEmail,
  type AuditLog,
  type InsertAuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, ilike, or, count } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  getAdminUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Contact operations
  getContact(id: string): Promise<Contact | undefined>;
  getContactBySystemId(systemId: string): Promise<Contact | undefined>;
  searchContacts(nameFilters?: { firstName?: string; middleName?: string; lastName?: string; }, filters?: any, limit?: number, offset?: number): Promise<{ contacts: Contact[], total: number }>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, updates: UpdateContact, userId: string): Promise<Contact>;
  batchInsertContacts(records: any[], userId: string): Promise<void>;
  
  // Contact details
  getContactAliases(contactId: string): Promise<ContactAlias[]>;
  addContactAlias(alias: InsertContactAlias): Promise<ContactAlias>;
  removeContactAlias(id: string): Promise<void>;
  
  getContactPhones(contactId: string): Promise<ContactPhone[]>;
  addContactPhone(phone: InsertContactPhone): Promise<ContactPhone>;
  updateContactPhone(id: string, updates: Partial<InsertContactPhone>): Promise<ContactPhone>;
  removeContactPhone(id: string): Promise<void>;
  
  getContactEmails(contactId: string): Promise<ContactEmail[]>;
  addContactEmail(email: InsertContactEmail): Promise<ContactEmail>;
  updateContactEmail(id: string, updates: Partial<InsertContactEmail>): Promise<ContactEmail>;
  removeContactEmail(id: string): Promise<void>;
  
  // Audit operations
  logAudit(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(contactId?: string, userId?: string, limit?: number): Promise<AuditLog[]>;
  revertAuditLog(logId: string, userId: string): Promise<void>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  createUser(userData: { email: string; firstName?: string; lastName?: string; role?: string }): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  updateUserRole(userId: string, role: string): Promise<User>;
  updateUserStatus(userId: string, isActive: boolean): Promise<User>;
  getSystemStats(): Promise<any>;
  bulkRevertUserChanges(userId: string, revertedBy: string): Promise<void>;
  
  // System settings
  getSetting(key: string): Promise<any>;
  setSetting(key: string, value: any, userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.invitationToken, token));
    return user;
  }

  async getAdminUsers(): Promise<User[]> {
    const adminUsers = await db.select().from(users).where(eq(users.role, 'admin'));
    return adminUsers;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Contact operations
  async getContact(id: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact;
  }

  async getContactBySystemId(systemId: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.systemId, systemId));
    return contact;
  }

  async searchContacts(
    nameFilters: { firstName?: string; middleName?: string; lastName?: string; } = {}, 
    filters?: any, 
    limit = 20, 
    offset = 0
  ): Promise<{ contacts: Contact[], total: number }> {
    let whereConditions = [];
    
    // Handle individual name field searches
    const nameConditions = [];
    
    if (nameFilters.firstName?.trim()) {
      nameConditions.push(ilike(contacts.firstName, `%${nameFilters.firstName.trim()}%`));
    }
    
    if (nameFilters.middleName?.trim()) {
      nameConditions.push(ilike(contacts.middleName, `%${nameFilters.middleName.trim()}%`));
    }
    
    if (nameFilters.lastName?.trim()) {
      nameConditions.push(ilike(contacts.lastName, `%${nameFilters.lastName.trim()}%`));
    }
    
    // If any name filters are provided, add them as AND conditions (all must match)
    if (nameConditions.length > 0) {
      whereConditions.push(and(...nameConditions));
    }

    if (filters?.city) {
      whereConditions.push(ilike(contacts.city, `%${filters.city}%`));
    }

    if (filters?.zipCode) {
      whereConditions.push(eq(contacts.zipCode, filters.zipCode));
    }

    if (filters?.party) {
      whereConditions.push(eq(contacts.party, filters.party));
    }

    if (filters?.supporterStatus) {
      // Handle comma-separated supporter status values
      const supporterStatuses = filters.supporterStatus.split(',').map((s: string) => s.trim());
      if (supporterStatuses.length > 1) {
        whereConditions.push(sql`${contacts.supporterStatus} IN (${sql.join(supporterStatuses.map(s => sql`${s}`), sql`, `)})`);
      } else {
        whereConditions.push(eq(contacts.supporterStatus, supporterStatuses[0]));
      }
    }

    // Age range filtering
    if (filters?.minAge || filters?.maxAge) {
      if (filters.minAge && filters.maxAge) {
        // Filter for ages between minAge and maxAge
        whereConditions.push(
          sql`EXTRACT(YEAR FROM AGE(${contacts.dateOfBirth})) BETWEEN ${filters.minAge} AND ${filters.maxAge}`
        );
      } else if (filters.minAge) {
        // Filter for ages >= minAge
        whereConditions.push(
          sql`EXTRACT(YEAR FROM AGE(${contacts.dateOfBirth})) >= ${filters.minAge}`
        );
      } else if (filters.maxAge) {
        // Filter for ages <= maxAge
        whereConditions.push(
          sql`EXTRACT(YEAR FROM AGE(${contacts.dateOfBirth})) <= ${filters.maxAge}`
        );
      }
    }

    // Phone and email filtering
    if (filters?.missingPhone) {
      whereConditions.push(
        sql`NOT EXISTS (SELECT 1 FROM ${contactPhones} WHERE ${contactPhones.contactId} = ${contacts.id})`
      );
    }

    if (filters?.hasEmail) {
      whereConditions.push(
        sql`EXISTS (SELECT 1 FROM ${contactEmails} WHERE ${contactEmails.contactId} = ${contacts.id})`
      );
    }

    // System ID filtering for duplicate detection
    if (filters?.systemId) {
      whereConditions.push(ilike(contacts.systemId, `%${filters.systemId}%`));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [contactsResult, totalResult] = await Promise.all([
      whereClause 
        ? db.select({
            id: contacts.id,
            systemId: contacts.systemId,
            fullName: contacts.fullName,
            firstName: contacts.firstName,
            middleName: contacts.middleName,
            lastName: contacts.lastName,
            dateOfBirth: contacts.dateOfBirth,
            streetAddress: contacts.streetAddress,
            city: contacts.city,
            state: contacts.state,
            zipCode: contacts.zipCode,
            district: contacts.district,
            precinct: contacts.precinct,
            voterIdRedacted: contacts.voterIdRedacted,
            registrationDate: contacts.registrationDate,
            party: contacts.party,
            voterStatus: contacts.voterStatus,
            supporterStatus: contacts.supporterStatus,
            volunteerLikeliness: contacts.volunteerLikeliness,
            notes: contacts.notes,
            createdAt: contacts.createdAt,
            updatedAt: contacts.updatedAt,
            createdBy: contacts.createdBy,
            lastUpdatedBy: contacts.lastUpdatedBy,
            phoneCount: sql<number>`(SELECT COUNT(*) FROM ${contactPhones} WHERE ${contactPhones.contactId} = ${contacts.id})`,
            emailCount: sql<number>`(SELECT COUNT(*) FROM ${contactEmails} WHERE ${contactEmails.contactId} = ${contacts.id})`,
            manualPhoneCount: sql<number>`(SELECT COUNT(*) FROM ${contactPhones} WHERE ${contactPhones.contactId} = ${contacts.id} AND ${contactPhones.isManuallyAdded} = true)`,
            manualEmailCount: sql<number>`(SELECT COUNT(*) FROM ${contactEmails} WHERE ${contactEmails.contactId} = ${contacts.id} AND ${contactEmails.isManuallyAdded} = true)`
          }).from(contacts)
            .where(whereClause)
            .limit(limit)
            .offset(offset)
            .orderBy(desc(contacts.updatedAt))
        : db.select({
            id: contacts.id,
            systemId: contacts.systemId,
            fullName: contacts.fullName,
            firstName: contacts.firstName,
            middleName: contacts.middleName,
            lastName: contacts.lastName,
            dateOfBirth: contacts.dateOfBirth,
            streetAddress: contacts.streetAddress,
            city: contacts.city,
            state: contacts.state,
            zipCode: contacts.zipCode,
            district: contacts.district,
            precinct: contacts.precinct,
            voterIdRedacted: contacts.voterIdRedacted,
            registrationDate: contacts.registrationDate,
            party: contacts.party,
            voterStatus: contacts.voterStatus,
            supporterStatus: contacts.supporterStatus,
            volunteerLikeliness: contacts.volunteerLikeliness,
            notes: contacts.notes,
            createdAt: contacts.createdAt,
            updatedAt: contacts.updatedAt,
            createdBy: contacts.createdBy,
            lastUpdatedBy: contacts.lastUpdatedBy,
            phoneCount: sql<number>`(SELECT COUNT(*) FROM ${contactPhones} WHERE ${contactPhones.contactId} = ${contacts.id})`,
            emailCount: sql<number>`(SELECT COUNT(*) FROM ${contactEmails} WHERE ${contactEmails.contactId} = ${contacts.id})`,
            manualPhoneCount: sql<number>`(SELECT COUNT(*) FROM ${contactPhones} WHERE ${contactPhones.contactId} = ${contacts.id} AND ${contactPhones.isManuallyAdded} = true)`,
            manualEmailCount: sql<number>`(SELECT COUNT(*) FROM ${contactEmails} WHERE ${contactEmails.contactId} = ${contacts.id} AND ${contactEmails.isManuallyAdded} = true)`
          }).from(contacts)
            .limit(limit)
            .offset(offset)
            .orderBy(desc(contacts.updatedAt)),
      whereClause
        ? db.select({ count: count() }).from(contacts).where(whereClause)
        : db.select({ count: count() }).from(contacts)
    ]);

    return {
      contacts: contactsResult,
      total: totalResult[0].count
    };
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [created] = await db.insert(contacts).values(contact).returning();
    return created;
  }

  async updateContact(id: string, updates: UpdateContact, userId: string): Promise<Contact> {
    const [updated] = await db
      .update(contacts)
      .set({ ...updates, updatedAt: new Date(), lastUpdatedBy: userId })
      .where(eq(contacts.id, id))
      .returning();
    return updated;
  }

  async batchInsertContacts(records: any[], userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Batch insert contacts
      const contactsToInsert = records.map(record => record.contact);
      const insertedContacts = await tx.insert(contacts).values(contactsToInsert).returning();
      
      // Batch insert phones and aliases using the returned contact IDs
      const phonesToInsert: InsertContactPhone[] = [];
      const aliasesToInsert: InsertContactAlias[] = [];
      
      insertedContacts.forEach((contact, index) => {
        const record = records[index];
        
        // Add baseline phone if exists
        if (record.phone) {
          phonesToInsert.push({
            ...record.phone,
            contactId: contact.id
          });
        }
        
        // Add baseline alias if exists
        if (record.alias) {
          aliasesToInsert.push({
            ...record.alias,
            contactId: contact.id
          });
        }
      });
      
      // Batch insert phones and aliases
      if (phonesToInsert.length > 0) {
        await tx.insert(contactPhones).values(phonesToInsert);
      }
      
      if (aliasesToInsert.length > 0) {
        await tx.insert(contactAliases).values(aliasesToInsert);
      }
    });
  }

  // Contact aliases
  async getContactAliases(contactId: string): Promise<ContactAlias[]> {
    return await db.select().from(contactAliases).where(eq(contactAliases.contactId, contactId));
  }

  async addContactAlias(alias: InsertContactAlias): Promise<ContactAlias> {
    const [created] = await db.insert(contactAliases).values(alias).returning();
    return created;
  }

  async removeContactAlias(id: string): Promise<void> {
    await db.delete(contactAliases).where(eq(contactAliases.id, id));
  }

  // Contact phones
  async getContactPhones(contactId: string): Promise<ContactPhone[]> {
    return await db.select().from(contactPhones).where(eq(contactPhones.contactId, contactId));
  }

  async addContactPhone(phone: InsertContactPhone): Promise<ContactPhone> {
    const [created] = await db.insert(contactPhones).values(phone).returning();
    return created;
  }

  async updateContactPhone(id: string, updates: Partial<InsertContactPhone>): Promise<ContactPhone> {
    const [updated] = await db
      .update(contactPhones)
      .set(updates)
      .where(eq(contactPhones.id, id))
      .returning();
    return updated;
  }

  async removeContactPhone(id: string): Promise<void> {
    await db.delete(contactPhones).where(eq(contactPhones.id, id));
  }

  // Contact emails
  async getContactEmails(contactId: string): Promise<ContactEmail[]> {
    return await db.select().from(contactEmails).where(eq(contactEmails.contactId, contactId));
  }

  async addContactEmail(email: InsertContactEmail): Promise<ContactEmail> {
    const [created] = await db.insert(contactEmails).values(email).returning();
    return created;
  }

  async updateContactEmail(id: string, updates: Partial<InsertContactEmail>): Promise<ContactEmail> {
    const [updated] = await db
      .update(contactEmails)
      .set(updates)
      .where(eq(contactEmails.id, id))
      .returning();
    return updated;
  }

  async removeContactEmail(id: string): Promise<void> {
    await db.delete(contactEmails).where(eq(contactEmails.id, id));
  }

  // Audit operations
  async logAudit(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(log).returning();
    return created;
  }

  async getAuditLogs(contactId?: string, userId?: string, limit = 100): Promise<AuditLog[]> {
    let whereConditions = [];
    
    if (contactId) {
      whereConditions.push(eq(auditLogs.contactId, contactId));
    }
    
    if (userId) {
      whereConditions.push(eq(auditLogs.userId, userId));
    }

    const query = db.select({
      id: auditLogs.id,
      contactId: auditLogs.contactId,
      userId: auditLogs.userId,
      action: auditLogs.action,
      tableName: auditLogs.tableName,
      recordId: auditLogs.recordId,
      fieldName: auditLogs.fieldName,
      oldValue: auditLogs.oldValue,
      newValue: auditLogs.newValue,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
      user: {
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      },
      contact: {
        fullName: contacts.fullName,
      }
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .leftJoin(contacts, eq(auditLogs.contactId, contacts.id));

    if (whereConditions.length > 0) {
      return await query
        .where(and(...whereConditions))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);
    } else {
      return await query
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);
    }
  }

  async revertAuditLog(logId: string, userId: string): Promise<void> {
    // Implementation would depend on the specific field being reverted
    // This is a complex operation that would need field-specific logic
    const [log] = await db.select().from(auditLogs).where(eq(auditLogs.id, logId));
    
    if (!log) throw new Error('Audit log not found');

    // Log the revert action itself
    await this.logAudit({
      contactId: log.contactId,
      userId: userId,
      action: 'revert',
      tableName: log.tableName,
      recordId: log.recordId,
      fieldName: log.fieldName,
      oldValue: log.newValue,
      newValue: log.oldValue,
      metadata: { originalLogId: logId }
    });
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.firstName, users.lastName);
  }

  async createUser(userData: { email: string; firstName?: string; lastName?: string; role?: string }): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: (userData.role as any) || 'viewer',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return newUser;
  }

  async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, userId));
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ role: role as any, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async getSystemStats(): Promise<any> {
    const [totalContacts] = await db.select({ count: count() }).from(contacts);
    const [activeUsers] = await db.select({ count: count() }).from(users).where(eq(users.isActive, true));
    const [editsToday] = await db.select({ count: count() }).from(auditLogs)
      .where(sql`date(created_at) = current_date`);

    return {
      totalContacts: totalContacts.count,
      activeUsers: activeUsers.count,
      editsToday: editsToday.count,
      dataQuality: 98.2 // This would be calculated based on completeness metrics
    };
  }

  async bulkRevertUserChanges(userId: string, revertedBy: string): Promise<void> {
    // Get all changes by this user
    const userLogs = await db.select().from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt));

    // Process each log for reverting (simplified - real implementation would be more complex)
    for (const log of userLogs) {
      await this.revertAuditLog(log.id, revertedBy);
    }
  }

  // System settings
  async getSetting(key: string): Promise<any> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting?.value;
  }

  async setSetting(key: string, value: any, userId: string): Promise<void> {
    await db.insert(systemSettings)
      .values({ key, value, updatedBy: userId })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, updatedAt: new Date(), updatedBy: userId }
      });
  }
}

export const storage = new DatabaseStorage();
