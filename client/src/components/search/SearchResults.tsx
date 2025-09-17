import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, Mail, AlertTriangle, Search } from "lucide-react";
import { getPartyColor, formatParty } from "@/lib/utils";
import type { Contact } from "@shared/schema";

interface SearchResultsProps {
  nameSearch: {
    firstName: string;
    middleName: string;
    lastName: string;
  };
  filters: any;
  onContactSelect: (contact: Contact) => void;
}

export default function SearchResults({ nameSearch, filters, onContactSelect }: SearchResultsProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/contacts/search', nameSearch, filters, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      });

      // Add name search parameters - ensure we check for valid string values
      if (nameSearch.firstName && nameSearch.firstName.trim().length > 0) {
        params.append('firstName', nameSearch.firstName.trim());
      }
      if (nameSearch.middleName && nameSearch.middleName.trim().length > 0) {
        params.append('middleName', nameSearch.middleName.trim());
      }
      if (nameSearch.lastName && nameSearch.lastName.trim().length > 0) {
        params.append('lastName', nameSearch.lastName.trim());
      }

      // Add filter parameters
      if (filters.city) params.append('city', filters.city);
      if (filters.zipCode) params.append('zipCode', filters.zipCode);
      if (filters.party) params.append('party', filters.party);
      if (filters.quickFilters?.includes('supporters')) {
        params.append('supporterStatus', 'supporter');
      }
      if (filters.quickFilters?.includes('missing-phone')) {
        params.append('missingPhone', 'true');
      }
      if (filters.quickFilters?.includes('has-email')) {
        params.append('hasEmail', 'true');
      }
      if (filters.quickFilters?.includes('age-18-25')) {
        params.append('minAge', '18');
        params.append('maxAge', '25');
      }

      const response = await fetch(`/api/contacts/search?${params}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
  });

  const calculateAge = (dateOfBirth: string | null) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getSupporterStatusColor = (status: string) => {
    switch (status) {
      case 'supporter':
        return 'bg-green-100 text-green-800';
      case 'non-supporter':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatSupporterStatus = (status: string) => {
    switch (status) {
      case 'supporter':
        return 'Supporter';
      case 'non-supporter':
        return 'Non-Supporter';
      default:
        return 'Unknown';
    }
  };

  const totalPages = Math.ceil((data?.total || 0) / limit);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            <AlertTriangle className="w-8 h-8 mb-2" />
            <p>Search failed. Please try again.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const contacts = data?.contacts || [];
  const total = data?.total || 0;

  return (
    <Card>
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Search Results</h3>
          <span className="text-sm text-muted-foreground" data-testid="text-results-count">
            Found {total} contacts
          </span>
        </div>
      </div>
      
      {contacts.length === 0 ? (
        <CardContent className="p-6 text-center text-muted-foreground">
          <Search className="w-16 h-16 mb-4 opacity-50" />
          <p>No contacts found matching your search criteria.</p>
          <p className="text-sm mt-2">Try adjusting your search terms or filters.</p>
        </CardContent>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Age</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Location</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Party</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Contact</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Last Updated</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contacts.map((contact: Contact) => (
                  <tr
                    key={contact.id}
                    className="hover:bg-muted/25 cursor-pointer"
                    onClick={() => onContactSelect(contact)}
                    data-testid={`row-contact-${contact.id}`}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium" data-testid={`text-name-${contact.id}`}>
                          {contact.fullName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ID: {contact.systemId}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm" data-testid={`text-age-${contact.id}`}>
                      {calculateAge(contact.dateOfBirth) || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm">{contact.city || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">{contact.zipCode || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4" data-testid={`text-party-${contact.id}`}>
                      <span className={`text-sm font-medium ${getPartyColor(contact.party)}`}>
                        {formatParty(contact.party)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {(contact as any).phoneCount > 0 ? (
                          <Phone className="w-3 h-3 text-green-600" />
                        ) : (
                          <Phone className="w-3 h-3 text-gray-300" />
                        )}
                        {(contact as any).emailCount > 0 ? (
                          <Mail className="w-3 h-3 text-blue-600" />
                        ) : (
                          <Mail className="w-3 h-3 text-gray-300" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {contact.updatedAt ? new Date(contact.updatedAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        className={getSupporterStatusColor(contact.supporterStatus || 'unknown')}
                        data-testid={`badge-status-${contact.id}`}
                      >
                        {formatSupporterStatus(contact.supporterStatus || 'unknown')}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-4 border-t border-border">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{((currentPage - 1) * limit) + 1}-{Math.min(currentPage * limit, total)}</span> of <span className="font-medium">{total}</span> results
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-previous"
                >
                  Previous
                </Button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      data-testid={`button-page-${pageNum}`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                
                {totalPages > 5 && (
                  <>
                    <span className="px-2 text-muted-foreground">...</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      data-testid={`button-page-${totalPages}`}
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="button-next"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
