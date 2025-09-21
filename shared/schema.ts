import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // New fields for registration and approval workflow
  passwordHash: varchar("password_hash"), // For email/password authentication
  phone: varchar("phone"),
  address: text("address"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  dateOfBirth: date("date_of_birth"),
  status: varchar("status", { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'), // Default pending for approval workflow
  invitationToken: varchar("invitation_token"), // For password reset/invitation links
  tokenExpiresAt: timestamp("token_expires_at"), // Token expiration
  // Existing fields
  role: varchar("role", { enum: ['admin', 'editor', 'viewer'] }).notNull().default('viewer'),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contacts table - main entity
export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  systemId: varchar("system_id").unique().notNull(), // VV-2024-001847 format
  fullName: text("full_name").notNull(),
  firstName: text("first_name"),
  middleName: text("middle_name"),
  lastName: text("last_name"),
  dateOfBirth: date("date_of_birth"),
  streetAddress: text("street_address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  district: text("district"),
  precinct: text("precinct"),
  // Voter-specific fields
  voterIdRedacted: varchar("voter_id_redacted"), // For privacy compliance
  registrationDate: date("registration_date"),
  party: varchar("party"),
  voterStatus: varchar("voter_status"),
  supporterStatus: varchar("supporter_status", { enum: ['confirmed-supporter', 'likely-supporter', 'opposition', 'unknown'] }).default('unknown'),
  volunteerLikeliness: varchar("volunteer_likeliness", { enum: ['confirmed-volunteer', 'likely-to-volunteer', 'will-not-volunteer', 'unknown'] }).default('unknown'),
  notes: text("notes"),
  // Source tracking and smart import fields
  addressSource: varchar("address_source", { enum: ['public', 'volunteer'] }),
  isActive: boolean("is_active").notNull().default(true),
  lastPublicUpdate: timestamp("last_public_update"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  lastUpdatedBy: varchar("last_updated_by").references(() => users.id),
});

// Contact aliases/nicknames
export const contactAliases = pgTable("contact_aliases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  alias: text("alias").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contact phone numbers
export const contactPhones = pgTable("contact_phones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  phoneNumber: text("phone_number").notNull(),
  phoneType: varchar("phone_type", { enum: ['mobile', 'home', 'work', 'other'] }).default('mobile'),
  isPrimary: boolean("is_primary").default(false),
  isBaselineData: boolean("is_baseline_data").notNull().default(false), // True for imported baseline data
  isManuallyAdded: boolean("is_manually_added").notNull().default(false), // True for volunteer-researched data
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

// Contact email addresses
export const contactEmails = pgTable("contact_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  email: text("email").notNull(),
  emailType: varchar("email_type", { enum: ['personal', 'work', 'other'] }).default('personal'),
  isPrimary: boolean("is_primary").default(false),
  isBaselineData: boolean("is_baseline_data").notNull().default(false), // True for imported baseline data
  isManuallyAdded: boolean("is_manually_added").notNull().default(false), // True for volunteer-researched data
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

// Audit log for tracking all changes
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").references(() => contacts.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: varchar("action").notNull(), // 'create', 'update', 'delete'
  tableName: text("table_name").notNull(),
  recordId: varchar("record_id").notNull(),
  fieldName: text("field_name"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  metadata: jsonb("metadata"), // Additional context
  createdAt: timestamp("created_at").defaultNow(),
});

// System settings
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").unique().notNull(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  contactsUpdated: many(contacts),
  phonesCreated: many(contactPhones),
  emailsCreated: many(contactEmails),
  auditLogs: many(auditLogs),
  systemSettings: many(systemSettings),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  lastUpdatedByUser: one(users, {
    fields: [contacts.lastUpdatedBy],
    references: [users.id],
  }),
  aliases: many(contactAliases),
  phones: many(contactPhones),
  emails: many(contactEmails),
  auditLogs: many(auditLogs),
}));

export const contactAliasesRelations = relations(contactAliases, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactAliases.contactId],
    references: [contacts.id],
  }),
}));

export const contactPhonesRelations = relations(contactPhones, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactPhones.contactId],
    references: [contacts.id],
  }),
  createdByUser: one(users, {
    fields: [contactPhones.createdBy],
    references: [users.id],
  }),
}));

export const contactEmailsRelations = relations(contactEmails, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactEmails.contactId],
    references: [contacts.id],
  }),
  createdByUser: one(users, {
    fields: [contactEmails.createdBy],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  contact: one(contacts, {
    fields: [auditLogs.contactId],
    references: [contacts.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const upsertUserSchema = insertUserSchema.pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  passwordHash: true,
  phone: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  dateOfBirth: true,
  status: true,
  invitationToken: true,
  tokenExpiresAt: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
}).extend({
  updatedAt: z.date().optional(),
}).partial().required({ id: true });

export const insertContactSchema = createInsertSchema(contacts);
export const selectContactSchema = createSelectSchema(contacts);
export const updateContactSchema = insertContactSchema.partial().omit({ id: true, createdAt: true });

export const insertContactAliasSchema = createInsertSchema(contactAliases);
export const insertContactPhoneSchema = createInsertSchema(contactPhones);
export const insertContactEmailSchema = createInsertSchema(contactEmails);
export const insertAuditLogSchema = createInsertSchema(auditLogs);

// Client-facing schemas (exclude data source flags - backend controls these)
export const clientInsertContactPhoneSchema = insertContactPhoneSchema.omit({ 
  isBaselineData: true, 
  isManuallyAdded: true,
  createdAt: true,
  createdBy: true 
});
export const clientInsertContactEmailSchema = insertContactEmailSchema.omit({ 
  isBaselineData: true, 
  isManuallyAdded: true,
  createdAt: true,
  createdBy: true 
});

// Registration schema for user signup (excludes auto-generated fields)
export const registrationSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Please enter a valid email address"),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  phone: z.string().trim().min(1, "Phone number is required"),
  address: z.string().trim().min(1, "Address is required"),
  city: z.string().trim().min(1, "City is required"),
  state: z.string().trim().min(1, "State is required"),
  zipCode: z.string().trim().min(1, "ZIP code is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type RegistrationData = z.infer<typeof registrationSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;
export type UpdateContact = z.infer<typeof updateContactSchema>;

export type ContactAlias = typeof contactAliases.$inferSelect;
export type InsertContactAlias = typeof contactAliases.$inferInsert;

export type ContactPhone = typeof contactPhones.$inferSelect;
export type InsertContactPhone = typeof contactPhones.$inferInsert;
export type ClientInsertContactPhone = z.infer<typeof clientInsertContactPhoneSchema>;

export type ContactEmail = typeof contactEmails.$inferSelect;
export type InsertContactEmail = typeof contactEmails.$inferInsert;
export type ClientInsertContactEmail = z.infer<typeof clientInsertContactEmailSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
