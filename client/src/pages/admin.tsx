import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Users, FileText, Mail, Activity, TrendingUp, Settings, Database, Image, DollarSign, Target, Plus, Edit, Save, X, Shield, Trash2, UserCheck, UserX, Eye, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  totalGuides: number;
  totalLeads: number;
  createdAt: string | null;
}

interface SystemStats {
  totalUsers: number;
  totalGuides: number;
  totalLeads: number;
  totalViews: number;
  activeUsersLast30Days: number;
  newUsersLast30Days: number;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const { isAdmin, isLoading: isCheckingAdmin } = useAdminAuth();
  const queryClient = useQueryClient();

  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/admin/users"],
    enabled: isAdmin,
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/admin/stats"],
    enabled: isAdmin,
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "User deleted",
        description: "The user has been successfully deleted.",
      });
      setDeleteUser(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        body: { role },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Role updated",
        description: "The user's role has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getUserDisplayName = (user: User | null) => {
    if (!user) return 'Unknown User';
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.email || 'No name';
  };

  if (isCheckingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access the admin dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Global Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Complete system management and oversight for VidMagnet
          </p>
        </div>
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <Shield className="w-4 h-4 mr-2" />
          Global Admin
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* System Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoadingStats ? "..." : stats?.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +{stats?.newUsersLast30Days || 0} this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Guides</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoadingStats ? "..." : stats?.totalGuides || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Content generated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoadingStats ? "..." : stats?.totalLeads || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Lead captures
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoadingStats ? "..." : stats?.totalViews || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Page views
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button className="h-20 flex flex-col gap-2" variant="outline">
                  <Plus className="h-6 w-6" />
                  Add New User
                </Button>
                <Button className="h-20 flex flex-col gap-2" variant="outline">
                  <Settings className="h-6 w-6" />
                  System Settings
                </Button>
                <Button className="h-20 flex flex-col gap-2" variant="outline">
                  <Database className="h-6 w-6" />
                  Backup Data
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest system activity and user actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">New user registration</p>
                      <p className="text-sm text-muted-foreground">user@example.com joined</p>
                    </div>
                  </div>
                  <Badge>New</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Guide created</p>
                      <p className="text-sm text-muted-foreground">"Advanced Golf Swing Techniques"</p>
                    </div>
                  </div>
                  <Badge variant="outline">Content</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Target className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium">Lead captured</p>
                      <p className="text-sm text-muted-foreground">Fitness guide landing page</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Lead</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">User Management</h2>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Global User
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                Manage user accounts, visit accounts, edit prompts, and control access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Guides</TableHead>
                    <TableHead>Leads</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingUsers ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">Loading users...</TableCell>
                    </TableRow>
                  ) : users?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">No users found</TableCell>
                    </TableRow>
                  ) : (
                    users?.map((user: User) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{getUserDisplayName(user)}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Select
                            value={user.role || "user"}
                            onValueChange={(value) => updateUserRoleMutation.mutate({ userId: user.id, role: value })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="global_admin">Global Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{user.totalGuides}</TableCell>
                        <TableCell>{user.totalLeads}</TableCell>
                        <TableCell>{user.createdAt ? formatDate(user.createdAt) : 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Visit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteUser(user)}
                              disabled={deleteUserMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Global Template Management</h2>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>

          {/* Brand Voice Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                Category 1: Brand Voice Templates
              </CardTitle>
              <CardDescription>
                Control how the AI writes and communicates - the personality and tone of guides
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="relative">
                  <Badge variant="outline" className="absolute top-3 right-3 z-10">Active</Badge>
                  <CardHeader>
                    <CardTitle className="text-lg pr-16">Beginner-Friendly</CardTitle>
                    <CardDescription>Encouraging, supportive, and accessible for newcomers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        Used by <span className="font-medium text-foreground">23 users</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative">
                  <Badge variant="outline" className="absolute top-3 right-3 z-10">Active</Badge>
                  <CardHeader>
                    <CardTitle className="text-lg pr-16">Detailed and In-Depth</CardTitle>
                    <CardDescription>Comprehensive, thorough analysis with extensive detail</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        Used by <span className="font-medium text-foreground">34 users</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative">
                  <Badge variant="outline" className="absolute top-3 right-3 z-10">Active</Badge>
                  <CardHeader>
                    <CardTitle className="text-lg pr-16">Entertaining</CardTitle>
                    <CardDescription>Engaging, fun, and memorable with personality</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        Used by <span className="font-medium text-foreground">45 users</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative">
                  <Badge variant="outline" className="absolute top-3 right-3 z-10">Active</Badge>
                  <CardHeader>
                    <CardTitle className="text-lg pr-16">Advanced Performance</CardTitle>
                    <CardDescription>Technical, data-driven approach for serious practitioners</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        Used by <span className="font-medium text-foreground">67 users</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative">
                  <Badge variant="outline" className="absolute top-3 right-3 z-10">Active</Badge>
                  <CardHeader>
                    <CardTitle className="text-lg pr-16">World's Greatest Teacher</CardTitle>
                    <CardDescription>Masterful instruction with wisdom, patience, and insight</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm text-muted-foreground">
                        Used by <span className="font-medium text-foreground">89 users</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Guide Structure Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Category 2: Guide Structure Templates
              </CardTitle>
              <CardDescription>
                Control the format, layout, and structure of the guides themselves
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="relative">
                  <Badge variant="outline" className="absolute top-3 right-3 z-10">Active</Badge>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 pr-16">
                      Step-By-Step
                      <Badge variant="secondary" className="text-xs">Recent</Badge>
                    </CardTitle>
                    <CardDescription>Clear numbered instructions with one-click video timestamps</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Target className="w-4 h-4" />
                        Special Features: Timestamp buttons, Video navigation
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Used by <span className="font-medium text-foreground">156 users</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative">
                  <Badge variant="outline" className="absolute top-3 right-3 z-10">Active</Badge>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 pr-16">
                      SOP
                      <Badge variant="secondary" className="text-xs">Recent</Badge>
                    </CardTitle>
                    <CardDescription>Professional document for employee implementation</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Settings className="w-4 h-4" />
                        Professional operational document format
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Used by <span className="font-medium text-foreground">89 users</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative">
                  <Badge variant="outline" className="absolute top-3 right-3 z-10">Active</Badge>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 pr-16">
                      Workout
                      <Badge variant="secondary" className="text-xs">Recent</Badge>
                    </CardTitle>
                    <CardDescription>Training plan with tracking sheets for sets, reps, and progress</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Activity className="w-4 h-4" />
                        Special Features: Tracking sheets, Progress metrics, Exercise logging
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Used by <span className="font-medium text-foreground">234 users</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative">
                  <Badge variant="outline" className="absolute top-3 right-3 z-10">Active</Badge>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 pr-16">
                      Detailed Analysis
                      <Badge variant="secondary" className="text-xs">Recent</Badge>
                    </CardTitle>
                    <CardDescription>Comprehensive 7+ page guide with WHAT-WHERE-WHY-WHO-HOW structure</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Database className="w-4 h-4" />
                        Special Features: Minimum 7 pages, Research depth, Factual analysis
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Used by <span className="font-medium text-foreground">67 users</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2 relative">
                  <Badge variant="outline" className="absolute top-3 right-3 z-10">Active</Badge>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 pr-16">
                      Next Step
                      <Badge variant="destructive" className="text-xs">Requires 10+ Guides</Badge>
                    </CardTitle>
                    <CardDescription>Advanced implementation guide for experienced users who have created at least 10 guides</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <TrendingUp className="w-4 h-4" />
                        Special Features: Advanced implementation, Continuation focus, Experience required
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-muted-foreground">
                          Used by <span className="font-medium text-foreground">12 users</span>
                        </div>
                        <Badge variant="outline" className="text-orange-600">Restricted Access</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Global Media Center</h2>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Upload Global Media
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="h-5 w-5 text-blue-600" />
                  Images
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-2xl font-bold">1,245</p>
                  <p className="text-sm text-muted-foreground">Total files</p>
                  <p className="text-sm text-muted-foreground">2.3 GB storage</p>
                  <Button variant="outline" className="w-full mt-4">
                    Manage Images
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  Videos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-2xl font-bold">389</p>
                  <p className="text-sm text-muted-foreground">Total files</p>
                  <p className="text-sm text-muted-foreground">15.7 GB storage</p>
                  <Button variant="outline" className="w-full mt-4">
                    Manage Videos
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                  Audio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-2xl font-bold">567</p>
                  <p className="text-sm text-muted-foreground">Total files</p>
                  <p className="text-sm text-muted-foreground">4.1 GB storage</p>
                  <Button variant="outline" className="w-full mt-4">
                    Manage Audio
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Media Overview</CardTitle>
              <CardDescription>
                Global media assets available to all users and brands
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Used By</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>global-logo.png</TableCell>
                    <TableCell>
                      <Badge variant="outline">Image</Badge>
                    </TableCell>
                    <TableCell>245 KB</TableCell>
                    <TableCell>23 users</TableCell>
                    <TableCell>2 days ago</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>intro-music.mp3</TableCell>
                    <TableCell>
                      <Badge variant="outline">Audio</Badge>
                    </TableCell>
                    <TableCell>3.2 MB</TableCell>
                    <TableCell>45 users</TableCell>
                    <TableCell>1 week ago</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Analytics & Tracking</h2>
            <div className="flex gap-2">
              <Button variant="outline">
                <Target className="w-4 h-4 mr-2" />
                Add Tracking Pixel
              </Button>
              <Button variant="outline">
                <Database className="w-4 h-4 mr-2" />
                Reset Statistics
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
                <CardDescription>Platform engagement and activity metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span>Daily Active Users</span>
                    <span className="font-bold text-green-600">1,234</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span>Monthly Active Users</span>
                    <span className="font-bold text-blue-600">5,678</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span>Average Session Time</span>
                    <span className="font-bold text-purple-600">12m 34s</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span>Conversion Rate</span>
                    <span className="font-bold text-orange-600">23.4%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Tracking</CardTitle>
                <CardDescription>API usage and operational expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span>OpenAI API Costs</span>
                    <span className="font-bold text-red-600">$123.45</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span>YouTube API Calls</span>
                    <span className="font-bold text-gray-600">2,345</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span>Storage Costs</span>
                    <span className="font-bold text-blue-600">$45.67</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span>Total Monthly Cost</span>
                    <span className="font-bold text-purple-600">$234.89</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tracking Pixels</CardTitle>
              <CardDescription>
                Monitor user behavior and conversion tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pixel Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Triggers</TableHead>
                    <TableHead>Last Fired</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Facebook Conversion</TableCell>
                    <TableCell>
                      <Badge variant="outline">Meta</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">Active</Badge>
                    </TableCell>
                    <TableCell>1,234</TableCell>
                    <TableCell>2 hours ago</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Google Analytics</TableCell>
                    <TableCell>
                      <Badge variant="outline">Google</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">Active</Badge>
                    </TableCell>
                    <TableCell>5,678</TableCell>
                    <TableCell>1 hour ago</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">System Management</h2>
            <Badge variant="destructive">Critical Operations</Badge>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Client Management</CardTitle>
              <CardDescription>
                Add and remove client access to the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Add New Client</h3>
                    <p className="text-sm text-muted-foreground">
                      Grant platform access to new organizations
                    </p>
                  </div>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Client
                  </Button>
                </div>

                <div className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Remove Client Access</h3>
                    <p className="text-sm text-muted-foreground">
                      Revoke platform access and disable accounts
                    </p>
                  </div>
                  <Button variant="destructive">
                    <UserX className="w-4 h-4 mr-2" />
                    Remove Client
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Operations</CardTitle>
              <CardDescription>
                Critical system maintenance and data operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Reset All Statistics</h3>
                    <p className="text-sm text-muted-foreground">
                      Clear all analytics, views, and engagement data
                    </p>
                  </div>
                  <Button variant="destructive">
                    <Database className="w-4 h-4 mr-2" />
                    Reset Stats
                  </Button>
                </div>

                <div className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Clear Media Cache</h3>
                    <p className="text-sm text-muted-foreground">
                      Remove all cached media files and optimize storage
                    </p>
                  </div>
                  <Button variant="outline">
                    <Image className="w-4 h-4 mr-2" />
                    Clear Cache
                  </Button>
                </div>

                <div className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Export System Data</h3>
                    <p className="text-sm text-muted-foreground">
                      Download complete backup of all system data
                    </p>
                  </div>
                  <Button variant="outline">
                    <Database className="w-4 h-4 mr-2" />
                    Export Data
                  </Button>
                </div>

                <div className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">Maintenance Mode</h3>
                    <p className="text-sm text-muted-foreground">
                      Enable maintenance mode for system updates
                    </p>
                  </div>
                  <Button variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    Toggle Maintenance
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete User Dialog */}
      <Dialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete {getUserDisplayName(deleteUser)}? 
              This will remove all their guides, leads, and data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteUser && deleteUserMutation.mutate(deleteUser.id)}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Edit Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Account: {getUserDisplayName(selectedUser)}</DialogTitle>
            <DialogDescription>
              View and edit user account details, prompts, and settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Account Details</TabsTrigger>
                <TabsTrigger value="prompts">Custom Prompts</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={selectedUser?.firstName || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={selectedUser?.lastName || ""} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" value={selectedUser?.email || ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">User Role</Label>
                  <Select value={selectedUser?.role || "user"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="global_admin">Global Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
              
              <TabsContent value="prompts" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="analysisPrompt">Custom Analysis Prompt</Label>
                    <Textarea 
                      id="analysisPrompt" 
                      rows={4}
                      placeholder="Custom prompt for content analysis..."
                    />
                    <p className="text-sm text-muted-foreground">
                      Leave empty to use global template default
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guidePrompt">Custom Guide Generation Prompt</Label>
                    <Textarea 
                      id="guidePrompt" 
                      rows={4}
                      placeholder="Custom prompt for guide generation..."
                    />
                    <p className="text-sm text-muted-foreground">
                      Overrides global template for this user
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="personalizationPrompt">Custom Personalization Prompt</Label>
                    <Textarea 
                      id="personalizationPrompt" 
                      rows={4}
                      placeholder="Custom prompt for content personalization..."
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="analytics" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Activity Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Guides</span>
                          <span className="font-bold">{selectedUser?.totalGuides || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Leads</span>
                          <span className="font-bold">{selectedUser?.totalLeads || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Account Created</span>
                          <span className="font-bold">
                            {selectedUser?.createdAt ? formatDate(selectedUser.createdAt) : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Usage Patterns</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Last Login</span>
                          <span className="font-bold">2 hours ago</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Avg Session</span>
                          <span className="font-bold">15m 23s</span>
                        </div>
                        <div className="flex justify-between">
                          <span>API Calls</span>
                          <span className="font-bold">1,234</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="actions" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Login as User</h3>
                      <p className="text-sm text-muted-foreground">
                        Access this user's account to view their dashboard
                      </p>
                    </div>
                    <Button variant="outline">
                      <UserCheck className="w-4 h-4 mr-2" />
                      Login as User
                    </Button>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Reset Password</h3>
                      <p className="text-sm text-muted-foreground">
                        Send password reset email to user
                      </p>
                    </div>
                    <Button variant="outline">
                      <Mail className="w-4 h-4 mr-2" />
                      Reset Password
                    </Button>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Suspend Account</h3>
                      <p className="text-sm text-muted-foreground">
                        Temporarily disable user access
                      </p>
                    </div>
                    <Button variant="destructive">
                      <UserX className="w-4 h-4 mr-2" />
                      Suspend
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Close
            </Button>
            <Button>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}