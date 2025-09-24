#!/usr/bin/env tsx
/**
 * One-time script to clear all contacts and related data from the database
 * Run with: npx tsx scripts/clear-contacts.ts
 */

import { config } from 'dotenv';
// Load environment variables from .env file
config();

import { storage } from '../server/storage';

async function clearAllContacts() {
  console.log('🗑️  Starting database cleanup...');

  try {
    await storage.clearAllContacts();
    console.log('✅ Successfully cleared all contacts and related data!');
    console.log('📊 The following data has been removed:');
    console.log('   • All contacts');
    console.log('   • All contact phones');
    console.log('   • All contact emails');
    console.log('   • All contact aliases');
    console.log('   • All audit logs');
    console.log('');
    console.log('🔄 You can now reimport your Excel files with the fixed district field mapping.');
  } catch (error) {
    console.error('❌ Error clearing contacts:', error);
    process.exit(1);
  }

  process.exit(0);
}

clearAllContacts();