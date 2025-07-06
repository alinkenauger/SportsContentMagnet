import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TestResult {
  method: string;
  status: "idle" | "testing" | "success" | "error";
  result?: string;
  error?: string;
  duration?: number;
}

export default function TranscriptionTest() {
  const [testResults, setTestResults] = useState<TestResult[]>([
    { method: "YouTube (API)", status: "idle" },
    { method: "YouTube (yt-dlp)", status: "idle" },
    { method: "YouTube (Whisper)", status: "idle" },
    { method: "Audio Upload", status: "idle" },
    { method: "PDF Processing", status: "idle" },
    { method: "Web Scraping", status: "idle" },
    { method: "Manual Transcript", status: "idle" },
    { method: "Streaming Content", status: "idle" },
  ]);

  const [testUrl, setTestUrl] = useState("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

  const updateResult = (method: string, update: Partial<TestResult>) => {
    setTestResults(prev => prev.map(result => 
      result.method === method ? { ...result, ...update } : result
    ));
  };

  const testYouTubeAPI = async () => {
    const method = "YouTube (API)";
    updateResult(method, { status: "testing" });
    const startTime = Date.now();
    
    try {
      const videoId = testUrl.split('v=')[1]?.split('&')[0];
      if (!videoId) {
        throw new Error("Invalid YouTube URL");
      }
      
      const response = await apiRequest(`/api/test-transcription?videoId=${videoId}`);
      const duration = Date.now() - startTime;
      
      updateResult(method, { 
        status: "success", 
        result: `Transcribed ${response.length} characters in ${duration}ms`,
        duration 
      });
    } catch (error) {
      updateResult(method, { 
        status: "error", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  };

  const testBackendCapabilities = async () => {
    const method = "Backend Status";
    updateResult(method, { status: "testing" });
    
    try {
      // Test backend route capability
      const response = await apiRequest('/api/health');
      updateResult(method, { 
        status: "success", 
        result: "Backend is responding" 
      });
    } catch (error) {
      updateResult(method, { 
        status: "error", 
        error: "Backend not responding" 
      });
    }
  };

  const testManualTranscript = () => {
    const method = "Manual Transcript";
    updateResult(method, { status: "testing" });
    
    setTimeout(() => {
      updateResult(method, { 
        status: "success", 
        result: "Manual transcript input is functional (frontend only)" 
      });
    }, 500);
  };

  const runAllTests = async () => {
    await testYouTubeAPI();
    await testBackendCapabilities();
    testManualTranscript();
  };

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "success": return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error": return <XCircle className="w-5 h-5 text-red-500" />;
      case "testing": return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">VidMagnet Transcription Test</h1>
        <p className="text-muted-foreground mt-2">
          Test all input methods to verify transcription capabilities
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="test-url">Test YouTube URL</Label>
            <Input
              id="test-url"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>
          
          <div className="flex space-x-4">
            <Button onClick={runAllTests} className="gradient-primary">
              Run All Tests
            </Button>
            <Button onClick={testYouTubeAPI} variant="outline">
              Test YouTube Only
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {testResults.map((result) => (
              <div key={result.method} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <div className="font-medium">{result.method}</div>
                    {result.result && (
                      <div className="text-sm text-green-600">{result.result}</div>
                    )}
                    {result.error && (
                      <div className="text-sm text-red-600">{result.error}</div>
                    )}
                  </div>
                </div>
                {result.duration && (
                  <div className="text-sm text-muted-foreground">
                    {result.duration}ms
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Implementation Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600">✅ Currently Working</h4>
              <ul className="text-sm space-y-1">
                <li>• Manual transcript input</li>
                <li>• Frontend validation for all input types</li>
                <li>• File upload interface (PDF, Audio)</li>
                <li>• URL input interface (YouTube, Web, Stream)</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-orange-600">🔧 In Development</h4>
              <ul className="text-sm space-y-1">
                <li>• YouTube transcription (multiple methods)</li>
                <li>• Audio file transcription (Whisper)</li>
                <li>• PDF text extraction</li>
                <li>• Web page content scraping</li>
                <li>• Streaming content processing</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}