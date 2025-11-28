import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { getPartyColor, formatParty } from "@/lib/utils";
import { Phone, Mail, Edit, Trash2, Plus, X, ArrowLeft, Download, Check, Undo, History, Lock, Heart, HeartOff, Facebook, Instagram, Twitter, Linkedin, Youtube, AtSign, Globe, Music } from "lucide-react";
import type { Contact, User, ContactPhone, ContactEmail, ContactSocial } from "@shared/schema";
import { useAddSocial, useUpdateSocial, useDeleteSocial } from "@/hooks/useSocials";

interface ProfileModalProps {
  contact: Contact;
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

interface ContactDetails extends Contact {
  phones: ContactPhone[];
  emails: ContactEmail[];
  socials: ContactSocial[];
  auditLogs: any[];
}

// Helper functions for formatting and validation
const formatPhoneNumber = (value: string) => {
  // Remove all non-numeric characters
  const numericValue = value.replace(/\D/g, '');

  // Apply formatting based on length
  if (numericValue.length <= 3) {
    return numericValue;
  } else if (numericValue.length <= 6) {
    return `(${numericValue.slice(0, 3)}) ${numericValue.slice(3)}`;
  } else if (numericValue.length <= 10) {
    return `(${numericValue.slice(0, 3)}) ${numericValue.slice(3, 6)}-${numericValue.slice(6)}`;
  } else {
    // Limit to 10 digits for US phone numbers
    return `(${numericValue.slice(0, 3)}) ${numericValue.slice(3, 6)}-${numericValue.slice(6, 10)}`;
  }
};

const isValidEmail = (email: string) => {
  // More comprehensive email validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return email.trim().length > 0 && emailRegex.test(email.trim());
};

const isValidPhoneNumber = (phone: string) => {
  // Must be at least 10 digits for a valid US phone number
  const numericValue = phone.replace(/\D/g, '');
  return numericValue.length === 10;
};

// Social media platform icons and labels
const socialIcons: Record<string, any> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  tiktok: Music,
  linkedin: Linkedin,
  youtube: Youtube,
  threads: AtSign,
  other: Globe
};

const socialLabels: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "X (Twitter)",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  threads: "Threads",
  other: "Other"
};

