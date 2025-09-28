import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Check,
  X,
  UserCheck,
  UserX,
  Power,
  PowerOff,
  Edit3
} from "lucide-react";
import type { User as UserType } from "@shared/schema";

interface UserProfileModalProps {
  user: UserType | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
}

export default function UserProfileModal({ user, isOpen, onClose, currentUser }: UserProfileModalProps) {
  const [editingRole, setEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize role when user changes
  useEffect(() => {
    if (user?.role) {
      setSelectedRole(user.role);
    }
  }, [user?.role]);

  // Approve user mutation
  const approveUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('PATCH', `/api/admin/users/${userId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "User approved successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve user",
        variant: "destructive"
      });
    },
  });

  // Reject user mutation
  const rejectUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('PATCH', `/api/admin/users/${userId}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "User rejected" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject user",
        variant: "destructive"
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest('PATCH', `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setEditingRole(false);
      toast({ title: "User role updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive"
      });
    },
  });

  // Toggle status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      return await apiRequest('PATCH', `/api/admin/users/${userId}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "User status updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status",
        variant: "destructive"
      });
    },
  });

  if (!user) return null;

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "Not provided";
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending Approval</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-100 text-purple-800">Admin</Badge>;
      case 'editor':
        return <Badge className="bg-blue-100 text-blue-800">Editor</Badge>;
      case 'viewer':
        return <Badge className="bg-gray-100 text-gray-800">Viewer</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-2 pr-2">
            <User className="w-5 h-5" />
            User Profile: {user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : user.email}
          </DialogTitle>
          <DialogDescription className="pr-2">
            Complete user registration information and administrative controls
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Role Header */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  {getStatusBadge(user.status || 'pending')}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Role:</span>
                  {editingRole ? (
                    <div className="flex items-center gap-2">
                      <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateRoleMutation.mutate({ userId: user.id, role: selectedRole })}
                        disabled={updateRoleMutation.isPending}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingRole(false);
                          setSelectedRole(user.role);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {getRoleBadge(user.role)}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingRole(true)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Badge
                variant={user.isActive ? 'default' : 'secondary'}
                className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}
              >
                {user.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {user.status === 'pending' && (
              <>
                <Button
                  onClick={() => approveUserMutation.mutate(user.id)}
                  disabled={approveUserMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Approve User
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => rejectUserMutation.mutate(user.id)}
                  disabled={rejectUserMutation.isPending}
                >
                  <UserX className="w-4 h-4 mr-2" />
                  Reject User
                </Button>
              </>
            )}

            {user.id !== currentUser.id && (
              <Button
                variant="outline"
                onClick={() => toggleStatusMutation.mutate({
                  userId: user.id,
                  isActive: !user.isActive
                })}
                disabled={toggleStatusMutation.isPending}
              >
                {user.isActive ? (
                  <>
                    <PowerOff className="w-4 h-4 mr-2" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4 mr-2" />
                    Activate
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">First Name</label>
                  <p className="text-sm">{user.firstName || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                  <p className="text-sm">{user.lastName || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                  <p className="text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {formatDate(user.dateOfBirth)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Registration Date</label>
                  <p className="text-sm">{formatDate(user.createdAt || null)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                <p className="text-sm flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {user.email || "Not provided"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                <p className="text-sm flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {user.phone || "Not provided"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Address Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Street Address</label>
                <p className="text-sm">{user.address || "Not provided"}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">City</label>
                  <p className="text-sm">{user.city || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">State</label>
                  <p className="text-sm">{user.state || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ZIP Code</label>
                  <p className="text-sm">{user.zipCode || "Not provided"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Login</label>
                  <p className="text-sm">{formatDate(user.lastLoginAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Account Created</label>
                  <p className="text-sm">{formatDate(user.createdAt || null)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                  <p className="text-sm">{formatDate(user.updatedAt || null)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User ID</label>
                  <p className="text-xs font-mono bg-muted px-2 py-1 rounded">{user.id}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}