import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Mail, Zap, Settings, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

const EMAIL_TYPES = [
  { 
    key: 'welcome', 
    label: 'Welcome Email', 
    description: 'Sent when someone signs up',
    category: 'system',
    requiredElements: ['username', 'tempPassword', 'loginUrl'],
    protectedContent: '=== LOGIN CREDENTIALS (REQUIRED - DO NOT DELETE) ===\nUsername: {{username}}\nPassword: {{tempPassword}}\nLogin URL: {{loginUrl}}\n=== END REQUIRED SECTION ===',
    defaultContent: 'Welcome to ConvertMag.net!\n\nYour account has been successfully created. You can now start transforming your content into high-converting lead magnets.\n\n=== LOGIN CREDENTIALS (REQUIRED - DO NOT DELETE) ===\nUsername: {{username}}\nPassword: {{tempPassword}}\nLogin URL: {{loginUrl}}\n=== END REQUIRED SECTION ===\n\nGet started by creating your first guide from any YouTube video, document, or audio file.\n\nQuestions? Reply to this email for support.\n\nBest regards,\nThe ConvertMag.net Team',
    canDisable: false
  },
  { 
    key: 'password_reset', 
    label: 'Password Reset', 
    description: 'Sent when password reset is requested',
    category: 'system',
    requiredElements: ['resetUrl'],
    protectedContent: '=== PASSWORD RESET (REQUIRED - DO NOT DELETE) ===\nReset your password: {{resetUrl}}\n=== END REQUIRED SECTION ===',
    defaultContent: 'Password Reset Request\n\nWe received a request to reset your ConvertMag.net password.\n\n=== PASSWORD RESET (REQUIRED - DO NOT DELETE) ===\nReset your password: {{resetUrl}}\n=== END REQUIRED SECTION ===\n\nThis link expires in 24 hours for security reasons.\n\nIf you did not request this reset, please ignore this email.\n\nBest regards,\nThe ConvertMag.net Team',
    canDisable: false
  },
  { 
    key: 'subscription_confirmation', 
    label: 'Subscription Confirmation', 
    description: 'Sent when subscription is confirmed',
    category: 'system',
    requiredElements: ['planName', 'amount', 'billingDate', 'manageUrl'],
    protectedContent: '=== SUBSCRIPTION DETAILS (REQUIRED - DO NOT DELETE) ===\nPlan: {{planName}}\nAmount: ${{amount}}\nNext billing date: {{billingDate}}\nManage subscription: {{manageUrl}}\n=== END REQUIRED SECTION ===',
    defaultContent: 'Subscription Confirmed - Welcome to Premium!\n\nThank you for upgrading your ConvertMag.net account. You now have access to unlimited lead magnets and advanced features.\n\n=== SUBSCRIPTION DETAILS (REQUIRED - DO NOT DELETE) ===\nPlan: {{planName}}\nAmount: ${{amount}}\nNext billing date: {{billingDate}}\nManage subscription: {{manageUrl}}\n=== END REQUIRED SECTION ===\n\nYour Premium Features Include:\n• Unlimited lead magnet creation\n• Custom branding and logos\n• Advanced analytics and tracking\n• Priority customer support\n• Multiple brand workspaces\n\nStart maximizing your lead generation today!\n\nQuestions about your subscription? Contact our billing support.\n\nThe ConvertMag.net Team',
    canDisable: false
  },
  { 
    key: 'lead_notification', 
    label: 'Lead Notification', 
    description: 'Sent to you when someone signs up',
    category: 'system',
    requiredElements: ['leadName', 'leadEmail', 'guideName', 'captureTime'],
    protectedContent: '=== LEAD DETAILS (REQUIRED - DO NOT DELETE) ===\nName: {{leadName}}\nEmail: {{leadEmail}}\nGuide: {{guideName}}\nCaptured: {{captureTime}}\n=== END REQUIRED SECTION ===',
    defaultContent: 'New Lead Captured!\n\nGreat news! Someone just downloaded one of your lead magnets.\n\n=== LEAD DETAILS (REQUIRED - DO NOT DELETE) ===\nName: {{leadName}}\nEmail: {{leadEmail}}\nGuide: {{guideName}}\nCaptured: {{captureTime}}\n=== END REQUIRED SECTION ===\n\nLogin to your dashboard to view full lead details and follow up.\n\nKeep creating amazing content!\n\nThe ConvertMag.net Team',
    canDisable: false
  },
  { 
    key: 'guide_delivery', 
    label: 'Guide Delivery', 
    description: 'Sent when someone downloads a guide',
    category: 'guide',
    requiredElements: ['guideName', 'downloadUrl'],
    protectedContent: '=== GUIDE DOWNLOAD (REQUIRED - DO NOT DELETE) ===\nGuide: {{guideName}}\nDownload: {{downloadUrl}}\n=== END REQUIRED SECTION ===',
    defaultContent: 'Your Free Guide is Ready!\n\nThank you for your interest. Here is your requested guide with valuable insights to help you improve your skills.\n\n=== GUIDE DOWNLOAD (REQUIRED - DO NOT DELETE) ===\nGuide: {{guideName}}\nDownload: {{downloadUrl}}\n=== END REQUIRED SECTION ===\n\nWe hope you find this guide valuable. Feel free to share it with others who might benefit.\n\nLooking for more resources? Visit our website for additional guides and training materials.\n\nBest regards,\n{{brandName || "ConvertMag.net"}}',
    canDisable: true
  },
];

