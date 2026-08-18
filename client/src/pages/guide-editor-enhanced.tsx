import { useState, useEffect, DragEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Brand } from "@/hooks/useBrands";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Guide } from "@shared/schema";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Type, 
  AlignLeft, 
  Image, 
  Video, 
  Plus, 
  Save, 
  ArrowLeft, 
  GripVertical, 
  Trash2, 
  Music, 
  Columns, 
  Minus,
  MousePointer,
  Edit3,
  Settings,
  Layout,
  Play,
  Upload,
  Globe,
  BookOpen,
  Building2,
  User,
  ArrowRightLeft,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Loader2,
  Sparkles,
} from "lucide-react";

const MAX_IMPROVEMENT_INSTRUCTIONS = 1200;
const MIN_IMPROVEMENT_INSTRUCTIONS = 10;

function readableApiError(error: Error): string {
  const message = error.message.replace(/^\d+:\s*/, "");
  try {
    const payload = JSON.parse(message) as { message?: unknown };
    if (typeof payload.message === "string") return payload.message;
  } catch {
    // The API may return plain text. Use it as-is.
  }
  return message || "Something went wrong. Please try again.";
}

function EditorSidebar() {
  return (
    <div className="hidden shrink-0 md:block">
      <Sidebar />
    </div>
  );
}

interface EditableElement {
  id: string;
  type: 'heading' | 'paragraph' | 'image' | 'video' | 'audio' | 'button' | 'columns' | 'spacing';
  content: any;
  order: number;
  parentId?: string;
  columnId?: string;
  timestamp?: string;
  timestampSeconds?: number;
}

