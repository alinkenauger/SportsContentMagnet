import assert from "node:assert/strict";
import test from "node:test";
import type { BrandingSettings, Guide } from "@shared/schema";
import { generateGuidePDF } from "./services/pdfGenerator";

const richContent = {
  schemaVersion: 2 as const,
  format: "workbook" as const,
  title: "The Useful Workbook",
  promise: "Finish with a clear next move.",
  introduction: "Use the source, then make a decision.",
  quickStart: {
    desiredOutcome: "Choose the first useful action",
    timeRequired: "5 minutes",
    prerequisites: ["The source notes"],
    firstAction: "Write down the current bottleneck",
  },
  sections: [{
    id: "section_one",
    title: "Turn insight into action",
    content: "Fallback prose",
    type: "technique" as const,
    objective: "Leave with a completed tool",
    sourceRefs: [{ label: "Source explanation", startSeconds: 75 }],
    blocks: [
      { type: "rich_text" as const, text: "A useful explanation." },
      { type: "steps" as const, title: "Do this", items: [{ id: "step_one", title: "Start", instruction: "Take one action", why: "Momentum", duration: "2 minutes", successCriteria: "The action is complete", commonMistake: "Overplanning", fix: "Reduce the scope" }] },
      { type: "checklist" as const, title: "Check it", items: [{ id: "check_one", text: "The result is observable", why: "It removes ambiguity", evidence: "A saved artifact", required: true }] },
      { type: "worksheet" as const, title: "Decide", instructions: "Answer honestly", prompts: [{ id: "answer_one", prompt: "What happens next?", responseType: "long_text" as const }] },
      { type: "scorecard" as const, title: "Measure", metrics: [{ id: "metric_one", label: "Completion", target: "100%", measurement: "Count finished actions" }] },
      { type: "example" as const, scenario: "A real situation", good: "A concrete response", avoid: "Generic advice" },
      { type: "troubleshooting" as const, items: [{ problem: "The plan stalls", cause: "The action is vague", fix: "Make it observable" }] },
      { type: "table" as const, title: "Decision table", columns: ["Signal", "Action"], rows: [["Ready", "Start"]] },
      { type: "callout" as const, tone: "insight" as const, title: "Remember", text: "Useful beats long." },
    ],
  }],
  actionPlan: {
    title: "Seven-day plan",
    duration: "7 days",
    cadence: "One move per day",
    milestones: [{ id: "day_one", period: "Day 1", actions: ["Begin"], completionCriteria: ["Artifact saved"] }],
  },
  templates: [{ id: "template_one", title: "Action script", purpose: "Remove friction", body: "I will [ACTION] by [TIME].", placeholders: ["ACTION", "TIME"], example: "I will call by noon." }],
  conclusion: "Use the finished artifact.",
  callToAction: "Choose the next best resource.",
};

test("print export includes the complete V2 implementation kit", async () => {
  const guide = {
    title: richContent.title,
    description: "A practical guide",
    content: richContent,
    youtubeUrl: "https://www.youtube.com/watch?v=abc123",
  } as unknown as Guide;
  const branding = {
    displayName: "Example Brand",
    companyName: "Example Brand",
    primaryColor: "#123456",
    secondaryColor: "#18A56B",
    websiteUrl: "https://example.com",
  } as unknown as BrandingSettings;

  const html = (await generateGuidePDF({ guide, branding, channelTitle: "Source Creator" })).toString("utf8");

  for (const expected of [
    "Quick start",
    "Do this",
    "Check it",
    "Decide",
    "Measure",
    "Worked example",
    "Troubleshooting",
    "Decision table",
    "Seven-day plan",
    "Copy-ready templates",
    "I will [ACTION] by [TIME].",
    "t&#x3D;75s",
  ]) {
    assert.match(html, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
});

test("print export escapes authored content and rejects unsafe brand presentation values", async () => {
  const guide = {
    title: "Safe guide",
    description: "<script>alert('description')</script>",
    content: {
      ...richContent,
      introduction: "<script>alert('content')</script>",
    },
  } as unknown as Guide;
  const branding = {
    companyName: "<img src=x onerror=alert(1)>",
    logoUrl: "javascript:alert(1)",
    primaryColor: "red; background:url(javascript:alert(1))",
  } as unknown as BrandingSettings;

  const html = (await generateGuidePDF({ guide, branding })).toString("utf8");
  assert.doesNotMatch(html, /<script>|javascript:alert|onerror=/i);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /--primary: #2563EB/);
});
