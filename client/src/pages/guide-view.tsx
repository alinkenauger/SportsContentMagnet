import { useParams, Link } from "wouter";
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
  Play,
  Clock,
  AlertCircle,
  Zap,
  Repeat
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface DrillBreakdown {
  painPoint: string;
  technique: string;
  reps: string;
  duration: string;
  focus: string;
}

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
    screenshots?: Array<{
      timestamp: number;
      filename: string;
      path: string;
      type: 'start' | 'middle' | 'key_moment';
      size: number;
    }>;
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

function parseDrillContent(content: string): DrillBreakdown | null {
  try {
    // Extract key information using pattern matching
    const painPointMatch = content.match(/(?:pain point|problem|issue|struggle|difficulty)[:\s]+(.*?)(?:\.|,|\n|$)/i);
    const techniqueMatch = content.match(/(?:technique|method|approach|way|how)[:\s]+(.*?)(?:\.|,|\n|$)/i);
    const repsMatch = content.match(/(?:reps|repetitions|times|sets)[:\s]+(.*?)(?:\.|,|\n|$)/i);
    const durationMatch = content.match(/(?:duration|time|seconds|minutes)[:\s]+(.*?)(?:\.|,|\n|$)/i);
    const focusMatch = content.match(/(?:focus|concentrate|attention|key)[:\s]+(.*?)(?:\.|,|\n|$)/i);

    // Fallback to extracting meaningful phrases
    const sentences = content.split(/[.!?]/).filter(s => s.trim());
    
    return {
      painPoint: painPointMatch?.[1]?.trim() || sentences.find(s => s.includes('problem') || s.includes('issue'))?.trim() || "Improve fundamentals",
      technique: techniqueMatch?.[1]?.trim() || sentences.find(s => s.includes('technique') || s.includes('method'))?.trim() || "Practice proper form",
      reps: repsMatch?.[1]?.trim() || sentences.find(s => /\d+\s*(?:reps|times|sets)/i.test(s))?.match(/\d+\s*(?:reps|times|sets)/i)?.[0] || "10-15 reps",
      duration: durationMatch?.[1]?.trim() || sentences.find(s => /\d+\s*(?:seconds|minutes)/i.test(s))?.match(/\d+\s*(?:seconds|minutes)/i)?.[0] || "5-10 minutes",
      focus: focusMatch?.[1]?.trim() || sentences[sentences.length - 1]?.trim() || "Maintain consistency"
    };
  } catch {
    return null;
  }
}

function DrillVisual({ breakdown }: { breakdown: DrillBreakdown }) {
  return (
    <div className="mt-4 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-4">
      <h4 className="text-lg font-semibold text-orange-800 mb-3 flex items-center">
        <Target className="w-5 h-5 mr-2" />
        Drill Breakdown
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex items-start space-x-3 bg-white p-3 rounded-md border border-orange-100">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="font-medium text-gray-800 text-sm">Pain Point</h5>
            <p className="text-gray-600 text-sm">{breakdown.painPoint}</p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3 bg-white p-3 rounded-md border border-orange-100">
          <Zap className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="font-medium text-gray-800 text-sm">Technique</h5>
            <p className="text-gray-600 text-sm">{breakdown.technique}</p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3 bg-white p-3 rounded-md border border-orange-100">
          <Repeat className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="font-medium text-gray-800 text-sm">Repetitions</h5>
            <p className="text-gray-600 text-sm">{breakdown.reps}</p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3 bg-white p-3 rounded-md border border-orange-100">
          <Clock className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="font-medium text-gray-800 text-sm">Duration</h5>
            <p className="text-gray-600 text-sm">{breakdown.duration}</p>
          </div>
        </div>
      </div>
      
      <div className="mt-3 bg-white p-3 rounded-md border border-orange-100">
        <div className="flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="font-medium text-gray-800 text-sm">Key Focus</h5>
            <p className="text-gray-600 text-sm">{breakdown.focus}</p>
          </div>
        </div>
      </div>
    </div>
  );
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
              <Link href="/library/public">
                <Button
                  variant="outline"
                  size="sm"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Practice Library
                </Button>
              </Link>
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
                    src={`https://www.youtube.com/embed/${guide.youtubeVideoId}?rel=0&showinfo=0&end_screen_mode=3`}
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
                    </div>
                    
                    <div className="prose prose-slate max-w-none mb-4">
                      <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                        {section.content}
                      </div>
                    </div>

                    {section.type === 'drill' && (() => {
                      const drillBreakdown = parseDrillContent(section.content);
                      return drillBreakdown ? <DrillVisual breakdown={drillBreakdown} /> : null;
                    })()}

                    {section.timestamp && (
                      <div className="flex justify-start pt-3 border-t border-slate-100">
                        <Button
                          variant="default"
                          size="sm"
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white shadow-md"
                          onClick={() => {
                            const iframe = document.querySelector('iframe');
                            if (iframe && section.timestampSeconds) {
                              iframe.src = `https://www.youtube.com/embed/${guide.youtubeVideoId}?start=${section.timestampSeconds}&autoplay=1`;
                              iframe.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Watch at {section.timestamp}
                        </Button>
                      </div>
                    )}
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
              <p className="text-slate-800 font-medium mb-4">
                {guide.content.callToAction}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/library/public">
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                    <Target className="w-4 h-4 mr-2" />
                    Browse More Practice Guides
                  </Button>
                </Link>
                <Button
                  onClick={handleWatchVideo}
                  variant="outline"
                  className="border-orange-600 text-orange-600 hover:bg-orange-50"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Watch Original Video
                </Button>
              </div>
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