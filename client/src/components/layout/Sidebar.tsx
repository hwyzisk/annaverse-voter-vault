import type { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Vote, Search, Users, ClipboardList, Settings, LogOut, User as UserIcon, Heart, TrendingUp, MessageSquare, Share2 } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useTheme } from "@/contexts/ThemeContext";
import { Link, useLocation } from "wouter";

interface SidebarProps {
  user: User;
  onAdminClick?: () => void;
}

export default function Sidebar({ user, onAdminClick }: SidebarProps) {
  const [currentPath] = useLocation();
  const { theme } = useTheme();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const formatName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    if (user.email) return user.email.split('@')[0];
    return "User";
  };

  const formatRole = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const getLinkClassName = (path: string) => {
    const isActive = currentPath === path;
    return `flex items-center space-x-3 px-3 py-2 rounded-md ${
      isActive
        ? 'bg-primary text-primary-foreground'
        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
    }`;
  };

  // Theme-aware logo path; fall back to light if dark/party missing
  const logoSrc = theme === 'glass'
    ? '/logos/logo-party.png'
    : theme === 'dark'
      ? '/logos/logo-dark.png'
      : '/logos/logo-light.png';

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        {/* Replace old icon + text with theme-aware logo */}
        <Link href="/" className="block" aria-label="Home">
          <div className="w-full h-16 md:h-20 flex items-center justify-center">
            <img
              src={logoSrc}
              alt="App logo"
              className="max-h-full max-w-[92%] w-auto object-contain select-none"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (!img.src.endsWith('/logos/logo-light.png')) {
                  img.src = '/logos/logo-light.png';
                  img.style.display = 'block';
                }
              }}
            />
          </div>
        </Link>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          <li>
            <Link
              href="/"
              className={getLinkClassName('/')}
              data-testid="link-search"
            >
              <Search className="w-5 h-5" />
              <span>Search Contacts</span>
            </Link>
          </li>

          {(user.role === 'admin' || user.role === 'editor') && (
            <li>
              <Link
                href="/network"
                className={getLinkClassName('/network')}
                data-testid="link-network"
              >
                <Heart className="w-5 h-5" />
                <span>My Network</span>
              </Link>
            </li>
          )}

          <li>
            <Link
              href="/our-impact"
              className={getLinkClassName('/our-impact')}
              data-testid="link-our-impact"
            >
              <TrendingUp className="w-5 h-5" />
              <span>Our Impact</span>
            </Link>
          </li>

          <li>
            <Link
              href="/talking-points"
              className={getLinkClassName('/talking-points')}
              data-testid="link-talking-points"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Talking Points</span>
            </Link>
          </li>

          <li>
            <Link
              href="/share"
              className={getLinkClassName('/share')}
              data-testid="link-share"
            >
              <Share2 className="w-5 h-5" />
              <span>Share Anna's Story</span>
            </Link>
          </li>
        </ul>
      </nav>
      
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center overflow-hidden">
            {user.profileImageUrl ? (
              <img 
                src={user.profileImageUrl} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-username">
              {formatName(user)}
            </p>
            <p className="text-xs text-muted-foreground" data-testid="text-user-role">
              {formatRole(user.role)}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Last login: <span data-testid="text-last-login">
            {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
          </span>
        </p>
        <div className="space-y-1">
          <ThemeToggle variant="minimal" />
          {user.role === 'admin' && (
            <Button
              variant="ghost"
              onClick={onAdminClick}
              className="w-full justify-start px-2 py-2 h-auto text-sm text-muted-foreground hover:text-foreground hover:bg-accent"
              data-testid="button-admin-tools"
            >
              <Settings className="w-4 h-4 mr-3" />
              <span>Admin Tools</span>
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start px-2 py-2 h-auto text-sm text-muted-foreground hover:text-foreground hover:bg-accent"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4 mr-3" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>
    </aside>
  );
}
