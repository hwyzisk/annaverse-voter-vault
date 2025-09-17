import { useState } from "react";
import type { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  user: User;
  onProfileClick?: () => void;
  onNotificationClick?: () => void;
}

export default function Header({ user, onProfileClick, onNotificationClick }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  
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
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold">Contact Search</h2>
          <span className="text-sm text-muted-foreground" data-testid="text-total-contacts">
            Loading contacts...
          </span>
        </div>
        <div className="flex items-center space-x-3">
          
          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10 px-3"
                data-testid="button-profile"
              >
                <div className="flex items-center space-x-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user.profileImageUrl || undefined} />
                    <AvatarFallback className="text-sm font-medium">
                      {getInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                  <Badge variant="secondary" className="text-xs">
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                  <i className="fas fa-chevron-down text-xs text-muted-foreground"></i>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="p-3">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.profileImageUrl || undefined} />
                    <AvatarFallback className="font-medium">
                      {getInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{formatName(user)}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <Badge variant="secondary" className="text-xs">
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onProfileClick?.()}>
                <i className="fas fa-user mr-2 w-4"></i>
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <i className="fas fa-cog mr-2 w-4"></i>
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <i className="fas fa-sign-out-alt mr-2 w-4"></i>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
