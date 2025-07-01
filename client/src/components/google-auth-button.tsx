import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Youtube, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function GoogleAuthButton() {
  const { data: googleStatus, isLoading } = useQuery({
    queryKey: ['/api/auth/google-status'],
  });

  const handleGoogleAuth = () => {
    window.location.href = '/auth/google';
  };

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