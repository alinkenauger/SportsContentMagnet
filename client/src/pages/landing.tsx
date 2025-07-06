import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Users, TrendingUp, Zap } from "lucide-react";
import GoogleAuthButton from "@/components/google-auth-button";
import { useBranding } from "@/hooks/useBranding";

export default function Landing() {
  const { logoUrl, companyName } = useBranding();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
      {/* Header */}
      <header className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="h-16 w-auto object-contain"
              />
            ) : (
              <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
                <Video className="w-6 h-6 text-white" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-foreground">{companyName}</h1>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={() => window.location.href = '/sales'}>
              Get Started Free
            </Button>
            <Button onClick={() => window.location.href = '/api/login'}>
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-foreground mb-6">
            Transform Your YouTube Videos Into 
            <span className="gradient-primary bg-clip-text text-transparent"> High-Converting Lead Magnets</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Automatically extract valuable coaching insights from your videos and create branded practice guides that convert viewers into leads.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <GoogleAuthButton variant="hero" size="lg" />
            <Button size="lg" variant="outline" onClick={() => window.location.href = '/api/login'}>
              Sign In with Replit
            </Button>
            <Button size="lg" variant="outline">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-foreground mb-4">
            Everything You Need to Convert Viewers
          </h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our AI-powered platform handles everything from content extraction to lead capture, 
            so you can focus on creating great content.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                <Video className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">AI Video Analysis</h4>
              <p className="text-sm text-muted-foreground">
                Automatically extract key coaching tips, drills, and techniques from your YouTube videos.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 gradient-secondary rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">Lead Capture Pages</h4>
              <p className="text-sm text-muted-foreground">
                Generate beautiful landing pages that capture leads with your branded practice guides.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 gradient-accent rounded-lg flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">Analytics & Tracking</h4>
              <p className="text-sm text-muted-foreground">
                Track conversion rates, engagement, and performance across all your lead magnets.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-950 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">Personalization</h4>
              <p className="text-sm text-muted-foreground">
                Create personalized experiences based on lead responses and skill levels.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-16">
        <Card className="gradient-primary text-white">
          <CardContent className="p-12 text-center">
            <h3 className="text-3xl font-bold mb-4">
              Ready to Turn Your Videos Into Lead Magnets?
            </h3>
            <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of fitness and sports coaches who are already converting their audience with VidMagnet.
            </p>
            <GoogleAuthButton variant="hero" size="lg" />
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 text-center text-muted-foreground">
        <p>&copy; 2024 CoachCraft. All rights reserved.</p>
      </footer>
    </div>
  );
}
