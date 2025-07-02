import { useState } from "react";
import { Building2, User, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useBrands, useSetCurrentBrand, useClearCurrentBrand, type Brand } from "@/hooks/useBrands";
import { useAuth } from "@/hooks/useAuth";

export function BrandSwitcher() {
  const { brands, isLoading } = useBrands();
  const { user } = useAuth();
  const { toast } = useToast();
  const setCurrentBrandMutation = useSetCurrentBrand();
  const clearCurrentBrandMutation = useClearCurrentBrand();

  if (isLoading) {
    return null;
  }

  const currentBrandId = (user as any)?.currentBrandId;
  const currentBrand = brands.find(b => b.id === currentBrandId);
  const isInDefaultAccount = !currentBrandId;

  const handleSwitchBrand = async (brand: Brand) => {
    if (brand.id === currentBrandId) return;

    try {
      await setCurrentBrandMutation.mutateAsync(brand.id);
      toast({
        title: "Brand switched",
        description: `Switched to ${brand.name}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to switch brand. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSwitchToDefault = async () => {
    if (isInDefaultAccount) return;

    try {
      await clearCurrentBrandMutation.mutateAsync();
      toast({
        title: "Switched to default account",
        description: "You're now using your personal account",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to switch to default account. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Only show if user has brands or is in a brand
  if (!brands || (brands.length === 0 && isInDefaultAccount)) {
    return null;
  }

  const currentDisplayName = isInDefaultAccount 
    ? "Personal Account" 
    : currentBrand?.name || "Unknown Brand";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 h-8 px-3 text-sm"
        >
          {isInDefaultAccount ? (
            <User className="h-4 w-4" />
          ) : (
            <Building2 className="h-4 w-4" />
          )}
          <span className="max-w-32 truncate">{currentDisplayName}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {/* Default Account Option */}
        <DropdownMenuItem 
          onClick={handleSwitchToDefault}
          disabled={isInDefaultAccount || clearCurrentBrandMutation.isPending}
          className="flex items-center gap-2"
        >
          <User className="h-4 w-4" />
          <span>Personal Account</span>
          {isInDefaultAccount && <Check className="h-4 w-4 ml-auto" />}
        </DropdownMenuItem>

        {brands.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {brands.map((brand) => (
              <DropdownMenuItem
                key={brand.id}
                onClick={() => handleSwitchBrand(brand)}
                disabled={brand.id === currentBrandId || setCurrentBrandMutation.isPending}
                className="flex items-center gap-2"
              >
                <Building2 className="h-4 w-4" />
                <span className="flex-1 truncate">{brand.name}</span>
                {brand.id === currentBrandId && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}