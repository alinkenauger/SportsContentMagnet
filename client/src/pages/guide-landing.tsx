import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Download, Star, Users, Clock, Lock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { safeHttpUrl, safePublicAssetUrl } from "@/lib/safe-url";

interface LandingPageData {
  landingPage: {
    id: number;
    title: string;
    headline: string;
    description: string;
    subheadline?: string;
    bulletPoints?: string[];
    buttonText?: string;
    disclaimer?: string;
    collectSms?: boolean;
    smsConsentText?: string;
    customFields: Array<{
      name: string;
      label: string;
      type: string;
      required: boolean;
      options?: string[];
    }>;
  };
  guide: {
    id: number;
    title: string;
    description: string;
    thumbnailUrl: string;
    category: string;
    tags: string[];
  };
  brandingSettings?: {
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily?: string;
    bodyFontFamily?: string;
    headingFontFamily?: string;
    backgroundColor?: string;
    surfaceColor?: string;
    textColor?: string;
    companyName?: string;
    displayName?: string;
    tagline?: string;
    faviconUrl?: string;
    websiteUrl?: string;
    privacyUrl?: string;
    termsUrl?: string;
    onPrimaryColor?: string;
    showPoweredBy?: boolean;
  };
  branding?: LandingPageData["brandingSettings"] | { appearance?: LandingPageData["brandingSettings"] };
}

type LeadSubmissionPayload = {
  email: string;
  firstName?: string;
  phone?: string;
  smsConsent: boolean;
  customFieldData: Record<string, string>;
};

const CONTACT_FIELD_NAMES = new Set(["email", "firstName", "phone", "smsConsent"]);

function resolveBranding(data?: LandingPageData) {
  if (!data) return undefined;
  if (data.branding && "appearance" in data.branding) return data.branding.appearance;
  return (data.branding as LandingPageData["brandingSettings"] | undefined) || data.brandingSettings;
}

