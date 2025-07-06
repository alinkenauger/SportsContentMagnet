import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Brain, 
  Database, 
  Settings, 
  Plus, 
  Trash2, 
  Edit, 
  Folder, 
  FolderOpen,
  Globe,
  Building,
  Check,
  X,
  Info,
  Power,
  PowerOff
} from "lucide-react";

interface KnowledgebaseCollection {
  id: number;
  name: string;
  description?: string;
  color: string;
  isDefault: boolean;
  isActive: boolean;
  brandId?: number;
  entryCount: number;
}

interface KnowledgebaseUsageSettings {
  id: number;
  useKnowledgeBase: boolean;
  selectedCollectionIds: number[];
  inheritFromGlobal: boolean;
  brandId?: number;
}

export default function KnowledgeBaseSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollection, setNewCollection] = useState({
    name: "",
    description: "",
    color: "#3B82F6"
  });

  // Queries
  const { data: collections = [], isLoading: collectionsLoading } = useQuery({
    queryKey: ["/api/knowledgebase/collections", selectedBrandId],
    enabled: true
  });

  const { data: usageSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/knowledgebase/usage-settings", selectedBrandId],
    enabled: true
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["/api/brands"],
    enabled: true
  });

  // Mutations
  const createCollectionMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/knowledgebase/collections", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledgebase/collections"] });
      setIsCreatingCollection(false);
      setNewCollection({ name: "", description: "", color: "#3B82F6" });
      toast({ title: "Success", description: "Knowledge base collection created!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create collection", variant: "destructive" });
    }
  });

  const updateUsageSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PUT", "/api/knowledgebase/usage-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledgebase/usage-settings"] });
      toast({ title: "Success", description: "Knowledge base settings updated!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update settings", variant: "destructive" });
    }
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/knowledgebase/collections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledgebase/collections"] });
      toast({ title: "Success", description: "Collection deleted!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete collection", variant: "destructive" });
    }
  });

  const handleCreateCollection = () => {
    if (!newCollection.name.trim()) return;
    
    createCollectionMutation.mutate({
      ...newCollection,
      brandId: selectedBrandId
    });
  };

  const handleUpdateUsageSettings = (updates: Partial<KnowledgebaseUsageSettings>) => {
    updateUsageSettingsMutation.mutate({
      ...usageSettings,
      ...updates,
      brandId: selectedBrandId
    });
  };

  const handleCollectionToggle = (collectionId: number, enabled: boolean) => {
    const currentIds = usageSettings?.selectedCollectionIds || [];
    const newIds = enabled 
      ? [...currentIds, collectionId]
      : currentIds.filter(id => id !== collectionId);
    
    handleUpdateUsageSettings({ selectedCollectionIds: newIds });
  };

  const globalCollections = collections.filter((c: KnowledgebaseCollection) => !c.brandId);
  const brandCollections = collections.filter((c: KnowledgebaseCollection) => c.brandId === selectedBrandId);
  const selectedIds = usageSettings?.selectedCollectionIds || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8" />
            Knowledge Base Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your AI knowledge bases and control how they're used for guide generation
          </p>
        </div>
        
        {/* Brand Selector */}
        <div className="flex items-center gap-2">
          <Button
            variant={selectedBrandId === null ? "default" : "outline"}
            onClick={() => setSelectedBrandId(null)}
            className="flex items-center gap-2"
          >
            <Globe className="w-4 h-4" />
            Global
          </Button>
          {brands.map((brand: any) => (
            <Button
              key={brand.id}
              variant={selectedBrandId === brand.id ? "default" : "outline"}
              onClick={() => setSelectedBrandId(brand.id)}
              className="flex items-center gap-2"
            >
              <Building className="w-4 h-4" />
              {brand.name}
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="usage" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Usage Settings
          </TabsTrigger>
          <TabsTrigger value="collections" className="flex items-center gap-2">
            <Folder className="w-4 h-4" />
            Collections
          </TabsTrigger>
          <TabsTrigger value="inheritance" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Inheritance
          </TabsTrigger>
        </TabsList>

        {/* Usage Settings Tab */}
        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Power className="w-5 h-5" />
                Knowledge Base Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Master Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {usageSettings?.useKnowledgeBase ? (
                    <Power className="w-5 h-5 text-green-500" />
                  ) : (
                    <PowerOff className="w-5 h-5 text-red-500" />
                  )}
                  <div>
                    <Label className="text-base font-medium">
                      Use Knowledge Base for AI Generation
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Enable or disable knowledge base usage for this {selectedBrandId ? 'brand' : 'account'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={usageSettings?.useKnowledgeBase || false}
                  onCheckedChange={(checked) => handleUpdateUsageSettings({ useKnowledgeBase: checked })}
                />
              </div>

              {/* Brand Inheritance */}
              {selectedBrandId && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-blue-500" />
                    <div>
                      <Label className="text-base font-medium">
                        Inherit from Global Knowledge Base
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Also use global knowledge base entries when enabled
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={usageSettings?.inheritFromGlobal || false}
                    onCheckedChange={(checked) => handleUpdateUsageSettings({ inheritFromGlobal: checked })}
                  />
                </div>
              )}

              {/* Collection Selection */}
              {usageSettings?.useKnowledgeBase && (
                <div>
                  <Label className="text-base font-medium">Select Knowledge Base Collections</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Choose which collections the AI should use for guide generation
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Global Collections */}
                    {globalCollections.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          Global Collections
                        </h4>
                        <div className="space-y-2">
                          {globalCollections.map((collection: KnowledgebaseCollection) => (
                            <div key={collection.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: collection.color }}
                                />
                                <div>
                                  <span className="font-medium">{collection.name}</span>
                                  <Badge variant="secondary" className="ml-2">
                                    {collection.entryCount} entries
                                  </Badge>
                                </div>
                              </div>
                              <Checkbox
                                checked={selectedIds.includes(collection.id)}
                                onCheckedChange={(checked) => 
                                  handleCollectionToggle(collection.id, checked as boolean)
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Brand Collections */}
                    {brandCollections.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          Brand Collections
                        </h4>
                        <div className="space-y-2">
                          {brandCollections.map((collection: KnowledgebaseCollection) => (
                            <div key={collection.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: collection.color }}
                                />
                                <div>
                                  <span className="font-medium">{collection.name}</span>
                                  <Badge variant="secondary" className="ml-2">
                                    {collection.entryCount} entries
                                  </Badge>
                                </div>
                              </div>
                              <Checkbox
                                checked={selectedIds.includes(collection.id)}
                                onCheckedChange={(checked) => 
                                  handleCollectionToggle(collection.id, checked as boolean)
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Collections Tab */}
        <TabsContent value="collections" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Knowledge Base Collections</h3>
            <Button onClick={() => setIsCreatingCollection(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Collection
            </Button>
          </div>

          {/* Create Collection Form */}
          {isCreatingCollection && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Collection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="collection-name">Collection Name</Label>
                  <Input
                    id="collection-name"
                    value={newCollection.name}
                    onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                    placeholder="e.g., Golf Techniques, Fitness Routines"
                  />
                </div>
                <div>
                  <Label htmlFor="collection-description">Description (Optional)</Label>
                  <Textarea
                    id="collection-description"
                    value={newCollection.description}
                    onChange={(e) => setNewCollection({ ...newCollection, description: e.target.value })}
                    placeholder="Describe what this collection contains..."
                  />
                </div>
                <div>
                  <Label htmlFor="collection-color">Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="collection-color"
                      value={newCollection.color}
                      onChange={(e) => setNewCollection({ ...newCollection, color: e.target.value })}
                      className="w-12 h-12 rounded border"
                    />
                    <span className="text-sm text-muted-foreground">Used for visual organization</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={handleCreateCollection} disabled={!newCollection.name.trim()}>
                    Create Collection
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreatingCollection(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Collections List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {collections.map((collection: KnowledgebaseCollection) => (
              <Card key={collection.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: collection.color }}
                      />
                      <div>
                        <h4 className="font-medium">{collection.name}</h4>
                        {collection.description && (
                          <p className="text-sm text-muted-foreground">{collection.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">
                            {collection.entryCount} entries
                          </Badge>
                          {collection.brandId ? (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              Brand
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              Global
                            </Badge>
                          )}
                          {collection.isDefault && (
                            <Badge variant="default">Default</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Collection</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{collection.name}" and all its entries. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteCollectionMutation.mutate(collection.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Inheritance Tab */}
        <TabsContent value="inheritance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Knowledge Base Inheritance System
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">How Knowledge Base Inheritance Works</h4>
                <div className="space-y-3 text-sm text-blue-800">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <strong>Global Level:</strong> Your personal account has a global knowledge base that serves as the foundation for all your brands.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <strong>Brand Level:</strong> Each brand can create its own knowledge base collections for specialized content.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <strong>Smart Fallback:</strong> If a brand has no knowledge base entries, it automatically uses your global knowledge base.
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <strong>Selective Usage:</strong> You can disable knowledge base usage entirely or select specific collections to use.
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-3">Current Configuration</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span>Knowledge Base Enabled</span>
                    {usageSettings?.useKnowledgeBase ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <X className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  {selectedBrandId && (
                    <div className="flex items-center justify-between p-3 border rounded">
                      <span>Inheriting from Global</span>
                      {usageSettings?.inheritFromGlobal ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <X className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span>Active Collections</span>
                    <Badge variant="secondary">
                      {selectedIds.length} selected
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}