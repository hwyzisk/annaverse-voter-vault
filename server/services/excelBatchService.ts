import * as XLSX from 'xlsx';
import { storage } from '../storage';
import { nanoid } from 'nanoid';
import { createHash } from 'crypto';
import type { InsertContact, InsertContactPhone, InsertContactAlias } from '@shared/schema';

interface VoterExcelRow {
  VoterID?: string | number;
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

interface ProcessedRecord {
  contact: InsertContact;
  phone?: InsertContactPhone;
  alias?: InsertContactAlias;
  originalRowNumber: number;
  hashedVoterId: string;
}

interface BatchImportProgress {
  totalRows: number;
  processed: number;
  duplicates: number;
  errors: number;
  currentChunk: number;
  totalChunks: number;
  phase: 'parsing' | 'processing' | 'completed' | 'error';
}

export class ExcelBatchService {
  private readonly CHUNK_SIZE = 500; // Process records in chunks of 500
  private readonly MAX_MEMORY_CHUNKS = 5; // Keep max 5 chunks in memory at once
  
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

  /**
   * Streaming batch processor for large Excel files
   * Memory-efficient processing that handles 180K+ records
   */
  async processExcelFileStream(
    buffer: Buffer, 
    userId: string,
    progressCallback?: (progress: BatchImportProgress) => void
  ): Promise<{
    processed: number;
    errors: string[];
    summary: any;
  }> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get range to calculate total rows without loading all data
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    const totalRows = range.e.r; // End row number
    
    console.log(`Starting batch import of ~${totalRows} voter records`);
    
    const errors: string[] = [];
    let processed = 0;
    const summary = {
      totalRows,
      successfullyProcessed: 0,
      duplicates: 0,
      errors: 0,
    };

    // Global set to track processed voter IDs across all chunks
    const globalProcessedVoterIds = new Set<string>();
    
    // Calculate chunks
    const totalChunks = Math.ceil(totalRows / this.CHUNK_SIZE);
    