export default function ProfileModal({ contact, user, isOpen, onClose }: ProfileModalProps) {
  const [isEditingCampaign, setIsEditingCampaign] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const isMobile = useIsMobile();
  const [notes, setNotes] = useState(contact.notes || "");
  const [supporterStatus, setSupporterStatus] = useState(contact.supporterStatus ?? "unknown");
  const [volunteerLikeliness, setVolunteerLikeliness] = useState(contact.volunteerLikeliness ?? "unknown");
  const [newPhone, setNewPhone] = useState({ phoneNumber: "", phoneType: "mobile" as const });
  const [newEmail, setNewEmail] = useState({ email: "", emailType: "personal" as const });
  const [newSocial, setNewSocial] = useState({ platform: "facebook" as const, handle: "" });
  const [editingPhone, setEditingPhone] = useState<{ id: string; phoneNumber: string; phoneType: string } | null>(null);
  const [editingEmail, setEditingEmail] = useState<{ id: string; email: string; emailType: string } | null>(null);
  const [editingSocial, setEditingSocial] = useState<{ id: string; platform: string; handle: string } | null>(null);

  // Network state
  const [networkStatus, setNetworkStatus] = useState<{ inNetwork: boolean; networkId?: string }>({ inNetwork: false });
  const [networkLoading, setNetworkLoading] = useState(false);

  // Query to fetch users who have this contact in their network
  const { data: networkUsers = [] } = useQuery({
    queryKey: [`/api/networks/users/${contact.id}`],
    queryFn: async () => {
      const response = await fetch(`/api/networks/users/${contact.id}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch network users');
      return response.json() as Promise<{ id: string; firstName: string | null; lastName: string | null; email: string }[]>;
    },
    enabled: isOpen && !!contact.id,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Validation state
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Sync local state with contact data when component mounts or contact changes
  useEffect(() => {
    setSupporterStatus(contact.supporterStatus ?? "unknown");
    setVolunteerLikeliness(contact.volunteerLikeliness ?? "unknown");
    setNotes(contact.notes || "");
    setIsEditingCampaign(false);
    setIsEditingNotes(false);
  }, [contact.id]);

  // Update state when contact data changes externally (but not while editing)
  useEffect(() => {
    if (!isEditingCampaign) {
      setSupporterStatus(contact.supporterStatus ?? "unknown");
      setVolunteerLikeliness(contact.volunteerLikeliness ?? "unknown");
    }
    if (!isEditingNotes) {
      setNotes(contact.notes || "");
    }
  }, [contact.supporterStatus, contact.volunteerLikeliness, contact.notes, isEditingCampaign, isEditingNotes]);

  // Check network status when modal opens or contact changes
  useEffect(() => {
    if (isOpen && contact.id && user && (user.role === 'admin' || user.role === 'editor')) {
      checkNetworkStatus();
    }
  }, [isOpen, contact.id, user?.role]);

  const checkNetworkStatus = async () => {
    try {
      const response = await fetch(`/api/networks/check/${contact.id}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setNetworkStatus({ inNetwork: data.inNetwork, networkId: data.networkId });
      }
    } catch (error) {
      console.error('Error checking network status:', error);
    }
  };

  const toggleNetwork = async () => {
    if (networkLoading) return;

    setNetworkLoading(true);
    try {
      if (networkStatus.inNetwork && networkStatus.networkId) {
        // Remove from network
        const response = await fetch(`/api/networks/${networkStatus.networkId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (response.ok) {
          setNetworkStatus({ inNetwork: false });
          toast({
            title: "Removed from network",
            description: `${contact.fullName} has been removed from your network.`,
          });
        }
      } else {
        // Add to network
        const response = await fetch('/api/networks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ contactId: contact.id }),
        });
        if (response.ok) {
          const data = await response.json();
          setNetworkStatus({ inNetwork: true, networkId: data.id });
          toast({
            title: "Added to network",
            description: `${contact.fullName} has been added to your network.`,
          });
        }
      }
    } catch (error) {
      console.error('Error toggling network:', error);
      toast({
        title: "Error",
        description: "Failed to update network status.",
        variant: "destructive",
      });
    } finally {
      setNetworkLoading(false);
    }
  };

  const handleExportContact = async () => {
    try {
      console.log('🔄 Starting contact export for:', contact.id);
      const response = await fetch(`/api/contacts/${contact.id}/export`, {
        method: 'GET',
        credentials: 'include',
      });
      console.log('📥 Export response:', response.status, response.headers.get('content-type'));

      if (response.ok) {
        // Get the filename from the Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
          : `contact_${contact.systemId || contact.id}_export.csv`;

        // Create blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Export successful",
          description: `Contact data for ${contact.fullName} has been downloaded.`,
        });
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Error exporting contact:', error);
      toast({
        title: "Export failed",
        description: "Failed to export contact data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const { data: contactDetails, isLoading } = useQuery<ContactDetails>({
    queryKey: ['/api/contacts', contact.id],
    enabled: isOpen,
  });

  const updateContactMutation = useMutation({
    mutationFn: async (updates: any) => {
      await apiRequest('PATCH', `/api/contacts/${contact.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', contact.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/search'] });
      toast({ title: "Contact updated successfully" });
      setIsEditingCampaign(false);
      setIsEditingNotes(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update contact",
        variant: "destructive",
      });
    },
  });

  const addPhoneMutation = useMutation({
    mutationFn: async (phone: typeof newPhone) => {
      await apiRequest('POST', `/api/contacts/${contact.id}/phones`, phone);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', contact.id] });
      setNewPhone({ phoneNumber: "", phoneType: "mobile" });
      setPhoneError("");
      toast({ title: "Phone number added" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add phone number",
        variant: "destructive",
      });
    },
  });

  const addEmailMutation = useMutation({
    mutationFn: async (email: typeof newEmail) => {
      await apiRequest('POST', `/api/contacts/${contact.id}/emails`, email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', contact.id] });
      setNewEmail({ email: "", emailType: "personal" });
      setEmailError("");
      toast({ title: "Email address added" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add email address",
        variant: "destructive",
      });
    },
  });

  const updatePhoneMutation = useMutation({
    mutationFn: async ({ phoneId, updates }: { phoneId: string; updates: { phoneNumber: string; phoneType: string } }) => {
      await apiRequest('PATCH', `/api/phones/${phoneId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', contact.id] });
      setEditingPhone(null);
      toast({ title: "Phone number updated" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update phone number",
        variant: "destructive",
      });
    },
  });

  const deletePhoneMutation = useMutation({
    mutationFn: async (phoneId: string) => {
      await apiRequest('DELETE', `/api/phones/${phoneId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', contact.id] });
      toast({ title: "Phone number deleted" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete phone number",
        variant: "destructive",
      });
    },
  });

  const updateEmailMutation = useMutation({
    mutationFn: async ({ emailId, updates }: { emailId: string; updates: { email: string; emailType: string } }) => {
      await apiRequest('PATCH', `/api/emails/${emailId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', contact.id] });
      setEditingEmail(null);
      toast({ title: "Email address updated" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update email address",
        variant: "destructive",
      });
    },
  });

  const deleteEmailMutation = useMutation({
    mutationFn: async (emailId: string) => {
      await apiRequest('DELETE', `/api/emails/${emailId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', contact.id] });
      toast({ title: "Email address deleted" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete email address",
        variant: "destructive",
      });
    },
  });

  // Social media mutations
  const addSocialMutation = useAddSocial();
  const updateSocialMutation = useUpdateSocial();
  const deleteSocialMutation = useDeleteSocial();

  // Alias functionality removed

  const handleSaveCampaign = () => {
    const updates: any = {};

    if (supporterStatus !== contact.supporterStatus) {
      updates.supporterStatus = supporterStatus;
    }

    if (volunteerLikeliness !== contact.volunteerLikeliness) {
      updates.volunteerLikeliness = volunteerLikeliness;
    }

    if (Object.keys(updates).length > 0) {
      updateContactMutation.mutate(updates);
    } else {
      setIsEditingCampaign(false);
    }
  };

  const handleSaveNotes = () => {
    const updates: any = {};

    if (notes !== contact.notes) {
      updates.notes = notes;
    }

    if (Object.keys(updates).length > 0) {
      updateContactMutation.mutate(updates);
    } else {
      setIsEditingNotes(false);
    }
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

  const calculateYearsSinceRegistration = (registrationDate: string | null) => {
    if (!registrationDate) return null;
    const today = new Date();
    const regDate = new Date(registrationDate);
    let years = today.getFullYear() - regDate.getFullYear();
    const monthDiff = today.getMonth() - regDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < regDate.getDate())) {
      years--;
    }
    return years;
  };

  const formatVoterStatus = (status: string | null) => {
    if (!status) return 'Unknown';
    switch (status.toUpperCase()) {
      case 'ACT':
        return 'Active';
      case 'INACT':
        return 'Inactive';
      default:
        return status;
    }
  };

  const canEdit = user && (user.role === 'admin' || user.role === 'editor');

  if (isLoading) {
    if (isMobile) {
      return (
        <Sheet open={isOpen} onOpenChange={onClose}>
          <SheetContent className="w-full sm:max-w-none p-0 overflow-hidden">
            <SheetHeader className="sr-only">
              <SheetTitle>Contact Profile - Loading</SheetTitle>
              <SheetDescription>Loading contact information</SheetDescription>
            </SheetHeader>
            <div className="flex items-center justify-center p-8 h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </SheetContent>
        </Sheet>
      );
    }

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Contact Profile - Loading</DialogTitle>
          <DialogDescription className="sr-only">Loading contact information</DialogDescription>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const details = contactDetails || {
    ...contact,
    phones: [],
    emails: [],
    socials: [],
    auditLogs: [],
  };

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-none p-0 overflow-hidden flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>{details.fullName} - Contact Profile</SheetTitle>
            <SheetDescription>Contact information and details for {details.fullName}</SheetDescription>
          </SheetHeader>
          
          {/* Mobile Sticky Header */}
          <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 pr-12">
            <div className="flex items-center justify-between pr-2">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <Button
                  variant="ghost"
                  size="default"
                  onClick={onClose}
                  className="h-11 w-11 p-0 flex-shrink-0"
                  data-testid="button-close-profile"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold truncate" data-testid="text-contact-name">
                    {details.fullName}
                  </h2>
                  {networkUsers.length > 0 && (
                    <div className="mt-1 flex items-center gap-1 flex-wrap">
                      <span className="text-xs text-muted-foreground">In network of:</span>
                      {networkUsers.slice(0, 2).map((user) => (
                        <Badge
                          key={user.id}
                          variant="secondary"
                          className="text-xs"
                        >
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.email}
                        </Badge>
                      ))}
                      {networkUsers.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{networkUsers.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {canEdit && (
                  <Button
                    variant="outline"
                    size="default"
                    onClick={toggleNetwork}
                    disabled={networkLoading}
                    className="h-11 px-3 shadow-sm border-gray-300 hover:border-gray-400 hover:shadow-md transition-all"
                    data-testid="button-network-toggle"
                  >
                    {networkLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    ) : networkStatus.inNetwork ? (
                      <HeartOff className="w-4 h-4" />
                    ) : (
                      <Heart className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Content with Accordion */}
          <div className="flex-1 overflow-auto">
            <Accordion type="multiple" defaultValue={["status", "identity"]} className="px-4">
              {/* Campaign Status Section */}
              <AccordionItem value="status">
                <AccordionTrigger className="h-12 text-base font-medium">
                  <div className="flex items-center justify-between w-full pr-4">
                    <span>Campaign Status</span>
                    {canEdit && (
                      <Button
                        variant={isEditingCampaign ? "default" : "outline"}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isEditingCampaign) {
                            handleSaveCampaign();
                          } else {
                            setIsEditingCampaign(true);
                          }
                        }}
                        className="h-8 px-2 shadow-sm border-gray-300 hover:border-gray-400 hover:shadow-md transition-all"
                        data-testid="button-edit-campaign"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        {isEditingCampaign ? 'Save' : 'Edit'}
                      </Button>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  {/* Supporter Status */}
                  <div className="mb-4">
                    <Label className="text-base font-medium mb-3 block">Supporter Status</Label>
                    {canEdit && isEditingCampaign ? (
                      <RadioGroup
                        value={supporterStatus}
                        onValueChange={(value) => setSupporterStatus(value as any)}
                        className="space-y-3"
                        data-testid="radio-supporter-status"
                      >
                        <div className="flex items-center space-x-3 p-3 rounded-lg border">
                          <RadioGroupItem value="confirmed-supporter" id="mobile-confirmed-supporter" />
                          <label htmlFor="mobile-confirmed-supporter" className="text-base font-medium flex-1">
                            Confirmed Supporter
                          </label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg border">
                          <RadioGroupItem value="likely-supporter" id="mobile-likely-supporter" />
                          <label htmlFor="mobile-likely-supporter" className="text-base font-medium flex-1">
                            Likely Supporter
                          </label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg border">
                          <RadioGroupItem value="opposition" id="mobile-opposition" />
                          <label htmlFor="mobile-opposition" className="text-base font-medium flex-1">
                            Opposition
                          </label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg border">
                          <RadioGroupItem value="unknown" id="mobile-unknown" />
                          <label htmlFor="mobile-unknown" className="text-base font-medium flex-1">
                            Unknown
                          </label>
                        </div>
                      </RadioGroup>
                    ) : (
                      <Badge
                        className={`text-sm px-3 py-1 ${
                          details.supporterStatus === 'confirmed-supporter' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                          details.supporterStatus === 'likely-supporter' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                          details.supporterStatus === 'opposition' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                        }`}
                        data-testid="badge-supporter-status"
                      >
                        {details.supporterStatus === 'confirmed-supporter' ? 'Confirmed Supporter' :
                         details.supporterStatus === 'likely-supporter' ? 'Likely Supporter' :
                         details.supporterStatus === 'opposition' ? 'Opposition' : 'Unknown'}
                      </Badge>
                    )}
                  </div>

                  <Separator className="my-4" />

                  {/* Volunteer Likeliness */}
                  <div className="mb-4">
                    <Label className="text-base font-medium mb-3 block">Likeliness to Volunteer</Label>
                    {canEdit && isEditingCampaign ? (
                      <RadioGroup
                        value={volunteerLikeliness}
                        onValueChange={(value) => setVolunteerLikeliness(value as any)}
                        className="space-y-3"
                        data-testid="radio-volunteer-likeliness"
                      >
                        <div className="flex items-center space-x-3 p-3 rounded-lg border">
                          <RadioGroupItem value="confirmed-volunteer" id="mobile-confirmed-volunteer" />
                          <label htmlFor="mobile-confirmed-volunteer" className="text-base font-medium flex-1">
                            Confirmed Volunteer
                          </label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg border">
                          <RadioGroupItem value="likely-to-volunteer" id="mobile-likely-to-volunteer" />
                          <label htmlFor="mobile-likely-to-volunteer" className="text-base font-medium flex-1">
                            Likely To Volunteer
                          </label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg border">
                          <RadioGroupItem value="will-not-volunteer" id="mobile-will-not-volunteer" />
                          <label htmlFor="mobile-will-not-volunteer" className="text-base font-medium flex-1">
                            Will Not Volunteer
                          </label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg border">
                          <RadioGroupItem value="unknown" id="mobile-volunteer-unknown" />
                          <label htmlFor="mobile-volunteer-unknown" className="text-base font-medium flex-1">
                            Unknown
                          </label>
                        </div>
                      </RadioGroup>
                    ) : (
                      <Badge
                        className={`text-sm px-3 py-1 ${
                          details.volunteerLikeliness === 'confirmed-volunteer' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                          details.volunteerLikeliness === 'likely-to-volunteer' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                          details.volunteerLikeliness === 'will-not-volunteer' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                        }`}
                        data-testid="badge-volunteer-likeliness"
                      >
                        {details.volunteerLikeliness === 'confirmed-volunteer' ? 'Confirmed Volunteer' :
                         details.volunteerLikeliness === 'likely-to-volunteer' ? 'Likely To Volunteer' :
                         details.volunteerLikeliness === 'will-not-volunteer' ? 'Will Not Volunteer' : 'Unknown'}
                      </Badge>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Identity Information */}
              <AccordionItem value="identity">
                <AccordionTrigger className="h-12 text-base font-medium">
                  <div className="flex items-center gap-2">
                    <span>Identity Information</span>
                    <Lock className="w-4 h-4 text-yellow-500" />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6 space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Full Name</Label>
                    <p className="text-base mt-1">{details.fullName}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Age</Label>
                    <div className="mt-1">
                      <p className="text-base">{calculateAge(details.dateOfBirth) || 'N/A'}</p>
                      {details.dateOfBirth && (
                        <p className="text-sm text-muted-foreground">{new Date(details.dateOfBirth).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Party Affiliation</Label>
                    <p className={`text-base mt-1 font-medium ${getPartyColor(details.party)}`} data-testid="text-party">
                      {formatParty(details.party)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Voter Status</Label>
                    <p className="text-base mt-1">{formatVoterStatus(details.voterStatus)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Registration Status</Label>
                    <div className="mt-1">
                      {details.registrationDate ? (
                        <>
                          <p className="text-base font-medium">
                            Registered for {calculateYearsSinceRegistration(details.registrationDate)} years
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Since: {new Date(details.registrationDate).toLocaleDateString()}
                          </p>
                        </>
                      ) : (
                        <p className="text-base">Not provided</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Voter ID</Label>
                    <p className="text-base mt-1 font-mono">{details.voterId || 'Not provided'}</p>
                  </div>
                  {/* Nicknames functionality completely removed */}
                </AccordionContent>
              </AccordionItem>

              {/* Address Information */}
              <AccordionItem value="address">
                <AccordionTrigger className="h-12 text-base font-medium">
                  <div className="flex items-center gap-2">
                    <span>Address Information</span>
                    <Lock className="w-4 h-4 text-yellow-500" />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6 space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Street Address</Label>
                    <p className="text-base mt-1">{details.streetAddress || 'Not provided'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">City</Label>
                      <p className="text-base mt-1">{details.city || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">State / ZIP</Label>
                      <p className="text-base mt-1">
                        {details.state || 'N/A'} {details.zipCode || ''}
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Contact Information */}
              <AccordionItem value="contact">
                <AccordionTrigger className="h-12 text-base font-medium">
                  Contact Information
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  {/* Public Contact Info Section */}
                  {(details.phones.some((p: any) => p.isBaselineData) || details.emails.some((e: any) => e.isBaselineData)) && (
                    <div className="mb-6">
                      <Label className="text-base font-medium mb-3 block text-black dark:text-white">
                        📋 Public Contact Info
                      </Label>
                      <div className="space-y-3">
                        {/* Public Phone Numbers */}
                        {details.phones.filter((phone: any) => phone.isBaselineData).map((phone) => (
                          <div key={phone.id} className="p-4 bg-muted/30 rounded-lg border-l-4 border-black">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Phone className="w-4 h-4 text-black dark:text-white" />
                                <div>
                                  <p className="font-medium text-sm">{phone.phoneNumber}</p>
                                  <p className="text-xs text-muted-foreground capitalize">
                                    {phone.phoneType} {phone.isPrimary && '(Primary)'}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs">Public Data</Badge>
                            </div>
                          </div>
                        ))}
                        {/* Public Email Addresses */}
                        {details.emails.filter((email: any) => email.isBaselineData).map((email) => (
                          <div key={email.id} className="p-4 bg-muted/30 rounded-lg border-l-4 border-black">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Mail className="w-4 h-4 text-black dark:text-white" />
                                <div>
                                  <p className="font-medium text-sm">{email.email}</p>
                                  <p className="text-xs text-muted-foreground capitalize">
                                    {email.emailType} {email.isPrimary && '(Primary)'}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs">Public Data</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Public Social Media (if any exist) */}
                  {(details.socials && details.socials.some((s: any) => s.isBaselineData)) && (
                    <div className="mb-6">
                      <Label className="text-base font-medium mb-3 block text-black dark:text-white">
                        📱 Public Social Media
                      </Label>
                      <div className="space-y-3">
                        {details.socials.filter((social: any) => social.isBaselineData).map((social: any) => {
                          const Icon = socialIcons[social.platform];
                          return (
                            <div key={social.id} className="p-4 bg-muted/30 rounded-lg border-l-4 border-black">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <Icon className="w-4 h-4 text-black dark:text-white" />
                                  <div>
                                    <p className="font-medium text-sm">{social.handle}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {socialLabels[social.platform]} {social.isPrimary && '(Primary)'}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs">Public Data</Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Volunteer-Added Contact Info Section */}
                  <div className="mb-6">
                    <Label className="text-base font-medium mb-3 block text-green-600">
                      🌱 Info Added By Volunteer
                    </Label>
                    <div className="space-y-3">
                      {/* Volunteer Phone Numbers */}
                      {details.phones.filter((phone: any) => phone.isManuallyAdded).map((phone) => (
                        <div key={phone.id} className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border-l-4 border-green-600">
                          {editingPhone?.id === phone.id ? (
                            <div className="space-y-3">
                              <div className="flex items-center space-x-3">
                                <Phone className="w-4 h-4 text-green-600" />
                                <Input
                                  type="tel"
                                  value={editingPhone.phoneNumber}
                                  onChange={(e) => setEditingPhone(prev => prev ? { ...prev, phoneNumber: formatPhoneNumber(e.target.value) } : null)}
                                  className="flex-1 h-11 text-base"
                                  data-testid={`input-edit-phone-${phone.id}`}
                                />
                              </div>
                              <select 
                                value={editingPhone.phoneType}
                                onChange={(e) => setEditingPhone(prev => prev ? { ...prev, phoneType: e.target.value } : null)}
                                className="w-full px-3 py-3 border border-input rounded-md h-11 text-base bg-background text-foreground"
                              >
                                <option value="mobile">Mobile</option>
                                <option value="home">Home</option>
                                <option value="work">Work</option>
                                <option value="other">Other</option>
                              </select>
                              <div className="flex items-center space-x-2">
                                <Button 
                                  variant="default" 
                                  size="default"
                                  onClick={() => updatePhoneMutation.mutate({
                                    phoneId: phone.id,
                                    updates: { phoneNumber: editingPhone.phoneNumber, phoneType: editingPhone.phoneType }
                                  })}
                                  disabled={updatePhoneMutation.isPending}
                                  className="flex-1 h-11"
                                  data-testid={`button-save-phone-${phone.id}`}
                                >
                                  <Check className="w-4 h-4 mr-2" />
                                  Save
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="default"
                                  onClick={() => setEditingPhone(null)}
                                  className="flex-1 h-11"
                                  data-testid={`button-cancel-phone-${phone.id}`}
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <Phone className="w-4 h-4 text-green-600" />
                                  <div>
                                    <p className="text-base font-medium">{phone.phoneNumber}</p>
                                    <p className="text-sm text-muted-foreground capitalize">
                                      {phone.phoneType} {phone.isPrimary && '• Primary'}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Volunteer Added</Badge>
                              </div>
                              {canEdit && (
                                <div className="flex items-center justify-end space-x-2 mt-2">
                                  <Button 
                                    variant="ghost" 
                                    size="default"
                                    onClick={() => setEditingPhone({
                                      id: phone.id,
                                      phoneNumber: phone.phoneNumber,
                                      phoneType: phone.phoneType || 'mobile'
                                    })}
                                    className="h-11 w-11 p-0"
                                    data-testid={`button-edit-phone-${phone.id}`}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="default" 
                                    className="h-11 w-11 p-0 text-destructive"
                                    onClick={() => deletePhoneMutation.mutate(phone.id)}
                                    disabled={deletePhoneMutation.isPending}
                                    data-testid={`button-delete-phone-${phone.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                      {canEdit && (
                        <div className="p-4 border border-dashed border-border rounded-lg space-y-3">
                          <div className="flex items-center space-x-3">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <Input
                              type="tel"
                              placeholder="Phone number..."
                              value={newPhone.phoneNumber}
                              onChange={(e) => {
                                const formatted = formatPhoneNumber(e.target.value);
                                setNewPhone(prev => ({ ...prev, phoneNumber: formatted }));
                                if (formatted && !isValidPhoneNumber(formatted)) {
                                  setPhoneError("Please enter a valid 10-digit phone number");
                                } else {
                                  setPhoneError("");
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && isValidPhoneNumber(newPhone.phoneNumber)) {
                                  e.preventDefault();
                                  addPhoneMutation.mutate(newPhone);
                                }
                              }}
                              className={`flex-1 h-11 text-base ${phoneError ? 'border-red-500' : ''}`}
                              data-testid="input-new-phone"
                            />
                          </div>
                          {phoneError && (
                            <p className="text-sm text-red-500 px-7">{phoneError}</p>
                          )}
                          <select
                            value={newPhone.phoneType}
                            onChange={(e) => setNewPhone(prev => ({ ...prev, phoneType: e.target.value as any }))}
                            className="w-full px-3 py-3 border border-input rounded-md h-11 text-base bg-background text-foreground"
                          >
                            <option value="mobile">Mobile</option>
                            <option value="home">Home</option>
                            <option value="work">Work</option>
                            <option value="other">Other</option>
                          </select>
                          <Button
                            size="default"
                            onClick={() => isValidPhoneNumber(newPhone.phoneNumber) && addPhoneMutation.mutate(newPhone)}
                            disabled={!isValidPhoneNumber(newPhone.phoneNumber) || addPhoneMutation.isPending}
                            className="w-full h-11"
                            data-testid="button-add-phone"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Phone Number
                          </Button>
                        </div>
                      )}

                      {/* Volunteer Email Addresses */}
                      {details.emails.filter((email: any) => email.isManuallyAdded).map((email) => (
                        <div key={email.id} className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border-l-4 border-green-600">
                          {editingEmail?.id === email.id ? (
                            <div className="space-y-3">
                              <div className="flex items-center space-x-3">
                                <Mail className="w-4 h-4 text-green-600" />
                                <Input
                                  type="email"
                                  value={editingEmail.email}
                                  onChange={(e) => setEditingEmail(prev => prev ? { ...prev, email: e.target.value } : null)}
                                  className="flex-1 h-11 text-base"
                                  data-testid={`input-edit-email-${email.id}`}
                                />
                              </div>
                              <select 
                                value={editingEmail.emailType}
                                onChange={(e) => setEditingEmail(prev => prev ? { ...prev, emailType: e.target.value } : null)}
                                className="w-full px-3 py-3 border border-input rounded-md h-11 text-base bg-background text-foreground"
                              >
                                <option value="personal">Personal</option>
                                <option value="work">Work</option>
                                <option value="other">Other</option>
                              </select>
                              <div className="flex items-center space-x-2">
                                <Button 
                                  variant="default" 
                                  size="default"
                                  onClick={() => updateEmailMutation.mutate({
                                    emailId: email.id,
                                    updates: { email: editingEmail.email, emailType: editingEmail.emailType }
                                  })}
                                  disabled={updateEmailMutation.isPending}
                                  className="flex-1 h-11"
                                  data-testid={`button-save-email-${email.id}`}
                                >
                                  <Check className="w-4 h-4 mr-2" />
                                  Save
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="default"
                                  onClick={() => setEditingEmail(null)}
                                  className="flex-1 h-11"
                                  data-testid={`button-cancel-email-${email.id}`}
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Mail className="w-4 h-4 text-green-600" />
                                <div>
                                  <p className="text-base font-medium">{email.email}</p>
                                  <p className="text-sm text-muted-foreground capitalize">
                                    {email.emailType} {email.isPrimary && '• Primary'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Volunteer Added</Badge>
                                {canEdit && (
                                  <div className="flex items-center space-x-1">
                                  <Button 
                                    variant="ghost" 
                                    size="default"
                                    onClick={() => setEditingEmail({
                                      id: email.id,
                                      email: email.email,
                                      emailType: email.emailType || 'personal'
                                    })}
                                    className="h-11 w-11 p-0"
                                    data-testid={`button-edit-email-${email.id}`}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="default" 
                                    className="h-11 w-11 p-0 text-destructive"
                                    onClick={() => deleteEmailMutation.mutate(email.id)}
                                    disabled={deleteEmailMutation.isPending}
                                    data-testid={`button-delete-email-${email.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {canEdit && (
                        <div className="p-4 border border-dashed border-border rounded-lg space-y-3">
                          <div className="flex items-center space-x-3">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <Input
                              type="email"
                              placeholder="Email address..."
                              value={newEmail.email}
                              onChange={(e) => {
                                const email = e.target.value;
                                setNewEmail(prev => ({ ...prev, email }));
                                if (email && !isValidEmail(email)) {
                                  setEmailError("Please enter a valid email address");
                                } else {
                                  setEmailError("");
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && isValidEmail(newEmail.email)) {
                                  e.preventDefault();
                                  addEmailMutation.mutate(newEmail);
                                }
                              }}
                              className={`flex-1 h-11 text-base ${emailError ? 'border-red-500' : ''}`}
                              data-testid="input-new-email"
                            />
                          </div>
                          {emailError && (
                            <p className="text-sm text-red-500 px-7">{emailError}</p>
                          )}
                          <select
                            value={newEmail.emailType}
                            onChange={(e) => setNewEmail(prev => ({ ...prev, emailType: e.target.value as any }))}
                            className="w-full px-3 py-3 border border-input rounded-md h-11 text-base bg-background text-foreground"
                          >
                            <option value="personal">Personal</option>
                            <option value="work">Work</option>
                            <option value="other">Other</option>
                          </select>
                          <Button
                            size="default"
                            onClick={() => isValidEmail(newEmail.email) && addEmailMutation.mutate(newEmail)}
                            disabled={!isValidEmail(newEmail.email) || addEmailMutation.isPending}
                            className="w-full h-11"
                            data-testid="button-add-email"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Email Address
                          </Button>
                        </div>
                      )}

                      {/* Volunteer Social Media */}
                      {details.socials && details.socials.filter((social: any) => social.isManuallyAdded).map((social: any) => {
                        const Icon = socialIcons[social.platform];
                        return (
                          <div key={social.id} className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border-l-4 border-green-600">
                            {editingSocial?.id === social.id ? (
                              <div className="space-y-3">
                                <div className="flex items-center space-x-3">
                                  <Icon className="w-4 h-4 text-green-600" />
                                  <Input
                                    type="text"
                                    value={editingSocial.handle}
                                    onChange={(e) => setEditingSocial(prev => prev ? { ...prev, handle: e.target.value } : null)}
                                    placeholder="@username or URL"
                                    className="flex-1 h-11 text-base"
                                    data-testid={`input-edit-social-${social.id}`}
                                  />
                                </div>
                                <select
                                  value={editingSocial.platform}
                                  onChange={(e) => setEditingSocial(prev => prev ? { ...prev, platform: e.target.value } : null)}
                                  className="w-full px-3 py-3 border border-input rounded-md h-11 text-base bg-background text-foreground"
                                >
                                  <option value="facebook">Facebook</option>
                                  <option value="instagram">Instagram</option>
                                  <option value="twitter">X (Twitter)</option>
                                  <option value="tiktok">TikTok</option>
                                  <option value="linkedin">LinkedIn</option>
                                  <option value="youtube">YouTube</option>
                                  <option value="threads">Threads</option>
                                  <option value="other">Other</option>
                                </select>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="default"
                                    size="default"
                                    onClick={() => updateSocialMutation.mutate({
                                      id: social.id,
                                      contactId: contact.id,
                                      data: { platform: editingSocial.platform as any, handle: editingSocial.handle }
                                    }, {
                                      onSuccess: () => {
                                        setEditingSocial(null);
                                        toast({ title: "Social media updated" });
                                      }
                                    })}
                                    disabled={updateSocialMutation.isPending}
                                    className="flex-1 h-11"
                                    data-testid={`button-save-social-${social.id}`}
                                  >
                                    <Check className="w-4 h-4 mr-2" />
                                    Save
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="default"
                                    onClick={() => setEditingSocial(null)}
                                    className="flex-1 h-11"
                                    data-testid={`button-cancel-social-${social.id}`}
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <Icon className="w-4 h-4 text-green-600" />
                                    <div>
                                      <p className="text-base font-medium">{social.handle}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {socialLabels[social.platform]} {social.isPrimary && '• Primary'}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Volunteer Added</Badge>
                                </div>
                                {canEdit && (
                                  <div className="flex items-center justify-end space-x-2 mt-2">
                                    <Button
                                      variant="ghost"
                                      size="default"
                                      onClick={() => setEditingSocial({
                                        id: social.id,
                                        platform: social.platform,
                                        handle: social.handle
                                      })}
                                      className="h-11 w-11 p-0"
                                      data-testid={`button-edit-social-${social.id}`}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="default"
                                      className="h-11 w-11 p-0 text-destructive"
                                      onClick={() => deleteSocialMutation.mutate({ id: social.id, contactId: contact.id }, {
                                        onSuccess: () => {
                                          toast({ title: "Social media deleted" });
                                        }
                                      })}
                                      disabled={deleteSocialMutation.isPending}
                                      data-testid={`button-delete-social-${social.id}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                      {canEdit && (
                        <div className="p-4 border border-dashed border-border rounded-lg space-y-3">
                          <div className="flex items-center space-x-3">
                            {(() => {
                              const Icon = socialIcons[newSocial.platform];
                              return <Icon className="w-4 h-4 text-muted-foreground" />;
                            })()}
                            <Input
                              type="text"
                              placeholder="@username or URL..."
                              value={newSocial.handle}
                              onChange={(e) => setNewSocial(prev => ({ ...prev, handle: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newSocial.handle.trim()) {
                                  e.preventDefault();
                                  addSocialMutation.mutate({
                                    contactId: contact.id,
                                    data: newSocial
                                  }, {
                                    onSuccess: () => {
                                      setNewSocial({ platform: "facebook", handle: "" });
                                      toast({ title: "Social media added" });
                                    },
                                    onError: (error) => {
                                      console.error('Error adding social media:', error);
                                      toast({
                                        title: "Error",
                                        description: "Failed to add social media",
                                        variant: "destructive",
                                      });
                                    }
                                  });
                                }
                              }}
                              className="flex-1 h-11 text-base"
                              data-testid="input-new-social"
                            />
                          </div>
                          <select
                            value={newSocial.platform}
                            onChange={(e) => setNewSocial(prev => ({ ...prev, platform: e.target.value as any }))}
                            className="w-full px-3 py-3 border border-input rounded-md h-11 text-base bg-background text-foreground"
                          >
                            <option value="facebook">Facebook</option>
                            <option value="instagram">Instagram</option>
                            <option value="twitter">X (Twitter)</option>
                            <option value="tiktok">TikTok</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="youtube">YouTube</option>
                            <option value="threads">Threads</option>
                            <option value="other">Other</option>
                          </select>
                          <Button
                            size="default"
                            onClick={() => {
                              if (newSocial.handle.trim()) {
                                addSocialMutation.mutate({
                                  contactId: contact.id,
                                  data: newSocial
                                }, {
                                  onSuccess: () => {
                                    setNewSocial({ platform: "facebook", handle: "" });
                                    toast({ title: "Social media added" });
                                  },
                                  onError: (error) => {
                                    console.error('Error adding social media:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to add social media",
                                      variant: "destructive",
                                    });
                                  }
                                });
                              }
                            }}
                            disabled={!newSocial.handle.trim() || addSocialMutation.isPending}
                            className="w-full h-11"
                            data-testid="button-add-social"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Social Media
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Notes Section */}
              <AccordionItem value="notes">
                <AccordionTrigger className="h-12 text-base font-medium">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-2">
                      <span>Notes</span>
                      <span className="text-xs text-muted-foreground">
                        {notes.length}/500
                      </span>
                    </div>
                    {canEdit && (
                      <Button
                        variant={isEditingNotes ? "default" : "outline"}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isEditingNotes) {
                            handleSaveNotes();
                          } else {
                            setIsEditingNotes(true);
                          }
                        }}
                        className="h-8 px-2 shadow-sm border-gray-300 hover:border-gray-400 hover:shadow-md transition-all"
                        data-testid="button-edit-notes"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        {isEditingNotes ? 'Save' : 'Edit'}
                      </Button>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  {isEditingNotes && canEdit ? (
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                      placeholder="Add notes about this contact..."
                      rows={6}
                      className="text-base resize-none"
                      data-testid="textarea-notes"
                    />
                  ) : (
                    <p className="text-base whitespace-pre-wrap min-h-[6rem] p-3 bg-muted/50 rounded-lg">
                      {notes || 'No notes added.'}
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* District Information */}
              <AccordionItem value="districts">
                <AccordionTrigger className="h-12 text-base font-medium">
                  <div className="flex items-center gap-2">
                    <span>District Information</span>
                    <Lock className="w-4 h-4 text-yellow-500" />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Precinct</Label>
                      <p className="text-base mt-1">{details.precinct || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Congressional District</Label>
                      <p className="text-base mt-1">{details.district || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">House District</Label>
                      <p className="text-base mt-1">{details.houseDistrict || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Senate District</Label>
                      <p className="text-base mt-1">{details.senateDistrict || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Commission District</Label>
                      <p className="text-base mt-1">{details.commissionDistrict || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">School Board District</Label>
                      <p className="text-base mt-1">{details.schoolBoardDistrict || 'Not provided'}</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Activity Timeline */}
              <AccordionItem value="activity">
                <AccordionTrigger className="h-12 text-base font-medium">
                  Activity Timeline
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {details.auditLogs.length === 0 ? (
                      <p className="text-base text-muted-foreground text-center py-8">No activity recorded.</p>
                    ) : (
                      details.auditLogs.map((log: any) => (
                        <div key={log.id} className="flex space-x-3 p-4 bg-muted/50 rounded-lg">
                          <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <History className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base">
                              <span className="font-medium">
                                {log.user?.firstName} {log.user?.lastName}
                              </span>
                              <span> {log.action}d {log.fieldName}</span>
                            </p>
                            {(log.oldValue || log.newValue) && (
                              <div className="mt-2 text-sm text-muted-foreground">
                                {log.oldValue && <p>Before: {log.oldValue}</p>}
                                {log.newValue && <p>After: {log.newValue}</p>}
                              </div>
                            )}
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(log.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {user && user.role === 'admin' && (
                            <Button
                              variant="ghost" 
                              size="default"
                              className="h-11 w-11 p-0 text-destructive hover:text-destructive"
                            >
                              <Undo className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

        </SheetContent>
      </Sheet>
    );
  }

  // Desktop Dialog Layout
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">{details.fullName} - Contact Profile</DialogTitle>
        <DialogDescription className="sr-only">Contact information and details for {details.fullName}</DialogDescription>
        <div className="flex flex-col h-full">
          {/* Profile Header */}
          <div className="border-b border-border pb-4 pr-8">
            <div className="flex items-center justify-between pr-2">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  data-testid="button-close-profile"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <h2 className="text-xl font-bold" data-testid="text-contact-name">
                    {details.fullName}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Last updated{" "}
                    <span data-testid="text-last-updated">
                      {details.updatedAt ? new Date(details.updatedAt).toLocaleDateString() : 'Never'}
                    </span>
                  </p>
                  {networkUsers.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">In network of:</span>
                      {networkUsers.map((user) => (
                        <Badge
                          key={user.id}
                          variant="secondary"
                          className="text-xs"
                        >
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.email}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportContact}
                  className="shadow-sm border-gray-300 hover:border-gray-400 hover:shadow-md transition-all"
                  data-testid="button-export"
                >
                  <Download className="w-4 h-4 mr-2" />Export
                </Button>
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleNetwork}
                    disabled={networkLoading}
                    className={`shadow-sm border-gray-300 hover:border-gray-400 hover:shadow-md transition-all ${networkStatus.inNetwork ? "text-destructive hover:text-destructive" : ""}`}
                    data-testid="button-network-toggle"
                  >
                    {networkLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    ) : networkStatus.inNetwork ? (
                      <HeartOff className="w-4 h-4 mr-2" />
                    ) : (
                      <Heart className="w-4 h-4 mr-2" />
                    )}
                    {networkStatus.inNetwork ? 'Remove' : 'Add to Network'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="space-y-6">
              {/* Campaign Status */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Campaign Status</CardTitle>
                    {canEdit && (
                      <Button
                        variant={isEditingCampaign ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (isEditingCampaign) {
                            handleSaveCampaign();
                          } else {
                            setIsEditingCampaign(true);
                          }
                        }}
                        className="shadow-sm border-gray-300 hover:border-gray-400 hover:shadow-md transition-all"
                        data-testid="button-edit-campaign"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        {isEditingCampaign ? 'Save' : 'Edit'}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Supporter Status */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Supporter Status</Label>
                    {canEdit && isEditingCampaign ? (
                      <RadioGroup
                        value={supporterStatus}
                        onValueChange={(value) => setSupporterStatus(value as any)}
                        className="flex flex-row space-x-6"
                        data-testid="radio-supporter-status"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="confirmed-supporter" id="confirmed-supporter" />
                          <label htmlFor="confirmed-supporter" className="text-sm font-medium leading-none">
                            Confirmed Supporter
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="likely-supporter" id="likely-supporter" />
                          <label htmlFor="likely-supporter" className="text-sm font-medium leading-none">
                            Likely Supporter
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="opposition" id="opposition" />
                          <label htmlFor="opposition" className="text-sm font-medium leading-none">
                            Opposition
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="unknown" id="unknown" />
                          <label htmlFor="unknown" className="text-sm font-medium leading-none">
                            Unknown
                          </label>
                        </div>
                      </RadioGroup>
                    ) : (
                      <Badge
                        className={`text-sm px-3 py-1 ${
                          details.supporterStatus === 'confirmed-supporter' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                          details.supporterStatus === 'likely-supporter' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                          details.supporterStatus === 'opposition' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                        }`}
                        data-testid="badge-supporter-status"
                      >
                        {details.supporterStatus === 'confirmed-supporter' ? 'Confirmed Supporter' :
                         details.supporterStatus === 'likely-supporter' ? 'Likely Supporter' :
                         details.supporterStatus === 'opposition' ? 'Opposition' : 'Unknown'}
                      </Badge>
                    )}
                  </div>

                  <Separator />

                  {/* Volunteer Likeliness */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Likeliness to Volunteer</Label>
                    {canEdit && isEditingCampaign ? (
                      <RadioGroup
                        value={volunteerLikeliness}
                        onValueChange={(value) => setVolunteerLikeliness(value as any)}
                        className="flex flex-row space-x-6"
                        data-testid="radio-volunteer-likeliness"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="confirmed-volunteer" id="confirmed-volunteer" />
                          <label htmlFor="confirmed-volunteer" className="text-sm font-medium leading-none">
                            Confirmed Volunteer
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="likely-to-volunteer" id="likely-to-volunteer" />
                          <label htmlFor="likely-to-volunteer" className="text-sm font-medium leading-none">
                            Likely To Volunteer
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="will-not-volunteer" id="will-not-volunteer" />
                          <label htmlFor="will-not-volunteer" className="text-sm font-medium leading-none">
                            Will Not Volunteer
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="unknown" id="volunteer-unknown" />
                          <label htmlFor="volunteer-unknown" className="text-sm font-medium leading-none">
                            Unknown
                          </label>
                        </div>
                      </RadioGroup>
                    ) : (
                      <Badge
                        className={`text-sm px-3 py-1 ${
                          details.volunteerLikeliness === 'confirmed-volunteer' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                          details.volunteerLikeliness === 'likely-to-volunteer' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                          details.volunteerLikeliness === 'will-not-volunteer' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                        }`}
                        data-testid="badge-volunteer-likeliness"
                      >
                        {details.volunteerLikeliness === 'confirmed-volunteer' ? 'Confirmed Volunteer' :
                         details.volunteerLikeliness === 'likely-to-volunteer' ? 'Likely To Volunteer' :
                         details.volunteerLikeliness === 'will-not-volunteer' ? 'Will Not Volunteer' : 'Unknown'}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Identity Information */}
              <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span>Identity Information</span>
                      <Lock className="w-4 h-4 text-yellow-500" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Full Name</Label>
                      <p className="text-sm mt-1">{details.fullName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Age</Label>
                      <div className="mt-1">
                        <p className="text-sm">{calculateAge(details.dateOfBirth) || 'N/A'}</p>
                        {details.dateOfBirth && (
                          <p className="text-xs text-muted-foreground">{new Date(details.dateOfBirth).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Party Affiliation</Label>
                      <p className={`text-sm mt-1 font-medium ${getPartyColor(details.party)}`} data-testid="text-party">
                        {formatParty(details.party)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Voter Status</Label>
                      <p className="text-sm mt-1">{formatVoterStatus(details.voterStatus)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Registration Status</Label>
                      <div className="mt-1">
                        {details.registrationDate ? (
                          <>
                            <p className="text-sm font-medium">
                              Registered for {calculateYearsSinceRegistration(details.registrationDate)} years
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Since: {new Date(details.registrationDate).toLocaleDateString()}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm">Not provided</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Voter ID</Label>
                      <p className="text-sm mt-1 font-mono">{details.voterId || 'Not provided'}</p>
                    </div>
                    {/* Nicknames functionality completely removed */}
                  </CardContent>
                </Card>

                {/* Address Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span>Address Information</span>
                      <Lock className="w-4 h-4 text-yellow-500" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label className="text-muted-foreground">Street Address</Label>
                      <p className="text-sm mt-1">{details.streetAddress || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">City</Label>
                      <p className="text-sm mt-1">{details.city || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">State / ZIP</Label>
                      <p className="text-sm mt-1">
                        {details.state || 'N/A'} {details.zipCode || ''}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Public Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Public Contact Information
                      <Lock className="w-4 h-4 text-yellow-500" />
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Contact information from public voter records and databases</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Public Phone Numbers */}
                    <div>
                      <Label className="text-muted-foreground">Phone Numbers</Label>
                      <div className="space-y-2 mt-2">
                        {details.phones.filter(phone => phone.isBaselineData || !phone.isManuallyAdded).length === 0 ? (
                          <p className="text-sm text-muted-foreground italic py-2">No public phone numbers available</p>
                        ) : (
                          details.phones.filter(phone => phone.isBaselineData || !phone.isManuallyAdded).map((phone) => (
                            <div key={phone.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                              <div className="flex items-center space-x-3">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{phone.phoneNumber}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {phone.phoneType} {phone.isPrimary && '• Primary'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Public Email Addresses */}
                    <div>
                      <Label className="text-muted-foreground">Email Addresses</Label>
                      <div className="space-y-2 mt-2">
                        {details.emails.filter(email => email.isBaselineData || !email.isManuallyAdded).length === 0 ? (
                          <p className="text-sm text-muted-foreground italic py-2">No public email addresses available</p>
                        ) : (
                          details.emails.filter(email => email.isBaselineData || !email.isManuallyAdded).map((email) => (
                            <div key={email.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                              <div className="flex items-center space-x-3">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{email.email}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {email.emailType} {email.isPrimary && '• Primary'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Public Social Media */}
                    {(details.socials && details.socials.filter(social => social.isBaselineData || !social.isManuallyAdded).length > 0) && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-muted-foreground">Social Media</Label>
                          <div className="space-y-2 mt-2">
                            {details.socials.filter(social => social.isBaselineData || !social.isManuallyAdded).map((social: any) => {
                              const Icon = socialIcons[social.platform];
                              return (
                                <div key={social.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                                  <div className="flex items-center space-x-3">
                                    <Icon className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-sm font-medium">{social.handle}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {socialLabels[social.platform]} {social.isPrimary && '• Primary'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Volunteer-Provided Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Volunteer-Provided Contact Information</CardTitle>
                    <p className="text-sm text-muted-foreground">Contact information added by volunteers and campaign staff</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Volunteer Phone Numbers */}
                    <div>
                      <Label className="text-muted-foreground">Phone Numbers</Label>
                      <div className="space-y-2 mt-2">
                        {details.phones.filter(phone => phone.isManuallyAdded).map((phone) => (
                          <div key={phone.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                            {editingPhone?.id === phone.id ? (
                              <div className="flex-1 flex items-center space-x-2">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                <Input
                                  value={editingPhone.phoneNumber}
                                  onChange={(e) => setEditingPhone(prev => prev ? { ...prev, phoneNumber: formatPhoneNumber(e.target.value) } : null)}
                                  className="flex-1"
                                  data-testid={`input-edit-phone-${phone.id}`}
                                />
                                <select 
                                  value={editingPhone.phoneType}
                                  onChange={(e) => setEditingPhone(prev => prev ? { ...prev, phoneType: e.target.value } : null)}
                                  className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
                                >
                                  <option value="mobile">Mobile</option>
                                  <option value="home">Home</option>
                                  <option value="work">Work</option>
                                  <option value="other">Other</option>
                                </select>
                                <div className="flex items-center space-x-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => updatePhoneMutation.mutate({
                                      phoneId: phone.id,
                                      updates: { phoneNumber: editingPhone.phoneNumber, phoneType: editingPhone.phoneType }
                                    })}
                                    disabled={updatePhoneMutation.isPending}
                                    data-testid={`button-save-phone-${phone.id}`}
                                  >
                                    <Check className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => setEditingPhone(null)}
                                    data-testid={`button-cancel-phone-${phone.id}`}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center space-x-3">
                                  <Phone className="w-4 h-4 text-muted-foreground" />
                                  <div>
                                    <p className="text-sm font-medium">{phone.phoneNumber}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {phone.phoneType} {phone.isPrimary && '• Primary'}
                                    </p>
                                  </div>
                                </div>
                                {canEdit && (
                                  <div className="flex items-center space-x-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => setEditingPhone({
                                        id: phone.id,
                                        phoneNumber: phone.phoneNumber,
                                        phoneType: phone.phoneType || 'mobile'
                                      })}
                                      data-testid={`button-edit-phone-${phone.id}`}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="text-destructive"
                                      onClick={() => deletePhoneMutation.mutate(phone.id)}
                                      disabled={deletePhoneMutation.isPending}
                                      data-testid={`button-delete-phone-${phone.id}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                        {canEdit && (
                          <div className="flex items-center space-x-2 p-3 border border-dashed border-border rounded-md">
                            <Input
                              placeholder="Phone number..."
                              value={newPhone.phoneNumber}
                              onChange={(e) => setNewPhone(prev => ({ ...prev, phoneNumber: formatPhoneNumber(e.target.value) }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && isValidPhoneNumber(newPhone.phoneNumber)) {
                                  e.preventDefault();
                                  addPhoneMutation.mutate(newPhone);
                                }
                              }}
                              className="flex-1"
                              data-testid="input-new-phone"
                            />
                            <select 
                              value={newPhone.phoneType}
                              onChange={(e) => setNewPhone(prev => ({ ...prev, phoneType: e.target.value as any }))}
                              className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
                            >
                              <option value="mobile">Mobile</option>
                              <option value="home">Home</option>
                              <option value="work">Work</option>
                              <option value="other">Other</option>
                            </select>
                            <Button
                              size="sm"
                              onClick={() => isValidPhoneNumber(newPhone.phoneNumber) && addPhoneMutation.mutate(newPhone)}
                              disabled={!isValidPhoneNumber(newPhone.phoneNumber) || addPhoneMutation.isPending}
                              data-testid="button-add-phone"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Volunteer Email Addresses */}
                    <div>
                      <Label className="text-muted-foreground">Email Addresses</Label>
                      <div className="space-y-2 mt-2">
                        {details.emails.filter(email => email.isManuallyAdded).map((email) => (
                          <div key={email.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                            {editingEmail?.id === email.id ? (
                              <div className="flex-1 flex items-center space-x-2">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                <Input
                                  type="email"
                                  value={editingEmail.email}
                                  onChange={(e) => setEditingEmail(prev => prev ? { ...prev, email: e.target.value } : null)}
                                  className="flex-1"
                                  data-testid={`input-edit-email-${email.id}`}
                                />
                                <select 
                                  value={editingEmail.emailType}
                                  onChange={(e) => setEditingEmail(prev => prev ? { ...prev, emailType: e.target.value } : null)}
                                  className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
                                >
                                  <option value="personal">Personal</option>
                                  <option value="work">Work</option>
                                  <option value="other">Other</option>
                                </select>
                                <div className="flex items-center space-x-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => updateEmailMutation.mutate({
                                      emailId: email.id,
                                      updates: { email: editingEmail.email, emailType: editingEmail.emailType }
                                    })}
                                    disabled={updateEmailMutation.isPending}
                                    data-testid={`button-save-email-${email.id}`}
                                  >
                                    <Check className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => setEditingEmail(null)}
                                    data-testid={`button-cancel-email-${email.id}`}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center space-x-3">
                                  <Mail className="w-4 h-4 text-muted-foreground" />
                                  <div>
                                    <p className="text-sm font-medium">{email.email}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {email.emailType} {email.isPrimary && '• Primary'}
                                    </p>
                                  </div>
                                </div>
                                {canEdit && (
                                  <div className="flex items-center space-x-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => setEditingEmail({
                                        id: email.id,
                                        email: email.email,
                                        emailType: email.emailType || 'personal'
                                      })}
                                      data-testid={`button-edit-email-${email.id}`}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="text-destructive"
                                      onClick={() => deleteEmailMutation.mutate(email.id)}
                                      disabled={deleteEmailMutation.isPending}
                                      data-testid={`button-delete-email-${email.id}`}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                        {canEdit && (
                          <div className="flex items-center space-x-2 p-3 border border-dashed border-border rounded-md">
                            <Input
                              type="email"
                              placeholder="Email address..."
                              value={newEmail.email}
                              onChange={(e) => {
                                const email = e.target.value;
                                setNewEmail(prev => ({ ...prev, email }));
                                if (email && !isValidEmail(email)) {
                                  setEmailError("Please enter a valid email address");
                                } else {
                                  setEmailError("");
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && isValidEmail(newEmail.email)) {
                                  e.preventDefault();
                                  addEmailMutation.mutate(newEmail);
                                }
                              }}
                              className={`flex-1 ${emailError ? 'border-red-500' : ''}`}
                              data-testid="input-new-email"
                            />
                            {emailError && (
                              <p className="text-sm text-red-500 px-2">{emailError}</p>
                            )}
                            <select
                              value={newEmail.emailType}
                              onChange={(e) => setNewEmail(prev => ({ ...prev, emailType: e.target.value as any }))}
                              className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
                            >
                              <option value="personal">Personal</option>
                              <option value="work">Work</option>
                              <option value="other">Other</option>
                            </select>
                            <Button
                              size="sm"
                              onClick={() => isValidEmail(newEmail.email) && addEmailMutation.mutate(newEmail)}
                              disabled={!isValidEmail(newEmail.email) || addEmailMutation.isPending}
                              data-testid="button-add-email"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Volunteer Social Media */}
                    <div>
                      <Label className="text-muted-foreground">Social Media</Label>
                      <div className="space-y-2 mt-2">
                        {details.socials && details.socials.filter(social => social.isManuallyAdded).map((social: any) => {
                          const Icon = socialIcons[social.platform];
                          return (
                            <div key={social.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                              {editingSocial?.id === social.id ? (
                                <div className="flex-1 flex items-center space-x-2">
                                  <Icon className="w-4 h-4 text-muted-foreground" />
                                  <Input
                                    type="text"
                                    value={editingSocial.handle}
                                    onChange={(e) => setEditingSocial(prev => prev ? { ...prev, handle: e.target.value } : null)}
                                    placeholder="@username or URL"
                                    className="flex-1"
                                    data-testid={`input-edit-social-${social.id}`}
                                  />
                                  <select
                                    value={editingSocial.platform}
                                    onChange={(e) => setEditingSocial(prev => prev ? { ...prev, platform: e.target.value } : null)}
                                    className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
                                  >
                                    <option value="facebook">Facebook</option>
                                    <option value="instagram">Instagram</option>
                                    <option value="twitter">X (Twitter)</option>
                                    <option value="tiktok">TikTok</option>
                                    <option value="linkedin">LinkedIn</option>
                                    <option value="youtube">YouTube</option>
                                    <option value="threads">Threads</option>
                                    <option value="other">Other</option>
                                  </select>
                                  <div className="flex items-center space-x-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => updateSocialMutation.mutate({
                                        id: social.id,
                                        contactId: contact.id,
                                        data: { platform: editingSocial.platform as any, handle: editingSocial.handle }
                                      }, {
                                        onSuccess: () => {
                                          setEditingSocial(null);
                                          toast({ title: "Social media updated" });
                                        }
                                      })}
                                      disabled={updateSocialMutation.isPending}
                                      data-testid={`button-save-social-${social.id}`}
                                    >
                                      <Check className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingSocial(null)}
                                      data-testid={`button-cancel-social-${social.id}`}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center space-x-3">
                                    <Icon className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-sm font-medium">{social.handle}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {socialLabels[social.platform]} {social.isPrimary && '• Primary'}
                                      </p>
                                    </div>
                                  </div>
                                  {canEdit && (
                                    <div className="flex items-center space-x-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditingSocial({
                                          id: social.id,
                                          platform: social.platform,
                                          handle: social.handle
                                        })}
                                        data-testid={`button-edit-social-${social.id}`}
                                      >
                                        <Edit className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive"
                                        onClick={() => deleteSocialMutation.mutate({ id: social.id, contactId: contact.id }, {
                                          onSuccess: () => {
                                            toast({ title: "Social media deleted" });
                                          }
                                        })}
                                        disabled={deleteSocialMutation.isPending}
                                        data-testid={`button-delete-social-${social.id}`}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                        {canEdit && (
                          <div className="flex items-center space-x-2 p-3 border border-dashed border-border rounded-md">
                            {(() => {
                              const Icon = socialIcons[newSocial.platform];
                              return <Icon className="w-4 h-4 text-muted-foreground" />;
                            })()}
                            <Input
                              type="text"
                              placeholder="@username or URL..."
                              value={newSocial.handle}
                              onChange={(e) => setNewSocial(prev => ({ ...prev, handle: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newSocial.handle.trim()) {
                                  e.preventDefault();
                                  addSocialMutation.mutate({
                                    contactId: contact.id,
                                    data: newSocial
                                  }, {
                                    onSuccess: () => {
                                      setNewSocial({ platform: "facebook", handle: "" });
                                      toast({ title: "Social media added" });
                                    },
                                    onError: (error) => {
                                      console.error('Error adding social media:', error);
                                      toast({
                                        title: "Error",
                                        description: "Failed to add social media",
                                        variant: "destructive",
                                      });
                                    }
                                  });
                                }
                              }}
                              className="flex-1"
                              data-testid="input-new-social"
                            />
                            <select
                              value={newSocial.platform}
                              onChange={(e) => setNewSocial(prev => ({ ...prev, platform: e.target.value as any }))}
                              className="px-3 py-2 border border-input rounded-md bg-background text-foreground"
                            >
                              <option value="facebook">Facebook</option>
                              <option value="instagram">Instagram</option>
                              <option value="twitter">X (Twitter)</option>
                              <option value="tiktok">TikTok</option>
                              <option value="linkedin">LinkedIn</option>
                              <option value="youtube">YouTube</option>
                              <option value="threads">Threads</option>
                              <option value="other">Other</option>
                            </select>
                            <Button
                              size="sm"
                              onClick={() => {
                                if (newSocial.handle.trim()) {
                                  addSocialMutation.mutate({
                                    contactId: contact.id,
                                    data: newSocial
                                  }, {
                                    onSuccess: () => {
                                      setNewSocial({ platform: "facebook", handle: "" });
                                      toast({ title: "Social media added" });
                                    },
                                    onError: (error) => {
                                      console.error('Error adding social media:', error);
                                      toast({
                                        title: "Error",
                                        description: "Failed to add social media",
                                        variant: "destructive",
                                      });
                                    }
                                  });
                                }
                              }}
                              disabled={!newSocial.handle.trim() || addSocialMutation.isPending}
                              data-testid="button-add-social"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes Section */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        Notes
                        <span className="text-xs text-muted-foreground">
                          {notes.length}/500 characters
                        </span>
                      </CardTitle>
                      {canEdit && (
                        <Button
                          variant={isEditingNotes ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            if (isEditingNotes) {
                              handleSaveNotes();
                            } else {
                              setIsEditingNotes(true);
                            }
                          }}
                          className="shadow-sm border-gray-300 hover:border-gray-400 hover:shadow-md transition-all"
                          data-testid="button-edit-notes"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          {isEditingNotes ? 'Save' : 'Edit'}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isEditingNotes && canEdit ? (
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                        placeholder="Add notes about this contact..."
                        rows={4}
                        data-testid="textarea-notes"
                      />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">
                        {notes || 'No notes added.'}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* District Information */}
                <Card>
                  <Accordion type="multiple" defaultValue={[]} className="w-full">
                    <AccordionItem value="districts" className="border-none">
                      <AccordionTrigger className="px-6 py-4 hover:no-underline">
                        <CardTitle className="flex items-center gap-2">
                          <span>District Information</span>
                          <Lock className="w-4 h-4 text-yellow-500" />
                        </CardTitle>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Precinct</Label>
                            <p className="text-sm mt-1">{details.precinct || 'Not provided'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Congressional District</Label>
                            <p className="text-sm mt-1">{details.district || 'Not provided'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">House District</Label>
                            <p className="text-sm mt-1">{details.houseDistrict || 'Not provided'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Senate District</Label>
                            <p className="text-sm mt-1">{details.senateDistrict || 'Not provided'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Commission District</Label>
                            <p className="text-sm mt-1">{details.commissionDistrict || 'Not provided'}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">School Board District</Label>
                            <p className="text-sm mt-1">{details.schoolBoardDistrict || 'Not provided'}</p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </Card>

                {/* Activity Timeline */}
                <Card>
                  <Accordion type="multiple" defaultValue={[]} className="w-full">
                    <AccordionItem value="activity" className="border-none">
                      <AccordionTrigger className="px-6 py-4 hover:no-underline">
                        <CardTitle>Activity Timeline</CardTitle>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-6">
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {details.auditLogs.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No activity recorded.</p>
                          ) : (
                            details.auditLogs.map((log: any) => (
                              <div key={log.id} className="flex space-x-3 pb-4 border-b border-border last:border-b-0 last:pb-0">
                                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                  <History className="w-3 h-3 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm">
                                    <span className="font-medium">
                                      {log.user?.firstName} {log.user?.lastName}
                                    </span>
                                    <span> {log.action}d {log.fieldName}</span>
                                  </p>
                                  {(log.oldValue || log.newValue) && (
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      {log.oldValue && <p>Before: {log.oldValue}</p>}
                                      {log.newValue && <p>After: {log.newValue}</p>}
                                    </div>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {new Date(log.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                {user && user.role === 'admin' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Undo className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </Card>

            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
