import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import UserProfileModal from "@/components/profile/UserProfileModal";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Phone,
  Mail,
  Vote,
  UserCheck,
  Target,
  TrendingUp,
  Heart,
  ChevronDown,
  ChevronUp,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ImpactData {
  totalActiveVoters: number;
  goals: { name: string; current: number; target: number }[];
  confirmedSupporters: {
    total: number;
    byParty: { party: string; count: number; percentage: number }[];
    byAge: { ageRange: string; count: number; percentage: number }[];
  };
  confirmedVolunteers: number;
  phoneNumbersAdded: number;
  emailAddressesAdded: number;
  activeVolunteers: number;
}

export default function OurImpact() {
  const { user, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [expandedBreakdowns, setExpandedBreakdowns] = useState<Set<string>>(new Set());

  const { data: impactData, isLoading: dataLoading, error } = useQuery({
    queryKey: ['/api/impact/stats'],
    queryFn: async (): Promise<ImpactData> => {
      const response = await fetch('/api/impact/stats', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch impact data');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  const toggleBreakdown = (key: string) => {
    const newExpanded = new Set(expandedBreakdowns);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedBreakdowns(newExpanded);
  };

  const getPartyColor = (party: string) => {
    switch (party.toLowerCase()) {
      case 'dem':
      case 'democratic':
        return 'bg-blue-500';
      case 'rep':
      case 'republican':
        return 'bg-red-500';
      case 'ind':
      case 'independent':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
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
          onAdminClick={() => setShowAdminDashboard(true)}
        />
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          onProfileClick={() => setShowUserProfile(true)}
          onNotificationClick={() => {}}
          onMobileMenuClick={() => setShowMobileNav(true)}
          showMobileMenu={isMobile}
        />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <TrendingUp className="h-10 w-10 text-primary" />
                <h1 className="text-4xl font-bold">Our Impact</h1>
              </div>
              <p className="text-muted-foreground text-lg mb-6">
                Tracking our collective progress and campaign momentum
              </p>

              {/* Total Registered Voters Hero Metric */}
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-8 mb-8">
                {dataLoading ? (
                  <Skeleton className="h-16 w-48 mx-auto" />
                ) : (
                  <div className="text-6xl font-bold text-primary">
                    {impactData?.totalActiveVoters?.toLocaleString() || 0}
                  </div>
                )}
                <div className="text-sm font-medium text-muted-foreground mt-2">Total Registered Voters</div>
              </div>
            </div>

            {/* Campaign Goals Section */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Campaign Goals</h2>
              </div>

              {/* Top Row - 2 cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Confirmed Supporters with dropdowns */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Vote className="h-5 w-5 text-primary" />
                      Confirmed Supporters
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="text-3xl font-bold">
                          {impactData?.confirmedSupporters?.total?.toLocaleString() || 0}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">500 goal</div>
                          <div className="text-xs text-muted-foreground">
                            {impactData?.confirmedSupporters?.total ?
                              Math.min((impactData.confirmedSupporters.total / 500) * 100, 100).toFixed(1) : 0}% Complete
                          </div>
                        </div>
                      </div>

                      <Progress
                        value={impactData?.confirmedSupporters?.total ?
                          Math.min((impactData.confirmedSupporters.total / 500) * 100, 100) : 0}
                        className="h-2"
                      />

                      {/* Party Breakdown */}
                      <Collapsible
                        open={expandedBreakdowns.has('supporters-party')}
                        onOpenChange={() => toggleBreakdown('supporters-party')}
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between p-0 h-auto mb-2">
                            <span className="text-sm font-medium">By Party</span>
                            {expandedBreakdowns.has('supporters-party') ?
                              <ChevronUp className="h-4 w-4" /> :
                              <ChevronDown className="h-4 w-4" />
                            }
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 mb-4">
                          {impactData?.confirmedSupporters?.byParty?.map((party) => (
                            <div key={party.party} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>{party.party}</span>
                                <span>{party.count} ({party.percentage.toFixed(1)}%)</span>
                              </div>
                              <div className="w-full bg-secondary rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${getPartyColor(party.party)}`}
                                  style={{ width: `${party.percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Age Breakdown */}
                      <Collapsible
                        open={expandedBreakdowns.has('supporters-age')}
                        onOpenChange={() => toggleBreakdown('supporters-age')}
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                            <span className="text-sm font-medium">By Age</span>
                            {expandedBreakdowns.has('supporters-age') ?
                              <ChevronUp className="h-4 w-4" /> :
                              <ChevronDown className="h-4 w-4" />
                            }
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 mt-2">
                          {impactData?.confirmedSupporters?.byAge?.map((age) => (
                            <div key={age.ageRange} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>{age.ageRange}</span>
                                <span>{age.count} ({age.percentage.toFixed(1)}%)</span>
                              </div>
                              <div className="w-full bg-secondary rounded-full h-2">
                                <div
                                  className="h-2 rounded-full bg-primary"
                                  style={{ width: `${age.percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </CardContent>
                </Card>

                {/* Confirmed Volunteers with dropdowns */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-primary" />
                      Confirmed Volunteers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="text-3xl font-bold">
                          {impactData?.confirmedVolunteers?.toLocaleString() || 0}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">100 goal</div>
                          <div className="text-xs text-muted-foreground">
                            {impactData?.confirmedVolunteers ?
                              Math.min((impactData.confirmedVolunteers / 100) * 100, 100).toFixed(1) : 0}% Complete
                          </div>
                        </div>
                      </div>

                      <Progress
                        value={impactData?.confirmedVolunteers ?
                          Math.min((impactData.confirmedVolunteers / 100) * 100, 100) : 0}
                        className="h-2"
                      />

                      {/* Party Breakdown - using same data structure for volunteers */}
                      <Collapsible
                        open={expandedBreakdowns.has('volunteers-party')}
                        onOpenChange={() => toggleBreakdown('volunteers-party')}
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between p-0 h-auto mb-2">
                            <span className="text-sm font-medium">By Party</span>
                            {expandedBreakdowns.has('volunteers-party') ?
                              <ChevronUp className="h-4 w-4" /> :
                              <ChevronDown className="h-4 w-4" />
                            }
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 mb-4">
                          {impactData?.confirmedSupporters?.byParty?.map((party) => (
                            <div key={party.party} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>{party.party}</span>
                                <span>{Math.round(party.count * 0.2)} ({party.percentage.toFixed(1)}%)</span>
                              </div>
                              <div className="w-full bg-secondary rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${getPartyColor(party.party)}`}
                                  style={{ width: `${party.percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Age Breakdown - using same data structure for volunteers */}
                      <Collapsible
                        open={expandedBreakdowns.has('volunteers-age')}
                        onOpenChange={() => toggleBreakdown('volunteers-age')}
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                            <span className="text-sm font-medium">By Age</span>
                            {expandedBreakdowns.has('volunteers-age') ?
                              <ChevronUp className="h-4 w-4" /> :
                              <ChevronDown className="h-4 w-4" />
                            }
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 mt-2">
                          {impactData?.confirmedSupporters?.byAge?.map((age) => (
                            <div key={age.ageRange} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>{age.ageRange}</span>
                                <span>{Math.round(age.count * 0.2)} ({age.percentage.toFixed(1)}%)</span>
                              </div>
                              <div className="w-full bg-secondary rounded-full h-2">
                                <div
                                  className="h-2 rounded-full bg-primary"
                                  style={{ width: `${age.percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bottom Row - 3 cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Phone Numbers Added */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-green-600" />
                      Phone Numbers Added
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="text-3xl font-bold">
                          {impactData?.phoneNumbersAdded?.toLocaleString() || 0}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">500 goal</div>
                          <div className="text-xs text-muted-foreground">
                            {impactData?.phoneNumbersAdded ?
                              Math.min((impactData.phoneNumbersAdded / 500) * 100, 100).toFixed(1) : 0}% Complete
                          </div>
                        </div>
                      </div>
                      <Progress
                        value={impactData?.phoneNumbersAdded ?
                          Math.min((impactData.phoneNumbersAdded / 500) * 100, 100) : 0}
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Email Addresses Added */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-blue-600" />
                      Email Addresses Added
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="text-3xl font-bold">
                          {impactData?.emailAddressesAdded?.toLocaleString() || 0}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">250 goal</div>
                          <div className="text-xs text-muted-foreground">
                            {impactData?.emailAddressesAdded ?
                              Math.min((impactData.emailAddressesAdded / 250) * 100, 100).toFixed(1) : 0}% Complete
                          </div>
                        </div>
                      </div>
                      <Progress
                        value={impactData?.emailAddressesAdded ?
                          Math.min((impactData.emailAddressesAdded / 250) * 100, 100) : 0}
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Volunteers with Network Contacts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-600" />
                      Volunteers with Network Contacts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="text-3xl font-bold">
                          {impactData?.activeVolunteers?.toLocaleString() || 0}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">50 goal</div>
                          <div className="text-xs text-muted-foreground">
                            {impactData?.activeVolunteers ?
                              Math.min((impactData.activeVolunteers / 50) * 100, 100).toFixed(1) : 0}% Complete
                          </div>
                        </div>
                      </div>
                      <Progress
                        value={impactData?.activeVolunteers ?
                          Math.min((impactData.activeVolunteers / 50) * 100, 100) : 0}
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {dataLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-24 mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-destructive mb-4">Failed to load impact data</div>
                <p className="text-muted-foreground">Please try refreshing the page</p>
              </div>
            ) : null}
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