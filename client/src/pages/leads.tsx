import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, 
  Filter, 
  Download, 
  Mail, 
  Phone, 
  Calendar,
  ExternalLink,
  Users,
  Eye,
  TrendingUp,
  FileText
} from "lucide-react";
import { format } from "date-fns";

export default function Leads() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch leads data
  const { data: leads, isLoading } = useQuery({
    queryKey: ["/api/leads", user?.currentBrandId],
  });

  // Fetch guides for filtering by landing page
  const { data: guides } = useQuery({
    queryKey: ["/api/guides", user?.currentBrandId],
  });

  // Filter leads based on search and filters
  const filteredLeads = leads?.filter((lead: any) => {
    const matchesSearch = 
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.lastName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDate = dateFilter === "all" || (() => {
      const leadDate = new Date(lead.createdAt);
      const now = new Date();
      switch (dateFilter) {
        case "today":
          return leadDate.toDateString() === now.toDateString();
        case "week":
          return leadDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case "month":
          return leadDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        default:
          return true;
      }
    })();

    const matchesSource = sourceFilter === "all" || 
      guides?.find((g: any) => g.id === lead.guideId)?.title?.toLowerCase().includes(sourceFilter.toLowerCase());

    return matchesSearch && matchesDate && matchesSource;
  }) || [];

  // Calculate stats
  const totalLeads = leads?.length || 0;
  const newLeads = leads?.filter((lead: any) => {
    const leadDate = new Date(lead.createdAt);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return leadDate >= yesterday;
  }).length || 0;
  
  const leadsWithPhone = leads?.filter((lead: any) => lead.phone).length || 0;
  const conversionRate = totalLeads > 0 ? ((totalLeads / (totalLeads * 10)) * 100).toFixed(1) : "0"; // Mock calculation

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Lead Management</h2>
            <p className="text-muted-foreground mt-1">
              Manage and track all leads captured from your guides and landing pages.
            </p>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
                  <p className="text-2xl font-bold text-foreground">{totalLeads}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">New (24h)</p>
                  <p className="text-2xl font-bold text-foreground">{newLeads}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">With Phone</p>
                  <p className="text-2xl font-bold text-foreground">{leadsWithPhone}</p>
                </div>
                <Phone className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-bold text-foreground">{conversionRate}%</p>
                </div>
                <Eye className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search leads by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Landing Page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Landing Pages</SelectItem>
                  {guides?.map((guide: any) => (
                    <SelectItem key={guide.id} value={guide.title}>
                      {guide.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" className="flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Leads ({filteredLeads.length})</CardTitle>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {filteredLeads.length} of {totalLeads} leads
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-muted rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredLeads.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-3 font-medium text-muted-foreground">Contact</th>
                      <th className="pb-3 font-medium text-muted-foreground">Tags</th>
                      <th className="pb-3 font-medium text-muted-foreground">Source</th>
                      <th className="pb-3 font-medium text-muted-foreground">Date</th>
                      <th className="pb-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredLeads.map((lead: any) => {
                      const guide = guides?.find((g: any) => g.id === lead.guideId);
                      return (
                        <tr key={lead.id} className="hover:bg-muted/50">
                          <td className="py-4">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src="" alt="" />
                                <AvatarFallback>
                                  {lead.firstName?.[0] || lead.email?.[0] || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <p className="font-medium text-foreground">
                                    {lead.firstName && lead.lastName 
                                      ? `${lead.firstName} ${lead.lastName}`
                                      : lead.firstName || "Anonymous"
                                    }
                                  </p>
                                  {lead.phone && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Phone className="w-3 h-3 mr-1" />
                                      SMS
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                                  <div className="flex items-center space-x-1">
                                    <Mail className="w-3 h-3" />
                                    <span>{lead.email}</span>
                                  </div>
                                  {lead.phone && (
                                    <div className="flex items-center space-x-1">
                                      <Phone className="w-3 h-3" />
                                      <span>{lead.phone}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="flex flex-wrap gap-1">
                              {lead.tags && lead.tags.length > 0 ? (
                                lead.tags.map((tag: string, index: number) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-sm text-muted-foreground">No tags</span>
                              )}
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {guide?.title || "Unknown Guide"}
                              </span>
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {lead.createdAt ? format(new Date(lead.createdAt), "MMM d, yyyy") : "Unknown"}
                              </span>
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Mail className="w-4 h-4 mr-1" />
                                Email
                              </Button>
                              {lead.phone && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  <Phone className="w-4 h-4 mr-1" />
                                  SMS
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              >
                                <ExternalLink className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No leads found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || dateFilter !== "all" || sourceFilter !== "all" 
                    ? "Try adjusting your filters to see more results."
                    : "Start creating guides to capture your first leads!"
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}