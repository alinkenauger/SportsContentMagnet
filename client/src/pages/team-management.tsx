import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Users, UserPlus, Crown, Edit, Trash2, Shield, Eye, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useBrands } from "@/hooks/useBrands";

interface BrandUser {
  id: number;
  brandId: number;
  userId: string;
  role: string;
  invitedBy: string;
  invitedAt: string;
  acceptedAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

const roleIcons = {
  admin: Crown,
  editor: Edit,
  view_only: Eye,
};

const roleColors = {
  admin: "bg-red-100 text-red-800",
  editor: "bg-blue-100 text-blue-800", 
  view_only: "bg-gray-100 text-gray-800",
};

const roleDescriptions = {
  admin: "Can manage team members, brand settings, and all content",
  editor: "Can create and edit guides, manage leads, and view analytics",
  view_only: "Can only view guides, analytics, and leads (read-only access)",
};

export default function TeamManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentBrand } = useBrands();
  
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("editor");
  const [editingUser, setEditingUser] = useState<BrandUser | null>(null);
  const [newRole, setNewRole] = useState<string>("");

  const { data: brandUsers = [], isLoading } = useQuery<BrandUser[]>({
    queryKey: ["/api/brands", currentBrand?.id, "users"],
    enabled: !!currentBrand?.id,
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { userId: string; role: string }) => {
      return apiRequest(`/api/brands/${currentBrand?.id}/users`, "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User invited successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/brands", currentBrand?.id, "users"] });
      setIsInviteOpen(false);
      setInviteEmail("");
      setInviteRole("editor");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to invite user",
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async (data: { id: number; role: string }) => {
      return apiRequest(`/api/brand-users/${data.id}/role`, "PATCH", { role: data.role });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User role updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/brands", currentBrand?.id, "users"] });
      setEditingUser(null);
      setNewRole("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/brand-users/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User removed from team successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/brands", currentBrand?.id, "users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove user",
        variant: "destructive",
      });
    },
  });

  const handleInvite = () => {
    if (!inviteEmail || !inviteRole) {
      toast({
        title: "Error",
        description: "Please enter an email and select a role",
        variant: "destructive",
      });
      return;
    }

    inviteMutation.mutate({
      userId: inviteEmail, // In a real app, you'd look up user by email
      role: inviteRole,
    });
  };

  const handleUpdateRole = () => {
    if (!editingUser || !newRole) return;
    
    updateRoleMutation.mutate({
      id: editingUser.id,
      role: newRole,
    });
  };

  const handleRemoveUser = (userId: number) => {
    removeMutation.mutate(userId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getUserDisplayName = (user: BrandUser) => {
    // In a real app, you'd join with user data
    return user.userId || "Unknown User";
  };

  if (!currentBrand) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Management
            </CardTitle>
            <CardDescription>
              Please select a brand to manage team members
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground">
            Manage user roles and permissions for {currentBrand.name}
          </p>
        </div>
        
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Add a new team member to {currentBrand.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="view_only">View Only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  {roleDescriptions[inviteRole as keyof typeof roleDescriptions]}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInvite} disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? "Inviting..." : "Send Invite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Role Overview Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {Object.entries(roleDescriptions).map(([role, description]) => {
          const IconComponent = roleIcons[role as keyof typeof roleIcons];
          const userCount = brandUsers.filter(user => user.role === role && user.isActive).length;
          
          return (
            <Card key={role}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <IconComponent className="h-5 w-5" />
                  {role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')}
                  <Badge variant="secondary">{userCount}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage roles and permissions for team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {brandUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
              <p className="text-muted-foreground mb-4">
                Start building your team by inviting members
              </p>
              <Button onClick={() => setIsInviteOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite First Member
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invited</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brandUsers.map((user) => {
                  const IconComponent = roleIcons[user.role as keyof typeof roleIcons];
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{getUserDisplayName(user)}</div>
                            <div className="text-sm text-muted-foreground">{user.userId}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={roleColors[user.role as keyof typeof roleColors]}>
                          <IconComponent className="h-3 w-3 mr-1" />
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1).replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.acceptedAt ? "default" : "secondary"}>
                          {user.acceptedAt ? "Active" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(user.invitedAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setEditingUser(user);
                                  setNewRole(user.role);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Update User Role</DialogTitle>
                                <DialogDescription>
                                  Change the role for {getUserDisplayName(user)}
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div>
                                <Label htmlFor="newRole">New Role</Label>
                                <Select value={newRole} onValueChange={setNewRole}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="editor">Editor</SelectItem>
                                    <SelectItem value="view_only">View Only</SelectItem>
                                  </SelectContent>
                                </Select>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {roleDescriptions[newRole as keyof typeof roleDescriptions]}
                                </p>
                              </div>

                              <DialogFooter>
                                <Button variant="outline" onClick={() => setEditingUser(null)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleUpdateRole} disabled={updateRoleMutation.isPending}>
                                  {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove {getUserDisplayName(user)} from the team? 
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleRemoveUser(user.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Remove User
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}