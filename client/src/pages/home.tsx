import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import SearchInterface from "@/components/search/SearchInterface";
import ProfileModal from "@/components/profile/ProfileModal";
import UserProfileModal from "@/components/profile/UserProfileModal";
import AdminDashboard from "@/components/admin/AdminDashboard";
import type { Contact } from "@shared/schema";

export default function Home() {
  const { user, isLoading } = useAuth();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

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
      <Sidebar 
        user={user} 
        onAdminClick={() => setShowAdminDashboard(true)}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Header 
          user={user} 
          onProfileClick={() => setShowUserProfile(true)}
          onNotificationClick={() => setShowNotifications(true)}
        />
        
        <div className="flex-1 overflow-auto">
          <SearchInterface onContactSelect={setSelectedContact} />
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
    </div>
  );
}
