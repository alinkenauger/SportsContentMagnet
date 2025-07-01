import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Star, 
  Target, 
  CheckCircle, 
  Users, 
  Eye, 
  Share2, 
  ExternalLink,
  ArrowLeft,
  Play
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface GuideViewData {
  guide: {
    id: number;
    title: string;
    description: string;
    thumbnailUrl: string;
    youtubeUrl: string;
    youtubeVideoId: string;
    channelTitle: string;
    views: number;
    content: {
      title: string;
      introduction: string;
      sections: Array<{
        title: string;
        content: string;
        type: 'tip' | 'drill' | 'technique' | 'equipment';
        timestamp?: string;
        timestampSeconds?: number;
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
}

export default function GuideView() {
  const { guideId } = useParams<{ guideId: string }>();

  const { data: guideData, isLoading } = useQuery<GuideViewData>({
    queryKey: ["/api/guide", guideId, "public"],
    queryFn: async () => {
      const response = await fetch(`/api/guide/${guideId}/public`);
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!guideId,
  });

  // Track view when guide loads
  useEffect(() => {
    if (guideId && guideData) {
      const trackView = async () => {
        try {
          await apiRequest("POST", `/api/guides/${guideId}/view`, {});
        } catch (error) {
          console.error("Failed to track view:", error);
        }
      };
      trackView();
    }
  }, [guideId, guideData]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: guideData?.guide.title,
        text: guideData?.guide.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleWatchVideo = () => {
    if (guideData?.guide.youtubeUrl) {
      window.open(guideData.guide.youtubeUrl, '_blank');
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
          <p className="text-slate-600">Loading guide...</p>
        </div>
      </div>
    );
  }

  if (!guideData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold text-slate-800 mb-4">Guide Not Found</h1>
            <p className="text-slate-600">
              The guide you're looking for doesn't exist or has been removed.
            </p>
            <Button 
              onClick={() => window.history.back()} 
              className="mt-4"
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { guide, brandingSettings } = guideData;
  const customStyles = brandingSettings ? {
    fontFamily: brandingSettings.fontFamily,
    '--primary-color': brandingSettings.primaryColor,
    '--secondary-color': brandingSettings.secondaryColor,
    '--accent-color': brandingSettings.accentColor,
  } as React.CSSProperties : {};

  return (
    <div className="min-h-screen bg-slate-50" style={customStyles}>
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {brandingSettings?.logoUrl && (
                <img 
                  src={brandingSettings.logoUrl} 
                  alt="Logo" 
                  className="h-8 w-auto"
                />
              )}
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  {brandingSettings?.companyName || "Practice Guide"}
                </h1>
                {brandingSettings?.tagline && (
                  <p className="text-sm text-slate-600">{brandingSettings.tagline}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center text-sm text-slate-600">
                <Eye className="w-4 h-4 mr-1" />
                {guide.views} views
              </div>
              <Button
                onClick={handleShare}
                variant="outline"
                size="sm"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Guide Header */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
              {guide.content.title}
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed mb-6">
              {guide.content.introduction}
            </p>
            
            {/* YouTube Video Embed */}
            {guide.youtubeVideoId && (
              <div className="mb-6">
                <div className="relative w-full h-0 pb-[56.25%] rounded-lg overflow-hidden bg-slate-100">
                  <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${guide.youtubeVideoId}`}
                    title={guide.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-slate-600">
                    Original video by <span className="font-medium">{guide.channelTitle}</span>
                  </p>
                  <Button
                    onClick={handleWatchVideo}
                    variant="outline"
                    size="sm"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Watch on YouTube
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Guide Sections */}
        <div className="space-y-6">
          {guide.content.sections.map((section, index) => (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4 mb-4">
                  <div 
                    className="flex-shrink-0 p-3 rounded-lg text-white"
                    style={{ backgroundColor: getSectionColor(section.type, brandingSettings) }}
                  >
                    {getSectionIcon(section.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-slate-800">
                        {section.title}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {section.type.charAt(0).toUpperCase() + section.type.slice(1)}
                      </Badge>
                      {section.timestamp && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs px-2 py-1 h-auto"
                          onClick={() => {
                            const iframe = document.querySelector('iframe');
                            if (iframe && section.timestampSeconds) {
                              iframe.src = `https://www.youtube.com/embed/${guide.youtubeVideoId}?start=${section.timestampSeconds}&autoplay=1`;
                            }
                          }}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          {section.timestamp}
                        </Button>
                      )}
                    </div>
                    
                    {/* Video Screenshot for this section */}
                    {section.timestamp && (
                      <div className="mb-4">
                        <div className="relative group cursor-pointer border-2 border-slate-200 rounded-lg overflow-hidden bg-slate-100 hover:border-blue-400 transition-colors">
                          <img 
                            src={`https://img.youtube.com/vi/${guide.youtubeVideoId}/hqdefault.jpg`}
                            alt={`Video screenshot at ${section.timestamp}`}
                            className="w-full h-32 object-cover"
                            onClick={() => {
                              const iframe = document.querySelector('iframe');
                              if (iframe && section.timestampSeconds) {
                                iframe.src = `https://www.youtube.com/embed/${guide.youtubeVideoId}?start=${section.timestampSeconds}&autoplay=1`;
                                iframe.scrollIntoView({ behavior: 'smooth' });
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center group-hover:bg-opacity-20 transition-all">
                            <div className="bg-white bg-opacity-90 rounded-full p-2">
                              <Play className="w-6 h-6 text-slate-700" />
                            </div>
                          </div>
                          <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium">
                            {section.timestamp}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 text-center">
                          Click to jump to this moment in the video
                        </p>
                      </div>
                    )}
                    
                    <div className="prose prose-slate max-w-none">
                      <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                        {section.content}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Conclusion */}
        <Card className="mt-8 bg-slate-100">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold text-slate-800 mb-4">Next Steps</h3>
            <p className="text-slate-700 leading-relaxed mb-6">
              {guide.content.conclusion}
            </p>
            <div className="bg-white p-6 rounded-lg">
              <p className="text-slate-800 font-medium">
                {guide.content.callToAction}
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-slate-600">
            <p>
              © 2025 {brandingSettings?.companyName || "VidMagnet"}. 
              Practice guide generated from YouTube content.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}