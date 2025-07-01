import { useEffect, useState, useRef } from "react";
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
  const [columnWidths, setColumnWidths] = useState([35, 20, 15, 15, 15]);
  const tableRef = useRef<HTMLTableElement>(null);
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

  // Column resize functionality
  const handleMouseDown = (columnIndex: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidths = [...columnWidths];

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const tableWidth = tableRef.current?.offsetWidth || 800;
      const deltaPercent = (deltaX / tableWidth) * 100;
      
      const newWidths = [...startWidths];
      newWidths[columnIndex] = Math.max(10, startWidths[columnIndex] + deltaPercent);
      newWidths[columnIndex + 1] = Math.max(10, startWidths[columnIndex + 1] - deltaPercent);
      
      setColumnWidths(newWidths);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

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
                  <table ref={tableRef} className="w-full table-fixed border-separate border-spacing-0">
                    <colgroup>
                      <col style={{ width: `${columnWidths[0]}%` }} />
                      <col style={{ width: `${columnWidths[1]}%` }} />
                      <col style={{ width: `${columnWidths[2]}%` }} />
                      <col style={{ width: `${columnWidths[3]}%` }} />
                      <col style={{ width: `${columnWidths[4]}%` }} />
                    </colgroup>
                    <thead className="border-b">
                      <tr>
                        <th className="text-left px-3 py-4 font-medium text-muted-foreground relative border-r border-gray-200">
                          Guide
                          <div 
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500 transition-colors bg-transparent"
                            onMouseDown={handleMouseDown(0)}
                          ></div>
                        </th>
                        <th className="text-left px-3 py-4 font-medium text-muted-foreground relative border-r border-gray-200">
                          Conversion Funnel
                          <div 
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500 transition-colors bg-transparent"
                            onMouseDown={handleMouseDown(1)}
                          ></div>
                        </th>
                        <th className="text-left px-3 py-4 font-medium text-muted-foreground relative border-r border-gray-200">
                          Landing Page
                          <div 
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500 transition-colors bg-transparent"
                            onMouseDown={handleMouseDown(2)}
                          ></div>
                        </th>
                        <th className="text-left px-3 py-4 font-medium text-muted-foreground relative border-r border-gray-200">
                          Guide Page
                          <div 
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500 transition-colors bg-transparent"
                            onMouseDown={handleMouseDown(3)}
                          ></div>
                        </th>
                        <th className="text-left px-3 py-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guides.slice(0, 5).map((guide: any) => (
                        <tr key={guide.id} className="border-b hover:bg-muted/50 transition-colors">
                          {/* Guide Info */}
                          <td className="px-3 py-3 border-r border-gray-200">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                <div className="w-16 h-12 rounded-md overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                  {guide.thumbnailUrl ? (
                                    <img src={guide.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <Book className="w-5 h-5 text-white" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 text-center">
                                  {guide.createdAt ? new Date(guide.createdAt).toLocaleDateString() : 'No date'}
                                </p>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-foreground leading-tight">{guide.title}</p>
                              </div>
                            </div>
                          </td>
                          
                          {/* Conversion Funnel */}
                          <td className="px-3 py-3 border-r border-gray-200">
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
                          <td className="px-3 py-3 border-r border-gray-200">
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
                          <td className="px-3 py-3 border-r border-gray-200">
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
                          <td className="px-3 py-3">
                            <div className="flex items-center space-x-1">
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

          {/* Performance Overview - Horizontal Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Top Performing Guides */}
            <Card className="md:col-span-2 xl:col-span-3">
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
                        <div key={guide.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                          {/* Thumbnail */}
                          <div className="flex-shrink-0">
                            <div className="w-16 h-12 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                              {guide.thumbnailUrl ? (
                                <img src={guide.thumbnailUrl} alt="" className="w-full h-full object-contain" />
                              ) : (
                                <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-full h-full flex items-center justify-center">
                                  <Book className="w-5 h-5 text-white" />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Full Headline */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-foreground leading-tight">
                              {guide.title}
                            </h3>
                          </div>
                          
                          {/* Metrics Bar */}
                          <div className="flex items-center space-x-6 text-sm">
                            <div className="flex items-center space-x-2">
                              <Eye className="w-4 h-4 text-blue-500" />
                              <span className="font-medium">{guide.views || 0}</span>
                              <span className="text-muted-foreground">views</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-green-500" />
                              <span className="font-medium">{guide.leads || 0}</span>
                              <span className="text-muted-foreground">leads</span>
                            </div>
                            <Badge variant="secondary">
                              {guide.conversionRate || 0}%
                            </Badge>
                          </div>
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
            <Card className="xl:col-span-1">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                    <Palette className="w-3 h-3 mr-2" />
                    Update Branding
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                    <ExternalLink className="w-3 h-3 mr-2" />
                    Manage Integrations
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                    <TrendingUp className="w-3 h-3 mr-2" />
                    Export Data
                  </Button>
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
