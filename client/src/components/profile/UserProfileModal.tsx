import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { User } from "@shared/schema";

interface UserProfileModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ user, isOpen, onClose }: UserProfileModalProps) {
  const formatName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    if (user.email) return user.email.split('@')[0];
    return "User";
  };
  
  const getInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    if (user.firstName) return user.firstName[0];
    if (user.email) return user.email[0].toUpperCase();
    return "U";
  };
  
  const handleLogout = () => {
    window.location.href = "/api/logout";
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Account Information</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Profile Section */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user.profileImageUrl || undefined} />
                  <AvatarFallback className="text-xl font-medium">
                    {getInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-lg" data-testid="profile-name">
                    {formatName(user)}
                  </h3>
                  <p className="text-sm text-muted-foreground" data-testid="profile-email">
                    {user.email}
                  </p>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Account Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">User ID</p>
                  <p className="font-medium" data-testid="profile-id">{user.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={user.isActive ? 'default' : 'destructive'} className="text-xs">
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Login</p>
                  <p className="font-medium" data-testid="profile-last-login">
                    {user.lastLoginAt 
                      ? new Date(user.lastLoginAt).toLocaleString()
                      : 'Never'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Member Since</p>
                  <p className="font-medium" data-testid="profile-created">
                    {user.createdAt 
                      ? new Date(user.createdAt).toLocaleDateString()
                      : 'Unknown'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Permissions and Access */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Access and Permissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">View Contacts</span>
                  <i className="fas fa-check text-green-500"></i>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Edit Contact Details</span>
                  <i className={`fas ${user.role !== 'viewer' ? 'fa-check text-green-500' : 'fa-times text-red-500'}`}></i>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Admin Dashboard</span>
                  <i className={`fas ${user.role === 'admin' ? 'fa-check text-green-500' : 'fa-times text-red-500'}`}></i>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Import Data</span>
                  <i className={`fas ${user.role === 'admin' ? 'fa-check text-green-500' : 'fa-times text-red-500'}`}></i>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">User Management</span>
                  <i className={`fas ${user.role === 'admin' ? 'fa-check text-green-500' : 'fa-times text-red-500'}`}></i>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Separator />
          
          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Close
            </Button>
            <Button variant="destructive" onClick={handleLogout} data-testid="button-logout-profile">
              <i className="fas fa-sign-out-alt mr-2"></i>
              Sign Out
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}