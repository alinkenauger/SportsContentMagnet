import { useState } from "react";
import { useLocation } from "wouter";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, Youtube, FileText, Settings, Zap, Info, LibraryBig } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

function guideCreationErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "Failed to create the guide. Please try again.";
  const payload = error.message.replace(/^\d+:\s*/, "");
  try {
    const parsed = JSON.parse(payload) as { message?: string; issues?: Array<{ message?: string }> };
    const issue = parsed.issues?.find((candidate) => candidate.message)?.message;
    return [parsed.message, issue].filter(Boolean).join(" ") || error.message;
  } catch {
    return error.message || "Failed to create the guide. Please try again.";
  }
}

const GUIDE_CREATION_OVERVIEW = [
  {
    title: "Prepare the source",
    description: "We retrieve the YouTube transcript or read the transcript you pasted.",
  },
  {
    title: "Find the coaching value",
    description: "AI identifies the strongest drills, takeaways, best practices, and common mistakes.",
  },
  {
    title: "Build the branded guide",
    description: "VidMagnet creates a useful resource with actions, checks, tools, and a clear next step.",
  },
  {
    title: "Open it for review",
    description: "You land in the editor to refine the guide and lead page before publishing.",
  },
] as const;

export default function CreateGuide() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { brands } = useBrands();
  
  // Brand knowledge belongs to the currently selected workspace, not merely
  // whichever brand was created as the user's default.
  const currentBrand = typeof user?.currentBrandId === "number"
    ? brands.find((brand) => brand.id === user.currentBrandId) || null
    : null;
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [inputMethod, setInputMethod] = useState<"youtube" | "manual">("youtube");
  const [manualTranscript, setManualTranscript] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("full_report");
  const [presentationPreset, setPresentationPreset] = useState("auto");
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
    focus: "",
    desiredOutcome: "",
    availableTime: "",
    customInstructions: "",
    targetAudience: "",
    difficulty: "",
    collectSms: false,
    smsConsentText: "I consent to receive text messages from this business. Message and data rates may apply. Reply STOP to opt out.",
    leadTags: "",
    includeInLibrary: true,
    addToKnowledgeBase: true, // Default to true - automatically include in knowledge base
  });
  type ProcessingStatus = "pending" | "processing" | "completed";
  type ProcessingStep = { id: string; title: string; status: ProcessingStatus };

  const [isProcessing, setIsProcessing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const processingSteps: ProcessingStep[] = [
    {
      id: "source",
      title: inputMethod === "youtube" ? "Prepare the YouTube transcript" : "Read the pasted transcript",
      status: "pending",
    },
    { id: "analysis", title: "Analyze drills, takeaways, and coaching insights", status: "pending" },
    { id: "guide", title: "Build the branded practice guide", status: "pending" },
    { id: "landing", title: "Prepare the lead page and editor", status: "pending" },
  ];

  // Validation function for all input methods
  const isValidInput = () => {
    return inputMethod === "youtube"
      ? youtubeUrl.trim().length > 0
      : manualTitle.trim().length > 0 && manualTranscript.trim().length > 0;
  };

  const handleCreateGuide = async () => {
    setFormError(null);

    if (inputMethod === "youtube" && !youtubeUrl.trim()) {
      const message = "Paste the YouTube video URL you want to turn into a guide.";
      setFormError(message);
      toast({
        title: "YouTube URL required",
        description: message,
        variant: "destructive",
      });
      return;
    }

    if (inputMethod === "manual" && (!manualTitle.trim() || !manualTranscript.trim())) {
      const message = "Add both a title and the transcript before generating the guide.";
      setFormError(message);
      toast({
        title: "Transcript details required",
        description: message,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const authoredTemplateInstructions = selectedTemplate === "custom"
        ? [
            customTemplate.name ? `Custom output: ${customTemplate.name}` : "",
            customTemplate.description,
            customTemplate.analysisPrompt ? `Analyze for: ${customTemplate.analysisPrompt}` : "",
            customTemplate.guidePrompt ? `Build the output this way: ${customTemplate.guidePrompt}` : "",
            customTemplate.personalizationPrompt ? `Adapt it this way: ${customTemplate.personalizationPrompt}` : "",
          ].filter(Boolean).join("\n")
        : "";
      const effectiveCustomInstructions = [customSettings.customInstructions, authoredTemplateInstructions]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 2000);

      const requestData = {
        inputMethod,
        selectedTemplate,
        ...customSettings,
        customInstructions: effectiveCustomInstructions,
        presentationPreset,
        ...(inputMethod === "youtube"
          ? { youtubeUrl: youtubeUrl.trim() }
          : { transcript: manualTranscript.trim(), title: manualTitle.trim() }),
      };
      const response = await apiRequest("/api/guides", "POST", requestData);
      const result = await response.json() as { guide?: { id?: number; title?: string } };

      if (!result.guide?.id) {
        throw new Error("The guide was created, but the editor link was missing. Please try again.");
      }
      
      toast({
        title: "Guide ready to review",
        description: `${result.guide.title || "Your guide"} is ready in the editor.`,
      });
      navigate(`/guide-editor/${result.guide.id}?new=1`);
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

      const message = guideCreationErrorMessage(error);
      setFormError(message);
      toast({
        title: "The guide needs another pass",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Create New Guide</h2>
              <p className="text-muted-foreground mt-1">
                Turn one source into an implementation-ready lead magnet.
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
                <div
                  className="grid gap-3 sm:grid-cols-2"
                  role="group"
                  aria-label="Choose a content source"
                >
                  <button
                    type="button"
                    aria-pressed={inputMethod === "youtube"}
                    onClick={() => setInputMethod("youtube")}
                    className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      inputMethod === "youtube"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 font-semibold">
                        <Youtube className="h-5 w-5 text-red-500" aria-hidden="true" />
                        YouTube video
                      </span>
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                        Recommended
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      Paste a public or unlisted link. VidMagnet will retrieve the source and transcript.
                    </p>
                  </button>

                  <button
                    type="button"
                    aria-pressed={inputMethod === "manual"}
                    onClick={() => setInputMethod("manual")}
                    className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      inputMethod === "manual"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      <FileText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                      Paste transcript
                    </span>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      Use this fallback when a video has no accessible transcript or your source is already written.
                    </p>
                  </button>
                </div>

                {inputMethod === "youtube" && (
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <Label htmlFor="youtube-url">YouTube video URL</Label>
                    <Input
                      id="youtube-url"
                      type="url"
                      inputMode="url"
                      autoComplete="url"
                      value={youtubeUrl}
                      onChange={(event) => setYoutubeUrl(event.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="mt-2 bg-background"
                    />
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      Best for guides with clickable timestamps that replay key drills inside the guide.
                    </p>
                  </div>
                )}

                {inputMethod === "manual" && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="manual-title">Source title</Label>
                      <Input
                        id="manual-title"
                        value={manualTitle}
                        onChange={(event) => setManualTitle(event.target.value)}
                        placeholder="e.g., ILB Elite Mid-Range Mastery"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="manual-transcript">Transcript or source text</Label>
                      <Textarea
                        id="manual-transcript"
                        value={manualTranscript}
                        onChange={(event) => setManualTranscript(event.target.value)}
                        placeholder="Paste the complete transcript or source text here..."
                        className="mt-1"
                        rows={10}
                      />
                    </div>
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                      <div className="flex gap-2">
                        <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" aria-hidden="true" />
                        <div>
                          <h4 className="text-sm font-medium text-blue-800">Transcript fallback</h4>
                          <p className="mt-1 text-xs leading-5 text-blue-700">
                            In YouTube, open the video description and choose “Show transcript,” then paste the complete text here.
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
                        <SelectItem value="golf">Golf</SelectItem>
                        <SelectItem value="soccer">Soccer</SelectItem>
                        <SelectItem value="tennis">Tennis</SelectItem>
                        <SelectItem value="football">Football</SelectItem>
                        <SelectItem value="fitness">Fitness</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="presentation-style">Recipient experience</Label>
                    <Select value={presentationPreset} onValueChange={setPresentationPreset}>
                      <SelectTrigger id="presentation-style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-detect from the content</SelectItem>
                        <SelectItem value="basketball">Basketball · Arena energy</SelectItem>
                        <SelectItem value="golf">Golf · Course precision</SelectItem>
                        <SelectItem value="performance">Performance · Training lab</SelectItem>
                        <SelectItem value="editorial">Editorial · Clean report</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Your brand stays intact; this changes the output's composition and visual cues.
                    </p>
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

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="desired-outcome">What Should They Be Able to Do?</Label>
                    <Input
                      id="desired-outcome"
                      value={customSettings.desiredOutcome}
                      onChange={(e) => setCustomSettings(prev => ({ ...prev, desiredOutcome: e.target.value }))}
                      placeholder="e.g., Build a repeatable weekly content plan"
                      className="mt-1"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      A concrete finish line produces a stronger quick win, toolkit, and action plan.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="available-time">Time They Have Available</Label>
                    <Select
                      value={customSettings.availableTime}
                      onValueChange={(value) => setCustomSettings(prev => ({ ...prev, availableTime: value }))}
                    >
                      <SelectTrigger id="available-time" className="mt-1">
                        <SelectValue placeholder="Choose a realistic time budget" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5 minutes">5 minutes</SelectItem>
                        <SelectItem value="15 minutes">15 minutes</SelectItem>
                        <SelectItem value="30 minutes">30 minutes</SelectItem>
                        <SelectItem value="60 minutes">60 minutes</SelectItem>
                        <SelectItem value="One week">One week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="focus-area">What Should the Guide Focus On? (Optional)</Label>
                  <Select 
                    value={customSettings.focus}
                    onValueChange={(value) => setCustomSettings(prev => ({ ...prev, focus: value }))}
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
                    This helps the AI decide what to turn into steps, checklists, worksheets, scorecards, and examples. If unsure, leave it blank for a balanced approach.
                  </p>
                </div>

                <div>
                  <Label htmlFor="custom-instructions">What Would Make This Especially Valuable? (Optional)</Label>
                  <Textarea
                    id="custom-instructions"
                    value={customSettings.customInstructions}
                    onChange={(e) => setCustomSettings(prev => ({ ...prev, customInstructions: e.target.value }))}
                    placeholder="e.g., Include our three-step framework, a client-facing script, a scorecard, and examples for small agencies. Avoid jargon."
                    className="mt-1"
                    rows={3}
                    maxLength={2000}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ask for the concrete tools, examples, vocabulary, and boundaries that make this feel like your expertise.
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

                <div className="border-t pt-6">
                  <h4 className="mb-4 flex items-center space-x-2 font-semibold">
                    <LibraryBig className="h-4 w-4" aria-hidden="true" />
                    <span>Recipient Library</span>
                  </h4>
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="includeInLibrary"
                        checked={customSettings.includeInLibrary}
                        onChange={(event) => setCustomSettings((previous) => ({
                          ...previous,
                          includeInLibrary: event.target.checked,
                        }))}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <Label htmlFor="includeInLibrary" className="text-sm font-medium">
                          Add this guide to your public Library
                        </Label>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Checked by default. Once published, leads can discover it from the Library button on your guides. Uncheck it for a one-off or direct-link-only resource.
                        </p>
                      </div>
                    </div>
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
                    Ready to create your lead magnet? VidMagnet will turn the source into a structured resource your audience can put to work.
                  </p>
                  {formError && (
                    <Alert variant="destructive" className="text-left" role="alert">
                      <AlertTitle>Guide generation stopped</AlertTitle>
                      <AlertDescription>
                        {formError} Your source and settings are still here, so you can correct the issue and try again.
                      </AlertDescription>
                    </Alert>
                  )}
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
                  {GUIDE_CREATION_OVERVIEW.map((item, index) => (
                    <div key={item.title} className="flex items-start gap-3">
                      <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  ))}
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
                  placeholder="Instructions for the outcome, structure, exercises, templates, or tools this resource should include..."
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
