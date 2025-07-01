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
  Layout
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

  // Fetch guide data
  const { data: guide, isLoading: guideLoading } = useQuery<Guide>({
    queryKey: [`/api/guides/${guideId}`],
    enabled: !!guideId && isAuthenticated,
    retry: false,
  });

  // Save guide mutation
  const saveGuideMutation = useMutation({
    mutationFn: async (updatedGuide: Partial<Guide>) => {
      const response = await apiRequest("PUT", `/api/guides/${guideId}`, updatedGuide);
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

  const addElement = (type: EditableElement['type'], columnId?: string, parentId?: string) => {
    const newElement: EditableElement = {
      id: `${type}-${Date.now()}`,
      type,
      content: getDefaultContent(type),
      order: elements.length,
      ...(columnId && { columnId }),
      ...(parentId && { parentId })
    };
    
    setElements([...elements, newElement]);
    
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
    
    if (draggedFromToolbar) {
      addElement(draggedFromToolbar, columnId, parentId);
      setDraggedFromToolbar(null);
      setDropZoneVisible(false);
      setDragOverColumn(null);
    } else if (draggedElement) {
      moveElement(draggedElement, insertIndex, columnId, parentId);
      setDraggedElement(null);
    }
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
    
    // Update element properties
    movedElement.columnId = columnId;
    movedElement.parentId = parentId;
    
    if (insertIndex !== undefined) {
      newElements.splice(insertIndex, 0, movedElement);
    } else {
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
    setElements(elements.filter(el => el.id !== id && el.parentId !== id));
    setIsEditing(null);
  };

  const renderElement = (element: EditableElement): JSX.Element => {
    const isActive = isEditing === element.id;
    const isDragging = draggedElement === element.id;
    
    return (
      <div
        key={element.id}
        className={`group relative border-2 border-dashed transition-colors ${
          isActive 
            ? 'border-primary bg-primary/5' 
            : 'border-transparent hover:border-muted-foreground/30'
        } ${isDragging ? 'opacity-50' : ''} rounded-lg p-2`}
        draggable={!isActive}
        onDragStart={(e) => !isActive && handleElementDragStart(e, element.id)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleCanvasDrop(e, undefined, element.columnId, element.parentId)}
      >
        {/* Element Controls */}
        <div className={`absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'opacity-100' : ''}`}>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 bg-background border cursor-grab"
          >
            <GripVertical className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(isActive ? null : element.id)}
            className="h-6 w-6 p-0 bg-background border"
          >
            <Edit3 className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => deleteElement(element.id)}
            className="h-6 w-6 p-0 bg-background border text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {renderElementContent(element, isActive)}
      </div>
    );
  };

  const renderElementContent = (element: EditableElement, isActive: boolean): JSX.Element => {
    switch (element.type) {
      case 'heading':
        const HeadingTag = `h${element.content.level || 2}` as keyof JSX.IntrinsicElements;
        return isActive ? (
          <div className="space-y-2">
            <Input
              value={element.content.text}
              onChange={(e) => updateElement(element.id, { ...element.content, text: e.target.value })}
              className="font-semibold text-lg"
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
            className="font-semibold cursor-pointer"
            onClick={() => setIsEditing(element.id)}
          >
            {element.content.text}
          </HeadingTag>
        );

      case 'paragraph':
        return isActive ? (
          <Textarea
            value={element.content.text}
            onChange={(e) => updateElement(element.id, { ...element.content, text: e.target.value })}
            className="min-h-20"
            autoFocus
          />
        ) : (
          <p 
            className="cursor-pointer"
            onClick={() => setIsEditing(element.id)}
          >
            {element.content.text}
          </p>
        );

      case 'columns':
        return (
          <div className="space-y-4">
            {isActive && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded">
                <span className="text-sm font-medium">Columns:</span>
                <Badge variant="outline">{element.content.columns?.length || 2}</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addColumnToElement(element.id)}
                  disabled={(element.content.columns?.length || 0) >= 4}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Column
                </Button>
              </div>
            )}
            
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${element.content.columns?.length || 2}, 1fr)` }}>
              {element.content.columns?.map((column: ColumnData, index: number) => (
                <div
                  key={column.id}
                  className={`min-h-32 border-2 border-dashed rounded-lg p-4 transition-colors ${
                    dragOverColumn === column.id 
                      ? 'border-primary bg-primary/10' 
                      : 'border-muted-foreground/30'
                  } ${dropZoneVisible ? 'border-muted-foreground/50' : ''}`}
                  onDragOver={(e) => handleColumnDragOver(e, column.id)}
                  onDragLeave={handleColumnDragLeave}
                  onDrop={(e) => handleCanvasDrop(e, undefined, column.id, element.id)}
                >
                  {isActive && (
                    <div className="mb-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Column {index + 1}</span>
                        <span className="text-xs text-muted-foreground">{column.width}%</span>
                      </div>
                      <Slider
                        value={[column.width]}
                        onValueChange={([value]) => updateColumnWidth(element.id, column.id, value)}
                        max={80}
                        min={20}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    {elements
                      .filter(el => el.columnId === column.id && el.parentId === element.id)
                      .sort((a, b) => a.order - b.order)
                      .map(el => renderElement(el))}
                    
                    {elements.filter(el => el.columnId === column.id && el.parentId === element.id).length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        <Layout className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Drop elements here</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
          {/* Enhanced Element Toolbar */}
          <div className="w-64 border-r bg-card p-4 overflow-y-auto">
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

          {/* Enhanced Editor Canvas */}
          <div 
            className={`flex-1 overflow-y-auto p-8 ${dropZoneVisible ? 'bg-primary/5' : ''}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleCanvasDrop(e)}
          >
            <div className="max-w-4xl mx-auto space-y-6">
              {elements
                .filter(el => !el.parentId) // Only show top-level elements
                .sort((a, b) => a.order - b.order)
                .map(element => renderElement(element))}
              
              {elements.filter(el => !el.parentId).length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <Type className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Start Building Your Guide</h3>
                  <p className="mb-4">Drag elements from the sidebar to begin creating your guide.</p>
                  <Button onClick={() => addElement('heading')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Element
                  </Button>
                </div>
              )}

              {/* Drop zone indicator */}
              {dropZoneVisible && (
                <div className="border-2 border-dashed border-primary rounded-lg p-8 text-center bg-primary/10">
                  <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">Drop element here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}