const INTEGRATION_PROVIDERS = [
  { key: 'sendgrid', label: 'SendGrid', description: 'Professional email delivery' },
  { key: 'mailchimp', label: 'Mailchimp', description: 'Email marketing automation' },
  { key: 'convertkit', label: 'ConvertKit', description: 'Creator-focused email marketing' },
  { key: 'activecampaign', label: 'ActiveCampaign', description: 'Advanced email automation' },
  { key: 'zapier', label: 'Zapier', description: 'Connect to any email service' },
];

export default function EmailSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('templates');
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [templateContent, setTemplateContent] = useState('');
  const [logoType, setLogoType] = useState('default');
  const [textLogo, setTextLogo] = useState('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/email-templates'],
    retry: false,
  });

  const { data: integrations, isLoading: integrationsLoading } = useQuery({
    queryKey: ['/api/email-integrations'],
    retry: false,
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (data: { type: string; content: string; enabled: boolean }) => {
      return apiRequest('POST', '/api/email-templates', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      setEditingTemplate(null);
      setTemplateContent('');
      toast({ title: "Template updated successfully!" });
    },
    onError: (error) => {
      toast({ title: "Failed to update template", description: error.message, variant: "destructive" });
    },
  });

  const createIntegrationMutation = useMutation({
    mutationFn: async (data: { provider: string; settings: any }) => {
      return apiRequest('POST', '/api/email-integrations', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-integrations'] });
      toast({ title: "Integration created successfully!" });
    },
    onError: (error) => {
      toast({ title: "Failed to create integration", description: error.message, variant: "destructive" });
    },
  });

  const handleEditTemplate = (type: string) => {
    const template = Array.isArray(templates) ? templates.find((t: any) => t.type === type) : null;
    const emailType = EMAIL_TYPES.find(t => t.key === type);
    setEditingTemplate(type);
    setTemplateContent(template?.content || emailType?.defaultContent || '');
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    
    if (!templateContent.trim()) {
      toast({
        title: "Error",
        description: "Template content cannot be empty",
        variant: "destructive",
      });
      return;
    }

    // Validate required elements for system emails
    const emailType = EMAIL_TYPES.find(t => t.key === editingTemplate);
    if (emailType && emailType.requiredElements) {
      const missingElements = emailType.requiredElements.filter(element => 
        !templateContent.includes(`{{${element}}}`)
      );
      
      if (missingElements.length > 0) {
        toast({
          title: "Missing Required Elements",
          description: `This email must contain: ${missingElements.map(e => `{{${e}}}`).join(', ')}`,
          variant: "destructive",
        });
        return;
      }
    }
    
    updateTemplateMutation.mutate({
      type: editingTemplate,
      content: templateContent,
      enabled: true,
    });
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingLogo(true);
    const formData = new FormData();
    formData.append('logo', file);

    try {
      const response = await fetch('/api/email-logo-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      const data = await response.json();
      setLogoType('custom');
      toast({
        title: "Logo Uploaded",
        description: "Your logo has been uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const renderTemplateCard = (emailType: any) => {
    const template = Array.isArray(templates) ? templates.find((t: any) => t.type === emailType.key) : null;
    const isEditing = editingTemplate === emailType.key;
    const hasExternalIntegration = Array.isArray(integrations) && integrations.some((i: any) => i.isActive);
    
    return (
      <Card key={emailType.key} className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {emailType.label}
                {emailType.category === 'system' && (
                  <Badge variant="secondary">System Email</Badge>
                )}
                {emailType.canDisable && (
                  <Badge variant="outline">Optional</Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{emailType.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {emailType.canDisable && hasExternalIntegration && (
                <Switch defaultChecked={template?.isActive !== false} />
              )}
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => isEditing ? setEditingTemplate(null) : handleEditTemplate(emailType.key)}
              >
                {isEditing ? "Cancel" : "Edit"}
              </Button>
            </div>
          </div>
        </CardHeader>
        {isEditing && (
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor={`template-${emailType.key}`}>Email Template</Label>
                <Textarea
                  id={`template-${emailType.key}`}
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  placeholder={emailType.defaultContent || "Enter your email template content here..."}
                  className="min-h-[200px]"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Use variables like customerName, guideName, brandName in your template.
                </p>
                {emailType.requiredElements && (
                  <div className="bg-blue-50 p-3 rounded-lg mt-2">
                    <p className="text-sm font-medium text-blue-800 mb-1">Required Elements:</p>
                    <p className="text-sm text-blue-600">
                      This email must include: {emailType.requiredElements.map((e: string) => `{{${e}}}`).join(', ')}
                    </p>
                  </div>
                )}
                {emailType.category === 'system' && (
                  <div className="bg-orange-50 p-3 rounded-lg mt-2">
                    <p className="text-sm font-medium text-orange-800 mb-1">System Email</p>
                    <p className="text-sm text-orange-600">
                      This email is sent automatically by the system. Required elements cannot be removed.
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveTemplate} disabled={updateTemplateMutation.isPending}>
                  {updateTemplateMutation.isPending ? "Saving..." : "Save Template"}
                </Button>
                <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  const renderIntegrationCard = (provider: any) => {
    const integration = Array.isArray(integrations) ? integrations.find((i: any) => i.provider === provider.key) : null;
    
    return (
      <Card key={provider.key} className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{provider.label}</CardTitle>
              <p className="text-sm text-muted-foreground">{provider.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {integration?.enabled ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline">Not Connected</Badge>
              )}
              <Button
                variant={integration?.enabled ? "outline" : "default"}
                size="sm"
                onClick={() => {
                  if (integration?.enabled) {
                    // Disconnect
                  } else {
                    // Connect
                    createIntegrationMutation.mutate({
                      provider: provider.key,
                      settings: {}
                    });
                  }
                }}
              >
                {integration?.enabled ? "Disconnect" : "Connect"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Email Settings</h1>
        <p className="text-muted-foreground">
          Manage your email templates and integrations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <p className="text-sm text-muted-foreground">
                Customize your automated email templates. System emails require specific elements and cannot be disabled.
              </p>
            </CardHeader>
          </Card>
          
          {templatesLoading ? (
            <div className="text-center py-8">Loading templates...</div>
          ) : (
            EMAIL_TYPES.map(renderTemplateCard)
          )}
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Integrations</CardTitle>
              <p className="text-sm text-muted-foreground">
                Connect external email marketing tools. When connected, you can disable guide delivery emails to use your own system.
              </p>
            </CardHeader>
          </Card>
          
          {integrationsLoading ? (
            <div className="text-center py-8">Loading integrations...</div>
          ) : (
            INTEGRATION_PROVIDERS.map(renderIntegrationCard)
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {/* Global Email Logo Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Email Logo (Paid Feature)</CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose how your logo appears in all email templates
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={logoType === 'default' ? 'default' : 'outline'}
                    onClick={() => setLogoType('default')}
                    className="text-left"
                  >
                    ConvertMag.net Logo
                  </Button>
                  <Button
                    variant={logoType === 'none' ? 'default' : 'outline'}
                    onClick={() => setLogoType('none')}
                    className="text-left"
                  >
                    No Logo
                  </Button>
                  <Button
                    variant={logoType === 'text' ? 'default' : 'outline'}
                    onClick={() => setLogoType('text')}
                    className="text-left"
                  >
                    Text Logo
                  </Button>
                  <div className="relative">
                    <Button
                      variant={logoType === 'custom' ? 'default' : 'outline'}
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      disabled={isUploadingLogo}
                      className="w-full text-left"
                    >
                      {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                    </Button>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </div>
                </div>
                {logoType === 'text' && (
                  <div className="space-y-2">
                    <Label htmlFor="text-logo">Text Logo</Label>
                    <Input
                      id="text-logo"
                      value={textLogo}
                      onChange={(e) => setTextLogo(e.target.value)}
                      placeholder="Your Company Name"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <Switch id="email-notifications" defaultChecked />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications about new leads and account updates
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-followup">Auto Follow-up</Label>
                    <Switch id="auto-followup" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Automatically send follow-up emails to new leads
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sender-name">Sender Name</Label>
                  <Input
                    id="sender-name"
                    placeholder="Your Name or Company"
                    defaultValue={(user as any)?.firstName || ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sender-email">Sender Email</Label>
                  <Input
                    id="sender-email"
                    type="email"
                    placeholder="your-email@example.com"
                    defaultValue={(user as any)?.email || ''}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}