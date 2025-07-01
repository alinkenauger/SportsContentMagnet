import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  Eye, 
  Download, 
  Star, 
  Target, 
  CheckCircle, 
  Users,
  ExternalLink,
  ArrowLeft 
} from "lucide-react";
import { Link } from "wouter";

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

export default function PublicLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: guides, isLoading } = useQuery<PublicGuide[]>({
    queryKey: ["/api/guides/public"],
    queryFn: async () => {
      const response = await fetch("/api/guides/public");
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
  });

  const categories = [
    "all",
    "fitness",
    "sports",
    "cooking",
    "coding",
    "how-to",
    "wellness"
  ];

  const filteredGuides = guides?.filter(guide => {
    const matchesSearch = searchQuery === "" || 
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || 
      guide.category.toLowerCase() === selectedCategory.toLowerCase();
    
    return matchesSearch && matchesCategory;
  }) || [];

  const getSectionIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'fitness':
      case 'sports':
        return <Target className="w-5 h-5" />;
      case 'cooking':
        return <Star className="w-5 h-5" />;
      case 'coding':
      case 'how-to':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Users className="w-5 h-5" />;
    }
  };

  const getSectionColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'fitness':
      case 'sports':
        return "#ef4444"; // red
      case 'cooking':
        return "#f59e0b"; // amber
      case 'coding':
      case 'how-to':
        return "#3b82f6"; // blue
      default:
        return "#6b7280"; // gray
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading practice guides...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  Public Practice Library
                </h1>
                <p className="text-sm text-slate-600">
                  Discover practice guides by pain point, benefit, or body part
                </p>
              </div>
            </div>
            <div className="text-sm text-slate-600">
              {filteredGuides.length} guides available
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search by pain point, benefit, body part, or technique..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-600" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === "all" ? "All Categories" : 
                     category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        {filteredGuides.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-slate-400 mb-4">
              <Search className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-2">
              No guides found
            </h3>
            <p className="text-slate-600">
              Try adjusting your search terms or category filter
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGuides.map((guide) => (
              <Card key={guide.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img
                    src={guide.thumbnailUrl}
                    alt={guide.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge 
                      variant="secondary" 
                      className="bg-white/90 text-slate-800"
                    >
                      {guide.category}
                    </Badge>
                  </div>
                </div>
                
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3 mb-3">
                    <div 
                      className="flex-shrink-0 p-2 rounded-lg text-white"
                      style={{ backgroundColor: getSectionColor(guide.category) }}
                    >
                      {getSectionIcon(guide.category)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 line-clamp-2 mb-1">
                        {guide.title}
                      </h3>
                      <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                        {guide.description}
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
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

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-slate-600 mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center">
                        <Eye className="w-4 h-4 mr-1" />
                        {guide.views}
                      </div>
                      <div className="flex items-center">
                        <Download className="w-4 h-4 mr-1" />
                        {guide.downloads}
                      </div>
                    </div>
                    {guide.author.companyName && (
                      <div className="flex items-center">
                        {guide.author.logoUrl && (
                          <img
                            src={guide.author.logoUrl}
                            alt={guide.author.companyName}
                            className="w-4 h-4 rounded-full mr-1"
                          />
                        )}
                        <span className="text-xs truncate max-w-20">
                          {guide.author.companyName}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <Link href={`/guide/${guide.id}`}>
                    <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Guide
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}