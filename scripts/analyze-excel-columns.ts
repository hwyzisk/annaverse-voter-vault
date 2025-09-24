#!/usr/bin/env tsx
/**
 * Script to analyze Excel file columns to see what district fields are available
 */

import XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

async function analyzeExcelColumns() {
  console.log('🔍 Analyzing Excel file columns...\n');

  const excelFiles = [
    './attached_assets/All Orlando Voters_1758134169711.xlsx',
    './attached_assets/Sample Data for VoterVault_1758119191170.xlsx',
    './attached_assets/Sample Data for VoterVault_1758122951028.xlsx'
  ];

  for (const filePath of excelFiles) {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}\n`);
      continue;
    }

    console.log(`📄 Analyzing: ${path.basename(filePath)}`);
    console.log('='.repeat(60));

    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Get the range and header row
      const range = XLSX.utils.decode_range(worksheet['!ref']!);
      const headers: string[] = [];

      // Extract headers from first row
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        const cell = worksheet[cellAddress];
        if (cell && cell.v) {
          headers.push(String(cell.v));
        }
      }

      console.log(`📊 Total columns: ${headers.length}`);
      console.log(`📋 Sheet name: ${sheetName}\n`);

      // Look for district-related columns
      const districtColumns = headers.filter(header =>
        header.toLowerCase().includes('district') ||
        header.toLowerCase().includes('precinct')
      );

      console.log('🏛️  District-related columns found:');
      if (districtColumns.length > 0) {
        districtColumns.forEach((col, i) => {
          console.log(`   ${i + 1}. "${col}"`);
        });
      } else {
        console.log('   ❌ No district-related columns found!');
      }

      // Show all column names for reference
      console.log('\n📝 All column names:');
      headers.forEach((header, i) => {
        console.log(`   ${String(i + 1).padStart(2, ' ')}. "${header}"`);
      });

      // Look for potential house/senate/commission/school columns
      console.log('\n🔍 Looking for house/senate/commission/school columns:');
      const potentialColumns = headers.filter(header => {
        const lower = header.toLowerCase();
        return lower.includes('house') ||
               lower.includes('senate') ||
               lower.includes('commission') ||
               lower.includes('school');
      });

      if (potentialColumns.length > 0) {
        potentialColumns.forEach(col => {
          console.log(`   🎯 Found: "${col}"`);
        });
      } else {
        console.log('   ❌ No house/senate/commission/school columns found');
      }

    } catch (error) {
      console.error(`❌ Error analyzing ${filePath}:`, error);
    }

    console.log('\n' + '='.repeat(60) + '\n');
  }

  process.exit(0);
}

analyzeExcelColumns();