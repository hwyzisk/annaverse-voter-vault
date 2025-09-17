import { storage } from "../storage";
import Fuse from "fuse.js";
import type { Contact } from "@shared/schema";

// Common nickname mappings
const NICKNAME_MAPPINGS: Record<string, string[]> = {
  'robert': ['bob', 'rob', 'bobby', 'robbie'],
  'bob': ['robert', 'rob', 'bobby', 'robbie'],
  'william': ['bill', 'will', 'billy', 'willy'],
  'bill': ['william', 'will', 'billy', 'willy'],
  'richard': ['rick', 'rich', 'dick', 'ricky'],
  'rick': ['richard', 'rich', 'dick', 'ricky'],
  'james': ['jim', 'jimmy', 'jamie'],
  'jim': ['james', 'jimmy', 'jamie'],
  'michael': ['mike', 'mick', 'mickey'],
  'mike': ['michael', 'mick', 'mickey'],
  'david': ['dave', 'davey'],
  'dave': ['david', 'davey'],
  'christopher': ['chris', 'topher'],
  'chris': ['christopher', 'topher'],
  'elizabeth': ['liz', 'beth', 'betty', 'lisa'],
  'liz': ['elizabeth', 'beth', 'betty', 'lisa'],
  'patricia': ['pat', 'patty', 'trish'],
  'pat': ['patricia', 'patty', 'trish'],
  'jennifer': ['jen', 'jenny', 'jenn'],
  'jen': ['jennifer', 'jenny', 'jenn'],
  'susan': ['sue', 'susie', 'suzy'],
  'sue': ['susan', 'susie', 'suzy'],
  'margaret': ['meg', 'maggie', 'peggy'],
  'meg': ['margaret', 'maggie', 'peggy'],
  'catherine': ['kate', 'cathy', 'katie'],
  'kate': ['catherine', 'cathy', 'katie'],
};

function expandNameWithNicknames(name: string): string[] {
  const nameLower = name.toLowerCase().trim();
  const expandedNames = [nameLower];

  if (NICKNAME_MAPPINGS[nameLower]) {
    NICKNAME_MAPPINGS[nameLower].forEach(nickname => {
      expandedNames.push(nickname);
    });
  }

  return expandedNames;
}

function parseNameQuery(query: string): { 
  firstNames: string[], 
  lastNames: string[], 
  initials: string[] 
} {
  const parts = query.trim().split(/\s+/);
  const firstNames: string[] = [];
  const lastNames: string[] = [];
  const initials: string[] = [];

  parts.forEach(part => {
    if (part.length === 1 || (part.length === 2 && part.endsWith('.'))) {
      // This is an initial
      initials.push(part.replace('.', ''));
    } else {
      // Assume first word is first name, rest are last names
      if (firstNames.length === 0) {
        firstNames.push(part);
      } else {
        lastNames.push(part);
      }
    }
  });

  return { firstNames, lastNames, initials };
}

class SearchService {
  async searchContacts(
    nameFilters: { firstName?: string; middleName?: string; lastName?: string; } = {}, 
    filters: any = {}, 
    limit = 20, 
    offset = 0
  ): Promise<{ contacts: Contact[], total: number }> {
    
    // Check if any name filters are provided
    const hasNameFilters = Boolean(
      nameFilters.firstName?.trim() || 
      nameFilters.middleName?.trim() || 
      nameFilters.lastName?.trim()
    );
    
    // If no name filters, use basic database search with filters
    if (!hasNameFilters) {
      return await storage.searchContacts(nameFilters, filters, limit, offset);
    }

    // Get a larger set for fuzzy matching
    const dbResult = await storage.searchContacts(nameFilters, filters, limit * 5, 0);
    
    if (dbResult.contacts.length === 0) {
      return { contacts: [], total: 0 };
    }

    // Setup Fuse.js for fuzzy searching with individual name field weights
    const fuse = new Fuse(dbResult.contacts, {
      keys: [
        { name: 'firstName', weight: 0.4 },
        { name: 'middleName', weight: 0.2 },
        { name: 'lastName', weight: 0.4 },
      ],
      threshold: 0.4, // Adjust for typo tolerance
      includeScore: true,
      ignoreLocation: true,
    });

    const allResults = new Map<string, any>();

    // Generate expanded search terms with nicknames for each name field
    const expandedFirstNames = nameFilters.firstName?.trim() ? 
      expandNameWithNicknames(nameFilters.firstName) : [];
    const expandedMiddleNames = nameFilters.middleName?.trim() ? 
      [nameFilters.middleName.toLowerCase().trim()] : [];
    const expandedLastNames = nameFilters.lastName?.trim() ? 
      expandNameWithNicknames(nameFilters.lastName) : [];

    // Search with expanded first names
    expandedFirstNames.forEach(firstName => {
      const results = fuse.search(firstName);
      results.forEach(result => {
        if (!allResults.has(result.item.id)) {
          allResults.set(result.item.id, result);
        }
      });
    });

    // Search with middle names
    expandedMiddleNames.forEach(middleName => {
      const results = fuse.search(middleName);
      results.forEach(result => {
        if (!allResults.has(result.item.id)) {
          allResults.set(result.item.id, result);
        }
      });
    });

    // Search with expanded last names
    expandedLastNames.forEach(lastName => {
      const results = fuse.search(lastName);
      results.forEach(result => {
        if (!allResults.has(result.item.id)) {
          allResults.set(result.item.id, result);
        }
      });
    });

    // Handle initial matching for first names (e.g., "D" should match "David")
    if (nameFilters.firstName?.trim() && nameFilters.firstName.length === 1) {
      const initial = nameFilters.firstName.toLowerCase();
      dbResult.contacts.forEach(contact => {
        if (contact.firstName && contact.firstName.charAt(0).toLowerCase() === initial) {
          if (!allResults.has(contact.id)) {
            allResults.set(contact.id, { 
              item: contact, 
              score: 0.2 // Lower score for initial matches
            });
          }
        }
      });
    }

    // Sort by score and apply pagination
    const sortedResults = Array.from(allResults.values())
      .sort((a, b) => (a.score || 0) - (b.score || 0))
      .slice(offset, offset + limit);

    const contacts = sortedResults.map(result => result.item);
    
    return {
      contacts,
      total: allResults.size
    };
  }

  async searchContactsAdvanced(filters: {
    name?: string;
    city?: string;
    zipCode?: string;
    ageMin?: number;
    ageMax?: number;
    hasPhone?: boolean;
    hasEmail?: boolean;
    supporterStatus?: string;
  }): Promise<{ contacts: Contact[], total: number }> {
    
    // This would be a more complex query with age calculations, etc.
    // For now, delegate to the basic search with empty nameFilters
    return await storage.searchContacts(
      {}, 
      {
        city: filters.city,
        zipCode: filters.zipCode,
        supporterStatus: filters.supporterStatus,
      }
    );
  }
}

export const searchService = new SearchService();
