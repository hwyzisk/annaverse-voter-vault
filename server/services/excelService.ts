import * as XLSX from 'xlsx';
import { storage } from '../storage';
import { auditService } from './auditService';
import { nanoid } from 'nanoid';
import { createHash } from 'crypto';
import type { InsertContact, InsertContactPhone, InsertContactAlias } from '@shared/schema';

interface VoterExcelRow {
  VoterID: string | number;
  Voter_Name?: string;
  Last_Name?: string;
  First_Name?: string;
  Middle_Name?: string;
  Formatted_Address?: string;
  City_State?: string;
  Zip_Country?: string | number;
  City_Name?: string;
  Zip_Code?: string | number;
  Birth_Date?: string | number;
  Registration_Date?: string | number;
  Race?: string | number;
  Sex?: string;
  Party?: string;
  Telephone_Number?: string;
  Voter_Status?: string;
  Congressional_District?: string | number;
  House_District?: string | number;
  Senate_District?: string | number;
  Commission_District?: string | number;
  School_Board_District?: string | number;
  Precinct?: string;
  [key: string]: any;
}

class ExcelService {
  // Hash voter ID for consistent duplicate detection while preserving privacy
  private hashVoterId(voterId: string): string {
    return createHash('sha256').update(voterId.trim()).digest('hex');
  }

  // Create privacy-compliant redacted voter ID (last 4 digits with prefix)
  private redactVoterId(voterId: string): string {
    const cleanId = voterId.trim();
    if (cleanId.length <= 4) {
      return `***${cleanId}`;
    }
    const lastFour = cleanId.slice(-4);
    return `***${lastFour}`;
  }

  async processExcelFile(buffer: Buffer, userId: string): Promise<{
    processed: number;
    errors: string[];
    summary: any;
  }> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rawData: VoterExcelRow[] = XLSX.utils.sheet_to_json(worksheet);
    
    const errors: string[] = [];
    let processed = 0;
    const summary = {
      totalRows: rawData.length,
      successfullyProcessed: 0,
      duplicates: 0,
      errors: 0,
    };

    console.log(`Processing ${rawData.length} voter records from Excel file`);
    const processedVoterIds = new Set<string>(); // Will store hashed voter IDs

    for (let i = 0; i < rawData.length; i++) {
      try {
        const row = rawData[i];
        const voterIdStr = String(row.VoterID || '').trim();
        
        // Skip empty rows or header row
        if (!voterIdStr || voterIdStr === 'VoterID') {
          continue;
        }
        
        // Check for duplicates within the file using hashed ID
        const hashedVoterId = this.hashVoterId(voterIdStr);
        if (processedVoterIds.has(hashedVoterId)) {
          errors.push(`Row ${i + 2}: Duplicate VoterID ${this.redactVoterId(voterIdStr)} in file`);
          summary.duplicates++;
          continue;
        }
        
        const normalizedContact = this.normalizeVoterData(row, i + 2);
        
        if (!normalizedContact) {
          errors.push(`Row ${i + 2}: Invalid data format`);
          summary.errors++;
          continue;
        }

        // Check for existing contact in database by hashed voter ID
        const existing = await this.findExistingVoterContact(hashedVoterId);
        let contact;
        
        if (existing) {
          // Smart merge: Update baseline data, preserve volunteer data
          contact = await this.updateExistingContactWithBaselineData(existing.id, normalizedContact, userId);
          await this.updateBaselineContactData(contact.id, row, userId);
          
          console.log(`Updated existing contact: ${contact.fullName} (${this.redactVoterId(voterIdStr)})`);
        } else {
          // Create new contact
          contact = await storage.createContact({
            ...normalizedContact,
            addressSource: 'public', // Mark address as from public data
            lastUpdatedBy: userId,
            lastPublicUpdate: new Date(),
            isActive: true
          });

          // Log audit trail for contact creation from Excel import
          await auditService.logContactCreate(contact, userId, 'excel_import');

          // Store related data (phones, aliases)
          await this.storeRelatedVoterData(contact.id, row, userId);
        }
        
        processedVoterIds.add(hashedVoterId);
        processed++;
        summary.successfullyProcessed++;
        
        if (processed % 50 === 0) {
          console.log(`Processed ${processed} voter contacts...`);
        }
        
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        summary.errors++;
      }
    }
    