// ActionsMenu Component - 3-dots menu for Transfer and Delete
function ActionsMenu({ guide }: { guide: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [targetBrandId, setTargetBrandId] = useState<string>("");

  // Get user's brands for transfer options
  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const transferMutation = useMutation({
    mutationFn: async (data: { targetBrandId: number | null }) => {
      const response = await apiRequest(`/api/guides/${guide.id}/transfer`, "PATCH", data);
      return await response.json() as { message?: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/guides/${guide.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/guides"] });
      setShowTransferDialog(false);
      
      toast({
        title: "Transfer Complete",
        description: data.message || "Guide moved to the selected workspace",
      });
    },
    onError: (error) => {
      toast({
        title: "Transfer Failed",
        description: "Failed to transfer guide",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/guides/${guide.id}`, "DELETE");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guides"] });
      setShowDeleteDialog(false);
      
      toast({
        title: "Guide Deleted",
        description: "Guide has been permanently removed",
      });
      
      // Redirect to dashboard
      window.location.href = "/dashboard";
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete guide",
        variant: "destructive",
      });
    },
  });

  const handleTransfer = () => {
    const targetId = targetBrandId === "personal" ? null : parseInt(targetBrandId);
    transferMutation.mutate({ targetBrandId: targetId });
  };

  const getCurrentAccount = () => {
    if (!guide.brandId) return "Personal Account";
    const brand = brands.find((b: any) => b.id === guide.brandId);
    return brand ? brand.name : "Unknown Brand";
  };

  const getAvailableTargets = () => {
    const options = [
      { value: "personal", label: "Personal Account", icon: User }
    ];
    
    // Add brand options (excluding current brand)
    brands.forEach((brand: any) => {
      if (brand.id !== guide.brandId) {
        options.push({
          value: brand.id.toString(),
          label: brand.name,
          icon: Building2
        });
      }
    });
    
    return options;
  };

  return (
    <>
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center w-8 h-8 p-0"
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
        
        {isOpen && (
          <div className="absolute top-full right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowTransferDialog(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Transfer Guide</span>
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowDeleteDialog(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Guide</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transfer Dialog */}
      {showTransferDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Transfer Guide</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Current Account
                </label>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  {guide.brandId ? (
                    <Building2 className="w-4 h-4 text-blue-600" />
                  ) : (
                    <User className="w-4 h-4 text-green-600" />
                  )}
                  <span className="font-medium">{getCurrentAccount()}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Transfer To
                </label>
                <Select value={targetBrandId} onValueChange={setTargetBrandId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination account" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableTargets().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <option.icon className="w-4 h-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <strong>Note:</strong> Transferring will move this guide and its analytics to the selected account. 
                Landing pages may need to be recreated.
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowTransferDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleTransfer}
                disabled={!targetBrandId || transferMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {transferMutation.isPending ? "Transferring..." : "Transfer Guide"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Delete Guide</h3>
            
            <div className="space-y-4">
              <p className="text-gray-700">
                Are you sure you want to delete "{guide.title}"? This action cannot be undone.
              </p>

              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <strong>Warning:</strong> This will permanently delete the guide, all analytics data, 
                and any associated landing pages.
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Guide"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}



interface ColumnData {
  id: string;
  width: number;
  elements: EditableElement[];
}

export default function GuideEditorEnhanced() {
  const [location, navigate] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();
  
  const [editorPath] = location.split("?");
  const guideId = editorPath.split('/')[2];
  const isNewGuide = new URLSearchParams(search).get("new") === "1";
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [draggedFromToolbar, setDraggedFromToolbar] = useState<EditableElement['type'] | null>(null);
  const [dropZoneVisible, setDropZoneVisible] = useState(false);
  const [elements, setElements] = useState<EditableElement[]>([]);
  const [guideTitle, setGuideTitle] = useState("");
  const [guideDescription, setGuideDescription] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaLink, setCtaLink] = useState("");
  const [includeInLibrary, setIncludeInLibrary] = useState(false);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [improveDialogOpen, setImproveDialogOpen] = useState(false);
  const [improvementInstructions, setImprovementInstructions] = useState("");
  const [saveIntent, setSaveIntent] = useState<"draft" | "publish" | null>(null);

  // Fetch guide data
  const guideQueryKey = [`/api/guides/${guideId}`] as const;
  const { data: guide, isLoading: guideLoading, refetch: refetchGuide } = useQuery<Guide>({
    queryKey: guideQueryKey,
    enabled: !!guideId && isAuthenticated,
    retry: false,
  });

  const updateGuideCaches = (updatedGuide: Guide) => {
    queryClient.setQueryData<Guide>(guideQueryKey, (current) => (
      current ? { ...current, ...updatedGuide } : updatedGuide
    ));
    void queryClient.invalidateQueries({ queryKey: ["/api/guides"] });
  };

  // Save the creator's current fields before any status transition.
  const saveGuideMutation = useMutation<Guide, Error, Partial<Guide>>({
    mutationFn: async (updatedGuide: Partial<Guide>) => {
      const response = await apiRequest(`/api/guides/${guideId}`, "PUT", updatedGuide);
      return await response.json() as Guide;
    },
    onSuccess: (updatedGuide) => {
      updateGuideCaches(updatedGuide);
    },
  });

  const publishGuideMutation = useMutation<Guide, Error, void>({
    mutationFn: async () => {
      const response = await apiRequest(`/api/guides/${guideId}/status`, "PATCH", {
        status: "published",
      });
      const payload = await response.json() as { guide: Guide };
      return payload.guide;
    },
    onSuccess: (updatedGuide) => {
      updateGuideCaches(updatedGuide);
    },
  });

  const draftGuideMutation = useMutation<Guide, Error, void>({
    mutationFn: async () => {
      const response = await apiRequest(`/api/guides/${guideId}/status`, "PATCH", {
        status: "draft",
      });
      const payload = await response.json() as { guide: Guide };
      return payload.guide;
    },
    onSuccess: (updatedGuide) => {
      updateGuideCaches(updatedGuide);
    },
  });

  const updateLibraryMutation = useMutation<unknown, Error, boolean, { previous: boolean }>({
    mutationFn: async (nextValue) => {
      const response = await apiRequest(`/api/guides/${guideId}/library`, "PATCH", {
        includeInLibrary: nextValue,
      });
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    },
    onMutate: (nextValue) => {
      const previous = includeInLibrary;
      setIncludeInLibrary(nextValue);
      return { previous };
    },
    onSuccess: (_, nextValue) => {
      queryClient.invalidateQueries({ queryKey: ["/api/guides"] });
      toast({
        title: nextValue ? "Added to Library" : "Removed from Library",
        description: nextValue
          ? "Leads can discover this guide after it is published."
          : "The guide remains available from its direct link.",
      });
    },
    onError: (error, _nextValue, context) => {
      if (context) setIncludeInLibrary(context.previous);
      toast({
        title: "Could not update Library",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const regenerateGuideMutation = useMutation<unknown, Error, string>({
    mutationFn: async (instructions) => {
      const response = await apiRequest(`/api/guides/${guideId}/regenerate`, "POST", {
        instructions,
      });
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: guideQueryKey,
        exact: true,
        refetchType: "none",
      });
      await refetchGuide();
      await queryClient.invalidateQueries({ queryKey: ["/api/guides"] });
      toast({
        title: "New draft ready",
        description: "Review the regenerated Guide in the lead preview before publishing it again.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session expired",
          description: "Log in again before regenerating this Guide.",
          variant: "destructive",
        });
      }
    },
  });

  const handleImproveDialogChange = (open: boolean) => {
    if (!open && regenerateGuideMutation.isPending) return;
    setImproveDialogOpen(open);
    if (!open) {
      setImprovementInstructions("");
      regenerateGuideMutation.reset();
    } else {
      regenerateGuideMutation.reset();
    }
  };

  const handleRegenerate = () => {
    const instructions = improvementInstructions.trim();
    if (
      instructions.length < MIN_IMPROVEMENT_INSTRUCTIONS ||
      instructions.length > MAX_IMPROVEMENT_INSTRUCTIONS
    ) return;
    regenerateGuideMutation.mutate(instructions);
  };

  const handleLeadPreview = () => {
    window.open(`/guide/${guideId}?preview=1`, "_blank", "noopener,noreferrer");
  };

  // Initialize elements from guide content
  useEffect(() => {
    if (guide) {
      setGuideTitle(guide.title || '');
      setGuideDescription(guide.description || '');
      setCtaText(guide.ctaText || '');
      setCtaLink(guide.ctaLink || '');
      setIncludeInLibrary(guide.includeInLibrary === true);
      
      const initialElements: EditableElement[] = [];
      let order = 0;
      
      const content = guide.content as any;
      if (content) {
        if (content.introduction) {
          initialElements.push({
            id: `intro-${Date.now()}`,
            type: 'paragraph',
            content: { text: content.introduction },
            order: order++
          });
        }
        
        if (content.sections) {
          content.sections.forEach((section: any, index: number) => {
            initialElements.push({
              id: `section-title-${index}`,
              type: 'heading',
              content: { text: section.title, level: 2 },
              order: order++,
              timestamp: section.timestamp,
              timestampSeconds: section.timestampSeconds
            });
            
            initialElements.push({
              id: `section-content-${index}`,
              type: 'paragraph',
              content: { text: section.content },
              order: order++
            });
          });
        }
      } else {
        initialElements.push({
          id: `title-${Date.now()}`,
          type: 'heading',
          content: { text: guide.title || 'Guide Title', level: 1 },
          order: order++
        });
        
        initialElements.push({
          id: `intro-${Date.now()}`,
          type: 'paragraph',
          content: { text: 'Start writing your guide content here...' },
          order: order++
        });
      }
      
      setElements(initialElements);
    }
  }, [guide]);

  if (isLoading || guideLoading) {
    return (
      <div className="flex h-screen bg-background">
        <EditorSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading guide editor...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen bg-background">
        <EditorSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground mb-4">Please log in to access the guide editor.</p>
            <Button onClick={() => window.location.href = "/api/login"}>
              Log In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="flex h-screen bg-background">
        <EditorSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Guide Not Found</h2>
            <p className="text-muted-foreground mb-4">The guide you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/content-library')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Library
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const buildGuideUpdate = (): Partial<Guide> => {
    const title = guideTitle.trim();
    const currentContent = guide.content;
    const contentWithCurrentTitle = (
      currentContent && typeof currentContent === "object" && !Array.isArray(currentContent)
    )
      ? { ...currentContent, title }
      : currentContent;

    return {
      title,
      description: guideDescription.trim() || null,
      ctaText: ctaText.trim() || null,
      ctaLink: ctaLink.trim() || null,
      ...(contentWithCurrentTitle ? { content: contentWithCurrentTitle } : {}),
    };
  };

  const ensureGuideIsDraft = async () => {
    if (guide.status !== "draft") {
      await draftGuideMutation.mutateAsync();
    }
  };

  const handleSessionFailure = (error: Error): boolean => {
    if (!isUnauthorizedError(error)) return false;
    toast({
      title: "Session expired",
      description: "Log in again before saving this Guide.",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
    return true;
  };

  const handleSaveDraft = async () => {
    if (!guideTitle.trim()) return;
    setSaveIntent("draft");
    try {
      // Public Guides become private before their content is changed.
      await ensureGuideIsDraft();
      await saveGuideMutation.mutateAsync(buildGuideUpdate());
      toast({
        title: "Draft saved",
        description: "Your changes are private until you choose Save & publish.",
      });
    } catch (caught) {
      const error = caught instanceof Error ? caught : new Error("Failed to save Guide");
      if (!handleSessionFailure(error)) {
        toast({
          title: "Draft not saved",
          description: `${readableApiError(error)} Your edits are still here so you can try again.`,
          variant: "destructive",
        });
      }
    } finally {
      setSaveIntent(null);
    }
  };

  const handleSaveAndPublish = async () => {
    if (!guideTitle.trim()) return;
    setSaveIntent("publish");
    let changesSaved = false;

    try {
      // Save the visible fields as a private Draft first. If the publish gate
      // rejects them, an older Published status must not expose the new edits.
      await ensureGuideIsDraft();
      await saveGuideMutation.mutateAsync(buildGuideUpdate());
      changesSaved = true;
      await publishGuideMutation.mutateAsync();
      toast({
        title: "Guide published",
        description: includeInLibrary
          ? "The latest version is live and discoverable in your Library."
          : "The latest version is live at its public link.",
      });
    } catch (caught) {
      const error = caught instanceof Error ? caught : new Error("Failed to publish Guide");
      if (!handleSessionFailure(error)) {
        toast({
          title: changesSaved ? "Saved as Draft; publish failed" : "Guide not saved",
          description: changesSaved
            ? `${readableApiError(error)} Your edits are safe and remain private until the Guide passes review.`
            : `${readableApiError(error)} Your edits are still here and nothing was published.`,
          variant: "destructive",
        });
      }
    } finally {
      setSaveIntent(null);
    }
  };

  const addElement = (type: EditableElement['type'], columnId?: string, parentId?: string, insertIndex?: number) => {
    const newElement: EditableElement = {
      id: `${type}-${Date.now()}`,
      type,
      content: getDefaultContent(type),
      order: 0,
      ...(columnId && { columnId }),
      ...(parentId && { parentId })
    };
    
    setElements(prevElements => {
      // Get relevant elements (same context: top-level, or same column/parent)
      const relevantElements = prevElements.filter(el => {
        if (columnId && parentId) {
          return el.columnId === columnId && el.parentId === parentId;
        }
        return !el.parentId; // Top-level elements
      }).sort((a, b) => a.order - b.order);
      
      // Determine insertion position
      let targetIndex = insertIndex;
      if (targetIndex === undefined) {
        targetIndex = relevantElements.length; // Add at end
      }
      
      // Update orders for insertion
      const updatedElements = prevElements.map(el => {
        // Only update elements in the same context
        const isSameContext = columnId && parentId 
          ? (el.columnId === columnId && el.parentId === parentId)
          : !el.parentId;
          
        if (isSameContext && el.order >= targetIndex) {
          return { ...el, order: el.order + 1 };
        }
        return el;
      });
      
      // Set the new element's order
      newElement.order = targetIndex;
      
      // Add the new element
      return [...updatedElements, newElement];
    });
    
    // Auto-edit the new element
    setTimeout(() => setIsEditing(newElement.id), 100);
  };

  const getDefaultContent = (type: EditableElement['type']) => {
    switch (type) {
      case 'heading':
        return { text: 'New Heading', level: 2 };
      case 'paragraph':
        return { text: 'Click to edit this paragraph...' };
      case 'image':
        return { src: '', alt: 'Image description', caption: '' };
      case 'video':
        return { src: '', title: 'Video title' };
      case 'audio':
        return { src: '', title: 'Audio title' };
      case 'button':
        return { text: 'Button Text', url: '#', style: 'primary' };
      case 'columns':
        return { 
          layout: '2-column',
          columns: [
            { id: `col-${Date.now()}-1`, width: 50, elements: [] }, 
            { id: `col-${Date.now()}-2`, width: 50, elements: [] }
          ] 
        };
      case 'spacing':
        return { height: 'medium' };
      default:
        return {};
    }
  };

  // Enhanced drag handlers
  const handleToolbarDragStart = (e: DragEvent<HTMLButtonElement>, elementType: EditableElement['type']) => {
    setDraggedFromToolbar(elementType);
    setDropZoneVisible(true);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', elementType);
  };

  const handleToolbarDragEnd = () => {
    setDraggedFromToolbar(null);
    setDropZoneVisible(false);
    setDragOverColumn(null);
  };

  const handleElementDragStart = (e: DragEvent<HTMLDivElement>, elementId: string) => {
    setDraggedElement(elementId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', elementId);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (draggedFromToolbar) {
      e.dataTransfer.dropEffect = 'copy';
    } else {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleCanvasDrop = (e: DragEvent<HTMLDivElement>, insertIndex?: number, columnId?: string, parentId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Use dragOverIndex if insertIndex is not provided
    const targetIndex = insertIndex !== undefined ? insertIndex : dragOverIndex;
    
    if (draggedFromToolbar) {
      addElement(draggedFromToolbar, columnId, parentId, targetIndex ?? undefined);
      setDraggedFromToolbar(null);
      setDropZoneVisible(false);
      setDragOverColumn(null);
      setDragOverIndex(null);
    } else if (draggedElement) {
      moveElement(draggedElement, targetIndex ?? undefined, columnId, parentId);
      setDraggedElement(null);
      setDragOverIndex(null);
    }
  };

  const handleElementDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(index);
    if (draggedFromToolbar) {
      e.dataTransfer.dropEffect = 'copy';
    } else {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleElementDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleColumnDragOver = (e: DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
    e.dataTransfer.dropEffect = draggedFromToolbar ? 'copy' : 'move';
  };

  const handleColumnDragLeave = () => {
    setDragOverColumn(null);
  };

  const moveElement = (elementId: string, insertIndex?: number, columnId?: string, parentId?: string) => {
    const elementIndex = elements.findIndex(el => el.id === elementId);
    if (elementIndex === -1) return;

    const newElements = [...elements];
    const [movedElement] = newElements.splice(elementIndex, 1);
    
    // Update element properties - ensure we don't accidentally hide elements
    movedElement.columnId = columnId || movedElement.columnId;
    movedElement.parentId = parentId || movedElement.parentId;
    
    // Handle insertion logic more carefully
    if (insertIndex !== undefined && insertIndex >= 0) {
      // Adjust insertion index if we're moving element to a position after its original position
      const adjustedIndex = insertIndex > elementIndex ? insertIndex - 1 : insertIndex;
      newElements.splice(adjustedIndex, 0, movedElement);
    } else {
      // If no specific index, append to end
      newElements.push(movedElement);
    }
    
    // Update order values
    newElements.forEach((el, index) => {
      el.order = index;
    });
    
    setElements(newElements);
  };

  const updateElement = (id: string, content: any) => {
    setElements(elements.map(el => 
      el.id === id ? { ...el, content } : el
    ));
  };

  const updateColumnWidth = (elementId: string, columnId: string, newWidth: number) => {
    setElements(elements.map(el => {
      if (el.id === elementId && el.type === 'columns') {
        const updatedColumns = el.content.columns.map((col: any) => 
          col.id === columnId ? { ...col, width: newWidth } : col
        );
        return { ...el, content: { ...el.content, columns: updatedColumns } };
      }
      return el;
    }));
  };

  const addColumnToElement = (elementId: string) => {
    setElements(elements.map(el => {
      if (el.id === elementId && el.type === 'columns') {
        const currentColumns = el.content.columns.length;
        const newWidth = Math.floor(100 / (currentColumns + 1));
        
        // Adjust existing column widths
        const adjustedColumns = el.content.columns.map((col: any) => ({
          ...col,
          width: newWidth
        }));
        
        // Add new column
        const newColumn = {
          id: `col-${Date.now()}-${currentColumns + 1}`,
          width: newWidth,
          elements: []
        };
        
        return {
          ...el,
          content: {
            ...el.content,
            layout: `${currentColumns + 1}-column`,
            columns: [...adjustedColumns, newColumn]
          }
        };
      }
      return el;
    }));
  };

  const deleteElement = (id: string) => {
    setElements(prevElements => prevElements.filter(el => el.id !== id && el.parentId !== id));
    setIsEditing(null);
  };

  const handleColumnResizeStart = (e: React.MouseEvent, elementId: string, columnId: string, columnIndex: number) => {
    e.preventDefault();
    setIsResizing(`${elementId}-${columnId}`);
    
    const handleMouseMove = (e: MouseEvent) => {
      const container = (e.target as HTMLElement).closest('.relative.flex.w-full');
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const containerWidth = rect.width;
      const newLeftWidth = Math.max(15, Math.min(85, (mouseX / containerWidth) * 100));
      const newRightWidth = 100 - newLeftWidth;
      
      // Update both columns
      setElements(elements.map(el => {
        if (el.id === elementId && el.type === 'columns') {
          const updatedColumns = [...el.content.columns];
          updatedColumns[columnIndex] = { ...updatedColumns[columnIndex], width: newLeftWidth };
          updatedColumns[columnIndex + 1] = { ...updatedColumns[columnIndex + 1], width: newRightWidth };
          return { ...el, content: { ...el.content, columns: updatedColumns } };
        }
        return el;
      }));
    };
    
    const handleMouseUp = () => {
      setIsResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const renderElement = (element: EditableElement): JSX.Element => {
    const isActive = isEditing === element.id;
    const isDragging = draggedElement === element.id;
    
    return (
      <div
        key={element.id}
        className={`group relative border-2 border-dashed transition-all duration-200 ${
          isActive 
            ? 'border-primary bg-primary/5' 
            : 'border-transparent hover:border-slate-300 hover:bg-slate-50/50'
        } ${isDragging ? 'opacity-50 scale-95 rotate-1' : ''} ${
          !isActive ? 'cursor-grab hover:cursor-grab' : ''
        } rounded-lg p-2`}
        draggable={!isActive}
        onDragStart={(e) => {
          if (!isActive) {
            handleElementDragStart(e, element.id);
            e.currentTarget.style.cursor = 'grabbing';
          }
        }}
        onDragEnd={(e) => {
          e.currentTarget.style.cursor = 'grab';
        }}
        onDragOver={handleDragOver}
        onDrop={(e) => handleCanvasDrop(e, undefined, element.columnId, element.parentId)}
      >
        {/* Element Controls */}
        <div className={`absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 ${isActive ? 'opacity-100' : ''}`}>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 bg-white border shadow-sm cursor-grab hover:cursor-grabbing hover:bg-slate-50"
            draggable={!isActive}
            onDragStart={(e) => {
              if (!isActive) {
                e.stopPropagation();
                handleElementDragStart(e as any, element.id);
              }
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3 w-3 text-slate-600" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(isActive ? null : element.id)}
            className="h-6 w-6 p-0 bg-white border shadow-sm hover:bg-slate-50"
          >
            <Edit3 className="h-3 w-3 text-slate-600" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              deleteElement(element.id);
            }}
            className="h-6 w-6 p-0 bg-white border shadow-sm text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {renderElementContent(element, isActive)}
      </div>
    );
  };

  const renderElementContent = (element: EditableElement, isActive: boolean): JSX.Element => {
    // Early return for missing element or content
    if (!element || !element.content) {
      return (
        <div className="text-center text-muted-foreground py-4">
          <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Invalid element</p>
          <p className="text-xs">Missing content</p>
        </div>
      );
    }
    
    switch (element.type) {
      case 'heading':
        try {
          const HeadingTag = `h${element.content.level || 2}` as keyof JSX.IntrinsicElements;
          return isActive ? (
            <div className="space-y-2">
              <Input
                value={element.content.text || ''}
                onChange={(e) => updateElement(element.id, { ...element.content, text: e.target.value })}
                className="font-bold text-lg"
                placeholder="Enter heading text"
                autoFocus
              />
              <Select
                value={element.content.level?.toString() || '2'}
                onValueChange={(value) => updateElement(element.id, { ...element.content, level: parseInt(value) })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">H1</SelectItem>
                  <SelectItem value="2">H2</SelectItem>
                  <SelectItem value="3">H3</SelectItem>
                  <SelectItem value="4">H4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                {element.timestamp && element.timestampSeconds && guide?.youtubeVideoId && (
                  <Button
                    variant="default"
                    size="sm"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md text-xs shrink-0 mt-1"
                    onClick={() => {
                      const iframe = document.getElementById('youtube-player') as HTMLIFrameElement;
                      if (iframe && element.timestampSeconds) {
                        iframe.src = `https://www.youtube.com/embed/${guide.youtubeVideoId}?start=${element.timestampSeconds}&autoplay=1&enablejsapi=1`;
                        iframe.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    {element.timestamp}
                  </Button>
                )}
                <HeadingTag 
                  className={`font-bold text-slate-800 cursor-pointer mb-0 flex-1 ${
                    element.content.level === 1 ? 'text-3xl md:text-4xl' : 
                    element.content.level === 2 ? 'text-2xl md:text-3xl' : 
                    element.content.level === 3 ? 'text-xl md:text-2xl' : 
                    'text-lg md:text-xl'
                  }`}
                  onClick={() => setIsEditing(element.id)}
                >
                  {element.content.text || 'Click to edit heading'}
                </HeadingTag>
              </div>
            </div>
          );
        } catch (error) {
          console.error('Error rendering heading:', error);
          return <div>Error rendering heading</div>;
        }

      case 'paragraph':
        return isActive ? (
          <Textarea
            value={element.content.text || ''}
            onChange={(e) => updateElement(element.id, { ...element.content, text: e.target.value })}
            className="min-h-20"
            placeholder="Enter paragraph text"
            autoFocus
          />
        ) : (
          <p 
            className="text-lg text-slate-700 leading-relaxed cursor-pointer mb-6"
            onClick={() => setIsEditing(element.id)}
          >
            {element.content.text || 'Click to edit paragraph text...'}
          </p>
        );

      case 'columns':
        const columns = element.content.columns || [];
        const totalColumns = columns.length;
        
        return (
          <div className="space-y-4">
            {isActive && (
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border">
                <span className="text-sm font-medium">Layout:</span>
                <Badge variant="outline">{totalColumns} Columns</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addColumnToElement(element.id)}
                  disabled={totalColumns >= 4}
                  className="h-7"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Column
                </Button>
              </div>
            )}
            
            <div className="relative flex w-full min-h-48 bg-background border rounded-lg overflow-hidden">
              {columns.map((column: ColumnData, index: number) => (
                <div key={column.id} className="relative flex">
                  {/* Column Content */}
                  <div
                    className={`flex-shrink-0 border-r border-muted p-4 transition-colors ${
                      dragOverColumn === column.id 
                        ? 'bg-primary/5 border-primary/20' 
                        : ''
                    } ${dropZoneVisible ? 'bg-muted/30' : ''}`}
                    style={{ width: `${column.width}%` }}
                    onDragOver={(e) => handleColumnDragOver(e, column.id)}
                    onDragLeave={handleColumnDragLeave}
                    onDrop={(e) => handleCanvasDrop(e, undefined, column.id, element.id)}
                  >
                    {isActive && (
                      <div className="mb-3 pb-2 border-b border-muted">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-muted-foreground">Col {index + 1}</span>
                          <span className="text-primary font-mono">{column.width}%</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      {elements.filter(el => el.columnId === column.id && el.parentId === element.id).length === 0 ? (
                        <div className={`text-center text-muted-foreground py-12 transition-colors ${
                          dragOverColumn === column.id ? 'bg-primary/5 border border-primary/20 rounded-lg' : ''
                        }`}>
                          <Layout className="h-6 w-6 mx-auto mb-2 opacity-40" />
                          <p className="text-xs">Drop elements here</p>
                          {dragOverColumn === column.id && (
                            <p className="text-xs text-primary font-medium mt-1">Drop Element Here</p>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* Top drop zone for columns */}
                          <div
                            className={`transition-all duration-200 ${
                              dragOverColumn === column.id && dragOverIndex === 0
                                ? 'h-12 border-2 border-dashed border-primary bg-primary/10 rounded-lg flex items-center justify-center' 
                                : 'h-1'
                            }`}
                            onDragOver={(e) => {
                              handleColumnDragOver(e, column.id);
                              handleElementDragOver(e, 0);
                            }}
                            onDrop={(e) => handleCanvasDrop(e, 0, column.id, element.id)}
                          >
                            {dragOverColumn === column.id && dragOverIndex === 0 && (
                              <div className="flex items-center gap-2 text-primary font-medium text-xs">
                                <Plus className="h-3 w-3" />
                                <span>Drop Element Here</span>
                              </div>
                            )}
                          </div>
                          
                          {elements
                            .filter(el => el.columnId === column.id && el.parentId === element.id)
                            .sort((a, b) => a.order - b.order)
                            .map((el, elIndex) => (
                              <div key={el.id}>
                                {renderElement(el)}
                                
                                {/* Drop zone between column elements */}
                                <div
                                  className={`transition-all duration-200 ${
                                    dragOverColumn === column.id && dragOverIndex === elIndex + 1
                                      ? 'h-12 border-2 border-dashed border-primary bg-primary/10 rounded-lg flex items-center justify-center' 
                                      : 'h-1'
                                  }`}
                                  onDragOver={(e) => {
                                    handleColumnDragOver(e, column.id);
                                    handleElementDragOver(e, elIndex + 1);
                                  }}
                                  onDrop={(e) => handleCanvasDrop(e, elIndex + 1, column.id, element.id)}
                                >
                                  {dragOverColumn === column.id && dragOverIndex === elIndex + 1 && (
                                    <div className="flex items-center gap-2 text-primary font-medium text-xs">
                                      <Plus className="h-3 w-3" />
                                      <span>Drop Element Here</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Simple Drag Dot Separator */}
                  {index < totalColumns - 1 && (
                    <div className="relative flex items-center justify-center w-4 group">
                      <div
                        className="w-3 h-3 bg-gray-300 hover:bg-primary border-2 border-white rounded-full cursor-col-resize shadow-sm hover:shadow-md transition-all duration-200 hover:scale-110 group-hover:ring-2 group-hover:ring-primary/30"
                        onMouseDown={(e) => handleColumnResizeStart(e, element.id, column.id, index)}
                        title="Drag to resize columns"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'image':
        return isActive ? (
          <div className="space-y-4">
            {/* File Upload Section */}
            <div className="space-y-2">
              <label htmlFor={`image-upload-${element.id}`} className="text-sm font-medium block">
                Upload Image
              </label>
              <div className="flex gap-2">
                <input
                  id={`image-upload-${element.id}`}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const imageData = event.target?.result as string;
                        updateElement(element.id, {
                          ...element.content,
                          src: imageData,
                          alt: element.content.alt || file.name
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="flex-1 text-sm border rounded-md px-3 py-2 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById(`image-upload-${element.id}`)?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Browse
                </Button>
              </div>
            </div>

            {/* URL Input as Alternative */}
            <div className="space-y-2">
              <label className="text-sm font-medium block">Or enter image URL</label>
              <Input
                placeholder="https://example.com/image.jpg"
                value={element.content.src || ''}
                onChange={(e) => updateElement(element.id, { ...element.content, src: e.target.value })}
              />
            </div>

            {/* Alt Text */}
            <div className="space-y-2">
              <label className="text-sm font-medium block">Alt text</label>
              <Input
                placeholder="Describe the image for accessibility"
                value={element.content.alt || ''}
                onChange={(e) => updateElement(element.id, { ...element.content, alt: e.target.value })}
              />
            </div>

            {/* Caption */}
            <div className="space-y-2">
              <label className="text-sm font-medium block">Caption (optional)</label>
              <Input
                placeholder="Add a caption for the image"
                value={element.content.caption || ''}
                onChange={(e) => updateElement(element.id, { ...element.content, caption: e.target.value })}
              />
            </div>
          </div>
        ) : element.content.src ? (
          <div className="text-center">
            <img
              src={element.content.src}
              alt={element.content.alt || 'Guide image'}
              className="max-w-full h-auto rounded-lg mx-auto cursor-pointer"
              onClick={() => setIsEditing(element.id)}
              onError={(e) => {
                console.error('Image failed to load:', element.content.src?.substring(0, 100) + '...');
                console.error('Element content:', element.content);
                console.error('Error details:', e);
              }}
            />
            {element.content.caption && (
              <p className="text-sm text-muted-foreground mt-2 italic">
                {element.content.caption}
              </p>
            )}
          </div>
        ) : (
          <div 
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setIsEditing(element.id)}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.classList.add('border-primary', 'bg-primary/5');
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
              
              const files = Array.from(e.dataTransfer.files);
              const imageFile = files.find(file => file.type.startsWith('image/'));
              
              if (imageFile) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  const imageData = event.target?.result as string;
                  updateElement(element.id, {
                    ...element.content,
                    src: imageData,
                    alt: element.content.alt || imageFile.name
                  });
                };
                reader.readAsDataURL(imageFile);
              }
            }}
          >
            <Image className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm font-medium">Drop image here or click to configure</p>
            <p className="text-xs text-muted-foreground">Supports JPG, PNG, GIF, WebP</p>
          </div>
        );

      case 'video':
        return isActive ? (
          <div className="space-y-2">
            <Input
              placeholder="Video URL (YouTube, Vimeo, or direct link)"
              value={element.content.src || ''}
              onChange={(e) => updateElement(element.id, { ...element.content, src: e.target.value })}
            />
            <Input
              placeholder="Video title"
              value={element.content.title || ''}
              onChange={(e) => updateElement(element.id, { ...element.content, title: e.target.value })}
            />
          </div>
        ) : element.content.src ? (
          <div className="text-center">
            <div className="relative bg-black rounded-lg overflow-hidden cursor-pointer" onClick={() => setIsEditing(element.id)}>
              <div className="aspect-video flex items-center justify-center">
                <Play className="h-16 w-16 text-white/80" />
              </div>
              <div className="absolute inset-0 bg-black/20 hover:bg-black/10 transition-colors" />
            </div>
            {element.content.title && (
              <p className="text-sm font-medium mt-2">
                {element.content.title}
              </p>
            )}
          </div>
        ) : (
          <div 
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setIsEditing(element.id)}
          >
            <Video className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm font-medium">Click to add video</p>
            <p className="text-xs text-muted-foreground">Enter video URL and title</p>
          </div>
        );

      case 'audio':
        return isActive ? (
          <div className="space-y-2">
            <Input
              placeholder="Audio URL"
              value={element.content.src || ''}
              onChange={(e) => updateElement(element.id, { ...element.content, src: e.target.value })}
            />
            <Input
              placeholder="Audio title"
              value={element.content.title || ''}
              onChange={(e) => updateElement(element.id, { ...element.content, title: e.target.value })}
            />
          </div>
        ) : element.content.src ? (
          <div className="text-center cursor-pointer" onClick={() => setIsEditing(element.id)}>
            <div className="bg-muted rounded-lg p-4 inline-flex items-center gap-3">
              <Music className="h-6 w-6 text-primary" />
              <div className="text-left">
                <p className="text-sm font-medium">{element.content.title || 'Audio Track'}</p>
                <p className="text-xs text-muted-foreground">Click to play</p>
              </div>
            </div>
          </div>
        ) : (
          <div 
            className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setIsEditing(element.id)}
          >
            <Music className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm font-medium">Click to add audio</p>
            <p className="text-xs text-muted-foreground">Enter audio URL and title</p>
          </div>
        );

      case 'button':
        return isActive ? (
          <div className="space-y-3 p-4 border rounded bg-white">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Button Text</label>
              <Input
                placeholder="Button text"
                value={element.content.text || ''}
                onChange={(e) => updateElement(element.id, { ...element.content, text: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Button URL</label>
              <Input
                placeholder="https://example.com"
                value={element.content.url || ''}
                onChange={(e) => updateElement(element.id, { ...element.content, url: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Button Style</label>
              <Select
                value={element.content.style || 'primary'}
                onValueChange={(value) => updateElement(element.id, { ...element.content, style: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                  <SelectItem value="custom">Custom Color</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {element.content.style === 'custom' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Custom Color</label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={element.content.customColor || '#3b82f6'}
                    onChange={(e) => updateElement(element.id, { ...element.content, customColor: e.target.value })}
                    className="w-16 h-10 p-1 rounded"
                  />
                  <Input
                    placeholder="#3b82f6"
                    value={element.content.customColor || '#3b82f6'}
                    onChange={(e) => updateElement(element.id, { ...element.content, customColor: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <Button
              variant={element.content.style === 'primary' ? 'default' : 
                      element.content.style === 'secondary' ? 'secondary' : 
                      element.content.style === 'outline' ? 'outline' : 'default'}
              onClick={element.content.url ? () => window.open(element.content.url, '_blank') : () => setIsEditing(element.id)}
              className="cursor-pointer"
              style={element.content.style === 'custom' ? {
                backgroundColor: element.content.customColor || '#3b82f6',
                borderColor: element.content.customColor || '#3b82f6',
                color: 'white'
              } : undefined}
            >
              {element.content.text || 'Button Text'}
            </Button>
          </div>
        );

      case 'spacing':
        const heights = { small: 'h-4', medium: 'h-8', large: 'h-16' };
        return isActive ? (
          <Select
            value={element.content.height || 'medium'}
            onValueChange={(value) => updateElement(element.id, { ...element.content, height: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div className={`bg-muted/30 border border-dashed border-muted-foreground/30 rounded ${heights[element.content.height as keyof typeof heights] || 'h-8'}`} />
        );

      default:
        return (
          <div className="text-center text-muted-foreground py-4">
            <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Element type: {element.type}</p>
            <p className="text-xs">Click to configure</p>
          </div>
        );
    }
  };

  const guideContent = (guide.content || {}) as any;
  const guideSections = Array.isArray(guideContent.sections) ? guideContent.sections : [];
  const isRichGuide = guideContent.schemaVersion === 2;
  const hasTimestampedSections = guideSections.some((section: any) => (
    typeof section?.timestampSeconds === "number" || Boolean(section?.timestamp)
  ));
  const hasUnsavedChanges = (
    guideTitle !== (guide.title || "") ||
    guideDescription !== (guide.description || "") ||
    ctaText !== (guide.ctaText || "") ||
    ctaLink !== (guide.ctaLink || "")
  );
  const workflowPending = saveIntent !== null || saveGuideMutation.isPending || publishGuideMutation.isPending;
  const isPublished = guide.status === "published";
  const isUnlisted = guide.status === "unlisted";
  const statusLabel = isPublished ? "Published" : isUnlisted ? "Unlisted" : "Draft";
  const statusDescription = isPublished
    ? "Live at its public link"
    : isUnlisted
      ? "Available only to people with the direct link"
      : "Private to your workspace";

  return (
    <div className="flex h-screen bg-[#f7f4ee]">
      <EditorSidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 bg-[#fffdf9] px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/content-library')} className="shrink-0">
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Content Library</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <div className="h-7 w-px bg-black/10" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Review &amp; publish</p>
              <p className="truncate text-sm font-semibold text-[#101419]">{guide.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={isPublished
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : isUnlisted
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-slate-200 bg-white text-slate-700"}
            >
              {isPublished ? <Globe className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> : <BookOpen className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}
              {statusLabel}
            </Badge>
            <ActionsMenu guide={guide} />
          </div>
        </header>

        {isNewGuide ? (
          <aside className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950 sm:px-6">
            <div className="flex items-start gap-2 text-sm leading-6">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <p>
                <strong>Your new draft is ready.</strong>{" "}
                Review the details, preview the lead experience, then publish when it feels right.
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={handleLeadPreview} className="border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-100">
              <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
              Preview new Guide
            </Button>
          </aside>
        ) : null}

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
            <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c54d2b]">Final review</p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#101419] sm:text-4xl">Make the lead experience ready to share.</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                  VidMagnet has already built the Guide. Review it as your lead, refine the positioning, and publish the finished version.
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 md:items-end">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={handleLeadPreview} className="border-black/15 bg-white">
                    <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
                    Preview as lead
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleImproveDialogChange(true)}
                    disabled={workflowPending || hasUnsavedChanges}
                    aria-describedby={hasUnsavedChanges ? "improve-save-first" : undefined}
                    className="border-violet-200 bg-white text-violet-700 hover:bg-violet-50 hover:text-violet-800"
                  >
                    <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                    Improve with AI
                  </Button>
                </div>
                {hasUnsavedChanges ? (
                  <p id="improve-save-first" className="max-w-sm text-xs leading-5 text-amber-800">
                    Save this Draft first so AI improvement cannot replace unsaved title, description, or CTA edits.
                  </p>
                ) : null}
              </div>
            </section>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <Card className="overflow-hidden rounded-3xl border-black/10 bg-[#fffdf9] shadow-[0_24px_70px_rgba(16,20,25,0.08)]">
                <CardContent className="p-0">
                  <div className="border-b border-black/10 px-5 py-5 sm:px-7 sm:py-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Guide details</p>
                    <h2 className="mt-2 text-xl font-bold text-[#101419]">What your lead sees before they begin</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Keep the promise clear and the next step specific. The generated Guide content stays intact.</p>
                  </div>

                  <div className="space-y-7 px-5 py-6 sm:px-7 sm:py-7">
                    <div className="space-y-2">
                      <label htmlFor="guide-review-title" className="text-sm font-semibold text-slate-900">Guide title</label>
                      <Input
                        id="guide-review-title"
                        value={guideTitle}
                        onChange={(event) => setGuideTitle(event.target.value)}
                        disabled={workflowPending}
                        aria-invalid={!guideTitle.trim()}
                        className="h-12 rounded-xl border-slate-200 bg-white text-base font-semibold"
                        placeholder="Give this Guide a clear outcome-led title"
                      />
                      {!guideTitle.trim() ? <p className="text-xs font-medium text-red-600">A title is required before this Guide can be saved.</p> : null}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="guide-review-description" className="text-sm font-semibold text-slate-900">Short description</label>
                      <Textarea
                        id="guide-review-description"
                        value={guideDescription}
                        onChange={(event) => setGuideDescription(event.target.value)}
                        disabled={workflowPending}
                        rows={4}
                        className="resize-none rounded-xl border-slate-200 bg-white leading-6"
                        placeholder="Explain the useful result this Guide helps the lead achieve."
                      />
                    </div>

                    <div className="border-t border-black/10 pt-7">
                      <div className="flex items-start gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#101419] text-white">
                          <MousePointer className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div>
                          <h3 className="text-base font-bold text-[#101419]">Call to action</h3>
                          <p className="mt-1 text-sm leading-6 text-slate-600">Offer the most relevant next step after the lead finishes the Guide.</p>
                        </div>
                      </div>
                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label htmlFor="guide-review-cta-text" className="text-sm font-semibold text-slate-900">Button text</label>
                          <Input
                            id="guide-review-cta-text"
                            value={ctaText}
                            onChange={(event) => setCtaText(event.target.value)}
                            disabled={workflowPending}
                            className="h-11 rounded-xl border-slate-200 bg-white"
                            placeholder="Explore the full program"
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="guide-review-cta-link" className="text-sm font-semibold text-slate-900">Destination URL</label>
                          <Input
                            id="guide-review-cta-link"
                            type="url"
                            inputMode="url"
                            value={ctaLink}
                            onChange={(event) => setCtaLink(event.target.value)}
                            disabled={workflowPending}
                            className="h-11 rounded-xl border-slate-200 bg-white"
                            placeholder="https://yourbrand.com/next-step"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 rounded-2xl border border-[#79d9c7]/55 bg-[#effaf7] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                      <div className="flex items-start gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#79d9c7] text-[#101419]">
                          <BookOpen className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div>
                          <label htmlFor="guide-editor-library" className="text-sm font-bold text-[#101419]">Add to your lead Library</label>
                          <p className="mt-1 max-w-lg text-sm leading-5 text-slate-600">Let leads find this Guide again alongside the other resources your brand publishes.</p>
                        </div>
                      </div>
                      <Switch
                        id="guide-editor-library"
                        checked={includeInLibrary}
                        onCheckedChange={(checked) => updateLibraryMutation.mutate(checked)}
                        disabled={updateLibraryMutation.isPending || workflowPending}
                        aria-label="Add this guide to your public Library"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <aside className="space-y-5 lg:sticky lg:top-6">
                <Card className="rounded-3xl border-black/10 bg-[#101419] text-white shadow-[0_20px_60px_rgba(16,20,25,0.18)]">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">Lead experience</p>
                        <h2 className="mt-2 text-xl font-bold">Review the real output</h2>
                      </div>
                      <Eye className="h-5 w-5 text-[#79d9c7]" aria-hidden="true" />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/65">Preview opens the private lead view—even while this Guide is still a Draft. Preview visits are not counted.</p>
                    <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                      <div className="bg-[#101419] p-4">
                        <p className="text-2xl font-bold tabular-nums">{guideSections.length}</p>
                        <p className="mt-1 text-xs text-white/50">Guide sections</p>
                      </div>
                      <div className="bg-[#101419] p-4">
                        <p className="text-sm font-bold">{hasTimestampedSections ? "Clickable" : guide.youtubeVideoId ? "Video" : "Source"}</p>
                        <p className="mt-1 text-xs text-white/50">{hasTimestampedSections ? "Video moments" : guide.youtubeVideoId ? "Embedded source" : "Content grounded"}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {isRichGuide ? <Badge className="border-white/10 bg-white/10 text-white hover:bg-white/10">Rich Guide</Badge> : null}
                      {includeInLibrary ? <Badge className="border-white/10 bg-white/10 text-white hover:bg-white/10">Library ready</Badge> : null}
                    </div>
                    <Button type="button" onClick={handleLeadPreview} className="mt-6 w-full rounded-xl bg-[#ff6b3d] text-white hover:bg-[#eb5b30]">
                      <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
                      Preview as lead
                    </Button>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-black/10 bg-[#fffdf9] shadow-[0_18px_50px_rgba(16,20,25,0.07)]">
                  <CardContent className="p-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Publication</p>
                    <div className="mt-4 flex items-start gap-3">
                      <span className={isPublished
                        ? "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"
                        : isUnlisted
                          ? "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700"
                          : "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700"}
                      >
                        {isPublished ? <Globe className="h-4 w-4" aria-hidden="true" /> : <BookOpen className="h-4 w-4" aria-hidden="true" />}
                      </span>
                      <div>
                        <h2 className="text-lg font-bold text-[#101419]">{statusLabel}</h2>
                        <p className="mt-1 text-sm leading-5 text-slate-600">{statusDescription}</p>
                      </div>
                    </div>

                    <div className={hasUnsavedChanges
                      ? "mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"
                      : "mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900"}
                      aria-live="polite"
                    >
                      {hasUnsavedChanges
                        ? "You have unsaved changes. Preview reflects the last saved version until you save."
                        : "Everything shown here is saved. Preview reflects the current version."}
                    </div>

                    <div className="mt-5 grid gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleSaveDraft()}
                        disabled={!guideTitle.trim() || workflowPending}
                        className="h-11 rounded-xl border-black/15 bg-white"
                      >
                        {saveIntent === "draft" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="mr-2 h-4 w-4" aria-hidden="true" />}
                        {saveIntent === "draft" ? "Saving draft…" : "Save draft"}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => void handleSaveAndPublish()}
                        disabled={!guideTitle.trim() || workflowPending}
                        className="h-11 rounded-xl bg-[#101419] text-white hover:bg-[#20262d]"
                      >
                        {saveIntent === "publish" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Globe className="mr-2 h-4 w-4" aria-hidden="true" />}
                        {saveIntent === "publish" ? "Saving & publishing…" : "Save & publish"}
                      </Button>
                    </div>
                    <p className="mt-3 text-center text-[11px] leading-4 text-slate-500">Save &amp; publish saves these fields first, then makes that saved version live.</p>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </div>
        </main>
      </div>

      <Dialog open={improveDialogOpen} onOpenChange={handleImproveDialogChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" aria-hidden="true" />
              Improve this Guide with AI
            </DialogTitle>
            <DialogDescription>
              Tell VidMagnet what would make this Guide more valuable for your audience.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>
                  <strong>This replaces the Guide&apos;s generated structure and returns it to Draft.</strong>{" "}
                  Review the new lead experience before publishing again.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="guide-improvement-instructions" className="text-sm font-medium">
                Improvement instructions
              </label>
              <Textarea
                id="guide-improvement-instructions"
                value={improvementInstructions}
                onChange={(event) => setImprovementInstructions(event.target.value)}
                maxLength={MAX_IMPROVEMENT_INSTRUCTIONS}
                minLength={MIN_IMPROVEMENT_INSTRUCTIONS}
                rows={6}
                disabled={regenerateGuideMutation.isPending || regenerateGuideMutation.isSuccess}
                placeholder="Example: Make the drill breakdowns more specific for high-school guards. Add coaching cues, common mistakes, and a four-week workout progression."
                aria-describedby="guide-improvement-help guide-improvement-count"
              />
              <div className="flex items-start justify-between gap-4 text-xs text-muted-foreground">
                <p id="guide-improvement-help">Use at least 10 characters. Be specific about the audience, depth, format, or missing takeaways.</p>
                <p id="guide-improvement-count" className="shrink-0 tabular-nums">
                  {improvementInstructions.length}/{MAX_IMPROVEMENT_INSTRUCTIONS}
                </p>
              </div>
            </div>

            <div aria-live="polite">
              {regenerateGuideMutation.isPending ? (
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Rebuilding the Guide from its source content…
                </div>
              ) : null}
              {regenerateGuideMutation.isError ? (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                  <strong>We couldn&apos;t regenerate this Guide.</strong>{" "}
                  {readableApiError(regenerateGuideMutation.error)}
                </div>
              ) : null}
              {regenerateGuideMutation.isSuccess ? (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <p><strong>Your new draft is ready.</strong> The Guide has been rebuilt from its source and is ready for another lead preview.</p>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleImproveDialogChange(false)}
              disabled={regenerateGuideMutation.isPending}
            >
              {regenerateGuideMutation.isSuccess ? "Done" : "Cancel"}
            </Button>
            {!regenerateGuideMutation.isSuccess ? (
              <Button
                type="button"
                onClick={handleRegenerate}
                disabled={
                  improvementInstructions.trim().length < MIN_IMPROVEMENT_INSTRUCTIONS ||
                  regenerateGuideMutation.isPending
                }
                className="bg-violet-600 text-white hover:bg-violet-700"
              >
                {regenerateGuideMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {regenerateGuideMutation.isPending ? "Improving Guide…" : "Replace with improved draft"}
              </Button>
            ) : (
              <Button type="button" onClick={handleLeadPreview}>
                <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
                Preview new draft
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
