import { useId, useState } from "react";
import {
  ArrowRight, BookOpenCheck, Check, Clock3, FileQuestion,
  FileText, Gift, ListChecks, Sparkles, Target,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  marketingGuideChecklist, marketingGuideFixture, marketingGuideSteps, marketingGuideWorksheet,
  marketingQuizFixture, marketingQuizResultFixture, marketingQuizSelectedOptionId, marketingSourceFixture,
} from "@/components/marketing/artifact-fixtures";

type OutputKind = "guide" | "quiz";
const monoFont = { fontFamily: '"IBM Plex Mono", monospace' };
const sansFont = { fontFamily: '"DM Sans", "Helvetica Neue", Arial, sans-serif' };
function SourceProof() {
  return (
    <aside
      aria-label="Example source content"
      className="relative border-y border-[#101419]/[0.15] py-6 lg:border-y-0 lg:border-l lg:py-2 lg:pl-6"
    >
      <div className="flex items-center gap-2 text-[#3157F6]">
        <FileText className="h-4 w-4" aria-hidden="true" />
        <p className="text-xs font-bold uppercase tracking-[0.12em]" style={monoFont}>
          {marketingSourceFixture.label}
        </p>
      </div>
      <p className="mt-3 text-xs font-semibold text-[#101419]/[0.45]">
        {marketingSourceFixture.format}
      </p>
      <h3 className="mt-3 text-xl font-bold leading-tight tracking-[-0.025em] text-[#101419]">
        {marketingSourceFixture.title}
      </h3>
      <ol className="mt-6 space-y-4">
        {marketingSourceFixture.lines.map((line, index) => (
          <li key={line.id} className="grid grid-cols-[1.5rem_1fr] gap-2 text-sm leading-6 text-[#101419]/[0.68]">
            <span className="pt-0.5 text-[10px] font-bold text-[#C84622]" style={monoFont}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{line.text}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

function MagneticSnapline() {
  return (
    <div className="hidden h-full items-center justify-center lg:flex" aria-hidden="true">
      <svg className="h-28 w-14 overflow-visible" viewBox="0 0 56 112" fill="none">
        <path
          d="M3 76 C18 76 15 35 35 35 C46 35 45 52 53 52"
          stroke="#FF6B3D"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M49 47 L54 52 L49 57" stroke="#FF6B3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="3" cy="76" r="3" fill="#FF6B3D" />
      </svg>
    </div>
  );
}

function ArtifactHeader({ kind }: { kind: OutputKind }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.12] pb-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#79D9C7] font-black text-[#101419]">
          NC
        </span>
        <div>
          <p className="text-sm font-bold text-white">Northstar Coaching</p>
          <p className="mt-0.5 text-xs text-white/[0.45]">Fictional example brand</p>
        </div>
      </div>
      <span className="inline-flex min-h-8 items-center rounded-full border border-white/[0.15] px-3 text-xs font-bold text-white/[0.68]">
        {kind === "guide" ? "Guide" : "Interactive Quiz"}
      </span>
    </header>
  );
}

function GuideOutput() {
  const quickStart = marketingGuideFixture.quickStart;
  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none" style={{ animationDuration: "250ms" }}>
      <ArtifactHeader kind="guide" />
      <div className="pt-6">
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.11em] text-[#79D9C7]" style={monoFont}>
          <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
          Built for implementation
        </div>
        <h3 className="mt-4 text-[clamp(2rem,3.2vw,3.25rem)] font-bold leading-[0.98] tracking-[-0.045em] text-white">
          {marketingGuideFixture.title}
        </h3>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-white/[0.62]">
          {marketingGuideFixture.promise}
        </p>

        {quickStart ? (
          <section className="mt-6 grid gap-3 border-y border-white/[0.12] py-5 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold text-[#79D9C7]">
                <Target className="h-4 w-4" aria-hidden="true" />
                Quick start
              </p>
              <p className="mt-2 text-sm leading-6 text-white/[0.72]">{quickStart.desiredOutcome}</p>
            </div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-white/[0.55]">
              <Clock3 className="h-4 w-4 text-[#FF6B3D]" aria-hidden="true" />
              {quickStart.timeRequired}
            </span>
          </section>
        ) : null}

        <section className="mt-6" aria-labelledby="example-guide-steps">
          <h4 id="example-guide-steps" className="flex items-center gap-2 text-sm font-bold text-white">
            <ListChecks className="h-4 w-4 text-[#79D9C7]" aria-hidden="true" />
            {marketingGuideSteps.title}
          </h4>
          <ol className="mt-4 grid gap-3 md:grid-cols-3">
            {marketingGuideSteps.items.map((step, index) => (
              <li key={step.id} className="border-l border-white/[0.16] pl-3">
                <span className="text-[10px] font-bold text-[#FF8C68]" style={monoFont}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="mt-1 text-sm font-bold leading-5 text-white">{step.title}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-6 grid gap-4 border-t border-white/[0.12] pt-5 sm:grid-cols-[0.8fr_1.2fr]">
          <section aria-label={marketingGuideChecklist.title || "Guide checklist"}>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-white/[0.45]" style={monoFont}>
              Checklist
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {marketingGuideChecklist.items.map((item) => (
                <li key={item.id} className="inline-flex items-center gap-2 text-xs font-semibold text-white/[0.75]">
                  <Check className="h-3.5 w-3.5 text-[#79D9C7]" aria-hidden="true" />
                  {item.text}
                </li>
              ))}
            </ul>
          </section>
          <section className="sm:border-l sm:border-white/[0.12] sm:pl-4" aria-label={marketingGuideWorksheet.title}>
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-white/[0.45]" style={monoFont}>
              {marketingGuideWorksheet.title}
            </p>
            <ul className="mt-3 space-y-2">
              {marketingGuideWorksheet.prompts.map((prompt) => (
                <li key={prompt.id} className="text-xs font-semibold leading-5 text-white/[0.75]">
                  {prompt.prompt}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function QuizOutput() {
  const question = marketingQuizFixture.questions[0];
  const selectedOption = question.options.find((option) => option.id === marketingQuizSelectedOptionId);
  const result = marketingQuizResultFixture;
  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none" style={{ animationDuration: "250ms" }}>
      <ArtifactHeader kind="quiz" />
      <div className="pt-6">
        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.11em] text-[#A8B7FF]" style={monoFont}>
          <FileQuestion className="h-4 w-4" aria-hidden="true" />
          Diagnostic outcome
        </div>
        <h3 className="mt-4 text-[clamp(2rem,3.2vw,3.25rem)] font-bold leading-[0.98] tracking-[-0.045em] text-white">
          {marketingQuizFixture.title}
        </h3>

        <section className="mt-6 border-y border-white/[0.12] py-5" aria-labelledby="example-quiz-question">
          <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-white/[0.38]" style={monoFont}>
            Example question
          </p>
          <h4 id="example-quiz-question" className="mt-2 text-sm font-bold leading-6 text-white">
            {question.prompt}
          </h4>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#FF6B3D]/[0.45] bg-[#FF6B3D]/[0.10] px-3 py-2 text-xs font-semibold text-white/[0.78]">
            <span className="h-2 w-2 rounded-full bg-[#FF6B3D]" aria-hidden="true" />
            {selectedOption?.label}
          </p>
        </section>

        <section className="pt-6" aria-labelledby="example-quiz-outcome">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.11em] text-[#79D9C7]" style={monoFont}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Example outcome
          </p>
          <h4 id="example-quiz-outcome" className="mt-3 text-3xl font-bold tracking-[-0.035em] text-white">
            {result.outcome.title}
          </h4>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/[0.65]">{result.outcome.summary}</p>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2">
            {result.outcome.recommendations.map((recommendation, index) => (
              <li key={recommendation} className="flex gap-3 border-l border-white/[0.16] pl-3 text-xs leading-5 text-white/[0.72]">
                <span className="font-bold text-[#79D9C7]" style={monoFont}>{String(index + 1).padStart(2, "0")}</span>
                {recommendation}
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/[0.12] pt-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[#79D9C7]/[0.15] text-[#79D9C7]">
              <Gift className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/[0.38]" style={monoFont}>Relevant free gift</p>
              <p className="mt-1 text-sm font-bold text-white">{result.gift?.title}</p>
            </div>
          </div>
          <span className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#FF6B3D] px-4 text-center text-xs font-bold text-[#101419]" aria-label={`Example call to action: ${result.cta?.title}`}>
            {result.cta?.title}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </div>
  );
}

export function ArtifactProof() {
  const [selectedOutput, setSelectedOutput] = useState<OutputKind>("guide");
  const titleId = useId();
  const descriptionId = useId();
  return (
    <figure
      className="relative overflow-hidden rounded-[24px] border border-[#101419]/[0.12] bg-[#FBF8F2] p-4 shadow-[0_24px_70px_rgba(16,20,25,0.12)] sm:p-6"
      style={sansFont}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p id={titleId} className="text-xs font-bold uppercase tracking-[0.12em] text-[#C84622]" style={monoFont}>
          One source, two useful outputs
        </p>
        <p className="text-xs font-medium text-[#101419]/[0.52]">Example output using synthetic source content</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.72fr)_56px_minmax(0,1.28fr)] lg:items-center lg:gap-3">
        <SourceProof />
        <MagneticSnapline />

        <Tabs
          value={selectedOutput}
          onValueChange={(value) => {
            if (value === "guide" || value === "quiz") setSelectedOutput(value);
          }}
          className="min-w-0"
        >
          <div className="mb-3 flex justify-start lg:justify-end">
            <TabsList
              aria-label="Choose an example output"
              className="h-auto min-h-11 rounded-full border border-[#101419]/[0.12] bg-white p-1 text-[#101419]/[0.52]"
            >
              <TabsTrigger
                value="guide"
                className="min-h-9 rounded-full px-4 text-xs font-bold data-[state=active]:bg-[#101419] data-[state=active]:text-white data-[state=active]:shadow-none"
              >
                Guide
              </TabsTrigger>
              <TabsTrigger
                value="quiz"
                className="min-h-9 rounded-full px-4 text-xs font-bold data-[state=active]:bg-[#101419] data-[state=active]:text-white data-[state=active]:shadow-none"
              >
                Interactive Quiz
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-0 overflow-hidden rounded-[24px] bg-[#101419] p-5 text-white shadow-[0_22px_60px_rgba(16,20,25,0.2)] sm:p-7 lg:min-h-[560px]">
            <TabsContent value="guide" className="mt-0 focus-visible:ring-[#79D9C7] focus-visible:ring-offset-[#101419]">
              <GuideOutput />
            </TabsContent>
            <TabsContent value="quiz" className="mt-0 focus-visible:ring-[#79D9C7] focus-visible:ring-offset-[#101419]">
              <QuizOutput />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <figcaption id={descriptionId} className="sr-only">
        The same coaching lesson becomes either a step-by-step implementation Guide or a personalized Interactive Quiz. Guide is selected by default; use the arrow, Home, and End keys while focused on the output tabs to change examples.
      </figcaption>
    </figure>
  );
}
