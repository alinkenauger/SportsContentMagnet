import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import Sidebar from "@/components/sidebar";
import QuizAssetPicker, { type BenefitAsset } from "@/components/quiz-asset-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDot,
  ExternalLink,
  Eye,
  Gift,
  LibraryBig,
  ListChecks,
  Loader2,
  LockKeyhole,
  Mail,
  Palette,
  Plus,
  Save,
  Send,
  Target,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";

interface QuizOption {
  id: string;
  label: string;
  outcomeWeights: Record<string, number>;
}

interface QuizQuestion {
  id: string;
  prompt: string;
  helpText?: string;
  options: QuizOption[];
}

interface QuizOutcome {
  id: string;
  title: string;
  summary: string;
  description: string;
  recommendations: string[];
  giftAssetId: number | null;
  ctaAssetId: number | null;
  color?: string;
}

interface LeadCaptureConfig {
  enabled: boolean;
  required: boolean;
  headline: string;
}

interface QuizTheme {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
}

interface QuizEditorResponse {
  guide: {
    id: number;
    brandId?: number | null;
    title: string;
    description?: string | null;
    status?: string | null;
    slug?: string | null;
    includeInLibrary?: boolean | null;
    presentationProfile?: {
      version: 1;
      mode: "auto" | "manual";
      preset: "editorial" | "basketball" | "golf" | "performance";
    };
  };
  quiz: {
    questions?: QuizQuestion[] | null;
    outcomes?: QuizOutcome[] | null;
    leadCapture?: LeadCaptureConfig | null;
    theme?: QuizTheme | null;
  };
  landingPage?: {
    customUrl?: string | null;
  } | null;
}

interface QuizSavePayload {
  title: string;
  description: string;
  questions: QuizQuestion[];
  outcomes: QuizOutcome[];
  leadCapture: LeadCaptureConfig;
  theme: QuizTheme;
  presentationSelection:
    | { mode: "auto" }
    | { mode: "manual"; preset: "editorial" | "basketball" | "golf" | "performance" };
}

const DEFAULT_OUTCOME_COLORS = ["#2563EB", "#7C3AED", "#059669", "#D97706", "#DC2626", "#0891B2"];
const MIN_QUIZ_QUESTIONS = 5;
const QUIZ_ANSWER_COUNT = 4;

function createLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getPrimaryOutcomeId(weights: Record<string, number> | undefined) {
  if (!weights) return "unmapped";
  const highest = Object.entries(weights).sort(([, leftWeight], [, rightWeight]) => rightWeight - leftWeight)[0];
  return highest?.[0] || "unmapped";
}

function normalizedColor(color: string | undefined, fallback: string) {
  return /^#[0-9A-F]{6}$/i.test(color || "") ? color! : fallback;
}

