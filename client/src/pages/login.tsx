import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import annaVerseIcon from "@assets/AnnaVerse_1758230016506.png";
import skylineBackground from "@assets/transparent skyline_1758230016506.png";

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  user?: any;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const loginMutation = useMutation<LoginResponse, Error, LoginCredentials>({
    mutationFn: async (credentials) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Success",
          description: "Welcome back!",
        });
        // Invalidate auth query to trigger re-fetch
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        // Explicitly redirect to home page
        setLocation("/");
      } else {
        toast({
          title: "Login Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ email, password });
  };

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
          <CardTitle className="text-2xl font-bold">The Annaverse App</CardTitle>
          <CardDescription className="text-center">
            Access your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Logging in..." : "Login"}
            </Button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="text-center space-y-2">
              <Link href="/forgot-password" className="text-sm text-primary hover:underline block">
                Forgot your password?
              </Link>
              <Link href="/register" className="text-sm text-primary hover:underline">
                Don't have an account? Register here
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}