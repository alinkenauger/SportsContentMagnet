import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/sidebar";
import ProcessingModal from "@/components/processing-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Youtube, FileText, Settings, Zap, Info, Mic, Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function CreateGuide() {
  const { toast } = useToast();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [inputMethod, setInputMethod] = useState<"youtube" | "manual">("youtube");
  const [manualTranscript, setManualTranscript] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [customSettings, setCustomSettings] = useState({
    category: "",
    customInstructions: "",
    targetAudience: "",
    difficulty: "",
    collectSms: false,
    smsConsentText: "I consent to receive text messages from this business. Message and data rates may apply. Reply STOP to opt out.",
    leadTags: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingSteps, setProcessingSteps] = useState([
    { id: "metadata", title: "Extracting video metadata", status: "pending" as const },
    { id: "transcript", title: "Transcribing video content", status: "pending" as const },
    { id: "analysis", title: "Analyzing coaching insights with AI", status: "pending" as const },
    { id: "guide", title: "Generating personalized practice guide", status: "pending" as const },
    { id: "landing", title: "Creating landing page", status: "pending" as const },
  ]);
  const [currentStep, setCurrentStep] = useState("");
  const [progress, setProgress] = useState(0);

  const handleCreateGuide = async () => {
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
        description: "Please enter both video title and transcript",
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

      // Actually create the guide
      const requestData = inputMethod === "youtube" ? {
        youtubeUrl,
        ...customSettings
      } : {
        manualTranscript: manualTranscript,
        manualTitle: manualTitle,
        inputMethod: "manual",
        ...customSettings
      };
      
      const response = await apiRequest("POST", "/api/guides", requestData);
      
      const result = await response.json();
      
      toast({
        title: "Success!",
        description: `Guide "${result.guide.title}" created successfully!`,
      });
      
      // Reset form
      setYoutubeUrl("");
      setCustomSettings({
        category: "",
        customInstructions: "",
        targetAudience: "",
        difficulty: "",
        collectSms: false,
        smsConsentText: "I consent to receive text messages from this business. Message and data rates may apply. Reply STOP to opt out.",
        leadTags: "",
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
                  <span>Step 1: Video Source</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Input Method</Label>
                  <Select value={inputMethod} onValueChange={(value: "youtube" | "manual") => setInputMethod(value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube URL (may have transcription issues)</SelectItem>
                      <SelectItem value="manual">Manual Transcript Upload</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {inputMethod === "youtube" ? (
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
                      ⚠️ Note: Most modern YouTube videos are protected by anti-bot measures and cannot be transcribed automatically.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="manual-title">Video Title</Label>
                      <Input
                        id="manual-title"
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        placeholder="Enter the title of your video..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="manual-transcript">Video Transcript</Label>
                      <Textarea
                        id="manual-transcript"
                        value={manualTranscript}
                        onChange={(e) => setManualTranscript(e.target.value)}
                        placeholder="Paste the transcript of your video here..."
                        className="mt-1"
                        rows={8}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        💡 Tip: You can get transcripts from YouTube manually by clicking the transcript button below the video.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Customization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-primary" />
                  <span>Step 2: Customization (Optional)</span>
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
                  <Label htmlFor="custom-instructions">Custom Instructions</Label>
                  <Textarea
                    id="custom-instructions"
                    value={customSettings.customInstructions}
                    onChange={(e) => setCustomSettings(prev => ({ ...prev, customInstructions: e.target.value }))}
                    placeholder="Any specific instructions for the AI to focus on..."
                    className="mt-1"
                    rows={3}
                  />
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
              </CardContent>
            </Card>

            {/* Step 3: Generate */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-accent" />
                  <span>Step 3: Generate Guide</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">
                    Ready to create your practice guide? Our AI will analyze your video and extract valuable coaching insights.
                  </p>
                  <Button 
                    onClick={handleCreateGuide}
                    disabled={isProcessing || !youtubeUrl.trim()}
                    size="lg"
                    className="gradient-primary text-white"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    {isProcessing ? "Processing..." : "Generate Practice Guide"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Alternative Methods */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-blue-800">
                  <Info className="w-5 h-5" />
                  <span>Video Won't Work? Try These Alternatives</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-blue-700">
                  <div className="flex items-start space-x-3">
                    <Mic className="w-5 h-5 mt-0.5" />
                    <div>
                      <p className="font-medium">Audio Upload (Recommended)</p>
                      <p className="text-sm">Download your video's audio and upload it for perfect AI transcription</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <FileText className="w-5 h-5 mt-0.5" />
                    <div>
                      <p className="font-medium">Manual Transcript</p>
                      <p className="text-sm">Copy/paste any transcript or notes you have from your content</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Upload className="w-5 h-5 mt-0.5" />
                    <div>
                      <p className="font-medium">Multiple Formats</p>
                      <p className="text-sm">Upload PDFs, documents, or any other content for analysis</p>
                    </div>
                  </div>
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
    </div>
  );
}
