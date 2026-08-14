import { useMemo, useState, type CSSProperties } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  Check,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Clock3,
  Copy,
  Gauge,
  Lightbulb,
  ListChecks,
  Milestone,
  PenLine,
  PlayCircle,
  Table2,
  Target,
  Wrench,
} from "lucide-react";
import {
  normalizeGuideContent,
  type GuideBlock,
  type GuideContentV2,
} from "@shared/guideContent";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface GuideContentRendererProps {
  content: unknown;
  youtubeUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  headingFontFamily?: string;
  fontFamily?: string;
  surfaceColor?: string;
  textColor?: string;
  borderRadius?: string;
  className?: string;
}

type BlockContext = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  borderRadius: string;
  completedItems: Set<string>;
  toggleChecklistItem: (id: string) => void;
  worksheetValues: Record<string, string>;
  setWorksheetValue: (id: string, value: string) => void;
  copiedTemplateId: string | null;
  copyTemplate: (id: string, body: string) => void;
};

function tint(hex: string, alpha: string) {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex + alpha : "rgba(15, 23, 42, 0.06)";
}

function sectionIcon(type: GuideContentV2["sections"][number]["type"]) {
  switch (type) {
    case "drill":
      return Target;
    case "technique":
      return BookOpenCheck;
    case "equipment":
      return ClipboardCheck;
    default:
      return Lightbulb;
  }
}

function formatLabel(format: GuideContentV2["format"]) {
  return format.replace(/_/g, " ");
}

