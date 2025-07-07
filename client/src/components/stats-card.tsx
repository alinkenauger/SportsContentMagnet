import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
}

export default function StatsCard({ 
  title, 
  value, 
  change, 
  changeType = "neutral", 
  icon: Icon, 
  iconColor = "text-primary" 
}: StatsCardProps) {
  const getChangeColor = () => {
    switch (changeType) {
      case "positive":
        return "text-secondary";
      case "negative":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card className="stats-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm font-medium">{title}</p>
            <p className="text-3xl font-bold text-foreground mt-2">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
          </div>
          <div className={`w-12 h-12 ${iconColor.includes('primary') ? 'bg-blue-500 dark:bg-blue-600' : 
                          iconColor.includes('secondary') ? 'bg-emerald-500 dark:bg-emerald-600' :
                          iconColor.includes('accent') ? 'bg-amber-500 dark:bg-amber-600' :
                          'bg-purple-500 dark:bg-purple-600'} rounded-lg flex items-center justify-center shadow-lg`}>
            <Icon className="text-white text-xl" />
          </div>
        </div>
        {change && (
          <div className="flex items-center mt-4 text-sm">
            <span className={`font-medium ${getChangeColor()}`}>
              {change}
            </span>
            <span className="text-muted-foreground ml-2">from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
