import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, Loader2 } from "lucide-react";

interface ProcessingStep {
  id: string;
  title: string;
  status: "pending" | "processing" | "completed";
}

interface ProcessingModalProps {
  isOpen: boolean;
  steps: ProcessingStep[];
  currentStep?: string;
  // Retained for older callers. This modal intentionally does not turn
  // simulated values into a completion estimate.
  progress?: number;
  isTranscribing?: boolean;
  transcriptionProgress?: number;
}

export default function ProcessingModal({
  isOpen,
  steps,
  currentStep = "",
}: ProcessingModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent
        className="max-w-lg [&>button]:hidden"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <div aria-busy="true" aria-live="polite">
          <DialogHeader className="items-center text-center sm:text-center">
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
            </div>
            <DialogTitle>Building your guide</DialogTitle>
            <DialogDescription className="max-w-md leading-6">
              VidMagnet is preparing the source, finding the strongest coaching insights, and assembling the branded guide and lead page. Longer videos can take a few minutes.
            </DialogDescription>
          </DialogHeader>

          <ol className="my-6 space-y-2" aria-label="Guide generation stages">
            {steps.map((step, index) => {
              const status = step.id === currentStep && step.status === "pending"
                ? "processing"
                : step.status;

              return (
                <li
                  key={step.id}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                    status === "processing"
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-muted/20"
                  }`}
                  aria-current={status === "processing" ? "step" : undefined}
                >
                  {status === "completed" ? (
                    <CheckCircle className="h-5 w-5 flex-none text-secondary" aria-hidden="true" />
                  ) : status === "processing" ? (
                    <Loader2 className="h-5 w-5 flex-none animate-spin text-primary" aria-hidden="true" />
                  ) : (
                    <span
                      className="flex h-5 w-5 flex-none items-center justify-center rounded-full border text-[11px] font-bold text-muted-foreground"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                  )}
                  <span className={status === "processing" ? "text-sm font-semibold" : "text-sm text-muted-foreground"}>
                    {step.title}
                  </span>
                </li>
              );
            })}
          </ol>

          <p className="rounded-xl bg-muted px-4 py-3 text-center text-xs leading-5 text-muted-foreground">
            Keep this window open. Exact timing varies, so VidMagnet will take you to the editor only when the server confirms the guide is ready.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
