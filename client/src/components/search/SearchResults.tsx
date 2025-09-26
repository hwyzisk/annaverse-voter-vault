import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, Mail, AlertTriangle, Search, Eye, Heart } from "lucide-react";
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
  const [networkContacts, setNetworkContacts] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const isMobile = useIsMobile();
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
      if (filters.party && filters.party !== 'all') params.append('party', filters.party);
      if (filters.quickFilters?.includes('supporters')) {
        params.append('supporterStatus', 'confirmed-supporter,likely-supporter');
      }
      
      // Add age range from advanced filters
      if (filters.ageMin && filters.ageMin.toString().trim()) {
        params.append('minAge', filters.ageMin.toString());
      }
      if (filters.ageMax && filters.ageMax.toString().trim()) {
        params.append('maxAge', filters.ageMax.toString());
      }

      const response = await fetch(`/api/contacts/search?${params}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
  });

  // Fetch user's network contacts when component mounts
  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'editor')) {
      fetchNetworkContacts();
    }
  }, [user]);

  const fetchNetworkContacts = async () => {
    try {
      const response = await fetch('/api/networks', {
        credentials: 'include',
      });
      if (response.ok) {
        const networks = await response.json();
        const contactIds = new Set<string>();
        networks.forEach((network: any) => {
          if (network.contactId) {
            contactIds.add(network.contactId);
          }
        });
        setNetworkContacts(contactIds);
      }
    } catch (error) {
      console.error('Error fetching network contacts:', error);
    }
  };

  const isInNetwork = (contactId: string) => {
    return networkContacts.has(contactId);
  };

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
      case 'confirmed-supporter':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'likely-supporter':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'opposition':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const formatSupporterStatus = (status: string) => {
    switch (status) {
      case 'confirmed-supporter':
        return 'Confirmed Supporter';
      case 'likely-supporter':
        return 'Likely Supporter';
      case 'opposition':
        return 'Opposition';
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
    <Card
      className="min-h-[60vh]"
      style={{
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        border: '3px solid red' /* DEBUG */
      }}
    >
      <div className="px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Search Results</h3>
          <span className="text-sm text-muted-foreground" data-testid="text-results-count">
            Found {total} contacts
          </span>
        </div>
      </div>

      {contacts.length === 0 ? (
        <CardContent className="p-6 text-center text-muted-foreground flex-1 flex flex-col items-center justify-center">
          <Search className="w-16 h-16 mb-4 opacity-50" />
          <p>No contacts found matching your search criteria.</p>
          <p className="text-sm mt-2">Try adjusting your search terms or filters.</p>
        </CardContent>
      ) : (
        <>
          {/* Desktop Table View */}
          {!isMobile ? (
            <div
              style={{
                flex: '1',
                overflow: 'auto',
                minHeight: '0',
                backgroundColor: '#f0f8ff' /* DEBUG */
              }}
            >
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0 z-10">
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
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium flex items-center gap-2" data-testid={`text-name-${contact.id}`}>
                              {contact.fullName}
                              {user && (user.role === 'admin' || user.role === 'editor') && isInNetwork(contact.id) && (
                                <Heart className="w-4 h-4 text-red-500 fill-current" />
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              ID: {contact.systemId}
                            </p>
                          </div>
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
                          {/* Phone Icon - 3-color system */}
                          {(contact as any).manualPhoneCount > 0 ? (
                            <Phone className="w-3 h-3 text-green-600" data-testid={`icon-phone-volunteer-${contact.id}`} />
                          ) : (contact as any).baselinePhoneCount > 0 ? (
                            <Phone className="w-3 h-3 text-black dark:text-white" data-testid={`icon-phone-public-${contact.id}`} />
                          ) : (
                            <Phone className="w-3 h-3 text-gray-300" data-testid={`icon-phone-none-${contact.id}`} />
                          )}
                          {/* Email Icon - 3-color system */}
                          {(contact as any).manualEmailCount > 0 ? (
                            <Mail className="w-3 h-3 text-green-600" data-testid={`icon-email-volunteer-${contact.id}`} />
                          ) : (contact as any).baselineEmailCount > 0 ? (
                            <Mail className="w-3 h-3 text-black dark:text-white" data-testid={`icon-email-public-${contact.id}`} />
                          ) : (
                            <Mail className="w-3 h-3 text-gray-300" data-testid={`icon-email-none-${contact.id}`} />
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
          ) : (
            /* Mobile List View */
            <div
              style={{
                flex: '1',
                overflow: 'auto',
                minHeight: '0',
                backgroundColor: '#f0f8ff' /* DEBUG */
              }}
            >
              <div className="divide-y divide-border">
                {contacts.map((contact: Contact) => (
                <div key={contact.id} className="p-4" data-testid={`card-contact-${contact.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Name and ID */}
                      <div className="mb-2">
                        <h4 className="font-medium text-base truncate flex items-center gap-2" data-testid={`text-name-${contact.id}`}>
                          {contact.fullName}
                          {user && (user.role === 'admin' || user.role === 'editor') && isInNetwork(contact.id) && (
                            <Heart className="w-4 h-4 text-red-500 fill-current flex-shrink-0" />
                          )}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          ID: {contact.systemId}
                        </p>
                      </div>
                      
                      {/* Status and Party Badges */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge 
                          className={getSupporterStatusColor(contact.supporterStatus || 'unknown')}
                          data-testid={`badge-status-${contact.id}`}
                        >
                          {formatSupporterStatus(contact.supporterStatus || 'unknown')}
                        </Badge>
                        <Badge variant="outline" className={`${getPartyColor(contact.party)} border-current`}>
                          {formatParty(contact.party)}
                        </Badge>
                      </div>
                      
                      {/* Location, Age, Contact Icons */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span data-testid={`text-age-${contact.id}`}>
                          Age: {calculateAge(contact.dateOfBirth) || 'N/A'}
                        </span>
                        <span>
                          {contact.city || 'N/A'}, {contact.zipCode || 'N/A'}
                        </span>
                        <div className="flex items-center gap-1">
                          {/* Phone Icon - 3-color system */}
                          {(contact as any).manualPhoneCount > 0 ? (
                            <Phone className="w-3 h-3 text-green-600" data-testid={`icon-phone-volunteer-${contact.id}`} />
                          ) : (contact as any).baselinePhoneCount > 0 ? (
                            <Phone className="w-3 h-3 text-black dark:text-white" data-testid={`icon-phone-public-${contact.id}`} />
                          ) : (
                            <Phone className="w-3 h-3 text-gray-300" data-testid={`icon-phone-none-${contact.id}`} />
                          )}
                          {/* Email Icon - 3-color system */}
                          {(contact as any).manualEmailCount > 0 ? (
                            <Mail className="w-3 h-3 text-green-600" data-testid={`icon-email-volunteer-${contact.id}`} />
                          ) : (contact as any).baselineEmailCount > 0 ? (
                            <Mail className="w-3 h-3 text-black dark:text-white" data-testid={`icon-email-public-${contact.id}`} />
                          ) : (
                            <Mail className="w-3 h-3 text-gray-300" data-testid={`icon-email-none-${contact.id}`} />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* View Button */}
                    <Button
                      onClick={() => onContactSelect(contact)}
                      size="default"
                      className="h-11 px-4 shrink-0"
                      data-testid={`button-view-${contact.id}`}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>
                ))}
              </div>
            </div>
          )}

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-border flex-shrink-0">
            <div className={`${isMobile ? 'flex flex-col space-y-3' : 'flex items-center justify-between'}`}>
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{((currentPage - 1) * limit) + 1}-{Math.min(currentPage * limit, total)}</span> of <span className="font-medium">{total}</span> results
              </p>
              <div className={`flex items-center ${isMobile ? 'justify-center' : ''} gap-2`}>
                <Button
                  variant="outline"
                  size={isMobile ? "default" : "sm"}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={isMobile ? "h-11 px-4" : ""}
                  data-testid="button-previous"
                >
                  Previous
                </Button>
                
                {!isMobile && Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                
                {/* Mobile: Show current page info */}
                {isMobile && (
                  <span className="px-4 py-2 text-sm font-medium text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                )}
                
                {!isMobile && totalPages > 5 && (
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
                  size={isMobile ? "default" : "sm"}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={isMobile ? "h-11 px-4" : ""}
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
