import { storage } from "../storage";
import Fuse from "fuse.js";
import type { Contact } from "@shared/schema";

// Comprehensive nickname mappings
const NICKNAME_MAPPINGS: Record<string, string[]> = {
  // Male names
  'robert': ['bob', 'rob', 'bobby', 'robbie', 'bert'],
  'bob': ['robert', 'rob', 'bobby', 'robbie', 'bert'],
  'rob': ['robert', 'bob', 'bobby', 'robbie', 'bert'],
  'bobby': ['robert', 'bob', 'rob', 'robbie', 'bert'],
  'robbie': ['robert', 'bob', 'rob', 'bobby', 'bert'],

  'william': ['bill', 'will', 'billy', 'willy', 'willie', 'liam'],
  'bill': ['william', 'will', 'billy', 'willy', 'willie'],
  'will': ['william', 'bill', 'billy', 'willy', 'willie'],
  'billy': ['william', 'bill', 'will', 'willy', 'willie'],
  'willy': ['william', 'bill', 'will', 'billy', 'willie'],
  'willie': ['william', 'bill', 'will', 'billy', 'willy'],
  'liam': ['william'],

  'richard': ['rick', 'rich', 'dick', 'ricky', 'richie'],
  'rick': ['richard', 'rich', 'dick', 'ricky', 'richie'],
  'rich': ['richard', 'rick', 'dick', 'ricky', 'richie'],
  'dick': ['richard', 'rick', 'rich', 'ricky', 'richie'],
  'ricky': ['richard', 'rick', 'rich', 'dick', 'richie'],
  'richie': ['richard', 'rick', 'rich', 'dick', 'ricky'],

  'james': ['jim', 'jimmy', 'jamie', 'jay'],
  'jim': ['james', 'jimmy', 'jamie', 'jay'],
  'jimmy': ['james', 'jim', 'jamie', 'jay'],
  'jamie': ['james', 'jim', 'jimmy', 'jay'],
  'jay': ['james', 'jim', 'jimmy', 'jamie'],

  'michael': ['mike', 'mick', 'mickey', 'mikey'],
  'mike': ['michael', 'mick', 'mickey', 'mikey'],
  'mick': ['michael', 'mike', 'mickey', 'mikey'],
  'mickey': ['michael', 'mike', 'mick', 'mikey'],
  'mikey': ['michael', 'mike', 'mick', 'mickey'],

  'david': ['dave', 'davey', 'davy'],
  'dave': ['david', 'davey', 'davy'],
  'davey': ['david', 'dave', 'davy'],
  'davy': ['david', 'dave', 'davey'],

  'christopher': ['chris', 'topher', 'kit'],
  'chris': ['christopher', 'topher', 'kit'],
  'topher': ['christopher', 'chris', 'kit'],
  'kit': ['christopher', 'chris', 'topher'],

  'thomas': ['tom', 'tommy', 'thom'],
  'tom': ['thomas', 'tommy', 'thom'],
  'tommy': ['thomas', 'tom', 'thom'],
  'thom': ['thomas', 'tom', 'tommy'],

  'matthew': ['matt', 'matty'],
  'matt': ['matthew', 'matty'],
  'matty': ['matthew', 'matt'],

  'anthony': ['tony', 'ant'],
  'tony': ['anthony', 'ant'],
  'ant': ['anthony', 'tony'],

  'daniel': ['dan', 'danny', 'dane'],
  'dan': ['daniel', 'danny', 'dane'],
  'danny': ['daniel', 'dan', 'dane'],
  'dane': ['daniel', 'dan', 'danny'],

  'joseph': ['joe', 'joey', 'jos'],
  'joe': ['joseph', 'joey', 'jos'],
  'joey': ['joseph', 'joe', 'jos'],
  'jos': ['joseph', 'joe', 'joey'],

  'john': ['johnny', 'jack', 'jon'],
  'johnny': ['john', 'jack', 'jon'],
  'jack': ['john', 'johnny', 'jon', 'jackson'],
  'jon': ['john', 'johnny', 'jack', 'jonathan'],
  'jonathan': ['jon', 'johnny', 'jack'],
  'jackson': ['jack'],

  'andrew': ['andy', 'drew'],
  'andy': ['andrew', 'drew'],
  'drew': ['andrew', 'andy'],

  'nicholas': ['nick', 'nicky', 'nic'],
  'nick': ['nicholas', 'nicky', 'nic'],
  'nicky': ['nicholas', 'nick', 'nic'],
  'nic': ['nicholas', 'nick', 'nicky'],

  'benjamin': ['ben', 'benny', 'benji'],
  'ben': ['benjamin', 'benny', 'benji'],
  'benny': ['benjamin', 'ben', 'benji'],
  'benji': ['benjamin', 'ben', 'benny'],

  'alexander': ['alex', 'al', 'xander'],
  'alex': ['alexander', 'al', 'xander', 'alexandra'],
  'al': ['alexander', 'alex', 'xander', 'albert', 'alan'],
  'xander': ['alexander', 'alex', 'al'],
  'albert': ['al', 'bert', 'albie'],
  'bert': ['albert', 'al', 'albie', 'robert'],
  'albie': ['albert', 'al', 'bert'],

  'edward': ['ed', 'eddie', 'ted', 'eddy'],
  'ed': ['edward', 'eddie', 'ted', 'eddy'],
  'eddie': ['edward', 'ed', 'ted', 'eddy'],
  'ted': ['edward', 'ed', 'eddie', 'eddy', 'theodore'],
  'eddy': ['edward', 'ed', 'eddie', 'ted'],
  'theodore': ['ted', 'theo'],
  'theo': ['theodore', 'ted'],

  'charles': ['charlie', 'chuck', 'chas'],
  'charlie': ['charles', 'chuck', 'chas'],
  'chuck': ['charles', 'charlie', 'chas'],
  'chas': ['charles', 'charlie', 'chuck'],

  'ronald': ['ron', 'ronnie'],
  'ron': ['ronald', 'ronnie'],
  'ronnie': ['ronald', 'ron'],

  'kenneth': ['ken', 'kenny'],
  'ken': ['kenneth', 'kenny'],
  'kenny': ['kenneth', 'ken'],

  'samuel': ['sam', 'sammy'],
  'sam': ['samuel', 'sammy', 'samantha'],
  'sammy': ['samuel', 'sam', 'samantha'],

  'gregory': ['greg', 'gregg'],
  'greg': ['gregory', 'gregg'],
  'gregg': ['gregory', 'greg'],

  'patrick': ['pat', 'paddy', 'rick'],
  'paddy': ['patrick', 'pat', 'rick'],

  'timothy': ['tim', 'timmy'],
  'tim': ['timothy', 'timmy'],
  'timmy': ['timothy', 'tim'],

  'joshua': ['josh'],
  'josh': ['joshua'],

  'stephen': ['steve', 'stevie'],
  'steven': ['steve', 'stevie'],
  'steve': ['stephen', 'steven', 'stevie'],
  'stevie': ['stephen', 'steven', 'steve'],

  'frank': ['francis', 'frankie'],
  'francis': ['frank', 'frankie'],
  'frankie': ['frank', 'francis'],

  'lawrence': ['larry', 'lars'],
  'larry': ['lawrence', 'lars'],
  'lars': ['lawrence', 'larry'],

  // Female names
  'elizabeth': ['liz', 'beth', 'betty', 'lisa', 'eliza', 'libby', 'betsy', 'bessie'],
  'liz': ['elizabeth', 'beth', 'betty', 'lisa', 'eliza', 'libby', 'betsy', 'bessie'],
  'beth': ['elizabeth', 'liz', 'betty', 'lisa', 'eliza', 'libby', 'betsy', 'bessie'],
  'betty': ['elizabeth', 'liz', 'beth', 'lisa', 'eliza', 'libby', 'betsy', 'bessie'],
  'lisa': ['elizabeth', 'liz', 'beth', 'betty', 'eliza', 'libby', 'betsy', 'bessie'],
  'eliza': ['elizabeth', 'liz', 'beth', 'betty', 'lisa', 'libby', 'betsy', 'bessie'],
  'libby': ['elizabeth', 'liz', 'beth', 'betty', 'lisa', 'eliza', 'betsy', 'bessie'],
  'betsy': ['elizabeth', 'liz', 'beth', 'betty', 'lisa', 'eliza', 'libby', 'bessie'],
  'bessie': ['elizabeth', 'liz', 'beth', 'betty', 'lisa', 'eliza', 'libby', 'betsy'],

  'patricia': ['pat', 'patty', 'trish', 'tricia'],
  'pat': ['patricia', 'patty', 'trish', 'tricia', 'patrick'],
  'patty': ['patricia', 'pat', 'trish', 'tricia'],
  'trish': ['patricia', 'pat', 'patty', 'tricia'],
  'tricia': ['patricia', 'pat', 'patty', 'trish'],

  'jennifer': ['jen', 'jenny', 'jenn', 'jenni'],
  'jen': ['jennifer', 'jenny', 'jenn', 'jenni'],
  'jenny': ['jennifer', 'jen', 'jenn', 'jenni'],
  'jenn': ['jennifer', 'jen', 'jenny', 'jenni'],
  'jenni': ['jennifer', 'jen', 'jenny', 'jenn'],

  'susan': ['sue', 'susie', 'suzy', 'suzanne'],
  'sue': ['susan', 'susie', 'suzy', 'suzanne'],
  'susie': ['susan', 'sue', 'suzy', 'suzanne'],
  'suzy': ['susan', 'sue', 'susie', 'suzanne'],
  'suzanne': ['susan', 'sue', 'susie', 'suzy'],

  'margaret': ['meg', 'maggie', 'peggy', 'margie', 'marge'],
  'meg': ['margaret', 'maggie', 'peggy', 'margie', 'marge'],
  'maggie': ['margaret', 'meg', 'peggy', 'margie', 'marge'],
  'peggy': ['margaret', 'meg', 'maggie', 'margie', 'marge'],
  'margie': ['margaret', 'meg', 'maggie', 'peggy', 'marge'],
  'marge': ['margaret', 'meg', 'maggie', 'peggy', 'margie'],

  'catherine': ['kate', 'cathy', 'katie', 'cat', 'kitty'],
  'katherine': ['kate', 'cathy', 'katie', 'cat', 'kitty'],
  'kate': ['catherine', 'katherine', 'cathy', 'katie', 'cat', 'kitty'],
  'cathy': ['catherine', 'katherine', 'kate', 'katie', 'cat', 'kitty'],
  'katie': ['catherine', 'katherine', 'kate', 'cathy', 'cat', 'kitty'],
  'cat': ['catherine', 'katherine', 'kate', 'cathy', 'katie', 'kitty'],
  'kitty': ['catherine', 'katherine', 'kate', 'cathy', 'katie', 'cat'],

  'mary': ['marie', 'maria'],
  'marie': ['mary', 'maria'],
  'maria': ['mary', 'marie'],

  'barbara': ['barb', 'barbie', 'babs'],
  'barb': ['barbara', 'barbie', 'babs'],
  'barbie': ['barbara', 'barb', 'babs'],
  'babs': ['barbara', 'barb', 'barbie'],

  'nancy': ['nan'],
  'nan': ['nancy'],

  'helen': ['nell', 'nellie'],
  'nell': ['helen', 'nellie'],
  'nellie': ['helen', 'nell'],

  'dorothy': ['dot', 'dolly', 'dottie'],
  'dot': ['dorothy', 'dolly', 'dottie'],
  'dolly': ['dorothy', 'dot', 'dottie'],
  'dottie': ['dorothy', 'dot', 'dolly'],

  'carol': ['carole', 'caroline'],
  'carole': ['carol', 'caroline'],
  'caroline': ['carol', 'carole'],

  'ruth': ['ruthie'],
  'ruthie': ['ruth'],

  'sharon': ['shari'],
  'shari': ['sharon'],

  'michelle': ['shelley', 'shelly', 'mickey'],
  'shelley': ['michelle', 'shelly', 'mickey'],
  'shelly': ['michelle', 'shelley', 'mickey'],

  'laura': ['laurie'],
  'laurie': ['laura'],

  'sarah': ['sara'],
  'sara': ['sarah'],

  'kimberly': ['kim', 'kimmy'],
  'kim': ['kimberly', 'kimmy'],
  'kimmy': ['kimberly', 'kim'],

  'deborah': ['debbie', 'deb', 'debby'],
  'debbie': ['deborah', 'deb', 'debby'],
  'deb': ['deborah', 'debbie', 'debby'],
  'debby': ['deborah', 'debbie', 'deb'],

  'donna': ['don'],
  'don': ['donna', 'donald'],
  'donald': ['don'],

  'emily': ['emma', 'em'],
  'emma': ['emily', 'em'],
  'em': ['emily', 'emma'],

  'cynthia': ['cindy', 'cyn'],
  'cindy': ['cynthia', 'cyn'],
  'cyn': ['cynthia', 'cindy'],

  'amanda': ['mandy', 'amy'],
  'mandy': ['amanda', 'amy'],
  'amy': ['amanda', 'mandy', 'amelia'],
  'amelia': ['amy'],

  'stephanie': ['steph', 'stephie'],
  'steph': ['stephanie', 'stephie'],
  'stephie': ['stephanie', 'steph'],

  'melissa': ['mel', 'missy'],
  'mel': ['melissa', 'missy', 'melanie'],
  'missy': ['melissa', 'mel'],
  'melanie': ['mel'],

  'nicole': ['nicki', 'nikki', 'nic'],
  'nicki': ['nicole', 'nikki', 'nic'],
  'nikki': ['nicole', 'nicki', 'nic'],

  'jessica': ['jess', 'jessie'],
  'jess': ['jessica', 'jessie'],
  'jessie': ['jessica', 'jess'],

  'rebecca': ['becky', 'becca'],
  'becky': ['rebecca', 'becca'],
  'becca': ['rebecca', 'becky'],

  'virginia': ['ginny', 'ginger'],
  'ginny': ['virginia', 'ginger'],
  'ginger': ['virginia', 'ginny'],

  'samantha': ['sam', 'sammy'],

  'alexandra': ['alex', 'sandra'],
  'sandra': ['alexandra', 'alex'],

  'jacqueline': ['jackie', 'jacqui'],
  'jackie': ['jacqueline', 'jacqui'],
  'jacqui': ['jacqueline', 'jackie'],
};

