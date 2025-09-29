import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import UserProfileModal from "@/components/profile/UserProfileModal";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Users,
  Target,
  CheckCircle,
  ChevronDown,
  Heart,
  Megaphone
} from "lucide-react";

export default function VolunteerMessagingGuidance() {
  const { user, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
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
          onNotificationClick={() => {}}
          onMobileMenuClick={() => setShowMobileNav(true)}
          showMobileMenu={isMobile}
        />

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Volunteer Messaging Guidance</h1>
                  <p className="text-lg text-muted-foreground leading-relaxed mt-2">
                    Talking points and guidance for sharing Anna's campaign.
                  </p>
                </div>
              </div>
              <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                <CardContent className="p-6">
                  <p className="text-blue-800 dark:text-blue-200 leading-relaxed">
                    This page is designed to give you clear talking points when discussing Anna's campaign with your friends, family, neighbors, and networks. Every conversation matters, and the way we frame Anna's story and values will help build trust and inspire action. Use these tips as a guide, but always speak from the heart.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Accordions */}
            <div className="space-y-6">
              {/* Tailoring the Message */}
              <Card className="shadow-md">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 rounded-t-lg">
                  <CardTitle className="text-xl font-bold flex items-center gap-3">
                    <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
                    Tailoring the Message to Your Audience
                  </CardTitle>
                  <CardDescription className="text-green-700 dark:text-green-300 leading-relaxed">
                    Different voters care about different things. Below are key themes to highlight depending on who you're speaking with.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Accordion type="multiple" className="w-full">
                    <AccordionItem value="older-republicans" className="border-b">
                      <AccordionTrigger className="px-6 py-4 hover:bg-red-50 dark:hover:bg-red-950/30">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                            Older Republicans
                          </Badge>
                          <span className="text-left">Focus on Anna's experience and leadership</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <ul className="space-y-3 text-muted-foreground leading-relaxed">
                          <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Earned a doctorate degree in public policy.</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Served 7 years as a State Representative, shaping legislation that impacted everyday Floridians.</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Founded and led a nonprofit for 5 years, proving her ability to manage budgets, people, and results.</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Trusted voice on fiscal responsibility and local business growth, with a track record of practical solutions over partisanship.</span>
                          </li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="progressive-voters" className="border-b">
                      <AccordionTrigger className="px-6 py-4 hover:bg-blue-50 dark:hover:bg-blue-950/30">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            Progressive Voters
                          </Badge>
                          <span className="text-left">Highlight Anna's values and vision for the future</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <ul className="space-y-3 text-muted-foreground leading-relaxed">
                          <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Believes everyone deserves a roof over their head at night, no exceptions.</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Champions a culture of volunteerism, ensuring neighbors help neighbors.</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Dedicated to expanding access to arts and culture for all communities, not just the privileged few.</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Advocates for equity and inclusivity, pushing for policies that reflect compassion and fairness.</span>
                          </li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="independents">
                      <AccordionTrigger className="px-6 py-4 hover:bg-purple-50 dark:hover:bg-purple-950/30">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                            Independents & NPA Voters
                          </Badge>
                          <span className="text-left">Point to Anna's actions and results</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <ul className="space-y-3 text-muted-foreground leading-relaxed">
                          <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Stood up to OUC when they attempted to roll back solar programs, protecting homeowners' rights and renewable energy progress.</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Personally helped over 40,000 Floridians navigate the broken unemployment system during COVID, stepping in where the state fell short.</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Donated her entire legislative salary for more than two years to help families facing eviction—putting people over politics.</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Believes in results-driven leadership that cuts through red tape and gets things done.</span>
                          </li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              {/* Responding to Pushbacks */}
              <Card className="shadow-md">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/50 rounded-t-lg">
                  <CardTitle className="text-xl font-bold flex items-center gap-3">
                    <Users className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    Responding to Common Pushbacks
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Accordion type="multiple" className="w-full">
                    <AccordionItem value="voting-doesnt-matter" className="border-b">
                      <AccordionTrigger className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                            "Voting Doesn't Matter"
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <ul className="space-y-3 text-muted-foreground leading-relaxed">
                          <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>The last mayoral race had just 22% turnout—meaning less than a quarter of the city decided the outcome.</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>In off-cycle elections like the upcoming 2027 Orlando mayoral race, your vote has an outsized impact.</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Every conversation you have could mean the difference between apathy and action.</span>
                          </li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="anna-too-liberal">
                      <AccordionTrigger className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                            "Anna is Too Liberal"
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <ul className="space-y-3 text-muted-foreground leading-relaxed">
                          <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Anna has a proven record of supporting small businesses and entrepreneurs.</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Served on the State Legislative Appropriations Committee, ensuring taxpayer dollars were used responsibly.</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Worked across the aisle with Governor DeSantis to secure a diaper tax exemption for new moms—a practical, bipartisan win that put families first.</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>She is solutions-oriented, not ideological, and focuses on policies that help Floridians thrive.</span>
                          </li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              {/* Additional Tips */}
              <Card className="shadow-md">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 rounded-t-lg">
                  <CardTitle className="text-xl font-bold flex items-center gap-3">
                    <Megaphone className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    Additional Tips for Conversations
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ul className="space-y-4 text-muted-foreground leading-relaxed">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-foreground">Lead with listening.</span>
                        <span className="ml-1">Ask people what issues matter most to them—housing, jobs, safety, schools—and then connect those issues to Anna's record.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-foreground">Stay positive.</span>
                        <span className="ml-1">Don't get bogged down in negativity about other candidates; focus on Anna's strengths.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-foreground">Use real stories.</span>
                        <span className="ml-1">Share personal anecdotes about how Anna's work has made a difference in people's lives.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-foreground">Make it local.</span>
                        <span className="ml-1">Frame every issue—housing, culture, small business, volunteerism—in terms of how it affects the community right here at home.</span>
                      </div>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Call to Action */}
              <Card className="shadow-lg border-2 border-blue-200 dark:border-blue-800">
                <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                  <CardTitle className="text-xl font-bold flex items-center gap-3">
                    <Heart className="h-6 w-6" />
                    Call to Action
                  </CardTitle>
                  <CardDescription className="text-blue-100">
                    End each conversation with a simple ask:
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 bg-blue-50 dark:bg-blue-950/30">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-blue-200 dark:border-blue-700">
                      <div className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-2">
                        "Can I count on you to support Anna?"
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-blue-200 dark:border-blue-700">
                      <div className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-2">
                        "Will you remind 3 friends to vote?"
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-blue-200 dark:border-blue-700">
                      <div className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-2">
                        "Would you like to get involved and volunteer with us?"
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 text-center">
                    <p className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                      Every connection builds momentum. Together, we grow the Annaverse.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
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