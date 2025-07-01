import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Youtube, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface GoogleAuthButtonProps {
  variant?: 'card' | 'button' | 'hero' | 'header';
  size?: 'sm' | 'lg' | 'default';
}

interface GoogleStatus {
  connected: boolean;
}

export default function GoogleAuthButton({ variant = 'card', size = 'default' }: GoogleAuthButtonProps) {
  const { data: googleStatus, isLoading } = useQuery<GoogleStatus>({
    queryKey: ['/api/auth/google-status'],
    retry: false, // Don't retry on auth failures
  });

  const handleGoogleAuth = () => {
    window.location.href = '/auth/google';
  };

  // Button variants for landing page
  if (variant === 'button' || variant === 'hero' || variant === 'header') {
    if (isLoading) {
      return (
        <Button disabled size={size} className="gradient-primary text-white">
          Loading...
        </Button>
      );
    }

    if (googleStatus?.connected) {
      return (
        <Button 
          onClick={() => window.location.href = '/dashboard'}
          size={size} 
          className="gradient-primary text-white"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {variant === 'hero' ? 'Go to Dashboard' : 'Dashboard'}
        </Button>
      );
    }

    return (
      <Button 
        onClick={handleGoogleAuth}
        size={size}
        className="gradient-primary text-white"
      >
        <Youtube className="h-4 w-4 mr-2" />
        {variant === 'hero' ? 'Start Creating Guides' : variant === 'header' ? 'Sign In' : 'Connect Google'}
      </Button>
    );
  }

  // Card variant (original functionality)
  if (isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-600" />
            YouTube Integration
          </CardTitle>
          <CardDescription>
            Loading connection status...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (googleStatus?.connected) {
    return (
      <Card className="w-full max-w-md border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
            <CheckCircle className="h-5 w-5" />
            YouTube Connected
          </CardTitle>
          <CardDescription className="text-green-600 dark:text-green-400">
            Your Google account is connected. You can now access YouTube videos with captions.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
          <AlertCircle className="h-5 w-5" />
          YouTube Access Required
        </CardTitle>
        <CardDescription className="text-orange-600 dark:text-orange-400">
          Connect your Google account to access YouTube videos with captions for transcription.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleGoogleAuth}
          className="w-full bg-red-600 hover:bg-red-700 text-white"
        >
          <Youtube className="h-4 w-4 mr-2" />
          Connect Google Account
        </Button>
      </CardContent>
    </Card>
  );
}