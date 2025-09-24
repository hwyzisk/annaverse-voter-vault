#!/usr/bin/env tsx
/**
 * Debug script to examine district field data in the database
 */

import { config } from 'dotenv';
config();

import { db } from '../server/db';
import { contacts } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function debugDistricts() {
  console.log('🔍 Debugging district fields in database...\n');

  try {
    // Get a few sample contacts to examine
    const sampleContacts = await db
      .select({
        id: contacts.id,
        fullName: contacts.fullName,
        district: contacts.district,
        precinct: contacts.precinct,
        houseDistrict: contacts.houseDistrict,
        senateDistrict: contacts.senateDistrict,
        commissionDistrict: contacts.commissionDistrict,
        schoolBoardDistrict: contacts.schoolBoardDistrict
      })
      .from(contacts)
      .limit(5);

    console.log('📊 Sample contacts district data:');
    console.log('=====================================');

    for (const contact of sampleContacts) {
      console.log(`\n👤 ${contact.fullName} (${contact.id})`);
      console.log(`   Congressional District: ${contact.district || 'NULL'}`);
      console.log(`   Precinct: ${contact.precinct || 'NULL'}`);
      console.log(`   House District: ${contact.houseDistrict || 'NULL'}`);
      console.log(`   Senate District: ${contact.senateDistrict || 'NULL'}`);
      console.log(`   Commission District: ${contact.commissionDistrict || 'NULL'}`);
      console.log(`   School Board District: ${contact.schoolBoardDistrict || 'NULL'}`);
    }

    // Count how many have district data
    const allContacts = await db
      .select({
        houseDistrict: contacts.houseDistrict,
        senateDistrict: contacts.senateDistrict,
        commissionDistrict: contacts.commissionDistrict,
        schoolBoardDistrict: contacts.schoolBoardDistrict
      })
      .from(contacts);

    const stats = {
      houseDistrictCount: allContacts.filter(c => c.houseDistrict).length,
      senateDistrictCount: allContacts.filter(c => c.senateDistrict).length,
      commissionDistrictCount: allContacts.filter(c => c.commissionDistrict).length,
      schoolBoardDistrictCount: allContacts.filter(c => c.schoolBoardDistrict).length,
      totalContacts: allContacts.length
    };

    console.log('\n📈 District field statistics:');
    console.log('==============================');
    console.log(`Total contacts: ${stats.totalContacts}`);
    console.log(`House District populated: ${stats.houseDistrictCount}`);
    console.log(`Senate District populated: ${stats.senateDistrictCount}`);
    console.log(`Commission District populated: ${stats.commissionDistrictCount}`);
    console.log(`School Board District populated: ${stats.schoolBoardDistrictCount}`);

  } catch (error) {
    console.error('❌ Error debugging districts:', error);
    process.exit(1);
  }

  process.exit(0);
}

debugDistricts();