// Common spelling variations and typos
const SPELLING_VARIATIONS: Record<string, string[]> = {
  'john': ['jon', 'johan', 'johnathan'],
  'jon': ['john', 'johan', 'johnathan'],
  'stephen': ['steven', 'stefan'],
  'steven': ['stephen', 'stefan'],
  'catherine': ['katherine', 'kathryn', 'katharine'],
  'katherine': ['catherine', 'kathryn', 'katharine'],
  'ann': ['anne', 'anna'],
  'anne': ['ann', 'anna'],
  'anna': ['ann', 'anne'],
  'sarah': ['sara'],
  'sara': ['sarah'],
  'rebecca': ['rebekah'],
  'rebekah': ['rebecca'],
  'geoffrey': ['jeffrey'],
  'jeffrey': ['geoffrey'],
  'philip': ['phillip'],
  'phillip': ['philip'],
  'teresa': ['theresa'],
  'theresa': ['teresa'],
  'carol': ['carole'],
  'carole': ['carol'],
  'lisa': ['liza'],
  'liza': ['lisa'],
  'cristian': ['christian'],
  'christian': ['cristian'],
  'brian': ['bryan'],
  'bryan': ['brian'],
  'sean': ['shaun', 'shawn'],
  'shaun': ['sean', 'shawn'],
  'shawn': ['sean', 'shaun'],
};

