import type { AuditLog, User, Contact } from "@shared/schema";

export interface AuditLogWithDetails extends AuditLog {
  user?: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
  contact?: {
    fullName: string;
  };
}

export interface SearchFilters {
  city?: string;
  zipCode?: string;
  ageMin?: number;
  ageMax?: number;
  hasPhone?: boolean;
  hasEmail?: boolean;
  supporterStatus?: string;
  quickFilters?: string[];
}

export interface ContactSearchResult {
  contacts: Contact[];
  total: number;
}

export interface SystemStats {
  totalContacts: number;
  activeUsers: number;
  editsToday: number;
  dataQuality: number;
}

export interface ExcelImportResult {
  processed: number;
  errors: string[];
  summary: {
    totalRows: number;
    successfullyProcessed: number;
    duplicates: number;
    errors: number;
  };
}

export interface UserInvitation {
  email: string;
  role: "admin" | "editor" | "viewer";
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
}

export interface SystemSettings {
  sessionTimeout: number;
  maxSearchResults: number;
  allowedFileTypes: string[];
  dataRetentionDays: number;
}

export interface FieldPermissions {
  phones: boolean;
  emails: boolean;
  notes: boolean;
  aliases: boolean;
  supporterStatus: boolean;
  districts: boolean;
}
