import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Gift,
  Loader2,
  LockKeyhole,
  Mail,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EditorialQuizResult } from "@/components/quiz/editorial-quiz-result";
import { PublicLibraryLink } from "@/components/public-library-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { LibraryContext } from "@shared/library";

type LeadCaptureConfig =
  | boolean
  | {
      enabled?: boolean;
      required?: boolean;
      title?: string;
      headline?: string;
      description?: string;
      buttonText?: string;
      collectFirstName?: boolean;
      requireFirstName?: boolean;
      firstNameRequired?: boolean;
      collectEmail?: boolean;
      requireEmail?: boolean;
      emailRequired?: boolean;
      fields?: Array<"firstName" | "lastName" | "email" | "phone">;
    };

interface QuizTheme {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
}

interface QuizBranding {
  logoUrl?: string;
  displayName?: string;
  companyName?: string;
  tagline?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  headingFontFamily?: string;
  bodyFontFamily?: string;
  fontFamily?: string;
  onPrimaryColor?: string;
}

interface PublicQuizQuestion {
  id: string;
  prompt: string;
  helpText?: string;
  options: Array<{
    id: string;
    label: string;
  }>;
}

interface PublicQuizPayload {
  guide: {
    title: string;
    description: string | null;
    presentationProfile?: {
      version: 1;
      mode: "auto" | "manual";
      preset: "editorial" | "basketball" | "golf" | "performance";
    };
    sourceVideo?: {
      provider: "youtube";
      videoId: string;
      canonicalUrl: string;
      channelTitle?: string;
    } | null;
  };
  landingPage?: {
    headline?: string | null;
    subheadline?: string | null;
    description?: string | null;
  };
  quiz: {
    leadCapture: LeadCaptureConfig;
    theme?: QuizTheme;
    questions?: PublicQuizQuestion[];
  };
  questions?: PublicQuizQuestion[];
  branding?: QuizBranding;
  library?: LibraryContext | null;
}

interface ResultAction {
  id?: string | number;
  title?: string;
  benefitSummary?: string;
  summary?: string;
  description?: string;
  url?: string;
  buttonLabel?: string;
  label?: string;
}

interface PrescriptionStep {
  title: string;
  action: string;
  why: string;
  timeframe: string;
  successCriteria: string;
  sourceRefs?: Array<{ label: string; startSeconds: number; endSeconds?: number }>;
}

interface OutcomePrescription {
  strengths: string[];
  bottleneck: string;
  opportunity: string;
  watchout: string;
  quickWin: PrescriptionStep;
  nextSteps: PrescriptionStep[];
  mistakes: Array<{ mistake: string; correction: string }>;
  implementationAsset?: {
    type: "script" | "template" | "checklist" | "worksheet";
    title: string;
    description: string;
    instructions: string;
    content: string;
  };
}

interface DiagnosticDimension {
  title: string;
  description: string;
  normalizedScore: number;
  direction: "low" | "balanced" | "high";
  label: string;
}

interface PublicQuizResult {
  attemptId: string;
  outcome: {
    id: string;
    title: string;
    summary: string;
    description: string;
    recommendations: string[];
    prescription?: OutcomePrescription;
  };
  diagnostic?: {
    responsePattern: string;
    strongestSignal: DiagnosticDimension | null;
    dimensions: DiagnosticDimension[];
    answerEvidence: Array<{
      question: string;
      answer: string;
      answerInsight?: string;
      evidence?: string;
      sourceRefs?: Array<{ label: string; startSeconds: number; endSeconds?: number }>;
    }>;
  };
  gift?: ResultAction | null;
  cta?: ResultAction | null;
}

type RunnerStage = "welcome" | "question" | "lead" | "result";

const DEFAULT_PRIMARY = "#2563EB";
const DEFAULT_SECONDARY = "#10B981";
const DEFAULT_ACCENT = "#F59E0B";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    const message = (await response.text()) || response.statusText;
    throw new Error(message || "Unable to load this quiz.");
  }
  return response.json() as Promise<T>;
}