function expandNameWithNicknames(name: string): string[] {
  const nameLower = name.toLowerCase().trim();
  const expandedNames = [nameLower];

  // Add nickname variations
  if (NICKNAME_MAPPINGS[nameLower]) {
    NICKNAME_MAPPINGS[nameLower].forEach(nickname => {
      if (!expandedNames.includes(nickname)) {
        expandedNames.push(nickname);
      }
    });
  }

  // Add spelling variations
  if (SPELLING_VARIATIONS[nameLower]) {
    SPELLING_VARIATIONS[nameLower].forEach(variation => {
      if (!expandedNames.includes(variation)) {
        expandedNames.push(variation);
      }
    });
  }

  return expandedNames;
}

// Generate phonetic variations for better fuzzy matching
function generatePhoneticVariations(name: string): string[] {
  const nameLower = name.toLowerCase().trim();
  const variations = [nameLower];

  // Handle common phonetic substitutions
  const phoneticRules = [
    // C/K sounds
    [/^c([eiy])/g, 's$1'], // ce/ci/cy -> se/si/sy
    [/ck/g, 'k'],
    [/c([aou])/g, 'k$1'],
    // F/PH sounds
    [/ph/g, 'f'],
    [/f/g, 'ph'],
    // Silent letters
    [/^kn/g, 'n'],
    [/^wr/g, 'r'],
    [/^ps/g, 's'],
    // Double letters
    [/ll/g, 'l'],
    [/ss/g, 's'],
    [/tt/g, 't'],
    [/nn/g, 'n'],
    [/mm/g, 'm'],
  ];

  phoneticRules.forEach(([pattern, replacement]) => {
    const variation = nameLower.replace(pattern, replacement as string);
    if (variation !== nameLower && !variations.includes(variation)) {
      variations.push(variation);
    }
  });

  return variations;
}

