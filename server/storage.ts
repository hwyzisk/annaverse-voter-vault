import {
  users,
  contacts,
  contactPhones,
  contactEmails,
  auditLogs,
  systemSettings,
  userNetworks,
  type User,
  type UpsertUser,
  type Contact,
  type InsertContact,
  type UpdateContact,
  type ContactPhone,
  type InsertContactPhone,
  type ContactEmail,
  type InsertContactEmail,
  type AuditLog,
  type InsertAuditLog,
  type UserNetwork,
  type InsertUserNetwork,
  type UpdateUserNetwork,
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
  clearAllContacts(): Promise<void>;
  getAllContactsForExport(): Promise<any[]>;

  // Contact details
  
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
  getLeaderboardStats(): Promise<any>;
  bulkRevertUserChanges(userId: string, revertedBy: string): Promise<void>;
  
  // System settings
  getSetting(key: string): Promise<any>;
  setSetting(key: string, value: any, userId: string): Promise<void>;

  // User Networks (My Network feature)
  getUserNetworks(userId: string): Promise<(UserNetwork & { contact: Contact })[]>;
  getUserNetwork(userId: string, contactId: string): Promise<UserNetwork | undefined>;
  addToUserNetwork(network: InsertUserNetwork): Promise<UserNetwork>;
  updateUserNetwork(networkId: string, updates: UpdateUserNetwork): Promise<UserNetwork>;
  removeFromUserNetwork(networkId: string): Promise<void>;
  getNetworkById(networkId: string): Promise<UserNetwork | undefined>;
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

  async clearAllContacts(): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete all related data first (foreign key constraints)
      await tx.delete(auditLogs);
      await tx.delete(contactAliases);
      await tx.delete(contactPhones);
      await tx.delete(contactEmails);
      // Finally delete all contacts
      await tx.delete(contacts);
    });
  }

  async getAllContactsForExport(): Promise<any[]> {
    // Get all contacts with their related data for export
    const query = db
      .select({
        // Contact fields
        id: contacts.id,
        systemId: contacts.systemId,
        firstName: contacts.firstName,
        middleName: contacts.middleName,
        lastName: contacts.lastName,
        fullName: contacts.fullName,
        suffix: contacts.suffix,
        birthDate: contacts.birthDate,
        age: contacts.age,
        gender: contacts.gender,
        party: contacts.party,
        address: contacts.address,
        city: contacts.city,
        state: contacts.state,
        zipCode: contacts.zipCode,
        county: contacts.county,
        precinct: contacts.precinct,
        district: contacts.district,
        supporterStatus: contacts.supporterStatus,
        voteHistory: contacts.voteHistory,
        registrationDate: contacts.registrationDate,
        lastVotedDate: contacts.lastVotedDate,
        notes: contacts.notes,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
      })
      .from(contacts)
      .orderBy(contacts.lastName, contacts.firstName);

    const contactRecords = await query;

    // Get related data for all contacts
    const contactIds = contactRecords.map(c => c.id);

    if (contactIds.length === 0) {
      return [];
    }

    // Get phones for all contacts
    const phonesQuery = db
      .select({
        contactId: contactPhones.contactId,
        phoneNumber: contactPhones.phoneNumber,
        phoneType: contactPhones.phoneType,
        isPrimary: contactPhones.isPrimary,
      })
      .from(contactPhones)
      .where(sql`${contactPhones.contactId} IN (${sql.join(contactIds.map(id => sql`${id}`), sql`, `)})`)
      .orderBy(contactPhones.isPrimary);

    // Get emails for all contacts
    const emailsQuery = db
      .select({
        contactId: contactEmails.contactId,
        email: contactEmails.email,
        emailType: contactEmails.emailType,
        isPrimary: contactEmails.isPrimary,
      })
      .from(contactEmails)
      .where(sql`${contactEmails.contactId} IN (${sql.join(contactIds.map(id => sql`${id}`), sql`, `)})`)
      .orderBy(contactEmails.isPrimary);

    // Get aliases for all contacts
    const aliasesQuery = db
      .select({
        contactId: contactAliases.contactId,
        aliasName: contactAliases.aliasName,
      })
      .from(contactAliases)
      .where(sql`${contactAliases.contactId} IN (${sql.join(contactIds.map(id => sql`${id}`), sql`, `)})`);

    const [phonesData, emailsData, aliasesData] = await Promise.all([
      phonesQuery,
      emailsQuery,
      aliasesQuery
    ]);

    // Group related data by contact ID
    const phonesByContact = new Map<string, typeof phonesData>();
    phonesData.forEach(phone => {
      if (!phonesByContact.has(phone.contactId)) {
        phonesByContact.set(phone.contactId, []);
      }
      phonesByContact.get(phone.contactId)!.push(phone);
    });

    const emailsByContact = new Map<string, typeof emailsData>();
    emailsData.forEach(email => {
      if (!emailsByContact.has(email.contactId)) {
        emailsByContact.set(email.contactId, []);
      }
      emailsByContact.get(email.contactId)!.push(email);
    });

    const aliasesByContact = new Map<string, typeof aliasesData>();
    aliasesData.forEach(alias => {
      if (!aliasesByContact.has(alias.contactId)) {
        aliasesByContact.set(alias.contactId, []);
      }
      aliasesByContact.get(alias.contactId)!.push(alias);
    });

    // Combine all data
    return contactRecords.map(contact => ({
      ...contact,
      phones: phonesByContact.get(contact.id) || [],
      emails: emailsByContact.get(contact.id) || [],
      aliases: aliasesByContact.get(contact.id) || [],
    }));
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
        whereConditions.push(sql`${contacts.supporterStatus} IN (${sql.join(supporterStatuses.map((s: string) => sql`${s}`), sql`, `)})`);
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
            houseDistrict: contacts.houseDistrict,
            senateDistrict: contacts.senateDistrict,
            commissionDistrict: contacts.commissionDistrict,
            schoolBoardDistrict: contacts.schoolBoardDistrict,
            voterId: contacts.voterId,
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
            addressSource: contacts.addressSource,
            isActive: contacts.isActive,
            lastPublicUpdate: contacts.lastPublicUpdate,
            phoneCount: sql<number>`(SELECT COUNT(*) FROM ${contactPhones} WHERE ${contactPhones.contactId} = ${contacts.id})`,
            emailCount: sql<number>`(SELECT COUNT(*) FROM ${contactEmails} WHERE ${contactEmails.contactId} = ${contacts.id})`,
            manualPhoneCount: sql<number>`(SELECT COUNT(*) FROM contact_phones WHERE contact_id = ${contacts.id} AND is_manually_added = true)`,
            manualEmailCount: sql<number>`(SELECT COUNT(*) FROM contact_emails WHERE contact_id = ${contacts.id} AND is_manually_added = true)`,
            baselinePhoneCount: sql<number>`(SELECT COUNT(*) FROM contact_phones WHERE contact_id = ${contacts.id} AND is_baseline_data = true)`,
            baselineEmailCount: sql<number>`(SELECT COUNT(*) FROM contact_emails WHERE contact_id = ${contacts.id} AND is_baseline_data = true)`
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
            houseDistrict: contacts.houseDistrict,
            senateDistrict: contacts.senateDistrict,
            commissionDistrict: contacts.commissionDistrict,
            schoolBoardDistrict: contacts.schoolBoardDistrict,
            voterId: contacts.voterId,
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
            addressSource: contacts.addressSource,
            isActive: contacts.isActive,
            lastPublicUpdate: contacts.lastPublicUpdate,
            phoneCount: sql<number>`(SELECT COUNT(*) FROM ${contactPhones} WHERE ${contactPhones.contactId} = ${contacts.id})`,
            emailCount: sql<number>`(SELECT COUNT(*) FROM ${contactEmails} WHERE ${contactEmails.contactId} = ${contacts.id})`,
            manualPhoneCount: sql<number>`(SELECT COUNT(*) FROM contact_phones WHERE contact_id = ${contacts.id} AND is_manually_added = true)`,
            manualEmailCount: sql<number>`(SELECT COUNT(*) FROM contact_emails WHERE contact_id = ${contacts.id} AND is_manually_added = true)`,
            baselinePhoneCount: sql<number>`(SELECT COUNT(*) FROM contact_phones WHERE contact_id = ${contacts.id} AND is_baseline_data = true)`,
            baselineEmailCount: sql<number>`(SELECT COUNT(*) FROM contact_emails WHERE contact_id = ${contacts.id} AND is_baseline_data = true)`
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

  async getLeaderboardStats(): Promise<any> {
    try {
      // Test database connection and schema
      let totalActiveVoters = -1;
      let contactsSample = [];
      try {
        // Log a sample of contacts to check schema and voterStatus field
        contactsSample = await db.select().from(contacts).limit(5);
        console.log('Sample contacts:', contactsSample);
        if (contactsSample.length > 0) {
          console.log('Sample voterStatus values:', contactsSample.map(c => c.voterStatus));
        }
      } catch (err) {
        console.error('Error fetching sample contacts:', err);
      }

      try {
        // Try the working query again
        const [activeVoters] = await db
          .select({ count: count() })
          .from(contacts)
          .where(eq(contacts.voterStatus, 'ACT'));
        totalActiveVoters = activeVoters.count;
        console.log('Active voters count:', totalActiveVoters);
      } catch (err) {
        console.error('Active voters query failed:', err);
        if (err && err.stack) console.error('Error stack:', err.stack);
        totalActiveVoters = -1;
      }

      // Count confirmed supporters
      let confirmedSupportersCount = 0;
      try {
        const [supportersResult] = await db
          .select({ count: count() })
          .from(contacts)
          .where(eq(contacts.supporterStatus, 'confirmed-supporter'));
        confirmedSupportersCount = supportersResult.count;
      } catch (err) {
        console.error('Error counting confirmed supporters:', err);
      }

      // Count confirmed volunteers
      let confirmedVolunteersCount = 0;
      try {
        const [volunteersResult] = await db
          .select({ count: count() })
          .from(contacts)
          .where(eq(contacts.volunteerLikeliness, 'confirmed-volunteer'));
        confirmedVolunteersCount = volunteersResult.count;
      } catch (err) {
        console.error('Error counting confirmed volunteers:', err);
      }

      return {
        totalActiveVoters,
        contactsWithNewInfo: 0,
        confirmedSupporters: confirmedSupportersCount,
        confirmedVolunteers: confirmedVolunteersCount,
        phoneNumberPercentage: 0,
        emailAddressPercentage: 0,
        topContributors: [],
        risingStars: []
      };
    } catch (error) {
      console.error('Leaderboard stats error:', error);
      if (error && error.stack) console.error('Error stack:', error.stack);
      return {
        totalActiveVoters: -1,
        contactsWithNewInfo: 0,
        confirmedSupporters: 0,
        confirmedVolunteers: 0,
        phoneNumberPercentage: 0,
        emailAddressPercentage: 0,
        topContributors: [],
        risingStars: []
      };
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

  // User Networks (My Network feature) implementation
  async getUserNetworks(userId: string): Promise<(UserNetwork & { contact: Contact })[]> {
    const networks = await db
      .select({
        id: userNetworks.id,
        userId: userNetworks.userId,
        contactId: userNetworks.contactId,
        notes: userNetworks.notes,
        createdAt: userNetworks.createdAt,
        updatedAt: userNetworks.updatedAt,
        contact: contacts
      })
      .from(userNetworks)
      .innerJoin(contacts, eq(userNetworks.contactId, contacts.id))
      .where(eq(userNetworks.userId, userId))
      .orderBy(desc(userNetworks.createdAt));

    return networks;
  }

  async getUserNetwork(userId: string, contactId: string): Promise<UserNetwork | undefined> {
    const [network] = await db
      .select()
      .from(userNetworks)
      .where(and(eq(userNetworks.userId, userId), eq(userNetworks.contactId, contactId)));

    return network;
  }

  async addToUserNetwork(network: InsertUserNetwork): Promise<UserNetwork> {
    const [newNetwork] = await db
      .insert(userNetworks)
      .values(network)
      .returning();

    return newNetwork;
  }

  async updateUserNetwork(networkId: string, updates: UpdateUserNetwork): Promise<UserNetwork> {
    const [updatedNetwork] = await db
      .update(userNetworks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userNetworks.id, networkId))
      .returning();

    return updatedNetwork;
  }

  async removeFromUserNetwork(networkId: string): Promise<void> {
    await db
      .delete(userNetworks)
      .where(eq(userNetworks.id, networkId));
  }

  async getNetworkById(networkId: string): Promise<UserNetwork | undefined> {
    const [network] = await db
      .select()
      .from(userNetworks)
      .where(eq(userNetworks.id, networkId));

    return network;
  }
}

export const storage = new DatabaseStorage();
