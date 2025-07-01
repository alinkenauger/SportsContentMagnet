import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Guide } from "@shared/schema";
import { Eye, Download, Percent, ExternalLink, Edit, MoreVertical, BarChart3 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GuideCardProps {
  guide: Guide;
  onEdit?: (guide: Guide) => void;
  onViewLanding?: (guide: Guide) => void;
  onViewAnalytics?: (guide: Guide) => void;
}

export default function GuideCard({ guide, onEdit, onViewLanding, onViewAnalytics }: GuideCardProps) {
  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-secondary/10 text-secondary";
      case "draft":
        return "bg-accent/10 text-accent";
      case "archived":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          {/* Thumbnail */}
          <img 
            src={guide.thumbnailUrl || "/api/placeholder/150/100"} 
            alt={guide.title}
            className="w-20 h-14 object-cover rounded-lg shadow-sm flex-shrink-0"
          />
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-foreground truncate pr-2">
                {guide.title}
              </h4>
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(guide.status || "draft")}>
                  {guide.status || "draft"}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem onClick={() => onEdit(guide)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Guide
                      </DropdownMenuItem>
                    )}
                    {onViewLanding && (
                      <DropdownMenuItem onClick={() => onViewLanding(guide)}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Landing Page
                      </DropdownMenuItem>
                    )}
                    {onViewAnalytics && (
                      <DropdownMenuItem onClick={() => onViewAnalytics(guide)}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Analytics
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {guide.description}
            </p>
            
            <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-3">
              <span className="flex items-center space-x-1">
                <Eye className="w-3 h-3" />
                <span>{formatNumber(guide.views || 0)}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Download className="w-3 h-3" />
                <span>{formatNumber(guide.downloads || 0)}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Percent className="w-3 h-3" />
                <span>{guide.conversionRate || 0}%</span>
              </span>
            </div>

            {/* Tags */}
            {guide.tags && guide.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
