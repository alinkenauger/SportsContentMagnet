import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, CheckCircle } from "lucide-react";

export default function CompleteAccount() {
  const { toast } = useToast();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [userInfo, setUserInfo] = useState<{ firstName: string; lastName: string; email: string } | null>(null);

  useEffect(() => {
    // Get user info from URL params or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const firstName = urlParams.get('firstName') || localStorage.getItem('signup_firstName');
    const lastName = urlParams.get('lastName') || localStorage.getItem('signup_lastName');
    const email = urlParams.get('email') || localStorage.getItem('signup_email');
    
    console.log('CompleteAccount - checking for user data:', { firstName, lastName, email });
    
    if (firstName && lastName && email) {
      setUserInfo({ firstName, lastName, email });
      // Clear from localStorage after using
      localStorage.removeItem('signup_firstName');
      localStorage.removeItem('signup_lastName');
      localStorage.removeItem('signup_email');
    } else {
      // If no user info, redirect to signup
      console.log('CompleteAccount - no user data found, redirecting to home');
      window.location.href = "/";
    }
  }, []);

  const completeAccountMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      return apiRequest("/api/auth/complete-account", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Account Setup Complete!",
        description: "Welcome to ConvertMag.net! You're now logged in.",
      });
      // Small delay to allow authentication state to update, then redirect
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userInfo) return;
    
    if (password.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords match.",
        variant: "destructive",
      });
      return;
    }
    
    completeAccountMutation.mutate({
      email: userInfo.email,
      password: password,
    });
  };

  if (!userInfo) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Complete Your Account</CardTitle>
          <CardDescription>
            Welcome to ConvertMag.net! Just set a password to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Account Details</h3>
              <p className="text-sm text-gray-600">
                <strong>Name:</strong> {userInfo.firstName} {userInfo.lastName}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Email:</strong> {userInfo.email}
              </p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Create Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  minLength={8}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                minLength={8}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
              disabled={completeAccountMutation.isPending}
            >
              {completeAccountMutation.isPending ? "Setting up account..." : "Complete Setup"}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>By completing your account, you agree to our Terms of Service and Privacy Policy.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}