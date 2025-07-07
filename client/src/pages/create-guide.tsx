import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBrands } from "@/hooks/useBrands";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import ProcessingModal from "@/components/processing-modal";
import { PromptTemplatePicker, type PromptTemplate } from "@/components/prompt-template-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, Youtube, FileText, Settings, Zap, Info, Mic, Upload, X, Link, Radio, File } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function CreateGuide() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { brands } = useBrands();
  
  // Check if user has a current brand set (not using default account)
  const currentBrand = brands.find(brand => brand.isDefault) || null;
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [inputMethod, setInputMethod] = useState<"youtube" | "manual" | "pdf" | "audio" | "link" | "stream">("youtube");
  const [manualTranscript, setManualTranscript] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [contentTitle, setContentTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("full_report");
  const [showCustomTemplate, setShowCustomTemplate] = useState(false);
  const [customTemplate, setCustomTemplate] = useState({
    name: "",
    description: "",
    analysisPrompt: "",
    guidePrompt: "",
    personalizationPrompt: ""
  });
  const [customSettings, setCustomSettings] = useState({
    category: "",
    customInstructions: "",
    targetAudience: "",
    difficulty: "",
    collectSms: false,
    smsConsentText: "I consent to receive text messages from this business. Message and data rates may apply. Reply STOP to opt out.",
    leadTags: "",
    addToKnowledgeBase: true, // Default to true - automatically include in knowledge base
  });
  type ProcessingStatus = "pending" | "processing" | "completed";
  type ProcessingStep = { id: string; title: string; status: ProcessingStatus };
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    { id: "metadata", title: "Extracting video metadata", status: "pending" },
    { id: "transcript", title: "Transcribing video content", status: "pending" },
    { id: "analysis", title: "Analyzing coaching insights with AI", status: "pending" },
    { id: "guide", title: "Generating personalized practice guide", status: "pending" },
    { id: "landing", title: "Creating landing page", status: "pending" },
  ]);
  const [currentStep, setCurrentStep] = useState("");
  const [progress, setProgress] = useState(0);

  // Validation function for all input methods
  const isValidInput = () => {
    switch (inputMethod) {
      case "youtube":
        return youtubeUrl.trim().length > 0;
      case "manual":
        return manualTitle.trim().length > 0 && manualTranscript.trim().length > 0;
      case "pdf":
      case "audio":
        return uploadedFile !== null;
      case "link":
      case "stream":
        return contentUrl.trim().length > 0;
      default:
        return false;
    }
  };

  const handleCreateGuide = async () => {
    // Comprehensive validation for all input methods
    if (inputMethod === "youtube" && !youtubeUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a YouTube URL",
        variant: "destructive",
      });
      return;
    }

    if (inputMethod === "manual" && (!manualTitle.trim() || !manualTranscript.trim())) {
      toast({
        title: "Error",
        description: "Please enter both content title and transcript",
        variant: "destructive",
      });
      return;
    }

    if (inputMethod === "pdf" && !uploadedFile) {
      toast({
        title: "Error",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    if (inputMethod === "audio" && !uploadedFile) {
      toast({
        title: "Error",
        description: "Please upload an audio file",
        variant: "destructive",
      });
      return;
    }

    if (inputMethod === "link" && !contentUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a web page URL",
        variant: "destructive",
      });
      return;
    }

    if (inputMethod === "stream" && !contentUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a streaming URL",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setCurrentStep("metadata");

    // Simulate processing steps with realistic timing
    const stepTimings = [
      { step: "metadata", duration: 1500, progress: 20 },
      { step: "transcript", duration: 3000, progress: 40 },
      { step: "analysis", duration: 4000, progress: 70 },
      { step: "guide", duration: 2500, progress: 90 },
      { step: "landing", duration: 1000, progress: 100 },
    ];

    try {
      for (const { step, duration, progress: stepProgress } of stepTimings) {
        setCurrentStep(step);
        setProcessingSteps(prev => 
          prev.map(s => 
            s.id === step ? { ...s, status: "processing" } : s
          )
        );
        
        await new Promise(resolve => setTimeout(resolve, duration));
        
        setProgress(stepProgress);
        setProcessingSteps(prev => 
          prev.map(s => 
            s.id === step ? { ...s, status: "completed" } : s
          )
        );
      }

      // Actually create the guide - handle different input methods
      let response;
      
      if (inputMethod === "pdf" || inputMethod === "audio") {
        // Use FormData for file uploads
        const formData = new FormData();
        formData.append('inputMethod', inputMethod);
        formData.append('selectedTemplate', selectedTemplate);
        if (uploadedFile) {
          formData.append('file', uploadedFile);
        }
        if (contentTitle) {
          formData.append('title', contentTitle);
        }
        
        // Add custom settings to FormData
        Object.entries(customSettings).forEach(([key, value]) => {
          formData.append(key, value.toString());
        });
        
        response = await fetch('/api/guides', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } else {
        // Use JSON for YouTube, manual, link, and stream methods
        const requestData: any = {
          inputMethod,
          selectedTemplate,
          ...customSettings
        };
        
        if (inputMethod === "youtube") {
          requestData.youtubeUrl = youtubeUrl;
        } else if (inputMethod === "manual") {
          requestData.manualTranscript = manualTranscript;
          requestData.manualTitle = manualTitle;
        } else if (inputMethod === "link") {
          requestData.contentUrl = contentUrl;
          requestData.title = contentTitle || "Web Content";
        } else if (inputMethod === "stream") {
          requestData.contentUrl = contentUrl;
          requestData.title = contentTitle || "Stream Content";
        }
        
        response = await apiRequest("/api/guides", "POST", requestData);
      }
      
      const result = await response.json();
      
      toast({
        title: "Success!",
        description: `Guide "${result.guide.title}" created successfully!`,
      });
      
      // Reset form
      setYoutubeUrl("");
      setManualTranscript("");
      setManualTitle("");
      setContentUrl("");
      setUploadedFile(null);
      setContentTitle("");
      setCustomSettings({
        category: "",
        customInstructions: "",
        targetAudience: "",
        difficulty: "",
        collectSms: false,
        smsConsentText: "I consent to receive text messages from this business. Message and data rates may apply. Reply STOP to opt out.",
        leadTags: "",
        addToKnowledgeBase: true,
      });
      
    } catch (error) {
      if (isUnauthorizedError(error as Error)) {
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
        description: "Failed to create guide. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingSteps(prev => prev.map(s => ({ ...s, status: "pending" })));
      setProgress(0);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Create New Guide</h2>
              <p className="text-muted-foreground mt-1">
                Transform your YouTube video into a high-converting lead magnet
              </p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Step 1: Video Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Youtube className="w-5 h-5 text-red-500" />
                  <span>Step 1: Content Source</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Content Source</Label>
                  <Select value={inputMethod} onValueChange={(value: "youtube" | "manual" | "pdf" | "audio" | "link" | "stream") => setInputMethod(value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="youtube">
                        <div className="flex items-center space-x-2">
                          <Youtube className="w-4 h-4 text-red-500" />
                          <span>YouTube Video</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="pdf">
                        <div className="flex items-center space-x-2">
                          <File className="w-4 h-4 text-red-500" />
                          <span>PDF Document</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="audio">
                        <div className="flex items-center space-x-2">
                          <Mic className="w-4 h-4 text-green-500" />
                          <span>Audio File</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="link">
                        <div className="flex items-center space-x-2">
                          <Link className="w-4 h-4 text-blue-500" />
                          <span>Web Page</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="stream">
                        <div className="flex items-center space-x-2">
                          <Radio className="w-4 h-4 text-purple-500" />
                          <span>Streaming Link</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="manual">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <span>Manual Transcript</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Render appropriate input fields based on selected method */}
                {inputMethod === "youtube" && (
                  <div>
                    <Label htmlFor="youtube-url">YouTube URL</Label>
                    <Input
                      id="youtube-url"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="mt-1"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      ✅ We'll extract the audio and transcribe it automatically using advanced AI
                    </p>
                  </div>
                )}

                {inputMethod === "pdf" && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="pdf-upload">Upload PDF Document</Label>
                      <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                        <input
                          type="file"
                          id="pdf-upload"
                          accept=".pdf"
                          onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center space-y-2">
                          <File className="w-8 h-8 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {uploadedFile ? uploadedFile.name : "Click to upload PDF or drag and drop"}
                          </span>
                          <span className="text-xs text-gray-500">Supports PDF files up to 100MB</span>
                        </label>
                      </div>
                    </div>
                    {uploadedFile && (
                      <div>
                        <Label htmlFor="content-title">Document Title (Optional)</Label>
                        <Input
                          id="content-title"
                          value={contentTitle}
                          onChange={(e) => setContentTitle(e.target.value)}
                          placeholder="Enter a title for this document..."
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>
                )}

                {inputMethod === "audio" && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="audio-upload">Upload Audio File</Label>
                      <div className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                        <input
                          type="file"
                          id="audio-upload"
                          accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
                          onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                        <label htmlFor="audio-upload" className="cursor-pointer flex flex-col items-center space-y-2">
                          <Mic className="w-8 h-8 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {uploadedFile ? uploadedFile.name : "Click to upload audio or drag and drop"}
                          </span>
                          <span className="text-xs text-gray-500">Supports MP3, WAV, M4A, AAC, OGG files up to 100MB</span>
                        </label>
                      </div>
                    </div>
                    {uploadedFile && (
                      <div>
                        <Label htmlFor="content-title">Audio Title</Label>
                        <Input
                          id="content-title"
                          value={contentTitle}
                          onChange={(e) => setContentTitle(e.target.value)}
                          placeholder="Enter a title for this audio..."
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>
                )}

                {inputMethod === "link" && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="web-url">Web Page URL</Label>
                      <Input
                        id="web-url"
                        value={contentUrl}
                        onChange={(e) => setContentUrl(e.target.value)}
                        placeholder="https://example.com/article..."
                        className="mt-1"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        We'll extract and analyze the text content from this web page
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="content-title">Page Title (Optional)</Label>
                      <Input
                        id="content-title"
                        value={contentTitle}
                        onChange={(e) => setContentTitle(e.target.value)}
                        placeholder="Enter a title for this content..."
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}

                {inputMethod === "stream" && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="stream-url">Streaming Link URL</Label>
                      <Input
                        id="stream-url"
                        value={contentUrl}
                        onChange={(e) => setContentUrl(e.target.value)}
                        placeholder="https://example.com/stream.m3u8 or https://twitch.tv/..."
                        className="mt-1"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Supports live streams, recorded streams, and video streaming platforms
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="content-title">Stream Title</Label>
                      <Input
                        id="content-title"
                        value={contentTitle}
                        onChange={(e) => setContentTitle(e.target.value)}
                        placeholder="Enter a title for this stream..."
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}

                {inputMethod === "manual" && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="manual-title">Content Title</Label>
                      <Input
                        id="manual-title"
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        placeholder="Enter the title of your content..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="manual-transcript">Content Transcript</Label>
                      <Textarea
                        id="manual-transcript"
                        value={manualTranscript}
                        onChange={(e) => setManualTranscript(e.target.value)}
                        placeholder="Paste the transcript or text content here..."
                        className="mt-1"
                        rows={8}
                      />
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex">
                        <Info className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-blue-800">💡 Tip</h4>
                          <p className="text-xs text-blue-700 mt-1">
                            You can get transcripts from YouTube manually by clicking the transcript button below the video.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Choose Guide Template */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <span>Step 2: Choose Guide Template</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Select how you want your guide structured and analyzed. Each template focuses on different aspects and creates content tailored for specific use cases.
                </p>
              </CardHeader>
              <CardContent>
                <PromptTemplatePicker
                  selectedTemplate={selectedTemplate}
                  onTemplateSelect={(template: PromptTemplate) => setSelectedTemplate(template.id)}
                  onCustomTemplate={() => setShowCustomTemplate(true)}
                  compact={true}
                />
              </CardContent>
            </Card>

            {/* Step 3: Customization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-primary" />
                  <span>Step 3: Customization (Optional)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={customSettings.category} 
                      onValueChange={(value) => setCustomSettings(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basketball">Basketball</SelectItem>
                        <SelectItem value="soccer">Soccer</SelectItem>
                        <SelectItem value="tennis">Tennis</SelectItem>
                        <SelectItem value="football">Football</SelectItem>
                        <SelectItem value="fitness">Fitness</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="difficulty">Difficulty Level</Label>
                    <Select 
                      value={customSettings.difficulty} 
                      onValueChange={(value) => setCustomSettings(prev => ({ ...prev, difficulty: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="all">All Levels</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="target-audience">Target Audience</Label>
                  <Input
                    id="target-audience"
                    value={customSettings.targetAudience}
                    onChange={(e) => setCustomSettings(prev => ({ ...prev, targetAudience: e.target.value }))}
                    placeholder="e.g., Youth basketball players, Fitness enthusiasts"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="focus-area">What Should the Guide Focus On? (Optional)</Label>
                  <Select 
                    value={customSettings.customInstructions} 
                    onValueChange={(value) => setCustomSettings(prev => ({ ...prev, customInstructions: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose what to emphasize (or leave blank for balanced guide)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="balanced">Balanced - Cover everything equally</SelectItem>
                      <SelectItem value="Focus on technique and form correction">Technique & Form - Perfect the fundamentals</SelectItem>
                      <SelectItem value="Focus on drills and practice exercises">Drills & Practice - Actionable training exercises</SelectItem>
                      <SelectItem value="Focus on strategy and mental game">Strategy & Mental Game - Tactical thinking</SelectItem>
                      <SelectItem value="Focus on common mistakes and how to fix them">Common Mistakes - Problem solving approach</SelectItem>
                      <SelectItem value="Focus on conditioning and fitness elements">Conditioning & Fitness - Physical preparation</SelectItem>
                      <SelectItem value="Focus on beginner-friendly explanations">Beginner-Friendly - Simple, clear explanations</SelectItem>
                      <SelectItem value="Focus on advanced techniques and concepts">Advanced Techniques - Expert-level insights</SelectItem>
                      <SelectItem value="Focus on equipment and setup recommendations">Equipment & Setup - Gear and environment</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 This helps the AI know what aspects of your video to emphasize in the practice guide. If unsure, leave it blank for a balanced approach.
                  </p>
                </div>

                {/* SMS Collection Settings */}
                <div className="border-t pt-6">
                  <h4 className="font-semibold mb-4 flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>SMS Collection (Optional)</span>
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="collectSms"
                        checked={customSettings.collectSms}
                        onChange={(e) => setCustomSettings(prev => ({ ...prev, collectSms: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <Label htmlFor="collectSms" className="text-sm font-medium">
                        Collect phone numbers on landing page
                      </Label>
                    </div>
                    
                    {customSettings.collectSms && (
                      <div>
                        <Label htmlFor="sms-consent-text">SMS Consent Text</Label>
                        <Textarea
                          id="sms-consent-text"
                          value={customSettings.smsConsentText}
                          onChange={(e) => setCustomSettings(prev => ({ ...prev, smsConsentText: e.target.value }))}
                          placeholder="Legal consent text for SMS collection..."
                          className="mt-1"
                          rows={2}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          This text protects you legally when collecting phone numbers. Users must check this consent to submit their phone number.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lead Tagging Settings */}
                <div className="border-t pt-6">
                  <h4 className="font-semibold mb-4 flex items-center space-x-2">
                    <Zap className="w-4 h-4" />
                    <span>Lead Tagging (Optional)</span>
                  </h4>
                  
                  <div>
                    <Label htmlFor="lead-tags">Lead Tags</Label>
                    <Input
                      id="lead-tags"
                      value={customSettings.leadTags}
                      onChange={(e) => setCustomSettings(prev => ({ ...prev, leadTags: e.target.value }))}
                      placeholder="e.g., fitness-enthusiast, basketball-player, beginner"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Add comma-separated tags that will be applied to all leads captured from this guide. Perfect for email platform integrations and Zapier automation.
                    </p>
                  </div>
                </div>

                {/* Knowledge Base Settings - Only show for brand accounts */}
                {currentBrand && (
                  <div className="border-t pt-6">
                    <h4 className="font-semibold mb-4 flex items-center space-x-2">
                      <FileText className="w-4 h-4" />
                      <span>Brand Knowledge Base Training</span>
                    </h4>
                    
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="addToKnowledgeBase"
                          checked={customSettings.addToKnowledgeBase}
                          onChange={(e) => setCustomSettings(prev => ({ ...prev, addToKnowledgeBase: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <Label htmlFor="addToKnowledgeBase" className="text-sm font-medium">
                          Add transcription to {currentBrand.name} knowledge base
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        When enabled, the content transcription will be automatically added to your brand's knowledge base to improve future AI responses. Uncheck for one-off guides you don't want stored long-term.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 4: Generate */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-accent" />
                  <span>Step 4: Generate Guide</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">
                    Ready to create your practice guide? Our AI will analyze your video and extract valuable coaching insights.
                  </p>
                  <Button 
                    onClick={handleCreateGuide}
                    disabled={isProcessing || !isValidInput()}
                    size="lg"
                    className="gradient-primary text-white"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    {isProcessing ? "Processing..." : "Generate Practice Guide"}
                  </Button>
                </div>
              </CardContent>
            </Card>



            {/* How It Works */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-secondary" />
                  <span>How It Works</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
                    <div>
                      <p className="font-medium">Content Analysis</p>
                      <p className="text-sm text-muted-foreground">We extract and transcribe your content using advanced AI</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
                    <div>
                      <p className="font-medium">AI Content Extraction</p>
                      <p className="text-sm text-muted-foreground">Our AI identifies key coaching tips, drills, and techniques</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
                    <div>
                      <p className="font-medium">Guide Generation</p>
                      <p className="text-sm text-muted-foreground">We create a branded practice guide with actionable steps</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">4</div>
                    <div>
                      <p className="font-medium">Landing Page Creation</p>
                      <p className="text-sm text-muted-foreground">We generate a beautiful landing page to capture leads</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Processing Modal */}
      <ProcessingModal
        isOpen={isProcessing}
        steps={processingSteps}
        currentStep={currentStep}
        progress={progress}
      />

      {/* Custom Template Dialog */}
      <Dialog open={showCustomTemplate} onOpenChange={setShowCustomTemplate}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>Create Custom Template</span>
            </DialogTitle>
            <DialogDescription>
              Advanced users can create custom templates with specific AI prompts. This requires understanding of AI prompt engineering.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex">
                <Info className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-amber-800">For Advanced Users Only</h4>
                  <p className="text-xs text-amber-700 mt-1">
                    Custom templates require knowledge of AI prompt engineering. For most users, we recommend using the pre-built templates which are optimized for best results.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={customTemplate.name}
                  onChange={(e) => setCustomTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Advanced Basketball Drills"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  value={customTemplate.description}
                  onChange={(e) => setCustomTemplate(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this template focuses on..."
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="analysis-prompt">Analysis Prompt</Label>
                <Textarea
                  id="analysis-prompt"
                  value={customTemplate.analysisPrompt}
                  onChange={(e) => setCustomTemplate(prev => ({ ...prev, analysisPrompt: e.target.value }))}
                  placeholder="Instructions for how AI should analyze the video content..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="guide-prompt">Guide Generation Prompt</Label>
                <Textarea
                  id="guide-prompt"
                  value={customTemplate.guidePrompt}
                  onChange={(e) => setCustomTemplate(prev => ({ ...prev, guidePrompt: e.target.value }))}
                  placeholder="Instructions for how AI should structure the practice guide..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="personalization-prompt">Personalization Prompt</Label>
                <Textarea
                  id="personalization-prompt"
                  value={customTemplate.personalizationPrompt}
                  onChange={(e) => setCustomTemplate(prev => ({ ...prev, personalizationPrompt: e.target.value }))}
                  placeholder="Instructions for how AI should personalize content for different audiences..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                onClick={() => {
                  // Use the custom template
                  setSelectedTemplate("custom");
                  setShowCustomTemplate(false);
                  toast({
                    title: "Custom Template Created",
                    description: "Your custom template is now selected and ready to use.",
                  });
                }}
                disabled={!customTemplate.name || !customTemplate.analysisPrompt || !customTemplate.guidePrompt}
                className="flex-1"
              >
                Use This Template
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCustomTemplate(false);
                  setCustomTemplate({
                    name: "",
                    description: "",
                    analysisPrompt: "",
                    guidePrompt: "",
                    personalizationPrompt: ""
                  });
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
