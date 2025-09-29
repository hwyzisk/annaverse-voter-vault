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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Share2,
  Copy,
  Mail,
  MessageSquare,
  Facebook,
  Twitter,
  Phone,
  Send,
  Check,
  ExternalLink
} from "lucide-react";

const CAMPAIGN_URL = "https://www.annafororlando.com";

export default function ShareAnnaPage() {
  const { user, isLoading } = useAuth();
  const isMobile = useIsMobile();
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [copiedStates, setCopiedStates] = useState<{[key: string]: boolean}>({});
  const { toast } = useToast();

  const prewrittenTexts = [
    {
      id: "text1",
      title: "Text Option 1",
      content: "Hey! I just started getting involved with Anna Eskamani's campaign here in Orlando. She's done so much for families, small businesses, and protecting solar energy. Can I count on you to support her too?"
    },
    {
      id: "text2",
      title: "Text Option 2",
      content: "Hi! Wanted to share that I'm supporting Anna Eskamani for Mayor. She's always put people over politics and even donated her salary to help families in need. Would love for you to join me in supporting her!"
    },
    {
      id: "text3",
      title: "Text Option 3",
      content: "Hey there 👋 I've been following Anna Eskamani's campaign and love how she focuses on housing, jobs, and helping neighbors. Every vote will matter in this election — will you join me in supporting her?"
    }
  ];

  const prewrittenEmails = [
    {
      id: "email1",
      title: "Why I'm Supporting Anna",
      subject: "Why I'm supporting Anna for Orlando Mayor",
      body: `Hi [Friend's Name],

I don't usually send political emails, but I wanted to share why I'm supporting Anna Eskamani for Mayor of Orlando.

Anna has a proven record of leadership:

• She's earned a doctorate in public policy.
• Served 7 years as a State Representative, helping thousands of families.
• Stood up to OUC to protect solar programs and renewable energy.
• Donated her entire legislative salary for over two years to help families facing eviction.

She's results-driven, compassionate, and focused on making Orlando better for all of us. I hope you'll join me in supporting her.

Learn more: ${CAMPAIGN_URL}

Best,
[Your Name]`
    },
    {
      id: "email2",
      title: "Every Vote Matters",
      subject: "A quick reminder about why voting matters",
      body: `Hi [Friend's Name],

The last mayoral race in Orlando had only 22% turnout — that means less than a quarter of our city made the decision for everyone else.

In the upcoming election, every single vote will make a difference. That's why I'm supporting Anna Eskamani for Mayor. She's a leader who listens, delivers results, and puts people first.

I'd love for you to join me in spreading the word and making sure our voices are heard this time.

Learn more: ${CAMPAIGN_URL}

Thanks,
[Your Name]`
    },
    {
      id: "email3",
      title: "Anna Delivers Results",
      subject: "Anna Eskamani delivers real results for Orlando",
      body: `Hi [Friend's Name],

Just wanted to share a little about why I believe in Anna Eskamani's leadership. She's results-oriented and has a track record of cutting through red tape to get things done.

• Helped 40,000 Floridians navigate the broken unemployment system during COVID.
• Secured bipartisan wins like a diaper tax exemption for families.
• Advocates for affordable housing and small business growth right here in Orlando.

This is the kind of leadership we need for our city. Let's make it happen together.

Learn more: ${CAMPAIGN_URL}

Warmly,
[Your Name]`
    }
  ];

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [id]: true }));
      toast({
        title: "Copied!",
        description: "Text has been copied to your clipboard.",
      });

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [id]: false }));
      }, 2000);
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const createMailtoLink = (subject: string, body: string) => {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    return `mailto:?subject=${encodedSubject}&body=${encodedBody}`;
  };

  const handleEmailSend = (subject: string, body: string) => {
    const mailtoLink = createMailtoLink(subject, body);

    // For Gmail users, try Gmail compose URL
    const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      // Method 1: Try Gmail compose (works well in Chrome)
      const gmailWindow = window.open(gmailComposeUrl, '_blank');

      // Method 2: If Gmail doesn't open, try mailto
      if (!gmailWindow) {
        window.location.href = mailtoLink;
      }

      // Show helpful toast
      toast({
        title: "Opening Email Client",
        description: "Opening Gmail compose window. If it doesn't work, try the 'Copy Email' button instead.",
      });

    } catch (error) {
      // Method 3: Final fallback - try direct mailto
      try {
        window.location.href = mailtoLink;
      } catch (e) {
        toast({
          title: "Email Client Not Available",
          description: "Please use the 'Copy Email' button to copy the message and paste it into your email client.",
          variant: "destructive",
        });
      }
    }
  };

  const socialShareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(CAMPAIGN_URL)}&quote=${encodeURIComponent("I'm supporting Anna Eskamani for Orlando Mayor! She's a proven leader who puts people first. Join me in supporting her campaign.")}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent("I'm supporting Anna Eskamani for Orlando Mayor! She's a proven leader who puts people first. Join me in supporting her campaign.")}&url=${encodeURIComponent(CAMPAIGN_URL)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`I'm supporting Anna Eskamani for Orlando Mayor! She's a proven leader who puts people first. Join me in supporting her campaign. ${CAMPAIGN_URL}`)}`,
    messenger: `https://www.facebook.com/dialog/send?link=${encodeURIComponent(CAMPAIGN_URL)}&app_id=291494419107518&redirect_uri=${encodeURIComponent(window.location.href)}`
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

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header Section */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <Share2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Share Anna's Story</h1>
                  <p className="text-lg text-muted-foreground leading-relaxed mt-2">
                    Use these tools to spread the word with friends, family, and neighbors. Every share matters.
                  </p>
                </div>
              </div>
            </div>

            {/* Prewritten Texts Section */}
            <Card className="mb-8 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 rounded-t-lg">
                <CardTitle className="text-xl font-bold flex items-center gap-3">
                  <MessageSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
                  📱 Prewritten Texts
                </CardTitle>
                <CardDescription className="text-green-700 dark:text-green-300">
                  Quick messages you can copy and send to friends and family
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Accordion type="multiple" className="w-full">
                  {prewrittenTexts.map((text, index) => (
                    <AccordionItem key={text.id} value={text.id} className="border-b last:border-b-0">
                      <AccordionTrigger className="px-6 py-4 hover:bg-green-50 dark:hover:bg-green-950/30">
                        <span className="text-left font-semibold">{text.title}</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg mb-4">
                          <p className="text-sm leading-relaxed whitespace-pre-line">{text.content}</p>
                        </div>
                        <Button
                          onClick={() => copyToClipboard(text.content, text.id)}
                          className="w-full sm:w-auto"
                          variant="outline"
                        >
                          {copiedStates[text.id] ? (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy to Clipboard
                            </>
                          )}
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* Prewritten Emails Section */}
            <Card className="mb-8 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-t-lg">
                <CardTitle className="text-xl font-bold flex items-center gap-3">
                  <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  📧 Prewritten Emails
                </CardTitle>
                <CardDescription className="text-blue-700 dark:text-blue-300">
                  Professional email templates ready to send to your network
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Accordion type="multiple" className="w-full">
                  {prewrittenEmails.map((email, index) => (
                    <AccordionItem key={email.id} value={email.id} className="border-b last:border-b-0">
                      <AccordionTrigger className="px-6 py-4 hover:bg-blue-50 dark:hover:bg-blue-950/30">
                        <div className="text-left">
                          <div className="font-semibold">{email.title}</div>
                          <div className="text-sm text-muted-foreground mt-1">Subject: {email.subject}</div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg mb-4">
                          <div className="text-sm font-semibold mb-2 text-blue-600 dark:text-blue-400">
                            Subject: {email.subject}
                          </div>
                          <div className="text-sm leading-relaxed whitespace-pre-line border-t pt-3">
                            {email.body}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            onClick={() => copyToClipboard(`Subject: ${email.subject}\n\n${email.body}`, email.id)}
                            variant="outline"
                            className="flex-1"
                          >
                            {copiedStates[email.id] ? (
                              <>
                                <Check className="h-4 w-4 mr-2" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Email
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => handleEmailSend(email.subject, email.body)}
                            className="flex-1"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Send Email
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* Social Sharing Section */}
            <Card className="mb-8 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 rounded-t-lg">
                <CardTitle className="text-xl font-bold flex items-center gap-3">
                  <Share2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  📱 Social Sharing
                </CardTitle>
                <CardDescription className="text-purple-700 dark:text-purple-300">
                  Share Anna's campaign on your favorite social platforms
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button
                    onClick={() => window.open(socialShareLinks.facebook, '_blank')}
                    className="h-12 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Facebook className="h-5 w-5 mr-3" />
                    Share on Facebook
                  </Button>

                  <Button
                    onClick={() => window.open(socialShareLinks.twitter, '_blank')}
                    className="h-12 bg-black hover:bg-gray-800 text-white"
                  >
                    <Twitter className="h-5 w-5 mr-3" />
                    Share on X (Twitter)
                  </Button>

                  <Button
                    onClick={() => window.open(socialShareLinks.whatsapp, '_blank')}
                    className="h-12 bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Phone className="h-5 w-5 mr-3" />
                    Share on WhatsApp
                  </Button>

                  <Button
                    onClick={() => window.open(socialShareLinks.messenger, '_blank')}
                    className="h-12 bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <MessageSquare className="h-5 w-5 mr-3" />
                    Share on Messenger
                  </Button>
                </div>

                <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                  <p className="text-sm text-purple-800 dark:text-purple-200 text-center">
                    <strong>Campaign Website:</strong>{" "}
                    <a
                      href={CAMPAIGN_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:no-underline inline-flex items-center gap-1"
                    >
                      {CAMPAIGN_URL}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Call to Action */}
            <Card className="shadow-lg border-2 border-blue-200 dark:border-blue-800">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
                <CardTitle className="text-xl font-bold text-center">
                  Every Connection Builds Momentum
                </CardTitle>
                <CardDescription className="text-blue-100 text-center">
                  Your voice matters. Share Anna's story and help grow the movement.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 bg-blue-50 dark:bg-blue-950/30 text-center">
                <p className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">
                  Together, we grow the Annaverse. 🌟
                </p>
                <Button
                  onClick={() => window.open(CAMPAIGN_URL, '_blank')}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <ExternalLink className="h-5 w-5 mr-2" />
                  Visit Campaign Website
                </Button>
              </CardContent>
            </Card>
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