import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Palette, Upload, Eye, Save, RotateCcw } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BrandingSettings } from "@shared/schema";

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

export default function Branding() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    logoUrl: "",
    faviconUrl: "",
    primaryColor: "#2563EB",
    secondaryColor: "#10B981",
    accentColor: "#F59E0B",
    fontFamily: "Inter",
    companyName: "",
    tagline: "",
  });

  const { data: brandingSettings, isLoading } = useQuery<BrandingSettings>({
    queryKey: ["/api/branding"],
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
      }
    },
  });

  const saveBrandingMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
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

  // Load existing settings when available
  useEffect(() => {
    if (brandingSettings) {
      setFormData({
        logoUrl: brandingSettings.logoUrl || "",
        faviconUrl: brandingSettings.faviconUrl || "",
        primaryColor: brandingSettings.primaryColor || "#2563EB",
        secondaryColor: brandingSettings.secondaryColor || "#10B981",
        accentColor: brandingSettings.accentColor || "#F59E0B",
        fontFamily: brandingSettings.fontFamily || "Inter",
        companyName: brandingSettings.companyName || "",
        tagline: brandingSettings.tagline || "",
      });
    }
  }, [brandingSettings]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const applyPreset = (preset: typeof presetColors[0]) => {
    setFormData(prev => ({
      ...prev,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      accentColor: preset.accent,
    }));
  };

  const resetToDefaults = () => {
    setFormData({
      logoUrl: "",
      faviconUrl: "",
      primaryColor: "#2563EB",
      secondaryColor: "#10B981",
      accentColor: "#F59E0B",
      fontFamily: "Inter",
      companyName: "",
      tagline: "",
    });
  };

  const handleSave = () => {
    saveBrandingMutation.mutate(formData);
  };

  const logoUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      
      const response = await fetch('/api/branding/logo', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Logo upload failed');
      }
      
      const data = await response.json();
      return data.logoUrl;
    },
    onSuccess: (logoUrl) => {
      setFormData(prev => ({ ...prev, logoUrl }));
      toast({
        title: "Success",
        description: "Logo uploaded and automatically resized to 200x200px!",
      });
    },
    onError: (error) => {
      console.error('Logo upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload logo",
        variant: "destructive",
      });
    },
  });

  const faviconUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('favicon', file);
      
      const response = await fetch('/api/branding/favicon', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Favicon upload failed');
      }
      
      const data = await response.json();
      return data.faviconUrl;
    },
    onSuccess: (faviconUrl) => {
      setFormData(prev => ({ ...prev, faviconUrl }));
      toast({
        title: "Success",
        description: "Favicon uploaded and automatically resized to 32x32px!",
      });
    },
    onError: (error) => {
      console.error('Favicon upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload favicon",
        variant: "destructive",
      });
    },
  });

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select a valid image file",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image must be smaller than 5MB",
        variant: "destructive",
      });
      return;
    }
    
    // Upload the file - it will be automatically resized
    logoUploadMutation.mutate(file);
  };

  const handleFaviconUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select a valid image file",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image must be smaller than 5MB",
        variant: "destructive",
      });
      return;
    }
    
    // Upload the file - it will be automatically resized
    faviconUploadMutation.mutate(file);
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Branding</h2>
              <p className="text-muted-foreground mt-1">
                Customize your brand appearance across all guides and landing pages
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={resetToDefaults}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saveBrandingMutation.isPending}
                className="gradient-primary text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveBrandingMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Settings Panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Logo & Company Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input
                      id="company-name"
                      value={formData.companyName}
                      onChange={(e) => handleInputChange("companyName", e.target.value)}
                      placeholder="Your Company Name"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="tagline">Tagline</Label>
                    <Textarea
                      id="tagline"
                      value={formData.tagline}
                      onChange={(e) => handleInputChange("tagline", e.target.value)}
                      placeholder="Your company tagline or slogan"
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Logo</Label>
                    <div className="mt-1 flex items-center space-x-4">
                      {formData.logoUrl ? (
                        <img 
                          src={formData.logoUrl} 
                          alt="Logo preview" 
                          className="w-16 h-16 object-contain rounded-lg border border-border"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                          <Upload className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          id="logo-upload"
                        />
                        <Button 
                          variant="outline" 
                          onClick={() => document.getElementById('logo-upload')?.click()}
                          disabled={logoUploadMutation.isPending}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {logoUploadMutation.isPending ? "Uploading..." : "Upload Logo"}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">
                          Any size image accepted - automatically resized to 200x200px. Max 5MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Favicon</Label>
                    <div className="mt-1 flex items-center space-x-4">
                      {formData.faviconUrl ? (
                        <img 
                          src={formData.faviconUrl} 
                          alt="Favicon preview" 
                          className="w-8 h-8 object-contain rounded border border-border"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                          <Upload className="w-3 h-3 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFaviconUpload}
                          className="hidden"
                          id="favicon-upload"
                        />
                        <Button 
                          variant="outline" 
                          onClick={() => document.getElementById('favicon-upload')?.click()}
                          disabled={faviconUploadMutation.isPending}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {faviconUploadMutation.isPending ? "Uploading..." : "Upload Favicon"}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">
                          Any size image accepted - automatically resized to 32x32px. Max 5MB.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Colors */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Palette className="w-5 h-5" />
                    <span>Brand Colors</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Color Presets */}
                  <div>
                    <Label>Color Presets</Label>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {presetColors.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => applyPreset(preset)}
                          className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left"
                        >
                          <div className="flex space-x-1">
                            <div 
                              className="w-4 h-4 rounded-full border border-border"
                              style={{ backgroundColor: preset.primary }}
                            />
                            <div 
                              className="w-4 h-4 rounded-full border border-border"
                              style={{ backgroundColor: preset.secondary }}
                            />
                            <div 
                              className="w-4 h-4 rounded-full border border-border"
                              style={{ backgroundColor: preset.accent }}
                            />
                          </div>
                          <span className="font-medium text-sm">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Custom Colors */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label htmlFor="primary-color">Primary Color</Label>
                      <div className="mt-1 flex items-center space-x-3">
                        <input
                          type="color"
                          id="primary-color"
                          value={formData.primaryColor}
                          onChange={(e) => handleInputChange("primaryColor", e.target.value)}
                          className="w-12 h-10 rounded border border-border cursor-pointer"
                        />
                        <Input
                          value={formData.primaryColor}
                          onChange={(e) => handleInputChange("primaryColor", e.target.value)}
                          placeholder="#2563EB"
                          className="flex-1"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Used for buttons and key elements
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="secondary-color">Secondary Color</Label>
                      <div className="mt-1 flex items-center space-x-3">
                        <input
                          type="color"
                          id="secondary-color"
                          value={formData.secondaryColor}
                          onChange={(e) => handleInputChange("secondaryColor", e.target.value)}
                          className="w-12 h-10 rounded border border-border cursor-pointer"
                        />
                        <Input
                          value={formData.secondaryColor}
                          onChange={(e) => handleInputChange("secondaryColor", e.target.value)}
                          placeholder="#10B981"
                          className="flex-1"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Used for success states and accents
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="accent-color">Accent Color</Label>
                      <div className="mt-1 flex items-center space-x-3">
                        <input
                          type="color"
                          id="accent-color"
                          value={formData.accentColor}
                          onChange={(e) => handleInputChange("accentColor", e.target.value)}
                          className="w-12 h-10 rounded border border-border cursor-pointer"
                        />
                        <Input
                          value={formData.accentColor}
                          onChange={(e) => handleInputChange("accentColor", e.target.value)}
                          placeholder="#F59E0B"
                          className="flex-1"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Used for highlights and warnings
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Typography */}
              <Card>
                <CardHeader>
                  <CardTitle>Typography</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label htmlFor="font-family">Font Family</Label>
                    <Select value={formData.fontFamily} onValueChange={(value) => handleInputChange("fontFamily", value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select font" />
                      </SelectTrigger>
                      <SelectContent>
                        {fontOptions.map((font) => (
                          <SelectItem key={font.value} value={font.value}>
                            <span style={{ fontFamily: font.value }}>{font.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      This font will be used across all your guides and landing pages
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview Panel */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Eye className="w-5 h-5" />
                    <span>Live Preview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Landing Page Preview */}
                    <div className="border border-border rounded-lg p-4 bg-card">
                      <div className="text-center space-y-3">
                        {formData.logoUrl ? (
                          <img 
                            src={formData.logoUrl} 
                            alt="Logo" 
                            className="w-12 h-12 mx-auto object-contain"
                          />
                        ) : (
                          <div className="w-12 h-12 mx-auto bg-muted rounded-lg flex items-center justify-center">
                            <Palette className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <h3 
                          className="font-bold text-lg"
                          style={{ 
                            fontFamily: formData.fontFamily,
                            color: formData.primaryColor 
                          }}
                        >
                          {formData.companyName || "Your Company"}
                        </h3>
                        <p 
                          className="text-sm text-muted-foreground"
                          style={{ fontFamily: formData.fontFamily }}
                        >
                          {formData.tagline || "Your tagline goes here"}
                        </p>
                        <button
                          className="px-4 py-2 rounded-lg text-white font-medium text-sm transition-colors"
                          style={{ 
                            backgroundColor: formData.primaryColor,
                            fontFamily: formData.fontFamily 
                          }}
                        >
                          Get Your Free Guide
                        </button>
                      </div>
                    </div>

                    {/* Color Palette */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Color Palette</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <div 
                            className="w-full h-12 rounded-lg border border-border"
                            style={{ backgroundColor: formData.primaryColor }}
                          />
                          <p className="text-xs text-muted-foreground mt-1">Primary</p>
                        </div>
                        <div className="text-center">
                          <div 
                            className="w-full h-12 rounded-lg border border-border"
                            style={{ backgroundColor: formData.secondaryColor }}
                          />
                          <p className="text-xs text-muted-foreground mt-1">Secondary</p>
                        </div>
                        <div className="text-center">
                          <div 
                            className="w-full h-12 rounded-lg border border-border"
                            style={{ backgroundColor: formData.accentColor }}
                          />
                          <p className="text-xs text-muted-foreground mt-1">Accent</p>
                        </div>
                      </div>
                    </div>

                    {/* Typography Preview */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Typography</h4>
                      <div 
                        className="p-3 bg-accent/10 rounded-lg"
                        style={{ fontFamily: formData.fontFamily }}
                      >
                        <h5 className="font-bold text-base mb-1">Heading Text</h5>
                        <p className="text-sm text-muted-foreground">
                          This is how your body text will appear in guides and landing pages.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Help */}
              <Card>
                <CardHeader>
                  <CardTitle>Branding Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div>
                      <h5 className="font-medium">Colors</h5>
                      <p className="text-muted-foreground">
                        Use your primary color sparingly for important actions like CTA buttons.
                      </p>
                    </div>
                    <div>
                      <h5 className="font-medium">Logo</h5>
                      <p className="text-muted-foreground">
                        A simple, clear logo works best. Avoid complex designs that may not scale well.
                      </p>
                    </div>
                    <div>
                      <h5 className="font-medium">Typography</h5>
                      <p className="text-muted-foreground">
                        Choose a font that's easy to read and reflects your brand personality.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
