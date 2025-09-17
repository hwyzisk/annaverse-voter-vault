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

function expandQueryWithNicknames(query: string): string[] {
  const words = query.toLowerCase().split(' ');
  const expandedQueries = [query];

  words.forEach(word => {
    if (NICKNAME_MAPPINGS[word]) {
      NICKNAME_MAPPINGS[word].forEach(nickname => {
        const expandedQuery = query.toLowerCase().replace(word, nickname);
        expandedQueries.push(expandedQuery);
      });
    }
  });

  return expandedQueries;
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
    query: string, 
    filters: any = {}, 
    limit = 20, 
    offset = 0
  ): Promise<{ contacts: Contact[], total: number }> {
    
    // If no query, use basic database search with filters
    if (!query.trim()) {
      return await storage.searchContacts('', filters, limit, offset);
    }

    // Get a larger set for fuzzy matching
    const dbResult = await storage.searchContacts(query, filters, limit * 5, 0);
    
    if (dbResult.contacts.length === 0) {
      return { contacts: [], total: 0 };
    }

    // Setup Fuse.js for fuzzy searching
    const fuse = new Fuse(dbResult.contacts, {
      keys: [
        { name: 'fullName', weight: 0.4 },
        { name: 'firstName', weight: 0.3 },
        { name: 'lastName', weight: 0.3 },
      ],
      threshold: 0.4, // Adjust for typo tolerance
      includeScore: true,
      ignoreLocation: true,
    });

    // Generate expanded queries with nicknames
    const expandedQueries = expandQueryWithNicknames(query);
    const allResults = new Map<string, any>();

    // Search with each expanded query
    expandedQueries.forEach(expandedQuery => {
      const results = fuse.search(expandedQuery);
      results.forEach(result => {
        if (!allResults.has(result.item.id)) {
          allResults.set(result.item.id, result);
        }
      });
    });

    // Handle initial matching (e.g., "D Smith" should match "David Smith")
    const { firstNames, lastNames, initials } = parseNameQuery(query);
    
    if (initials.length > 0) {
      dbResult.contacts.forEach(contact => {
        let matches = true;
        
        // Check if initials match
        if (initials.length > 0 && contact.firstName) {
          const firstInitial = contact.firstName.charAt(0).toLowerCase();
          if (!initials.some(initial => initial.toLowerCase() === firstInitial)) {
            matches = false;
          }
        }

        // Check last names
        if (lastNames.length > 0 && contact.lastName) {
          const lastName = contact.lastName.toLowerCase();
          if (!lastNames.some(ln => lastName.includes(ln.toLowerCase()))) {
            matches = false;
          }
        }

        if (matches && !allResults.has(contact.id)) {
          allResults.set(contact.id, { 
            item: contact, 
            score: 0.2 // Lower score for initial matches
          });
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
    // For now, delegate to the basic search
    return await storage.searchContacts(
      filters.name || '', 
      {
        city: filters.city,
        zipCode: filters.zipCode,
        supporterStatus: filters.supporterStatus,
      }
    );
  }
}

export const searchService = new SearchService();
