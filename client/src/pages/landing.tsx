import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mx-auto">
            <i className="fas fa-vote-yea text-primary-foreground text-2xl"></i>
          </div>
          <CardTitle className="text-2xl font-bold">VoterVault</CardTitle>
          <CardDescription className="text-base">
            Secure contacts directory with smart search and audit trails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-3">
              <i className="fas fa-search text-primary"></i>
              <span>Smart search with nickname matching</span>
            </div>
            <div className="flex items-center space-x-3">
              <i className="fas fa-shield-alt text-primary"></i>
              <span>Role-based access control</span>
            </div>
            <div className="flex items-center space-x-3">
              <i className="fas fa-history text-primary"></i>
              <span>Complete audit trail</span>
            </div>
            <div className="flex items-center space-x-3">
              <i className="fas fa-users text-primary"></i>
              <span>Multi-user collaboration</span>
            </div>
          </div>
          
          <Button 
            onClick={handleLogin} 
            className="w-full"
            data-testid="button-login"
          >
            Sign In to Continue
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            Secure authentication powered by Replit
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
