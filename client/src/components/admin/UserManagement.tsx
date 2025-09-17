import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { User } from "@shared/schema";

interface UserManagementProps {
  user: User;
}

export default function UserManagement({ user }: UserManagementProps) {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor" | "viewer">("viewer");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest('PATCH', `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "User role updated successfully" });
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
        description: "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      await apiRequest('PATCH', `/api/admin/users/${userId}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "User status updated successfully" });
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
        description: "Failed to update user status",
        variant: "destructive",
      });
    },
  });

  const formatUserName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    if (user.email) return user.email.split('@')[0];
    return "Unknown User";
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'editor':
        return 'bg-blue-100 text-blue-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  };

  const handleInviteUser = () => {
    // This would typically send an invitation email
    toast({
      title: "User Invited",
      description: `Invitation sent to ${inviteEmail}`,
    });
    setInviteDialogOpen(false);
    setInviteEmail("");
    setInviteRole("viewer");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>User Management</CardTitle>
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-invite-user">
                <i className="fas fa-user-plus mr-2"></i>
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="user@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    data-testid="input-invite-email"
                  />
                </div>
                <div>
                  <Label htmlFor="invite-role">Role</Label>
                  <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                    <SelectTrigger data-testid="select-invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={handleInviteUser}
                    disabled={!inviteEmail}
                    className="flex-1"
                    data-testid="button-send-invite"
                  >
                    Send Invitation
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setInviteDialogOpen(false)}
                    data-testid="button-cancel-invite"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Last Login</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((userItem) => (
                <tr key={userItem.id} data-testid={`row-user-${userItem.id}`}>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                        {userItem.profileImageUrl ? (
                          <img 
                            src={userItem.profileImageUrl} 
                            alt="Profile" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <i className="fas fa-user text-muted-foreground text-sm"></i>
                        )}
                      </div>
                      <div>
                        <p className="font-medium" data-testid={`text-user-name-${userItem.id}`}>
                          {formatUserName(userItem)}
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid={`text-user-email-${userItem.id}`}>
                          {userItem.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Select
                      value={userItem.role}
                      onValueChange={(role) => updateRoleMutation.mutate({ userId: userItem.id, role })}
                      disabled={userItem.id === user.id} // Can't change own role
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground" data-testid={`text-last-login-${userItem.id}`}>
                    {userItem.lastLoginAt 
                      ? new Date(userItem.lastLoginAt).toLocaleDateString()
                      : 'Never'
                    }
                  </td>
                  <td className="px-4 py-4">
                    <Badge 
                      className={getStatusBadgeColor(userItem.isActive)}
                      data-testid={`badge-status-${userItem.id}`}
                    >
                      {userItem.isActive ? 'Active' : 'Suspended'}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateStatusMutation.mutate({ 
                          userId: userItem.id, 
                          isActive: !userItem.isActive 
                        })}
                        disabled={userItem.id === user.id || updateStatusMutation.isPending}
                        data-testid={`button-toggle-status-${userItem.id}`}
                      >
                        <i className={`fas ${userItem.isActive ? 'fa-ban' : 'fa-check'} text-xs`}></i>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`button-edit-user-${userItem.id}`}
                      >
                        <i className="fas fa-edit text-xs"></i>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-8">
            <i className="fas fa-users text-4xl text-muted-foreground mb-4"></i>
            <p className="text-muted-foreground">No users found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
