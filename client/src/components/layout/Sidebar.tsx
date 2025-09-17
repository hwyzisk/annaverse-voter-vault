import type { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Vote, Search, Users, ClipboardList, Settings, LogOut, User as UserIcon } from "lucide-react";

interface SidebarProps {
  user: User;
  onAdminClick?: () => void;
}

export default function Sidebar({ user, onAdminClick }: SidebarProps) {
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

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Vote className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">VoterVault</h1>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          <li>
            <a 
              href="#" 
              className="flex items-center space-x-3 px-3 py-2 rounded-md bg-primary text-primary-foreground"
              data-testid="link-search"
            >
              <Search className="w-5 h-5" />
              <span>Search Contacts</span>
            </a>
          </li>
          
          {user.role === 'admin' && (
            <>
              <li className="pt-4 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 pb-2">
                  Admin Tools
                </p>
                <button
                  onClick={onAdminClick}
                  className="flex items-center space-x-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full text-left"
                  data-testid="button-user-management"
                >
                  <Users className="w-5 h-5" />
                  <span>User Management</span>
                </button>
              </li>
              <li>
                <button
                  onClick={onAdminClick}
                  className="flex items-center space-x-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full text-left"
                  data-testid="button-audit-logs"
                >
                  <ClipboardList className="w-5 h-5" />
                  <span>Audit Logs</span>
                </button>
              </li>
              <li>
                <button
                  onClick={onAdminClick}
                  className="flex items-center space-x-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full text-left"
                  data-testid="button-settings"
                >
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </button>
              </li>
            </>
          )}
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
        <p className="text-xs text-muted-foreground mb-2">
          Last login: <span data-testid="text-last-login">
            {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
          </span>
        </p>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start p-0 h-auto text-sm text-muted-foreground hover:text-foreground"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4 mr-2" />Sign Out
        </Button>
      </div>
    </aside>
  );
}
