import assert from "node:assert/strict";
import test from "node:test";

import {
  assertQuizSourceRefsAreGrounded,
  buildQuizGenerationPrompt,
  formatQuizSourceTimingEvidence,
  resolveQuizImplementationSport,
  type QuizGenerationInput,
} from "./services/quizGenerator";
import { buildLibraryKnowledgeContext } from "./services/libraryKnowledge";

const neutralSource = `
The lesson explains how to choose one next action, define an observable finish
line, run the action, and review the result before changing another variable.
`.trim();

function quizInput(
  overrides: Partial<QuizGenerationInput> = {},
): QuizGenerationInput {
  return {
    title: "Find your next practice priority",
    sourceContent: neutralSource,
    audience: "People building a repeatable practice habit",
    objective: "Choose the most useful next step",
    brandVoice: "Direct, encouraging, and practical",
    questionCount: 5,
    outcomeCount: 3,
    presentationSelection: { mode: "auto" },
    ...overrides,
  };
}

test("quiz implementation sport honors manual selection and source inference", () => {
  assert.equal(
    resolveQuizImplementationSport(quizInput({
      sourceContent: "Basketball players work on dribbling into a jump shot, then record makes and attempts throughout the workout.",
    })),
    "basketball",
  );
  assert.equal(
    resolveQuizImplementationSport(quizInput({ audience: "Mid-handicap golfers" })),
    "golf",
  );
  assert.equal(
    resolveQuizImplementationSport(quizInput({ audience: "Athletes doing speed and strength training" })),
    "performance",
  );
  assert.equal(
    resolveQuizImplementationSport(quizInput({
      sourceContent: "Basketball players practice dribbling and jump shots on the court.",
      presentationSelection: { mode: "manual", preset: "golf" },
    })),
    "golf",
  );
  assert.equal(
    resolveQuizImplementationSport(quizInput({
      presentationSelection: { mode: "manual", preset: "performance" },
    })),
    "performance",
  );
  assert.equal(resolveQuizImplementationSport(quizInput()), "neutral");
});

test("basketball prompt requires a player-facing workout sheet with grounded tracking fields", () => {
  const prompt = buildQuizGenerationPrompt(quizInput({
    youtubeUrl: "https://www.youtube.com/watch?v=WvUSs6yTltE",
    sourceContent: "At 2:14 the basketball coach demonstrates the shooting drill, names the footwork cue, and tells players to track attempts and makes.",
    presentationSelection: { mode: "manual", preset: "basketball" },
  }));

  assert.match(prompt, /IMPLEMENTATION ASSET — BASKETBALL WORKOUT SHEET/);
  assert.match(prompt, /Questions: exactly 5/);
  assert.match(prompt, /Each question is single-choice and has exactly 4 useful, meaningfully distinct options/);
  assert.match(prompt, /player-facing implementationAsset/);
  assert.match(prompt, /type must be "worksheet" or "checklist"/);
  assert.doesNotMatch(prompt, /"type": "template"/);
  assert.match(prompt, /Sets, Reps, Attempts, and Makes/);
  assert.match(prompt, /source-specific cues/);
  assert.match(prompt, /observable checkpoints/);
  assert.match(prompt, /tracking lines for date, completion\/results, and notes or next focus/);
  assert.match(prompt, /provide a blank bracketed tracking field/);
  assert.match(prompt, /Never call it a template or tell someone to customize, brand, design, or build it/);
  assert.match(prompt, /Never estimate timestamps/);
  assert.match(prompt, /Source video: https:\/\/www\.youtube\.com\/watch\?v=WvUSs6yTltE/);
});

test("quiz prompt exposes only supplied provider-timed transcript evidence", () => {
  const prompt = buildQuizGenerationPrompt(quizInput({
    youtubeUrl: "https://www.youtube.com/watch?v=WvUSs6yTltE",
    sourceContent: "The coach demonstrates the balanced setup before the player begins the first repetition.",
    sourceSegments: [{
      start: 42.25,
      end: 47.5,
      text: "The coach demonstrates the balanced setup",
    }],
  }));

  assert.match(prompt, /<source_timing_evidence>/);
  assert.match(prompt, /"startSeconds":42\.25/);
  assert.match(prompt, /"endSeconds":47\.5/);
  assert.match(prompt, /exact numeric startSeconds appears in SOURCE TIMING EVIDENCE/);
  assert.match(prompt, /Never estimate timestamps or derive them from transcript order/);
  assert.doesNotMatch(prompt, /pasted source contains an explicit, reliable timestamp/);

  assert.match(
    formatQuizSourceTimingEvidence([]),
    /No reliable source timing was available\. Omit every sourceRefs field\./,
  );
});

