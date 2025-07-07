import { useState, useEffect, DragEvent } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useBranding } from "@/hooks/useBranding";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Type, 
  AlignLeft, 
  Image, 
  Plus, 
  Save, 
  ArrowLeft, 
  GripVertical, 
  Trash2, 
  MousePointer,
  Edit3,
  Settings,
  Layout,
  ChevronLeft,
  ChevronRight,
  Upload,
  Globe,
  EyeOff,
  Star,
  Users,
  CheckCircle,
  Phone,
  Mail,
  FormInput,
  Target,
  Quote,
  Award,
  Calendar
} from "lucide-react";

interface LandingPageElement {
  id: string;
  type: 'headline' | 'subheadline' | 'description' | 'form-field' | 'cta-button' | 'benefit-list' | 'image' | 'video' | 'social-proof' | 'testimonial' | 'countdown' | 'divider' | 'spacing';
  content: any;
  order: number;
  parentId?: string;
}

interface LandingPageData {
  id: number;
  title: string;
  headline: string;
  subheadline?: string;
  description: string;
  collectSms?: boolean;
  smsConsentText?: string;
  customFields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
  }>;
}

export default function LandingPageEditor() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();
  const { logoUrl, companyName, primaryColor, secondaryColor, accentColor } = useBranding();
  
  const customUrl = location.split('/')[2];
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [draggedFromToolbar, setDraggedFromToolbar] = useState<LandingPageElement['type'] | null>(null);
  const [dropZoneVisible, setDropZoneVisible] = useState(false);
  const [elements, setElements] = useState<LandingPageElement[]>([]);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);

  // Fetch landing page data
  const { data: landingPageData, isLoading: landingPageLoading } = useQuery({
    queryKey: [`/api/landing/${customUrl}`],
    enabled: !!customUrl && isAuthenticated,
    retry: false,
  });

  // Initialize elements from landing page data
  useEffect(() => {
    if (landingPageData?.landingPage) {
      const page = landingPageData.landingPage;
      const initialElements: LandingPageElement[] = [];
      let order = 0;
      
      // Create elements from existing landing page structure
      if (page.headline) {
        initialElements.push({
          id: `headline-${Date.now()}`,
          type: 'headline',
          content: { text: page.headline },
          order: order++
        });
      }

      if (page.subheadline) {
        initialElements.push({
          id: `subheadline-${Date.now()}`,
          type: 'subheadline',
          content: { text: page.subheadline },
          order: order++
        });
      }

      if (page.description) {
        initialElements.push({
          id: `description-${Date.now()}`,
          type: 'description',
          content: { text: page.description },
          order: order++
        });
      }

      // Add form fields
      page.customFields?.forEach((field: any) => {
        initialElements.push({
          id: `field-${field.name}-${Date.now()}`,
          type: 'form-field',
          content: {
            label: field.label,
            type: field.type,
            required: field.required,
            placeholder: `Enter your ${field.label.toLowerCase()}`
          },
          order: order++
        });
      });

      // Add CTA button
      initialElements.push({
        id: `cta-${Date.now()}`,
        type: 'cta-button',
        content: { text: 'Get Started Today!', style: 'primary' },
        order: order++
      });
      
      setElements(initialElements);
    }
  }, [landingPageData]);

  // Save landing page mutation
  const saveLandingPageMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const response = await apiRequest(`/api/landing/${customUrl}`, "PUT", updatedData);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Landing Page Saved",
        description: "Your changes have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/landing/${customUrl}`] });
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
        title: "Error",
        description: "Failed to save landing page",
        variant: "destructive",
      });
    },
  });

  // Toolbar elements
  const toolbarElements = [
    { type: 'headline', icon: Type, label: 'Headline' },
    { type: 'subheadline', icon: AlignLeft, label: 'Subheadline' },
    { type: 'description', icon: Type, label: 'Description' },
    { type: 'form-field', icon: FormInput, label: 'Form Field' },
    { type: 'cta-button', icon: Target, label: 'CTA Button' },
    { type: 'benefit-list', icon: CheckCircle, label: 'Benefits' },
    { type: 'image', icon: Image, label: 'Image' },
    { type: 'social-proof', icon: Users, label: 'Social Proof' },
    { type: 'testimonial', icon: Quote, label: 'Testimonial' },
    { type: 'countdown', icon: Calendar, label: 'Countdown' },
    { type: 'divider', icon: Separator, label: 'Divider' },
    { type: 'spacing', icon: Layout, label: 'Spacing' }
  ];

  const addElement = (type: LandingPageElement['type']) => {
    const newElement: LandingPageElement = {
      id: `${type}-${Date.now()}`,
      type,
      content: getDefaultContent(type),
      order: elements.length
    };
    setElements([...elements, newElement]);
  };

  const getDefaultContent = (type: LandingPageElement['type']) => {
    switch (type) {
      case 'headline':
        return { text: 'Your Compelling Headline Here' };
      case 'subheadline':
        return { text: 'Supporting subheadline that explains the value proposition' };
      case 'description':
        return { text: 'Detailed description that explains the benefits and what visitors will get.' };
      case 'form-field':
        return { label: 'Email', type: 'email', required: true, placeholder: 'Enter your email', options: [] };
      case 'cta-button':
        return { text: 'Get Started Now!', style: 'primary' };
      case 'benefit-list':
        return { 
          items: [
            'Benefit #1 - Key advantage',
            'Benefit #2 - Important feature',
            'Benefit #3 - Unique value'
          ]
        };
      case 'image':
        return { src: '', alt: 'Add your image', width: '100%' };
      case 'social-proof':
        return { text: 'Join 10,000+ satisfied customers' };
      case 'testimonial':
        return { 
          quote: 'This product changed my life! Highly recommend it.',
          author: 'John Doe',
          title: 'Happy Customer'
        };
      case 'countdown':
        return { endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() };
      case 'divider':
        return { style: 'solid', color: '#e2e8f0' };
      case 'spacing':
        return { height: 'medium' };
      default:
        return { text: 'New element' };
    }
  };

  const updateElement = (id: string, content: any) => {
    setElements(elements.map(el => el.id === id ? { ...el, content } : el));
  };

  const deleteElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
  };

  const handleDragStart = (e: DragEvent, elementId: string) => {
    setDraggedElement(elementId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleToolbarDragStart = (e: DragEvent, elementType: LandingPageElement['type']) => {
    setDraggedFromToolbar(elementType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDrop = (e: DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (draggedFromToolbar) {
      const newElement: LandingPageElement = {
        id: `${draggedFromToolbar}-${Date.now()}`,
        type: draggedFromToolbar,
        content: getDefaultContent(draggedFromToolbar),
        order: targetIndex
      };
      
      const newElements = [...elements];
      newElements.splice(targetIndex, 0, newElement);
      newElements.forEach((el, index) => el.order = index);
      
      setElements(newElements);
      setDraggedFromToolbar(null);
    } else if (draggedElement) {
      const draggedIndex = elements.findIndex(el => el.id === draggedElement);
      if (draggedIndex !== -1) {
        const newElements = [...elements];
        const [draggedItem] = newElements.splice(draggedIndex, 1);
        newElements.splice(targetIndex, 0, draggedItem);
        newElements.forEach((el, index) => el.order = index);
        setElements(newElements);
      }
      setDraggedElement(null);
    }
    
    setDropZoneVisible(false);
  };

  const renderElement = (element: LandingPageElement) => {
    const isActive = isEditing === element.id;
    
    const handleClick = () => {
      if (isActive) {
        setIsEditing(null);
      } else {
        setIsEditing(element.id);
      }
    };

    switch (element.type) {
      case 'headline':
        return (
          <div key={element.id} className="group relative">
            <div className="flex items-center gap-2 mb-2">
              <GripVertical 
                className="h-4 w-4 text-gray-400 cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
                draggable
                onDragStart={(e) => handleDragStart(e, element.id)}
              />
              <Badge variant="outline" className="text-xs">Headline</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClick}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteElement(element.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            {isActive ? (
              <Input
                value={element.content.text}
                onChange={(e) => updateElement(element.id, { ...element.content, text: e.target.value })}
                className="text-3xl font-bold mb-4"
                placeholder="Enter your headline"
              />
            ) : (
              <h1 
                className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 cursor-pointer hover:bg-gray-50 p-2 rounded"
                onClick={handleClick}
                style={{ color: primaryColor }}
              >
                {element.content.text}
              </h1>
            )}
          </div>
        );

      case 'subheadline':
        return (
          <div key={element.id} className="group relative">
            <div className="flex items-center gap-2 mb-2">
              <GripVertical 
                className="h-4 w-4 text-gray-400 cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
                draggable
                onDragStart={(e) => handleDragStart(e, element.id)}
              />
              <Badge variant="outline" className="text-xs">Subheadline</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClick}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteElement(element.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            {isActive ? (
              <Input
                value={element.content.text}
                onChange={(e) => updateElement(element.id, { ...element.content, text: e.target.value })}
                className="text-xl mb-4"
                placeholder="Enter your subheadline"
              />
            ) : (
              <h2 
                className="text-xl text-gray-700 font-semibold mb-4 cursor-pointer hover:bg-gray-50 p-2 rounded"
                onClick={handleClick}
                style={{ color: secondaryColor }}
              >
                {element.content.text}
              </h2>
            )}
          </div>
        );

      case 'description':
        return (
          <div key={element.id} className="group relative">
            <div className="flex items-center gap-2 mb-2">
              <GripVertical 
                className="h-4 w-4 text-gray-400 cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
                draggable
                onDragStart={(e) => handleDragStart(e, element.id)}
              />
              <Badge variant="outline" className="text-xs">Description</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClick}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteElement(element.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            {isActive ? (
              <Textarea
                value={element.content.text}
                onChange={(e) => updateElement(element.id, { ...element.content, text: e.target.value })}
                className="mb-4"
                rows={4}
                placeholder="Enter your description"
              />
            ) : (
              <p 
                className="text-lg text-gray-600 mb-4 cursor-pointer hover:bg-gray-50 p-2 rounded leading-relaxed"
                onClick={handleClick}
              >
                {element.content.text}
              </p>
            )}
          </div>
        );

      case 'form-field':
        return (
          <div key={element.id} className="group relative">
            <div className="flex items-center gap-2 mb-2">
              <GripVertical 
                className="h-4 w-4 text-gray-400 cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
                draggable
                onDragStart={(e) => handleDragStart(e, element.id)}
              />
              <Badge variant="outline" className="text-xs">Form Field</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClick}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteElement(element.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            {isActive ? (
              <div className="space-y-3 p-4 border rounded">
                <div>
                  <Label>Field Label</Label>
                  <Input
                    value={element.content.label}
                    onChange={(e) => updateElement(element.id, { ...element.content, label: e.target.value })}
                    placeholder="Field label"
                  />
                </div>
                <div>
                  <Label>Placeholder Text</Label>
                  <Input
                    value={element.content.placeholder || ''}
                    onChange={(e) => updateElement(element.id, { ...element.content, placeholder: e.target.value })}
                    placeholder="Enter placeholder text"
                  />
                </div>
                <div>
                  <Label>Field Type</Label>
                  <Select 
                    value={element.content.type} 
                    onValueChange={(value) => updateElement(element.id, { ...element.content, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="tel">Phone</SelectItem>
                      <SelectItem value="select">Dropdown</SelectItem>
                      <SelectItem value="textarea">Text Area</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Dropdown Options */}
                {element.content.type === 'select' && (
                  <div>
                    <Label>Dropdown Options</Label>
                    <div className="space-y-2">
                      {(element.content.options || []).map((option: string, index: number) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(element.content.options || [])];
                              newOptions[index] = e.target.value;
                              updateElement(element.id, { ...element.content, options: newOptions });
                            }}
                            placeholder={`Option ${index + 1}`}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newOptions = (element.content.options || []).filter((_: any, i: number) => i !== index);
                              updateElement(element.id, { ...element.content, options: newOptions });
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newOptions = [...(element.content.options || []), ''];
                          updateElement(element.id, { ...element.content, options: newOptions });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Option
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={element.content.required} 
                    onCheckedChange={(checked) => updateElement(element.id, { ...element.content, required: checked })}
                  />
                  <Label>Required field</Label>
                </div>
              </div>
            ) : (
              <div className="mb-4">
                <Label className="text-sm font-medium">
                  {element.content.label} {element.content.required && <span className="text-red-500">*</span>}
                </Label>
                {element.content.type === 'select' ? (
                  <Select disabled>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={element.content.placeholder || 'Select an option'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(element.content.options || []).map((option: string, index: number) => (
                        <SelectItem key={index} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : element.content.type === 'textarea' ? (
                  <Textarea
                    placeholder={element.content.placeholder}
                    className="mt-1"
                    disabled
                  />
                ) : (
                  <Input
                    type={element.content.type}
                    placeholder={element.content.placeholder}
                    className="mt-1"
                    disabled
                  />
                )}
              </div>
            )}
          </div>
        );

      case 'cta-button':
        return (
          <div key={element.id} className="group relative">
            <div className="flex items-center gap-2 mb-2">
              <GripVertical 
                className="h-4 w-4 text-gray-400 cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
                draggable
                onDragStart={(e) => handleDragStart(e, element.id)}
              />
              <Badge variant="outline" className="text-xs">CTA Button</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClick}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteElement(element.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            {isActive ? (
              <div className="space-y-3 p-4 border rounded">
                <div>
                  <Label>Button Text</Label>
                  <Input
                    value={element.content.text}
                    onChange={(e) => updateElement(element.id, { ...element.content, text: e.target.value })}
                    placeholder="Button text"
                  />
                </div>
                <div>
                  <Label>Button URL</Label>
                  <Input
                    value={element.content.url || ''}
                    onChange={(e) => updateElement(element.id, { ...element.content, url: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <Label>Button Style</Label>
                  <Select 
                    value={element.content.style} 
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
                    <Label>Custom Color</Label>
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
              <Button 
                size="lg" 
                className="w-full mb-4"
                style={{ 
                  backgroundColor: element.content.style === 'primary' ? primaryColor : 
                                 element.content.style === 'secondary' ? secondaryColor : 
                                 element.content.style === 'custom' ? element.content.customColor || '#3b82f6' : 'transparent',
                  borderColor: element.content.style === 'custom' ? element.content.customColor || '#3b82f6' : primaryColor,
                  color: element.content.style === 'custom' ? 'white' : undefined
                }}
                variant={element.content.style === 'outline' ? 'outline' : 'default'}
                onClick={element.content.url ? () => window.open(element.content.url, '_blank') : undefined}
              >
                {element.content.text}
              </Button>
            )}
          </div>
        );

      case 'benefit-list':
        return (
          <div key={element.id} className="group relative">
            <div className="flex items-center gap-2 mb-2">
              <GripVertical 
                className="h-4 w-4 text-gray-400 cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
                draggable
                onDragStart={(e) => handleDragStart(e, element.id)}
              />
              <Badge variant="outline" className="text-xs">Benefits</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClick}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteElement(element.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            {isActive ? (
              <div className="space-y-3 p-4 border rounded">
                {element.content.items.map((item: string, index: number) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => {
                        const newItems = [...element.content.items];
                        newItems[index] = e.target.value;
                        updateElement(element.id, { ...element.content, items: newItems });
                      }}
                      placeholder={`Benefit ${index + 1}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newItems = element.content.items.filter((_: any, i: number) => i !== index);
                        updateElement(element.id, { ...element.content, items: newItems });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newItems = [...element.content.items, 'New benefit'];
                    updateElement(element.id, { ...element.content, items: newItems });
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Benefit
                </Button>
              </div>
            ) : (
              <div className="mb-4 cursor-pointer hover:bg-gray-50 p-2 rounded" onClick={handleClick}>
                {element.content.items.map((item: string, index: number) => (
                  <div key={index} className="flex items-center gap-3 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" style={{ color: accentColor }} />
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'spacing':
        if (isActive) {
          return (
            <div key={element.id} className="group relative">
              <div className="flex items-center gap-2 mb-2">
                <GripVertical 
                  className="h-4 w-4 text-gray-400 cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
                  draggable
                  onDragStart={(e) => handleDragStart(e, element.id)}
                />
                <Badge variant="outline" className="text-xs">Spacing</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteElement(element.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
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
            </div>
          );
        }
        const height = element.content.height === 'small' ? 'h-4' : element.content.height === 'large' ? 'h-16' : 'h-8';
        return (
          <div key={element.id} className="group relative">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 mb-2">
              <GripVertical 
                className="h-4 w-4 text-gray-400 cursor-move"
                draggable
                onDragStart={(e) => handleDragStart(e, element.id)}
              />
              <Badge variant="outline" className="text-xs">Spacing</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClick}
                className="transition-opacity"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteElement(element.id)}
                className="transition-opacity text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div className={`${height} bg-gray-50 border-dashed border-2 border-gray-200 rounded cursor-pointer`} onClick={handleClick} />
          </div>
        );

      default:
        return <div key={element.id}>Unknown element type</div>;
    }
  };

  const handleSave = () => {
    const updatedData = {
      headline: elements.find(el => el.type === 'headline')?.content.text || '',
      subheadline: elements.find(el => el.type === 'subheadline')?.content.text || '',
      description: elements.find(el => el.type === 'description')?.content.text || '',
      customFields: elements
        .filter(el => el.type === 'form-field')
        .map(el => ({
          name: el.content.label.toLowerCase().replace(/\s+/g, '_'),
          label: el.content.label,
          type: el.content.type,
          required: el.content.required,
          placeholder: el.content.placeholder || '',
          options: el.content.options || []
        })),
      elements: elements
    };
    
    saveLandingPageMutation.mutate(updatedData);
  };

  if (isLoading || landingPageLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div>Loading landing page editor...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div>Please log in to edit landing pages.</div>
        </div>
      </div>
    );
  }

  if (!landingPageData) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Landing Page Not Found</h2>
            <p className="text-muted-foreground mb-4">The landing page you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/content-library')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Library
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex">
        {/* Collapsible Toolbar */}
        <div className={`bg-white border-r border-border transition-all duration-300 ${isToolbarCollapsed ? 'w-12' : 'w-80'} flex flex-col`}>
          {/* Toolbar Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              {!isToolbarCollapsed && (
                <div>
                  <h2 className="font-semibold text-foreground">Landing Page Elements</h2>
                  <p className="text-sm text-muted-foreground">Drag to add elements</p>
                </div>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsToolbarCollapsed(!isToolbarCollapsed)}
              >
                {isToolbarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Toolbar Elements */}
          {!isToolbarCollapsed && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {toolbarElements.map((element) => (
                  <Card 
                    key={element.type}
                    className="cursor-move hover:shadow-md transition-shadow"
                    draggable
                    onDragStart={(e) => handleToolbarDragStart(e, element.type as LandingPageElement['type'])}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-3">
                        <element.icon className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium">{element.label}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Save Button */}
          {!isToolbarCollapsed && (
            <div className="p-4 border-t border-border">
              <Button
                onClick={handleSave}
                disabled={saveLandingPageMutation.isPending}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveLandingPageMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>

        {/* Main Editor */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={() => navigate('/content-library')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-xl font-semibold">Edit Landing Page</h1>
                  <p className="text-sm text-muted-foreground">{landingPageData.landingPage.title}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Globe className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saveLandingPageMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveLandingPageMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>

          {/* Editor Canvas */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            <div className="max-w-4xl mx-auto py-8">
              {/* Preview Header */}
              <div className="bg-white shadow-sm px-4 py-4 mb-8">
                <div className="container mx-auto flex justify-between items-center max-w-6xl">
                  <div className="flex items-center">
                    {logoUrl ? (
                      <img 
                        src={logoUrl} 
                        alt="Logo" 
                        className="h-24 w-auto object-contain"
                      />
                    ) : (
                      <div className="text-2xl font-bold text-gray-800">
                        {companyName}
                      </div>
                    )}
                  </div>
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    Get Started Today!
                  </Button>
                </div>
              </div>

              {/* Editable Content */}
              <div className="bg-white rounded-lg shadow-sm p-8 mx-4">
                <div className="text-center mb-8">
                  {elements.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <Layout className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Start Building Your Landing Page</h3>
                      <p className="mb-4">Drag elements from the sidebar to create your landing page.</p>
                      <Button onClick={() => addElement('headline')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Element
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Drop zones and elements */}
                      {elements
                        .sort((a, b) => a.order - b.order)
                        .map((element, index) => (
                          <div key={element.id}>
                            {/* Drop zone before element */}
                            <div 
                              className="h-32 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 opacity-0 hover:opacity-100 transition-opacity mb-4"
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => handleDrop(e, index)}
                            >
                              Drop Zone
                            </div>
                            
                            {/* Element */}
                            {renderElement(element)}
                          </div>
                        ))}
                      
                      {/* Final drop zone */}
                      <div 
                        className="h-32 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 opacity-0 hover:opacity-100 transition-opacity"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, elements.length)}
                      >
                        Drop Zone
                      </div>
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