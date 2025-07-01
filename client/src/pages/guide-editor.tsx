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
  Edit3
} from "lucide-react";

interface EditableElement {
  id: string;
  type: 'heading' | 'paragraph' | 'image' | 'video' | 'audio' | 'button' | 'columns' | 'spacing';
  content: any;
  order: number;
}

interface ColumnElement {
  id: string;
  width: 'full' | 'half' | 'third' | 'quarter';
  elements: EditableElement[];
}

export default function GuideEditor() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();
  
  // Extract guide ID from URL (e.g., /guide-editor/123)
  const guideId = location.split('/')[2];
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [draggedFromToolbar, setDraggedFromToolbar] = useState<EditableElement['type'] | null>(null);
  const [dropZoneVisible, setDropZoneVisible] = useState(false);
  const [elements, setElements] = useState<EditableElement[]>([]);
  const [guideTitle, setGuideTitle] = useState("");
  const [guideDescription, setGuideDescription] = useState("");
  
  // Fetch guide data
  const { data: guide, isLoading: guideLoading } = useQuery<Guide>({
    queryKey: [`/api/guides/${guideId}`],
    enabled: !!guideId && isAuthenticated,
    retry: false,
  });

  // Initialize elements from guide content
  useEffect(() => {
    if (guide) {
      setGuideTitle(guide.title || '');
      setGuideDescription(guide.description || '');
      
      const initialElements: EditableElement[] = [];
      let order = 0;
      
      // Convert guide content to editable elements if content exists
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
        // If no content exists, create a basic structure
        initialElements.push({
          id: `title-${Date.now()}`,
          type: 'heading',
          content: { text: guide.title || 'Guide Title', level: 1 },
          order: order++
        });
        
        initialElements.push({
          id: `intro-${Date.now()}`,
          type: 'paragraph',
          content: { text: 'Click to add your introduction...' },
          order: order++
        });
      }
      
      setElements(initialElements);
    }
  }, [guide]);

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

  const handleSave = () => {
    // Convert elements back to guide content format
    const sections: any[] = [];
    let currentSection: any = null;
    
    elements.forEach(element => {
      if (element.type === 'heading') {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: element.content.text,
          content: '',
          type: 'section'
        };
      } else if (element.type === 'paragraph' && currentSection) {
        currentSection.content += element.content.text + '\n\n';
      }
    });
    
    if (currentSection) {
      sections.push(currentSection);
    }

    const content = guide?.content as any;
    const updatedContent = {
      title: guideTitle,
      introduction: elements.find(e => e.id.startsWith('intro-'))?.content.text || '',
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

  const addElement = (type: EditableElement['type']) => {
    const newElement: EditableElement = {
      id: `${type}-${Date.now()}`,
      type,
      content: getDefaultContent(type),
      order: elements.length
    };
    
    setElements([...elements, newElement]);
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

  const updateElement = (id: string, content: any) => {
    setElements(elements.map(el => 
      el.id === id ? { ...el, content } : el
    ));
  };

  const deleteElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
    setIsEditing(null);
  };

  const moveElement = (draggedId: string, targetId: string) => {
    const draggedIndex = elements.findIndex(el => el.id === draggedId);
    const targetIndex = elements.findIndex(el => el.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const newElements = [...elements];
    const [draggedElement] = newElements.splice(draggedIndex, 1);
    newElements.splice(targetIndex, 0, draggedElement);
    
    // Update order
    newElements.forEach((el, index) => {
      el.order = index;
    });
    
    setElements(newElements);
  };

  // Toolbar drag handlers
  const handleToolbarDragStart = (e: DragEvent<HTMLButtonElement>, elementType: EditableElement['type']) => {
    setDraggedFromToolbar(elementType);
    setDropZoneVisible(true);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', elementType);
  };

  const handleToolbarDragEnd = () => {
    setDraggedFromToolbar(null);
    setDropZoneVisible(false);
  };

  // Element drag handlers
  const handleElementDragStart = (e: DragEvent, elementId: string) => {
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

  // Canvas drop handler for new elements from toolbar
  const handleCanvasDrop = (e: DragEvent<HTMLDivElement>, insertIndex?: number) => {
    e.preventDefault();
    
    if (draggedFromToolbar) {
      const newElement: EditableElement = {
        id: `${draggedFromToolbar}-${Date.now()}`,
        type: draggedFromToolbar as EditableElement['type'],
        content: getDefaultContent(draggedFromToolbar as EditableElement['type']),
        order: insertIndex !== undefined ? insertIndex : elements.length
      };
      
      const newElements = [...elements];
      if (insertIndex !== undefined) {
        newElements.splice(insertIndex, 0, newElement);
        newElements.forEach((el, index) => {
          el.order = index;
        });
      } else {
        newElements.push(newElement);
      }
      
      setElements(newElements);
      setDraggedFromToolbar(null);
      setDropZoneVisible(false);
      
      // Auto-edit the new element
      setTimeout(() => setIsEditing(newElement.id), 100);
    }
  };

  // Element drop handler for reordering
  const handleElementDrop = (e: DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedElement && draggedElement !== targetId) {
      moveElement(draggedElement, targetId);
    }
    setDraggedElement(null);
  };

  const renderElement = (element: EditableElement) => {
    const isActive = isEditing === element.id;
    
    return (
      <div
        key={element.id}
        className={`group relative border-2 border-dashed transition-colors ${
          isActive ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-gray-300'
        }`}
        draggable
        onDragStart={(e) => handleDragStart(e, element.id)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, element.id)}
      >
        {/* Element Controls */}
        <div className={`absolute -top-8 left-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'opacity-100' : ''}`}>
          <Badge variant="secondary" className="text-xs px-2 py-0">
            {element.type}
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => setIsEditing(isActive ? null : element.id)}
          >
            <Edit3 className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 cursor-grab"
          >
            <GripVertical className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
            onClick={() => deleteElement(element.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Element Content */}
        <div className="p-4">
          {renderElementContent(element, isActive)}
        </div>
      </div>
    );
  };

  const renderElementContent = (element: EditableElement, isActive: boolean) => {
    switch (element.type) {
      case 'heading':
        if (isActive) {
          return (
            <div className="space-y-2">
              <Input
                value={element.content.text}
                onChange={(e) => updateElement(element.id, { ...element.content, text: e.target.value })}
                className="font-bold text-lg"
                placeholder="Heading text..."
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
          );
        }
        const HeadingTag = `h${element.content.level || 2}` as keyof JSX.IntrinsicElements;
        return (
          <HeadingTag className="font-bold text-lg">
            {element.content.text || 'Heading'}
          </HeadingTag>
        );

      case 'paragraph':
        if (isActive) {
          return (
            <Textarea
              value={element.content.text}
              onChange={(e) => updateElement(element.id, { ...element.content, text: e.target.value })}
              placeholder="Enter paragraph text..."
              rows={4}
            />
          );
        }
        return (
          <p className="whitespace-pre-wrap">
            {element.content.text || 'Click to edit this paragraph...'}
          </p>
        );

      case 'image':
        if (isActive) {
          return (
            <div className="space-y-2">
              <Input
                value={element.content.src}
                onChange={(e) => updateElement(element.id, { ...element.content, src: e.target.value })}
                placeholder="Image URL..."
              />
              <Input
                value={element.content.alt}
                onChange={(e) => updateElement(element.id, { ...element.content, alt: e.target.value })}
                placeholder="Alt text..."
              />
              <Input
                value={element.content.caption}
                onChange={(e) => updateElement(element.id, { ...element.content, caption: e.target.value })}
                placeholder="Caption (optional)..."
              />
            </div>
          );
        }
        return (
          <div className="space-y-2">
            {element.content.src ? (
              <img
                src={element.content.src}
                alt={element.content.alt}
                className="max-w-full h-auto rounded-lg"
              />
            ) : (
              <div className="bg-gray-100 h-48 rounded-lg flex items-center justify-center">
                <Image className="h-12 w-12 text-gray-400" />
              </div>
            )}
            {element.content.caption && (
              <p className="text-sm text-gray-600 italic">{element.content.caption}</p>
            )}
          </div>
        );

      case 'video':
        if (isActive) {
          return (
            <div className="space-y-2">
              <Input
                value={element.content.src}
                onChange={(e) => updateElement(element.id, { ...element.content, src: e.target.value })}
                placeholder="Video URL (YouTube, Vimeo, etc.)..."
              />
              <Input
                value={element.content.title}
                onChange={(e) => updateElement(element.id, { ...element.content, title: e.target.value })}
                placeholder="Video title..."
              />
            </div>
          );
        }
        return (
          <div className="space-y-2">
            {element.content.src ? (
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <Video className="h-12 w-12 text-gray-400" />
                <span className="ml-2 text-gray-600">Video: {element.content.title}</span>
              </div>
            ) : (
              <div className="bg-gray-100 h-48 rounded-lg flex items-center justify-center">
                <Video className="h-12 w-12 text-gray-400" />
              </div>
            )}
          </div>
        );

      case 'button':
        if (isActive) {
          return (
            <div className="space-y-2">
              <Input
                value={element.content.text}
                onChange={(e) => updateElement(element.id, { ...element.content, text: e.target.value })}
                placeholder="Button text..."
              />
              <Input
                value={element.content.url}
                onChange={(e) => updateElement(element.id, { ...element.content, url: e.target.value })}
                placeholder="Button URL..."
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
          );
        }
        return (
          <Button
            variant={element.content.style === 'outline' ? 'outline' : element.content.style === 'secondary' ? 'secondary' : 'default'}
            className="w-auto"
          >
            {element.content.text || 'Button'}
          </Button>
        );

      case 'spacing':
        if (isActive) {
          return (
            <Select
              value={element.content.height || 'medium'}
              onValueChange={(value) => updateElement(element.id, { ...element.content, height: value })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          );
        }
        const height = element.content.height === 'small' ? 'h-4' : element.content.height === 'large' ? 'h-16' : 'h-8';
        return <div className={`${height} bg-gray-50 border-dashed border-2 border-gray-200 rounded`} />;

      default:
        return <div>Unknown element type</div>;
    }
  };

  if (isLoading || guideLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div>Loading guide editor...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div>Please log in to edit guides.</div>
        </div>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div>Guide not found.</div>
        </div>
      </div>
    );
  }

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
          {/* Element Toolbar */}
          <div className="w-64 border-r bg-card p-4 overflow-y-auto">
            <h3 className="font-semibold mb-4">Add Elements</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addElement('heading')}
                className="flex flex-col h-16 cursor-grab active:cursor-grabbing"
                draggable
                onDragStart={(e) => handleToolbarDragStart(e, 'heading')}
                onDragEnd={handleToolbarDragEnd}
              >
                <Type className="h-4 w-4 mb-1" />
                <span className="text-xs">Heading</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addElement('paragraph')}
                className="flex flex-col h-16"
              >
                <AlignLeft className="h-4 w-4 mb-1" />
                <span className="text-xs">Paragraph</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addElement('image')}
                className="flex flex-col h-16"
              >
                <Image className="h-4 w-4 mb-1" />
                <span className="text-xs">Image</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addElement('video')}
                className="flex flex-col h-16"
              >
                <Video className="h-4 w-4 mb-1" />
                <span className="text-xs">Video</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addElement('audio')}
                className="flex flex-col h-16"
              >
                <Music className="h-4 w-4 mb-1" />
                <span className="text-xs">Audio</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addElement('button')}
                className="flex flex-col h-16"
              >
                <MousePointer className="h-4 w-4 mb-1" />
                <span className="text-xs">Button</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addElement('spacing')}
                className="flex flex-col h-16"
              >
                <Minus className="h-4 w-4 mb-1" />
                <span className="text-xs">Spacing</span>
              </Button>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Click elements to edit, drag to reorder, or use the toolbar above to add new elements.
              </p>
            </div>
          </div>

          {/* Editor Canvas */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto space-y-6">
              {elements
                .sort((a, b) => a.order - b.order)
                .map(element => renderElement(element))}
              
              {elements.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <Type className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Start Building Your Guide</h3>
                  <p className="mb-4">Use the sidebar to add elements to your guide.</p>
                  <Button onClick={() => addElement('heading')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Element
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}