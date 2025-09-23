import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import annaVerseIcon from "@assets/AnnaVerse_1758230016506.png";
import skylineBackground from "@assets/transparent skyline_1758230016506.png";

export default function Landing() {

  return (
    <div 
      className="min-h-screen bg-background flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url(${skylineBackground})`,
        backgroundPosition: 'bottom center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover'
      }}
    >
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-background/80"></div>
      
      <Card className="w-full max-w-md relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto">
            <img 
              src={annaVerseIcon} 
              alt="AnnaVerse"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to AnnaVerse</CardTitle>
          <CardDescription className="text-base font-medium">
            Where grassroots organizing meets community power!
          </CardDescription>
          <CardDescription className="text-sm">
            Log in to help us reach voters through personal relationships.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button
            className="w-full"
            asChild
            data-testid="button-login"
          >
            <Link href="/login">
              Sign In to Continue
            </Link>
          </Button>
          
          <Button 
            variant="outline"
            className="w-full" 
            asChild
            data-testid="button-request-join"
          >
            <Link href="/register">
              Request To Join
            </Link>
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            Powered by the people!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
