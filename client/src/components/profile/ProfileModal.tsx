import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { Phone, Mail, Edit, Trash2, Plus, X, ArrowLeft, Download, Check, Undo, History } from "lucide-react";
import type { Contact, User, ContactPhone, ContactEmail, ContactAlias } from "@shared/schema";

interface ProfileModalProps {
  contact: Contact;
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

interface ContactDetails extends Contact {
  aliases: ContactAlias[];
  phones: ContactPhone[];
  emails: ContactEmail[];
  auditLogs: any[];
}

export default function ProfileModal({ contact, user, isOpen, onClose }: ProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(contact.notes || "");
  const [supporterStatus, setSupporterStatus] = useState<"supporter" | "non-supporter" | "unknown">(contact.supporterStatus || "unknown");
  const [newAlias, setNewAlias] = useState("");
  const [newPhone, setNewPhone] = useState({ phoneNumber: "", phoneType: "mobile" as const });
  const [newEmail, setNewEmail] = useState({ email: "", emailType: "personal" as const });
  const [editingPhone, setEditingPhone] = useState<{ id: string; phoneNumber: string; phoneType: string } | null>(null);
  const [editingEmail, setEditingEmail] = useState<{ id: string; email: string; emailType: string } | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      setIsEditing(false);
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

  const addAliasMutation = useMutation({
    mutationFn: async (alias: string) => {
      await apiRequest('POST', `/api/contacts/${contact.id}/aliases`, { alias });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', contact.id] });
      setNewAlias("");
      toast({ title: "Alias added" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add alias",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const updates: any = {};
    
    if (notes !== contact.notes) {
      updates.notes = notes;
    }
    
    if (supporterStatus !== contact.supporterStatus) {
      updates.supporterStatus = supporterStatus;
    }

    if (Object.keys(updates).length > 0) {
      updateContactMutation.mutate(updates);
    } else {
      setIsEditing(false);
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

  const canEdit = user.role === 'admin' || user.role === 'editor';

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const details = contactDetails || {
    ...contact,
    aliases: [],
    phones: [],
    emails: [],
    auditLogs: [],
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex flex-col h-full">
          {/* Profile Header */}
          <div className="border-b border-border pb-4">
            <div className="flex items-center justify-between">
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
                    ID: <span data-testid="text-system-id">{details.systemId}</span> • Last updated{" "}
                    <span data-testid="text-last-updated">
                      {details.updatedAt ? new Date(details.updatedAt).toLocaleDateString() : 'Never'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="button-export"
                >
                  <Download className="w-4 h-4 mr-2" />Export
                </Button>
                {canEdit && (
                  <Button
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    data-testid="button-edit"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {isEditing ? 'Cancel' : 'Edit'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="space-y-6">
              {/* Supporter Status - Moved to Top */}
              <Card>
                <CardHeader>
                  <CardTitle>Supporter Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {canEdit && isEditing ? (
                    <RadioGroup 
                      value={supporterStatus}
                      onValueChange={(value) => setSupporterStatus(value as any)}
                      className="flex flex-row space-x-6"
                      data-testid="radio-supporter-status"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="supporter" id="supporter" />
                        <label htmlFor="supporter" className="text-sm font-medium leading-none">
                          Supporter
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="non-supporter" id="non-supporter" />
                        <label htmlFor="non-supporter" className="text-sm font-medium leading-none">
                          Non-Supporter
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
                      variant={
                        details.supporterStatus === 'supporter' ? 'default' : 
                        details.supporterStatus === 'non-supporter' ? 'destructive' : 'secondary'
                      }
                      data-testid="badge-supporter-status"
                    >
                      {details.supporterStatus === 'supporter' ? 'Supporter' : 
                       details.supporterStatus === 'non-supporter' ? 'Non-Supporter' : 'Unknown'}
                    </Badge>
                  )}
                </CardContent>
              </Card>
              {/* Identity Information */}
              <Card>
                  <CardHeader>
                    <CardTitle>Identity Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Full Name</Label>
                      <p className="text-sm mt-1">{details.fullName}</p>
                      <span className="text-xs text-muted-foreground">🔒 Locked field</span>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Date of Birth</Label>
                      <p className="text-sm mt-1">
                        {details.dateOfBirth ? (
                          <>
                            {new Date(details.dateOfBirth).toLocaleDateString()} (Age {calculateAge(details.dateOfBirth)})
                          </>
                        ) : (
                          'Not provided'
                        )}
                      </p>
                      <span className="text-xs text-muted-foreground">🔒 Locked field</span>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Aliases/Nicknames</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {details.aliases.map((alias) => (
                          <Badge key={alias.id} variant="secondary">
                            {alias.alias}
                            {canEdit && (
                              <button className="ml-1 text-muted-foreground hover:text-foreground">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </Badge>
                        ))}
                      </div>
                      {canEdit && (
                        <div className="flex items-center space-x-2 mt-2">
                          <Input
                            placeholder="Add alias..."
                            value={newAlias}
                            onChange={(e) => setNewAlias(e.target.value)}
                            className="flex-1"
                            data-testid="input-new-alias"
                          />
                          <Button
                            size="sm"
                            onClick={() => newAlias && addAliasMutation.mutate(newAlias)}
                            disabled={!newAlias || addAliasMutation.isPending}
                            data-testid="button-add-alias"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Address Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Address Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label className="text-muted-foreground">Street Address</Label>
                      <p className="text-sm mt-1">{details.streetAddress || 'Not provided'}</p>
                      <span className="text-xs text-muted-foreground">🔒 Locked field</span>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">City</Label>
                      <p className="text-sm mt-1">{details.city || 'Not provided'}</p>
                      <span className="text-xs text-muted-foreground">🔒 Locked field</span>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">State / ZIP</Label>
                      <p className="text-sm mt-1">
                        {details.state || 'N/A'} {details.zipCode || ''}
                      </p>
                      <span className="text-xs text-muted-foreground">🔒 Locked field</span>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Congressional District</Label>
                      <p className="text-sm mt-1">{details.district || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Precinct</Label>
                      <p className="text-sm mt-1">{details.precinct || 'Not provided'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Phone Numbers */}
                    <div>
                      <Label className="text-muted-foreground">Phone Numbers</Label>
                      <div className="space-y-2 mt-2">
                        {details.phones.map((phone) => (
                          <div key={phone.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                            {editingPhone?.id === phone.id ? (
                              <div className="flex-1 flex items-center space-x-2">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                <Input
                                  value={editingPhone.phoneNumber}
                                  onChange={(e) => setEditingPhone(prev => prev ? { ...prev, phoneNumber: e.target.value } : null)}
                                  className="flex-1"
                                  data-testid={`input-edit-phone-${phone.id}`}
                                />
                                <select 
                                  value={editingPhone.phoneType}
                                  onChange={(e) => setEditingPhone(prev => prev ? { ...prev, phoneType: e.target.value } : null)}
                                  className="px-3 py-2 border border-input rounded-md"
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
                              onChange={(e) => setNewPhone(prev => ({ ...prev, phoneNumber: e.target.value }))}
                              className="flex-1"
                              data-testid="input-new-phone"
                            />
                            <select 
                              value={newPhone.phoneType}
                              onChange={(e) => setNewPhone(prev => ({ ...prev, phoneType: e.target.value as any }))}
                              className="px-3 py-2 border border-input rounded-md"
                            >
                              <option value="mobile">Mobile</option>
                              <option value="home">Home</option>
                              <option value="work">Work</option>
                              <option value="other">Other</option>
                            </select>
                            <Button
                              size="sm"
                              onClick={() => newPhone.phoneNumber && addPhoneMutation.mutate(newPhone)}
                              disabled={!newPhone.phoneNumber || addPhoneMutation.isPending}
                              data-testid="button-add-phone"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Email Addresses */}
                    <div>
                      <Label className="text-muted-foreground">Email Addresses</Label>
                      <div className="space-y-2 mt-2">
                        {details.emails.map((email) => (
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
                                  className="px-3 py-2 border border-input rounded-md"
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
                              onChange={(e) => setNewEmail(prev => ({ ...prev, email: e.target.value }))}
                              className="flex-1"
                              data-testid="input-new-email"
                            />
                            <select
                              value={newEmail.emailType}
                              onChange={(e) => setNewEmail(prev => ({ ...prev, emailType: e.target.value as any }))}
                              className="px-3 py-2 border border-input rounded-md"
                            >
                              <option value="personal">Personal</option>
                              <option value="work">Work</option>
                              <option value="other">Other</option>
                            </select>
                            <Button
                              size="sm"
                              onClick={() => newEmail.email && addEmailMutation.mutate(newEmail)}
                              disabled={!newEmail.email || addEmailMutation.isPending}
                              data-testid="button-add-email"
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
                    <CardTitle className="flex items-center justify-between">
                      Notes
                      <span className="text-xs text-muted-foreground">
                        {notes.length}/500 characters
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditing && canEdit ? (
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

                {/* Activity Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
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
                            {user.role === 'admin' && (
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
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                {isEditing && canEdit && (
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleSave}
                      disabled={updateContactMutation.isPending}
                      className="flex-1"
                      data-testid="button-save"
                    >
                      {updateContactMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
