import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CheckCircle, Loader2, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

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
}

export default function ProcessingModal({ isOpen, steps, currentStep, progress }: ProcessingModalProps) {
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
          <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          
          <h3 className="text-xl font-bold text-foreground mb-3">
            Processing Your Video
          </h3>
          
          <p className="text-muted-foreground mb-6">
            Our AI is analyzing your video content and extracting valuable coaching insights...
          </p>
          
          {/* Progress Steps */}
          <div className="space-y-4 mb-6">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center space-x-3">
                {getStepIcon(step.status)}
                <span className={`text-sm ${getStepTextColor(step.status)}`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2 mb-4">
            <Progress value={progress} className="w-full" />
            <p className="text-xs text-muted-foreground">
              This usually takes 2-3 minutes...
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
