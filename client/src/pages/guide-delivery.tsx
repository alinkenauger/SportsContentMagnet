import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Download, 
  Share2, 
  Star, 
  CheckCircle, 
  Clock,
  Target,
  Users,
  PlayCircle,
  BookOpen
} from "lucide-react";

interface DeliveryPageData {
  guide: {
    id: number;
    title: string;
    description: string;
    thumbnailUrl: string;
    youtubeUrl: string;
    content: {
      title: string;
      introduction: string;
      sections: Array<{
        title: string;
        content: string;
        type: 'tip' | 'drill' | 'technique' | 'equipment';
      }>;
      conclusion: string;
      callToAction: string;
    };
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
  lead: {
    id: number;
    firstName?: string;
    email: string;
    customFieldData?: Record<string, any>;
  };
}

export default function GuideDelivery() {
  const { customUrl, leadId } = useParams<{ customUrl: string; leadId: string }>();

  const { data: deliveryData, isLoading } = useQuery<DeliveryPageData>({
    queryKey: ["/api/delivery", customUrl, leadId],
    queryFn: async () => {
      const response = await fetch(`/api/delivery/${customUrl}/${leadId}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!(customUrl && leadId),
  });

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: deliveryData?.guide.title,
        text: deliveryData?.guide.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleWatchVideo = () => {
    if (deliveryData?.guide.youtubeUrl) {
      window.open(deliveryData.guide.youtubeUrl, '_blank');
    }
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'tip':
        return <Star className="w-5 h-5" />;
      case 'drill':
        return <Target className="w-5 h-5" />;
      case 'technique':
        return <CheckCircle className="w-5 h-5" />;
      case 'equipment':
        return <Users className="w-5 h-5" />;
      default:
        return <CheckCircle className="w-5 h-5" />;
    }
  };

  const getSectionColor = (type: string, brandingSettings?: any) => {
    switch (type) {
      case 'tip':
        return brandingSettings?.accentColor || "#F59E0B";
      case 'drill':
        return brandingSettings?.primaryColor || "#2563EB";
      case 'technique':
        return brandingSettings?.secondaryColor || "#10B981";
      case 'equipment':
        return "#8B5CF6";
      default:
        return brandingSettings?.primaryColor || "#2563EB";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your personalized guide...</p>
        </div>
      </div>
    );
  }

  if (!deliveryData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold text-slate-800 mb-4">Access Denied</h1>
            <p className="text-slate-600">
              You don't have access to this guide or the link has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { guide, brandingSettings, lead } = deliveryData;
  const customStyles = brandingSettings ? {
    fontFamily: brandingSettings.fontFamily,
    '--primary-color': brandingSettings.primaryColor,
    '--secondary-color': brandingSettings.secondaryColor,
    '--accent-color': brandingSettings.accentColor,
  } as React.CSSProperties : {};

  return (
    <div 
      className="min-h-screen bg-slate-50"
      style={customStyles}
    >
      {/* Header Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center justify-between">
            {/* Left Side - Library Button + Logo */}
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/library/public'}
                className="flex items-center space-x-2 border-slate-300 hover:bg-slate-50"
              >
                <BookOpen className="w-4 h-4" />
                <span>Library</span>
              </Button>
              
              <div className="flex items-center space-x-3">
                {brandingSettings?.logoUrl && (
                  <img 
                    src={brandingSettings.logoUrl} 
                    alt="Logo" 
                    className="h-8 object-contain"
                  />
                )}
                {brandingSettings?.companyName && (
                  <h1 
                    className="text-xl font-bold"
                    style={{ 
                      color: brandingSettings.primaryColor,
                      fontFamily: brandingSettings.fontFamily 
                    }}
                  >
                    {brandingSettings.companyName}
                  </h1>
                )}
              </div>
            </div>
            
            {/* Right Side - Custom Navigation + CTA Button */}
            <div className="flex items-center space-x-3">
              {/* Custom Navigation Links */}
              {guide.navigationLinks && Array.isArray(guide.navigationLinks) && 
                guide.navigationLinks.map((link: any, index: number) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(link.url, '_blank')}
                    className="text-slate-600 hover:text-slate-800"
                  >
                    {link.text}
                  </Button>
                ))
              }
              
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              
              {/* Main CTA Button */}
              {guide.ctaLink && (
                <Button 
                  size="sm"
                  onClick={() => window.open(guide.ctaLink, '_blank')}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 font-semibold"
                >
                  {guide.ctaText || "Take Action"}
                </Button>
              )}
              <Button 
                size="sm"
                style={{ backgroundColor: brandingSettings?.primaryColor || "#2563EB" }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Welcome Message */}
        <Card className="mb-8">
          <CardContent className="p-8 text-center">
            {/* Success status banner */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <p className="text-green-800 font-bold text-lg">
                  ✅ Access Granted! Your guide is now unlocked and ready
                </p>
              </div>
            </div>
            
            <h2 
              className="text-3xl font-bold text-slate-800 mb-4"
              style={{ fontFamily: brandingSettings?.fontFamily }}
            >
              Welcome{lead.firstName ? `, ${lead.firstName}` : ''}! You're all set 🎉
            </h2>
            <p 
              className="text-xl text-slate-600 mb-6"
              style={{ fontFamily: brandingSettings?.fontFamily }}
            >
              Your personalized practice guide is now accessible. This guide has been customized based on proven techniques from the original video.
            </p>
            
            {/* Video Preview */}
            <div className="relative max-w-2xl mx-auto mb-6">
              <img 
                src={guide.thumbnailUrl || "/api/placeholder/600/338"} 
                alt={guide.title}
                className="w-full rounded-lg shadow-lg"
              />
              <button
                onClick={handleWatchVideo}
                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg hover:bg-opacity-40 transition-all"
              >
                <PlayCircle 
                  className="w-16 h-16 text-white"
                  style={{ color: brandingSettings?.primaryColor || "#2563EB" }}
                />
              </button>
            </div>
            
            <Button 
              onClick={handleWatchVideo}
              variant="outline"
              className="mb-4"
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Watch Original Video
            </Button>
          </CardContent>
        </Card>

        {/* Guide Content */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle 
              className="text-2xl"
              style={{ 
                fontFamily: brandingSettings?.fontFamily,
                color: brandingSettings?.primaryColor 
              }}
            >
              {guide.content.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            {/* Introduction */}
            <div className="mb-8">
              <p 
                className="text-lg text-slate-700 leading-relaxed"
                style={{ fontFamily: brandingSettings?.fontFamily }}
              >
                {guide.content.introduction}
              </p>
            </div>

            <Separator className="mb-8" />

            {/* Sections */}
            <div className="space-y-8">
              {guide.content.sections.map((section, index) => (
                <div key={index} className="relative">
                  <div className="flex items-start space-x-4 mb-4">
                    <div 
                      className="p-3 rounded-lg"
                      style={{ 
                        backgroundColor: `${getSectionColor(section.type, brandingSettings)}20`,
                        color: getSectionColor(section.type, brandingSettings)
                      }}
                    >
                      {getSectionIcon(section.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 
                          className="text-xl font-bold text-slate-800"
                          style={{ fontFamily: brandingSettings?.fontFamily }}
                        >
                          {section.title}
                        </h3>
                        <Badge 
                          variant="outline"
                          style={{ 
                            borderColor: getSectionColor(section.type, brandingSettings),
                            color: getSectionColor(section.type, brandingSettings)
                          }}
                        >
                          {section.type.charAt(0).toUpperCase() + section.type.slice(1)}
                        </Badge>
                      </div>
                      <div 
                        className="prose prose-slate max-w-none"
                        style={{ fontFamily: brandingSettings?.fontFamily }}
                        dangerouslySetInnerHTML={{ 
                          __html: section.content.replace(/\n/g, '<br/>') 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-8" />

            {/* Conclusion */}
            <div className="mb-8">
              <h3 
                className="text-xl font-bold text-slate-800 mb-4"
                style={{ fontFamily: brandingSettings?.fontFamily }}
              >
                Next Steps
              </h3>
              <p 
                className="text-lg text-slate-700 leading-relaxed"
                style={{ fontFamily: brandingSettings?.fontFamily }}
              >
                {guide.content.conclusion}
              </p>
            </div>

            {/* Call to Action */}
            <Card 
              className="p-6"
              style={{ 
                backgroundColor: `${brandingSettings?.primaryColor || "#2563EB"}10`,
                borderColor: brandingSettings?.primaryColor || "#2563EB"
              }}
            >
              <div className="text-center">
                <h4 
                  className="text-xl font-bold mb-4"
                  style={{ 
                    fontFamily: brandingSettings?.fontFamily,
                    color: brandingSettings?.primaryColor 
                  }}
                >
                  Ready to Take Your Skills to the Next Level?
                </h4>
                <p 
                  className="text-slate-700 mb-6"
                  style={{ fontFamily: brandingSettings?.fontFamily }}
                >
                  {guide.content.callToAction}
                </p>
                <Button 
                  size="lg"
                  style={{ 
                    backgroundColor: brandingSettings?.primaryColor || "#2563EB",
                    fontFamily: brandingSettings?.fontFamily 
                  }}
                >
                  Learn More
                </Button>
              </div>
            </Card>
          </CardContent>
        </Card>

        {/* Personalization Info */}
        {lead.customFieldData && Object.keys(lead.customFieldData).length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle 
                style={{ fontFamily: brandingSettings?.fontFamily }}
              >
                Your Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(lead.customFieldData).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span 
                      className="font-medium text-slate-700"
                      style={{ fontFamily: brandingSettings?.fontFamily }}
                    >
                      {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:
                    </span>
                    <span 
                      className="text-slate-600"
                      style={{ fontFamily: brandingSettings?.fontFamily }}
                    >
                      {value as string}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-8">
          <p 
            className="text-slate-500 mb-4"
            style={{ fontFamily: brandingSettings?.fontFamily }}
          >
            {brandingSettings?.tagline || "Elevate Your Game"}
          </p>
          <p 
            className="text-sm text-slate-400"
            style={{ fontFamily: brandingSettings?.fontFamily }}
          >
            © {new Date().getFullYear()} {brandingSettings?.companyName || "CoachCraft"}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