export default function GuideLanding() {
  const { customUrl } = useParams<{ customUrl: string }>();
  const { toast } = useToast();
  const [formData, setFormData] = useState<Record<string, string>>({});

  const { data: landingData, isLoading } = useQuery<LandingPageData>({
    queryKey: [`/api/landing/${customUrl}`],
  });

  useEffect(() => {
    if (!landingData) return;
    const branding = resolveBranding(landingData);
    const brandName = branding?.displayName || branding?.companyName || "VidMagnet";
    document.title = `${landingData.landingPage.headline || landingData.guide.title} — ${brandName}`;
    const favicon = safePublicAssetUrl(branding?.faviconUrl);
    if (favicon) {
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = favicon;
    }
  }, [landingData]);

  const submitLeadMutation = useMutation({
    mutationFn: async (data: LeadSubmissionPayload) => {
      const response = await apiRequest(`/api/landing/${customUrl}/submit`, "POST", data);
      return await response.json();
    },
    onSuccess: (response: any) => {
      // Redirect to the delivery URL provided by the server
      window.location.href = response.deliveryUrl;
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    // If email field exists in custom fields and is required, validate it
    const emailField = (landingData?.landingPage as any)?.customFields?.find((field: any) => field.name === 'email');
    if (emailField?.required && !formData.email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    // Check SMS consent requirement
    if ((landingData?.landingPage as any)?.collectSms && formData.phone && !formData.smsConsent) {
      toast({
        title: "SMS Consent Required",
        description: "Please provide consent for SMS messages if you want to share your phone number.",
        variant: "destructive",
      });
      return;
    }

    const customFieldData = Object.fromEntries(
      (landingData?.landingPage.customFields || [])
        .filter((field) => !CONTACT_FIELD_NAMES.has(field.name))
        .map((field) => [field.name, formData[field.name] || ""]),
    );
    const phone = landingData?.landingPage.collectSms
      ? formData.phone?.trim() || undefined
      : undefined;
    const submissionData: LeadSubmissionPayload = {
      email: formData.email.trim(),
      firstName: formData.firstName?.trim() || undefined,
      phone,
      smsConsent: Boolean(phone && formData.smsConsent === "true"),
      customFieldData,
    };

    submitLeadMutation.mutate(submissionData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!landingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Page Not Found</h1>
            <p className="text-gray-600">
              The landing page you're looking for doesn't exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { landingPage, guide } = landingData;
  const brandingSettings = resolveBranding(landingData);
  const brandName = brandingSettings?.displayName || brandingSettings?.companyName || "VidMagnet";
  const bodyFont = brandingSettings?.bodyFontFamily || brandingSettings?.fontFamily;
  const headingFont = brandingSettings?.headingFontFamily || bodyFont;
  const primaryColor = brandingSettings?.primaryColor || "#2563EB";
  const secondaryColor = brandingSettings?.secondaryColor || "#10B981";
  const surfaceColor = brandingSettings?.surfaceColor || "#FFFFFF";
  const textColor = brandingSettings?.textColor || "#0F172A";
  const logoUrl = safePublicAssetUrl(brandingSettings?.logoUrl);
  const websiteUrl = safeHttpUrl(brandingSettings?.websiteUrl);
  const privacyUrl = safeHttpUrl(brandingSettings?.privacyUrl);
  const termsUrl = safeHttpUrl(brandingSettings?.termsUrl);
  const customStyles = brandingSettings ? {
    fontFamily: bodyFont,
    backgroundColor: brandingSettings.backgroundColor || "#F8FAFC",
    color: textColor,
    '--primary-color': primaryColor,
    '--secondary-color': secondaryColor,
    '--accent-color': brandingSettings.accentColor,
  } as React.CSSProperties : {};

  return (
    <div 
      className="min-h-screen bg-gray-50"
      style={customStyles}
    >
      {/* Header Navigation */}
      <header className="border-b px-4 py-4" style={{ backgroundColor: surfaceColor, borderColor: `${primaryColor}22` }}>
        <div className="container mx-auto flex justify-between items-center max-w-6xl">
          <div className="flex items-center">
            {logoUrl ? (
              <img 
                src={logoUrl}
                alt="Logo" 
                className="h-12 max-w-[220px] object-contain"
              />
            ) : (
              <div className="text-2xl font-bold text-gray-800">
                {brandName}
              </div>
            )}
          </div>
          <Button 
            className="px-6 py-2 rounded-md font-semibold"
            style={{ backgroundColor: primaryColor, color: brandingSettings?.onPrimaryColor || "#FFFFFF" }}
            onClick={() => document.getElementById('lead-form')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Get the guide
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Compact Headline Above Content */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight max-w-4xl mx-auto" style={{ color: textColor, fontFamily: headingFont }}>
            {landingPage.headline || `Get the ${guide.title} implementation guide`}
          </h1>
          {(landingPage as any).subheadline && (
            <p className="text-xl font-semibold mb-4 max-w-3xl mx-auto" style={{ color: textColor }}>
              {landingPage.subheadline}
            </p>
          )}
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {landingPage.description || `Get a structured, actionable resource based on “${guide.title}.”`}
          </p>
        </div>

        {/* Thumbnail and Form Section */}
        <div className="grid lg:grid-cols-2 gap-8 items-start mb-12">
          {/* Left Column - Video with Benefits Below */}
          <div>
            {/* Video Thumbnail with Lock */}
            <div className="relative mb-8">
              <div className="aspect-video rounded-lg overflow-hidden bg-black relative shadow-2xl">
                <img 
                  src={guide.thumbnailUrl || "/api/placeholder/600/400"} 
                  alt={guide.title}
                  className="w-full h-full object-cover"
                />
                {/* Lock Overlay */}
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Lock className="w-16 h-16 mx-auto mb-4 opacity-90" />
                    <h3 className="text-2xl font-bold mb-2">Unlock Your Free Guide</h3>
                    <p className="text-lg opacity-90">Enter your email to access instantly</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Professional Benefits */}
            <div className="space-y-3">
              {(landingPage.bulletPoints || [
                "Start with a clear quick-win action",
                "Work through structured implementation steps",
                "Use the included checklist or worksheet",
                "Finish with one relevant next step"
              ]).map((benefit: string, index: number) => (
                <div key={index} className="flex items-start text-left">
                  <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" style={{ color: secondaryColor }} />
                  <span className="font-medium" style={{ color: textColor }}>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Lead Capture Form */}
          <div className="rounded-lg shadow-xl border p-8" style={{ backgroundColor: surfaceColor, borderColor: `${primaryColor}22` }}>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Get your free guide
              </h2>
              <p className="text-gray-600 mb-4">
                Enter your details for immediate access to the full resource.
              </p>
              
              {/* Clear Access Promise */}
              <div className="border rounded-lg p-4 mb-4" style={{ backgroundColor: `${secondaryColor}10`, borderColor: `${secondaryColor}35` }}>
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="w-5 h-5" style={{ color: secondaryColor }} />
                  <p className="font-medium" style={{ color: textColor }}>
                    Immediate access after submission
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" id="lead-form">
              {/* Custom Fields */}
              {(landingPage as any).customFields?.map((field: any) => (
                <div key={field.name}>
                  <Label htmlFor={field.name} className="text-sm font-medium text-gray-700">
                    {field.label} {field.required && '*'}
                  </Label>
                  
                  {field.type === 'select' ? (
                    <Select
                      value={formData[field.name] || ""}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, [field.name]: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((option: any) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={field.name}
                      type={field.type}
                      required={field.required}
                      className="mt-1 block w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                      value={formData[field.name] || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                      placeholder={`Enter your ${field.label.toLowerCase()}`}
                    />
                  )}
                </div>
              ))}

              {/* SMS Collection (if enabled) */}
              {(landingPage as any).collectSms && (
                <>
                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                      Phone Number (optional)
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      className="mt-1 block w-full border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                      value={formData.phone || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  
                  {formData.phone && (
                    <div className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        id="smsConsent"
                        className="mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        checked={formData.smsConsent === "true"}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          smsConsent: e.target.checked ? "true" : "false" 
                        }))}
                      />
                      <Label htmlFor="smsConsent" className="text-sm text-gray-600 leading-relaxed">
                        {(landingPage as any).smsConsentText || 
                          "I consent to receive SMS notifications and updates. Message frequency varies. Reply STOP to opt-out."}
                      </Label>
                    </div>
                  )}
                </>
              )}

              <Button
                type="submit"
                disabled={submitLeadMutation.isPending}
                className="w-full font-bold py-3 px-6 rounded-md text-lg transition-opacity hover:opacity-90"
                style={{ backgroundColor: primaryColor, color: brandingSettings?.onPrimaryColor || "#FFFFFF" }}
              >
                {submitLeadMutation.isPending ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Unlocking your guide...
                  </div>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    {landingPage.buttonText || "Get the free guide"}
                  </>
                )}
              </Button>
              
              {/* What happens next */}
              <div className="text-center pt-3">
                <p className="text-sm text-gray-600 mb-2">
                  Your guide opens immediately after you submit.
                </p>
                <div className="border rounded-lg p-3" style={{ backgroundColor: `${primaryColor}0D`, borderColor: `${primaryColor}25` }}>
                  <p className="text-sm font-medium" style={{ color: textColor }}>
                    Next, you’ll be taken to the full guide with interactive actions you can work through at your pace.
                  </p>
                </div>
              </div>
            </form>

            <div className="text-xs text-gray-500 text-center mt-4 leading-relaxed space-y-2">
              <p>
                By submitting this form, you agree to receive emails from us. You can unsubscribe at any time.
                {(landingPage as any).collectSms && " SMS terms apply if phone number provided."}
              </p>
              {(landingPage as any).disclaimer && (
                <p className="italic">
                  {(landingPage as any).disclaimer}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-16" style={{ backgroundColor: surfaceColor, borderColor: `${primaryColor}22` }}>
        <div className="container mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-center text-sm opacity-65 sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} {brandName}. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {websiteUrl && <a href={websiteUrl} target="_blank" rel="noreferrer">Website</a>}
            {privacyUrl && <a href={privacyUrl} target="_blank" rel="noreferrer">Privacy</a>}
            {termsUrl && <a href={termsUrl} target="_blank" rel="noreferrer">Terms</a>}
            {brandingSettings?.showPoweredBy !== false && <span>Powered by VidMagnet</span>}
          </div>
        </div>
      </footer>
    </div>
  );
}
