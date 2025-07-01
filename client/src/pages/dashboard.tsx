import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import StatsCard from "@/components/stats-card";
import GuideCard from "@/components/guide-card";
import ProcessingModal from "@/components/processing-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Book, Users, TrendingUp, ExternalLink, Plus, Sparkles, Palette, Eye, Edit, BarChart3, Bell } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface DashboardStats {
  totalGuides: number;
  totalLeads: number;
  totalViews: number;
  totalDownloads: number;
  avgConversionRate: number;
}

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingSteps, setProcessingSteps] = useState([
    { id: "metadata", title: "Video metadata extracted", status: "pending" as const },
    { id: "transcript", title: "Content transcribed", status: "pending" as const },
    { id: "analysis", title: "Analyzing coaching insights...", status: "pending" as const },
    { id: "guide", title: "Generating practice guide", status: "pending" as const },
  ]);
  const [currentStep, setCurrentStep] = useState("");
  const [progress, setProgress] = useState(0);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    enabled: isAuthenticated,
  });

  const { data: guides, isLoading: guidesLoading, refetch: refetchGuides } = useQuery({
    queryKey: ["/api/guides"],
    enabled: isAuthenticated,
  });

  const handleCreateGuide = async () => {
    if (!youtubeUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a YouTube URL",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setCurrentStep("metadata");

    // Simulate processing steps
    const stepTimings = [
      { step: "metadata", duration: 1000, progress: 25 },
      { step: "transcript", duration: 2000, progress: 50 },
      { step: "analysis", duration: 3000, progress: 75 },
      { step: "guide", duration: 2000, progress: 100 },
    ];

    try {
      for (const { step, duration, progress: stepProgress } of stepTimings) {
        setCurrentStep(step);
        setProcessingSteps(prev => 
          prev.map(s => 
            s.id === step ? { ...s, status: "processing" } : s
          )
        );
        
        await new Promise(resolve => setTimeout(resolve, duration));
        
        setProgress(stepProgress);
        setProcessingSteps(prev => 
          prev.map(s => 
            s.id === step ? { ...s, status: "completed" } : s
          )
        );
      }

      // Actually create the guide
      await apiRequest("POST", "/api/guides", { youtubeUrl });
      
      toast({
        title: "Success",
        description: "Guide created successfully!",
      });
      
      setYoutubeUrl("");
      refetchGuides();
    } catch (error) {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to create guide. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingSteps(prev => prev.map(s => ({ ...s, status: "pending" })));
      setProgress(0);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
              <p className="text-muted-foreground mt-1">
                Transform your YouTube videos into high-converting lead magnets
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                  3
                </span>
              </Button>
              <Button className="gradient-primary text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create New Guide
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 flex-shrink-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Guides"
              value={stats?.totalGuides || 0}
              change="+12%"
              changeType="positive"
              icon={Book}
              iconColor="text-primary"
            />
            <StatsCard
              title="Total Leads"
              value={stats?.totalLeads || 0}
              change="+23%"
              changeType="positive"
              icon={Users}
              iconColor="text-secondary"
            />
            <StatsCard
              title="Conversion Rate"
              value={`${stats?.avgConversionRate?.toFixed(1) || 0}%`}
              change="+5.1%"
              changeType="positive"
              icon={TrendingUp}
              iconColor="text-accent"
            />
            <StatsCard
              title="Active Landing Pages"
              value={guides?.length || 0}
              change="+8"
              changeType="positive"
              icon={ExternalLink}
              iconColor="text-purple-600"
            />
          </div>

          {/* Quick Action - Create New Guide */}
          <Card className="gradient-primary text-white mb-8">
            <CardContent className="p-8">
              <div className="max-w-2xl">
                <h3 className="text-2xl font-bold mb-3">Transform Your Next Video</h3>
                <p className="text-blue-100 mb-6">
                  Paste a YouTube URL and let our AI extract valuable coaching insights to create your next lead magnet in minutes.
                </p>
                
                <div className="flex space-x-4">
                  <Input
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="flex-1 bg-white text-slate-800 placeholder-slate-500"
                    disabled={isProcessing}
                  />
                  <Button 
                    onClick={handleCreateGuide}
                    disabled={isProcessing}
                    className="bg-white text-primary hover:bg-gray-50"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Guide
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Guides - Table Format */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Guides</CardTitle>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {guidesLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center space-x-4">
                        <div className="w-20 h-14 bg-muted rounded-lg"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : guides && guides.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left p-4 font-medium text-muted-foreground">Guide</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Conversion Funnel</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Landing Page</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Guide Page</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guides.slice(0, 5).map((guide: any) => (
                        <tr key={guide.id} className="border-b hover:bg-muted/50 transition-colors">
                          {/* Guide Info */}
                          <td className="p-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-8 rounded-md overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                {guide.thumbnailUrl ? (
                                  <img src={guide.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Book className="w-4 h-4 text-white" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-foreground truncate">{guide.title}</p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {guide.createdAt ? new Date(guide.createdAt).toLocaleDateString() : 'No date'}
                                </p>
                              </div>
                            </div>
                          </td>
                          
                          {/* Conversion Funnel */}
                          <td className="p-4">
                            <div className="space-y-2">
                              {/* Views */}
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center">
                                  <Eye className="w-3 h-3 mr-1 text-blue-500" />
                                  <span className="text-muted-foreground">Views</span>
                                </div>
                                <span className="font-medium">{guide.views || 0}</span>
                              </div>
                              
                              {/* Visual Funnel */}
                              <div className="relative">
                                <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-blue-500 rounded-full transition-all"
                                    style={{ width: '100%' }}
                                  ></div>
                                </div>
                                <div className="w-4/5 h-1.5 bg-green-100 rounded-full overflow-hidden mt-1 ml-2">
                                  <div 
                                    className="h-full bg-green-500 rounded-full transition-all"
                                    style={{ width: guide.views > 0 ? `${Math.min(100, ((0) / guide.views) * 100)}%` : '0%' }}
                                  ></div>
                                </div>
                              </div>
                              
                              {/* Leads */}
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center">
                                  <Users className="w-3 h-3 mr-1 text-green-500" />
                                  <span className="text-muted-foreground">Leads</span>
                                </div>
                                <span className="font-medium">0</span>
                              </div>
                            </div>
                          </td>
                          
                          {/* Landing Page Link */}
                          <td className="p-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </td>
                          
                          {/* Guide Page Link */}
                          <td className="p-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </td>
                          
                          {/* Actions */}
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              >
                                <BarChart3 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Book className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No guides yet. Create your first guide above!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Overview - Full Width */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Top Performing Guides */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                {guides && guides.length > 0 ? (
                  <div className="space-y-4">
                    {guides
                      .sort((a: any, b: any) => (b.conversionRate || 0) - (a.conversionRate || 0))
                      .slice(0, 3)
                      .map((guide: any) => (
                        <div key={guide.id} className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {guide.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {guide.downloads || 0} conversions
                            </p>
                          </div>
                          <Badge variant="secondary">
                            {guide.conversionRate || 0}%
                          </Badge>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Create guides to see top performers
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  <Button variant="ghost" className="w-full justify-start">
                    <Palette className="w-4 h-4 mr-3" />
                    Update Branding
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    <ExternalLink className="w-4 h-4 mr-3" />
                    Manage Integrations
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    <TrendingUp className="w-4 h-4 mr-3" />
                    Export Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-muted-foreground">New lead captured</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-muted-foreground">Guide viewed 12 times</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                    <span className="text-muted-foreground">Landing page updated</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Processing Modal */}
      <ProcessingModal
        isOpen={isProcessing}
        steps={processingSteps}
        currentStep={currentStep}
        progress={progress}
      />
    </div>
  );
}
