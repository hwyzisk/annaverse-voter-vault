import type { User } from "@shared/schema";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  user: User;
  onAdminClick?: () => void;
  onRecentActivityClick?: () => void;
  onSavedSearchesClick?: () => void;
}

export default function Sidebar({ user, onAdminClick, onRecentActivityClick, onSavedSearchesClick }: SidebarProps) {
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
            <i className="fas fa-vote-yea text-primary-foreground text-sm"></i>
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
              <i className="fas fa-search w-5"></i>
              <span>Search Contacts</span>
            </a>
          </li>
          <li>
            <button
              onClick={() => onRecentActivityClick?.()}
              className="flex items-center space-x-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full text-left"
              data-testid="button-recent"
            >
              <i className="fas fa-history w-5"></i>
              <span>Recent Activity</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => onSavedSearchesClick?.()}
              className="flex items-center space-x-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full text-left"
              data-testid="button-saved"
            >
              <i className="fas fa-bookmark w-5"></i>
              <span>Saved Searches</span>
            </button>
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
                  <i className="fas fa-users w-5"></i>
                  <span>User Management</span>
                </button>
              </li>
              <li>
                <button
                  onClick={onAdminClick}
                  className="flex items-center space-x-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full text-left"
                  data-testid="button-audit-logs"
                >
                  <i className="fas fa-clipboard-list w-5"></i>
                  <span>Audit Logs</span>
                </button>
              </li>
              <li>
                <button
                  onClick={onAdminClick}
                  className="flex items-center space-x-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground w-full text-left"
                  data-testid="button-settings"
                >
                  <i className="fas fa-cog w-5"></i>
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
              <i className="fas fa-user text-muted-foreground text-sm"></i>
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
          <i className="fas fa-sign-out-alt mr-2"></i>Sign Out
        </Button>
      </div>
    </aside>
  );
}
