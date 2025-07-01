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
  Lock
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
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: "",
    bio: "",
    website: "",
    company: "",
    jobTitle: ""
  });

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
            <TabsList className="grid w-full grid-cols-6 h-12">
              <TabsTrigger value="profile" className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4" />
                Profile
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

            {/* Billing Tab */}
            <TabsContent value="billing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Billing & Subscription
                  </CardTitle>
                  <CardDescription>Manage your subscription, payment methods, and billing information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Current Plan */}
                  <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">Pro Plan</h3>
                        <p className="text-gray-600">Unlimited guides, advanced analytics, priority support</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary">Active</Badge>
                          <span className="text-sm text-gray-500">Next billing: Jan 15, 2025</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">$29/mo</div>
                        <Button variant="outline" size="sm" className="mt-2">
                          Change Plan
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Payment Methods</h3>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-6 bg-blue-600 rounded text-white text-xs flex items-center justify-center font-bold">
                            VISA
                          </div>
                          <div>
                            <p className="font-medium">•••• •••• •••• 4242</p>
                            <p className="text-sm text-gray-500">Expires 12/2027</p>
                          </div>
                          <Badge variant="default" className="ml-2">Default</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Add Payment Method
                    </Button>
                  </div>

                  {/* Billing History */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Recent Invoices</h3>
                    <div className="space-y-2">
                      {[
                        { date: "Dec 15, 2024", amount: "$29.00", status: "Paid" },
                        { date: "Nov 15, 2024", amount: "$29.00", status: "Paid" },
                        { date: "Oct 15, 2024", amount: "$29.00", status: "Paid" },
                      ].map((invoice, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{invoice.date}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{invoice.amount}</span>
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              {invoice.status}
                            </Badge>
                            <Button variant="ghost" size="sm">
                              <FileText className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
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