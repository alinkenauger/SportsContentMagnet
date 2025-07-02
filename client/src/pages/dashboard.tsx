import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";
import Sidebar from "@/components/sidebar";
import StatsCard from "@/components/stats-card";
import GuideCard from "@/components/guide-card";
import ProcessingModal from "@/components/processing-modal";
import GoogleAuthButton from "@/components/google-auth-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Book, Users, TrendingUp, ExternalLink, Plus, Sparkles, Palette, Eye, Edit, BarChart3, Bell, Check, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface DashboardStats {
  totalGuides: number;
  totalLeads: number;
  totalViews: number;
  totalDownloads: number;
  avgConversionRate: number;
}

export default function Dashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputMethod, setInputMethod] = useState<"youtube" | "manual" | "pdf" | "audio" | "streaming">("youtube");
  const [manualTitle, setManualTitle] = useState("");
  const [manualTranscript, setManualTranscript] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [streamingUrl, setStreamingUrl] = useState("");
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [columnWidths, setColumnWidths] = useState([35, 20, 15, 15, 15]);
  const [showNotifications, setShowNotifications] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Mock notifications data
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "New lead captured",
      message: "Someone downloaded your 'Basketball Shooting Form' guide",
      time: "2 minutes ago",
      read: false,
      type: "lead"
    },
    {
      id: 2,
      title: "Guide performance update",
      message: "Your 'Soccer Training Drills' guide reached 100 views",
      time: "1 hour ago",
      read: false,
      type: "milestone"
    },
    {
      id: 3,
      title: "Monthly summary ready",
      message: "Your performance report for this month is ready to view",
      time: "3 hours ago",
      read: true,
      type: "report"
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Function to mark notification as read (removes it from the list)
  const markAsRead = (notificationId: number) => {
    setNotifications(prev => 
      prev.filter(notification => notification.id !== notificationId)
    );
  };

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showNotifications]);

  const [processingSteps, setProcessingSteps] = useState([
    { id: "metadata", title: "Video metadata extracted", status: "pending" as const },
    { id: "transcript", title: "Content transcribed", status: "pending" as const },
    { id: "analysis", title: "Analyzing coaching insights...", status: "pending" as const },
    { id: "guide", title: "Generating practice guide", status: "pending" as const },
  ]);
  const [currentStep, setCurrentStep] = useState("");
  const [progress, setProgress] = useState(0);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats", user?.currentBrandId],
    enabled: isAuthenticated,
  });

  const { data: guides, isLoading: guidesLoading, refetch: refetchGuides } = useQuery({
    queryKey: ["/api/guides"],
    enabled: isAuthenticated,
  });

  // Column resize functionality
  const handleMouseDown = (columnIndex: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidths = [...columnWidths];

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const tableWidth = tableRef.current?.offsetWidth || 800;
      const deltaPercent = (deltaX / tableWidth) * 100;
      
      const newWidths = [...startWidths];
      newWidths[columnIndex] = Math.max(10, startWidths[columnIndex] + deltaPercent);
      newWidths[columnIndex + 1] = Math.max(10, startWidths[columnIndex + 1] - deltaPercent);
      
      setColumnWidths(newWidths);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleCreateGuide = async () => {
    // Validate input based on method
    if (inputMethod === "youtube" && !youtubeUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a YouTube URL",
        variant: "destructive",
      });
      return;
    }
    
    if ((inputMethod === "manual" || inputMethod === "pdf" || inputMethod === "audio" || inputMethod === "streaming") && !manualTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title",
        variant: "destructive",
      });
      return;
    }
    
    if (inputMethod === "manual" && !manualTranscript.trim()) {
      toast({
        title: "Error",
        description: "Please enter transcript content",
        variant: "destructive",
      });
      return;
    }
    
    if ((inputMethod === "pdf" || inputMethod === "audio") && !uploadedFile) {
      toast({
        title: "Error",
        description: `Please upload a ${inputMethod.toUpperCase()} file`,
        variant: "destructive",
      });
      return;
    }
    
    if (inputMethod === "streaming" && !streamingUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a streaming URL",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    if (inputMethod === "pdf" || inputMethod === "audio") {
      setIsProcessingFile(true);
    }
    setProgress(0);
    setCurrentStep("metadata");

    // Simulate processing steps
    const stepTimings = [
      { step: "metadata", duration: 1000, progress: 25 },
      { step: "transcript", duration: 2000, progress: 50 },
      { step: "analysis", duration: 3000, progress: 75 },
      { step: "guide", duration: 2000, progress: 100 },
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

      // Prepare request based on input method
      if (inputMethod === "pdf" || inputMethod === "audio") {
        // Use FormData for file uploads
        const formData = new FormData();
        formData.append('inputMethod', inputMethod);
        formData.append('title', manualTitle);
        if (uploadedFile) {
          formData.append('file', uploadedFile);
        }
        
        const response = await fetch('/api/guides', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } else {
        // Use JSON for other input methods
        const requestData: any = {
          inputMethod,
          title: inputMethod === "youtube" ? youtubeUrl : manualTitle,
        };
        
        if (inputMethod === "youtube") {
          requestData.youtubeUrl = youtubeUrl;
        } else if (inputMethod === "manual") {
          requestData.transcript = manualTranscript;
        } else if (inputMethod === "streaming") {
          requestData.streamingUrl = streamingUrl;
        }
        
        await apiRequest("POST", "/api/guides", requestData);
      }
      
      toast({
        title: "Success",
        description: "Guide created successfully!",
      });
      
      // Reset form
      setYoutubeUrl("");
      setManualTitle("");
      setManualTranscript("");
      setUploadedFile(null);
      setStreamingUrl("");
      refetchGuides();
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
      
      const errorMessage = (error as Error).message;
      
      if (errorMessage.includes("TRANSCRIPTION_BLOCKED")) {
        toast({
          title: "Video Transcription Blocked",
          description: "YouTube blocks automatic transcription for most modern videos. Try older educational videos or contact support for manual options.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create guide. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsProcessing(false);
      setIsProcessingFile(false);
      setProcessingSteps(prev => prev.map(s => ({ ...s, status: "pending" })));
      setProgress(0);
    }
  };

  // Drag and drop handlers for manual transcripts
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file) {
      // Auto-fill title with filename if empty
      if (!manualTitle) {
        setManualTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
      
      if (file.type === 'text/plain') {
        // Handle text files
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          if (content) {
            setManualTranscript(content);
            setInputMethod("manual");
          }
        };
        reader.readAsText(file);
      } else if (file.type === 'application/pdf') {
        // Handle PDF files
        setUploadedFile(file);
        setInputMethod("pdf");
      } else if (file.type.startsWith('audio/')) {
        // Handle audio files
        setUploadedFile(file);
        setInputMethod("audio");
      } else {
        toast({
          title: "Unsupported file type",
          description: "Please upload a .txt, .pdf, or audio file (.mp3, .wav, .m4a)",
          variant: "destructive",
        });
      }
    } else {
      // Handle dragged text
      const text = e.dataTransfer.getData('text/plain');
      if (text) {
        setManualTranscript(text);
        setInputMethod("manual");
      }
    }
  };

  // Paste handler for manual transcripts
  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText && pastedText.length > 100) { // Likely a transcript if it's long
      setManualTranscript(pastedText);
      setInputMethod("manual");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
              <p className="text-muted-foreground mt-1">
                Transform your YouTube videos into high-converting lead magnets
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative" ref={notificationsRef}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="relative"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                      {unreadCount}
                    </span>
                  )}
                </Button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowNotifications(false)}
                          className="p-1 h-auto"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="py-2">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`px-4 py-3 hover:bg-gray-50 border-l-4 ${
                              !notification.read 
                                ? 'border-blue-500 bg-blue-50/30' 
                                : 'border-transparent'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <p className="text-sm font-medium text-gray-900">
                                    {notification.title}
                                  </p>
                                  {!notification.read && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {notification.time}
                                </p>
                              </div>
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-1 h-auto ml-2"
                                  title="Mark as read"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center">
                          <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No notifications yet</p>
                        </div>
                      )}
                    </div>

                    {notifications.length > 0 && (
                      <div className="px-4 py-3 border-t border-gray-200">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-center text-blue-600 hover:text-blue-700"
                        >
                          View All Notifications
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <Button 
                className="gradient-primary text-white"
                onClick={() => setLocation('/create')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Guide
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 flex-shrink-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Guides"
              value={stats?.totalGuides || 0}
              change="+12%"
              changeType="positive"
              icon={Book}
              iconColor="text-primary"
            />
            <StatsCard
              title="Total Leads"
              value={stats?.totalLeads || 0}
              change="+23%"
              changeType="positive"
              icon={Users}
              iconColor="text-secondary"
            />
            <StatsCard
              title="Conversion Rate"
              value={`${stats?.avgConversionRate?.toFixed(1) || 0}%`}
              change="+5.1%"
              changeType="positive"
              icon={TrendingUp}
              iconColor="text-accent"
            />
            <StatsCard
              title="Active Landing Pages"
              value={guides?.length || 0}
              change="+8"
              changeType="positive"
              icon={ExternalLink}
              iconColor="text-purple-600"
            />
          </div>



          {/* Quick Action - Create New Guide */}
          <Card className="gradient-primary text-white mb-8">
            <CardContent className="p-8">
              <div className="max-w-4xl">
                <h3 className="text-2xl font-bold mb-3">Transform Any Content into Lead Magnets</h3>
                <p className="text-blue-100 mb-6">
                  {inputMethod === "youtube" && "Paste a YouTube URL and let our AI extract valuable coaching insights to create your next lead magnet in minutes."}
                  {inputMethod === "manual" && "Manually upload your video transcript or drag and drop a text file to bypass YouTube restrictions."}
                  {inputMethod === "pdf" && "Upload PDF documents, articles, or guides to extract key insights and convert them into practice guides."}
                  {inputMethod === "audio" && "Upload audio files (podcasts, lectures, recordings) and we'll transcribe and analyze them for you."}
                  {inputMethod === "streaming" && "Process content from streaming platforms, live streams, or other video sources beyond YouTube."}
                </p>
                
                {/* Input Method Toggle */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button
                    variant={inputMethod === "youtube" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setInputMethod("youtube")}
                    className={inputMethod === "youtube" ? "bg-white text-primary" : "bg-transparent text-white border-white hover:bg-white/10"}
                  >
                    📺 YouTube
                  </Button>
                  <Button
                    variant={inputMethod === "manual" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setInputMethod("manual")}
                    className={inputMethod === "manual" ? "bg-white text-primary" : "bg-transparent text-white border-white hover:bg-white/10"}
                  >
                    📝 Text/Transcript
                  </Button>
                  <Button
                    variant={inputMethod === "pdf" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setInputMethod("pdf")}
                    className={inputMethod === "pdf" ? "bg-white text-primary" : "bg-transparent text-white border-white hover:bg-white/10"}
                  >
                    📄 PDF Document
                  </Button>
                  <Button
                    variant={inputMethod === "audio" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setInputMethod("audio")}
                    className={inputMethod === "audio" ? "bg-white text-primary" : "bg-transparent text-white border-white hover:bg-white/10"}
                  >
                    🎧 Audio File
                  </Button>
                  <Button
                    variant={inputMethod === "streaming" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setInputMethod("streaming")}
                    className={inputMethod === "streaming" ? "bg-white text-primary" : "bg-transparent text-white border-white hover:bg-white/10"}
                  >
                    🌐 Streaming Link
                  </Button>
                </div>

                {inputMethod === "youtube" && (
                  <div className="flex space-x-4">
                    <Input
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="flex-1 bg-white text-slate-800 placeholder-slate-500"
                      disabled={isProcessing}
                    />
                    <Button 
                      onClick={handleCreateGuide}
                      disabled={isProcessing || !youtubeUrl}
                      className="bg-white text-primary hover:bg-gray-50"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Guide
                    </Button>
                  </div>
                )}

                {inputMethod === "manual" && (
                  <div className="space-y-4">
                    {/* Title Input */}
                    <Input
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="Enter content title..."
                      className="bg-white text-slate-800 placeholder-slate-500"
                      disabled={isProcessing}
                    />
                    
                    {/* Drag and Drop Transcript Area */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onPaste={handlePaste}
                      className={`min-h-[120px] p-4 rounded-lg border-2 border-dashed transition-all ${
                        isDragOver 
                          ? 'border-yellow-300 bg-yellow-50/10' 
                          : 'border-white/30 bg-white/5'
                      } ${manualTranscript ? 'border-green-300 bg-green-50/10' : ''}`}
                    >
                      <textarea
                        value={manualTranscript}
                        onChange={(e) => setManualTranscript(e.target.value)}
                        placeholder="Paste or drag transcript here... (YouTube transcript, manual notes, or upload a .txt file)"
                        className="w-full h-full min-h-[100px] bg-transparent text-white placeholder-blue-100 resize-none border-none outline-none"
                        disabled={isProcessing}
                      />
                      {!manualTranscript && (
                        <div className="text-center text-blue-100 text-sm mt-2">
                          💡 Tip: Drag a .txt file here or paste transcript text
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleCreateGuide}
                        disabled={isProcessing || !manualTitle || !manualTranscript}
                        className="bg-white text-primary hover:bg-gray-50"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Guide
                      </Button>
                    </div>
                  </div>
                )}

                {inputMethod === "pdf" && (
                  <div className="space-y-4">
                    {/* Title Input */}
                    <Input
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="Enter document title..."
                      className="bg-white text-slate-800 placeholder-slate-500"
                      disabled={isProcessing || isProcessingFile}
                    />
                    
                    {/* PDF Upload Area */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`min-h-[120px] p-6 rounded-lg border-2 border-dashed transition-all cursor-pointer ${
                        isDragOver 
                          ? 'border-yellow-300 bg-yellow-50/10' 
                          : 'border-white/30 bg-white/5'
                      } ${uploadedFile ? 'border-green-300 bg-green-50/10' : ''}`}
                    >
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadedFile(file);
                            if (!manualTitle) {
                              setManualTitle(file.name.replace(/\.[^/.]+$/, ""));
                            }
                          }
                        }}
                        className="hidden"
                        id="pdf-upload"
                        disabled={isProcessing || isProcessingFile}
                      />
                      <label htmlFor="pdf-upload" className="cursor-pointer">
                        {uploadedFile ? (
                          <div className="text-center">
                            <div className="text-green-300 mb-2">✅ PDF Uploaded</div>
                            <div className="text-white font-medium">{uploadedFile.name}</div>
                            <div className="text-blue-100 text-sm mt-1">
                              {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className="text-blue-100 text-xl mb-2">📄</div>
                            <div className="text-white font-medium mb-1">Drop PDF here or click to upload</div>
                            <div className="text-blue-100 text-sm">
                              Supports articles, guides, research papers, ebooks
                            </div>
                          </div>
                        )}
                      </label>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleCreateGuide}
                        disabled={isProcessing || isProcessingFile || !manualTitle || !uploadedFile}
                        className="bg-white text-primary hover:bg-gray-50"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Extract & Generate Guide
                      </Button>
                    </div>
                  </div>
                )}

                {inputMethod === "audio" && (
                  <div className="space-y-4">
                    {/* Title Input */}
                    <Input
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="Enter audio title..."
                      className="bg-white text-slate-800 placeholder-slate-500"
                      disabled={isProcessing || isProcessingFile}
                    />
                    
                    {/* Audio Upload Area */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`min-h-[120px] p-6 rounded-lg border-2 border-dashed transition-all cursor-pointer ${
                        isDragOver 
                          ? 'border-yellow-300 bg-yellow-50/10' 
                          : 'border-white/30 bg-white/5'
                      } ${uploadedFile ? 'border-green-300 bg-green-50/10' : ''}`}
                    >
                      <input
                        type="file"
                        accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadedFile(file);
                            if (!manualTitle) {
                              setManualTitle(file.name.replace(/\.[^/.]+$/, ""));
                            }
                          }
                        }}
                        className="hidden"
                        id="audio-upload"
                        disabled={isProcessing || isProcessingFile}
                      />
                      <label htmlFor="audio-upload" className="cursor-pointer">
                        {uploadedFile ? (
                          <div className="text-center">
                            <div className="text-green-300 mb-2">✅ Audio Uploaded</div>
                            <div className="text-white font-medium">{uploadedFile.name}</div>
                            <div className="text-blue-100 text-sm mt-1">
                              {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className="text-blue-100 text-xl mb-2">🎧</div>
                            <div className="text-white font-medium mb-1">Drop audio file here or click to upload</div>
                            <div className="text-blue-100 text-sm">
                              Supports MP3, WAV, M4A, AAC, OGG - AI-powered transcription with Whisper
                            </div>
                          </div>
                        )}
                      </label>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleCreateGuide}
                        disabled={isProcessing || isProcessingFile || !manualTitle || !uploadedFile}
                        className="bg-white text-primary hover:bg-gray-50"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Transcribe & Generate Guide
                      </Button>
                    </div>
                  </div>
                )}

                {inputMethod === "streaming" && (
                  <div className="space-y-4">
                    {/* Title Input */}
                    <Input
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="Enter stream/video title..."
                      className="bg-white text-slate-800 placeholder-slate-500"
                      disabled={isProcessing}
                    />
                    
                    {/* Streaming URL Input */}
                    <Input
                      value={streamingUrl}
                      onChange={(e) => setStreamingUrl(e.target.value)}
                      placeholder="https://platform.com/video-url or https://stream-url.m3u8"
                      className="bg-white text-slate-800 placeholder-slate-500"
                      disabled={isProcessing}
                    />
                    
                    <div className="bg-white/10 p-3 rounded-lg">
                      <div className="text-blue-100 text-sm">
                        <strong className="text-white">Supported platforms:</strong> Twitch, Vimeo, Dailymotion, Facebook, Instagram, TikTok, and direct streaming URLs
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleCreateGuide}
                        disabled={isProcessing || !manualTitle || !streamingUrl}
                        className="bg-white text-primary hover:bg-gray-50"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Process & Generate Guide
                      </Button>
                    </div>
                  </div>
                )}


              </div>
            </CardContent>
          </Card>

          {/* Recent Guides - Table Format */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Guides</CardTitle>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {guidesLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center space-x-4">
                        <div className="w-20 h-14 bg-muted rounded-lg"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : guides && guides.length > 0 ? (
                <div className="overflow-x-auto">
                  <table ref={tableRef} className="w-full table-fixed border-separate border-spacing-0">
                    <colgroup>
                      <col style={{ width: `${columnWidths[0]}%` }} />
                      <col style={{ width: `${columnWidths[1]}%` }} />
                      <col style={{ width: `${columnWidths[2]}%` }} />
                      <col style={{ width: `${columnWidths[3]}%` }} />
                      <col style={{ width: `${columnWidths[4]}%` }} />
                    </colgroup>
                    <thead className="border-b">
                      <tr>
                        <th className="text-left px-3 py-4 font-medium text-muted-foreground relative border-r border-gray-200">
                          Guide
                          <div 
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500 transition-colors bg-transparent"
                            onMouseDown={handleMouseDown(0)}
                          ></div>
                        </th>
                        <th className="text-left px-3 py-4 font-medium text-muted-foreground relative border-r border-gray-200">
                          Conversion Funnel
                          <div 
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500 transition-colors bg-transparent"
                            onMouseDown={handleMouseDown(1)}
                          ></div>
                        </th>
                        <th className="text-left px-3 py-4 font-medium text-muted-foreground relative border-r border-gray-200">
                          Landing Page
                          <div 
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500 transition-colors bg-transparent"
                            onMouseDown={handleMouseDown(2)}
                          ></div>
                        </th>
                        <th className="text-left px-3 py-4 font-medium text-muted-foreground relative border-r border-gray-200">
                          Guide Page
                          <div 
                            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500 transition-colors bg-transparent"
                            onMouseDown={handleMouseDown(3)}
                          ></div>
                        </th>
                        <th className="text-left px-3 py-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guides.slice(0, 5).map((guide: any) => (
                        <tr key={guide.id} className="border-b hover:bg-muted/50 transition-colors">
                          {/* Guide Info */}
                          <td className="px-3 py-3 border-r border-gray-200">
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                <div className="w-16 h-12 rounded-md overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                  {guide.thumbnailUrl ? (
                                    <img src={guide.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <Book className="w-5 h-5 text-white" />
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 text-center">
                                  {guide.createdAt ? new Date(guide.createdAt).toLocaleDateString() : 'No date'}
                                </p>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-foreground leading-tight">{guide.title}</p>
                              </div>
                            </div>
                          </td>
                          
                          {/* Conversion Funnel */}
                          <td className="px-3 py-3 border-r border-gray-200">
                            <div className="space-y-2">
                              {/* Views */}
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center">
                                  <Eye className="w-3 h-3 mr-1 text-blue-500" />
                                  <span className="text-muted-foreground">Views</span>
                                </div>
                                <span className="font-medium">{guide.views || 0}</span>
                              </div>
                              
                              {/* Visual Funnel */}
                              <div className="relative">
                                <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-blue-500 rounded-full transition-all"
                                    style={{ width: '100%' }}
                                  ></div>
                                </div>
                                <div className="w-4/5 h-1.5 bg-green-100 rounded-full overflow-hidden mt-1 ml-2">
                                  <div 
                                    className="h-full bg-green-500 rounded-full transition-all"
                                    style={{ width: guide.views > 0 ? `${Math.min(100, ((0) / guide.views) * 100)}%` : '0%' }}
                                  ></div>
                                </div>
                              </div>
                              
                              {/* Leads */}
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center">
                                  <Users className="w-3 h-3 mr-1 text-green-500" />
                                  <span className="text-muted-foreground">Leads</span>
                                </div>
                                <span className="font-medium">0</span>
                              </div>
                            </div>
                          </td>
                          
                          {/* Landing Page Link */}
                          <td className="px-3 py-3 border-r border-gray-200">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => window.open(`/landing/${guide.slug}-landing`, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </td>
                          
                          {/* Guide Page Link */}
                          <td className="px-3 py-3 border-r border-gray-200">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => window.open(`/guide/${guide.id}`, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </td>
                          
                          {/* Actions */}
                          <td className="px-3 py-3">
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              >
                                <BarChart3 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Book className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No guides yet. Create your first guide above!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Overview - Horizontal Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Top Performing Guides */}
            <Card className="md:col-span-2 xl:col-span-3">
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                {guides && guides.length > 0 ? (
                  <div className="space-y-4">
                    {guides
                      .sort((a: any, b: any) => (b.conversionRate || 0) - (a.conversionRate || 0))
                      .slice(0, 3)
                      .map((guide: any) => (
                        <div key={guide.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                          {/* Thumbnail */}
                          <div className="flex-shrink-0">
                            <div className="w-16 h-12 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                              {guide.thumbnailUrl ? (
                                <img src={guide.thumbnailUrl} alt="" className="w-full h-full object-contain" />
                              ) : (
                                <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-full h-full flex items-center justify-center">
                                  <Book className="w-5 h-5 text-white" />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Full Headline */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-foreground leading-tight">
                              {guide.title}
                            </h3>
                          </div>
                          
                          {/* Metrics Bar */}
                          <div className="flex items-center space-x-6 text-sm">
                            <div className="flex items-center space-x-2">
                              <Eye className="w-4 h-4 text-blue-500" />
                              <span className="font-medium">{guide.views || 0}</span>
                              <span className="text-muted-foreground">views</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-green-500" />
                              <span className="font-medium">{guide.leads || 0}</span>
                              <span className="text-muted-foreground">leads</span>
                            </div>
                            <Badge variant="secondary">
                              {guide.conversionRate || 0}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Create guides to see top performers
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="xl:col-span-1">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                    <Palette className="w-3 h-3 mr-2" />
                    Update Branding
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                    <ExternalLink className="w-3 h-3 mr-2" />
                    Manage Integrations
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                    <TrendingUp className="w-3 h-3 mr-2" />
                    Export Data
                  </Button>
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
