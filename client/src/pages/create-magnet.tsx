import { FormEvent, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowRight,
  BookOpen,
  Check,
  FileText,
  Lightbulb,
  ListChecks,
  Loader2,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";

interface GenerateQuizRequest {
  title: string;
  sourceContent: string;
  audience: string;
  objective: string;
  questionCount: number;
  outcomeCount: number;
  leadCapture: {
    enabled: boolean;
    required: boolean;
    headline: string;
  };
}

interface GenerateQuizResponse {
  guide: { id: number; title?: string };
  quiz: unknown;
  landingPage: unknown;
}

const DEFAULT_LEAD_HEADLINE = "Enter your details to reveal your personalized result";

export default function CreateMagnet() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<"quiz" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<GenerateQuizRequest>({
    title: "",
    sourceContent: "",
    audience: "",
    objective: "",
    questionCount: 6,
    outcomeCount: 3,
    leadCapture: {
      enabled: true,
      required: true,
      headline: DEFAULT_LEAD_HEADLINE,
    },
  });

  const generateQuizMutation = useMutation<GenerateQuizResponse, Error, GenerateQuizRequest>({
    mutationFn: async (payload) => {
      const response = await apiRequest("/api/quizzes/generate", "POST", payload);
      return (await response.json()) as GenerateQuizResponse;
    },
    onSuccess: (data) => {
      if (!data.guide?.id) {
        setFormError("The quiz was generated, but its editor link was missing. Please try again.");
        return;
      }

      toast({
        title: "Quiz generated",
        description: "Your questions and outcomes are ready to review.",
      });
      navigate(`/quiz-editor/${data.guide.id}`);
    },
    onError: (error) => {
      const message = error.message || "We could not generate this quiz. Please try again.";
      setFormError(message);
      toast({
        title: "Quiz generation failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const updateLeadCapture = <K extends keyof GenerateQuizRequest["leadCapture"]>(
    key: K,
    value: GenerateQuizRequest["leadCapture"][K],
  ) => {
    setForm((current) => ({
      ...current,
      leadCapture: { ...current.leadCapture, [key]: value },
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!form.title.trim()) {
      setFormError("Give your quiz a working title before generating it.");
      return;
    }

    if (form.sourceContent.trim().length < 50) {
      setFormError("Paste at least 50 characters so VidMagnet has enough content to build the quiz.");
      return;
    }

    if (!form.audience.trim()) {
      setFormError("Describe who should take this quiz.");
      return;
    }

    if (!form.objective.trim()) {
      setFormError("Describe what the quiz should reveal.");
      return;
    }

    generateQuizMutation.mutate({
      ...form,
      title: form.title.trim(),
      sourceContent: form.sourceContent.trim(),
      audience: form.audience.trim(),
      objective: form.objective.trim(),
      leadCapture: {
        ...form.leadCapture,
        required: form.leadCapture.enabled ? form.leadCapture.required : false,
        headline: form.leadCapture.headline.trim() || DEFAULT_LEAD_HEADLINE,
      },
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-card px-6 py-4">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Badge variant="secondary">New lead magnet</Badge>
                <span className="text-xs text-muted-foreground">AI-assisted</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground">What do you want to create?</h1>
              <p className="mt-1 text-muted-foreground">
                Turn one source into a useful free resource or a personalized interactive quiz.
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <section aria-labelledby="magnet-type-heading">
              <h2 id="magnet-type-heading" className="sr-only">
                Choose a lead magnet type
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => navigate("/create/guide")}
                  className="group rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-md">
                    <CardHeader>
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                          <BookOpen className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <Badge variant="outline">Classic</Badge>
                      </div>
                      <CardTitle className="flex items-center justify-between gap-2">
                        Lead Magnet
                        <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Create a branded guide, report, SOP, or workout from your video, document, audio, or transcript.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-muted px-2.5 py-1">Guides</span>
                        <span className="rounded-full bg-muted px-2.5 py-1">Landing pages</span>
                        <span className="rounded-full bg-muted px-2.5 py-1">PDF delivery</span>
                      </div>
                    </CardContent>
                  </Card>
                </button>

                <button
                  type="button"
                  aria-pressed={selectedType === "quiz"}
                  onClick={() => setSelectedType("quiz")}
                  className="group rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Card
                    className={`h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md ${
                      selectedType === "quiz"
                        ? "border-primary ring-2 ring-primary/20"
                        : "group-hover:border-primary/40"
                    }`}
                  >
                    <CardHeader>
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="rounded-xl bg-purple-100 p-3 text-purple-700">
                          <Trophy className="h-6 w-6" aria-hidden="true" />
                        </div>
                        <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Interactive</Badge>
                      </div>
                      <CardTitle className="flex items-center justify-between gap-2">
                        Interactive Quiz
                        {selectedType === "quiz" ? (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="h-4 w-4" aria-hidden="true" />
                          </span>
                        ) : (
                          <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Ask a few focused questions, reveal a personalized result, and match every lead to the right next step.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-muted px-2.5 py-1">Segmentation</span>
                        <span className="rounded-full bg-muted px-2.5 py-1">Outcome CTAs</span>
                        <span className="rounded-full bg-muted px-2.5 py-1">Lead capture</span>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              </div>
            </section>

            {selectedType === "quiz" && (
              <form onSubmit={handleSubmit} className="space-y-6" aria-labelledby="quiz-brief-heading">
                <Card className="overflow-hidden">
                  <CardHeader className="border-b bg-muted/30">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-primary/10 p-2 text-primary">
                        <FileText className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div>
                        <CardTitle id="quiz-brief-heading">Paste your source content</CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          VidMagnet will find the most useful distinctions, questions, and personalized outcomes.
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5 p-6">
                    <div className="space-y-2">
                      <Label htmlFor="quiz-title">Quiz title</Label>
                      <Input
                        id="quiz-title"
                        value={form.title}
                        onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                        placeholder="What type of golfer are you?"
                        autoComplete="off"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <Label htmlFor="source-content">Content</Label>
                        <span className="text-xs text-muted-foreground">
                          {form.sourceContent.length.toLocaleString()} characters
                        </span>
                      </div>
                      <Textarea
                        id="source-content"
                        value={form.sourceContent}
                        onChange={(event) => setForm((current) => ({ ...current, sourceContent: event.target.value }))}
                        placeholder="Paste an article, transcript, coaching framework, lesson, or other source material here..."
                        className="min-h-64 resize-y leading-relaxed"
                        minLength={50}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimum 50 characters. Strong source material includes clear viewpoints, common mistakes,
                        stages, or recommendations.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="quiz-audience">Who is this for?</Label>
                        <div className="relative">
                          <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          <Input
                            id="quiz-audience"
                            value={form.audience}
                            onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value }))}
                            placeholder="Busy amateur golfers"
                            className="pl-9"
                            maxLength={500}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="quiz-objective">What should the quiz reveal?</Label>
                        <div className="relative">
                          <Target className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          <Input
                            id="quiz-objective"
                            value={form.objective}
                            onChange={(event) => setForm((current) => ({ ...current, objective: event.target.value }))}
                            placeholder="Their biggest swing improvement opportunity"
                            className="pl-9"
                            maxLength={500}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6 lg:grid-cols-5">
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <ListChecks className="h-5 w-5 text-primary" aria-hidden="true" />
                        Quiz shape
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="question-count">Questions</Label>
                          <Badge variant="secondary">{form.questionCount}</Badge>
                        </div>
                        <Input
                          id="question-count"
                          type="range"
                          min={3}
                          max={12}
                          value={form.questionCount}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, questionCount: Number(event.target.value) }))
                          }
                          className="h-2 cursor-pointer border-0 p-0"
                        />
                        <p className="text-xs text-muted-foreground">Six questions is a strong default for a quick result.</p>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="outcome-count">Outcomes</Label>
                          <Badge variant="secondary">{form.outcomeCount}</Badge>
                        </div>
                        <Input
                          id="outcome-count"
                          type="range"
                          min={2}
                          max={6}
                          value={form.outcomeCount}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, outcomeCount: Number(event.target.value) }))
                          }
                          className="h-2 cursor-pointer border-0 p-0"
                        />
                        <p className="text-xs text-muted-foreground">Three outcomes keep recommendations distinct and manageable.</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-3">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Lightbulb className="h-5 w-5 text-amber-500" aria-hidden="true" />
                        Lead capture
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                        <div>
                          <Label htmlFor="lead-capture-enabled" className="font-medium">Capture leads before the result</Label>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Ask for contact details after the visitor has completed the questions.
                          </p>
                        </div>
                        <Switch
                          id="lead-capture-enabled"
                          checked={form.leadCapture.enabled}
                          onCheckedChange={(checked) => updateLeadCapture("enabled", checked)}
                        />
                      </div>

                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Label htmlFor="lead-capture-required">Require the form</Label>
                          <p className="mt-1 text-xs text-muted-foreground">Visitors must submit before their result is revealed.</p>
                        </div>
                        <Switch
                          id="lead-capture-required"
                          checked={form.leadCapture.enabled && form.leadCapture.required}
                          onCheckedChange={(checked) => updateLeadCapture("required", checked)}
                          disabled={!form.leadCapture.enabled}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lead-capture-headline">Form headline</Label>
                        <Input
                          id="lead-capture-headline"
                          value={form.leadCapture.headline}
                          onChange={(event) => updateLeadCapture("headline", event.target.value)}
                          disabled={!form.leadCapture.enabled}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {formError && (
                  <Alert variant="destructive">
                    <AlertTitle>Could not generate quiz</AlertTitle>
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}

                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-semibold">Ready for a first draft?</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        You can edit every question, outcome, free gift, and CTA before publishing.
                      </p>
                    </div>
                    <Button type="submit" size="lg" disabled={generateQuizMutation.isPending} className="min-w-48">
                      {generateQuizMutation.isPending ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Sparkles className="mr-2 h-5 w-5" aria-hidden="true" />
                      )}
                      {generateQuizMutation.isPending ? "Generating quiz..." : "Generate interactive quiz"}
                    </Button>
                  </CardContent>
                </Card>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
