import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Settings as SettingsIcon, Book, Upload, Link, FileText, Trash2, Edit3, Plus, Mic, Video, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface KnowledgebaseEntry {
  id: number;
  title: string;
  content: string;
  contentType: string;
  sourceUrl?: string;
  sourceType: string;
  fileType?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface TrainingSettings {
  customInstructions?: string;
  analysisPrompt?: string;
  guideGenerationPrompt?: string;
  personalizationPrompt?: string;
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("training");
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgebaseEntry | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [showTemplates, setShowTemplates] = useState(false);

  // Form states
  const [newEntry, setNewEntry] = useState({
    title: "",
    content: "",
    sourceUrl: "",
    sourceType: "manual" as const,
    contentType: "text" as const,
    tags: [] as string[],
  });

  const [trainingForm, setTrainingForm] = useState<TrainingSettings>({});

  // Template configurations
  const templates = {
    beginner: {
      customInstructions: "Focus on fundamental movements, safety first approach, and clear step-by-step progression. Always emphasize proper form over intensity. Target audience is new to fitness with little to no experience.",
      analysisPrompt: "When analyzing videos, identify basic movements, common beginner mistakes, safety considerations, and simple modifications. Focus on foundational skills and clear explanations.",
      guideGenerationPrompt: "Generate beginner-friendly guides with simple language, safety warnings, progression steps, and modifications for different fitness levels. Include equipment alternatives and emphasize proper form.",
      personalizationPrompt: "Adapt content for beginners by simplifying terminology, adding extra safety notes, providing easier variations, and encouraging gradual progression."
    },
    advanced: {
      customInstructions: "Focus on technical analysis, performance optimization, and advanced training concepts. Target audience has significant experience and training background.",
      analysisPrompt: "Analyze videos for technical details, biomechanics, performance metrics, advanced techniques, and competitive applications. Identify subtle form cues and optimization opportunities.",
      guideGenerationPrompt: "Create detailed technical guides with advanced terminology, performance metrics, periodization concepts, and competition preparation strategies.",
      personalizationPrompt: "Customize for experienced athletes with advanced training variables, periodization schedules, performance tracking, and competitive preparation focus."
    },
    wellness: {
      customInstructions: "Emphasize holistic health, lifestyle integration, sustainable habits, and overall well-being. Focus on long-term health benefits over performance metrics.",
      analysisPrompt: "Look for lifestyle integration opportunities, stress management benefits, mobility improvements, and sustainable practice elements in videos.",
      guideGenerationPrompt: "Generate wellness-focused guides that integrate fitness with daily life, emphasize stress relief, include mindfulness elements, and promote sustainable habits.",
      personalizationPrompt: "Adapt content to support work-life balance, stress management, energy improvement, and sustainable wellness practices tailored to busy lifestyles."
    },
    youth: {
      customInstructions: "Make fitness fun, age-appropriate, and focused on skill development. Emphasize enjoyment, participation, and positive experiences over competition.",
      analysisPrompt: "Identify fun elements, skill-building opportunities, age-appropriate movements, and ways to make activities engaging for young participants.",
      guideGenerationPrompt: "Create fun, engaging guides with games, challenges, skill progressions, and positive reinforcement. Use simple language and include variety.",
      personalizationPrompt: "Adapt content for different age groups, attention spans, skill levels, and developmental stages. Focus on fun, participation, and building confidence."
    }
  };

  const applyTemplate = (templateType: keyof typeof templates) => {
    const template = templates[templateType];
    setTrainingForm({
      ...trainingForm,
      ...template
    });
    
    toast({
      title: "Template Applied",
      description: `${templateType.charAt(0).toUpperCase() + templateType.slice(1)} coaching template has been applied to your settings.`,
    });
    
    setShowTemplates(false);
  };

  // Fetch training settings
  const { data: trainingSettings, isLoading: trainingLoading } = useQuery({
    queryKey: ["/api/training-settings"],
    onSuccess: (data) => {
      setTrainingForm(data || {});
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
      }
    },
  });

  // Fetch knowledgebase entries
  const { data: knowledgebaseEntries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ["/api/knowledgebase"],
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
      }
    },
  });

  // Update training settings mutation
  const updateTrainingMutation = useMutation({
    mutationFn: async (data: TrainingSettings) => {
      return await apiRequest("/api/training-settings", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Training settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/training-settings"] });
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
        description: "Failed to update training settings",
        variant: "destructive",
      });
    },
  });

  // Create knowledgebase entry mutation
  const createEntryMutation = useMutation({
    mutationFn: async (data: typeof newEntry) => {
      return await apiRequest("/api/knowledgebase", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Knowledgebase entry created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledgebase"] });
      setIsAddingEntry(false);
      setNewEntry({
        title: "",
        content: "",
        sourceUrl: "",
        sourceType: "manual",
        contentType: "text",
        tags: [],
      });
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
        description: "Failed to create entry",
        variant: "destructive",
      });
    },
  });

  // Delete knowledgebase entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/knowledgebase/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Entry deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledgebase"] });
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
        description: "Failed to delete entry",
        variant: "destructive",
      });
    },
  });

  // Handle file upload with transcription
  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    
    const uploadId = Math.random().toString(36).substr(2, 9);
    setUploadProgress({ ...uploadProgress, [uploadId]: 0 });

    try {
      // For audio/video files, transcribe them
      if (file.type.startsWith("audio/") || file.type.startsWith("video/")) {
        setUploadProgress({ ...uploadProgress, [uploadId]: 50 });
        
        const transcriptionResponse = await apiRequest("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        const transcription = await transcriptionResponse.text();
        
        setNewEntry({
          ...newEntry,
          title: file.name.replace(/\.[^/.]+$/, ""),
          content: transcription,
          sourceType: "file_upload",
          contentType: "transcription",
          fileType: file.type.startsWith("audio/") ? "audio" : "video",
        });
        
        setUploadProgress({ ...uploadProgress, [uploadId]: 100 });
        
        toast({
          title: "File Processed",
          description: "Audio/video has been transcribed successfully",
        });
      } else {
        // For text files, read content directly
        const text = await file.text();
        setNewEntry({
          ...newEntry,
          title: file.name.replace(/\.[^/.]+$/, ""),
          content: text,
          sourceType: "file_upload",
          contentType: "text",
          fileType: file.type || "text",
        });
        
        setUploadProgress({ ...uploadProgress, [uploadId]: 100 });
        
        toast({
          title: "File Processed",
          description: "Text content extracted successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to process the uploaded file",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        const newProgress = { ...uploadProgress };
        delete newProgress[uploadId];
        setUploadProgress(newProgress);
      }, 2000);
    }
  };

  const handleSaveTraining = () => {
    updateTrainingMutation.mutate(trainingForm);
  };

  const handleCreateEntry = () => {
    if (!newEntry.title.trim() || !newEntry.content.trim()) {
      toast({
        title: "Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }
    createEntryMutation.mutate(newEntry);
  };

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case "transcription":
        return <Mic className="h-4 w-4" />;
      case "link":
        return <Link className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getFileTypeIcon = (fileType?: string) => {
    if (fileType?.startsWith("audio/")) return <Mic className="h-4 w-4" />;
    if (fileType?.startsWith("video/")) return <Video className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-2 mb-8">
        <SettingsIcon className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="training">AI Training</TabsTrigger>
          <TabsTrigger value="knowledgebase">Knowledgebase</TabsTrigger>
        </TabsList>

        <TabsContent value="training">
          <Card>
            <CardHeader>
              <CardTitle>AI Training Instructions</CardTitle>
              <CardDescription>Customize how your AI bot analyzes content videos and generates coaching guidance to match your training philosophy and style.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Template Selection */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Quick Start Templates</Label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowTemplates(!showTemplates)}
                  >
                    {showTemplates ? "Hide Templates" : "Show Templates"}
                  </Button>
                </div>
                
                {showTemplates && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-gray-50">
                    <div className="space-y-2">
                      <h4 className="font-medium">Beginner-Friendly Coach</h4>
                      <p className="text-sm text-gray-600">Focus on fundamentals, safety, and step-by-step progression</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => applyTemplate('beginner')}
                      >
                        Apply Template
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Advanced Performance Coach</h4>
                      <p className="text-sm text-gray-600">Technical analysis, performance optimization, competitive training</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => applyTemplate('advanced')}
                      >
                        Apply Template
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Fitness & Wellness Coach</h4>
                      <p className="text-sm text-gray-600">Holistic approach, lifestyle integration, motivation-focused</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => applyTemplate('wellness')}
                      >
                        Apply Template
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Youth Sports Coach</h4>
                      <p className="text-sm text-gray-600">Fun-focused, skill development, age-appropriate guidance</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => applyTemplate('youth')}
                      >
                        Apply Template
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customInstructions">General Instructions</Label>
                <Textarea
                  id="customInstructions"
                  placeholder="Add general instructions for AI analysis (e.g., focus on specific techniques, target audience, etc.)"
                  value={trainingForm.customInstructions || ""}
                  onChange={(e) => setTrainingForm({ ...trainingForm, customInstructions: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="analysisPrompt">Video Analysis Prompt</Label>
                <Textarea
                  id="analysisPrompt"
                  placeholder="Custom prompt for video analysis (how to identify key techniques, drills, etc.)"
                  value={trainingForm.analysisPrompt || ""}
                  onChange={(e) => setTrainingForm({ ...trainingForm, analysisPrompt: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guideGenerationPrompt">Guide Generation Prompt</Label>
                <Textarea
                  id="guideGenerationPrompt"
                  placeholder="Custom prompt for generating practice guides (structure, tone, style, etc.)"
                  value={trainingForm.guideGenerationPrompt || ""}
                  onChange={(e) => setTrainingForm({ ...trainingForm, guideGenerationPrompt: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="personalizationPrompt">Personalization Prompt</Label>
                <Textarea
                  id="personalizationPrompt"
                  placeholder="Custom prompt for personalizing guides based on user data"
                  value={trainingForm.personalizationPrompt || ""}
                  onChange={(e) => setTrainingForm({ ...trainingForm, personalizationPrompt: e.target.value })}
                  rows={3}
                />
              </div>

              <Button 
                onClick={handleSaveTraining}
                disabled={updateTrainingMutation.isPending}
              >
                {updateTrainingMutation.isPending ? "Saving..." : "Save Training Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knowledgebase">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">AI Training Knowledgebase</h2>
                <p className="text-gray-600">
                  Train your AI bot with your expertise - add workouts, training programs, books, blog posts, and coaching materials to help it provide better guidance to your viewers
                </p>
              </div>
              <Dialog open={isAddingEntry} onOpenChange={setIsAddingEntry}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Training Content for Your AI Bot</DialogTitle>
                    <DialogDescription>
                      Upload workout routines, training programs, coaching philosophy, exercise tutorials, nutrition guides, or any content that will help your AI bot provide better guidance to your viewers
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="entryTitle">Title</Label>
                      <Input
                        id="entryTitle"
                        placeholder="Enter a descriptive title"
                        value={newEntry.title}
                        onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sourceType">Content Source</Label>
                      <Select 
                        value={newEntry.sourceType} 
                        onValueChange={(value: "manual" | "url" | "file_upload") => 
                          setNewEntry({ ...newEntry, sourceType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual Text Entry</SelectItem>
                          <SelectItem value="url">Web Link</SelectItem>
                          <SelectItem value="file_upload">File Upload</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {newEntry.sourceType === "url" && (
                      <div className="space-y-2">
                        <Label htmlFor="sourceUrl">URL</Label>
                        <Input
                          id="sourceUrl"
                          placeholder="https://example.com/article"
                          value={newEntry.sourceUrl}
                          onChange={(e) => setNewEntry({ ...newEntry, sourceUrl: e.target.value })}
                        />
                      </div>
                    )}

                    {newEntry.sourceType === "file_upload" && (
                      <div className="space-y-2">
                        <Label>File Upload</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-600 mb-2">
                            Upload workout videos, training audio, PDFs of programs, or any fitness content
                          </p>
                          <input
                            type="file"
                            accept=".txt,.md,.pdf,audio/*,video/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file);
                            }}
                            className="hidden"
                            id="fileUpload"
                          />
                          <Button asChild variant="outline">
                            <label htmlFor="fileUpload" className="cursor-pointer">
                              Choose File
                            </label>
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="entryContent">Content</Label>
                      <Textarea
                        id="entryContent"
                        placeholder="Add your training content, workout descriptions, coaching tips, or any expertise that will help the AI understand your coaching style..."
                        value={newEntry.content}
                        onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                        rows={8}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={handleCreateEntry}
                        disabled={createEntryMutation.isPending}
                      >
                        {createEntryMutation.isPending ? "Creating..." : "Create Entry"}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsAddingEntry(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {entriesLoading ? (
                <div className="text-center py-8">Loading knowledgebase entries...</div>
              ) : knowledgebaseEntries.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Book className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium mb-2">No training content yet</h3>
                    <p className="text-gray-600 mb-4">
                      Add your workouts, training programs, coaching philosophy, and expertise to train your AI bot to provide better guidance to your viewers
                    </p>
                    <Button onClick={() => setIsAddingEntry(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Entry
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                knowledgebaseEntries.map((entry: KnowledgebaseEntry) => (
                  <Card key={entry.id}>
                    <CardContent className="py-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getContentTypeIcon(entry.contentType)}
                            <h3 className="font-medium">{entry.title}</h3>
                            {entry.fileType && (
                              <Badge variant="outline" className="text-xs">
                                {getFileTypeIcon(entry.fileType)}
                                <span className="ml-1">{entry.fileType}</span>
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {entry.content.substring(0, 150)}...
                          </p>
                          <div className="flex gap-1">
                            {entry.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingEntry(entry)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteEntryMutation.mutate(entry.id)}
                            disabled={deleteEntryMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}