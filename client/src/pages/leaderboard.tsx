import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import UserProfileModal from "@/components/profile/UserProfileModal";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Users,
  Phone,
  Mail,
  Vote,
  UserCheck,
  TrendingUp,
  Award,
  Star
} from "lucide-react";

interface LeaderboardStats {
  totalActiveVoters: number;
  contactsWithNewInfo: number;
  confirmedSupporters: number;
  confirmedVolunteers: number;
  phoneNumberPercentage: number;
  emailAddressPercentage: number;
  topContributors: {
    id: string;
    name: string;
    enrichedCount: number;
  }[];
  risingStars: {
    id: string;
    name: string;
    enrichedCount: number;
  }[];
}

export default function Leaderboard() {
  const { user, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch leaderboard stats
  useEffect(() => {
    if (user) {
      fetchLeaderboardStats();
    }
  }, [user]);

  const fetchLeaderboardStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/leaderboard/stats', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard stats:', error);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="flex h-screen bg-background">
      {!isMobile && (
        <Sidebar
          user={user}
          onAdminClick={() => {
            console.log('Admin button clicked on leaderboard page');
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
                <Trophy className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">Leaderboard</h1>
              </div>
              <p className="text-muted-foreground">
                Track progress and celebrate our top contributors!
              </p>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading leaderboard...</p>
              </div>
            ) : (
              <>
                {/* KPI Cards - Top Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Active Voters</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.totalActiveVoters?.toLocaleString() || '0'}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Contacts with New Info</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.contactsWithNewInfo?.toLocaleString() || '0'}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Confirmed Supporters</CardTitle>
                      <Vote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.confirmedSupporters?.toLocaleString() || '0'}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Confirmed Volunteers</CardTitle>
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.confirmedVolunteers?.toLocaleString() || '0'}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* KPI Cards - Second Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Contacts with Phone Numbers</CardTitle>
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.phoneNumberPercentage?.toFixed(1) || 0}%</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        volunteer-added phone numbers
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Contacts with Email Addresses</CardTitle>
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.emailAddressPercentage?.toFixed(1) || 0}%</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        volunteer-added email addresses
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Leaderboards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Contributors */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-primary" />
                        <CardTitle className="text-xl">Top 3 Contributors</CardTitle>
                      </div>
                      <CardDescription>All-time leaders in profile enrichment</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {stats?.topContributors?.length ? (
                          stats.topContributors.slice(0, 3).map((contributor, index) => (
                            <div key={contributor.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                              <div className="flex-shrink-0">
                                {index === 0 && <Trophy className="h-5 w-5 text-yellow-500" />}
                                {index === 1 && <Award className="h-5 w-5 text-gray-400" />}
                                {index === 2 && <Award className="h-5 w-5 text-amber-600" />}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{contributor.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {contributor.enrichedCount.toLocaleString()} profiles enriched
                                </p>
                              </div>
                              <Badge variant="secondary">#{index + 1}</Badge>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-center py-4">
                            No contributors yet
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Rising Stars */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-primary" />
                        <CardTitle className="text-xl">Rising Stars</CardTitle>
                      </div>
                      <CardDescription>Top contributors in the last 7 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {stats?.risingStars?.length ? (
                          stats.risingStars.slice(0, 3).map((star, index) => (
                            <div key={star.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                              <div className="flex-shrink-0">
                                <Star className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{star.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {star.enrichedCount.toLocaleString()} profiles enriched this week
                                </p>
                              </div>
                              <Badge variant="secondary">#{index + 1}</Badge>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-center py-4">
                            No activity this week
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Modals */}
        {showUserProfile && (
          <UserProfileModal
            user={user}
            open={showUserProfile}
            onOpenChange={setShowUserProfile}
          />
        )}

        {showAdminDashboard && user.role === 'admin' && (
          <AdminDashboard
            isOpen={showAdminDashboard}
            onClose={() => setShowAdminDashboard(false)}
            user={user}
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
