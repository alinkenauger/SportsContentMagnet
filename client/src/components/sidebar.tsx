import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Home, 
  Plus, 
  Book, 
  BarChart3, 
  Users, 
  Settings, 
  LogOut,
  Video,
  ChevronLeft,
  Building2,
  ChevronRight,
  CreditCard,
  UserCog,
  Mail,
  ChevronDown
} from "lucide-react";
import { useState } from "react";
import { useBrands, useSetCurrentBrand, useClearCurrentBrand } from "@/hooks/useBrands";
import { useBranding } from "@/hooks/useBranding";
import { useToast } from "@/hooks/use-toast";
import type { Brand } from "@shared/schema";


const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Create Guide", href: "/create", icon: Plus },
  { name: "Content Library", href: "/content-library", icon: Book },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Leads", href: "/leads", icon: Users },
];

const settingsNavigation = [
  { name: "General", href: "/settings", icon: Settings },
  { name: "Pricing", href: "/pricing", icon: CreditCard },
  { name: "Team", href: "/team", icon: UserCog },
  { name: "Email Settings", href: "/email-settings", icon: Mail },
];

export default function Sidebar() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSpacePickerOpen, setIsSpacePickerOpen] = useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
  const { brands } = useBrands();
  const { brandingSettings, logoUrl, companyName } = useBranding();
  const { toast } = useToast();
  const setCurrentBrandMutation = useSetCurrentBrand();
  const clearCurrentBrandMutation = useClearCurrentBrand();
  const currentBrandId = (user as any)?.currentBrandId;

  // Check if we're on a settings page and expand the settings section
  const isInSettingsSection = settingsNavigation.some(item => item.href === location);
  const shouldShowSettingsExpanded = isSettingsExpanded || isInSettingsSection;
  const currentBrand = currentBrandId ? brands?.find(brand => brand.id === currentBrandId) : null;

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
          {/* Main Navigation */}
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
          
          {/* Settings Section */}
          <li>
            <button
              onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
              className={`sidebar-nav-item ${
                isInSettingsSection ? "sidebar-nav-item-active" : "sidebar-nav-item-inactive"
              } ${isCollapsed ? 'justify-center' : ''} w-full`}
              title={isCollapsed ? "Settings" : undefined}
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <>
                  <span>Settings</span>
                  <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${shouldShowSettingsExpanded ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>
            
            {/* Settings Submenu */}
            {shouldShowSettingsExpanded && !isCollapsed && (
              <ul className="ml-6 mt-2 space-y-1">
                {settingsNavigation.map((item) => {
                  const isActive = location === item.href;
                  return (
                    <li key={item.name}>
                      <Link href={item.href}>
                        <a
                          className={`sidebar-nav-item ${
                            isActive ? "sidebar-nav-item-active" : "sidebar-nav-item-inactive"
                          } text-sm py-2`}
                        >
                          <item.icon className="w-4 h-4 flex-shrink-0" />
                          <span>{item.name}</span>
                        </a>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        </ul>
      </nav>

      {/* User Profile / Brand Picker */}
      <div className="border-t border-sidebar-border">
        {/* Brand Picker Toggle */}
        <div className="p-4">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <button
              onClick={() => setIsSpacePickerOpen(!isSpacePickerOpen)}
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:ring-2 hover:ring-blue-200 ${
                currentBrand ? 'bg-blue-600' : 'bg-primary'
              }`}
              title={isCollapsed ? (currentBrand ? `${currentBrand.name} - Click to switch brands` : `Account - Click to switch brands`) : undefined}
            >
              {currentBrand ? (
                <Building2 className="w-5 h-5 text-white" />
              ) : (
                <span className="text-white text-sm font-medium">
                  {(user as any)?.firstName?.[0] || (user as any)?.email?.[0] || "A"}
                </span>
              )}
            </button>
            {!isCollapsed && (
              <>
                <button
                  onClick={() => setIsSpacePickerOpen(!isSpacePickerOpen)}
                  className="flex-1 min-w-0 text-left p-2 rounded-lg hover:bg-sidebar-hover transition-colors"
                >
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {currentBrand ? currentBrand.name : ((user as any)?.firstName && (user as any)?.lastName 
                      ? `${(user as any).firstName} ${(user as any).lastName}`
                      : (user as any)?.email)
                    }
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {currentBrand ? 'Brand Workspace' : 'Personal Account'}
                  </p>
                </button>
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

        {/* Brand Picker Accordion */}
        {isSpacePickerOpen && !isCollapsed && (
          <div className="px-4 pb-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              {/* Personal Account */}
              <div 
                className={`p-3 rounded-t-lg flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  !currentBrand ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => {
                  if (currentBrand) {
                    clearCurrentBrandMutation.mutate();
                    setIsSpacePickerOpen(false);
                  }
                }}
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {(user as any)?.firstName?.[0] || (user as any)?.email?.[0] || "A"}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Personal Account</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {!currentBrand ? 'Currently active' : 'Switch to personal'}
                  </p>
                </div>
              </div>

              {/* Brand Workspaces */}
              {brands && brands.length > 0 && (
                <>
                  <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Brand Workspaces
                    </p>
                  </div>
                  {brands.map((brand) => (
                    <div
                      key={brand.id}
                      className={`p-3 flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        currentBrand?.id === brand.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => {
                        if (currentBrand?.id !== brand.id) {
                          setCurrentBrandMutation.mutate(brand.id);
                          setIsSpacePickerOpen(false);
                        }
                      }}
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">
                          {brand.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{brand.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {currentBrand?.id === brand.id ? 'Currently active' : 'Switch to brand'}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Add Brand */}
              <div 
                className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-b-lg"
                onClick={() => {
                  window.location.href = '/settings';
                }}
              >
                <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Add Brand</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Create new workspace</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
