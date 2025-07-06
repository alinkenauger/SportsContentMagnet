import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CheckCircle, Loader2, Circle, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

interface ProcessingStep {
  id: string;
  title: string;
  status: "pending" | "processing" | "completed";
}

interface ProcessingModalProps {
  isOpen: boolean;
  steps: ProcessingStep[];
  currentStep: string;
  progress: number;
  isTranscribing?: boolean;
  transcriptionProgress?: number;
}

export default function ProcessingModal({ 
  isOpen, 
  steps, 
  currentStep, 
  progress, 
  isTranscribing = false, 
  transcriptionProgress = 0 
}: ProcessingModalProps) {
  const [encouragingMessage, setEncouragingMessage] = useState("");
  const [displayProgress, setDisplayProgress] = useState(0);

  // Dynamic encouraging messages based on progress
  const getEncouragingMessage = (progress: number) => {
    if (progress < 20) return "🎬 Your Landing Page Copy is Baking...";
    if (progress < 40) return "🚀 Extracting golden insights from your content...";
    if (progress < 60) return "🎯 Your Guide Is Looking AMAZING! We're almost done!";
    if (progress < 80) return "✨ Almost There ;) Creating your masterpiece...";
    if (progress < 95) return "🎉 Putting the finishing touches on your guide...";
    return "🎊 Done! Your guide is ready to convert!";
  };

  // Update message and smooth progress animation
  useEffect(() => {
    if (isTranscribing && transcriptionProgress > 0) {
      setDisplayProgress(transcriptionProgress);
      setEncouragingMessage(getEncouragingMessage(transcriptionProgress));
    } else {
      setDisplayProgress(progress);
      setEncouragingMessage(getEncouragingMessage(progress));
    }
  }, [progress, isTranscribing, transcriptionProgress]);

  const getStepIcon = (status: ProcessingStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-secondary" />;
      case "processing":
        return <Loader2 className="w-5 h-5 text-accent animate-spin" />;
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStepTextColor = (status: ProcessingStep["status"]) => {
    switch (status) {
      case "completed":
        return "text-secondary font-medium";
      case "processing":
        return "text-foreground font-medium";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-lg">
        <div className="text-center">
          {/* Circular Progress Indicator */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-gray-200"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-primary"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - displayProgress / 100)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
              />
            </svg>
            {/* Percentage in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {Math.round(displayProgress)}%
                </div>
                <Sparkles className="w-4 h-4 text-accent mx-auto animate-pulse" />
              </div>
            </div>
          </div>
          
          {/* Encouraging Message */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-foreground mb-2">
              {encouragingMessage}
            </h3>
            <p className="text-muted-foreground text-sm">
              {isTranscribing ? "Transcribing audio with AI..." : "Processing your content..."}
            </p>
          </div>
          
          {/* Progress Steps */}
          <div className="space-y-3 mb-6">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center space-x-3 text-left">
                {getStepIcon(step.status)}
                <span className={`text-sm ${getStepTextColor(step.status)}`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
          
          {/* Progress Bar (Secondary) */}
          <div className="space-y-2 mb-4">
            <Progress 
              value={displayProgress} 
              className="w-full h-2"
            />
            <p className="text-xs text-muted-foreground">
              {isTranscribing ? "AI transcription in progress..." : "Usually takes 1-2 minutes..."}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
