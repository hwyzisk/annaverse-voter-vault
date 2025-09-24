import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import ProfileModal from "@/components/profile/ProfileModal";
import UserProfileModal from "@/components/profile/UserProfileModal";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Vote,
  Search,
  Settings,
  LogOut,
  User as UserIcon,
  Heart,
  HeartOff,
  Users,
  UserCheck,
  Trash2
} from "lucide-react";
import type { Contact, UserNetwork } from "@shared/schema";

interface NetworkContact extends UserNetwork {
  contact: Contact;
}

export default function Network() {
  const { user, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  // Network-specific state
  const [networkContacts, setNetworkContacts] = useState<NetworkContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<NetworkContact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch user's network
  useEffect(() => {
    if (user) {
      fetchNetworkContacts();
    }
  }, [user]);

  // Filter contacts based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredContacts(networkContacts);
    } else {
      const filtered = networkContacts.filter(network => {
        const contact = network.contact;
        const query = searchQuery.toLowerCase();
        return (
          contact.fullName?.toLowerCase().includes(query) ||
          contact.firstName?.toLowerCase().includes(query) ||
          contact.lastName?.toLowerCase().includes(query) ||
          contact.city?.toLowerCase().includes(query) ||
          contact.party?.toLowerCase().includes(query)
        );
      });
      setFilteredContacts(filtered);
    }
  }, [searchQuery, networkContacts]);

  const fetchNetworkContacts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/networks', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setNetworkContacts(data);
      }
    } catch (error) {
      console.error('Failed to fetch network contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromNetwork = async (networkId: string) => {
    try {
      const response = await fetch(`/api/networks/${networkId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await fetchNetworkContacts(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to remove contact from network:', error);
    }
  };

  const getPartyBadge = (party?: string | null) => {
    if (!party) return null;

    const partyColors = {
      'DEM': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'REP': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      'NPA': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
      'IND': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'GRE': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'LIB': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    };

    const upperParty = party.toUpperCase();
    const colorClass = partyColors[upperParty as keyof typeof partyColors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';

    return (
      <Badge className={colorClass}>
        {party}
      </Badge>
    );
  };

  const calculateAge = (dateOfBirth?: string | null) => {
    if (!dateOfBirth) return null;

    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Only allow admin and editor roles
  if (user.role === 'viewer') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center">
          <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
          <p className="text-muted-foreground">My Network is available for Admin and Editor users only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {!isMobile && (
        <Sidebar
          user={user}
          onAdminClick={() => {
            console.log('Admin button clicked on network page');
            setShowAdminDashboard(true);
          }}
        />
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          onProfileClick={() => setShowUserProfile(true)}
          onNotificationClick={() => setShowNotifications(true)}
          onMobileMenuClick={() => setShowMobileNav(true)}
          showMobileMenu={isMobile}
        />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Heart className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">My Network</h1>
              </div>
              <p className="text-muted-foreground">
                Your personal collection of contacts - make sure they get to the polls!
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{networkContacts.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Confirmed Supporters</CardTitle>
                  <Vote className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {networkContacts.filter(n => n.contact.supporterStatus === 'confirmed-supporter').length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Confirmed Volunteers</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {networkContacts.filter(n => n.contact.volunteerStatus === 'confirmed').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search your network contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Contact List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading your network...</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {searchQuery ? 'No matching contacts' : 'Your network is empty'}
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? 'Try adjusting your search terms.'
                    : 'Add contacts to your network by clicking the heart icon on contact profiles.'
                  }
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredContacts.map((network) => (
                  <Card key={network.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <CardTitle
                              className="text-lg hover:text-primary cursor-pointer"
                              onClick={() => setSelectedContact(network.contact)}
                            >
                              {network.contact.fullName}
                            </CardTitle>
                            {getPartyBadge(network.contact.party)}
                          </div>

                          <div className="text-sm text-muted-foreground">
                            {calculateAge(network.contact.dateOfBirth) && (
                              <span>Age: {calculateAge(network.contact.dateOfBirth)}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromNetwork(network.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <HeartOff className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        {selectedContact && (
          <ProfileModal
            contact={selectedContact}
            open={!!selectedContact}
            onOpenChange={() => setSelectedContact(null)}
          />
        )}

        {showUserProfile && (
          <UserProfileModal
            user={user}
            open={showUserProfile}
            onOpenChange={setShowUserProfile}
          />
        )}

        {showAdminDashboard && (
          <AdminDashboard
            open={showAdminDashboard}
            onOpenChange={setShowAdminDashboard}
          />
        )}

        {/* Mobile Navigation */}
        {isMobile && (
          <Sheet open={showMobileNav} onOpenChange={setShowMobileNav}>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="p-6 border-b">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <Sidebar
                user={user}
                onAdminClick={() => {
                  setShowAdminDashboard(true);
                  setShowMobileNav(false);
                }}
                mobile={true}
              />
            </SheetContent>
          </Sheet>
        )}
      </main>
    </div>
  );
}