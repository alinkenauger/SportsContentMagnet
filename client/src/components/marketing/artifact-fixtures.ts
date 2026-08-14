import type { GuideBlock, GuideContentV2 } from "@shared/guideContent";
import type {
  PublicBenefitAsset,
  PublicQuizResult,
  QuizDefinition,
  QuizOutcome,
  QuizQuestion,
} from "@shared/quiz";

export const marketingSourceFixture = {
  label: "Example source",
  format: "45-minute coaching lesson",
  title: "Why clients leave a great call and still do not follow through",
  lines: [
    {
      id: "one-priority",
      text: "End each call with one priority, not a full list.",
    },
    {
      id: "schedule-action",
      text: "Put the action on the calendar before the call ends.",
    },
    {
      id: "define-done",
      text: "Name what done looks like and when you will check back.",
    },
  ],
} as const;

export const marketingGuideSteps: Extract<GuideBlock, { type: "steps" }> = {
  type: "steps",
  title: "The follow-through sequence",
  items: [
    {
      id: "choose_the_move",
      title: "Choose the move that matters.",
      instruction: "End the call with one priority that can change the week, not a new list of equally weighted tasks.",
      successCriteria: "The client can name the single priority without checking their notes.",
      commonMistake: "Keeping every good idea in the active plan.",
      fix: "Move every non-priority idea into a later list before the call ends.",
    },
    {
      id: "schedule_the_action",
      title: "Put the action on the calendar.",
      instruction: "Choose a real time for the priority while both people are still on the call.",
      successCriteria: "The action has a date, time, and owner.",
    },
    {
      id: "define_proof",
      title: "Define proof and the follow-up.",
      instruction: "Describe what done looks like, then agree on when the result will be checked.",
      successCriteria: "Both people can recognize completion from the same evidence.",
    },
  ],
};

export const marketingGuideChecklist: Extract<GuideBlock, { type: "checklist" }> = {
  type: "checklist",
  title: "Before the call ends",
  items: [
    { id: "one_owner", text: "One owner", required: true },
    { id: "one_deadline", text: "One deadline", required: true },
    { id: "one_proof", text: "One proof", required: true },
  ],
};

export const marketingGuideWorksheet: Extract<GuideBlock, { type: "worksheet" }> = {
  type: "worksheet",
  title: "Weekly Reset Sheet",
  instructions: "Turn the call into one priority, one calendar commitment, and one visible finish line.",
  prompts: [
    {
      id: "weekly_priority",
      prompt: "What is the one priority that matters most this week?",
      responseType: "short_text",
      placeholder: "This week's priority",
    },
    {
      id: "calendar_slot",
      prompt: "What calendar slot will you protect for this action?",
      responseType: "short_text",
      placeholder: "Day and time",
    },
    {
      id: "visible_proof",
      prompt: "What visible proof will show that the action is finished?",
      responseType: "long_text",
      placeholder: "Done will look like...",
    },
  ],
};

export const marketingGuideFixture: GuideContentV2 = {
  schemaVersion: 2,
  format: "playbook",
  title: "The Client Follow-Through Playbook",
  promise: "Leave every client call with one priority, one scheduled action, and one visible finish line.",
  introduction: "Use this short closeout at the end of every coaching call so a useful conversation becomes visible action.",
  quickStart: {
    desiredOutcome: "Leave every client call with one priority, one scheduled action, and one visible finish line.",
    timeRequired: "20 minutes",
    prerequisites: [],
    firstAction: "Choose the move that matters.",
  },
  sections: [
    {
      id: "follow_through_sequence",
      title: "The follow-through sequence",
      content: "Choose one priority, schedule it, and define the evidence that will prove it is finished.",
      type: "technique",
      objective: "The client leaves with one unambiguous commitment.",
      blocks: [
        marketingGuideSteps,
        marketingGuideChecklist,
        marketingGuideWorksheet,
      ],
    },
  ],
  conclusion: "Repeat the same closeout until choosing, scheduling, and proving the next move becomes the normal end of every call.",
  callToAction: "Use the Weekly Reset Sheet.",
};