function statusClasses(status: string) {
  switch (status) {
    case "published":
      return "border-green-200 bg-green-50 text-green-700";
    case "unlisted":
      return "border-orange-200 bg-orange-50 text-orange-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export default function QuizEditor() {
  const { guideId } = useParams<{ guideId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("questions");
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [includeInLibrary, setIncludeInLibrary] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [outcomes, setOutcomes] = useState<QuizOutcome[]>([]);
  const [leadCapture, setLeadCapture] = useState<LeadCaptureConfig>({
    enabled: true,
    required: true,
    headline: "Enter your details to reveal your personalized result",
  });
  const [theme, setTheme] = useState<QuizTheme>({
    primaryColor: "#2563EB",
    secondaryColor: "#10B981",
    backgroundColor: "#F8FAFC",
    fontFamily: "Inter",
  });
  const [presentationStyle, setPresentationStyle] = useState<
    "auto" | "editorial" | "basketball" | "golf" | "performance"
  >("auto");
  const [resolvedPresentationStyle, setResolvedPresentationStyle] = useState<
    "editorial" | "basketball" | "golf" | "performance"
  >("editorial");

  const quizQuery = useQuery<QuizEditorResponse>({
    queryKey: [`/api/quizzes/${guideId}`],
    enabled: Boolean(guideId),
    queryFn: async () => {
      const response = await fetch(`/api/quizzes/${guideId}`, { credentials: "include" });
      if (!response.ok) {
        const message = (await response.text()) || response.statusText;
        throw new Error(`${response.status}: ${message}`);
      }
      return (await response.json()) as QuizEditorResponse;
    },
  });

  const quizBrandScope = quizQuery.data
    ? quizQuery.data.guide.brandId ?? "personal"
    : null;

  const benefitAssetsQuery = useQuery<BenefitAsset[]>({
    queryKey: ["/api/benefit-assets", quizBrandScope],
    enabled: quizBrandScope !== null,
    queryFn: async () => {
      const response = await fetch(
        `/api/benefit-assets?brandId=${encodeURIComponent(String(quizBrandScope))}`,
        { credentials: "include" },
      );
      if (!response.ok) {
        const message = (await response.text()) || response.statusText;
        throw new Error(`${response.status}: ${message}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : data.assets || [];
    },
  });

  useEffect(() => {
    if (!quizQuery.data || isInitialized) return;

    const { guide, quiz } = quizQuery.data;
    setTitle(guide.title || "Untitled interactive quiz");
    setDescription(guide.description || "");
    setStatus(guide.status || "draft");
    setIncludeInLibrary(guide.includeInLibrary === true);
    setResolvedPresentationStyle(guide.presentationProfile?.preset || "editorial");
    setPresentationStyle(
      guide.presentationProfile?.mode === "manual"
        ? guide.presentationProfile.preset
        : "auto",
    );
    setQuestions(Array.isArray(quiz.questions) ? quiz.questions : []);
    setOutcomes(Array.isArray(quiz.outcomes) ? quiz.outcomes : []);
    setLeadCapture({
      enabled: quiz.leadCapture?.enabled ?? true,
      required: quiz.leadCapture?.required ?? true,
      headline:
        quiz.leadCapture?.headline || "Enter your details to reveal your personalized result",
    });
    setTheme({
      primaryColor: quiz.theme?.primaryColor || "#2563EB",
      secondaryColor: quiz.theme?.secondaryColor || "#10B981",
      backgroundColor: quiz.theme?.backgroundColor || "#F8FAFC",
      fontFamily: quiz.theme?.fontFamily || "Inter",
    });
    setIsInitialized(true);
  }, [isInitialized, quizQuery.data]);

  const savePayload = useMemo<QuizSavePayload>(
    () => ({
      title,
      description,
      questions,
      outcomes,
      leadCapture: {
        ...leadCapture,
        required: leadCapture.enabled ? leadCapture.required : false,
      },
      theme,
      presentationSelection: presentationStyle === "auto"
        ? { mode: "auto" }
        : { mode: "manual", preset: presentationStyle },
    }),
    [description, leadCapture, outcomes, presentationStyle, questions, theme, title],
  );

  const validationIssues = useMemo(() => {
    const issues: string[] = [];
    const outcomeIds = new Set(outcomes.map((outcome) => outcome.id));
    const referencedOutcomeIds = new Set<string>();
    if (!title.trim()) issues.push("Add a quiz title.");
    if (!description.trim()) issues.push("Add a quiz description.");
    if (questions.length < MIN_QUIZ_QUESTIONS) {
      issues.push(`Add at least ${MIN_QUIZ_QUESTIONS} questions.`);
    }
    if (outcomes.length < 2) issues.push("Add at least two outcomes.");
    if (!leadCapture.headline.trim()) issues.push("Add a lead-capture headline.");

    (["primaryColor", "secondaryColor", "backgroundColor"] as const).forEach((colorKey) => {
      if (!/^#[0-9A-F]{6}$/i.test(theme[colorKey] || "")) {
        issues.push(`${colorKey.replace("Color", " color")} must be a six-digit hex color.`);
      }
    });
    if (!theme.fontFamily?.trim()) issues.push("Add a quiz font family.");

    questions.forEach((question, questionIndex) => {
      if (!question.prompt.trim()) issues.push(`Question ${questionIndex + 1} needs a prompt.`);
      if (question.options.length !== QUIZ_ANSWER_COUNT) {
        issues.push(`Question ${questionIndex + 1} needs exactly ${QUIZ_ANSWER_COUNT} answers.`);
      }
      question.options.forEach((option, optionIndex) => {
        if (!option.label.trim()) {
          issues.push(`Answer ${optionIndex + 1} in question ${questionIndex + 1} needs text.`);
        }
        const mappedOutcomeIds = Object.keys(option.outcomeWeights || {});
        if (mappedOutcomeIds.length !== 1) {
          issues.push(`Map every answer in question ${questionIndex + 1} to one primary outcome.`);
        } else if (!outcomeIds.has(mappedOutcomeIds[0])) {
          issues.push(`Remap answer ${optionIndex + 1} in question ${questionIndex + 1}.`);
        } else {
          referencedOutcomeIds.add(mappedOutcomeIds[0]);
        }
      });
    });

    outcomes.forEach((outcome, outcomeIndex) => {
      if (!outcome.title.trim()) issues.push(`Outcome ${outcomeIndex + 1} needs a title.`);
      if (!outcome.summary.trim()) issues.push(`Outcome ${outcomeIndex + 1} needs a short summary.`);
      if (!outcome.description.trim()) issues.push(`Outcome ${outcomeIndex + 1} needs a full description.`);
      if (!outcome.recommendations.some((recommendation) => recommendation.trim())) {
        issues.push(`Outcome ${outcomeIndex + 1} needs at least one recommendation.`);
      } else if (outcome.recommendations.some((recommendation) => !recommendation.trim())) {
        issues.push(`Complete or remove blank recommendations in outcome ${outcomeIndex + 1}.`);
      }
      if (!referencedOutcomeIds.has(outcome.id)) {
        issues.push(`Map at least one answer to outcome ${outcomeIndex + 1}.`);
      }

      if (benefitAssetsQuery.data) {
        const assignedAssets = [
          { id: outcome.giftAssetId, kind: "free_gift", label: "free gift" },
          { id: outcome.ctaAssetId, kind: "cta", label: "CTA" },
        ];
        assignedAssets.forEach((assignment) => {
          if (assignment.id === null) return;
          const asset = benefitAssetsQuery.data.find((candidate) => candidate.id === assignment.id);
          if (!asset || asset.kind !== assignment.kind || asset.status !== "active") {
            issues.push(
              `Replace or remove the unavailable ${assignment.label} on outcome ${outcomeIndex + 1}.`,
            );
          }
        });
      }
    });

    return issues;
  }, [benefitAssetsQuery.data, description, leadCapture.headline, outcomes, questions, theme, title]);

  const saveQuizMutation = useMutation<QuizEditorResponse | null, Error, void>({
    mutationFn: async () => {
      const response = await apiRequest(`/api/quizzes/${guideId}`, "PUT", savePayload);
      const text = await response.text();
      return text ? JSON.parse(text) as QuizEditorResponse : null;
    },
    onSuccess: (data) => {
      setIsDirty(false);
      setStatus(data?.guide.status || "draft");
      queryClient.invalidateQueries({ queryKey: [`/api/quizzes/${guideId}`] });
      toast({ title: "Quiz saved", description: "Your latest authoring changes are safe." });
    },
    onError: (error) => {
      toast({
        title: "Could not save quiz",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const publishQuizMutation = useMutation<unknown, Error, void>({
    mutationFn: async () => {
      await apiRequest(`/api/quizzes/${guideId}`, "PUT", savePayload);
      const response = await apiRequest(`/api/quizzes/${guideId}/publish`, "POST");
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    },
    onSuccess: () => {
      setIsDirty(false);
      setStatus("published");
      queryClient.invalidateQueries({ queryKey: [`/api/quizzes/${guideId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/guides"] });
      toast({
        title: "Quiz published",
        description: "Your interactive quiz is ready to share.",
      });
    },
    onError: (error) => {
      toast({
        title: "Could not publish quiz",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateLibraryMutation = useMutation<unknown, Error, boolean, { previous: boolean }>({
    mutationFn: async (nextValue) => {
      const response = await apiRequest(`/api/guides/${guideId}/library`, "PATCH", {
        includeInLibrary: nextValue,
      });
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    },
    onMutate: (nextValue) => {
      const previous = includeInLibrary;
      setIncludeInLibrary(nextValue);
      return { previous };
    },
    onSuccess: (_, nextValue) => {
      queryClient.invalidateQueries({ queryKey: [`/api/quizzes/${guideId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/guides"] });
      toast({
        title: nextValue ? "Added to Library" : "Removed from Library",
        description: nextValue
          ? "Leads can discover this Interactive Quiz after it is published."
          : "The quiz remains available from its direct link.",
      });
    },
    onError: (error, _nextValue, context) => {
      if (context) setIncludeInLibrary(context.previous);
      toast({
        title: "Could not update Library",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markChanged = () => setIsDirty(true);

  const updateTitle = (nextTitle: string) => {
    setTitle(nextTitle);
    markChanged();
  };

  const updateDescription = (nextDescription: string) => {
    setDescription(nextDescription);
    markChanged();
  };

  const updateQuestion = (questionId: string, update: Partial<QuizQuestion>) => {
    setQuestions((current) =>
      current.map((question) => (question.id === questionId ? { ...question, ...update } : question)),
    );
    markChanged();
  };

  const updateOption = (questionId: string, optionId: string, update: Partial<QuizOption>) => {
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: question.options.map((option) =>
                option.id === optionId ? { ...option, ...update } : option,
              ),
            }
          : question,
      ),
    );
    markChanged();
  };

  const addQuestion = () => {
    const fallbackOutcomes = outcomes.map((outcome) => outcome.id);
    const answerLabels = ["First answer", "Second answer", "Third answer", "Fourth answer"];
    const newQuestion: QuizQuestion = {
      id: createLocalId("question"),
      prompt: "New question",
      helpText: "",
      options: answerLabels.map((label, answerIndex) => {
        const fallbackOutcomeId = fallbackOutcomes[answerIndex % Math.max(fallbackOutcomes.length, 1)];
        return {
          id: createLocalId("option"),
          label,
          outcomeWeights: fallbackOutcomeId ? { [fallbackOutcomeId]: 1 } : {},
        };
      }),
    };
    setQuestions((current) => [...current, newQuestion]);
    markChanged();
  };

  const removeQuestion = (questionId: string) => {
    setQuestions((current) => current.filter((question) => question.id !== questionId));
    markChanged();
  };

  const moveQuestion = (questionIndex: number, direction: -1 | 1) => {
    setQuestions((current) => {
      const targetIndex = questionIndex + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const reordered = [...current];
      [reordered[questionIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[questionIndex]];
      return reordered;
    });
    markChanged();
  };

  const addOption = (questionId: string) => {
    const fallbackOutcomeId = outcomes[0]?.id;
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: [
                ...question.options,
                {
                  id: createLocalId("option"),
                  label: "New answer",
                  outcomeWeights: fallbackOutcomeId ? { [fallbackOutcomeId]: 1 } : {},
                },
              ],
            }
          : question,
      ),
    );
    markChanged();
  };

  const removeOption = (questionId: string, optionId: string) => {
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId
          ? { ...question, options: question.options.filter((option) => option.id !== optionId) }
          : question,
      ),
    );
    markChanged();
  };

  const addOutcome = () => {
    const nextIndex = outcomes.length;
    setOutcomes((current) => [
      ...current,
      {
        id: createLocalId("outcome"),
        title: `Outcome ${nextIndex + 1}`,
        summary: "A concise description of who receives this result.",
        description: "Explain what this result means and why it matters.",
        recommendations: ["Add one useful next step"],
        giftAssetId: null,
        ctaAssetId: null,
        color: DEFAULT_OUTCOME_COLORS[nextIndex % DEFAULT_OUTCOME_COLORS.length],
      },
    ]);
    markChanged();
  };

  const updateOutcome = (outcomeId: string, update: Partial<QuizOutcome>) => {
    setOutcomes((current) =>
      current.map((outcome) => (outcome.id === outcomeId ? { ...outcome, ...update } : outcome)),
    );
    markChanged();
  };

  const removeOutcome = (outcomeId: string) => {
    setOutcomes((current) => current.filter((outcome) => outcome.id !== outcomeId));
    setQuestions((current) =>
      current.map((question) => ({
        ...question,
        options: question.options.map((option) => {
          if (!(outcomeId in option.outcomeWeights)) return option;
          const nextWeights = { ...option.outcomeWeights };
          delete nextWeights[outcomeId];
          return { ...option, outcomeWeights: nextWeights };
        }),
      })),
    );
    markChanged();
  };

  const updateLeadCapture = <K extends keyof LeadCaptureConfig>(key: K, value: LeadCaptureConfig[K]) => {
    setLeadCapture((current) => ({ ...current, [key]: value }));
    markChanged();
  };

  const updateTheme = <K extends keyof QuizTheme>(key: K, value: QuizTheme[K]) => {
    setTheme((current) => ({ ...current, [key]: value }));
    markChanged();
  };

  const openPreview = () => {
    const customUrl = quizQuery.data?.landingPage?.customUrl;
    if (status !== "published" || !customUrl) {
      toast({
        title: "Preview unavailable",
        description: "Publish this quiz before opening its public experience.",
        variant: "destructive",
      });
      return;
    }
    window.open(`/quiz/${customUrl}`, "_blank", "noopener,noreferrer");
  };

  const handlePreview = () => {
    openPreview();
  };

  if (!guideId) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center p-6">
          <Alert variant="destructive" className="max-w-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Quiz ID missing</AlertTitle>
            <AlertDescription>Return to the Lead Magnet Library and open the quiz again.</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (quizQuery.error) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center p-6">
          <Card className="max-w-lg">
            <CardContent className="p-8 text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-destructive" aria-hidden="true" />
              <h1 className="mt-4 text-xl font-semibold">Could not load this quiz</h1>
              <p className="mt-2 text-sm text-muted-foreground">{quizQuery.error.message}</p>
              <div className="mt-5 flex justify-center gap-2">
                <Button variant="outline" onClick={() => navigate("/content-library")}>Back to library</Button>
                <Button onClick={() => quizQuery.refetch()}>Try again</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (quizQuery.isLoading || !isInitialized) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden="true" />
            <p className="mt-3 text-sm text-muted-foreground">Loading quiz editor...</p>
          </div>
        </div>
      </div>
    );
  }

  const assets = benefitAssetsQuery.data || [];
  const giftAssets = assets.filter((asset) => asset.kind === "free_gift");
  const ctaAssets = assets.filter((asset) => asset.kind === "cta");

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-b border-border bg-card px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate("/content-library")} className="mt-1 shrink-0">
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Library
              </Button>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={statusClasses(status)}>{status}</Badge>
                  <Badge variant="secondary">Interactive Quiz</Badge>
                  {isDirty && <span className="text-xs font-medium text-amber-600">Unsaved changes</span>}
                </div>
                <Input
                  value={title}
                  onChange={(event) => updateTitle(event.target.value)}
                  aria-label="Quiz title"
                  placeholder="Quiz title"
                  className="h-auto border-0 bg-transparent p-0 text-xl font-bold shadow-none focus-visible:ring-0"
                />
                <Input
                  value={description}
                  onChange={(event) => updateDescription(event.target.value)}
                  aria-label="Quiz description"
                  placeholder="Add a short internal description..."
                  className="mt-1 h-auto border-0 bg-transparent p-0 text-sm text-muted-foreground shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={
                  saveQuizMutation.isPending ||
                  status !== "published" ||
                  !quizQuery.data?.landingPage?.customUrl
                }
                title={
                  status === "published"
                    ? isDirty
                      ? "Open the published version; unsaved edits are not included"
                      : "Open the live quiz"
                    : "Publish before previewing"
                }
              >
                <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
                {status === "published" ? "View live quiz" : "Preview after publish"}
              </Button>
              <Button
                onClick={() => saveQuizMutation.mutate()}
                disabled={saveQuizMutation.isPending || !isDirty || validationIssues.length > 0}
              >
                {saveQuizMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                {saveQuizMutation.isPending ? "Saving..." : "Save quiz"}
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-6xl">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid h-auto w-full grid-cols-1 gap-1 p-1 sm:grid-cols-3">
                <TabsTrigger value="questions" className="gap-2 py-2.5">
                  <ListChecks className="h-4 w-4" aria-hidden="true" />
                  Questions
                  <Badge variant="secondary" className="ml-1">{questions.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="outcomes" className="gap-2 py-2.5">
                  <Trophy className="h-4 w-4" aria-hidden="true" />
                  Outcomes &amp; CTAs
                  <Badge variant="secondary" className="ml-1">{outcomes.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="publish" className="gap-2 py-2.5">
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Capture &amp; Publish
                </TabsTrigger>
              </TabsList>

              <TabsContent value="questions" className="mt-6 space-y-5">
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
                    <div>
                      <h2 className="font-semibold text-blue-950">Build a short, decisive conversation</h2>
                      <p className="mt-1 text-sm text-blue-800/80">
                        Use at least five questions with four distinct answers each. Every answer maps to one primary outcome.
                      </p>
                    </div>
                    <Button onClick={addQuestion} disabled={questions.length >= 20}>
                      <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                      Add question
                    </Button>
                  </CardContent>
                </Card>

                {questions.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-14 text-center">
                      <ListChecks className="mx-auto h-10 w-10 text-muted-foreground/60" aria-hidden="true" />
                      <h2 className="mt-4 font-semibold">No questions yet</h2>
                      <p className="mt-1 text-sm text-muted-foreground">Add the first question to start shaping the quiz.</p>
                      <Button className="mt-5" onClick={addQuestion}>
                        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                        Add first question
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  questions.map((question, questionIndex) => (
                    <Card key={question.id}>
                      <CardHeader className="border-b bg-muted/20 pb-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                              {questionIndex + 1}
                            </div>
                            <div>
                              <CardTitle className="text-base">Question {questionIndex + 1}</CardTitle>
                              <p className="text-xs text-muted-foreground">{question.options.length} answer choices</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveQuestion(questionIndex, -1)}
                              disabled={questionIndex === 0}
                              aria-label={`Move question ${questionIndex + 1} up`}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveQuestion(questionIndex, 1)}
                              disabled={questionIndex === questions.length - 1}
                              aria-label={`Move question ${questionIndex + 1} down`}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeQuestion(question.id)}
                              disabled={questions.length <= MIN_QUIZ_QUESTIONS}
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              aria-label={`Delete question ${questionIndex + 1}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-5 p-5 sm:p-6">
                        <div className="grid gap-4 lg:grid-cols-3">
                          <div className="space-y-2 lg:col-span-2">
                            <Label htmlFor={`question-${question.id}`}>Question prompt</Label>
                            <Input
                              id={`question-${question.id}`}
                              value={question.prompt}
                              onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })}
                              placeholder="Ask one clear question"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`help-${question.id}`}>Helper text <span className="font-normal text-muted-foreground">(optional)</span></Label>
                            <Input
                              id={`help-${question.id}`}
                              value={question.helpText || ""}
                              onChange={(event) => updateQuestion(question.id, { helpText: event.target.value })}
                              placeholder="Add context if needed"
                            />
                          </div>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <Label>Answer choices</Label>
                            <span className="text-xs text-muted-foreground">
                              Exactly {QUIZ_ANSWER_COUNT} answers · map each to one primary outcome
                            </span>
                          </div>

                          {question.options.map((option, optionIndex) => {
                            const primaryOutcomeId = getPrimaryOutcomeId(option.outcomeWeights);
                            return (
                              <div key={option.id} className="grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.55fr)_auto] md:items-end">
                                <div className="space-y-1.5">
                                  <Label htmlFor={`option-${option.id}`} className="text-xs">Answer {optionIndex + 1}</Label>
                                  <Input
                                    id={`option-${option.id}`}
                                    value={option.label}
                                    onChange={(event) => updateOption(question.id, option.id, { label: event.target.value })}
                                    placeholder="Answer choice"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor={`mapping-${option.id}`} className="text-xs">Primary outcome</Label>
                                  <Select
                                    value={primaryOutcomeId}
                                    onValueChange={(outcomeId) =>
                                      updateOption(question.id, option.id, {
                                        outcomeWeights: outcomeId === "unmapped" ? {} : { [outcomeId]: 1 },
                                      })
                                    }
                                  >
                                    <SelectTrigger id={`mapping-${option.id}`}>
                                      <SelectValue placeholder="Choose outcome" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unmapped">Not mapped</SelectItem>
                                      {outcomes.map((outcome) => (
                                        <SelectItem key={outcome.id} value={outcome.id}>{outcome.title}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeOption(question.id, option.id)}
                                  disabled={question.options.length <= QUIZ_ANSWER_COUNT}
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  aria-label={`Delete answer ${optionIndex + 1}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addOption(question.id)}
                            disabled={question.options.length >= QUIZ_ANSWER_COUNT}
                          >
                            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                            Add answer
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="outcomes" className="mt-6 space-y-5">
                <Card className="border-purple-200 bg-purple-50/50">
                  <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
                    <div>
                      <h2 className="font-semibold text-purple-950">Make every result genuinely useful</h2>
                      <p className="mt-1 text-sm text-purple-800/80">
                        Explain the result, give a quick win, then point the visitor to one relevant gift and CTA.
                      </p>
                    </div>
                    <Button onClick={addOutcome} disabled={outcomes.length >= 8}>
                      <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                      Add outcome
                    </Button>
                  </CardContent>
                </Card>

                {benefitAssetsQuery.error && (
                  <Alert>
                    <Gift className="h-4 w-4" />
                    <AlertTitle>Benefit assets are unavailable</AlertTitle>
                    <AlertDescription>
                      You can keep editing outcomes and attach gifts or CTAs after the asset library reconnects.
                    </AlertDescription>
                  </Alert>
                )}

                {outcomes.map((outcome, outcomeIndex) => {
                  const fallbackColor = DEFAULT_OUTCOME_COLORS[outcomeIndex % DEFAULT_OUTCOME_COLORS.length];
                  const outcomeColor = normalizedColor(outcome.color, fallbackColor);
                  return (
                    <Card key={outcome.id} className="overflow-hidden">
                      <div className="h-1.5" style={{ backgroundColor: outcomeColor }} />
                      <CardHeader className="border-b bg-muted/20 pb-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ backgroundColor: outcomeColor }}>
                              <Trophy className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <div>
                              <CardTitle className="text-base">Outcome {outcomeIndex + 1}</CardTitle>
                              <p className="text-xs text-muted-foreground">Result ID: {outcome.id}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`outcome-color-${outcome.id}`} className="sr-only">Outcome color</Label>
                            <Input
                              id={`outcome-color-${outcome.id}`}
                              type="color"
                              value={outcomeColor}
                              onChange={(event) => updateOutcome(outcome.id, { color: event.target.value })}
                              className="h-9 w-12 cursor-pointer p-1"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeOutcome(outcome.id)}
                              disabled={outcomes.length <= 2}
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6 p-5 sm:p-6">
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`outcome-title-${outcome.id}`}>Outcome title</Label>
                            <Input
                              id={`outcome-title-${outcome.id}`}
                              value={outcome.title}
                              onChange={(event) => updateOutcome(outcome.id, { title: event.target.value })}
                              placeholder="The Consistency Builder"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`outcome-summary-${outcome.id}`}>Short result summary</Label>
                            <Input
                              id={`outcome-summary-${outcome.id}`}
                              value={outcome.summary}
                              onChange={(event) => updateOutcome(outcome.id, { summary: event.target.value })}
                              placeholder="Your fundamentals are strong; your routine needs structure."
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`outcome-description-${outcome.id}`}>What this result means</Label>
                          <Textarea
                            id={`outcome-description-${outcome.id}`}
                            value={outcome.description}
                            onChange={(event) => updateOutcome(outcome.id, { description: event.target.value })}
                            placeholder="Explain why this result fits and what the visitor should understand next."
                            rows={4}
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <Label>Recommended next steps</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateOutcome(outcome.id, { recommendations: [...outcome.recommendations, "New recommendation"] })}
                              disabled={outcome.recommendations.length >= 12}
                            >
                              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                              Add recommendation
                            </Button>
                          </div>
                          {outcome.recommendations.map((recommendation, recommendationIndex) => (
                            <div key={`${outcome.id}-recommendation-${recommendationIndex}`} className="flex items-center gap-2">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                {recommendationIndex + 1}
                              </span>
                              <Input
                                value={recommendation}
                                onChange={(event) => {
                                  const nextRecommendations = [...outcome.recommendations];
                                  nextRecommendations[recommendationIndex] = event.target.value;
                                  updateOutcome(outcome.id, { recommendations: nextRecommendations });
                                }}
                                aria-label={`Recommendation ${recommendationIndex + 1} for ${outcome.title}`}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  updateOutcome(outcome.id, {
                                    recommendations: outcome.recommendations.filter((_, index) => index !== recommendationIndex),
                                  })
                                }
                                disabled={outcome.recommendations.length <= 1}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                aria-label={`Delete recommendation ${recommendationIndex + 1}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <Separator />

                        <div className="grid gap-5 lg:grid-cols-2">
                          <QuizAssetPicker
                            id={`gift-asset-${outcome.id}`}
                            label="Free gift or recommended resource"
                            value={outcome.giftAssetId}
                            assets={giftAssets}
                            onChange={(giftAssetId) => updateOutcome(outcome.id, { giftAssetId })}
                            placeholder="Choose a benefit asset"
                            helpText="Give this outcome a useful resource before asking for the next action."
                            isLoading={benefitAssetsQuery.isLoading}
                          />
                          <QuizAssetPicker
                            id={`cta-asset-${outcome.id}`}
                            label="Primary call to action"
                            value={outcome.ctaAssetId}
                            assets={ctaAssets}
                            onChange={(ctaAssetId) => updateOutcome(outcome.id, { ctaAssetId })}
                            placeholder="Choose a CTA asset"
                            helpText="Use one obvious next step that matches this result."
                            isLoading={benefitAssetsQuery.isLoading}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {outcomes.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="py-14 text-center">
                      <Trophy className="mx-auto h-10 w-10 text-muted-foreground/60" aria-hidden="true" />
                      <h2 className="mt-4 font-semibold">No outcomes yet</h2>
                      <p className="mt-1 text-sm text-muted-foreground">Add at least two personalized results.</p>
                      <Button className="mt-5" onClick={addOutcome}>
                        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                        Add first outcome
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="publish" className="mt-6 space-y-6">
                <Card className="border-primary/20">
                  <CardContent className="flex items-start justify-between gap-4 p-5">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                        <LibraryBig className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div>
                        <Label htmlFor="quiz-editor-library" className="font-semibold">
                          Add this Interactive Quiz to your public Library
                        </Label>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                          Included quizzes give leads another reason to return as you publish new resources. Turn this off to keep the quiz direct-link only.
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="quiz-editor-library"
                      checked={includeInLibrary}
                      onCheckedChange={(checked) => updateLibraryMutation.mutate(checked)}
                      disabled={updateLibraryMutation.isPending}
                      aria-label="Add this Interactive Quiz to your public Library"
                    />
                  </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-5">
                  <Card className="lg:col-span-3">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
                        Lead capture
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                        <div>
                          <Label htmlFor="capture-enabled">Capture contact details</Label>
                          <p className="mt-1 text-xs text-muted-foreground">Show the form after the final answer and before the personalized result.</p>
                        </div>
                        <Switch
                          id="capture-enabled"
                          checked={leadCapture.enabled}
                          onCheckedChange={(checked) => updateLeadCapture("enabled", checked)}
                        />
                      </div>

                      <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                        <div>
                          <Label htmlFor="capture-required">Require contact details</Label>
                          <p className="mt-1 text-xs text-muted-foreground">Keep the result gated until the visitor submits the form.</p>
                        </div>
                        <Switch
                          id="capture-required"
                          checked={leadCapture.enabled && leadCapture.required}
                          onCheckedChange={(checked) => updateLeadCapture("required", checked)}
                          disabled={!leadCapture.enabled}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="capture-headline">Form headline</Label>
                        <Input
                          id="capture-headline"
                          value={leadCapture.headline}
                          onChange={(event) => updateLeadCapture("headline", event.target.value)}
                          disabled={!leadCapture.enabled}
                        />
                        <p className="text-xs text-muted-foreground">Reinforce that their personalized result is ready.</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Palette className="h-5 w-5 text-purple-600" aria-hidden="true" />
                        Quiz theme
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {([
                        { key: "primaryColor", label: "Primary color", fallback: "#2563EB" },
                        { key: "secondaryColor", label: "Secondary color", fallback: "#10B981" },
                        { key: "backgroundColor", label: "Background", fallback: "#F8FAFC" },
                      ] as const).map(({ key, label, fallback }) => {
                        const color = normalizedColor(theme[key] as string | undefined, fallback);
                        return (
                          <div key={key} className="space-y-2">
                            <Label htmlFor={`theme-${key}`}>{label}</Label>
                            <div className="flex gap-2">
                              <Input
                                id={`theme-${key}`}
                                type="color"
                                value={color}
                                onChange={(event) => updateTheme(key, event.target.value)}
                                className="h-10 w-14 cursor-pointer p-1"
                              />
                              <Input
                                value={(theme[key] as string) || fallback}
                                onChange={(event) => updateTheme(key, event.target.value)}
                                aria-label={`${label} hex value`}
                                className="font-mono text-sm"
                              />
                            </div>
                          </div>
                        );
                      })}
                      <div className="space-y-2">
                        <Label htmlFor="theme-font">Font family</Label>
                        <Input
                          id="theme-font"
                          value={(theme.fontFamily as string) || "Inter"}
                          onChange={(event) => updateTheme("fontFamily", event.target.value)}
                          placeholder="Inter"
                        />
                      </div>
                      <div className="space-y-2 border-t pt-4">
                        <Label htmlFor="presentation-style">Recipient experience</Label>
                        <Select
                          value={presentationStyle}
                          onValueChange={(value: typeof presentationStyle) => {
                            setPresentationStyle(value);
                            markChanged();
                          }}
                        >
                          <SelectTrigger id="presentation-style">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto-detect from source</SelectItem>
                            <SelectItem value="basketball">Basketball · Arena energy</SelectItem>
                            <SelectItem value="golf">Golf · Course precision</SelectItem>
                            <SelectItem value="performance">Performance · Training lab</SelectItem>
                            <SelectItem value="editorial">Editorial · Clean report</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs leading-5 text-muted-foreground">
                          {presentationStyle === "auto"
                            ? `Currently detected: ${resolvedPresentationStyle}. Saving rechecks the stored source.`
                            : "This changes composition and sport cues while preserving the brand theme above."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden="true" />
                      Publish checklist
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-lg border p-4">
                        <ListChecks className="h-5 w-5 text-blue-600" aria-hidden="true" />
                        <p className="mt-3 text-2xl font-bold">{questions.length}</p>
                        <p className="text-xs text-muted-foreground">Questions · 5 minimum</p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <Trophy className="h-5 w-5 text-purple-600" aria-hidden="true" />
                        <p className="mt-3 text-2xl font-bold">{outcomes.length}</p>
                        <p className="text-xs text-muted-foreground">Outcomes</p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <Gift className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                        <p className="mt-3 text-2xl font-bold">{outcomes.filter((outcome) => outcome.giftAssetId !== null).length}</p>
                        <p className="text-xs text-muted-foreground">Gifts attached</p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <Target className="h-5 w-5 text-orange-600" aria-hidden="true" />
                        <p className="mt-3 text-2xl font-bold">{outcomes.filter((outcome) => outcome.ctaAssetId !== null).length}</p>
                        <p className="text-xs text-muted-foreground">Outcome CTAs</p>
                      </div>
                    </div>

                    {validationIssues.length > 0 ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Finish these items before publishing</AlertTitle>
                        <AlertDescription>
                          <ul className="mt-2 list-disc space-y-1 pl-5">
                            {validationIssues.slice(0, 8).map((issue) => <li key={issue}>{issue}</li>)}
                            {validationIssues.length > 8 && <li>And {validationIssues.length - 8} more items.</li>}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert className="border-green-200 bg-green-50 text-green-900">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertTitle>Ready to publish</AlertTitle>
                        <AlertDescription>Every answer is mapped and every outcome has the required result copy.</AlertDescription>
                      </Alert>
                    )}

                    <div className="flex flex-col items-start justify-between gap-4 rounded-xl border bg-muted/20 p-5 sm:flex-row sm:items-center">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary">
                          {leadCapture.enabled && leadCapture.required ? (
                            <LockKeyhole className="h-5 w-5" aria-hidden="true" />
                          ) : (
                            <Users className="h-5 w-5" aria-hidden="true" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">
                            {leadCapture.enabled
                              ? leadCapture.required
                                ? "Results are gated"
                                : "Lead capture is optional"
                              : "Lead capture is off"}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Publishing saves this draft first, then makes the quiz available at its landing-page URL.
                          </p>
                        </div>
                      </div>
                      <Button
                        size="lg"
                        onClick={() => publishQuizMutation.mutate()}
                        disabled={publishQuizMutation.isPending || validationIssues.length > 0}
                        className="min-w-40"
                      >
                        {publishQuizMutation.isPending ? (
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Send className="mr-2 h-5 w-5" aria-hidden="true" />
                        )}
                        {publishQuizMutation.isPending ? "Publishing..." : status === "published" ? "Republish quiz" : "Publish quiz"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>

        <div className="border-t bg-card px-4 py-2 text-xs text-muted-foreground sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5">
              <CircleDot className={`h-3.5 w-3.5 ${isDirty ? "text-amber-500" : "text-green-500"}`} aria-hidden="true" />
              {isDirty ? "Changes have not been saved" : "All changes saved"}
            </span>
            {quizQuery.data?.landingPage?.customUrl && status === "published" && (
              <button type="button" onClick={openPreview} className="inline-flex items-center font-medium text-primary hover:underline">
                /quiz/{quizQuery.data.landingPage.customUrl}
                <ExternalLink className="ml-1 h-3 w-3" aria-hidden="true" />
              </button>
            )}
            {quizQuery.data?.landingPage?.customUrl && status !== "published" && (
              <span>/quiz/{quizQuery.data.landingPage.customUrl} · available after publish</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