// Simple Levenshtein distance calculation for typo tolerance
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i += 1) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j += 1) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator, // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
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

    console.log('🔍 Enhanced search called with:', {
      nameFilters,
      filters,
      limit,
      offset
    });

    // Check if any name filters are provided
    const hasNameFilters = Boolean(
      nameFilters.firstName?.trim() ||
      nameFilters.middleName?.trim() ||
      nameFilters.lastName?.trim()
    );

    console.log('🔍 Name filter check:', {
      'nameFilters.firstName': nameFilters.firstName,
      'nameFilters.firstName?.trim()': nameFilters.firstName?.trim(),
      'nameFilters.middleName': nameFilters.middleName,
      'nameFilters.lastName': nameFilters.lastName,
      hasNameFilters
    });

    // If no name filters, use basic database search with filters
    if (!hasNameFilters) {
      console.log('🔍 No name filters, using basic search');
      return await storage.searchContacts(nameFilters, filters, limit, offset);
    }

    console.log('🔍 Using enhanced fuzzy search with name filters');

    try {
      // Expand search terms with nicknames FIRST, then use those for database search
      const expandedFirstNames = nameFilters.firstName?.trim() ?
        expandNameWithNicknames(nameFilters.firstName) : [];
      const expandedMiddleNames = nameFilters.middleName?.trim() ?
        expandNameWithNicknames(nameFilters.middleName) : [];
      const expandedLastNames = nameFilters.lastName?.trim() ?
        expandNameWithNicknames(nameFilters.lastName) : [];

      console.log('🔍 Pre-database nickname expansion:', {
        originalFirstName: nameFilters.firstName,
        expandedFirstNames,
        firstExpandedName: expandedFirstNames[0]
      });

      // Use the first 2 characters of the FIRST expanded name for database search
      const lenientNameFilters = {
        firstName: expandedFirstNames.length > 0 ?
          expandedFirstNames[0].substring(0, 2) : undefined,
        middleName: expandedMiddleNames.length > 0 ?
          expandedMiddleNames[0].substring(0, 2) : undefined,
        lastName: expandedLastNames.length > 0 ?
          expandedLastNames[0].substring(0, 2) : undefined
      };

      console.log('🔍 About to call storage.searchContacts with lenient filters:', {
        originalNameFilters: nameFilters,
        lenientNameFilters,
        filters,
        limit: (limit + offset) * 5, // Increased multiplier since we're casting wider net
        offset: 0
      });
      const dbResult = await storage.searchContacts(lenientNameFilters, filters, (limit + offset) * 5, 0);
      console.log('🔍 Database search returned:', {
        contactCount: dbResult.contacts.length,
        total: dbResult.total,
        sampleNames: dbResult.contacts.slice(0, 3).map(c => c.firstName + ' ' + c.lastName)
      });

      // Enhance contacts with alias data for better searching
      const contactsWithAliases = await Promise.all(
        dbResult.contacts.map(async (contact) => {
          const aliases = await storage.getContactAliases(contact.id);
          return {
            ...contact,
            aliases: aliases.map(a => a.alias)
          } as Contact & { aliases: string[] };
        })
      );

      dbResult.contacts = contactsWithAliases;

      if (dbResult.contacts.length === 0) {
        return { contacts: [], total: 0 };
      }

      // Setup Fuse.js for fuzzy searching with enhanced typo tolerance and alias support
      const fuse = new Fuse(dbResult.contacts, {
        keys: [
          { name: 'firstName', weight: 0.3 },
          { name: 'middleName', weight: 0.15 },
          { name: 'lastName', weight: 0.3 },
          { name: 'aliases', weight: 0.25 }, // Include aliases in search
        ],
        threshold: 0.3, // More lenient for typos and variations (lower = more matches)
        distance: 100,   // Allow matches farther apart
        minMatchCharLength: 1, // Match single characters for initials
        includeScore: true,
        ignoreLocation: true,
        useExtendedSearch: true, // Enable extended search syntax
        getFn: (obj: any, path: string | string[]) => {
          const pathStr = Array.isArray(path) ? path[0] : path;
          if (pathStr === 'aliases') {
            // Return all aliases as a searchable string
            return obj.aliases ? obj.aliases.join(' ') : '';
          }
          const value = obj[pathStr as keyof Contact];
          if (typeof value === 'string') return value;
          return '';
        },
      });

      const allResults = new Map<string, any>();

      // Generate comprehensive expanded search terms for each name field
      console.log('🔍 About to expand firstName:', nameFilters.firstName);
      // Note: expandedFirstNames, expandedMiddleNames, expandedLastNames already declared above
      console.log('🔍 expandedFirstNames result:', expandedFirstNames);

      console.log('🔍 Expanded search terms:');
      console.log('  expandedFirstNames:', expandedFirstNames);
      console.log('  expandedMiddleNames:', expandedMiddleNames);
      console.log('  expandedLastNames:', expandedLastNames);
      console.log('  dbResult.contacts.length:', dbResult.contacts.length);

      // Search with expanded first names
      expandedFirstNames.forEach(firstName => {
        console.log(`🔍 Searching Fuse.js for: "${firstName}"`);
        const results = fuse.search(firstName);
        console.log(`🔍 Fuse.js results for "${firstName}":`, results.length, 'matches');
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

    // Handle full name search (when user enters multiple parts)
    if (nameFilters.firstName && nameFilters.lastName) {
      // Try searching for full name combinations
      const firstNames = expandNameWithNicknames(nameFilters.firstName);
      const lastNames = expandNameWithNicknames(nameFilters.lastName);

      firstNames.forEach(firstName => {
        lastNames.forEach(lastName => {
          const fullNameQuery = `${firstName} ${lastName}`;

          // Search in a combined fullName field if available, or create one
          const fullNameResults = dbResult.contacts.filter(contact => {
            const contactFullName = `${contact.firstName || ''} ${contact.lastName || ''}`.toLowerCase();
            const queryLower = fullNameQuery.toLowerCase();

            // Check for exact matches first
            if (contactFullName.includes(queryLower)) {
              return true;
            }

            // Check for partial matches with better tolerance
            const nameWords = queryLower.split(/\s+/);
            const contactWords = contactFullName.split(/\s+/);

            return nameWords.every(queryWord =>
              contactWords.some(contactWord =>
                contactWord.includes(queryWord) ||
                queryWord.includes(contactWord) ||
                // Simple edit distance check for typos
                levenshteinDistance(queryWord, contactWord) <= Math.min(2, Math.floor(queryWord.length / 3))
              )
            );
          });

          fullNameResults.forEach(contact => {
            if (!allResults.has(contact.id)) {
              allResults.set(contact.id, {
                item: contact,
                score: 0.1 // High priority for full name matches
              });
            }
          });
        });
      });
    }

    // Search through contact aliases as well
    if (nameFilters.firstName?.trim()) {
      const aliasSearchTerms = [
        ...expandNameWithNicknames(nameFilters.firstName),
        ...generatePhoneticVariations(nameFilters.firstName)
      ];

      dbResult.contacts.forEach(contact => {
        const contactWithAliases = contact as Contact & { aliases?: string[] };
        if (contactWithAliases.aliases && contactWithAliases.aliases.length > 0) {
          const aliasMatches = contactWithAliases.aliases.some((alias: string) => {
            const aliasLower = alias.toLowerCase();
            return aliasSearchTerms.some(searchTerm => {
              return aliasLower.includes(searchTerm.toLowerCase()) ||
                     searchTerm.toLowerCase().includes(aliasLower) ||
                     levenshteinDistance(aliasLower, searchTerm.toLowerCase()) <= 2;
            });
          });

          if (aliasMatches && !allResults.has(contact.id)) {
            allResults.set(contact.id, {
              item: contact,
              score: 0.15 // Good score for alias matches
            });
          }
        }
      });
    }

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

    console.log('🔍 Final results:', {
      totalMatches: allResults.size,
      returnedContacts: contacts.length,
      contactNames: contacts.map(c => `${c.firstName} ${c.lastName}`).slice(0, 5)
    });

    return {
      contacts,
      total: allResults.size
    };
    } catch (error) {
      console.error('🔍 Error in fuzzy search:', error);
      // Fall back to basic search if fuzzy search fails
      return await storage.searchContacts(nameFilters, filters, limit, offset);
    }
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
