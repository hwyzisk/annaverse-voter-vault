import { useState } from "react";
import type { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, User as UserIcon, Settings, LogOut, Menu } from "lucide-react";

interface HeaderProps {
  user: User;
  onProfileClick?: () => void;
  onNotificationClick?: () => void;
  onMobileMenuClick?: () => void;
  showMobileMenu?: boolean;
}

export default function Header({ user, onProfileClick, onNotificationClick, onMobileMenuClick, showMobileMenu }: HeaderProps) {
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
          {showMobileMenu && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMobileMenuClick}
              className="md:hidden"
              aria-label="Open navigation menu"
              aria-expanded="false"
              data-testid="button-mobile-menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
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
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
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
                <UserIcon className="mr-2 w-4 h-4" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 w-4 h-4" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 w-4 h-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
