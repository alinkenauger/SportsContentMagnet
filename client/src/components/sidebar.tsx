import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Home, 
  Plus, 
  Book, 
  BarChart3, 
  Palette, 
  Settings, 
  LogOut,
  Video,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Create Guide", href: "/create", icon: Plus },
  { name: "Content Library", href: "/library", icon: Book },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Branding", href: "/branding", icon: Palette },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-sidebar-background shadow-lg border-r border-sidebar-border flex flex-col h-screen transition-all duration-300`}>
      {/* Logo */}
      <div className="p-6 relative">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Video className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && <h1 className="text-xl font-bold text-sidebar-foreground">VidMagnet</h1>}
        </div>
        
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 bg-white border border-gray-300 rounded-full p-1 h-6 w-6 shadow-md hover:shadow-lg transition-all"
        >
          {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 pb-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <a
                    className={`sidebar-nav-item ${
                      isActive ? "sidebar-nav-item-active" : "sidebar-nav-item-inactive"
                    } ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && <span>{item.name}</span>}
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarImage 
              src={user?.profileImageUrl || ""} 
              alt={user?.firstName || "User"} 
              className="object-cover"
            />
            <AvatarFallback>
              {user?.firstName?.[0] || user?.email?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email
                  }
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Content Creator
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
        {isCollapsed && (
          <div className="mt-2 flex justify-center">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground p-1"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
