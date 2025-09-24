import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useLocation, useRoute } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import annaVerseIcon from "@assets/AnnaVerse_1758230016506.png";
import skylineBackground from "@assets/transparent skyline_1758230016506.png";

interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Extract token from URL parameters
  const [match, params] = useRoute("/reset-password/:token");
  const token = params?.token;

  useEffect(() => {
    if (!token) {
      toast({
        title: "Invalid Reset Link",
        description: "The password reset link is invalid or expired.",
        variant: "destructive",
      });
      setTimeout(() => setLocation("/forgot-password"), 3000);
    }
  }, [token, toast, setLocation]);

  const resetPasswordMutation = useMutation<ResetPasswordResponse, Error, ResetPasswordRequest>({
    mutationFn: async (data) => {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reset password");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setIsSuccess(true);
      toast({
        title: "Password Reset Successfully",
        description: data.message,
      });
      // Redirect to login after 3 seconds
      setTimeout(() => setLocation("/login"), 3000);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (!token) {
      toast({
        title: "Error",
        description: "Invalid reset token",
        variant: "destructive",
      });
      return;
    }

    resetPasswordMutation.mutate({ token, newPassword: password });
  };

  if (isSuccess) {
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
            <CardTitle className="text-2xl font-bold">Password Reset Complete</CardTitle>
            <CardDescription className="text-center">
              Your password has been successfully reset. You will be redirected to the login page.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/login" className="text-sm text-primary hover:underline">
              Go to Login Now
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) {
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
            <CardTitle className="text-2xl font-bold">Invalid Reset Link</CardTitle>
            <CardDescription className="text-center">
              The password reset link is invalid or expired. Please request a new one.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              Request New Reset Link
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
          <CardDescription className="text-center">
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your new password"
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters long
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                required
                minLength={8}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-primary hover:underline">
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}