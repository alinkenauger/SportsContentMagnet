import { useState } from "react";
import { Building2, User, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useBrands, useSetCurrentBrand, useClearCurrentBrand, type Brand } from "@/hooks/useBrands";
import { useAuth } from "@/hooks/useAuth";

export function SpacePicker() {
  const { brands, isLoading } = useBrands();
  const { user } = useAuth();
  const { toast } = useToast();
  const setCurrentBrandMutation = useSetCurrentBrand();
  const clearCurrentBrandMutation = useClearCurrentBrand();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isLoading) {
    return null;
  }

  const currentBrandId = (user as any)?.currentBrandId;
  const isInDefaultAccount = !currentBrandId;

  const handleSwitchBrand = async (brand: Brand) => {
    if (brand.id === currentBrandId) return;
    
    // Optimistic UI - the mutation will handle the optimistic update
    setCurrentBrandMutation.mutate(brand.id);
  };

  const handleSwitchToDefault = async () => {
    if (isInDefaultAccount) return;
    
    // Optimistic UI - the mutation will handle the optimistic update
    clearCurrentBrandMutation.mutate();
  };

  // Only show if user has brands
  if (!brands || brands.length === 0) {
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <TooltipProvider>
      <div className={`${isCollapsed ? 'w-16' : 'w-20'} bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-4 space-y-4 transition-all duration-300 relative`}>
        
        {/* Toggle Button */}
        <div className="absolute -right-3 top-4 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-6 w-6 p-0 rounded-full bg-background border-2"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>
        </div>

        {!isCollapsed && (
          <>
            {/* Active Brand at Top - Blue */}
            {currentBrandId && (
              <>
                {(() => {
                  const activeBrand = brands.find(b => b.id === currentBrandId);
                  return activeBrand ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleSwitchBrand(activeBrand)}
                          className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 border-2 text-sm font-semibold bg-blue-600 text-white border-blue-600 shadow-md"
                        >
                          {getInitials(activeBrand.name)}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{activeBrand.name} (Active)</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : null;
                })()}
                
                {/* Separator after active brand */}
                <div className="w-8 h-px bg-slate-300 dark:bg-slate-600" />
              </>
            )}

            {/* Personal Account - Blue when active */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleSwitchToDefault}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 border-2 ${
                    isInDefaultAccount
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  <User className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{isInDefaultAccount ? 'Personal Account (Active)' : 'Personal Account'}</p>
              </TooltipContent>
            </Tooltip>

            {/* Separator */}
            <div className="w-8 h-px bg-slate-300 dark:bg-slate-600" />

            {/* Non-Active Brand Spaces */}
            {brands.filter(brand => brand.id !== currentBrandId).map((brand) => (
              <Tooltip key={brand.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleSwitchBrand(brand)}
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 border-2 text-sm font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-transparent hover:bg-slate-300 dark:hover:bg-slate-600"
                  >
                    {getInitials(brand.name)}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{brand.name}</p>
                </TooltipContent>
              </Tooltip>
            ))}

            {/* Add Brand Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:border-slate-400 dark:hover:border-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  onClick={() => {
                    // Navigate to settings to create new brand
                    window.location.href = '/settings';
                  }}
                >
                  <Plus className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Add Brand</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}

        {isCollapsed && (
          <>
            {/* Show active brand/account when collapsed */}
            {currentBrandId ? (
              (() => {
                const activeBrand = brands.find(b => b.id === currentBrandId);
                return activeBrand ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold shadow-md">
                        {getInitials(activeBrand.name)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{activeBrand.name} (Active)</p>
                    </TooltipContent>
                  </Tooltip>
                ) : null;
              })()
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                    <User className="h-4 w-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Personal Account (Active)</p>
                </TooltipContent>
              </Tooltip>
            )}
          </>
        )}
      </div>
    </TooltipProvider>
  );
}