test("generated quiz timestamps fail closed unless the provider supplied the exact range", () => {
  const quiz = {
    questions: [{
      options: [{
        sourceRefs: [{ label: "Balanced setup", startSeconds: 42.25, endSeconds: 47.5 }],
      }],
    }],
    outcomes: [],
  };
  const timedInput = {
    youtubeUrl: "https://www.youtube.com/watch?v=WvUSs6yTltE",
    sourceSegments: [{ start: 42.25, end: 47.5, text: "The coach demonstrates the balanced setup" }],
  };

  assert.doesNotThrow(() => assertQuizSourceRefsAreGrounded(quiz, timedInput));
  assert.throws(
    () => assertQuizSourceRefsAreGrounded({
      ...quiz,
      questions: [{ options: [{ sourceRefs: [{ label: "Estimated", startSeconds: 43 }] }] }],
    }, timedInput),
    /unsupported source time/,
  );
  assert.throws(
    () => assertQuizSourceRefsAreGrounded(quiz, {
      youtubeUrl: timedInput.youtubeUrl,
      sourceSegments: [],
    }),
    /without reliable source timing/,
  );
});

test("golf prompt requires a golfer-facing practice plan and scorecard sheet", () => {
  const prompt = buildQuizGenerationPrompt(quizInput({
    audience: "Golfers rebuilding their short-game practice",
    sourceContent: "The golf lesson explains a putting gate drill, the start-line cue, and a pass-or-fail checkpoint for each practice block.",
  }));

  assert.match(prompt, /IMPLEMENTATION ASSET — GOLF PRACTICE PLAN \/ SCORECARD SHEET/);
  assert.match(prompt, /golfer-facing implementationAsset/);
  assert.match(prompt, /type must be "worksheet" or "checklist"/);
  assert.doesNotMatch(prompt, /"type": "template"/);
  assert.match(prompt, /club, target, lie, distance, ball-count, or repetition fields/);
  assert.match(prompt, /scorecard lines for date, attempts, successful shots\/reps, result, notes, and next focus/);
  assert.match(prompt, /Use exact ball counts, repetitions, distances, time, and scoring targets only when they appear in the source/);
  assert.match(prompt, /"title": "Outcome-specific Practice Plan & Scorecard"/);
});

test("performance prompt requires an athlete-facing training sheet", () => {
  const prompt = buildQuizGenerationPrompt(quizInput({
    sourceContent: "The athlete performs a speed drill, records each sprint time, and checks posture before starting the next repetition.",
    presentationSelection: { mode: "manual", preset: "performance" },
  }));

  assert.match(prompt, /IMPLEMENTATION ASSET — PERFORMANCE TRAINING SHEET/);
  assert.match(prompt, /athlete-facing implementationAsset/);
  assert.match(prompt, /type must be "worksheet" or "checklist"/);
  assert.doesNotMatch(prompt, /"type": "template"/);
  assert.match(prompt, /Sets, Reps, Time, Distance, Load, Effort, and Rest fields/);
  assert.match(prompt, /tracking lines for date, completion\/results, notes, and next focus/);
  assert.match(prompt, /"title": "Outcome-specific Training Sheet"/);
});

test("neutral prompt retains the general implementation asset choices", () => {
  const prompt = buildQuizGenerationPrompt(quizInput({
    presentationSelection: { mode: "manual", preset: "editorial" },
  }));

  assert.match(prompt, /implementationAsset: a script, template, checklist, or worksheet/);
  assert.match(prompt, /"type": "template"/);
  assert.doesNotMatch(prompt, /BASKETBALL WORKOUT SHEET/);
  assert.doesNotMatch(prompt, /GOLF PRACTICE PLAN/);
});

test("quiz prompt accepts bounded library context as supplemental brand knowledge", () => {
  const libraryKnowledge = buildLibraryKnowledgeContext({
    userId: "creator",
    brandId: 4,
    query: { title: "practice priority" },
  }, [{
    id: 22,
    type: "guide",
    userId: "teammate",
    brandId: 4,
    status: "published",
    includeInLibrary: true,
    title: "The brand's practice philosophy",
    description: "Use one observable result before changing another variable.",
  }]);

  const prompt = buildQuizGenerationPrompt(quizInput(), libraryKnowledge);

  assert.match(prompt, /SUPPLEMENTAL MAGNET LIBRARY CONTEXT/);
  assert.match(prompt, /\[Library guide 22 — The brand's practice philosophy\]/);
  assert.match(prompt, /current source is the sole authority/i);
  assert.ok(prompt.indexOf("</untrusted_library_reference>") < prompt.indexOf("<source_content>"));
  assert.match(prompt, new RegExp(neutralSource.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