function sourceUrl(youtubeUrl: string, timestampSeconds?: number) {
  try {
    const url = new URL(youtubeUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    if (timestampSeconds !== undefined) {
      url.searchParams.set("t", Math.floor(timestampSeconds).toString() + "s");
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

function BlockRenderer({ block, blockKey, context }: {
  block: GuideBlock;
  blockKey: string;
  context: BlockContext;
}) {
  const sharedCardStyle = {
    borderRadius: context.borderRadius,
    borderColor: tint(context.primaryColor, "22"),
  };

  if (block.type === "rich_text") {
    return <p className="whitespace-pre-line text-base leading-8 text-slate-700">{block.text}</p>;
  }

  if (block.type === "steps") {
    return (
      <div className="space-y-3">
        {block.title ? <h4 className="text-lg font-semibold text-slate-900">{block.title}</h4> : null}
        {block.items.map((step) => (
          <article key={step.id} className="border bg-white p-5" style={sharedCardStyle}>
            <div className="flex items-start gap-4">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                style={{ backgroundColor: tint(context.primaryColor, "16"), color: context.primaryColor }}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h5 className="font-semibold text-slate-900">{step.title}</h5>
                  {step.duration ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                      <Clock3 className="h-3.5 w-3.5" />
                      {step.duration}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{step.instruction}</p>
                {step.why ? (
                  <div className="mt-3 flex items-start gap-2 text-sm text-slate-600">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" style={{ color: context.accentColor }} />
                    <span><strong className="text-slate-800">Why it matters:</strong> {step.why}</span>
                  </div>
                ) : null}
                {step.successCriteria ? (
                  <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                    <strong>Completion check:</strong> {step.successCriteria}
                  </div>
                ) : null}
                {step.commonMistake || step.fix ? (
                  <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
                    {step.commonMistake ? <p><strong>Watch for:</strong> {step.commonMistake}</p> : null}
                    {step.fix ? <p className={step.commonMistake ? "mt-1" : ""}><strong>Fix:</strong> {step.fix}</p> : null}
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  }

  if (block.type === "checklist") {
    const completedCount = block.items.filter((item) => context.completedItems.has(blockKey + ":" + item.id)).length;
    return (
      <div className="border bg-white p-5" style={sharedCardStyle}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5" style={{ color: context.secondaryColor }} />
            <h4 className="text-lg font-semibold text-slate-900">{block.title || "Implementation checklist"}</h4>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {completedCount} of {block.items.length} complete
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {block.items.map((item) => {
            const itemKey = blockKey + ":" + item.id;
            const checked = context.completedItems.has(itemKey);
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => context.toggleChecklistItem(itemKey)}
                className="flex w-full items-start gap-3 rounded-lg border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{ outlineColor: context.primaryColor }}
                aria-pressed={checked}
              >
                <span
                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border"
                  style={checked
                    ? { backgroundColor: context.secondaryColor, borderColor: context.secondaryColor, color: "white" }
                    : { borderColor: tint(context.primaryColor, "45") }}
                >
                  {checked ? <Check className="h-3 w-3" /> : null}
                </span>
                <span className="min-w-0">
                  <span className={checked ? "text-sm font-medium text-slate-500 line-through" : "text-sm font-medium text-slate-800"}>
                    {item.text}
                    {item.required ? <span className="ml-1 text-rose-600" aria-label="required">*</span> : null}
                  </span>
                  {item.why ? <span className="mt-1 block text-xs leading-5 text-slate-500">{item.why}</span> : null}
                  {item.evidence ? <span className="mt-1 block text-xs leading-5 text-slate-500"><strong>Proof:</strong> {item.evidence}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (block.type === "worksheet") {
    return (
      <div className="border bg-white p-5 sm:p-6" style={sharedCardStyle}>
        <div className="flex items-center gap-2">
          <PenLine className="h-5 w-5" style={{ color: context.primaryColor }} />
          <h4 className="text-lg font-semibold text-slate-900">{block.title}</h4>
        </div>
        {block.instructions ? <p className="mt-2 text-sm leading-6 text-slate-600">{block.instructions}</p> : null}
        <div className="mt-5 space-y-5">
          {block.prompts.map((prompt) => {
            const promptKey = blockKey + ":" + prompt.id;
            const value = context.worksheetValues[promptKey] || "";
            return (
              <label key={prompt.id} className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">{prompt.prompt}</span>
                {prompt.responseType === "long_text" ? (
                  <Textarea
                    value={value}
                    onChange={(event) => context.setWorksheetValue(promptKey, event.target.value)}
                    placeholder={prompt.placeholder}
                    rows={4}
                  />
                ) : prompt.responseType === "choice" ? (
                  <select
                    value={value}
                    onChange={(event) => context.setWorksheetValue(promptKey, event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Choose an answer</option>
                    {(prompt.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : prompt.responseType === "rating" ? (
                  <span className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => context.setWorksheetValue(promptKey, rating.toString())}
                        className="grid h-10 w-10 place-items-center rounded-lg border text-sm font-semibold"
                        style={value === rating.toString()
                          ? { backgroundColor: context.primaryColor, borderColor: context.primaryColor, color: "white" }
                          : { borderColor: tint(context.primaryColor, "35") }}
                      >
                        {rating}
                      </button>
                    ))}
                  </span>
                ) : (
                  <Input
                    type={prompt.responseType === "number" ? "number" : "text"}
                    value={value}
                    onChange={(event) => context.setWorksheetValue(promptKey, event.target.value)}
                    placeholder={prompt.placeholder}
                  />
                )}
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  if (block.type === "scorecard") {
    return (
      <div className="overflow-hidden border bg-white" style={sharedCardStyle}>
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <Gauge className="h-5 w-5" style={{ color: context.secondaryColor }} />
          <h4 className="font-semibold text-slate-900">{block.title}</h4>
        </div>
        <div className="divide-y divide-slate-100">
          {block.metrics.map((metric) => (
            <div key={metric.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[.7fr_1.3fr]">
              <div>
                <p className="text-sm font-semibold text-slate-900">{metric.label}</p>
                {metric.target ? <p className="mt-1 text-xs font-medium" style={{ color: context.primaryColor }}>Target: {metric.target}</p> : null}
              </div>
              <p className="text-sm leading-6 text-slate-600">{metric.measurement}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "example") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Scenario</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{block.scenario}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Use this</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-emerald-950">{block.good}</p>
        </div>
        {block.avoid ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-rose-700">Avoid this</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-rose-950">{block.avoid}</p>
          </div>
        ) : null}
      </div>
    );
  }

  if (block.type === "troubleshooting") {
    return (
      <div className="border bg-white p-5" style={sharedCardStyle}>
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5" style={{ color: context.accentColor }} />
          <h4 className="text-lg font-semibold text-slate-900">Troubleshooting</h4>
        </div>
        <div className="mt-4 space-y-3">
          {block.items.map((item, index) => (
            <div key={item.problem + index} className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{item.problem}</p>
              {item.cause ? <p className="mt-2 text-sm text-slate-600"><strong>Likely cause:</strong> {item.cause}</p> : null}
              <p className="mt-2 text-sm text-slate-700"><strong>Try this:</strong> {item.fix}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "table") {
    return (
      <div className="overflow-hidden border bg-white" style={sharedCardStyle}>
        {block.title ? (
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <Table2 className="h-5 w-5" style={{ color: context.primaryColor }} />
            <h4 className="font-semibold text-slate-900">{block.title}</h4>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead style={{ backgroundColor: tint(context.primaryColor, "0D") }}>
              <tr>{block.columns.map((column) => <th key={column} className="px-4 py-3 font-semibold text-slate-800">{column}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 align-top text-slate-600">{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const calloutStyles = block.tone === "warning"
    ? { backgroundColor: "#fff7ed", borderColor: "#fed7aa", color: "#7c2d12" }
    : block.tone === "insight"
      ? { backgroundColor: tint(context.primaryColor, "0D"), borderColor: tint(context.primaryColor, "30"), color: "#1e293b" }
      : { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0", color: "#064e3b" };
  const CalloutIcon = block.tone === "warning" ? AlertTriangle : Lightbulb;
  return (
    <div className="flex items-start gap-3 rounded-xl border p-4" style={calloutStyles}>
      <CalloutIcon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        {block.title ? <h4 className="font-semibold">{block.title}</h4> : null}
        <p className={block.title ? "mt-1 whitespace-pre-line text-sm leading-6" : "whitespace-pre-line text-sm leading-6"}>{block.text}</p>
      </div>
    </div>
  );
}

export default function GuideContentRenderer({
  content,
  youtubeUrl,
  primaryColor = "#2563EB",
  secondaryColor = "#10B981",
  accentColor = "#F59E0B",
  headingFontFamily,
  fontFamily,
  surfaceColor = "#FFFFFF",
  textColor = "#0F172A",
  borderRadius = "16px",
  className = "",
}: GuideContentRendererProps) {
  const normalized = useMemo(() => {
    try {
      return normalizeGuideContent(content);
    } catch (error) {
      console.error("Could not render guide content", error);
      return null;
    }
  }, [content]);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [worksheetValues, setWorksheetValues] = useState<Record<string, string>>({});
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);

  if (!normalized) {
    return (
      <div className={"rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950 " + className}>
        This guide needs to be regenerated before its content can be displayed safely.
      </div>
    );
  }

  const context: BlockContext = {
    primaryColor,
    secondaryColor,
    accentColor,
    borderRadius,
    completedItems,
    toggleChecklistItem: (id) => {
      setCompletedItems((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    worksheetValues,
    setWorksheetValue: (id, value) => setWorksheetValues((current) => ({ ...current, [id]: value })),
    copiedTemplateId,
    copyTemplate: async (id, body) => {
      try {
        await navigator.clipboard.writeText(body);
        setCopiedTemplateId(id);
        window.setTimeout(() => setCopiedTemplateId((current) => current === id ? null : current), 1800);
      } catch {
        setCopiedTemplateId(null);
      }
    },
  };

  return (
    <article
      className={"vidmagnet-guide-content space-y-10 " + className}
      style={{
        fontFamily,
        color: textColor,
        "--guide-text": /^#[0-9a-fA-F]{6}$/.test(textColor) ? textColor : "#0F172A",
        "--guide-muted": tint(textColor, "B3"),
        "--guide-subtle": tint(textColor, "8F"),
        "--guide-border": tint(textColor, "22"),
        "--guide-soft": tint(textColor, "0D"),
        "--guide-surface": surfaceColor,
      } as CSSProperties}
    >
      <style>{`
        .vidmagnet-guide-content .text-slate-950,
        .vidmagnet-guide-content .text-slate-900,
        .vidmagnet-guide-content .text-slate-800,
        .vidmagnet-guide-content .text-slate-700 { color: var(--guide-text) !important; }
        .vidmagnet-guide-content .text-slate-600 { color: var(--guide-muted) !important; }
        .vidmagnet-guide-content .text-slate-500 { color: var(--guide-subtle) !important; }
        .vidmagnet-guide-content .border-slate-200 { border-color: var(--guide-border) !important; }
        .vidmagnet-guide-content .bg-slate-50,
        .vidmagnet-guide-content .bg-slate-100 { background-color: var(--guide-soft) !important; }
      `}</style>
      <header className="border-b pb-8" style={{ borderColor: tint(primaryColor, "24") }}>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-3 py-1 text-xs font-bold capitalize"
            style={{ backgroundColor: tint(primaryColor, "14"), color: primaryColor }}
          >
            {formatLabel(normalized.format)}
          </span>
          <span className="text-xs font-medium text-slate-500">Built for implementation</span>
        </div>
        <h1
          className="mt-5 text-3xl font-bold leading-tight tracking-tight text-slate-950 sm:text-4xl"
          style={{ fontFamily: headingFontFamily || fontFamily }}
        >
          {normalized.title}
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">{normalized.promise}</p>
      </header>

      {normalized.quickStart ? (
        <section
          className="border p-5 sm:p-6"
          style={{
            borderRadius,
            borderColor: tint(primaryColor, "30"),
            backgroundColor: tint(primaryColor, "0B"),
          }}
        >
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" style={{ color: primaryColor }} />
            <h2 className="text-lg font-semibold text-slate-900" style={{ fontFamily: headingFontFamily || fontFamily }}>
              Quick start
            </h2>
          </div>
          <p className="mt-3 text-base leading-7 text-slate-700">{normalized.quickStart.desiredOutcome}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {normalized.quickStart.timeRequired ? (
              <div className="rounded-xl bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Time required</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{normalized.quickStart.timeRequired}</p>
              </div>
            ) : null}
            <div className="rounded-xl bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">First action</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{normalized.quickStart.firstAction}</p>
            </div>
          </div>
          {normalized.quickStart.prerequisites.length ? (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Before you begin</p>
              <ul className="mt-2 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                {normalized.quickStart.prerequisites.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: secondaryColor }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <p className="whitespace-pre-line text-lg leading-8 text-slate-700">{normalized.introduction}</p>

      <div className="space-y-12">
        {normalized.sections.map((section) => {
          const Icon = sectionIcon(section.type);
          return (
            <section key={section.id} className="scroll-mt-6">
              <div className="flex items-start gap-4">
                <span
                  className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                  style={{ backgroundColor: tint(primaryColor, "14"), color: primaryColor }}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2
                        className="text-2xl font-bold tracking-tight text-slate-950"
                        style={{ fontFamily: headingFontFamily || fontFamily }}
                      >
                        {section.title}
                      </h2>
                      {section.objective ? <p className="mt-2 text-sm font-medium text-slate-500">Outcome: {section.objective}</p> : null}
                    </div>
                    {youtubeUrl && section.timestampSeconds !== undefined && sourceUrl(youtubeUrl, section.timestampSeconds) ? (
                      <a
                        href={sourceUrl(youtubeUrl, section.timestampSeconds)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-slate-50"
                        style={{ borderColor: tint(primaryColor, "35"), color: primaryColor }}
                      >
                        <PlayCircle className="h-4 w-4" />
                        {section.timestamp || "View source"}
                      </a>
                    ) : null}
                  </div>
                  {section.sourceRefs && section.sourceRefs.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {section.sourceRefs.map((ref) => (
                        <span key={ref.label + String(ref.startSeconds)} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                          {ref.label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-6 space-y-5 sm:pl-14">
                {section.blocks.map((block, blockIndex) => (
                  <BlockRenderer
                    key={section.id + "-block-" + blockIndex}
                    block={block}
                    blockKey={section.id + "-block-" + blockIndex}
                    context={context}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {normalized.actionPlan ? (
        <section className="border-t pt-10" style={{ borderColor: tint(primaryColor, "24") }}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Milestone className="h-5 w-5" style={{ color: primaryColor }} />
                <h2 className="text-2xl font-bold text-slate-950" style={{ fontFamily: headingFontFamily || fontFamily }}>
                  {normalized.actionPlan.title}
                </h2>
              </div>
              <p className="mt-2 text-sm text-slate-600">{normalized.actionPlan.cadence}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{normalized.actionPlan.duration}</span>
          </div>
          <div className="mt-6 space-y-4">
            {normalized.actionPlan.milestones.map((milestone) => (
              <article key={milestone.id} className="border bg-white p-5" style={{ borderRadius, borderColor: tint(primaryColor, "22") }}>
                <p className="text-sm font-bold" style={{ color: primaryColor }}>{milestone.period}</p>
                <div className="mt-4 grid gap-5 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Actions</p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-700">
                      {milestone.actions.map((action) => <li key={action} className="flex gap-2"><Circle className="mt-1 h-3 w-3 shrink-0" />{action}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Complete when</p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-700">
                      {milestone.completionCriteria.map((criterion) => <li key={criterion} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{criterion}</li>)}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {normalized.templates && normalized.templates.length ? (
        <section className="border-t pt-10" style={{ borderColor: tint(primaryColor, "24") }}>
          <h2 className="text-2xl font-bold text-slate-950" style={{ fontFamily: headingFontFamily || fontFamily }}>Copy-ready templates</h2>
          <div className="mt-6 space-y-4">
            {normalized.templates.map((template) => (
              <article key={template.id} className="overflow-hidden border bg-white" style={{ borderRadius, borderColor: tint(primaryColor, "22") }}>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">{template.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{template.purpose}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => context.copyTemplate(template.id, template.body)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {copiedTemplateId === template.id ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    {copiedTemplateId === template.id ? "Copied" : "Copy template"}
                  </button>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap bg-slate-50 p-5 font-sans text-sm leading-7 text-slate-700">{template.body}</pre>
                {template.example ? (
                  <div className="border-t border-slate-200 px-5 py-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Example</p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{template.example}</p>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="border-t pt-8" style={{ borderColor: tint(primaryColor, "24") }}>
        <h2 className="text-xl font-bold text-slate-950" style={{ fontFamily: headingFontFamily || fontFamily }}>Put it into practice</h2>
        <p className="mt-3 whitespace-pre-line text-base leading-7 text-slate-700">{normalized.conclusion}</p>
        <div
          className="mt-5 rounded-xl border p-4 text-sm font-medium leading-6"
          style={{ backgroundColor: tint(secondaryColor, "10"), borderColor: tint(secondaryColor, "35") }}
        >
          {normalized.callToAction}
        </div>
      </footer>
    </article>
  );
}
