import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Download, Star, Users, Clock } from "lucide-react";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: landingData, isLoading } = useQuery<LandingPageData>({
    queryKey: ["/api/landing", customUrl],
    queryFn: async () => {
      const response = await fetch(`/api/landing/${customUrl}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!customUrl,
  });

  const submitLeadMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const response = await fetch(`/api/landing/${customUrl}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: data.firstName,
          email: data.email,
          customFieldData: data,
        }),
      });

      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (result) => {
      // Redirect to delivery page
      window.location.href = result.deliveryUrl;
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit form. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!landingData?.landingPage.customFields) return;

    // Validate required fields
    const requiredFields = landingData.landingPage.customFields.filter(field => field.required);
    const missingFields = requiredFields.filter(field => !formData[field.name]?.trim());

    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in: ${missingFields.map(f => f.label).join(", ")}`,
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!landingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold text-slate-800 mb-4">Page Not Found</h1>
            <p className="text-slate-600">
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
      className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50"
      style={customStyles}
    >
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          {brandingSettings?.logoUrl && (
            <img 
              src={brandingSettings.logoUrl} 
              alt="Logo" 
              className="h-16 mx-auto mb-4 object-contain"
            />
          )}
          {brandingSettings?.companyName && (
            <h1 
              className="text-2xl font-bold mb-2"
              style={{ 
                color: brandingSettings.primaryColor,
                fontFamily: brandingSettings.fontFamily 
              }}
            >
              {brandingSettings.companyName}
            </h1>
          )}
          {brandingSettings?.tagline && (
            <p 
              className="text-slate-600"
              style={{ fontFamily: brandingSettings.fontFamily }}
            >
              {brandingSettings.tagline}
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Left Column - Guide Preview */}
          <div className="space-y-6">
            {/* Hero Section */}
            <div className="text-center md:text-left">
              <h2 
                className="text-4xl font-bold text-slate-800 mb-4"
                style={{ fontFamily: brandingSettings?.fontFamily }}
              >
                {landingPage.headline || `Get Your ${guide.title}`}
              </h2>
              <p 
                className="text-xl text-slate-600 mb-6"
                style={{ fontFamily: brandingSettings?.fontFamily }}
              >
                {landingPage.description}
              </p>
            </div>

            {/* Guide Preview */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <img 
                  src={guide.thumbnailUrl || "/api/placeholder/400/225"} 
                  alt={guide.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <h3 
                    className="text-xl font-bold text-slate-800 mb-2"
                    style={{ fontFamily: brandingSettings?.fontFamily }}
                  >
                    {guide.title}
                  </h3>
                  <p 
                    className="text-slate-600 mb-4"
                    style={{ fontFamily: brandingSettings?.fontFamily }}
                  >
                    {guide.description}
                  </p>
                  
                  {/* Tags */}
                  {guide.tags && guide.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {guide.tags.slice(0, 3).map((tag, index) => (
                        <span 
                          key={index} 
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                          style={{ 
                            backgroundColor: `${brandingSettings?.primaryColor}20`,
                            color: brandingSettings?.primaryColor,
                            fontFamily: brandingSettings?.fontFamily 
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Benefits */}
            <Card>
              <CardContent className="p-6">
                <h4 
                  className="text-lg font-bold text-slate-800 mb-4"
                  style={{ fontFamily: brandingSettings?.fontFamily }}
                >
                  What You'll Get:
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <CheckCircle 
                      className="w-5 h-5 flex-shrink-0"
                      style={{ color: brandingSettings?.secondaryColor || "#10B981" }}
                    />
                    <span 
                      className="text-slate-700"
                      style={{ fontFamily: brandingSettings?.fontFamily }}
                    >
                      Step-by-step practice drills
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle 
                      className="w-5 h-5 flex-shrink-0"
                      style={{ color: brandingSettings?.secondaryColor || "#10B981" }}
                    />
                    <span 
                      className="text-slate-700"
                      style={{ fontFamily: brandingSettings?.fontFamily }}
                    >
                      Professional coaching techniques
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle 
                      className="w-5 h-5 flex-shrink-0"
                      style={{ color: brandingSettings?.secondaryColor || "#10B981" }}
                    />
                    <span 
                      className="text-slate-700"
                      style={{ fontFamily: brandingSettings?.fontFamily }}
                    >
                      Personalized recommendations
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle 
                      className="w-5 h-5 flex-shrink-0"
                      style={{ color: brandingSettings?.secondaryColor || "#10B981" }}
                    />
                    <span 
                      className="text-slate-700"
                      style={{ fontFamily: brandingSettings?.fontFamily }}
                    >
                      Instant download access
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Social Proof */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="flex items-center justify-center mb-2">
                      <Users 
                        className="w-6 h-6"
                        style={{ color: brandingSettings?.primaryColor || "#2563EB" }}
                      />
                    </div>
                    <p 
                      className="text-2xl font-bold text-slate-800"
                      style={{ fontFamily: brandingSettings?.fontFamily }}
                    >
                      1,847
                    </p>
                    <p 
                      className="text-sm text-slate-600"
                      style={{ fontFamily: brandingSettings?.fontFamily }}
                    >
                      Downloads
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center mb-2">
                      <Star 
                        className="w-6 h-6"
                        style={{ color: brandingSettings?.accentColor || "#F59E0B" }}
                      />
                    </div>
                    <p 
                      className="text-2xl font-bold text-slate-800"
                      style={{ fontFamily: brandingSettings?.fontFamily }}
                    >
                      4.9
                    </p>
                    <p 
                      className="text-sm text-slate-600"
                      style={{ fontFamily: brandingSettings?.fontFamily }}
                    >
                      Rating
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center mb-2">
                      <Clock 
                        className="w-6 h-6"
                        style={{ color: brandingSettings?.secondaryColor || "#10B981" }}
                      />
                    </div>
                    <p 
                      className="text-2xl font-bold text-slate-800"
                      style={{ fontFamily: brandingSettings?.fontFamily }}
                    >
                      15min
                    </p>
                    <p 
                      className="text-sm text-slate-600"
                      style={{ fontFamily: brandingSettings?.fontFamily }}
                    >
                      Read Time
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Form */}
          <div className="sticky top-8">
            <Card className="shadow-xl">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <h3 
                    className="text-2xl font-bold text-slate-800 mb-2"
                    style={{ fontFamily: brandingSettings?.fontFamily }}
                  >
                    Get Your Free Guide
                  </h3>
                  <p 
                    className="text-slate-600"
                    style={{ fontFamily: brandingSettings?.fontFamily }}
                  >
                    Enter your details to download instantly
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {landingPage.customFields?.map((field) => (
                    <div key={field.name}>
                      <Label 
                        htmlFor={field.name}
                        style={{ fontFamily: brandingSettings?.fontFamily }}
                      >
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      
                      {field.type === "select" && field.options ? (
                        <Select 
                          value={formData[field.name] || ""} 
                          onValueChange={(value) => handleInputChange(field.name, value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map((option) => (
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
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          placeholder={`Enter your ${field.label.toLowerCase()}`}
                          required={field.required}
                          className="mt-1"
                          style={{ fontFamily: brandingSettings?.fontFamily }}
                        />
                      )}
                    </div>
                  ))}

                  {/* SMS Collection Fields */}
                  {(landingData.landingPage as any).collectSms && (
                    <>
                      <div>
                        <Label 
                          htmlFor="phone"
                          style={{ fontFamily: brandingSettings?.fontFamily }}
                        >
                          Phone Number (Optional)
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone || ""}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                          placeholder="Enter your phone number"
                          className="mt-1"
                          style={{ fontFamily: brandingSettings?.fontFamily }}
                        />
                      </div>

                      {formData.phone && (
                        <div className="flex items-start space-x-2">
                          <input
                            type="checkbox"
                            id="smsConsent"
                            checked={formData.smsConsent === "true"}
                            onChange={(e) => handleInputChange("smsConsent", e.target.checked.toString())}
                            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <Label 
                            htmlFor="smsConsent"
                            className="text-xs text-slate-600 leading-tight cursor-pointer"
                            style={{ fontFamily: brandingSettings?.fontFamily }}
                          >
                            {(landingData.landingPage as any).smsConsentText || "I consent to receive text messages from this business. Message and data rates may apply. Reply STOP to opt out."}
                            <span className="text-red-500 ml-1">*</span>
                          </Label>
                        </div>
                      )}
                    </>
                  )}

                  <Button
                    type="submit"
                    disabled={submitLeadMutation.isPending}
                    className="w-full py-3 text-lg font-semibold"
                    style={{ 
                      backgroundColor: brandingSettings?.primaryColor || "#2563EB",
                      fontFamily: brandingSettings?.fontFamily 
                    }}
                  >
                    <Download className="w-5 h-5 mr-2" />
                    {submitLeadMutation.isPending ? "Processing..." : "Download Free Guide"}
                  </Button>
                </form>

                <p 
                  className="text-xs text-slate-500 text-center mt-4"
                  style={{ fontFamily: brandingSettings?.fontFamily }}
                >
                  We respect your privacy. Unsubscribe at any time.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
