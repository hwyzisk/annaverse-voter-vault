import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Party color coding utility
export function getPartyColor(party: string | null | undefined): string {
  if (!party) return '';
  
  const partyUpper = party.toUpperCase().trim();
  
  switch (partyUpper) {
    case 'DEM':
      return 'text-blue-600';
    case 'REP':
      return 'text-red-600';
    default:
      return ''; // Default text color
  }
}

// Party display formatting utility
export function formatParty(party: string | null | undefined): string {
  if (!party) return 'N/A';
  return party.toUpperCase();
}
