#!/usr/bin/env tsx
/**
 * Script to verify that all contacts have been cleared from the database
 * Run with: DATABASE_URL="..." npx tsx scripts/verify-cleanup.ts
 */

import { config } from 'dotenv';
config();

import { storage } from '../server/storage';

async function verifyCleanup() {
  console.log('🔍 Verifying database cleanup...');

  try {
    const result = await storage.searchContacts({}, {}, 1, 0);
    console.log(`📊 Total contacts found: ${result.total}`);

    if (result.total === 0) {
      console.log('✅ Database is clean! No contacts found.');
      console.log('🚀 Ready for fresh Excel import with district field support.');
    } else {
      console.log(`⚠️  Warning: Found ${result.total} contacts still in database.`);
      console.log('❌ Database cleanup may not have been complete.');
    }
  } catch (error) {
    console.error('❌ Error verifying cleanup:', error);
    process.exit(1);
  }

  process.exit(0);
}

verifyCleanup();