function getLeadCaptureSettings(config: LeadCaptureConfig | undefined) {
  const details = typeof config === "object" && config ? config : {};
  const enabled = config !== false && details.enabled !== false;
  const fields = details.fields || ["firstName", "email"];
  const collectFirstName = details.collectFirstName !== false && fields.includes("firstName");
  const collectEmail = details.collectEmail !== false && fields.includes("email");
  const required =
    details.required === true ||
    details.emailRequired === true ||
    details.requireEmail === true;

  return {
    enabled,
    required,
    collectFirstName,
    collectEmail,
    requireFirstName:
      collectFirstName &&
      (details.firstNameRequired === true || details.requireFirstName === true),
    requireEmail:
      collectEmail &&
      required,
    title: details.title || details.headline || "Your result is ready",
    description:
      details.description ||
      "Enter your details to unlock your personalized result and recommendations.",
    buttonText: details.buttonText || "Reveal my result",
  };
}

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall back for browsers that expose the API but block it outside HTTPS.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  const previouslyFocused = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
  document.body.appendChild(textarea);
  let copied = false;
  try {
    textarea.select();
    copied = document.execCommand("copy");
  } finally {
    textarea.remove();
    previouslyFocused?.focus();
  }
  if (!copied) throw new Error("Copy was blocked by the browser");
}

