import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Mail, Zap, Settings, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

const EMAIL_TYPES = [
  { key: 'welcome', label: 'Welcome Email', description: 'Sent when someone signs up' },
  { key: 'guide_delivery', label: 'Guide Delivery', description: 'Sent when someone downloads a guide' },
  { key: 'lead_notification', label: 'Lead Notification', description: 'Sent to you when someone signs up' },
  { key: 'password_reset', label: 'Password Reset', description: 'Sent when password reset is requested' },
  { key: 'subscription_confirmation', label: 'Subscription Confirmation', description: 'Sent when subscription is confirmed' },
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
      toast({ title: "Template updated successfully!" });
      setEditingTemplate(null);
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
    const template = templates?.find((t: any) => t.type === type);
    setEditingTemplate(type);
    setTemplateContent(template?.content || '');
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    
    updateTemplateMutation.mutate({
      type: editingTemplate,
      content: templateContent,
      enabled: true,
    });
  };

  const renderTemplateCard = (emailType: any) => {
    const template = templates?.find((t: any) => t.type === emailType.key);
    const isEditing = editingTemplate === emailType.key;
    
    return (
      <Card key={emailType.key} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{emailType.label}</CardTitle>
              <p className="text-sm text-muted-foreground">{emailType.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {template?.enabled ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Default
                </Badge>
              )}
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => isEditing ? handleSaveTemplate() : handleEditTemplate(emailType.key)}
              >
                {isEditing ? "Save" : "Edit"}
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
                  placeholder="Enter your email template content here..."
                  className="min-h-[200px]"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Use variables like {{customerName}}, {{guideName}}, {{brandName}} in your template.
                </p>
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
    const integration = integrations?.find((i: any) => i.provider === provider.key);
    
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
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Settings</h1>
          <p className="text-muted-foreground">
            Control your email templates and integrations
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <p className="text-sm text-muted-foreground">
                Customize your email templates or use our professional defaults.
                <br />
                <strong>Free users</strong> use our default templates with ConvertMag.net branding.
                <br />
                <strong>Paid users</strong> can customize templates or connect their own email service.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {EMAIL_TYPES.map((emailType) => renderTemplateCard(emailType))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Service Integrations</CardTitle>
              <p className="text-sm text-muted-foreground">
                Connect your preferred email marketing service to take full control of your email campaigns.
                When connected, our system will send leads to your service instead of using our templates.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {INTEGRATION_PROVIDERS.map((provider) => renderIntegrationCard(provider))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Settings</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure your email preferences and delivery settings.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="email-notifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications when someone downloads your guides
                    </p>
                  </div>
                  <Switch id="email-notifications" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-followup">Auto Follow-up</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically send follow-up emails after guide delivery
                    </p>
                  </div>
                  <Switch id="auto-followup" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sender-name">Sender Name</Label>
                  <Input
                    id="sender-name"
                    placeholder="Your Name or Company"
                    defaultValue={user?.firstName || ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sender-email">Sender Email</Label>
                  <Input
                    id="sender-email"
                    type="email"
                    placeholder="your-email@example.com"
                    defaultValue={user?.email || ''}
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