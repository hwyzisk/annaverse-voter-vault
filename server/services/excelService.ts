import * as XLSX from 'xlsx';
import { storage } from '../storage';
import { nanoid } from 'nanoid';
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
    const processedVoterIds = new Set<string>();

    for (let i = 0; i < rawData.length; i++) {
      try {
        const row = rawData[i];
        const voterIdStr = String(row.VoterID || '').trim();
        
        // Skip empty rows or header row
        if (!voterIdStr || voterIdStr === 'VoterID') {
          continue;
        }
        
        // Check for duplicates within the file
        if (processedVoterIds.has(voterIdStr)) {
          errors.push(`Row ${i + 2}: Duplicate VoterID ${voterIdStr} in file`);
          summary.duplicates++;
          continue;
        }
        
        const normalizedContact = this.normalizeVoterData(row, i + 2);
        
        if (!normalizedContact) {
          errors.push(`Row ${i + 2}: Invalid data format`);
          summary.errors++;
          continue;
        }

        // Check for existing contact in database by voter ID
        const existing = await this.findExistingVoterContact(voterIdStr);
        if (existing) {
          errors.push(`Row ${i + 2}: Voter ${voterIdStr} already exists in database`);
          summary.duplicates++;
          continue;
        }

        // Create contact
        const contact = await storage.createContact({
          ...normalizedContact,
          lastUpdatedBy: userId,
        });

        // Store related data (phones, aliases)
        await this.storeRelatedVoterData(contact.id, row, userId);
        
        processedVoterIds.add(voterIdStr);
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
      
      // Generate system ID and full name
      const systemId = `VV-${voterIdStr}`;
      const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
      
      return {
        systemId,
        fullName,
        voterIdRedacted: voterIdStr,
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

  private async findExistingVoterContact(voterIdRedacted: string): Promise<any> {
    try {
      const result = await storage.searchContacts(voterIdRedacted, {}, 1, 0);
      return result.contacts.length > 0 ? result.contacts[0] : null;
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
          createdBy: userId
        };
        await storage.addContactPhone(phone);
      }
      
      // Add voter ID as searchable alias
      if (row.VoterID) {
        const voterAlias: InsertContactAlias = {
          contactId,
          alias: `Voter-${row.VoterID}`
        };
        await storage.addContactAlias(voterAlias);
      }
      
    } catch (error) {
      console.error('Error storing related voter data:', error);
    }
  }
}

export const excelService = new ExcelService();
