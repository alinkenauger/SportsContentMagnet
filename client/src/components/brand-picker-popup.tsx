import { Building2, User, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useBrands, useSetCurrentBrand, useClearCurrentBrand, type Brand } from "@/hooks/useBrands";
import { useAuth } from "@/hooks/useAuth";

interface BrandPickerPopupProps {
  onClose: () => void;
}

export function BrandPickerPopup({ onClose }: BrandPickerPopupProps) {
  const { data: brands = [], isLoading } = useBrands();
  const { currentBrandId, isInDefaultAccount } = useBrands();
  const { user } = useAuth();
  const { toast } = useToast();
  const setCurrentBrandMutation = useSetCurrentBrand();
  const clearCurrentBrandMutation = useClearCurrentBrand();

  if (isLoading) {
    return null;
  }

  const handleSwitchBrand = async (brand: Brand) => {
    try {
      await setCurrentBrandMutation.mutateAsync(brand.id);
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to switch brand. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSwitchToDefault = async () => {
    try {
      await clearCurrentBrandMutation.mutateAsync();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to switch to personal account. Please try again.",
        variant: "destructive",
      });
    }
  };

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
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-4 min-w-[240px]">
        <div className="space-y-3">
          {/* Personal Account - Blue when active */}
          <button
            onClick={handleSwitchToDefault}
            className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
              isInDefaultAccount
                ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700'
                : 'hover:bg-slate-100 dark:hover:bg-slate-700 border-2 border-transparent'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isInDefaultAccount
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
            }`}>
              <User className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Personal Account</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isInDefaultAccount ? 'Currently active' : 'Switch to personal'}
              </p>
            </div>
          </button>

          {/* Separator */}
          {brands.length > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-600 pt-3">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Brand Workspaces</p>
            </div>
          )}

          {/* Brand Options */}
          {brands.map((brand) => (
            <button
              key={brand.id}
              onClick={() => handleSwitchBrand(brand)}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                currentBrandId === brand.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700 border-2 border-transparent'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                currentBrandId === brand.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
              }`}>
                {getInitials(brand.name)}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{brand.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {currentBrandId === brand.id ? 'Currently active' : 'Switch to brand'}
                </p>
              </div>
            </button>
          ))}

          {/* Add Brand Button */}
          <div className="border-t border-slate-200 dark:border-slate-600 pt-3">
            <button
              className="w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              onClick={() => {
                window.location.href = '/settings';
              }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-700">
                <Plus className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">Add Brand</p>
                <p className="text-xs">Create new workspace</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}