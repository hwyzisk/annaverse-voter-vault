import { storage } from '../storage';
import type { Contact, ContactPhone, ContactEmail, InsertAuditLog } from '@shared/schema';

class AuditService {
  async logContactUpdate(originalContact: Contact, updatedContact: Contact, userId: string): Promise<void> {
    const changes: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }> = [];

    // Compare all fields
    const fields = [
      'fullName', 'firstName', 'middleName', 'lastName', 'dateOfBirth',
      'streetAddress', 'city', 'state', 'zipCode', 'district', 'precinct',
      'supporterStatus', 'notes'
    ];

    fields.forEach(field => {
      const oldValue = (originalContact as any)[field];
      const newValue = (updatedContact as any)[field];
      
      if (oldValue !== newValue) {
        changes.push({
          field,
          oldValue: oldValue ? String(oldValue) : null,
          newValue: newValue ? String(newValue) : null,
        });
      }
    });

    // Log each change
    for (const change of changes) {
      await storage.logAudit({
        contactId: updatedContact.id,
        userId,
        action: 'update',
        tableName: 'contacts',
        recordId: updatedContact.id,
        fieldName: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
        metadata: {
          timestamp: new Date().toISOString(),
        }
      });
    }
  }

  async logPhoneAdd(phone: ContactPhone, userId: string): Promise<void> {
    await storage.logAudit({
      contactId: phone.contactId,
      userId,
      action: 'create',
      tableName: 'contact_phones',
      recordId: phone.id,
      fieldName: 'phoneNumber',
      oldValue: null,
      newValue: phone.phoneNumber,
      metadata: {
        phoneType: phone.phoneType,
        isPrimary: phone.isPrimary,
      }
    });
  }

  async logPhoneUpdate(phoneId: string, oldPhone: ContactPhone, newPhone: ContactPhone, userId: string): Promise<void> {
    const changes: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }> = [];

    if (oldPhone.phoneNumber !== newPhone.phoneNumber) {
      changes.push({
        field: 'phoneNumber',
        oldValue: oldPhone.phoneNumber,
        newValue: newPhone.phoneNumber,
      });
    }

    if (oldPhone.phoneType !== newPhone.phoneType) {
      changes.push({
        field: 'phoneType',
        oldValue: oldPhone.phoneType,
        newValue: newPhone.phoneType,
      });
    }

    if (oldPhone.isPrimary !== newPhone.isPrimary) {
      changes.push({
        field: 'isPrimary',
        oldValue: String(oldPhone.isPrimary),
        newValue: String(newPhone.isPrimary),
      });
    }

    for (const change of changes) {
      await storage.logAudit({
        contactId: oldPhone.contactId,
        userId,
        action: 'update',
        tableName: 'contact_phones',
        recordId: phoneId,
        fieldName: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
      });
    }
  }

  async logPhoneDelete(phone: ContactPhone, userId: string): Promise<void> {
    await storage.logAudit({
      contactId: phone.contactId,
      userId,
      action: 'delete',
      tableName: 'contact_phones',
      recordId: phone.id,
      fieldName: 'phoneNumber',
      oldValue: phone.phoneNumber,
      newValue: null,
      metadata: {
        phoneType: phone.phoneType,
        isPrimary: phone.isPrimary,
      }
    });
  }

  async logEmailAdd(email: ContactEmail, userId: string): Promise<void> {
    await storage.logAudit({
      contactId: email.contactId,
      userId,
      action: 'create',
      tableName: 'contact_emails',
      recordId: email.id,
      fieldName: 'email',
      oldValue: null,
      newValue: email.email,
      metadata: {
        emailType: email.emailType,
        isPrimary: email.isPrimary,
      }
    });
  }

  async logEmailUpdate(emailId: string, oldEmail: ContactEmail, newEmail: ContactEmail, userId: string): Promise<void> {
    const changes: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }> = [];

    if (oldEmail.email !== newEmail.email) {
      changes.push({
        field: 'email',
        oldValue: oldEmail.email,
        newValue: newEmail.email,
      });
    }

    if (oldEmail.emailType !== newEmail.emailType) {
      changes.push({
        field: 'emailType',
        oldValue: oldEmail.emailType,
        newValue: newEmail.emailType,
      });
    }

    if (oldEmail.isPrimary !== newEmail.isPrimary) {
      changes.push({
        field: 'isPrimary',
        oldValue: String(oldEmail.isPrimary),
        newValue: String(newEmail.isPrimary),
      });
    }

    for (const change of changes) {
      await storage.logAudit({
        contactId: oldEmail.contactId,
        userId,
        action: 'update',
        tableName: 'contact_emails',
        recordId: emailId,
        fieldName: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
      });
    }
  }

  async logEmailDelete(email: ContactEmail, userId: string): Promise<void> {
    await storage.logAudit({
      contactId: email.contactId,
      userId,
      action: 'delete',
      tableName: 'contact_emails',
      recordId: email.id,
      fieldName: 'email',
      oldValue: email.email,
      newValue: null,
      metadata: {
        emailType: email.emailType,
        isPrimary: email.isPrimary,
      }
    });
  }

  async logUserAction(userId: string, action: string, details: any): Promise<void> {
    await storage.logAudit({
      contactId: null,
      userId,
      action,
      tableName: 'system',
      recordId: userId,
      fieldName: null,
      oldValue: null,
      newValue: JSON.stringify(details),
      metadata: {
        timestamp: new Date().toISOString(),
      }
    });
  }
}

export const auditService = new AuditService();
