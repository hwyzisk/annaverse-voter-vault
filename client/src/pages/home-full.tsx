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

export default function HomeFull() {
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

        <div className="flex-1 overflow-hidden px-4 py-6">
          <SearchInterface onContactSelect={setSelectedContact} />
        </div>
      </main>

      {/* Mobile Navigation Sheet */}
      {isMobile && (
        <Sheet open={showMobileNav} onOpenChange={setShowMobileNav}>
          <SheetContent side="left" className="w-[300px] sm:w-[400px]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Vote className="h-5 w-5" />
                AnnaVerse
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  setShowUserProfile(true);
                  setShowMobileNav(false);
                }}
              >
                <UserIcon className="mr-2 h-4 w-4" />
                Profile
              </Button>
              {user.role === 'admin' && (
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    setShowAdminDashboard(true);
                    setShowMobileNav(false);
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Admin Dashboard
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
        user={user}
      />

      {/* Contact Profile Modal */}
      {selectedContact && (
        <ProfileModal
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          user={user}
          isOpen={!!selectedContact}
        />
      )}

      {/* Admin Dashboard */}
      {showAdminDashboard && (
        <AdminDashboard
          isOpen={showAdminDashboard}
          onClose={() => setShowAdminDashboard(false)}
          user={user}
        />
      )}
    </div>
  );
}