    console.log(`Import completed: ${processed} processed, ${summary.duplicates} duplicates, ${summary.errors} errors`);
    return { processed, errors, summary };
  }

  private normalizeVoterData(row: VoterExcelRow, rowNumber: number): InsertContact | null {
    try {
      const voterIdStr = String(row.VoterID || '').trim();
      
      if (!voterIdStr) {
        return null;
      }
      
      // Extract name data
      const firstName = row.First_Name ? String(row.First_Name).trim() : null;
      const lastName = row.Last_Name ? String(row.Last_Name).trim() : null;
      const middleName = row.Middle_Name && String(row.Middle_Name).trim() !== 'NULL' ? String(row.Middle_Name).trim() : null;
      
      if (!firstName && !lastName) {
        return null; // Skip rows without names
      }
      
      // Parse dates from Excel format (days since 1900-01-01)
      const parseExcelDate = (value: string | number | undefined): string | null => {
        if (!value) return null;
        
        if (typeof value === 'number') {
          // Excel date serial number
          const excelEpoch = new Date('1900-01-01T00:00:00Z').getTime();
          const date = new Date(excelEpoch + (value - 1) * 24 * 60 * 60 * 1000);
          return date.toISOString().split('T')[0];
        }
        
        const parsed = new Date(String(value));
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0];
        }
        
        return null;
      };
      
      // Build address
      const buildAddress = (): string | null => {
        if (row.Formatted_Address) {
          return String(row.Formatted_Address).trim();
        }
        return null;
      };
      
      // Extract state from City_State
      let state: string | null = null;
      if (row.City_State && typeof row.City_State === 'string') {
        const cityState = row.City_State.trim();
        const parts = cityState.split(' ');
        if (parts.length >= 2) {
          state = parts[parts.length - 1]; // Last part should be state
        }
      }
      
      // Generate system ID using hashed voter ID and full name
      const hashedVoterId = this.hashVoterId(voterIdStr);
      const systemId = `VV-${hashedVoterId.substring(0, 8)}`; // Use first 8 chars of hash
      const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
      
      return {
        systemId,
        fullName,
        voterIdRedacted: this.redactVoterId(voterIdStr), // PRIVACY: Store only redacted form
        firstName,
        lastName, 
        middleName,
        dateOfBirth: parseExcelDate(row.Birth_Date),
        streetAddress: buildAddress(),
        city: row.City_Name ? String(row.City_Name).trim() : null,
        state,
        zipCode: row.Zip_Code ? String(row.Zip_Code).trim() : null,
        registrationDate: parseExcelDate(row.Registration_Date),
        party: row.Party && String(row.Party).trim() !== 'NULL' ? String(row.Party).trim() : null,
        voterStatus: row.Voter_Status ? String(row.Voter_Status).trim() : null,
        district: row.Congressional_District ? String(row.Congressional_District).trim() : null,
        precinct: row.Precinct ? String(row.Precinct).trim() : null,
        houseDistrict: row.House_District ? String(row.House_District).trim() : null,
        senateDistrict: row.Senate_District ? String(row.Senate_District).trim() : null,
        commissionDistrict: row.Commission_District ? String(row.Commission_District).trim() : null,
        schoolBoardDistrict: row.School_Board_District ? String(row.School_Board_District).trim() : null,
        supporterStatus: 'unknown',
        notes: null,
      };

    } catch (error) {
      console.error(`Error normalizing voter row ${rowNumber}:`, error);
      return null;
    }
  }

  private getFieldValue(row: VoterExcelRow, fieldNames: string[]): string | null {
    for (const fieldName of fieldNames) {
      if (row[fieldName] !== undefined && row[fieldName] !== null && row[fieldName] !== '') {
        return String(row[fieldName]).trim();
      }
    }
    return null;
  }

  private normalizeDateOfBirth(dob: any): string | null {
    try {
      // Handle Excel date numbers
      if (typeof dob === 'number') {
        const excelDate = XLSX.SSF.parse_date_code(dob);
        return `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
      }

      // Handle string dates
      if (typeof dob === 'string') {
        const date = new Date(dob);
        if (isNaN(date.getTime())) {
          return null;
        }
        return date.toISOString().split('T')[0];
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private normalizeCity(city: string | null): string | null {
    if (!city) return null;
    return city.replace(/\b\w+\b/g, word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
  }

  private normalizeState(state: string | null): string | null {
    if (!state) return null;
    
    // Convert state abbreviations to full names if needed
    const stateMap: Record<string, string> = {
      'UT': 'Utah',
      'CA': 'California',
      'NY': 'New York',
      // Add more as needed
    };
    
    const upperState = state.toUpperCase();
    return stateMap[upperState] || state;
  }

  private normalizeZipCode(zip: string | null): string | null {
    if (!zip) return null;
    
    // Extract just the 5-digit ZIP
    const match = String(zip).match(/(\d{5})/);
    return match ? match[1] : null;
  }

  private extractFirstName(fullName: string): string | null {
    const parts = fullName.trim().split(/\s+/);
    return parts.length > 0 ? parts[0] : null;
  }

  private extractLastName(fullName: string): string | null {
    const parts = fullName.trim().split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1] : null;
  }

  private async updateExistingContactWithBaselineData(contactId: string, baselineData: InsertContact, userId: string): Promise<any> {
    try {
      // Only update baseline contact fields, preserve volunteer data
      const baselineUpdates = {
        fullName: baselineData.fullName,
        firstName: baselineData.firstName,
        lastName: baselineData.lastName,
        middleName: baselineData.middleName,
        dateOfBirth: baselineData.dateOfBirth,
        streetAddress: baselineData.streetAddress,
        city: baselineData.city,
        state: baselineData.state,
        zipCode: baselineData.zipCode,
        registrationDate: baselineData.registrationDate,
        party: baselineData.party,
        voterStatus: baselineData.voterStatus,
        district: baselineData.district,
        addressSource: 'public' as const, // Mark address as from public data
        lastUpdatedBy: userId,
        lastPublicUpdate: new Date(),
        isActive: true
      };

      const updatedContact = await storage.updateContact(contactId, baselineUpdates, userId);
      
      // Log audit trail for baseline data update
      await auditService.logUserAction(userId, 'update_baseline_data', {
        contactId,
        source: 'excel_import'
      });

      return updatedContact;
    } catch (error) {
      console.error('Error updating existing contact with baseline data:', error);
      throw error;
    }
  }

  private async updateBaselineContactData(contactId: string, row: VoterExcelRow, userId: string): Promise<void> {
    try {
      // Get existing phones to implement deduplication
      const existingPhones = await storage.getContactPhones(contactId);
      
      // Remove outdated baseline phone numbers
      for (const phone of existingPhones) {
        if (phone.isBaselineData) {
          await storage.removeContactPhone(phone.id);
          
          // Log audit trail for baseline phone deletion
          await auditService.logUserAction(userId, 'delete_baseline_phone', {
            contactId,
            phoneId: phone.id,
            phoneNumber: phone.phoneNumber,
            source: 'excel_import'
          });
        }
      }

      // Add new baseline phone if available
      if (row.Telephone_Number && String(row.Telephone_Number).trim() !== 'NULL') {
        const phoneNumber = String(row.Telephone_Number).trim();
        
        // Check if this exact number already exists as volunteer data
        const existingVolunteerPhone = existingPhones.find(p => 
          p.phoneNumber === phoneNumber && p.isManuallyAdded
        );
        
        // Only add if it doesn't already exist as volunteer data
        if (!existingVolunteerPhone) {
          // Check if we need to set this as primary (no existing primary phones)
          const hasPrimary = existingPhones.some(p => p.isPrimary && !p.isBaselineData);
          
          const phone: InsertContactPhone = {
            contactId,
            phoneNumber,
            phoneType: 'home',
            isPrimary: !hasPrimary, // Set as primary only if no existing primary
            isBaselineData: true,
            isManuallyAdded: false,
            createdBy: userId
          };
          const createdPhone = await storage.addContactPhone(phone);
          
          // Log audit trail for baseline phone update
          await auditService.logPhoneAdd(createdPhone, userId);
        }
      }

      // Add voter alias if needed with uniqueness check
      if (row.VoterID) {
        const aliasText = `Voter-${this.redactVoterId(String(row.VoterID))}`;
        
        // Check if alias already exists for this contact
        const existingAliases = await storage.getContactAliases(contactId);
        const aliasExists = existingAliases.some(alias => alias.alias === aliasText);
        
        if (!aliasExists) {
          try {
            const voterAlias: InsertContactAlias = {
              contactId,
              alias: aliasText
            };
            await storage.addContactAlias(voterAlias);
            
            // Log audit trail for alias creation
            await auditService.logUserAction(userId, 'create_alias', {
              contactId,
              alias: voterAlias.alias,
              source: 'excel_import'
            });
          } catch (aliasError) {
            console.log(`Failed to create alias for contact ${contactId}: ${aliasError}`);
          }
        }
      }
      
    } catch (error) {
      console.error('Error updating baseline contact data:', error);
    }
  }

  private async findExistingVoterContact(hashedVoterId: string): Promise<any> {
    try {
      // Use exact systemId matching instead of prefix search for data integrity
      const exactSystemId = `VV-${hashedVoterId.substring(0, 8)}`;
      const result = await storage.searchContacts({}, { systemId: exactSystemId }, 1, 0);
      
      // Verify exact match to prevent false positives
      const matches = result.contacts.filter(contact => contact.systemId === exactSystemId);
      return matches.length > 0 ? matches[0] : null;
    } catch (error) {
      console.error('Error checking for existing voter:', error);
      return null;
    }
  }
  
  private async storeRelatedVoterData(contactId: string, row: VoterExcelRow, userId: string): Promise<void> {
    try {
      // Store phone number if available
      if (row.Telephone_Number && String(row.Telephone_Number).trim() !== 'NULL') {
        const phoneNumber = String(row.Telephone_Number).trim();
        const phone: InsertContactPhone = {
          contactId,
          phoneNumber,
          phoneType: 'home',
          isPrimary: true,
          isBaselineData: true,
          isManuallyAdded: false,
          createdBy: userId
        };
        const createdPhone = await storage.addContactPhone(phone);
        
        // Log audit trail for phone creation from Excel import
        await auditService.logPhoneAdd(createdPhone, userId);
      }
      
      // Add redacted voter ID as searchable alias for privacy compliance
      if (row.VoterID) {
        const aliasText = `Voter-${this.redactVoterId(String(row.VoterID))}`;
        
        // Check if alias already exists for this contact (though unlikely for new contacts)
        const existingAliases = await storage.getContactAliases(contactId);
        const aliasExists = existingAliases.some(alias => alias.alias === aliasText);
        
        if (!aliasExists) {
          const voterAlias: InsertContactAlias = {
            contactId,
            alias: aliasText
          };
          await storage.addContactAlias(voterAlias);
          
          // Log audit trail for alias creation from Excel import
          await auditService.logUserAction(userId, 'create_alias', {
            contactId,
            alias: voterAlias.alias,
            source: 'excel_import'
          });
        }
      }
      
    } catch (error) {
      console.error('Error storing related voter data:', error);
    }
  }

  async createExportWorkbook(contacts: any[]): Promise<any> {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();

    // Create main contacts sheet
    const contactsSheet = workbook.addWorksheet('Contacts');

    // Define column headers
    contactsSheet.columns = [
      { header: 'System ID', key: 'systemId', width: 15 },
      { header: 'First Name', key: 'firstName', width: 20 },
      { header: 'Middle Name', key: 'middleName', width: 15 },
      { header: 'Last Name', key: 'lastName', width: 20 },
      { header: 'Full Name', key: 'fullName', width: 30 },
      { header: 'Suffix', key: 'suffix', width: 10 },
      { header: 'Birth Date', key: 'birthDate', width: 12 },
      { header: 'Age', key: 'age', width: 8 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Party', key: 'party', width: 15 },
      { header: 'Address', key: 'address', width: 40 },
      { header: 'City', key: 'city', width: 20 },
      { header: 'State', key: 'state', width: 10 },
      { header: 'ZIP Code', key: 'zipCode', width: 12 },
      { header: 'County', key: 'county', width: 20 },
      { header: 'Precinct', key: 'precinct', width: 15 },
      { header: 'District', key: 'district', width: 15 },
      { header: 'Supporter Status', key: 'supporterStatus', width: 20 },
      { header: 'Vote History', key: 'voteHistory', width: 30 },
      { header: 'Registration Date', key: 'registrationDate', width: 15 },
      { header: 'Last Voted Date', key: 'lastVotedDate', width: 15 },
      { header: 'Primary Phone', key: 'primaryPhone', width: 15 },
      { header: 'Primary Email', key: 'primaryEmail', width: 30 },
      { header: 'All Phones', key: 'allPhones', width: 40 },
      { header: 'All Emails', key: 'allEmails', width: 50 },
      { header: 'Aliases', key: 'aliases', width: 30 },
      { header: 'Notes', key: 'notes', width: 50 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 }
    ];

    // Add data rows
    contacts.forEach(contact => {
      const primaryPhone = contact.phones?.find((p: any) => p.isPrimary)?.phoneNumber ||
                          contact.phones?.[0]?.phoneNumber || '';
      const primaryEmail = contact.emails?.find((e: any) => e.isPrimary)?.email ||
                          contact.emails?.[0]?.email || '';

      const allPhones = contact.phones?.map((p: any) => `${p.phoneNumber} (${p.phoneType})`).join(', ') || '';
      const allEmails = contact.emails?.map((e: any) => `${e.email} (${e.emailType})`).join(', ') || '';
      const aliases = contact.aliases?.map((a: any) => a.aliasName).join(', ') || '';

      contactsSheet.addRow({
        systemId: contact.systemId,
        firstName: contact.firstName,
        middleName: contact.middleName,
        lastName: contact.lastName,
        fullName: contact.fullName,
        suffix: contact.suffix,
        birthDate: contact.birthDate ? new Date(contact.birthDate) : null,
        age: contact.age,
        gender: contact.gender,
        party: contact.party,
        address: contact.address,
        city: contact.city,
        state: contact.state,
        zipCode: contact.zipCode,
        county: contact.county,
        precinct: contact.precinct,
        district: contact.district,
        supporterStatus: contact.supporterStatus,
        voteHistory: contact.voteHistory,
        registrationDate: contact.registrationDate ? new Date(contact.registrationDate) : null,
        lastVotedDate: contact.lastVotedDate ? new Date(contact.lastVotedDate) : null,
        primaryPhone: primaryPhone,
        primaryEmail: primaryEmail,
        allPhones: allPhones,
        allEmails: allEmails,
        aliases: aliases,
        notes: contact.notes,
        createdAt: contact.createdAt ? new Date(contact.createdAt) : null,
        updatedAt: contact.updatedAt ? new Date(contact.updatedAt) : null
      });
    });

    // Style the header row
    const headerRow = contactsSheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Create separate sheets for detailed phone and email data
    if (contacts.some(c => c.phones?.length > 0)) {
      const phonesSheet = workbook.addWorksheet('Phone Numbers');
      phonesSheet.columns = [
        { header: 'Contact System ID', key: 'contactSystemId', width: 15 },
        { header: 'Contact Name', key: 'contactName', width: 30 },
        { header: 'Phone Number', key: 'phoneNumber', width: 15 },
        { header: 'Phone Type', key: 'phoneType', width: 12 },
        { header: 'Is Primary', key: 'isPrimary', width: 10 }
      ];

      contacts.forEach(contact => {
        contact.phones?.forEach((phone: any) => {
          phonesSheet.addRow({
            contactSystemId: contact.systemId,
            contactName: contact.fullName,
            phoneNumber: phone.phoneNumber,
            phoneType: phone.phoneType,
            isPrimary: phone.isPrimary ? 'Yes' : 'No'
          });
        });
      });

      // Style header
      const phoneHeaderRow = phonesSheet.getRow(1);
      phoneHeaderRow.font = { bold: true };
      phoneHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F7FF' }
      };
    }

    if (contacts.some(c => c.emails?.length > 0)) {
      const emailsSheet = workbook.addWorksheet('Email Addresses');
      emailsSheet.columns = [
        { header: 'Contact System ID', key: 'contactSystemId', width: 15 },
        { header: 'Contact Name', key: 'contactName', width: 30 },
        { header: 'Email Address', key: 'email', width: 35 },
        { header: 'Email Type', key: 'emailType', width: 12 },
        { header: 'Is Primary', key: 'isPrimary', width: 10 }
      ];

      contacts.forEach(contact => {
        contact.emails?.forEach((email: any) => {
          emailsSheet.addRow({
            contactSystemId: contact.systemId,
            contactName: contact.fullName,
            email: email.email,
            emailType: email.emailType,
            isPrimary: email.isPrimary ? 'Yes' : 'No'
          });
        });
      });

      // Style header
      const emailHeaderRow = emailsSheet.getRow(1);
      emailHeaderRow.font = { bold: true };
      emailHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0FFF0' }
      };
    }

    return workbook;
  }
}

export const excelService = new ExcelService();