export default function QuizRunner() {
  const { customUrl } = useParams<{ customUrl: string }>();
  const { toast } = useToast();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const initialResultId = useMemo(
    () => new URLSearchParams(window.location.search).get("attemptId"),
    [],
  );

  const [stage, setStage] = useState<RunnerStage>(initialResultId ? "result" : "welcome");
  const [attemptId, setAttemptId] = useState<string | null>(initialResultId);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<PublicQuizResult | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [implementationAssetCopied, setImplementationAssetCopied] = useState(false);

  const quizQuery = useQuery<PublicQuizPayload, Error>({
    queryKey: ["/api/public/quizzes", customUrl],
    queryFn: () => fetchJson(`/api/public/quizzes/${encodeURIComponent(customUrl)}`),
    enabled: Boolean(customUrl),
    retry: false,
  });

  const resultQuery = useQuery<PublicQuizResult, Error>({
    queryKey: ["/api/public/quiz-results", attemptId],
    queryFn: () =>
      fetchJson(`/api/public/quiz-results/${encodeURIComponent(attemptId || "")}`),
    enabled: Boolean(attemptId && initialResultId),
    retry: false,
  });

  const startMutation = useMutation<{ attemptId: string }, Error>({
    mutationFn: async () => {
      const response = await apiRequest(
        `/api/public/quizzes/${encodeURIComponent(customUrl)}/start`,
        "POST",
        {},
      );
      return response.json();
    },
  });

  const completeMutation = useMutation<PublicQuizResult, Error>({
    mutationFn: async () => {
      if (!attemptId) throw new Error("This quiz attempt has not started yet.");

      const response = await apiRequest(
        `/api/public/quizzes/${encodeURIComponent(customUrl)}/complete`,
        "POST",
        {
          attemptId,
          answers,
          ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
          ...(email.trim() ? { email: email.trim() } : {}),
        },
      );
      return response.json();
    },
  });

  const quizData = quizQuery.data;
  const questions = quizData?.questions || quizData?.quiz.questions || [];
  const currentQuestion = questions[questionIndex];
  const leadCapture = getLeadCaptureSettings(quizData?.quiz.leadCapture);
  const shouldShowLeadGate =
    leadCapture.enabled && (leadCapture.collectFirstName || leadCapture.collectEmail);

  const theme = quizData?.quiz.theme;
  const branding = quizData?.branding;
  const primaryColor = theme?.primaryColor || branding?.primaryColor || DEFAULT_PRIMARY;
  const secondaryColor =
    theme?.secondaryColor || branding?.secondaryColor || DEFAULT_SECONDARY;
  const accentColor = theme?.accentColor || branding?.accentColor || DEFAULT_ACCENT;
  const pageStyles = {
    "--quiz-primary": primaryColor,
    "--quiz-secondary": secondaryColor,
    "--quiz-accent": accentColor,
    backgroundColor: theme?.backgroundColor || "#F8FAFC",
    fontFamily: theme?.fontFamily || branding?.fontFamily || "Inter, sans-serif",
  } as CSSProperties;

  const progress =
    stage === "result"
      ? 100
      : stage === "lead"
        ? 100
        : stage === "question" && questions.length
          ? ((questionIndex + 1) / questions.length) * 100
          : 0;

  useEffect(() => {
    if (resultQuery.data) {
      setResult(resultQuery.data);
      setStage("result");
    }
  }, [resultQuery.data]);

  useEffect(() => {
    if (stage === "welcome" || stage === "result") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    const focusTimer = window.setTimeout(() => headingRef.current?.focus(), 120);
    return () => window.clearTimeout(focusTimer);
  }, [questionIndex, stage]);

  useEffect(() => {
    if (stage !== "result" || !result) return;

    window.scrollTo({ top: 0, behavior: "auto" });
    const focusTimer = window.setTimeout(() => headingRef.current?.focus(), 120);
    return () => window.clearTimeout(focusTimer);
  }, [result?.attemptId, stage]);

  const completeQuiz = async (attemptIdOverride?: string) => {
    setInlineError(null);
    try {
      const activeAttemptId = attemptIdOverride || attemptId;
      if (!activeAttemptId) throw new Error("This quiz attempt has not started yet.");

      let completed: PublicQuizResult;
      if (activeAttemptId === attemptId) {
        completed = await completeMutation.mutateAsync();
      } else {
        const response = await apiRequest(
          `/api/public/quizzes/${encodeURIComponent(customUrl)}/complete`,
          "POST",
          {
            attemptId: activeAttemptId,
            answers,
            ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
            ...(email.trim() ? { email: email.trim() } : {}),
          },
        );
        completed = await response.json();
      }
      setResult(completed);
      setAttemptId(completed.attemptId);
      setStage("result");
      const url = new URL(window.location.href);
      url.searchParams.set("attemptId", completed.attemptId);
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      setInlineError(message);
      toast({
        title: "We couldn't finish your quiz",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleStart = async () => {
    setInlineError(null);
    try {
      let nextAttemptId = attemptId;
      if (!nextAttemptId) {
        const started = await startMutation.mutateAsync();
        nextAttemptId = started.attemptId;
        setAttemptId(started.attemptId);
      }

      if (questions.length > 0) {
        setStage("question");
      } else if (shouldShowLeadGate) {
        setStage("lead");
      } else {
        await completeQuiz(nextAttemptId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      setInlineError(message);
    }
  };

  const handleContinue = async () => {
    if (!currentQuestion || !answers[currentQuestion.id]) return;
    setInlineError(null);

    if (questionIndex < questions.length - 1) {
      setQuestionIndex((index) => index + 1);
      return;
    }

    if (shouldShowLeadGate) {
      setStage("lead");
    } else {
      await completeQuiz();
    }
  };

  const handleBack = () => {
    setInlineError(null);
    if (stage === "lead") {
      setStage(questions.length ? "question" : "welcome");
      setQuestionIndex(Math.max(questions.length - 1, 0));
      return;
    }

    if (questionIndex === 0) {
      setStage("welcome");
      return;
    }
    setQuestionIndex((index) => index - 1);
  };

  const handleLeadSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await completeQuiz();
  };

  const trackResultClick = (kind: "gift" | "cta") => {
    if (!result?.attemptId) return;
    void fetch(
      `/api/public/quiz-results/${encodeURIComponent(result.attemptId)}/click`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
        keepalive: true,
        credentials: "include",
      },
    ).catch(() => undefined);
  };

  const resetQuiz = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("attemptId");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    setAttemptId(null);
    setAnswers({});
    setFirstName("");
    setEmail("");
    setQuestionIndex(0);
    setResult(null);
    setInlineError(null);
    setImplementationAssetCopied(false);
    setStage("welcome");
  };

  const copyImplementationAsset = async () => {
    const asset = result?.outcome.prescription?.implementationAsset;
    if (!asset) return;

    try {
      await copyTextToClipboard(
        `${asset.title}\n\nHow to use it:\n${asset.instructions}\n\n${asset.content}`,
      );
      setImplementationAssetCopied(true);
      toast({
        title: "Ready-to-use tool copied",
        description: "Paste it wherever you plan, write, or work.",
      });
      window.setTimeout(() => setImplementationAssetCopied(false), 2500);
    } catch {
      toast({
        title: "Copy was blocked",
        description: "Select the tool text and copy it manually.",
        variant: "destructive",
      });
    }
  };

  if (quizQuery.isLoading || (initialResultId && resultQuery.isLoading)) {
    return (
      <div className="min-h-screen bg-slate-50 px-4" style={pageStyles}>
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: primaryColor }} />
          </div>
          <p className="font-medium text-slate-900">Preparing your quiz…</p>
          <p className="mt-1 text-sm text-slate-500">This will only take a moment.</p>
        </div>
      </div>
    );
  }

  if (quizQuery.isError || !quizData) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12" style={pageStyles}>
        <Card className="mx-auto max-w-lg overflow-hidden border-slate-200 shadow-lg">
          <CardContent className="p-8 text-center sm:p-10">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Target className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Quiz not available</h1>
            <p className="mt-3 text-slate-600">
              This quiz may have been unpublished or the link may be incorrect.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (initialResultId && resultQuery.isError && !result) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12" style={pageStyles}>
        <Card className="mx-auto max-w-lg border-slate-200 shadow-lg">
          <CardContent className="p-8 text-center sm:p-10">
            <h1 className="text-2xl font-bold text-slate-900">Result not found</h1>
            <p className="mt-3 text-slate-600">
              This result link may have expired. You can take the quiz again to create a new one.
            </p>
            <Button className="mt-6" onClick={resetQuiz}>
              <RotateCcw className="h-4 w-4" />
              Take the quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stage === "result" && result) {
    return (
      <EditorialQuizResult
        result={result}
        quizTitle={quizData.guide.title}
        firstName={firstName}
        brandName={branding?.displayName || branding?.companyName || "VidMagnet"}
        brandTagline={branding?.tagline}
        logoUrl={branding?.logoUrl}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        accentColor={accentColor}
        backgroundColor={theme?.backgroundColor || branding?.backgroundColor || "#F7F7F4"}
        surfaceColor={branding?.surfaceColor || "#FFFFFF"}
        textColor={branding?.textColor || "#101419"}
        onPrimaryColor={branding?.onPrimaryColor || "#FFFFFF"}
        headingFontFamily={branding?.headingFontFamily}
        bodyFontFamily={theme?.fontFamily || branding?.bodyFontFamily || branding?.fontFamily}
        presentationPreset={quizData.guide.presentationProfile?.preset || "editorial"}
        sourceVideo={quizData.guide.sourceVideo || null}
        headingRef={headingRef}
        implementationAssetCopied={implementationAssetCopied}
        onCopyImplementationAsset={copyImplementationAsset}
        onTrackAction={trackResultClick}
        onPrint={() => window.print()}
        onRetake={resetQuiz}
        library={quizData.library}
      />
    );
  }

  return (
    <div className="min-h-screen text-slate-900" style={pageStyles}>
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.companyName ? `${branding.companyName} logo` : "Brand logo"}
                className="h-9 max-w-[160px] object-contain"
              />
            ) : (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                style={{ backgroundColor: primaryColor }}
                aria-hidden="true"
              >
                <Sparkles className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {branding?.companyName || "VidMagnet"}
              </p>
              {branding?.tagline && (
                <p className="hidden truncate text-xs text-slate-500 sm:block">
                  {branding.tagline}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PublicLibraryLink
              library={quizData.library}
              className="border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
            />
            {stage !== "welcome" && stage !== "result" && (
              <div className="hidden w-32 sm:block sm:w-48" aria-label={`${Math.round(progress)}% complete`}>
                <div className="mb-1 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-slate-100" />
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-74px)] max-w-4xl items-center px-4 py-8 sm:px-6 sm:py-12">
        {stage === "welcome" && (
          <section className="w-full" aria-labelledby="quiz-title">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-xl shadow-slate-200/60">
              <div className="h-1.5 w-full" style={{ backgroundColor: primaryColor }} />
              <CardContent className="p-6 sm:p-10 lg:p-12">
                <div className="mx-auto max-w-2xl text-center">
                  <Badge
                    variant="outline"
                    className="mb-5 border-blue-200 bg-blue-50 px-3 py-1 text-blue-700"
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Personalized quiz
                  </Badge>
                  <h1
                    id="quiz-title"
                    className="text-balance text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl"
                  >
                    {quizData.guide.title}
                  </h1>
                  <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                    {quizData.guide.description ||
                      quizData.landingPage?.description ||
                      "Answer a few quick questions to get a result and next steps matched to you."}
                  </p>

                  <div className="mx-auto mt-8 grid max-w-xl gap-3 text-left sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <Target className="mb-3 h-5 w-5" style={{ color: primaryColor }} />
                      <p className="text-sm font-semibold text-slate-900">Made for you</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Advice matched to your answers</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <CheckCircle2 className="mb-3 h-5 w-5" style={{ color: secondaryColor }} />
                      <p className="text-sm font-semibold text-slate-900">Quick to finish</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {questions.length || "A few"} focused questions
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <Gift className="mb-3 h-5 w-5" style={{ color: accentColor }} />
                      <p className="text-sm font-semibold text-slate-900">Useful next step</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">Resources selected for your result</p>
                    </div>
                  </div>

                  {inlineError && (
                    <Alert variant="destructive" className="mt-6 text-left">
                      <AlertTitle>Unable to start</AlertTitle>
                      <AlertDescription>{inlineError}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    size="lg"
                    onClick={handleStart}
                    disabled={startMutation.isPending || completeMutation.isPending}
                    className="mt-8 min-w-52 text-white shadow-lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {startMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                    Start the quiz
                  </Button>
                  <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500">
                    <LockKeyhole className="h-3.5 w-3.5" />
                    Your answers are used only to personalize your result.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {stage === "question" && currentQuestion && (
          <section className="w-full" aria-labelledby="question-heading">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-xl shadow-slate-200/60">
              <div className="h-1 w-full bg-slate-100">
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: `${progress}%`, backgroundColor: primaryColor }}
                />
              </div>
              <CardContent className="p-5 sm:p-8 lg:p-10">
                <div className="mb-7 flex items-center justify-between gap-4">
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                    Question {questionIndex + 1} of {questions.length}
                  </Badge>
                  <span className="text-xs font-medium text-slate-400">
                    Choose one answer
                  </span>
                </div>

                <fieldset>
                  <legend className="sr-only">{currentQuestion.prompt}</legend>
                  <h1
                    ref={headingRef}
                    id="question-heading"
                    tabIndex={-1}
                    className="text-balance text-2xl font-bold leading-tight tracking-tight text-slate-950 outline-none sm:text-3xl"
                  >
                    {currentQuestion.prompt}
                  </h1>
                  {currentQuestion.helpText && (
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                      {currentQuestion.helpText}
                    </p>
                  )}

                  <div className="mt-7 grid gap-3" role="radiogroup">
                    {currentQuestion.options.map((option, optionIndex) => {
                      const selected = answers[currentQuestion.id] === option.id;
                      return (
                        <label
                          key={option.id}
                          className={cn(
                            "group flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 sm:p-5",
                            selected ? "bg-blue-50/60 shadow-sm" : "border-slate-200 bg-white",
                          )}
                          style={selected ? { borderColor: primaryColor } : undefined}
                        >
                          <input
                            type="radio"
                            name={currentQuestion.id}
                            value={option.id}
                            checked={selected}
                            onChange={() =>
                              setAnswers((current) => ({
                                ...current,
                                [currentQuestion.id]: option.id,
                              }))
                            }
                            className="sr-only"
                          />
                          <span
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                              selected
                                ? "border-transparent text-white"
                                : "border-slate-300 bg-slate-50 text-slate-500 group-hover:border-blue-300",
                            )}
                            style={selected ? { backgroundColor: primaryColor } : undefined}
                            aria-hidden="true"
                          >
                            {selected ? <Check className="h-4 w-4" /> : String.fromCharCode(65 + optionIndex)}
                          </span>
                          <span className="flex-1 font-medium leading-6 text-slate-800">
                            {option.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                {inlineError && (
                  <Alert variant="destructive" className="mt-5">
                    <AlertDescription>{inlineError}</AlertDescription>
                  </Alert>
                )}

                <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
                  <Button type="button" variant="ghost" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleContinue}
                    disabled={!answers[currentQuestion.id] || completeMutation.isPending}
                    className="min-w-32 text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {completeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {questionIndex === questions.length - 1 ? "See my result" : "Continue"}
                    {!completeMutation.isPending && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {stage === "lead" && (
          <section className="w-full" aria-labelledby="lead-heading">
            <Card className="mx-auto max-w-2xl overflow-hidden border-slate-200 bg-white shadow-xl shadow-slate-200/60">
              <div className="h-1.5 w-full" style={{ backgroundColor: secondaryColor }} />
              <CardContent className="p-6 sm:p-9">
                <div className="text-center">
                  <div
                    className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-sm"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    <Mail className="h-6 w-6" />
                  </div>
                  <Badge variant="outline" className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-700">
                    Quiz complete
                  </Badge>
                  <h1
                    ref={headingRef}
                    id="lead-heading"
                    tabIndex={-1}
                    className="text-3xl font-bold tracking-tight text-slate-950 outline-none"
                  >
                    {leadCapture.title}
                  </h1>
                  <p className="mx-auto mt-3 max-w-lg leading-6 text-slate-600">
                    {leadCapture.description}
                  </p>
                </div>

                <form onSubmit={handleLeadSubmit} className="mx-auto mt-8 max-w-lg space-y-5">
                  {leadCapture.collectFirstName && (
                    <div className="space-y-2">
                      <Label htmlFor="quiz-first-name">
                        First name {leadCapture.requireFirstName && <span aria-hidden="true">*</span>}
                      </Label>
                      <Input
                        id="quiz-first-name"
                        name="firstName"
                        autoComplete="given-name"
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        required={leadCapture.requireFirstName}
                        placeholder="Your first name"
                        className="h-11"
                      />
                    </div>
                  )}
                  {leadCapture.collectEmail && (
                    <div className="space-y-2">
                      <Label htmlFor="quiz-email">
                        Email address {leadCapture.requireEmail && <span aria-hidden="true">*</span>}
                      </Label>
                      <Input
                        id="quiz-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required={leadCapture.requireEmail}
                        placeholder="you@example.com"
                        className="h-11"
                      />
                      <p className="flex items-center gap-1.5 text-xs text-slate-500">
                        <LockKeyhole className="h-3.5 w-3.5" />
                        Your information is kept private and secure.
                      </p>
                    </div>
                  )}

                  {inlineError && (
                    <Alert variant="destructive">
                      <AlertTitle>Unable to reveal your result</AlertTitle>
                      <AlertDescription>{inlineError}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    disabled={completeMutation.isPending}
                    className="w-full text-white"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    {completeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {completeMutation.isPending ? "Building your result…" : leadCapture.buttonText}
                  </Button>
                  {!leadCapture.required && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => completeQuiz()}
                      disabled={completeMutation.isPending}
                    >
                      Skip and show my result
                    </Button>
                  )}
                  <Button type="button" variant="ghost" className="w-full" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                    Review my answers
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>
        )}

      </main>
    </div>
  );
}
