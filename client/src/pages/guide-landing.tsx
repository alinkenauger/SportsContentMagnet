import { useState } from "react";
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

interface LandingPageData {
  landingPage: {
    id: number;
    title: string;
    headline: string;
    description: string;
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
    fontFamily: string;
    companyName?: string;
    tagline?: string;
  };
}

export default function GuideLanding() {
  const { customUrl } = useParams<{ customUrl: string }>();
  const { toast } = useToast();
  const [formData, setFormData] = useState<Record<string, string>>({});

  const { data: landingData, isLoading } = useQuery({
    queryKey: [`/api/landing/${customUrl}`],
  });

  const submitLeadMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      return await apiRequest(`/api/landing/${customUrl}/submit`, {
        method: "POST",
        body: JSON.stringify(data),
      });
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
    
    // Ensure at least one contact method (email or phone)
    if (!formData.email && !formData.phone) {
      toast({
        title: "Contact Method Required",
        description: "Please provide either an email address or phone number.",
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

    // Prepare submission data with SMS fields
    const submissionData = {
      ...formData,
      phone: (landingData?.landingPage as any)?.collectSms ? (formData.phone || "") : "",
      smsConsent: ((landingData?.landingPage as any)?.collectSms && formData.phone) ? 
        (formData.smsConsent === "true" ? "true" : "false") : "false"
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

  const { landingPage, guide, brandingSettings } = landingData;
  const customStyles = brandingSettings ? {
    fontFamily: brandingSettings.fontFamily,
    '--primary-color': brandingSettings.primaryColor,
    '--secondary-color': brandingSettings.secondaryColor,
    '--accent-color': brandingSettings.accentColor,
  } as React.CSSProperties : {};

  return (
    <div 
      className="min-h-screen bg-gray-50"
      style={customStyles}
    >
      {/* Header Navigation */}
      <header className="bg-white shadow-sm px-4 py-4">
        <div className="container mx-auto flex justify-between items-center max-w-6xl">
          <div className="flex items-center">
            {brandingSettings?.logoUrl ? (
              <img 
                src={brandingSettings.logoUrl} 
                alt="Logo" 
                className="h-8 object-contain"
              />
            ) : (
              <div className="text-2xl font-bold text-gray-800">
                {brandingSettings?.companyName || "VidMagnet"}
              </div>
            )}
          </div>
          <Button 
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-semibold"
            onClick={() => document.getElementById('lead-form')?.scrollIntoView({ behavior: 'smooth' })}
          >
            GET STARTED TODAY!
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Main Headline */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4 leading-tight max-w-4xl mx-auto">
            {(landingPage as any).headline || `Master sports performance and agility training with This Free Practice Guide`}
          </h1>
          {(landingPage as any).subheadline && (
            <p className="text-2xl text-gray-700 font-semibold mb-6 max-w-3xl mx-auto">
              {(landingPage as any).subheadline}
            </p>
          )}
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {(landingPage as any).description || `Download our comprehensive practice guide based on "${guide.title}" and start improving your skills today.`}
          </p>
          {(landingPage as any).urgencyText && (
            <div className="mt-6 bg-red-100 border border-red-300 rounded-lg p-4 max-w-lg mx-auto">
              <p className="text-red-800 font-semibold text-lg">
                ⏰ {(landingPage as any).urgencyText}
              </p>
            </div>
          )}
        </div>

        {/* Thumbnail and Form Section */}
        <div className="grid lg:grid-cols-2 gap-12 items-start mb-16">
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
              
              {/* Social Proof */}
              {(landingPage as any).socialProof && (
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-blue-800 font-semibold">
                    📺 {(landingPage as any).socialProof}
                  </p>
                </div>
              )}
            </div>

            {/* Professional Benefits */}
            <div className="space-y-3">
              {((landingPage as any).bulletPoints || [
                "Master proven techniques that work for all skill levels",
                "Follow step-by-step practice drills designed by professionals", 
                "Get exclusive coaching insights from industry experts",
                "Avoid the most common mistakes that hold players back"
              ]).map((benefit: string, index: number) => (
                <div key={index} className="flex items-start text-left">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 font-medium">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Lead Capture Form */}
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Get Your FREE Practice Guide
              </h2>
              <p className="text-gray-600">
                Join thousands who've improved their game with our proven techniques
              </p>
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
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-md text-lg transition-colors"
              >
                {submitLeadMutation.isPending ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    {(landingPage as any).buttonText || "GET MY FREE GUIDE NOW"}
                  </>
                )}
              </Button>
            </form>

            <p className="text-xs text-gray-500 text-center mt-4 leading-relaxed">
              By submitting this form, you agree to receive emails from us. You can unsubscribe at any time.
              {(landingPage as any).collectSms && " SMS terms apply if phone number provided."}
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center max-w-6xl">
          <p className="text-sm text-gray-400">
            © 2024 {brandingSettings?.companyName || "VidMagnet"}. All rights reserved. 
            {" "}By submitting this form, you agree to our privacy policy and terms of service.
          </p>
        </div>
      </footer>
    </div>
  );
}