    try {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const startRow = chunkIndex * this.CHUNK_SIZE + 1; // Skip header
        const endRow = Math.min(startRow + this.CHUNK_SIZE - 1, totalRows);
        
        console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks} (rows ${startRow}-${endRow})`);
        
        // Update progress
        if (progressCallback) {
          progressCallback({
            totalRows,
            processed,
            duplicates: summary.duplicates,
            errors: summary.errors,
            currentChunk: chunkIndex + 1,
            totalChunks,
            phase: 'processing'
          });
        }

        // Extract chunk data efficiently 
        const chunkData = this.extractChunkData(worksheet, startRow, endRow);
        
        // Process chunk with transaction
        const chunkResult = await this.processChunkWithTransaction(
          chunkData, 
          startRow, 
          userId, 
          globalProcessedVoterIds
        );
        
        // Update counters
        processed += chunkResult.processed;
        summary.successfullyProcessed += chunkResult.processed;
        summary.duplicates += chunkResult.duplicates;
        summary.errors += chunkResult.errorCount;
        errors.push(...chunkResult.errors);
        
        // Memory management - force garbage collection every few chunks
        if (chunkIndex % this.MAX_MEMORY_CHUNKS === 0) {
          if (global.gc) {
            global.gc();
          }
        }
      }
      
      console.log(`Batch import completed: ${processed} processed, ${summary.duplicates} duplicates, ${summary.errors} errors`);
      
      if (progressCallback) {
        progressCallback({
          totalRows,
          processed,
          duplicates: summary.duplicates,
          errors: summary.errors,
          currentChunk: totalChunks,
          totalChunks,
          phase: 'completed'
        });
      }
      
    } catch (error) {
      console.error('Batch import failed:', error);
      if (progressCallback) {
        progressCallback({
          totalRows,
          processed,
          duplicates: summary.duplicates,
          errors: summary.errors,
          currentChunk: 0,
          totalChunks,
          phase: 'error'
        });
      }
      throw error;
    }
    
    return { processed, errors, summary };
  }

  /**
   * Extract data for a specific chunk of rows efficiently
   */
  private extractChunkData(worksheet: XLSX.WorkSheet, startRow: number, endRow: number): VoterExcelRow[] {
    const chunkData: VoterExcelRow[] = [];
    
    // Get headers from first row correctly
    const headers = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      range: { s: { c: 0, r: 0 }, e: { c: 50, r: 0 } }
    })[0] as string[];
    
    // Extract chunk rows
    for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
      const rowData: VoterExcelRow = {};
      
      // Extract each column for this row
      for (let colIndex = 0; colIndex < headers.length; colIndex++) {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        const cell = worksheet[cellAddress];
        const header = headers[colIndex];
        
        if (cell && header) {
          rowData[header] = cell.v; // Get cell value
        }
      }
      
      // Only add rows with VoterID
      if (rowData.VoterID) {
        chunkData.push(rowData);
      }
    }
    
    return chunkData;
  }

  /**
   * Process a chunk of records within a database transaction
   */
  private async processChunkWithTransaction(
    chunkData: VoterExcelRow[],
    startRowNumber: number,
    userId: string,
    globalProcessedVoterIds: Set<string>
  ): Promise<{
    processed: number;
    duplicates: number;
    errorCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let processed = 0;
    let duplicates = 0;
    let errorCount = 0;

    // First pass: validate and prepare records
    const validRecords: ProcessedRecord[] = [];
    const chunkProcessedVoterIds = new Set<string>();
    
    for (let i = 0; i < chunkData.length; i++) {
      try {
        const row = chunkData[i];
        const actualRowNumber = startRowNumber + i;
        const voterIdStr = String(row.VoterID || '').trim();
        
        // Skip empty rows or header row
        if (!voterIdStr || voterIdStr === 'VoterID') {
          continue;
        }
        
        // Check for duplicates
        const hashedVoterId = this.hashVoterId(voterIdStr);
        if (globalProcessedVoterIds.has(hashedVoterId) || chunkProcessedVoterIds.has(hashedVoterId)) {
          errors.push(`Row ${actualRowNumber}: Duplicate VoterID ${this.redactVoterId(voterIdStr)}`);
          duplicates++;
          continue;
        }
        
        // Check if already exists in database
        const existing = await this.findExistingVoterContact(hashedVoterId);
        if (existing) {
          errors.push(`Row ${actualRowNumber}: Voter ${this.redactVoterId(voterIdStr)} already exists in database`);
          duplicates++;
          continue;
        }
        
        const normalizedContact = this.normalizeVoterData(row, actualRowNumber);
        
        if (!normalizedContact) {
          errors.push(`Row ${actualRowNumber}: Invalid data format`);
          errorCount++;
          continue;
        }

        // Prepare related data
        const processedRecord: ProcessedRecord = {
          contact: {
            ...normalizedContact,
            lastUpdatedBy: userId,
          },
          originalRowNumber: actualRowNumber,
          hashedVoterId
        };

        // Prepare baseline phone data if available
        if (row.Telephone_Number && String(row.Telephone_Number).trim() !== 'NULL') {
          processedRecord.phone = {
            contactId: '', // Will be set after contact creation
            phoneNumber: String(row.Telephone_Number).trim(),
            phoneType: 'home',
            isPrimary: true,
            isBaselineData: true, // Mark as baseline import data
            isManuallyAdded: false,
            createdBy: userId
          };
        }
        
        // Prepare baseline alias data
        processedRecord.alias = {
          contactId: '', // Will be set after contact creation
          alias: `Voter-${this.redactVoterId(voterIdStr)}`
        };
        
        validRecords.push(processedRecord);
        chunkProcessedVoterIds.add(hashedVoterId);
        
      } catch (error) {
        errors.push(`Row ${startRowNumber + i}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        errorCount++;
      }
    }

    // Second pass: batch insert valid records using transaction
    if (validRecords.length > 0) {
      try {
        await storage.batchInsertContacts(validRecords, userId);
        processed = validRecords.length;
        
        // Add processed IDs to global set
        validRecords.forEach(record => {
          globalProcessedVoterIds.add(record.hashedVoterId);
        });
        
      } catch (error) {
        console.error('Batch insert failed for chunk:', error);
        errors.push(`Chunk batch insert failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        errorCount += validRecords.length;
      }
    }

    return { processed, duplicates, errorCount, errors };
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
        supporterStatus: 'unknown',
        notes: null,
      };

    } catch (error) {
      console.error(`Error normalizing voter row ${rowNumber}:`, error);
      return null;
    }
  }

  private async findExistingVoterContact(hashedVoterId: string): Promise<any> {
    try {
      // Search by systemId which contains the hash prefix  
      const systemIdPrefix = `VV-${hashedVoterId.substring(0, 8)}`;
      // Use empty nameFilters since we're searching by system ID through other filters
      const result = await storage.searchContacts({}, { systemId: systemIdPrefix }, 1, 0);
      return result.contacts.length > 0 ? result.contacts[0] : null;
    } catch (error) {
      console.error('Error checking for existing voter:', error);
      return null;
    }
  }
}

export const excelBatchService = new ExcelBatchService();