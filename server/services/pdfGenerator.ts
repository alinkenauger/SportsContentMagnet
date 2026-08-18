import handlebars from "handlebars";
import fs from "fs";
import path from "path";
import type { Guide, BrandingSettings } from "@shared/schema";
import {
  normalizeGuideContent,
  type GuideBlock,
  type GuideContentV2,
} from "@shared/guideContent";

interface PDFOptions {
  guide: Guide;
  branding?: BrandingSettings;
  channelTitle?: string;
}

const escape = (value: unknown) => handlebars.escapeExpression(String(value ?? ""));
const lines = (value: string) => escape(value).replace(/\r?\n/g, "<br>");

function safeColor(value: string | null | undefined, fallback: string) {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function safePublicUrl(value: string | null | undefined) {
  if (!value) return undefined;
  if (/^\/uploads\/branding\/[A-Za-z0-9._-]+$/.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function sourceUrl(youtubeUrl: string | null | undefined, startSeconds?: number) {
  const safeUrl = safePublicUrl(youtubeUrl);
  if (!safeUrl) return undefined;
  const url = new URL(safeUrl, "http://localhost");
  if (startSeconds !== undefined) url.searchParams.set("t", `${Math.floor(startSeconds)}s`);
  return safeUrl.startsWith("/") ? `${url.pathname}${url.search}` : url.toString();
}

function renderList(items: string[], ordered = false, className = "") {
  const tag = ordered ? "ol" : "ul";
  return `<${tag}${className ? ` class="${className}"` : ""}>${items
    .map((item) => `<li>${lines(item)}</li>`)
    .join("")}</${tag}>`;
}

function renderBlock(block: GuideBlock) {
  switch (block.type) {
    case "rich_text":
      return `<div class="prose-block">${lines(block.text)}</div>`;
    case "steps":
      return `<div class="artifact-block"><h3>${escape(block.title || "Step-by-step")}</h3><ol class="steps">${block.items.map((step) => `
        <li>
          <div class="step-heading"><strong>${escape(step.title)}</strong>${step.duration ? `<span>${escape(step.duration)}</span>` : ""}</div>
          <p>${lines(step.instruction)}</p>
          ${step.why ? `<p class="note"><strong>Why it matters:</strong> ${lines(step.why)}</p>` : ""}
          ${step.successCriteria ? `<p class="success"><strong>Complete when:</strong> ${lines(step.successCriteria)}</p>` : ""}
          ${step.commonMistake ? `<p class="warning"><strong>Watch for:</strong> ${lines(step.commonMistake)}</p>` : ""}
          ${step.fix ? `<p class="warning"><strong>Correction:</strong> ${lines(step.fix)}</p>` : ""}
        </li>`).join("")}</ol></div>`;
    case "checklist":
      return `<div class="artifact-block"><h3>${escape(block.title || "Implementation checklist")}</h3><ul class="checklist">${block.items.map((item) => `
        <li><span class="checkbox"></span><div><strong>${lines(item.text)}</strong>${item.why ? `<p>${lines(item.why)}</p>` : ""}${item.evidence ? `<p class="note"><strong>Proof:</strong> ${lines(item.evidence)}</p>` : ""}</div></li>`).join("")}</ul></div>`;
    case "worksheet":
      return `<div class="artifact-block worksheet"><h3>${escape(block.title)}</h3>${block.instructions ? `<p>${lines(block.instructions)}</p>` : ""}${block.prompts.map((prompt) => `
        <div class="worksheet-prompt"><strong>${lines(prompt.prompt)}</strong>${prompt.responseType === "choice" && prompt.options
          ? renderList(prompt.options.map((option) => `○ ${option}`), false, "choice-list")
          : `<div class="answer-space ${prompt.responseType === "long_text" ? "answer-space-long" : ""}"></div>`}</div>`).join("")}</div>`;
    case "scorecard":
      return `<div class="artifact-block"><h3>${escape(block.title)}</h3><table><thead><tr><th>Measure</th><th>How to measure it</th><th>Target</th></tr></thead><tbody>${block.metrics.map((metric) => `<tr><td>${escape(metric.label)}</td><td>${lines(metric.measurement)}</td><td>${escape(metric.target || "—")}</td></tr>`).join("")}</tbody></table></div>`;
    case "example":
      return `<div class="artifact-block example"><h3>Worked example</h3><p><strong>Scenario:</strong> ${lines(block.scenario)}</p><div class="success"><strong>Use this:</strong><br>${lines(block.good)}</div>${block.avoid ? `<div class="warning"><strong>Avoid this:</strong><br>${lines(block.avoid)}</div>` : ""}</div>`;
    case "troubleshooting":
      return `<div class="artifact-block"><h3>Troubleshooting</h3>${block.items.map((item) => `<div class="trouble"><strong>${lines(item.problem)}</strong>${item.cause ? `<p><strong>Likely cause:</strong> ${lines(item.cause)}</p>` : ""}<p><strong>Try this:</strong> ${lines(item.fix)}</p></div>`).join("")}</div>`;
    case "table":
      return `<div class="artifact-block">${block.title ? `<h3>${escape(block.title)}</h3>` : ""}<table><thead><tr>${block.columns.map((column) => `<th>${escape(column)}</th>`).join("")}</tr></thead><tbody>${block.rows.map((row) => `<tr>${row.map((cell) => `<td>${lines(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    case "callout":
      return `<aside class="callout callout-${block.tone}">${block.title ? `<strong>${escape(block.title)}</strong>` : ""}<p>${lines(block.text)}</p></aside>`;
  }
}

function renderSourceRefs(
  refs: GuideContentV2["sections"][number]["sourceRefs"],
  youtubeUrl?: string | null,
) {
  if (!refs?.length) return "";
  return `<div class="source-refs"><strong>From the source:</strong> ${refs.map((ref) => {
    const url = sourceUrl(youtubeUrl, ref.startSeconds);
    const label = escape(ref.label);
    return url ? `<a href="${escape(url)}">${label}</a>` : `<span>${label}</span>`;
  }).join(" · ")}</div>`;
}

export function renderGuidePrintContent(content: GuideContentV2, youtubeUrl?: string | null) {
  const quickStart = content.quickStart ? `
    <section class="quick-start">
      <p class="eyebrow">Quick start</p>
      <h2>${escape(content.quickStart.desiredOutcome)}</h2>
      ${content.quickStart.timeRequired ? `<p><strong>Time required:</strong> ${escape(content.quickStart.timeRequired)}</p>` : ""}
      <p><strong>First action:</strong> ${lines(content.quickStart.firstAction)}</p>
      ${content.quickStart.prerequisites.length ? `<h3>Before you begin</h3>${renderList(content.quickStart.prerequisites)}` : ""}
    </section>` : "";

  const sections = content.sections.map((section) => `
    <section class="section">
      <p class="eyebrow">${escape(section.type)}</p>
      <h2 class="section-title">${escape(section.title)}</h2>
      ${section.objective ? `<p class="objective"><strong>Outcome:</strong> ${lines(section.objective)}</p>` : ""}
      ${renderSourceRefs(section.sourceRefs, youtubeUrl)}
      <div class="blocks">${section.blocks.map(renderBlock).join("")}</div>
    </section>`).join("");

  const actionPlan = content.actionPlan ? `
    <section class="section action-plan">
      <p class="eyebrow">Action plan · ${escape(content.actionPlan.duration)}</p>
      <h2 class="section-title">${escape(content.actionPlan.title)}</h2>
      <p>${lines(content.actionPlan.cadence)}</p>
      ${content.actionPlan.milestones.map((milestone) => `<div class="milestone"><h3>${escape(milestone.period)}</h3><div class="milestone-grid"><div><strong>Actions</strong>${renderList(milestone.actions)}</div><div><strong>Complete when</strong>${renderList(milestone.completionCriteria)}</div></div></div>`).join("")}
    </section>` : "";

  const templates = content.templates?.length ? `
    <section class="section templates">
      <p class="eyebrow">Toolkit</p>
      <h2 class="section-title">Copy-ready templates</h2>
      ${content.templates.map((template) => `<div class="template"><h3>${escape(template.title)}</h3><p>${lines(template.purpose)}</p><pre>${escape(template.body)}</pre>${template.example ? `<p class="note"><strong>Example:</strong><br>${lines(template.example)}</p>` : ""}</div>`).join("")}
    </section>` : "";

  return `
    ${quickStart}
    <section class="introduction">${lines(content.introduction)}</section>
    ${sections}
    ${actionPlan}
    ${templates}
    <section class="section conclusion"><h2 class="section-title">Put it into practice</h2><p>${lines(content.conclusion)}</p><div class="next-action">${lines(content.callToAction)}</div></section>`;
}

// Lightweight, print-ready HTML. Browsers can print or save this as a PDF without Puppeteer.
export async function generateGuidePDF(options: PDFOptions): Promise<Buffer> {
  const { guide, branding, channelTitle } = options;
  const templatePath = path.join(process.cwd(), "server/templates/guide-pdf.hbs");
  const template = handlebars.compile(fs.readFileSync(templatePath, "utf8"));
  const content = normalizeGuideContent(guide.content);
  const companyName = branding?.displayName || branding?.companyName || "VidMagnet";
  const templateData = {
    title: content.title || guide.title,
    description: guide.description,
    channelTitle,
    companyName,
    logoUrl: safePublicUrl(branding?.logoUrl),
    primaryColor: safeColor(branding?.primaryColor, "#2563EB"),
    secondaryColor: safeColor(branding?.secondaryColor, "#10B981"),
    firstLetter: companyName.charAt(0).toUpperCase() || "V",
    website: safePublicUrl(branding?.websiteUrl),
    promise: content.promise,
    richContent: new handlebars.SafeString(renderGuidePrintContent(content, guide.youtubeUrl)),
    createdAt: new Date().toLocaleDateString(),
    disclaimer: channelTitle
      ? `Prepared from source content by ${channelTitle}. Review recommendations for your specific context.`
      : "Prepared from supplied source content. Review recommendations for your specific context.",
  };
  return Buffer.from(template(templateData), "utf8");
}

export function generatePDFFilename(guide: Guide): string {
  const sanitized = guide.title.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  return `${sanitized}_guide.html`;
}
