import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Download, Star, Users, Clock, Lock, Play } from "lucide-react";
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
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Check your email for your free practice guide.",
      });
      // Redirect to guide delivery page
      window.location.href = `/delivery/${landingData?.guide.id}`;
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!landingData) return;

    // Validate required fields
    const missingFields = landingData.landingPage.customFields
      .filter(field => field.required && !formData[field.name])
      .map(field => field.label);

    if (missingFields.length > 0) {
      toast({
        title: "Missing Information",
        description: `Please fill in: ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailField = landingData.landingPage.customFields.find(f => f.type === "email");
    if (emailField && formData[emailField.name]) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData[emailField.name])) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate SMS consent if phone is provided
    if ((landingData.landingPage as any).collectSms && formData.phone && formData.phone.trim()) {
      if (!formData.smsConsent || formData.smsConsent !== "true") {
        toast({
          title: "SMS Consent Required",
          description: "Please consent to SMS messages if you want to provide your phone number",
          variant: "destructive",
        });
        return;
      }
    }

    // Prepare submission data with SMS fields
    const submissionData = {
      ...formData,
      phone: (landingData.landingPage as any).collectSms ? (formData.phone || "") : "",
      smsConsent: ((landingData.landingPage as any).collectSms && formData.phone) ? 
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
        {/* Green accent bar */}
        <div className="w-16 h-1 bg-green-500 mx-auto mb-8"></div>
        
        {/* Main Headline */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6 leading-tight max-w-4xl mx-auto">
            {landingPage.headline || `MASTER ${guide.category?.toUpperCase()} WITH "${guide.title}"`}
          </h1>
        </div>

        {/* Content Grid */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          {/* Left Column - Benefits */}
          <div className="space-y-6">
            {guide.tags?.slice(0, 3).map((benefit, index) => (
              <div key={index} className="flex items-start space-x-4">
                <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                <p className="text-lg text-gray-700 leading-relaxed">
                  {benefit}
                </p>
              </div>
            ))}
          </div>

          {/* Right Column - Locked Video */}
          <div className="relative">
            <div className="aspect-video rounded-lg overflow-hidden bg-black relative group">
              <img 
                src={guide.thumbnailUrl || "/api/placeholder/600/400"} 
                alt={guide.title}
                className="w-full h-full object-cover"
              />
              {/* Lock Overlay */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                  <Lock className="w-8 h-8 text-white" />
                </div>
              </div>
              {/* Video title overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
                <h3 className="text-white text-xl font-bold">
                  {guide.title}
                </h3>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center mb-16">
          <Button 
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-semibold rounded-md"
            onClick={() => document.getElementById('lead-form')?.scrollIntoView({ behavior: 'smooth' })}
          >
            GET MY FREE TRAINING NOW »
          </Button>
        </div>

        {/* Lead Form Section */}
        <section id="lead-form" className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Get Your Free Practice Guide
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {landingPage.customFields.map((field) => (
              <div key={field.name}>
                <Label 
                  htmlFor={field.name}
                  className="text-sm font-medium text-gray-700"
                >
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </Label>
                
                {field.type === "select" ? (
                  <Select
                    value={formData[field.name] || ""}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, [field.name]: value }))}
                  >
                    <SelectTrigger className="w-full mt-1">
                      <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
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
                    value={formData[field.name] || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                    placeholder={`Enter your ${field.label.toLowerCase()}`}
                    className="mt-1"
                    required={field.required}
                  />
                )}
              </div>
            ))}

            {/* SMS Collection Fields */}
            {(landingData.landingPage as any).collectSms && (
              <>
                <div>
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    Phone Number (optional)
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter your phone number"
                    className="mt-1"
                  />
                </div>
                
                {formData.phone && formData.phone.trim() && (
                  <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="smsConsent"
                      checked={formData.smsConsent === "true"}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        smsConsent: e.target.checked ? "true" : "false" 
                      }))}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <Label htmlFor="smsConsent" className="text-sm text-gray-700 leading-relaxed">
                      {(landingData.landingPage as any).smsConsentText || 
                        "I consent to receive text messages from this business. Message and data rates may apply. Reply STOP to opt out."}
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                  </div>
                )}
              </>
            )}

            <Button 
              type="submit" 
              size="lg"
              disabled={submitLeadMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg font-semibold"
            >
              {submitLeadMutation.isPending ? "SENDING..." : "GET MY FREE TRAINING NOW »"}
            </Button>
          </form>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <p className="text-sm text-gray-400 mb-4">
            Consult your doctor prior to any training within our products, videos, or website. Nothing on this page, any of our websites, or any of our content or curriculum is a promise or guarantee of results, and we do not offer any legal, medical, tax or other professional advice. By using our training, you understand that the information in our products are based on our training experience only and is not professional medical advice.
          </p>
          <div className="text-sm text-gray-500">
            <p className="mb-2">Copyright 2025+ {brandingSettings?.companyName || "VidMagnet"}. All Rights Reserved</p>
            <div className="flex justify-center space-x-4">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <span>|</span>
              <a href="#" className="hover:text-white">Terms & Conditions</a>
              <span>|</span>
              <a href="#" className="hover:text-white">Contact Us</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}