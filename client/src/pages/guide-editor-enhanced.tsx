import { useState, useEffect, DragEvent } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Guide } from "@shared/schema";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
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
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface EditableElement {
  id: string;
  type: 'heading' | 'paragraph' | 'image' | 'video' | 'audio' | 'button' | 'columns' | 'spacing';
  content: any;
  order: number;
  parentId?: string;
  columnId?: string;
}

interface ColumnData {
  id: string;
  width: number;
  elements: EditableElement[];
}

export default function GuideEditorEnhanced() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();
  
  const guideId = location.split('/')[2];
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [draggedFromToolbar, setDraggedFromToolbar] = useState<EditableElement['type'] | null>(null);
  const [dropZoneVisible, setDropZoneVisible] = useState(false);
  const [elements, setElements] = useState<EditableElement[]>([]);
  const [guideTitle, setGuideTitle] = useState("");
  const [guideDescription, setGuideDescription] = useState("");
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);

  // Fetch guide data
  const { data: guide, isLoading: guideLoading } = useQuery<Guide>({
    queryKey: [`/api/guides/${guideId}`],
    enabled: !!guideId && isAuthenticated,
    retry: false,
  });

  // Save guide mutation
  const saveGuideMutation = useMutation({
    mutationFn: async (updatedGuide: Partial<Guide>) => {
      const response = await apiRequest(`/api/guides/${guideId}`, "PUT", updatedGuide);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Guide Saved",
        description: "Your changes have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/guides"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Save Failed",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Initialize elements from guide content
  useEffect(() => {
    if (guide) {
      setGuideTitle(guide.title || '');
      setGuideDescription(guide.description || '');
      
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
              order: order++
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
        <Sidebar />
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
        <Sidebar />
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
        <Sidebar />
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

  const handleSave = () => {
    const sections: any[] = [];
    let currentSection: any = null;
    
    elements.forEach(element => {
      if (element.type === 'heading' && !element.parentId) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: element.content.text,
          content: '',
          type: 'section'
        };
      } else if (element.type === 'paragraph' && currentSection && !element.parentId) {
        currentSection.content += element.content.text + '\n\n';
      }
    });
    
    if (currentSection) {
      sections.push(currentSection);
    }

    const content = guide?.content as any;
    const updatedContent = {
      title: guideTitle,
      introduction: elements.find(e => e.id.startsWith('intro-') && !e.parentId)?.content.text || '',
      sections,
      conclusion: content?.conclusion || '',
      callToAction: content?.callToAction || ''
    };

    saveGuideMutation.mutate({
      title: guideTitle,
      description: guideDescription,
      content: updatedContent
    });
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
      addElement(draggedFromToolbar, columnId, parentId, targetIndex);
      setDraggedFromToolbar(null);
      setDropZoneVisible(false);
      setDragOverColumn(null);
      setDragOverIndex(null);
    } else if (draggedElement) {
      moveElement(draggedElement, targetIndex, columnId, parentId);
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
            <HeadingTag 
              className={`font-bold text-slate-800 cursor-pointer mb-6 ${
                element.content.level === 1 ? 'text-3xl md:text-4xl' : 
                element.content.level === 2 ? 'text-2xl md:text-3xl' : 
                element.content.level === 3 ? 'text-xl md:text-2xl' : 
                'text-lg md:text-xl'
              }`}
              onClick={() => setIsEditing(element.id)}
            >
              {element.content.text || 'Click to edit heading'}
            </HeadingTag>
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
                  
                  {/* Draggable Separator */}
                  {index < totalColumns - 1 && (
                    <div
                      className="relative flex items-center justify-center w-2 bg-muted/50 hover:bg-primary/20 cursor-col-resize group transition-colors"
                      onMouseDown={(e) => handleColumnResizeStart(e, element.id, column.id, index)}
                    >
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="w-1 h-8 bg-muted-foreground/30 group-hover:bg-primary/60 rounded-full transition-colors"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-background border-2 border-muted-foreground/40 group-hover:border-primary rounded-full transition-colors"></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'image':
        return isActive ? (
          <div className="space-y-2">
            <Input
              placeholder="Image URL"
              value={element.content.src || ''}
              onChange={(e) => updateElement(element.id, { ...element.content, src: e.target.value })}
            />
            <Input
              placeholder="Alt text"
              value={element.content.alt || ''}
              onChange={(e) => updateElement(element.id, { ...element.content, alt: e.target.value })}
            />
            <Input
              placeholder="Caption (optional)"
              value={element.content.caption || ''}
              onChange={(e) => updateElement(element.id, { ...element.content, caption: e.target.value })}
            />
          </div>
        ) : element.content.src ? (
          <div className="text-center">
            <img
              src={element.content.src}
              alt={element.content.alt || 'Guide image'}
              className="max-w-full h-auto rounded-lg mx-auto cursor-pointer"
              onClick={() => setIsEditing(element.id)}
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
          >
            <Image className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm font-medium">Click to add image</p>
            <p className="text-xs text-muted-foreground">Enter image URL and details</p>
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
          <div className="space-y-2">
            <Input
              placeholder="Button text"
              value={element.content.text || ''}
              onChange={(e) => updateElement(element.id, { ...element.content, text: e.target.value })}
            />
            <Input
              placeholder="Button URL"
              value={element.content.url || ''}
              onChange={(e) => updateElement(element.id, { ...element.content, url: e.target.value })}
            />
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
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="text-center">
            <Button
              variant={element.content.style === 'primary' ? 'default' : element.content.style === 'secondary' ? 'secondary' : 'outline'}
              onClick={() => setIsEditing(element.id)}
              className="cursor-pointer"
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

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b bg-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/content-library')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Library
            </Button>
            <div className="flex flex-col">
              <Input
                value={guideTitle}
                onChange={(e) => setGuideTitle(e.target.value)}
                className="font-semibold text-lg border-none p-0 h-auto bg-transparent"
                placeholder="Guide Title"
              />
              <Input
                value={guideDescription}
                onChange={(e) => setGuideDescription(e.target.value)}
                className="text-sm text-muted-foreground border-none p-0 h-auto bg-transparent"
                placeholder="Guide description..."
              />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saveGuideMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveGuideMutation.isPending ? 'Saving...' : 'Save Guide'}
          </Button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Enhanced Element Toolbar - Accordion Style */}
          <div className={`${isToolbarCollapsed ? 'w-12' : 'w-64'} border-r bg-card overflow-y-auto transition-all duration-300 ease-in-out relative`}>
            {/* Toggle Button */}
            <div className="absolute top-4 -right-3 z-10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsToolbarCollapsed(!isToolbarCollapsed)}
                className="h-6 w-6 p-0 rounded-full bg-background border shadow-sm hover:shadow-md transition-shadow"
              >
                {isToolbarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
              </Button>
            </div>

            {isToolbarCollapsed ? (
              /* Collapsed State - Icon Only */
              <div className="p-2 space-y-2">
                {[
                  { type: 'heading', icon: Type, label: 'Heading' },
                  { type: 'paragraph', icon: AlignLeft, label: 'Text' },
                  { type: 'image', icon: Image, label: 'Image' },
                  { type: 'video', icon: Video, label: 'Video' },
                  { type: 'audio', icon: Music, label: 'Audio' },
                  { type: 'columns', icon: Columns, label: 'Columns' },
                  { type: 'button', icon: MousePointer, label: 'Button' },
                  { type: 'spacing', icon: Minus, label: 'Spacing' },
                ].map(({ type, icon: Icon, label }) => (
                  <Button
                    key={type}
                    variant="outline"
                    size="sm"
                    onClick={() => addElement(type as EditableElement['type'])}
                    className="w-8 h-8 p-0 cursor-grab active:cursor-grabbing"
                    draggable
                    onDragStart={(e) => handleToolbarDragStart(e, type as EditableElement['type'])}
                    onDragEnd={handleToolbarDragEnd}
                    title={label}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            ) : (
              /* Expanded State - Full Toolbar */
              <div className="p-4">
                <h3 className="font-semibold mb-4">Add Elements</h3>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-4">
                    Drag elements onto the canvas or into columns
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { type: 'heading', icon: Type, label: 'Heading' },
                      { type: 'paragraph', icon: AlignLeft, label: 'Text' },
                      { type: 'image', icon: Image, label: 'Image' },
                      { type: 'video', icon: Video, label: 'Video' },
                      { type: 'audio', icon: Music, label: 'Audio' },
                      { type: 'columns', icon: Columns, label: 'Columns' },
                      { type: 'button', icon: MousePointer, label: 'Button' },
                      { type: 'spacing', icon: Minus, label: 'Spacing' },
                    ].map(({ type, icon: Icon, label }) => (
                      <Button
                        key={type}
                        variant="outline"
                        size="sm"
                        onClick={() => addElement(type as EditableElement['type'])}
                        className="flex flex-col h-16 cursor-grab active:cursor-grabbing"
                        draggable
                        onDragStart={(e) => handleToolbarDragStart(e, type as EditableElement['type'])}
                        onDragEnd={handleToolbarDragEnd}
                      >
                        <Icon className="h-4 w-4 mb-1" />
                        <span className="text-xs">{label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    • Click elements to edit inline
                  </p>
                  <p className="text-xs text-muted-foreground">
                    • Drag elements to reorder
                  </p>
                  <p className="text-xs text-muted-foreground">
                    • Drop into columns for layouts
                  </p>
                  <p className="text-xs text-muted-foreground">
                    • Adjust column widths when selected
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Editor Canvas - Match Guide View Design */}
          <div 
            className={`flex-1 overflow-y-auto bg-slate-50 ${dropZoneVisible ? 'bg-primary/5' : ''}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleCanvasDrop(e)}
            onDragLeave={handleElementDragLeave}
          >
            {/* Guide-Style Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-6">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-bold text-slate-800">Practice Guide Editor</h1>
                    <p className="text-sm text-slate-600">Create your professional training guide</p>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    Preview Mode
                  </Badge>
                </div>
              </div>
            </div>

            {/* Main Guide Content Area */}
            <div className="px-8 py-8">
              <div className="max-w-4xl mx-auto">
                {/* Guide Content Card - Matches guide-view.tsx exactly */}
                <div className="bg-white rounded-xl shadow-sm p-8 space-y-2">
              {elements.filter(el => !el.parentId).length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <Type className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2 text-slate-700">Start Building Your Guide</h3>
                  <p className="mb-4">Drag elements from the sidebar to begin creating your guide.</p>
                  <Button onClick={() => addElement('heading')} className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Element
                  </Button>
                </div>
              ) : (
                <>
                  {/* Drag Instructions */}
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-800">
                      <GripVertical className="h-4 w-4" />
                      <span className="text-sm font-medium">Drag & Drop Guide</span>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">
                      • Hover over elements to see drag handles
                      • Drag elements to reorder them
                      • Click the edit icon to modify content
                      • Drop zones appear between elements
                    </p>
                  </div>

                  {/* Drop zone at top */}
                  <div
                    className={`transition-all duration-200 ${
                      dragOverIndex === 0 
                        ? 'h-16 border-2 border-dashed border-primary bg-primary/10 rounded-lg flex items-center justify-center' 
                        : 'h-2'
                    }`}
                    onDragOver={(e) => handleElementDragOver(e, 0)}
                    onDrop={(e) => handleCanvasDrop(e, 0)}
                  >
                    {dragOverIndex === 0 && (
                      <div className="flex items-center gap-2 text-primary font-medium">
                        <Plus className="h-4 w-4" />
                        <span>Drop Element Here</span>
                      </div>
                    )}
                  </div>
                  
                  {elements
                    .filter(el => !el.parentId)
                    .sort((a, b) => a.order - b.order)
                    .map((element, index) => (
                      <div key={element.id}>
                        {renderElement(element)}
                        
                        {/* Drop zone between elements */}
                        <div
                          className={`transition-all duration-200 ${
                            dragOverIndex === index + 1 
                              ? 'h-16 border-2 border-dashed border-primary bg-primary/10 rounded-lg flex items-center justify-center' 
                              : 'h-2'
                          }`}
                          onDragOver={(e) => handleElementDragOver(e, index + 1)}
                          onDrop={(e) => handleCanvasDrop(e, index + 1)}
                        >
                          {dragOverIndex === index + 1 && (
                            <div className="flex items-center gap-2 text-primary font-medium">
                              <Plus className="h-4 w-4" />
                              <span>Drop Element Here</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </>
              )}

              {/* Global drop zone indicator */}
              {dropZoneVisible && dragOverIndex === null && (
                <div className="border-2 border-dashed border-primary rounded-lg p-8 text-center bg-primary/10 mt-6">
                  <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">Drop element here</p>
                </div>
              )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}