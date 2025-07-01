import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import GuideCard from "@/components/guide-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Plus, Book, Grid, List, Eye, Users, ExternalLink, Edit, BarChart3 } from "lucide-react";
import { Guide } from "@shared/schema";

const categories = [
  "all",
  "basketball",
  "soccer",
  "tennis",
  "football",
  "fitness",
  "other"
];

const statusOptions = [
  "all",
  "published",
  "draft",
  "archived"
];

export default function ContentLibrary() {
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: guides, isLoading, error } = useQuery<Guide[]>({
    queryKey: ["/api/guides", searchQuery, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (selectedCategory !== "all") params.append("category", selectedCategory);
      
      const response = await fetch(`/api/guides?${params.toString()}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
  });

  // Handle unauthorized errors
  if (error && isUnauthorizedError(error as Error)) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
  }

  const filteredGuides = guides?.filter(guide => {
    if (selectedStatus !== "all" && guide.status !== selectedStatus) {
      return false;
    }
    return true;
  }) || [];

  const handleEditGuide = (guide: Guide) => {
    navigate(`/guide-editor/${guide.id}`);
  };

  const handleViewLanding = async (guide: Guide) => {
    console.log('Clicked View Landing Page for guide:', guide.id);
    try {
      // Fetch landing page URL for this guide
      const response = await fetch(`/api/guides/${guide.id}/landing-page`);
      console.log('API response status:', response.status);
      
      if (response.ok) {
        const landingPage = await response.json();
        console.log('Landing page data:', landingPage);
        const url = `/landing/${landingPage.customUrl}`;
        console.log('Opening URL:', url);
        
        const newWindow = window.open(url, '_blank');
        if (!newWindow) {
          toast({
            title: "Popup Blocked",
            description: "Please allow popups and try again.",
            variant: "destructive",
          });
        }
      } else {
        console.log('API error response:', await response.text());
        toast({
          title: "Landing Page Not Found",
          description: "No landing page exists for this guide yet.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error in handleViewLanding:', error);
      toast({
        title: "Error",
        description: "Failed to open landing page",
        variant: "destructive",
      });
    }
  };

  const handleViewAnalytics = (guide: Guide) => {
    toast({
      title: "Analytics",
      description: `Detailed analytics for "${guide.title}" will be available soon`,
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Content Library</h2>
              <p className="text-muted-foreground mt-1">
                Manage and organize all your practice guides
              </p>
            </div>
            <Button className="gradient-primary text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create New Guide
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Filter className="w-5 h-5" />
                <span>Filters & Search</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search guides..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full lg:w-48">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category === "all" ? "All Categories" : category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full lg:w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(status => (
                      <SelectItem key={status} value={status}>
                        {status === "all" ? "All Status" : status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center space-x-2">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Guides</p>
                    <p className="text-2xl font-bold">{guides?.length || 0}</p>
                  </div>
                  <Book className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Published</p>
                    <p className="text-2xl font-bold">
                      {guides?.filter(g => g.status === "published").length || 0}
                    </p>
                  </div>
                  <Badge className="bg-secondary/10 text-secondary">Live</Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Drafts</p>
                    <p className="text-2xl font-bold">
                      {guides?.filter(g => g.status === "draft").length || 0}
                    </p>
                  </div>
                  <Badge className="bg-accent/10 text-accent">Draft</Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Views</p>
                    <p className="text-2xl font-bold">
                      {guides?.reduce((sum, g) => sum + (g.views || 0), 0).toLocaleString() || 0}
                    </p>
                  </div>
                  <Badge variant="outline">Views</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Guides List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Your Guides ({filteredGuides.length})
                </CardTitle>
                <div className="flex items-center space-x-2">
                  {selectedCategory !== "all" && (
                    <Badge variant="secondary">
                      {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
                    </Badge>
                  )}
                  {selectedStatus !== "all" && (
                    <Badge variant="outline">
                      {selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
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
              ) : filteredGuides.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left p-4 font-medium text-sm text-muted-foreground">Guide</th>
                        <th className="text-left p-4 font-medium text-sm text-muted-foreground">Views</th>
                        <th className="text-left p-4 font-medium text-sm text-muted-foreground">Leads</th>
                        <th className="text-left p-4 font-medium text-sm text-muted-foreground">Landing Page</th>
                        <th className="text-left p-4 font-medium text-sm text-muted-foreground">Guide Preview</th>
                        <th className="text-left p-4 font-medium text-sm text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGuides.map((guide) => (
                        <tr key={guide.id} className="border-b hover:bg-muted/30 transition-colors">
                          {/* Thumbnail and Name */}
                          <td className="p-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-16 h-12 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
                                {guide.thumbnailUrl ? (
                                  <img 
                                    src={guide.thumbnailUrl} 
                                    alt={guide.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                    <Book className="w-6 h-6 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-foreground truncate">{guide.title}</p>
                                <p className="text-sm text-muted-foreground truncate">
                                  {guide.category || 'Uncategorized'} • {guide.createdAt ? new Date(guide.createdAt).toLocaleDateString() : 'No date'}
                                </p>
                              </div>
                            </div>
                          </td>
                          
                          {/* Views */}
                          <td className="p-4">
                            <div className="flex items-center text-sm">
                              <Eye className="w-4 h-4 mr-2 text-muted-foreground" />
                              <span className="font-medium">{guide.views || 0}</span>
                            </div>
                          </td>
                          
                          {/* Leads */}
                          <td className="p-4">
                            <div className="flex items-center text-sm">
                              <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                              <span className="font-medium">0</span>
                            </div>
                          </td>
                          
                          {/* Landing Page Link */}
                          <td className="p-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewLanding(guide)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </td>
                          
                          {/* Guide Preview Link */}
                          <td className="p-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`/guide/${guide.id}`, '_blank')}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Book className="w-4 h-4 mr-1" />
                              Preview
                            </Button>
                          </td>
                          
                          {/* Actions */}
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditGuide(guide)}
                                className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewAnalytics(guide)}
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
                <div className="text-center py-12 p-6">
                  <Book className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No guides found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || selectedCategory !== "all" || selectedStatus !== "all"
                      ? "Try adjusting your filters or search query"
                      : "Create your first practice guide to get started"
                    }
                  </p>
                  <Button className="gradient-primary text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Guide
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
