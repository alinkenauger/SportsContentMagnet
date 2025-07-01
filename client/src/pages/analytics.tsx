import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import StatsCard from "@/components/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  Users, 
  Eye, 
  Download, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Filter,
  Download as DownloadIcon
} from "lucide-react";
import { Guide, Lead } from "@shared/schema";

interface AnalyticsData {
  totalGuides: number;
  totalLeads: number;
  totalViews: number;
  totalDownloads: number;
  avgConversionRate: number;
}

export default function Analytics() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState("30days");
  const [selectedGuide, setSelectedGuide] = useState<string>("all");

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics", dateRange],
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  const { data: guides } = useQuery<Guide[]>({
    queryKey: ["/api/guides"],
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  const { data: leads } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
    },
  });

  const handleExportData = () => {
    toast({
      title: "Export Started",
      description: "Your analytics data export will be ready shortly.",
    });
  };

  const topPerformingGuides = guides?.slice()
    .sort((a, b) => (b.conversionRate || 0) - (a.conversionRate || 0))
    .slice(0, 5) || [];

  const recentLeads = leads?.slice()
    .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
    .slice(0, 10) || [];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Analytics</h2>
              <p className="text-muted-foreground mt-1">
                Track your guide performance and lead conversion metrics
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={handleExportData}>
                <DownloadIcon className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="w-5 h-5" />
                <span>Filters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-4">
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-full lg:w-48">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">Last 7 days</SelectItem>
                    <SelectItem value="30days">Last 30 days</SelectItem>
                    <SelectItem value="90days">Last 90 days</SelectItem>
                    <SelectItem value="1year">Last year</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedGuide} onValueChange={setSelectedGuide}>
                  <SelectTrigger className="w-full lg:w-64">
                    <SelectValue placeholder="Select Guide" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Guides</SelectItem>
                    {guides?.map(guide => (
                      <SelectItem key={guide.id} value={guide.id.toString()}>
                        {guide.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Views"
              value={analytics?.totalViews || 0}
              change="+12.5%"
              changeType="positive"
              icon={Eye}
              iconColor="text-primary"
            />
            <StatsCard
              title="Total Leads"
              value={analytics?.totalLeads || 0}
              change="+23.1%"
              changeType="positive"
              icon={Users}
              iconColor="text-secondary"
            />
            <StatsCard
              title="Downloads"
              value={analytics?.totalDownloads || 0}
              change="+18.7%"
              changeType="positive"
              icon={Download}
              iconColor="text-accent"
            />
            <StatsCard
              title="Avg Conversion Rate"
              value={`${analytics?.avgConversionRate?.toFixed(1) || 0}%`}
              change="+5.2%"
              changeType="positive"
              icon={TrendingUp}
              iconColor="text-purple-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Performance Overview */}
            <div className="lg:col-span-2 space-y-6">
              {/* Top Performing Guides */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Guides</CardTitle>
                </CardHeader>
                <CardContent>
                  {analyticsLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="flex items-center space-x-4">
                            <div className="w-16 h-12 bg-muted rounded-lg"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-muted rounded w-3/4"></div>
                              <div className="h-3 bg-muted rounded w-1/2"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : topPerformingGuides.length > 0 ? (
                    <div className="space-y-4">
                      {topPerformingGuides.map((guide, index) => (
                        <div key={guide.id} className="flex items-center space-x-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {index + 1}
                            </div>
                          </div>
                          <img 
                            src={guide.thumbnailUrl || "/api/placeholder/60/40"} 
                            alt={guide.title}
                            className="w-16 h-12 object-cover rounded-lg"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground truncate">{guide.title}</h4>
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground mt-1">
                              <span className="flex items-center space-x-1">
                                <Eye className="w-3 h-3" />
                                <span>{guide.views || 0}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Download className="w-3 h-3" />
                                <span>{guide.downloads || 0}</span>
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="bg-secondary/10 text-secondary">
                              {guide.conversionRate || 0}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No performance data available yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Conversion Funnel */}
              <Card>
                <CardHeader>
                  <CardTitle>Conversion Funnel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Eye className="w-5 h-5 text-primary" />
                        <span className="font-medium">Page Views</span>
                      </div>
                      <span className="text-lg font-bold">{analytics?.totalViews || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Users className="w-5 h-5 text-secondary" />
                        <span className="font-medium">Lead Captures</span>
                      </div>
                      <span className="text-lg font-bold">{analytics?.totalLeads || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Download className="w-5 h-5 text-accent" />
                        <span className="font-medium">Downloads</span>
                      </div>
                      <span className="text-lg font-bold">{analytics?.totalDownloads || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Analytics */}
            <div className="space-y-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Leads</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentLeads.length > 0 ? (
                    <div className="space-y-3">
                      {recentLeads.map((lead) => (
                        <div key={lead.id} className="flex items-center space-x-3 p-3 rounded-lg border border-border">
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-medium text-sm">
                            {lead.firstName?.[0] || lead.email[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {lead.firstName ? `${lead.firstName} ${lead.lastName || ''}`.trim() : lead.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(lead.createdAt || '').toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No recent leads</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Active Guides</span>
                      <span className="font-medium">
                        {guides?.filter(g => g.status === 'published').length || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Draft Guides</span>
                      <span className="font-medium">
                        {guides?.filter(g => g.status === 'draft').length || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Best Performer</span>
                      <span className="font-medium text-sm">
                        {topPerformingGuides[0]?.conversionRate || 0}% CR
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">This Month</span>
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="w-3 h-3 text-secondary" />
                        <span className="font-medium text-secondary text-sm">+23%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Export Options */}
              <Card>
                <CardHeader>
                  <CardTitle>Export Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-start" onClick={handleExportData}>
                      <DownloadIcon className="w-4 h-4 mr-2" />
                      Analytics Report
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={handleExportData}>
                      <DownloadIcon className="w-4 h-4 mr-2" />
                      Leads Data
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={handleExportData}>
                      <DownloadIcon className="w-4 h-4 mr-2" />
                      Performance Summary
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
