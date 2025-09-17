import type { User } from "@shared/schema";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  user: User;
}

export default function Header({ user }: HeaderProps) {
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
          <Button
            variant="ghost"
            size="sm"
            className="relative p-2 text-muted-foreground hover:text-foreground"
            data-testid="button-notifications"
          >
            <i className="fas fa-bell"></i>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 text-muted-foreground hover:text-foreground"
            data-testid="button-help"
          >
            <i className="fas fa-question-circle"></i>
          </Button>
        </div>
      </div>
    </header>
  );
}
