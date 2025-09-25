import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import SearchInterface from "@/components/search/SearchInterface";
import ProfileModal from "@/components/profile/ProfileModal";
import UserProfileModal from "@/components/profile/UserProfileModal";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Vote, Search, Settings, LogOut, User as UserIcon } from "lucide-react";
import type { Contact } from "@shared/schema";

export default function Home() {
  const { user, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

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

  return (
    <div className="flex h-screen bg-background">
      {!isMobile && (
        <Sidebar 
          user={user} 
          onAdminClick={() => setShowAdminDashboard(true)}
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
        
        <div className="flex-1 flex flex-col min-h-0">
          <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col h-full w-full">
            {/* Header Section */}
            <div className="mb-6 flex-shrink-0">
              <div className="flex items-center gap-3 mb-2">
                <Search className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">Contact Search</h1>
              </div>
              <p className="text-muted-foreground">
                Search and manage your voter contacts database.
              </p>
            </div>

            <div className="flex-1 min-h-0">
              <SearchInterface onContactSelect={setSelectedContact} />
            </div>
          </div>
        </div>
      </main>

      {selectedContact && (
        <ProfileModal
          contact={selectedContact}
          user={user}
          isOpen={true}
          onClose={() => setSelectedContact(null)}
        />
      )}

      {showUserProfile && (
        <UserProfileModal
          user={user}
          isOpen={true}
          onClose={() => setShowUserProfile(false)}
        />
      )}
      
      {showAdminDashboard && user.role === 'admin' && (
        <AdminDashboard
          isOpen={true}
          onClose={() => setShowAdminDashboard(false)}
          user={user}
        />
      )}

      {/* Mobile Navigation Sheet */}
      <Sheet open={showMobileNav} onOpenChange={setShowMobileNav}>
        <SheetContent side="left" className="w-80 p-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="p-6 border-b border-border">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Vote className="w-4 h-4 text-primary-foreground" />
                </div>
                <SheetTitle className="text-xl font-bold">VoterVault</SheetTitle>
              </div>
            </SheetHeader>
            
            <nav className="flex-1 p-4">
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => setShowMobileNav(false)}
                    className="flex items-center space-x-3 px-3 py-3 rounded-md bg-primary text-primary-foreground w-full text-left"
                    data-testid="link-search-mobile"
                  >
                    <Search className="w-5 h-5" />
                    <span>Search Contacts</span>
                  </button>
                </li>
                
                {user.role === 'admin' && (
                  <li className="pt-4 border-t border-border">
                    <button
                      onClick={() => {
                        setShowAdminDashboard(true);
                        setShowMobileNav(false);
                      }}
                      className="flex items-center space-x-3 px-3 py-3 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full text-left"
                      data-testid="button-admin-tools-mobile"
                    >
                      <Settings className="w-5 h-5" />
                      <span>Admin Tools</span>
                    </button>
                  </li>
                )}
              </ul>
            </nav>
            
            <div className="p-4 border-t border-border">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                  {user.profileImageUrl ? (
                    <img 
                      src={user.profileImageUrl} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" data-testid="text-username-mobile">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user.firstName || user.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid="text-user-role-mobile">
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                onClick={() => {
                  setShowUserProfile(true);
                  setShowMobileNav(false);
                }}
                className="w-full justify-start mb-2 h-11"
                data-testid="button-profile-mobile"
              >
                <UserIcon className="w-4 h-4 mr-2" />View Profile
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => window.location.href = "/api/logout"}
                className="w-full justify-start h-11 text-muted-foreground hover:text-foreground"
                data-testid="button-logout-mobile"
              >
                <LogOut className="w-4 h-4 mr-2" />Sign Out
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
