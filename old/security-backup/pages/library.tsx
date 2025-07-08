import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Users, Clock, PlayCircle, BookOpen } from "lucide-react";

interface PublicGuide {
  id: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  category: string;
  tags: string[];
  views: number;
  downloads: number;
  createdAt: string;
  author: {
    companyName?: string;
    logoUrl?: string;
  };
}

export default function Library() {
  const { data: guides = [], isLoading } = useQuery({
    queryKey: ['/api/library/public-guides'],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading practice guides...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BookOpen className="w-8 h-8 text-green-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Practice Guide Library</h1>
                <p className="text-gray-600">Discover professional training guides from sports coaches</p>
              </div>
            </div>
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="border-gray-300 hover:bg-gray-50"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {guides.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-600 mb-2">No Guides Available</h2>
            <p className="text-gray-500">Check back soon for new practice guides from our coaches.</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  {guides.length} Practice Guide{guides.length !== 1 ? 's' : ''} Available
                </h2>
                <p className="text-gray-600">
                  Professional training content from verified coaches
                </p>
              </div>
            </div>

            {/* Guides Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {guides.map((guide: PublicGuide) => (
                <Card key={guide.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                  <div 
                    onClick={() => window.location.href = `/guide/${guide.id}`}
                    className="block"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-gray-100 rounded-t-lg overflow-hidden">
                      <img 
                        src={guide.thumbnailUrl || "/api/placeholder/400/225"} 
                        alt={guide.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <PlayCircle className="w-12 h-12 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                      </div>
                      
                      {/* Category Badge */}
                      {guide.category && (
                        <Badge 
                          variant="secondary" 
                          className="absolute top-3 left-3 bg-white/90 text-gray-800 font-medium"
                        >
                          {guide.category}
                        </Badge>
                      )}
                    </div>

                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg leading-tight group-hover:text-green-600 transition-colors line-clamp-2">
                        {guide.title}
                      </CardTitle>
                      
                      {/* Author Info */}
                      {guide.author?.companyName && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          {guide.author.logoUrl && (
                            <img 
                              src={guide.author.logoUrl} 
                              alt="Author" 
                              className="w-5 h-5 rounded-full object-cover"
                            />
                          )}
                          <span>by {guide.author.companyName}</span>
                        </div>
                      )}
                    </CardHeader>

                    <CardContent className="pt-0">
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {guide.description}
                      </p>

                      {/* Tags */}
                      {guide.tags && guide.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {guide.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {guide.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{guide.tags.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Stats */}
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            {guide.views || 0}
                          </div>
                          <div className="flex items-center">
                            <Star className="w-4 h-4 mr-1 text-yellow-500" />
                            4.8
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(guide.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-8 mt-16">
        <div className="container mx-auto px-4 text-center max-w-6xl">
          <p className="text-gray-500 text-sm">
            © 2024 VidMagnet. Professional practice guides for sports training.
          </p>
        </div>
      </footer>
    </div>
  );
}