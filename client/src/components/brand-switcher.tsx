import { useState } from "react";
import { Building2, Plus, Check, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useBrands, useCreateBrand, useSetCurrentBrand, type Brand } from "@/hooks/useBrands";
import { useAuth } from "@/hooks/useAuth";

export function BrandSwitcher() {
  const { brands, hasMultipleBrands, isLoading } = useBrands();
  const { user } = useAuth();
  const { toast } = useToast();
  const createBrandMutation = useCreateBrand();
  const setCurrentBrandMutation = useSetCurrentBrand();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandDescription, setNewBrandDescription] = useState("");

  const currentBrand = brands.find(b => b.id === user?.currentBrandId) || brands[0];

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;

    try {
      await createBrandMutation.mutateAsync({
        name: newBrandName.trim(),
        description: newBrandDescription.trim() || undefined,
      });
      
      toast({
        title: "Brand created",
        description: `${newBrandName} has been created successfully.`,
      });
      
      setNewBrandName("");
      setNewBrandDescription("");
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create brand. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSwitchBrand = async (brand: Brand) => {
    if (brand.id === currentBrand?.id) return;

    try {
      await setCurrentBrandMutation.mutateAsync(brand.id);
      toast({
        title: "Brand switched",
        description: `Switched to ${brand.name}`,
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to switch brand. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Only show if user has multiple brands
  if (!hasMultipleBrands || isLoading) {
    return null;
  }

  return (
    <div className="fixed left-0 top-0 z-50 h-full">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-full w-12 rounded-none border-r border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          >
            <Building2 className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-b border-border p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Your Brands</h2>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Brand
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Brand</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateBrand} className="space-y-4">
                      <div>
                        <Label htmlFor="brand-name">Brand Name</Label>
                        <Input
                          id="brand-name"
                          value={newBrandName}
                          onChange={(e) => setNewBrandName(e.target.value)}
                          placeholder="Enter brand name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="brand-description">Description (Optional)</Label>
                        <Textarea
                          id="brand-description"
                          value={newBrandDescription}
                          onChange={(e) => setNewBrandDescription(e.target.value)}
                          placeholder="Describe your brand's focus or niche"
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          type="submit"
                          disabled={!newBrandName.trim() || createBrandMutation.isPending}
                        >
                          {createBrandMutation.isPending ? "Creating..." : "Create Brand"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCreateDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              {currentBrand && (
                <p className="text-sm text-muted-foreground mt-2">
                  Current: <span className="font-medium">{currentBrand.name}</span>
                </p>
              )}
            </div>

            {/* Brand List */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-2">
                {brands.map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() => handleSwitchBrand(brand)}
                    disabled={setCurrentBrandMutation.isPending}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{brand.name}</h3>
                          {brand.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {brand.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    {brand.id === currentBrand?.id && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border p-6">
              <p className="text-xs text-muted-foreground">
                Each brand has its own workspace with separate guides, settings, and AI training.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}