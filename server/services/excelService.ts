import * as XLSX from 'xlsx';
import { storage } from '../storage';
import type { InsertContact } from '@shared/schema';

interface ExcelRow {
  [key: string]: any;
}

class ExcelService {
  async processExcelFile(buffer: Buffer, userId: string): Promise<{
    processed: number;
    errors: string[];
    summary: any;
  }> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rawData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);
    
    const errors: string[] = [];
    let processed = 0;
    const summary = {
      totalRows: rawData.length,
      successfullyProcessed: 0,
      duplicates: 0,
      errors: 0,
    };

    for (let i = 0; i < rawData.length; i++) {
      try {
        const row = rawData[i];
        const normalizedContact = this.normalizeContactData(row, i + 2); // +2 because Excel is 1-indexed and we skip header
        
        if (!normalizedContact) {
          errors.push(`Row ${i + 2}: Invalid data format`);
          summary.errors++;
          continue;
        }

        // Check for duplicates by name and DOB
        const existing = await this.findDuplicateContact(normalizedContact);
        if (existing) {
          errors.push(`Row ${i + 2}: Duplicate contact found - ${normalizedContact.fullName}`);
          summary.duplicates++;
          continue;
        }

        // Create contact
        const contact = await storage.createContact({
          ...normalizedContact,
          lastUpdatedBy: userId,
        });

        // Log audit
        await storage.logAudit({
          contactId: contact.id,
          userId: userId,
          action: 'create',
          tableName: 'contacts',
          recordId: contact.id,
          fieldName: null,
          oldValue: null,
          newValue: JSON.stringify(normalizedContact),
          metadata: { source: 'excel_import', row: i + 2 }
        });

        processed++;
        summary.successfullyProcessed++;
        
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        summary.errors++;
      }
    }

    return { processed, errors, summary };
  }

  private normalizeContactData(row: ExcelRow, rowNumber: number): InsertContact | null {
    try {
      // Map common Excel column names to our schema
      const fullName = this.getFieldValue(row, ['full_name', 'name', 'Full Name', 'Name', 'FULL_NAME']);
      const firstName = this.getFieldValue(row, ['first_name', 'firstName', 'First Name', 'FIRST_NAME']);
      const lastName = this.getFieldValue(row, ['last_name', 'lastName', 'Last Name', 'LAST_NAME']);
      const middleName = this.getFieldValue(row, ['middle_name', 'middleName', 'Middle Name', 'MIDDLE_NAME']);
      
      // Generate full name if not provided
      let normalizedFullName = fullName;
      if (!normalizedFullName && (firstName || lastName)) {
        normalizedFullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
      }

      if (!normalizedFullName) {
        return null; // Skip rows without names
      }

      // Parse and normalize DOB
      const dobRaw = this.getFieldValue(row, ['date_of_birth', 'dob', 'Date of Birth', 'DOB', 'birthdate']);
      let dateOfBirth: string | null = null;
      if (dobRaw) {
        dateOfBirth = this.normalizeDateOfBirth(dobRaw);
      }

      // Normalize address
      const streetAddress = this.getFieldValue(row, ['address', 'street_address', 'Address', 'Street Address']);
      const city = this.normalizeCity(this.getFieldValue(row, ['city', 'City', 'CITY']));
      const state = this.normalizeState(this.getFieldValue(row, ['state', 'State', 'STATE']));
      const zipCode = this.normalizeZipCode(this.getFieldValue(row, ['zip', 'zip_code', 'zipcode', 'Zip', 'ZIP']));

      // Normalize district info
      const district = this.getFieldValue(row, ['district', 'congressional_district', 'District']);
      const precinct = this.getFieldValue(row, ['precinct', 'Precinct']);

      // Generate system ID
      const systemId = `VV-2024-${String(Date.now()).slice(-6)}${String(rowNumber).padStart(3, '0')}`;

      return {
        systemId,
        fullName: normalizedFullName,
        firstName: firstName || this.extractFirstName(normalizedFullName),
        middleName,
        lastName: lastName || this.extractLastName(normalizedFullName),
        dateOfBirth,
        streetAddress,
        city,
        state,
        zipCode,
        district,
        precinct,
        supporterStatus: 'unknown',
        notes: null,
      };

    } catch (error) {
      console.error(`Error normalizing row ${rowNumber}:`, error);
      return null;
    }
  }

  private getFieldValue(row: ExcelRow, fieldNames: string[]): string | null {
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

  private async findDuplicateContact(contact: InsertContact): Promise<any> {
    // Simple duplicate detection by name and DOB
    const result = await storage.searchContacts(contact.fullName || '', {}, 10, 0);
    
    return result.contacts.find(existing => 
      existing.fullName === contact.fullName && 
      existing.dateOfBirth === contact.dateOfBirth
    );
  }
}

export const excelService = new ExcelService();
