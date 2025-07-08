import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import { 
  Settings as SettingsIcon, 
  User,
  CreditCard,
  Shield,
  Bell,
  Zap,
  Palette,
  Key,
  Mail,
  Phone,
  Camera,
  Save,
  AlertCircle,
  CheckCircle,
  X,
  Edit,
  Trash2,
  Plus,
  Calendar,
  DollarSign,
  FileText,
  Globe,
  Lock,
  Building2,
  Brain,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useBrands, useCreateBrand, useSetCurrentBrand, useDeleteBrand } from "@/hooks/useBrands";
import BillingManagement from "@/components/BillingManagement";

const fontOptions = [
  { value: "Inter", label: "Inter" },
  { value: "Roboto", label: "Roboto" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Lato", label: "Lato" },
  { value: "Poppins", label: "Poppins" },
];

const presetColors = [
  { name: "Ocean Blue", primary: "#2563EB", secondary: "#10B981", accent: "#F59E0B" },
  { name: "Forest Green", primary: "#059669", secondary: "#3B82F6", accent: "#F97316" },
  { name: "Sunset Orange", primary: "#EA580C", secondary: "#8B5CF6", accent: "#06B6D4" },
  { name: "Royal Purple", primary: "#7C3AED", secondary: "#EF4444", accent: "#10B981" },
  { name: "Crimson Red", primary: "#DC2626", secondary: "#6366F1", accent: "#F59E0B" },
];

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("profile");

  // Profile form states
  const [profileForm, setProfileForm] = useState({
    firstName: (user as any)?.firstName || "",
    lastName: (user as any)?.lastName || "",
    email: (user as any)?.email || "",
    phone: "",
    bio: "",
    website: "",
    company: "",
    jobTitle: ""
  });

  // Brand management state
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandDescription, setNewBrandDescription] = useState("");
  const [isCreateBrandOpen, setIsCreateBrandOpen] = useState(false);

  // Brand management hooks
  const { brands, hasMultipleBrands, isLoading: brandsLoading } = useBrands();
  const createBrandMutation = useCreateBrand();
  const setCurrentBrandMutation = useSetCurrentBrand();
  const deleteBrandMutation = useDeleteBrand();

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailNewLeads: true,
    emailGuideUpdates: true,
    emailMarketing: false,
    smsNewLeads: false,
    pushNotifications: true,
    weeklyReports: true
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    loginAlerts: true,
    sessionTimeout: "30",
    passwordChanged: "2024-06-15"
  });

  // Branding settings
  const [brandingForm, setBrandingForm] = useState({
    logoUrl: "",
    primaryColor: "#2563EB",
    secondaryColor: "#10B981",
    accentColor: "#F59E0B",
    fontFamily: "Inter",
    companyName: "",
    tagline: "",
  });

  // Fetch branding settings
  const { data: brandingSettings } = useQuery({
    queryKey: ["/api/branding"],
  });

  // Load branding settings when available
  const [brandingLoaded, setBrandingLoaded] = useState(false);
  if (brandingSettings && !brandingLoaded) {
    setBrandingForm({
      logoUrl: brandingSettings.logoUrl || "",
      primaryColor: brandingSettings.primaryColor || "#2563EB",
      secondaryColor: brandingSettings.secondaryColor || "#10B981",
      accentColor: brandingSettings.accentColor || "#F59E0B",
      fontFamily: brandingSettings.fontFamily || "Inter",
      companyName: brandingSettings.companyName || "",
      tagline: brandingSettings.tagline || "",
    });
    setBrandingLoaded(true);
  }

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      return await apiRequest("/api/profile", "PUT", JSON.stringify(data));
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error) => {
      console.error("Profile update error:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Save branding mutation
  const saveBrandingMutation = useMutation({
    mutationFn: async (data: typeof brandingForm) => {
      return await apiRequest("/api/branding", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Branding settings saved successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/branding"] });
    },
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
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save branding settings",
        variant: "destructive",
      });
    },
  });

  const handleProfileSave = () => {
    updateProfileMutation.mutate(profileForm);
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "U";
  };

  // Brand management handlers
  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;

    try {
      await createBrandMutation.mutateAsync({
        name: newBrandName.trim(),
        description: newBrandDescription.trim() || undefined,
      });
      
      toast({
        title: "Brand created",
        description: `${newBrandName} has been created successfully.`,
      });
      
      setNewBrandName("");
      setNewBrandDescription("");
      setIsCreateBrandOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create brand. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSetCurrentBrand = async (brandId: number) => {
    try {
      await setCurrentBrandMutation.mutateAsync(brandId);
      toast({
        title: "Brand switched",
        description: "Successfully switched to the selected brand.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to switch brand. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBrand = async (brandId: number, brandName: string) => {
    if (confirm(`Are you sure you want to delete "${brandName}"? This action cannot be undone.`)) {
      try {
        await deleteBrandMutation.mutateAsync(brandId);
        toast({
          title: "Brand deleted",
          description: `${brandName} has been deleted successfully.`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete brand. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
              <SettingsIcon className="w-8 h-8 text-blue-600" />
              Account Settings
            </h1>
            <p className="text-gray-600">Manage your profile, billing, security, and preferences</p>
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-7 h-12">
              <TabsTrigger value="profile" className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="brands" className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4" />
                Brands
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4" />
                Billing
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4" />
                Security
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2 text-sm">
                <Bell className="w-4 h-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="integrations" className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4" />
                Integrations
              </TabsTrigger>
              <TabsTrigger value="branding" className="flex items-center gap-2 text-sm">
                <Palette className="w-4 h-4" />
                Branding
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>Update your basic profile information and preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Picture */}
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={user?.profileImageUrl} alt="Profile" />
                      <AvatarFallback className="text-lg font-semibold">
                        {getInitials(user?.firstName, user?.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        Change Photo
                      </Button>
                      <p className="text-sm text-gray-500">JPG, PNG or GIF. Max 5MB.</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={profileForm.firstName}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Enter your first name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Enter your last name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter your email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        value={profileForm.company}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, company: e.target.value }))}
                        placeholder="Enter your company name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jobTitle">Job Title</Label>
                      <Input
                        id="jobTitle"
                        value={profileForm.jobTitle}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, jobTitle: e.target.value }))}
                        placeholder="Enter your job title"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={profileForm.website}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell us about yourself..."
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      onClick={handleProfileSave}
                      disabled={updateProfileMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Brand Management Tab */}
            <TabsContent value="brands" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Brand Management
                  </CardTitle>
                  <CardDescription>Manage your brands and workspaces. Each brand has separate guides, AI training, and settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Current Brands */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Your Brands</h3>
                      <Dialog open={isCreateBrandOpen} onOpenChange={setIsCreateBrandOpen}>
                        <DialogTrigger asChild>
                          <Button className="flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Create Brand
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create New Brand</DialogTitle>
                            <DialogDescription>
                              Create a new brand workspace with separate guides, AI training, and settings.
                            </DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleCreateBrand} className="space-y-4">
                            <div>
                              <Label htmlFor="brandName">Brand Name</Label>
                              <Input
                                id="brandName"
                                value={newBrandName}
                                onChange={(e) => setNewBrandName(e.target.value)}
                                placeholder="Enter brand name"
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="brandDescription">Description (Optional)</Label>
                              <Textarea
                                id="brandDescription"
                                value={newBrandDescription}
                                onChange={(e) => setNewBrandDescription(e.target.value)}
                                placeholder="Describe this brand workspace..."
                                rows={3}
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" onClick={() => setIsCreateBrandOpen(false)}>
                                Cancel
                              </Button>
                              <Button 
                                type="submit" 
                                disabled={createBrandMutation.isPending || !newBrandName.trim()}
                              >
                                {createBrandMutation.isPending ? "Creating..." : "Create Brand"}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {brandsLoading ? (
                      <div className="space-y-3">
                        {[...Array(2)].map((_, i) => (
                          <div key={i} className="animate-pulse">
                            <div className="h-20 bg-muted rounded-lg"></div>
                          </div>
                        ))}
                      </div>
                    ) : brands.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
                        <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="font-medium mb-2">No brands yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Create your first brand to organize your guides and settings.
                        </p>
                        <Button onClick={() => setIsCreateBrandOpen(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Your First Brand
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {brands.map((brand) => {
                          const isCurrent = brand.id === (user as any)?.currentBrandId;
                          return (
                            <div
                              key={brand.id}
                              className={`p-4 border rounded-lg transition-colors ${
                                isCurrent ? 'border-blue-500 bg-blue-50' : 'border-border hover:border-blue-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <h4 className="font-medium">{brand.name}</h4>
                                    {isCurrent && (
                                      <Badge variant="secondary" className="text-xs">
                                        Current
                                      </Badge>
                                    )}
                                    {brand.isDefault && (
                                      <Badge variant="outline" className="text-xs">
                                        Default
                                      </Badge>
                                    )}
                                  </div>
                                  {brand.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {brand.description}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Created {new Date(brand.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {!isCurrent && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSetCurrentBrand(brand.id)}
                                      disabled={setCurrentBrandMutation.isPending}
                                    >
                                      Switch
                                    </Button>
                                  )}
                                  {!brand.isDefault && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteBrand(brand.id, brand.name)}
                                      disabled={deleteBrandMutation.isPending}
                                    >
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* AI Training & Knowledge Base */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      AI Training & Knowledge Base
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Train your AI with custom prompts and knowledge base entries specific to your current brand.
                    </p>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Brain className="w-4 h-4" />
                            System Prompts
                          </CardTitle>
                          <CardDescription className="text-sm">
                            Customize how AI analyzes content for this brand
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button variant="outline" className="w-full" onClick={() => window.open('/training-settings', '_blank')}>
                            <Edit className="w-4 h-4 mr-2" />
                            Configure AI Training
                          </Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Knowledge Base
                          </CardTitle>
                          <CardDescription className="text-sm">
                            Add custom knowledge for better AI responses
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button variant="outline" className="w-full" onClick={() => window.open('/knowledge-base', '_blank')}>
                            <Plus className="w-4 h-4 mr-2" />
                            Manage Knowledge Base
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Billing Tab */}
            <TabsContent value="billing" className="space-y-6">
              <BillingManagement />
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Security Settings
                  </CardTitle>
                  <CardDescription>Protect your account with strong security measures</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Password */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Password</h3>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Password</p>
                        <p className="text-sm text-gray-500">Last changed on {securitySettings.passwordChanged}</p>
                      </div>
                      <Button variant="outline">Change Password</Button>
                    </div>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Two-Factor Authentication</h3>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${securitySettings.twoFactorEnabled ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <p className="font-medium">
                            {securitySettings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {securitySettings.twoFactorEnabled 
                              ? 'Your account is protected with 2FA' 
                              : 'Add an extra layer of security to your account'
                            }
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={securitySettings.twoFactorEnabled}
                        onCheckedChange={(checked) => 
                          setSecuritySettings(prev => ({ ...prev, twoFactorEnabled: checked }))
                        }
                      />
                    </div>
                  </div>

                  {/* Login Alerts */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Login Alerts</h3>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Email notifications for new logins</p>
                        <p className="text-sm text-gray-500">Get notified when someone logs into your account</p>
                      </div>
                      <Switch
                        checked={securitySettings.loginAlerts}
                        onCheckedChange={(checked) => 
                          setSecuritySettings(prev => ({ ...prev, loginAlerts: checked }))
                        }
                      />
                    </div>
                  </div>

                  {/* Session Timeout */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Session Settings</h3>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Session Timeout</p>
                        <p className="text-sm text-gray-500">Automatically log out after inactivity</p>
                      </div>
                      <Select 
                        value={securitySettings.sessionTimeout}
                        onValueChange={(value) => 
                          setSecuritySettings(prev => ({ ...prev, sessionTimeout: value }))
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="240">4 hours</SelectItem>
                          <SelectItem value="never">Never</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Active Sessions */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Active Sessions</h3>
                    <div className="space-y-2">
                      {[
                        { device: "Chrome on MacBook Pro", location: "San Francisco, CA", current: true },
                        { device: "Safari on iPhone", location: "San Francisco, CA", current: false },
                      ].map((session, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Globe className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="font-medium">{session.device}</p>
                              <p className="text-sm text-gray-500">{session.location}</p>
                            </div>
                            {session.current && <Badge variant="secondary">Current</Badge>}
                          </div>
                          {!session.current && (
                            <Button variant="ghost" size="sm" className="text-red-600">
                              Revoke
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>Choose how you want to be notified about account activity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Email Notifications */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Notifications
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">New Leads</p>
                          <p className="text-sm text-gray-500">Get notified when someone downloads your guides</p>
                        </div>
                        <Switch
                          checked={notifications.emailNewLeads}
                          onCheckedChange={(checked) => 
                            setNotifications(prev => ({ ...prev, emailNewLeads: checked }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Guide Updates</p>
                          <p className="text-sm text-gray-500">Updates about your published guides</p>
                        </div>
                        <Switch
                          checked={notifications.emailGuideUpdates}
                          onCheckedChange={(checked) => 
                            setNotifications(prev => ({ ...prev, emailGuideUpdates: checked }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Weekly Reports</p>
                          <p className="text-sm text-gray-500">Weekly analytics and performance summaries</p>
                        </div>
                        <Switch
                          checked={notifications.weeklyReports}
                          onCheckedChange={(checked) => 
                            setNotifications(prev => ({ ...prev, weeklyReports: checked }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Marketing Emails</p>
                          <p className="text-sm text-gray-500">Tips, updates, and promotional content</p>
                        </div>
                        <Switch
                          checked={notifications.emailMarketing}
                          onCheckedChange={(checked) => 
                            setNotifications(prev => ({ ...prev, emailMarketing: checked }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* SMS Notifications */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      SMS Notifications
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">New Leads (SMS)</p>
                          <p className="text-sm text-gray-500">Instant SMS alerts for new lead captures</p>
                        </div>
                        <Switch
                          checked={notifications.smsNewLeads}
                          onCheckedChange={(checked) => 
                            setNotifications(prev => ({ ...prev, smsNewLeads: checked }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Push Notifications */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Push Notifications</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Browser Notifications</p>
                          <p className="text-sm text-gray-500">Real-time notifications in your browser</p>
                        </div>
                        <Switch
                          checked={notifications.pushNotifications}
                          onCheckedChange={(checked) => 
                            setNotifications(prev => ({ ...prev, pushNotifications: checked }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      Save Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Integrations Tab */}
            <TabsContent value="integrations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Integrations & API
                  </CardTitle>
                  <CardDescription>Connect with external services and manage API access</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Connected Services */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Connected Services</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { name: "YouTube", description: "Video data and transcription", connected: true, status: "Active" },
                        { name: "OpenAI", description: "AI content generation", connected: true, status: "Active" },
                        { name: "Mailchimp", description: "Email marketing automation", connected: false, status: "Not Connected" },
                        { name: "Zapier", description: "Workflow automation", connected: false, status: "Not Connected" },
                        { name: "Stripe", description: "Payment processing", connected: true, status: "Active" },
                        { name: "Google Analytics", description: "Website analytics", connected: false, status: "Not Connected" },
                      ].map((service, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{service.name}</h4>
                            <Badge variant={service.connected ? "default" : "secondary"}>
                              {service.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 mb-3">{service.description}</p>
                          <Button 
                            variant={service.connected ? "outline" : "default"} 
                            size="sm"
                            className="w-full"
                          >
                            {service.connected ? "Configure" : "Connect"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* API Keys */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">API Keys</h3>
                    <p className="text-sm text-gray-500">Use these keys to integrate VidMagnet with your own applications</p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Production API Key</p>
                          <p className="text-sm text-gray-500 font-mono">vm_pk_••••••••••••••••••••••••••••••••</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Key className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Test API Key</p>
                          <p className="text-sm text-gray-500 font-mono">vm_test_••••••••••••••••••••••••••••••••</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Key className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Button variant="outline" className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Generate New API Key
                    </Button>
                  </div>

                  {/* Webhooks */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Webhooks</h3>
                    <p className="text-sm text-gray-500">Get notified when events happen in your account</p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Lead Captured</p>
                          <p className="text-sm text-gray-500">https://yourapp.com/webhooks/leads</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Button variant="outline" className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add Webhook
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Branding Tab */}
            <TabsContent value="branding" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Brand Identity
                  </CardTitle>
                  <CardDescription>Customize your brand colors, fonts, and company information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Company Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={brandingForm.companyName}
                        onChange={(e) => setBrandingForm(prev => ({ ...prev, companyName: e.target.value }))}
                        placeholder="Enter your company name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tagline">Company Tagline</Label>
                      <Input
                        id="tagline"
                        value={brandingForm.tagline}
                        onChange={(e) => setBrandingForm(prev => ({ ...prev, tagline: e.target.value }))}
                        placeholder="Enter your company tagline"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logoUrl">Logo URL</Label>
                    <Input
                      id="logoUrl"
                      value={brandingForm.logoUrl}
                      onChange={(e) => setBrandingForm(prev => ({ ...prev, logoUrl: e.target.value }))}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>

                  <Separator />

                  {/* Color Settings */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Brand Colors</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="primaryColor">Primary Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="primaryColor"
                            type="color"
                            value={brandingForm.primaryColor}
                            onChange={(e) => setBrandingForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                            className="w-12 h-10 p-1 rounded"
                          />
                          <Input
                            value={brandingForm.primaryColor}
                            onChange={(e) => setBrandingForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                            placeholder="#2563EB"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="secondaryColor">Secondary Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="secondaryColor"
                            type="color"
                            value={brandingForm.secondaryColor}
                            onChange={(e) => setBrandingForm(prev => ({ ...prev, secondaryColor: e.target.value }))}
                            className="w-12 h-10 p-1 rounded"
                          />
                          <Input
                            value={brandingForm.secondaryColor}
                            onChange={(e) => setBrandingForm(prev => ({ ...prev, secondaryColor: e.target.value }))}
                            placeholder="#10B981"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="accentColor">Accent Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="accentColor"
                            type="color"
                            value={brandingForm.accentColor}
                            onChange={(e) => setBrandingForm(prev => ({ ...prev, accentColor: e.target.value }))}
                            className="w-12 h-10 p-1 rounded"
                          />
                          <Input
                            value={brandingForm.accentColor}
                            onChange={(e) => setBrandingForm(prev => ({ ...prev, accentColor: e.target.value }))}
                            placeholder="#F59E0B"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Color Presets */}
                    <div className="space-y-2">
                      <Label>Color Presets</Label>
                      <div className="grid grid-cols-5 gap-2">
                        {presetColors.map((preset, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            className="h-16 p-2 border-2"
                            onClick={() => setBrandingForm(prev => ({
                              ...prev,
                              primaryColor: preset.primary,
                              secondaryColor: preset.secondary,
                              accentColor: preset.accent
                            }))}
                          >
                            <div className="space-y-1 w-full">
                              <div className="flex gap-1 h-4">
                                <div className="flex-1 rounded" style={{ backgroundColor: preset.primary }}></div>
                                <div className="flex-1 rounded" style={{ backgroundColor: preset.secondary }}></div>
                                <div className="flex-1 rounded" style={{ backgroundColor: preset.accent }}></div>
                              </div>
                              <p className="text-xs font-medium">{preset.name}</p>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Font Settings */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Typography</h3>
                    <div className="space-y-2">
                      <Label htmlFor="fontFamily">Font Family</Label>
                      <Select
                        value={brandingForm.fontFamily}
                        onValueChange={(value) => setBrandingForm(prev => ({ ...prev, fontFamily: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a font" />
                        </SelectTrigger>
                        <SelectContent>
                          {fontOptions.map((font) => (
                            <SelectItem key={font.value} value={font.value}>
                              {font.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => saveBrandingMutation.mutate(brandingForm)}
                      disabled={saveBrandingMutation.isPending}
                      className="flex-1"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saveBrandingMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}