import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mail, Zap, Settings, MessageSquare, CheckCircle, AlertCircle } from "lucide-react";

export default function EmailSettings() {
  const { toast } = useToast();
  
  const { data: emailIntegrations, isLoading: integrationsLoading } = useQuery({
    queryKey: ["/api/email-integrations"],
  });

  const { data: emailTemplates, isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/email-templates"],
  });

  const saveIntegrationMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/email-integrations", data);
    },
    onSuccess: () => {
      toast({
        title: "Integration saved",
        description: "Your email integration has been configured successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email-integrations"] });
    },
    onError: (error) => {
      toast({
        title: "Error saving integration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/email-templates", data);
    },
    onSuccess: () => {
      toast({
        title: "Template saved",
        description: "Your email template has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
    },
    onError: (error) => {
      toast({
        title: "Error saving template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleZapierSetup = (webhookUrl: string) => {
    saveIntegrationMutation.mutate({
      provider: "zapier",
      webhookUrl,
      isActive: true,
    });
  };

  const handleTemplateUpdate = (templateType: string, subject: string, htmlContent: string) => {
    saveTemplateMutation.mutate({
      templateType,
      subject,
      htmlContent,
      isActive: true,
      requiredVariables: getRequiredVariables(templateType),
    });
  };

  const getRequiredVariables = (templateType: string) => {
    switch (templateType) {
      case "guide_delivery":
        return ["firstName", "guideTitle", "guideUrl", "downloadUrl", "brandName", "creatorName", "brandWebsite"];
      case "welcome":
        return ["firstName", "email"];
      case "password_reset":
        return ["firstName", "resetUrl"];
      default:
        return [];
    }
  };

  if (integrationsLoading || templatesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Email Management</h1>
            <p className="text-muted-foreground">Configure email integrations and customize your templates</p>
          </div>
        </div>

        <Tabs defaultValue="integrations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="integrations">Email Integrations</TabsTrigger>
            <TabsTrigger value="templates">Email Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Zapier Integration
                </CardTitle>
                <CardDescription>
                  Connect your email marketing tools via Zapier for advanced automation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">How to set up Zapier:</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Create a new Zap in Zapier</li>
                    <li>Set trigger to "Webhooks by Zapier" → "Catch Hook"</li>
                    <li>Copy the webhook URL below</li>
                    <li>Set action to your email tool (Mailchimp, ConvertKit, etc.)</li>
                    <li>Map the lead data to your email list</li>
                  </ol>
                </div>
                
                <ZapierSetupForm onSetup={handleZapierSetup} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Direct Integrations</CardTitle>
                <CardDescription>
                  Coming soon: Direct connections to popular email marketing platforms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {["MailChimp", "ConvertKit", "ActiveCampaign", "HubSpot"].map((provider) => (
                    <div key={provider} className="text-center p-4 border rounded-lg bg-gray-50">
                      <div className="text-2xl mb-2">📧</div>
                      <p className="text-sm font-medium">{provider}</p>
                      <Badge variant="secondary" className="mt-2">Coming Soon</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Email Templates
                </CardTitle>
                <CardDescription>
                  Customize the emails sent to your leads (Free users use default templates)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmailTemplateEditor
                  templates={emailTemplates || []}
                  onUpdate={handleTemplateUpdate}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ZapierSetupForm({ onSetup }: { onSetup: (webhookUrl: string) => void }) {
  const [webhookUrl, setWebhookUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (webhookUrl) {
      onSetup(webhookUrl);
      setWebhookUrl("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="webhook-url">Zapier Webhook URL</Label>
        <Input
          id="webhook-url"
          type="url"
          placeholder="https://hooks.zapier.com/hooks/catch/..."
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          required
        />
      </div>
      <Button type="submit">Connect Zapier</Button>
    </form>
  );
}

function EmailTemplateEditor({ templates, onUpdate }: { templates: any[], onUpdate: (type: string, subject: string, content: string) => void }) {
  const [activeTemplate, setActiveTemplate] = useState("guide_delivery");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");

  const templateTypes = [
    { id: "guide_delivery", name: "Guide Delivery", description: "Sent to customers when they download a guide" },
    { id: "welcome", name: "Welcome Email", description: "Sent to new users when they sign up" },
    { id: "password_reset", name: "Password Reset", description: "Sent when users request password reset" },
  ];

  const currentTemplate = templates.find(t => t.templateType === activeTemplate);

  const handleSave = () => {
    onUpdate(activeTemplate, subject, htmlContent);
  };

  const loadTemplate = (templateType: string) => {
    const template = templates.find(t => t.templateType === templateType);
    if (template) {
      setSubject(template.subject);
      setHtmlContent(template.htmlContent);
    } else {
      // Load default template
      setSubject(getDefaultSubject(templateType));
      setHtmlContent(getDefaultContent(templateType));
    }
  };

  const getDefaultSubject = (templateType: string) => {
    switch (templateType) {
      case "guide_delivery":
        return "Your {{guideTitle}} is ready!";
      case "welcome":
        return "Welcome to {{brandName}}!";
      case "password_reset":
        return "Reset your password";
      default:
        return "";
    }
  };

  const getDefaultContent = (templateType: string) => {
    switch (templateType) {
      case "guide_delivery":
        return `<div style="padding: 30px; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h2 style="margin-top: 0; color: #333;">Hi {{firstName}}!</h2>
    <p style="margin: 20px 0;">Congratulations on getting your copy of "<strong>{{guideTitle}}</strong>" from {{brandName}}!</p>
    <p style="margin: 20px 0;">We hope you enjoy it and find it helpful.</p>
    <div style="margin: 30px 0;">
        <a href="{{guideUrl}}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Access Your Guide</a>
    </div>
    <p style="margin: 20px 0;">Or if you prefer, you can also download the PDF guide here: <a href="{{downloadUrl}}" style="color: #10b981; text-decoration: none;">{{downloadUrl}}</a></p>
    <p style="margin: 20px 0;">Thanks and we wish you much success!</p>
    <p style="margin: 30px 0 10px 0;">{{creatorName}}<br>The {{brandName}}<br><a href="{{brandWebsite}}" style="color: #10b981; text-decoration: none;">{{brandWebsite}}</a></p>
</div>`;
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {templateTypes.map((type) => (
          <Button
            key={type.id}
            variant={activeTemplate === type.id ? "default" : "outline"}
            onClick={() => {
              setActiveTemplate(type.id);
              loadTemplate(type.id);
            }}
          >
            {type.name}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="subject">Email Subject</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter email subject..."
          />
        </div>

        <div>
          <Label htmlFor="content">Email Content (HTML)</Label>
          <textarea
            id="content"
            className="w-full h-64 p-3 border rounded-md font-mono text-sm"
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            placeholder="Enter HTML content..."
          />
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleSave}>Save Template</Button>
          <Button variant="outline" onClick={() => loadTemplate(activeTemplate)}>
            Reset to Default
          </Button>
        </div>
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-yellow-600" />
          <h4 className="font-semibold text-yellow-800">Available Variables</h4>
        </div>
        <div className="text-sm text-yellow-700">
          {getRequiredVariables(activeTemplate).map((variable) => (
            <code key={variable} className="bg-yellow-100 px-2 py-1 rounded mr-2">
              {`{{${variable}}}`}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
}

function getRequiredVariables(templateType: string) {
  switch (templateType) {
    case "guide_delivery":
      return ["firstName", "guideTitle", "guideUrl", "downloadUrl", "brandName", "creatorName", "brandWebsite"];
    case "welcome":
      return ["firstName", "email"];
    case "password_reset":
      return ["firstName", "resetUrl"];
    default:
      return [];
  }
}