export const marketingGiftAssetId = 101;
export const marketingCtaAssetId = 102;

export const priorityPileUpOutcome: QuizOutcome = {
  id: "priority_pile_up",
  title: "The Priority Pile-Up",
  summary: "Your plan is not missing effort. It is missing one visible next move.",
  description: "When everything feels equally important, the client leaves with options instead of a commitment. Reduce the active plan to one move, schedule it, and agree on the proof of completion.",
  recommendations: [
    "Choose one action that changes the week.",
    "Schedule it before adding another task.",
  ],
  giftAssetId: marketingGiftAssetId,
  ctaAssetId: marketingCtaAssetId,
  color: "#FF6B3D",
};

export const invisibleFinishLineOutcome: QuizOutcome = {
  id: "invisible_finish_line",
  title: "The Invisible Finish Line",
  summary: "The action is clear, but nobody can see the moment it is finished.",
  description: "Your follow-through breaks because the action lacks observable proof. Define what done looks like in terms both people can recognize, then book the check-back before the call ends.",
  recommendations: [
    "Define done with one piece of observable proof.",
    "Book the check-back before the call ends.",
  ],
  giftAssetId: marketingGiftAssetId,
  ctaAssetId: marketingCtaAssetId,
  color: "#3157F6",
};

export const marketingQuizQuestions: QuizQuestion[] = [
  {
    id: "follow_through_break",
    prompt: "At the end of a client call, what usually happens?",
    helpText: "Choose the answer that feels most familiar.",
    required: true,
    options: [
      {
        id: "everything_equal",
        label: "Everything feels equally important.",
        outcomeWeights: { priority_pile_up: 3 },
      },
      {
        id: "proof_not_named",
        label: "We choose an action, but never name what done looks like.",
        outcomeWeights: { invisible_finish_line: 3 },
      },
    ],
  },
  {
    id: "call_close",
    prompt: "How do you decide an action is finished?",
    required: true,
    options: [
      {
        id: "full_task_list",
        label: "A useful but overwhelming list of tasks.",
        outcomeWeights: { priority_pile_up: 2 },
      },
      {
        id: "no_visible_proof",
        label: "We have not agreed on visible proof.",
        outcomeWeights: { invisible_finish_line: 2 },
      },
    ],
  },
];

export const marketingQuizFixture: QuizDefinition = {
  title: "What Is Breaking Your Follow-Through?",
  description: "Find the point where a strong coaching conversation stops turning into client action.",
  questions: marketingQuizQuestions,
  outcomes: [priorityPileUpOutcome, invisibleFinishLineOutcome],
  leadCapture: {
    enabled: true,
    required: false,
    headline: "Where should we send your result?",
    buttonText: "Reveal my result",
    fields: ["firstName", "email"],
  },
  theme: {
    primaryColor: "#101419",
    secondaryColor: "#79D9C7",
    accentColor: "#FF6B3D",
    backgroundColor: "#F4EFE6",
    fontFamily: "DM Sans",
  },
};

export const marketingGiftFixture: PublicBenefitAsset = {
  title: "Weekly Reset Sheet",
  description: "A one-page reset for choosing, scheduling, and checking the week's most important move.",
  benefitSummary: "Turn one priority into an owned and visible commitment.",
  url: "https://example.com/weekly-reset-sheet",
  buttonLabel: "Get the reset sheet",
};

export const marketingCtaFixture: PublicBenefitAsset = {
  title: "Build your follow-through system",
  description: "Turn the reset into a repeatable coaching closeout.",
  benefitSummary: "Create a reliable next-action rhythm for every client call.",
  url: "https://example.com/follow-through-system",
  buttonLabel: "Build the system",
};

export const marketingQuizResultFixture: PublicQuizResult = {
  attemptId: "00000000-0000-4000-8000-000000000001",
  outcome: priorityPileUpOutcome,
  gift: marketingGiftFixture,
  cta: marketingCtaFixture,
};

export const marketingQuizSelectedOptionId = "everything_equal";
