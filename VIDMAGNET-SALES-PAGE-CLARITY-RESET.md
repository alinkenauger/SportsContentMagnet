<!-- /autoplan restore point: /Users/adamlinkenauger/.gstack/projects/alinkenauger-SportsContentMagnet/main-autoplan-restore-20260814-121326.md -->
# VidMagnet Sales Page Clarity Reset

Status: **APPROVED by the user and implemented on `feat/vidmagnet-clarity-reset` on 2026-08-14.** Secure account completion, the artifact-led page, route splitting, and regression gates are complete. Deployment has not started; the remaining T7 evidence is recorded below.

## Executive Direction

The fix is not another prettier system diagram.

The next page should prove one useful transformation:

**Bring content you already own. VidMagnet turns it into a branded Guide or personalized Outcome Quiz that helps a lead act, captures the lead, and points them to the right next step.**

The current page has gained polish but lost product clarity. It contains a 673-line sales page plus 1,588 lines of simulated marketing UI in Content Reactor and Publishing System. Those simulations repeat the same mechanics while asking visitors to learn internal metaphors such as “publishing infrastructure,” “system,” “reactor,” and “instrument.”

The recommended reset is artifact-led:

- Show a recognizable source.
- Show the useful finished output immediately.
- Let one small Guide/Quiz control reveal the two jobs.
- Use real product patterns—steps, checklist, worksheet, outcome, recommendations, gift, and call to action—as proof.
- Explain Brand Studio and Benefit Library only after the core value is obvious.
- Preserve the intended signup-to-completion journey while replacing its insecure email-selected handoff and removing the ConvertMag naming break.

The page should feel fun because the result appears quickly and visibly, not because more glass, motion, or decorative layers were added.

## Business Outcome

The page is not successful merely because a visitor can repeat “Guide and Quiz.” Its business job is to move the right visitor through this chain:

**qualified visitor → signup completed → source accepted → useful first asset → first publish → first captured lead**

This redesign can directly improve comprehension, signup intent, and conversion continuity. It cannot, by itself, prove demand, repair product onboarding, or establish downstream revenue attribution. Those boundaries are explicit below.

## Confirmed Premises

1. **Primary buyer:** the page speaks first to content-led experts—coaches, consultants, educators, and creator-led small teams—who already have useful long-form knowledge. Agencies and multi-brand operators remain a secondary use case.
2. **Primary wedge:** VidMagnet is not “another AI quiz or ebook maker.” Its wedge is turning existing expertise into a source-grounded, usable implementation asset or diagnostic outcome, then connecting that value to lead capture and a relevant next step.
3. **Truthful umbrella:** use “bring existing content,” not “paste anything.” Guide and Quiz are sibling outcomes, but the page will not imply that both currently accept every identical source type or follow the same builder path.
4. **Artifact over metaphor:** one real-feeling before/after proof is more persuasive than a simulated publishing system.
5. **System value remains visible:** Brand Studio, reusable gifts, calls to action, lead capture, and delivery remain important, but they support the central transformation instead of competing with it in the hero.
6. **Fun means payoff:** warmth, friendly language, one rewarding transformation, and restrained micro-motion; not more sections, glass panels, or animated connectors.
7. **Structure follows buyer questions:** five or six sections is a target, not a hard rule. A repeated CTA after proof is allowed when it helps the decision.
8. **No invented evidence:** use product-real artifacts and verified capability statements. Customer metrics, integrations, privacy claims, timing claims, and plan limits appear only after verification.

Confirmation: the user selected **Option A — artifact-led reset** on 2026-08-14. Completeness target: 9/10. This cleared Autoplan's mandatory premise gate.

## Step 0 — CEO Premise Challenge

### 0A. Is this the right problem?

Partly. The user’s immediate problem is real: the current page is complicated, visually heavy, and difficult to explain. But “make the page simpler” is a symptom-level brief. A simpler page that communicates a commodity feature bundle can still fail.

The business-level problem is:

> VidMagnet does not yet make its differentiated value, product truth, and path to first publish obvious enough for a qualified visitor to act with confidence.

The page therefore needs both a clarity reset and a tighter value hypothesis. The redesign must not silently turn into a company repositioning or promise unbuilt workflows.

### 0B. What already exists that solves part of this?

The strongest proof is already in the customer-facing product:

- GuideContentRenderer already supports a quick start, steps, checklists, worksheets, troubleshooting, action plans, progress measures, and copy-ready templates.
- QuizRunner already supports welcome, question, lead capture, personalized result, recommendations, a free gift, and a call to action.
- The signup dialog already validates with Zod, submits through the existing API, handles duplicate accounts, and redirects to complete-account.
- Brand Studio and Benefit Library now have brand-scoped product foundations.
- The current FAQ answers the main format, branding, benefit-library, and no-code questions.
- The current visual system has usable ingredients: warm paper, coral, mint, blue, editorial type, strong focus states, and rounded controls.

The plan should reuse these truths and patterns. It should not rebuild a fake version of the product.

### 0C. Twelve-month dream state

~~~mermaid
flowchart LR
  A["Expert brings proven content"] --> B["VidMagnet understands the source"]
  B --> C{"Job for the lead"}
  C -->|Teach or implement| D["Useful branded Guide"]
  C -->|Diagnose or segment| E["Personalized Outcome Quiz"]
  D --> F["Lead captures value and acts"]
  E --> F
  F --> G["Relevant gift or next offer"]
  G --> H["Creator sees lead quality and downstream result"]
  H --> I["Better source, offer, and follow-up decisions"]
~~~

This sales-page reset reaches only the first half of that dream: it can explain and prove the source-to-useful-output experience. It does not add CRM routing, revenue attribution, automatic quiz-to-guide personalization, or a live public generator.

### 0C-bis. Implementation alternatives

| Alternative | What ships | Conversion learning | Risk | Human estimate | CC estimate | Completeness |
|---|---|---:|---:|---:|---:|---:|
| A. Minimal copy-and-proof patch | Rewrite hero and section order; replace abstract language with real screenshots; retain most current structure | Medium | Low | 0.5–1 day | ~30–60 min | 6/10 |
| B. Artifact-led clarity reset | Replace both simulations with one compact source-to-output proof; rebuild page around buyer questions; preserve signup; fix immediate naming continuity | High | Medium-low | 2–3 days | ~2–4 h | 9/10 |
| C. Live self-demonstrating sandbox | Visitor supplies/selects a source and receives a real generated preview before signup | Very high if demand exists | High: AI cost, latency, abuse, PII, content rights, and backend scope | 2–4 weeks | ~1–2 days plus product QA | 10/10 |

**Recommendation: Alternative B.** It produces the clearest evidence with a small, reversible frontend blast radius. Alternative A does not remove the central complexity. Alternative C is a product experiment, not a sales-page redesign, and should be validated separately.

### 0D. Selective expansion decisions

Accepted into this plan because they are inside the immediate conversion blast radius:

- Create a canonical vocabulary and capability truth table before writing copy.
- Replace simulated system UI with product-real artifact proof.
- Fix VidMagnet/ConvertMag naming on login and complete-account, which are the next screens after the sales-page CTA.
- Update DESIGN.md from “editorial product lab” to “product-evidence first.”
- Add a hard complexity, motion, accessibility, and performance budget.
- Define the conversion/activation event contract used to judge the redesign.
- Verify every source type, plan statement, and public claim before publication.

Deferred because they materially expand product or evidence scope:

- Live source generation on the public page.
- Quiz → personalized Guide as a connected product workflow.
- CRM routing, integrations, revenue attribution, or new analytics infrastructure.
- Customer case studies or quantified claims until verified evidence exists.
- A pricing-page redesign.
- A complete vocabulary migration across every legacy app screen.

Skipped:

- Another generated abstract hero background as the primary explainer.
- A new large animated workflow or “operating system” metaphor.
- New backend endpoints, database tables, or migrations for this page.
- A fake lead form or simulated email capture inside the product proof.

### 0E. Temporal interrogation

**Now:** Visitors see a polished but long page, two separate simulations, repeated flow language, no verified customer proof, and a VidMagnet-to-ConvertMag naming break after signup.

**At launch:** The page should prove the output in the first viewport, keep one obvious CTA, use the same vocabulary as the creation choice, and load substantially less marketing-only UI.

**At 30 days:** Review CTA placement, signup completion, first-source submission, and first-publish data if a reliable analytics path exists. Run five-second comprehension interviews as qualitative evidence, not the sole success metric.

**At 90 days:** Decide whether the strongest demand is for expert/coach lead magnets, a video/sports-specific wedge, or multi-brand agency operations. Do not hard-code that unvalidated decision into product architecture during this redesign.

**At six months:** The page should either have evidence that artifact-led proof improves qualified activation or be easy to replace. A second 1,500-line marketing simulation with no measurement would be the failure case.

### 0F. Review mode

Mode: **SELECTIVE EXPANSION**

The task remains a frontend clarity reset. Adjacent fixes are included only when they directly affect the same visitor journey or prevent truthful marketing.

## Outside Voice Reviews

### Independent Claude challenge

The independent review found 10 issues: two critical and eight high. Its central conclusion was that the initial plan optimized clarity without defining conversion or activation. It challenged the table-stakes “content → format → brand → publish” promise, the absence of a beachhead buyer, the risk of recreating the 1,588-line marketing simulation, missing proof, arbitrary section limits, missing measurement, and product-language drift.

Its recommended reframe:

> Prove that VidMagnet creates a more useful conversion asset from existing expertise than generic ebook or quiz tools, then measure whether that proof gets the right user to first publish.

### Independent Codex challenge

The independent review reached the same top-level concern and pushed further on portfolio and funnel truth. It noted that Guide and Quiz solve different jobs; “depth” is a hypothesis rather than an unconditional good; system-level value should not disappear merely because the present diagram is cumbersome; and the post-signup ConvertMag naming plus YouTube-first product path can undermine a clearer page.

Its 10x hypothesis was a future connected funnel—diagnostic Quiz → personalized Guide → relevant offer → CRM/attribution—but it correctly identified that as unbuilt strategic scope, not a promise for this redesign.

### Consensus

| Question | Claude | Codex | CEO synthesis |
|---|---|---|---|
| Is the visual complexity problem real? | Yes | Yes | Yes, but it is not the whole business diagnosis. |
| Is the original four-step promise differentiated? | No | No | Use it only as mechanics; lead with useful outcome and source-grounded quality. |
| Should the page choose a primary buyer? | Yes | Yes | Propose content-led experts first; require premise confirmation. |
| Should the large simulations remain? | No | No | Remove them from the page; retain system value in a compact downstream section. |
| Should Guide and Quiz be shown identically? | No | No | Show them as two different jobs, not identical workflows. |
| Is a live sandbox the best immediate fix? | Maybe later | Maybe later | Defer; too much product, cost, and abuse scope. |
| Is proof missing? | Yes | Yes | Use product-real artifacts now; add customer evidence only when verified. |
| Is measurement missing? | Yes | Yes | Define the funnel contract; do not invent an analytics transport. |

## Canonical Product Story

### One-sentence promise

**Turn content you already trust into a branded Guide or personalized Quiz your leads can actually use.**

### Supporting sentence

**VidMagnet structures the useful parts, adds lead capture, your brand, a free gift or call to action, and publishes the finished experience.**

### Vocabulary map

| Use | Meaning | Avoid |
|---|---|---|
| VidMagnet | Product name | ConvertMag, ConvertMag.net |
| Existing content / source | Pasted text, notes, article excerpts, transcripts, or a verified YouTube-to-Guide source | “Paste anything,” “upload anything,” or identical Guide/Quiz source support |
| Guide | Useful educational or implementation output; subtype can be report, SOP, workout, or workbook | Mixing Lead Magnet, Practice Guide, Implementation Guide as peer product names |
| Outcome Quiz | Diagnostic questions that lead to a personalized result and next steps | Assessment engine, segmentation infrastructure |
| Brand Studio | Saved brand appearance and identity | Branding layer in the hero |
| Benefit Library | Reusable free gifts and calls to action | Offer mechanics before the product is understood |
| Publish | Make the recipient experience available | Deploy a publishing system |

### Capability truth table to verify before copy freezes

| Capability | Guide | Outcome Quiz | Marketing wording |
|---|---|---|---|
| Manual text/source | Yes | Yes | Supported; this is the shared public umbrella |
| YouTube/video URL | Yes | Not the same creation path today | Say “YouTube-to-Guide” only when format specificity helps |
| PDF upload | No; current route returns 501 | Not verified | Do not claim |
| Web-page URL | No; client submits an unsupported `link` method | Not verified | Do not claim |
| Streaming URL | No; current route returns 501 | Not verified | Do not claim |
| Audio upload | Codepath exists but environment-backed behavior is not release-verified | Not verified | Do not claim until a production-like smoke test passes |
| Branded recipient experience | Yes | Yes | Supported |
| Lead capture | Yes | Yes | Supported |
| Free gift + CTA | Legacy Guide CTA exists; Benefit Library assignment must be verified | Yes | Describe generally only after current Guide behavior is verified |
| Personalized outcome | No | Yes | Quiz-specific |
| Steps/checklist/worksheet/action plan | Supported in rich Guide renderer | Recommendations rather than worksheet flow | Show as different jobs |

## Recommended Page Architecture

The design review consolidated six sections into five. The page must stop teaching once the buyer understands the result.

### Section 1 — Hero: “Turn content you already trust into a lead magnet people can actually use.”

Buyer question: **What does VidMagnet do for me?**

- Supporting sentence: “Create a branded, step-by-step Guide or personalized Outcome Quiz—with lead capture and a clear next step built in.”
- Primary CTA: **Start free**.
- Secondary link: **See what it makes**; scrolls to the artifact.
- Desktop composition: 5/12 copy and 7/12 artifact.
- The artifact is the only complex object in the first viewport.
- A small, stationary source excerpt sits beside one finished-output surface.
- One Guide/Quiz tab control changes the output only; the source never moves.
- Guide is selected by default.
- Do not show a fake email field, editable branding controls, diagram legend, decorative hero art, or a “published” claim.

### Section 2 — “Teach the next move—or diagnose where to start.”

Buyer question: **Should I make a Guide or an Outcome Quiz?**

- Guide conclusion: “Use a Guide when someone needs a clear path they can follow.”
- Quiz conclusion: “Use an Outcome Quiz when the right next step depends on their answers.”
- Annotate the same canonical example so the visitor sees two different jobs, not two identical builders.
- Explain usefulness here as part of the comparison; do not create a second Guide-versus-Quiz lesson later.
- Repeat **Start free** after this proof on long viewports.

### Section 3 — “Give them something worth the email.”

Buyer question: **Is this more useful than a summary or generic AI document?**

- Use one open annotated artifact, not a card grid.
- Guide annotations: quick start, practical sequence, checklist or worksheet, progress measure, troubleshooting, and next action.
- Quiz annotations: named outcome, explanation, recommendations, relevant gift, and next step.
- Keep “depth” tied to usefulness and action, not length.
- Artifact label: **Example output using synthetic source content** until a real, schema-valid generated fixture is approved.
- If a verified public example becomes available, link it; otherwise omit the proof link entirely.

### Section 4 — “From opt-in to next step, without losing your brand.”

Buyer question: **How does this become a lead magnet rather than a document?**

- Show one continuous recipient sequence: branded experience → lead capture → useful Guide/result → gift or CTA.
- Brand Studio appears as the identity annotation on the recipient experience.
- Benefit Library appears as the reusable gift/CTA annotation at the end.
- Mention multi-brand reuse in one supporting line for agencies and teams; do not introduce a separate agency module.
- Use four sequence labels at most and no cards as page structure.
- Do not imply CRM sync, attribution, or integrations that have not been verified.

### Section 5 — “Your next lead magnet may already be in your content.”

Buyer question: **Is it safe and easy enough to try?**

- Keep the existing FAQ behavior and revise wording to the canonical vocabulary.
- State only verified source types and free-plan expectations.
- Omit customer results until approved evidence exists; do not reserve an empty testimonial slot.
- Repeat **Start free** after the FAQ and retain **Sign in**.
- Keep the existing signup endpoint and fields while improving visible dialog states and the VidMagnet handoff.

## Canonical Example Fixture

Use one schema-valid synthetic fixture across the hero and artifact section. Both output views must visibly derive from the same source sentences.

**Source**

- Label: Example source
- Format: 45-minute coaching lesson
- Title: “Why clients leave a great call and still do not follow through”
- Excerpt:
  1. End each call with one priority, not a full list.
  2. Put the action on the calendar before the call ends.
  3. Name what “done” looks like and when you will check back.

**Guide view**

- Type label: Guide
- Title: “The Client Follow-Through Playbook”
- Desired outcome: “Leave every client call with one priority, one scheduled action, and one visible finish line.”
- Time required: 20 minutes
- Step 1: Choose the move that matters.
- Step 2: Put the action on the calendar.
- Step 3: Define proof and the follow-up.
- Checklist: One owner · One deadline · One proof.
- Next action: “Use the Weekly Reset Sheet.”

The checked-in `GuideContentV2` fixture must be complete, not a visual-only fragment:

- `schemaVersion: 2`, `format: "playbook"`, the title above, a one-sentence promise, introduction, conclusion, and call to action.
- `quickStart` uses the desired outcome and 20-minute time requirement above, has no invented prerequisites, and names Step 1 as the first action.
- One `technique` section, `follow_through_sequence`, contains three concrete blocks: a `steps` block with the exact three steps, a `checklist` block with One owner / One deadline / One proof, and a `worksheet` block titled Weekly Reset Sheet with prompts for priority, calendar slot, and visible proof.
- Each step includes an instruction and observable success criterion. No timestamps, duration claims, or source references are fabricated.

**Outcome Quiz view**

- Type label: Outcome Quiz
- Title: “What Is Breaking Your Follow-Through?”
- Selected answer: “Everything feels equally important.”
- Outcome: “The Priority Pile-Up”
- Summary: “Your plan is not missing effort. It is missing one visible next move.”
- Recommendation 1: Choose one action that changes the week.
- Recommendation 2: Schedule it before adding another task.
- Free gift: “Weekly Reset Sheet”
- CTA: “Build your follow-through system”

The checked-in Quiz fixture must satisfy the complete `QuizDefinition` contract:

- Description: “Find the point where a strong coaching conversation stops turning into client action.”
- Question 1: “At the end of a client call, what usually happens?” Options map exactly once to `priority_pile_up` or `invisible_finish_line`; the selected example is “Everything feels equally important.”
- Question 2: “How do you decide an action is finished?” Options map exactly once to the same two outcomes and make both outcomes reachable.
- Outcome `priority_pile_up` uses the title, summary, and two recommendations above. Outcome `invisible_finish_line` explains that the action lacks observable proof and recommends defining “done” plus booking the check-back.
- Lead capture is enabled but optional, includes first name and email, and uses product-truthful copy. Theme colors use the approved marketing fixture palette.
- A separate typed result projection supplies the synthetic Weekly Reset Sheet gift and “Build your follow-through system” CTA; synthetic positive IDs may be used only inside the fixture.

Fixture rules:

- Build it against the current shared Guide/Quiz shapes so the marketing example cannot drift into an impossible product.
- Until an actual generated fixture is reviewed, display “Example output using synthetic source content.”
- Never display “published,” customer metrics, or a customer brand on this synthetic fixture.
- The example may use “Northstar Coaching” only as an explicitly fictional brand.

## Visual and Interaction Direction

Classifier: **marketing / landing page**. The page is an editorial reveal, not an application dashboard.

- Full-bleed warm-paper first viewport; no inset rounded hero container.
- Continuous warm canvas with one dark ink artifact surface at most.
- Large whitespace and editorial hierarchy instead of alternating full-width bands.
- Rounded corners belong to meaningful objects, not every sentence.
- Glass is removed from the organizing language. The artifact uses paper, ink, rules, and one earned border.
- Use coral for the primary action, mint for progress/success, blue for structure, and ink for text.
- VidMagnet signature: a short coral **magnetic snapline** arcs from the stationary source edge to the finished artifact edge, ending in a small alignment notch. Use it once in the hero and optionally as a tiny section-rule detail; never place it behind text or animate it continuously.
- Persistent brand anchors: VidMagnet wordmark in the nav, coral dot/snapline, and a consistent artifact header treatment.
- Remove the generated magnetic-field images from the page unless they survive only as nonessential, nearly invisible texture.
- Use a 250 ms opacity/translate crossfade when the Guide/Quiz tab changes.
- One optional entrance reveal plus the tab crossfade; no other simultaneous motion.
- No parallax, animated connectors, looping particles, or auto-advancing states.
- Respect prefers-reduced-motion with an immediate state swap.
- Elevation budget: one subtle shadow on the artifact only. All other hierarchy comes from typography, rules, color, and spacing.

### Marketing tokens

| Role | Token/spec |
|---|---|
| Page canvas | #F4EFE6 warm paper |
| Quiet surface | #FBF8F2 canvas |
| Primary ink | #101419 |
| Primary CTA / snapline | #FF6B3D coral |
| Success / useful-output marker | #79D9C7 mint |
| Link / focus / structural accent | #3157F6 blue |
| Display | DM Sans 700 with Instrument Serif 400 italic used for one phrase at most |
| Body | DM Sans 400–500, 16–18 px, line height 1.55–1.7 |
| Metadata | IBM Plex Mono 500, 12 px minimum |
| Hero H1 | clamp(48px, 6vw, 84px), line height 0.98–1.04, max 10–11 words per visual line |
| Section H2 | clamp(38px, 4vw, 64px), line height 1.02–1.1 |
| Content width | 1200 px maximum on a 12-column grid |
| Section spacing | 96 px desktop, 72 px tablet, 56 px mobile |
| Radii | 8 px controls, 14 px small surfaces, 24 px artifact; pill only for tabs/badges |
| Focus | 2 px utility blue with 3 px offset; minimum 3:1 against adjacent color |

### Complexity budget

- Sales page target: under ~500 lines after component extraction.
- New artifact-proof component target: under ~300 lines.
- Marketing-only local state: signup dialog, FAQ accordion, and one Guide/Quiz selection. No simulated email, branding, benefit, quiz-answer, or publish workflow state.
- Remove ContentReactor and PublishingSystem from the route. Delete their files only after reference search confirms no other consumers.
- No new animation library or runtime dependency.
- Local images should be compressed and sized to their rendered dimensions.
- One interactive explainer, one primary CTA label, five sections, one dark surface, and no feature grid.
- Introduce no more than three concepts before the first repeated CTA.
- Introduce no more than one new product term in any section.
- No section may require horizontal scanning to understand its story.

## Phase 2 — Design Plan Review

### Step 0 — Design scope assessment

- UI scope: one public marketing route, one artifact-proof interaction, the existing signup dialog, FAQ, and immediate login/complete-account continuity.
- Classifier: marketing / landing page.
- Initial design completeness: **7/10**. Strategy, boundaries, and component budget were strong; exact artifact copy, section consolidation, interaction semantics, responsive composition, visible states, and a memorable brand signature were missing.
- A 10/10 plan for this scope specifies the first/second/third visual hierarchy, actual output content, one interaction contract, every user-visible state, exact responsive behavior, accessibility semantics, brand tokens, and a visual reference.
- DESIGN.md exists. The palette, type, grid, output-quality rules, and “finished output first” rule remain useful. “Editorial product lab” is revised by this plan to **product-evidence-first editorial reveal**.
- Autoplan focus decision: review all seven dimensions. Structural fixes were auto-accepted; aesthetic choices are logged as taste decisions.

Prior learning applied: **amg_academy_flowchart_first** (confidence 10/10, user-stated). The user consistently prefers a visible, sequential path over a flat catalog. Here that means one source-to-output reveal and one short recipient path, not feature cards.

### Visual exploration

The gstack PNG generator was available but could not generate because the configured OpenAI organization requires verification. Autoplan used the required local HTML fallback and browser-inspected three high-fidelity directions:

| Direction | Strength | Risk | Decision |
|---|---|---|---|
| A — The Reveal | Clearest literal source-to-output story; conversion-familiar; strongest first scan | Could become a conventional split SaaS hero if over-carded | **Approved baseline** |
| B — Editorial Proof | Strongest product-evidence-first object and open editorial rhythm | Headline becomes more abstract; source-to-result payoff starts lower | Borrow below-fold rhythm only |
| C — Magnetic Path | Most playful and energetic | Blue stage, path, and centered layout reintroduce visual theater | Reject as page direction; borrow only the restrained snapline idea |

Approved synthesis: Direction A’s hierarchy, Direction B’s open below-fold rhythm, and one small coral magnetic snapline inspired by Direction C.

### Design outside voices

**CODEX SAYS (design — UX challenge):**

- The artifact-led direction is correct, but the prior plan was still a strategy rather than an implementable UI specification.
- It flagged two hard-rejection risks: weak VidMagnet identity and lower sections becoming stacked product cards.
- It required five-section consolidation, exact fixture copy, a truthful “Example output” label, one tab contract, intentional responsive behavior, exact accessibility semantics, a brand signature, and experience budgets.
- It rated the planned anchor and restrained motion positively, while rejecting generic cards and shadow-dependent hierarchy.

**CLAUDE SUBAGENT (design — independent review):**

- It independently found that the current page has competing first-screen anchors, repeated Guide/Quiz teaching, drifting synthetic proof, toast-only signup failures, broken ConvertMag continuity, excessive shadows/tiny labels, looping motion, and CTA vocabulary drift.
- It recommended schema-valid fixtures or renderer-derived screenshots, a persistent signup state model, a consistent VidMagnet public-auth presentation, one local hero interaction, stable-height output, and stable CTA placement IDs.
- It agreed that the artifact-led reset is the correct direction and did not request a product-direction change.

### Design outside voices — litmus scorecard

| Check | Claude | Codex | Consensus and plan action |
|---|---|---|---|
| Brand unmistakable in first screen? | No in current UI | No in prior plan | Confirmed gap → persistent wordmark + coral snapline + artifact header |
| One strong visual anchor? | No in current UI | Yes in proposed plan | Current/proposed disagreement → artifact becomes the only complex hero object |
| Page understandable by scanning headlines only? | No | No | Confirmed gap → final five headlines locked |
| Each section has one job? | No | No | Confirmed gap → consolidate to five buyer decisions |
| Cards actually necessary? | No | No | Confirmed → cardless page rhythm; one earned artifact surface |
| Motion improves hierarchy? | No in current UI | Yes if only output changes | Scope disagreement → retain only 250 ms output crossfade |
| Premium without decorative shadows? | No in current UI | Yes in proposed direction | Use typography, spacing, rules, and tonal contrast; one artifact shadow |

Hard rejections before fixes: current busy hero imagery and repeated mood statements; planned risk of weak brand and stacked product cards. Hard rejections after plan fixes: **none**.

Both outside voices supported the confirmed artifact-led direction. No Autoplan User Challenge gate was triggered.

### Pass 1 — Information architecture: 7/10 → 10/10

First, second, and third:

1. **First:** plain promise and Start free.
2. **Second:** stationary source becoming one useful Guide by default, with Outcome Quiz available as the only alternate view.
3. **Third:** proof that value continues through brand, capture, delivery, and next step.

If only three ideas survive the whole page, they are:

- Your existing expertise is the input.
- A useful Guide or personalized Outcome Quiz is the output.
- The published experience captures the lead and gives them a relevant next step.

Desktop page structure:

~~~text
┌─────────────────────────────────────────────────────────────────────────┐
│ VidMagnet        What it makes · Guide or Quiz · Delivery · FAQ         │
│                                                   Sign in · Start free   │
├───────────────────────────────┬─────────────────────────────────────────┤
│ H1 + one supporting sentence  │ small SOURCE  →  one ARTIFACT surface   │
│ Start free · See what it makes│                 [Guide | Outcome Quiz]  │
├───────────────────────────────┴─────────────────────────────────────────┤
│ TEACH THE NEXT MOVE — OR DIAGNOSE WHERE TO START                        │
│ One open comparison using the same source; repeated CTA follows         │
├─────────────────────────────────────────────────────────────────────────┤
│ GIVE THEM SOMETHING WORTH THE EMAIL                                     │
│ One annotated artifact; labels sit outside/alongside the surface        │
├─────────────────────────────────────────────────────────────────────────┤
│ FROM OPT-IN TO NEXT STEP, WITHOUT LOSING YOUR BRAND                     │
│ Brand → capture → useful value → gift/CTA as one continuous sequence    │
├─────────────────────────────────────────────────────────────────────────┤
│ TRUST + FAQ                         YOUR NEXT MAGNET MAY ALREADY EXIST    │
│                                     Start free · Sign in                 │
└─────────────────────────────────────────────────────────────────────────┘
~~~

Navigation:

- Desktop: Wordmark; What it makes; Guide or Quiz; How delivery works; FAQ; Sign in; Start free.
- Mobile: Wordmark + Start free only. Section links and Sign in move into the footer; no hamburger for four optional anchor links.
- Primary CTA label is always **Start free**. Every instance carries a stable placement identifier: nav, hero, post-proof, final.

### Pass 2 — Interaction state coverage: 6/10 → 10/10

| Feature | Loading | Empty/initial | Error | Success | Partial/degraded |
|---|---|---|---|---|---|
| Artifact proof | None; static fixture | Guide selected and fully visible | Semantic text remains if optional media fails | Selected tab and panel visibly match | If tab enhancement fails, Guide remains readable; `<noscript>` provides a plain product promise and navigation, not an interactive artifact |
| Guide/Quiz tabs | None | Guide tab selected | No async failure path | One fixed-height panel swaps | Reduced motion swaps immediately |
| Signup dialog | Submitting button, aria-busy, dismissal disabled | Idle form with visible labels | Persistent inline role=alert; values retained | Server binds the pending user to the session, then redirects without PII | Same-session pending signup resumes; another session gets a generic emailed-recovery path; completed account shows Sign in |
| Signup fields | N/A | Empty values with visible labels | aria-describedby ties field to exact message | Error clears after valid correction | Optional fields remain optional |
| Complete account | “Preparing your VidMagnet account” | Server-verified pending identity, password form visible | Missing/expired/used handoff gives Start over, Send recovery link, and Sign in actions | Awaited session persistence, then “Workspace ready” and redirect | Retry retains only safe non-password context; URL tokens are scrubbed after capture |
| FAQ | None | All items collapsed | N/A | One or more items follow current Radix behavior | Keyboard and reduced-motion behavior unchanged |
| Fonts | Browser load | Fallback DM-compatible sans/Georgia serif | No blank text | Web fonts swap without layout collapse | System fallback remains readable |
| Navigation/anchors | None | Top of page | Missing target is blocked by QA | Focus moves/scrolls to visible heading | Reduced motion disables smooth scroll |

Signup state contract:

- Idle → invalid or submitting.
- Invalid → idle when corrected.
- Submitting → duplicate, retryable error, or success/redirecting.
- Duplicate → Sign in or edit email.
- Retryable error → retry with values intact.
- Success/redirecting → server-bound session or emailed one-time proof, then complete-account; no PII is stored in the browser handoff.
- Escape and overlay dismissal are disabled only while submitting; focus returns to the exact CTA that opened the dialog otherwise.

### Pass 3 — User journey and emotional arc: 7/10 → 10/10

| Step | User does | Intended feeling | Design support |
|---|---|---|---|
| 1 | Lands and scans | “This is for content I already have.” | Source is recognizable before product terms accumulate |
| 2 | Sees Guide output | “That is more useful than a summary.” | Finished artifact is the dominant visual anchor |
| 3 | Switches to Quiz | “I understand which format fits.” | Same source, different job, one obvious tab |
| 4 | Reads annotated usefulness | “My lead would actually want this.” | Concrete quick start, steps, outcome, recommendations, and next action |
| 5 | Sees delivery path | “This can look like me and support my offer.” | Brand/capture/gift/CTA shown as one recipient sequence |
| 6 | Opens signup | “This is a low-risk next step.” | Start free, short form, visible state and recovery |
| 7 | Reaches complete account | “I am still in VidMagnet.” | Consistent name, colors, typography, status, and recovery |

Time horizons:

- Five seconds: understand source → useful output.
- Five minutes: understand Guide vs Quiz, recipient path, source support, and signup expectations.
- Five years: remember VidMagnet as the tool that pulls useful action out of existing expertise, reinforced by the restrained snapline signature.

### Pass 4 — AI slop risk: 8/10 → 10/10

- No three-column icon feature grid.
- No centered-everything layout.
- No purple/indigo gradient.
- No decorative blobs, floating orbits, glass stack, or wavy divider.
- No uniform bubbly radii.
- No icon-in-colored-circle decoration.
- No carousel.
- No generic “all-in-one” or “unlock the power” copy.
- No repeated equal-height section rhythm.
- No card grid masquerading as information architecture.
- No hero background art behind copy.
- One artifact surface earns containment because it is the interaction.
- Page must still feel premium with all box shadows disabled.

### Pass 5 — Design-system alignment: 7/10 → 10/10

- Reuse DESIGN.md palette, type families, 4 px spacing system, 12-column grid, and output-quality rules.
- Revise the named direction from “editorial product lab” to “product-evidence-first editorial reveal.”
- Preserve customer-brand isolation: VidMagnet colors frame the marketing example but never imply that customer-facing outputs are locked to VidMagnet styling.
- Reuse Button, Dialog, Accordion, form field, and focus patterns.
- New ArtifactProof fits the vocabulary only if it renders schema-valid content, uses the exact fixture, and remains the sole complex marketing component.
- Marketing color roles should become CSS custom properties in the implementation rather than dozens of repeated literal class values.

### Pass 6 — Responsive and accessibility: 7/10 → 10/10

| Viewport | Intentional composition |
|---|---|
| ≥1280 px | 12-column canvas; hero 5/7 split; artifact min-height 560 px; H1 72–84 px; max copy line 11 words |
| 1024–1279 px | 5/7 split remains; artifact min-height 520 px; navigation gaps tighten; body remains ≥16 px |
| 768–1023 px | Single column; copy/actions first, then source, tabs, output; H1 56–64 px; no leader lines |
| 375–767 px | Wordmark + Start free nav; H1 46–54 px; CTAs wrap without shrinking; source and output full width; tabs have equal 44 px+ targets; annotations move below targets |
| 200% zoom | Force the same single-column order as tablet; no clipped fixed-height text; artifact minimum becomes content-driven |

Mobile structure:

~~~text
┌──────────────────────────────┐
│ VidMagnet          Start free│
├──────────────────────────────┤
│ H1                           │
│ one supporting sentence      │
│ Start free  See what it makes│
├──────────────────────────────┤
│ EXAMPLE SOURCE               │
│ three short source lines     │
│ [ Guide | Outcome Quiz ]     │
│ FINISHED OUTPUT              │
│ readable full-width content  │
├──────────────────────────────┤
│ Guide teaches / Quiz diagnoses│
├──────────────────────────────┤
│ annotated usefulness         │
├──────────────────────────────┤
│ brand → capture → value → CTA│
├──────────────────────────────┤
│ FAQ · Start free · Sign in   │
└──────────────────────────────┘
~~~

Accessibility contract:

- WCAG AA: 4.5:1 body text; 3:1 large text, focus indicators, and component boundaries.
- Marketing body text is 16 px minimum; metadata is 12 px minimum and passes contrast.
- Guide/Quiz uses one tablist and one named tabpanel. Left/right arrows change tabs; Tab leaves the control.
- Color is not the only distinction; selected tab uses label, weight, border, and state.
- Artifact content is semantic text, not text baked into an image.
- The tabpanel is not a broad live region; focus stays on the selected tab.
- Signup field errors use aria-describedby. Request failure uses a persistent role=alert inside the dialog.
- Dialog establishes deliberate initial focus, traps focus, closes with Escape when safe, and returns focus to the triggering CTA.
- Submitting uses aria-busy; the button retains an accessible name as its visible text changes.
- Decorative texture, snapline, and icons are hidden from assistive technology.
- Skip link, landmarks, heading order, visited-link distinction, and 44 px touch targets are required.

### Pass 7 — Design decisions: seven resolved, zero deferred

| Decision | Auto-decision | If left open |
|---|---|---|
| Default artifact | Guide | Random choice or remembered state complicates the story |
| Control semantics | One hero tablist/tabpanel; no URL/persistence/autoplay | Duplicate controls and accessibility drift |
| Fixture truth | Schema-valid synthetic fixture labeled Example output | Synthetic marketing can look like fake customer proof |
| Section count | Five buyer decisions | The product tour regrows |
| Mobile navigation | Wordmark + Start free; optional links in footer | Unnecessary hamburger and hidden conversion path |
| Brand signature | One coral snapline + wordmark + artifact header | Pleasant but forgettable generic SaaS |
| Visual direction | A-led synthesis with B rhythm; C rejected except snapline | Another taste-driven redesign without a reference |

No aesthetic decision changes the confirmed product direction. No second user gate was required.

### Design-specific NOT in scope

- Customer testimonials, logos, or quantified results without approval.
- Live public generation or editable demo controls.
- A fully redesigned authenticated application.
- CRM/integration illustrations.
- A carousel, video background, or image-generated hero.
- A separate agency landing-page variant.

### Design-specific reuse

- Existing VidMagnet wordmark and accessible CTA/dialog/accordion primitives.
- GuideContentRenderer content model and visual leaf patterns.
- QuizRunner outcome, recommendation, gift, and CTA patterns.
- Current palette, Instrument Serif accent, DM Sans body/display, and IBM Plex Mono metadata.
- Existing signup mutation contract and public Guide/Quiz truth.
- Existing focus, keyboard, and reduced-motion foundations where they meet the new exact contract.

## Approved Mockups

| Screen/section | Mockup path | Direction | Notes |
|---|---|---|---|
| Sales page desktop | /Users/adamlinkenauger/.gstack/projects/alinkenauger-SportsContentMagnet/designs/sales-page-artifact-reset-20260814/variant-a.png | A — The Reveal | Approved baseline; use B’s open below-fold rhythm; remove published badge and golf-specific copy; use canonical fixture |
| Sales page mobile | /Users/adamlinkenauger/.gstack/projects/alinkenauger-SportsContentMagnet/designs/sales-page-artifact-reset-20260814/variant-a-mobile.png | A — The Reveal responsive reference | Preserve CTA-before-artifact order; refine long H1 wrapping and remove reviewer tag |
| Comparison HTML | /Users/adamlinkenauger/.gstack/projects/alinkenauger-SportsContentMagnet/designs/sales-page-artifact-reset-20260814/index.html | A/B/C study | Variant A selected automatically under Autoplan’s six principles |

Mockup-generation note: the native design generator returned an organization-verification error for all three PNG requests. These approved references are the skill’s local HTML fallback, browser-rendered at 1440×1000 and 375×812.

### Design review completion summary

| Review area | Result |
|---|---|
| System audit | DESIGN.md exists; UI scope confirmed; current page has two single-use simulations |
| Step 0 | 7/10 initial; all seven dimensions reviewed |
| Pass 1 — Information architecture | 7/10 → 10/10 |
| Pass 2 — Interaction states | 6/10 → 10/10 |
| Pass 3 — Journey | 7/10 → 10/10 |
| Pass 4 — AI slop | 8/10 → 10/10 |
| Pass 5 — Design system | 7/10 → 10/10 |
| Pass 6 — Responsive/a11y | 7/10 → 10/10 |
| Pass 7 — Decisions | Seven resolved; zero deferred |
| NOT in scope | Six design categories written |
| What already exists | Six reuse categories written |
| Approved mockups | Three directions generated; A-led synthesis approved |
| Decisions made | Seven design decisions added |
| Decisions deferred | Zero |
| Overall design completeness | **7/10 → 9/10** |

The plan is design-complete for engineering review. The remaining one point is implementation fidelity, which must be assessed through post-build visual QA rather than more planning.

## Phase 3 — Engineering Plan Review

### Step 0 — Scope and minimum safe change

Review mode: **FULL REVIEW**. The approved artifact-led page remains the smallest useful visual change, but the existing inline signup path creates a release-blocking security boundary. Autoplan therefore keeps the visual direction and expands only the funnel boundary required to ship its CTA responsibly.

Minimum production architecture:

- One new `ArtifactProof` component and one typed fixture module.
- One five-section `SalesPage` composition.
- Existing Radix/shadcn controls, Zod, React Query, and shared Guide/Quiz schemas.
- A secure pending-account handoff; no name or email in the completion URL.
- Route-level lazy loading so anonymous visitors do not download the authenticated application.
- No new AI call, public generator, product API, database content model, animation library, or decorative hero image.

Complexity smell: the complete release slice touches more than eight files. That is justified only because it contains three separable concerns—marketing UI, an already-existing auth vulnerability on the CTA path, and durable browser regression coverage. Each concern stays in its own module boundary and commit. The marketing UI itself remains five production files or fewer.

### Verified findings and Autoplan decisions

#### 1. Pending-account completion is claimable by email alone

`[P0] (confidence: 10/10) server/authRoutes.ts:31-34,348-384 — a pending account can be assigned a password and authenticated using only its email address.`

Motivating code:

> `const completeAccountSchema = z.object({ email: z.string().email(...), password: z.string().min(8, ...) });`

> `const { email, password } = completeAccountSchema.parse(req.body);`

> `const user = await storage.getUserByEmail(email);`

> `await storage.updateUserPassword(user.id, hashedPassword);`

The client obtains that identity from attacker-editable URL parameters or local storage, then the server marks it verified and creates an authenticated session. Duplicate pending accounts are simultaneously unable to sign in because they have no password.

Autoplan decision: **release-block the public CTA until completion is bound to server-held pending state or a short-lived one-time email token.** The immediate same-browser flow uses a server session; recovery from another browser uses an expiring single-use email link. Completion accepts a password plus server proof, never a caller-supplied email. Session persistence is awaited, completion proof is cleared after one use, and email is marked verified only after an emailed proof.

#### 2. Current source-support claims overstate production behavior

`[P0] (confidence: 10/10) server/routes.ts:497-561 and client/src/pages/create-guide.tsx:214-220 — PDF and streaming return 501, and web links use an input method the server rejects.`

Motivating code:

> `return res.status(501).json({ message: "PDF processing temporarily unavailable..." });`

> `return res.status(501).json({ message: "Streaming video processing not yet implemented..." });`

> `} else if (inputMethod === "link") { requestData.contentUrl = contentUrl; }`

> `return res.status(400).json({ message: "Invalid input method" });`

Autoplan decision: make capability truth a hard pre-copy gate. Public wording is limited to pasted text/source and verified YouTube-to-Guide behavior. Audio remains unclaimed until a production-like smoke test passes. PDF, web URL, streaming, and identical Guide/Quiz source parity are excluded.

#### 3. Signup creation and completion are not reliably resumable

`[P1] (confidence: 9/10) server/authRoutes.ts:63-123,386-418 — user/subscription creation precedes a potentially unbounded CRM call, and completion responds without awaiting session save.`

Motivating code:

> `await highLevelService.addContact({ ... });`

> `req.session.save((err) => { if (err) { console.error(...) } });`

> `res.status(200).json({ ... redirect: "/dashboard" });`

Autoplan decision: make pending signup idempotently resumable, ensure a free subscription only when absent, bound CRM latency with an abort timeout and keep CRM failure non-fatal, and await session persistence before success. A lost response after account creation must not strand the visitor in the duplicate/login dead end.

#### 4. Anonymous visitors currently download the authenticated application

`[P1] (confidence: 10/10) client/src/App.tsx:8-39 — every public, authenticated, admin, billing, editor, and analytics page is statically imported into one route bundle.`

Current production baseline on 2026-08-14:

- 1,230.20 kB minified JavaScript; 327.03 kB gzip.
- 169.75 kB CSS; 25.36 kB gzip.
- 2,463 transformed modules and a Vite chunk-size warning.
- The two single-use simulations total 1,588 source lines; their two PNGs total about 3.1 MiB.

Autoplan decision: use `React.lazy` and `Suspense` at route boundaries, render a neutral auth-loading shell instead of treating `isLoading` as anonymous, and keep `/complete-account` stable while auth state changes. Remove Framer Motion only after a repository reference check confirms the simulations were its last consumers. Public sales-route budgets: **≤200 kB gzip initial JS, LCP ≤2.5 s in the mobile lab profile, CLS <0.1, zero horizontal overflow at 375 px and 200% zoom**.

#### 5. The canonical fixture was visually exact but not schema-complete

`[P1] (confidence: 9/10) shared/quiz.ts:90-163 and shared/guideContent.ts:238-255 — the real contracts require fields, questions, outcomes, blocks, and reachability that the original fixture summary did not fully specify.`

Autoplan decision: check in complete typed Guide, Quiz, and result constants and validate them with the real Zod schemas. The page consumes a deliberately small display projection from those constants; engineers do not invent missing questions, outcome mappings, or blocks in JSX.

#### 6. The repository has no frontend test runner

`[P1] (confidence: 10/10) package.json:6-14 — current tests are Node/tsx business tests; there is no component or browser runner for tabs, dialogs, redirects, overflow, or reduced motion.`

Baseline verification:

- `npm run build`: passes; chunk warning remains.
- `npm run test:guide-content`: 6/6 passes.
- `npm run test:quiz`: 4/4 passes.
- `npm run test:branding`: 8/8 passes.
- `npm run check`: fails with many pre-existing repository errors; it cannot be the sole release signal.

Autoplan decision: add a scoped marketing TypeScript config/command and Playwright as a dev-only browser regression runner. Keep schema and handoff helpers under existing `node:test`. The full repository check remains reported honestly; all new/touched-file errors are zero before release.

#### 7. The no-JS and static-shell contracts were not implementable as written

`[P1] (confidence: 10/10) client/index.html:5,13-17 — the root is empty without JavaScript, zoom is constrained by maximum-scale, and a Replit development script loads unconditionally.`

Motivating code:

> `<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />`

> `<div id="root"></div>`

> `<script type="text/javascript" src="https://replit.com/public/js/replit-dev-banner.js"></script>`

Autoplan decision: remove `maximum-scale=1`, remove the unconditional development banner, update title/description/OG copy to the verified promise, and provide only a truthful minimal `<noscript>` promise plus Sign in/enable-JavaScript guidance. The artifact itself is progressively robust when JavaScript enhancement fails; this plan does not claim SSR.

#### 8. The current redesign is not safely recoverable from git history yet

`[P1] (confidence: 10/10) git status on 2026-08-14 — SalesPage and index are modified while both simulations, both images, DESIGN.md, and the plan are untracked.`

Autoplan decision: before implementation, create a dated non-destructive baseline containing the tracked binary diff, untracked-file manifest/archive, HEAD, and checksums under the project’s `.gstack` record. Do not reset, stash, or delete user work. Integrate the replacement first; delete old simulations/assets only after build, browser QA, and a zero-reference search.

#### 9. Immediate signup continuity has typed-response and branding breaks

`[P2] (confidence: 10/10) client/src/pages/complete-account.tsx:42-62 and server/services/emailService.ts:75-166 — the client reads redirect from a raw Response, while browser and welcome-email copy revert to ConvertMag.`

Motivating code:

> `onSuccess: async (response: any) => { ... const redirectUrl = response.redirect || "/dashboard"; }`

> `subject: 'Welcome to ConvertMag.net - Your Account is Ready!'`

Autoplan decision: parse and type response JSON, eliminate `any` in the touched flow, and make the immediate browser, API, recovery email, and welcome email consistently VidMagnet. A repository-wide vocabulary migration remains out of scope.

### Engineering outside voices

Two independent reviews completed:

- **Independent engineering challenge:** 10 findings. It conditionally approved the artifact-led visual architecture but found account completion, capability truth, public-route bundling, schema fixture completeness, executable test coverage, static-shell claims, and rollback sequencing insufficient.
- **Independent test/feasibility audit:** reached the same release-blocker conclusion, traced the same pending-account takeover and dead-end, and recommended typed fixture tests plus browser-level coverage.
- **Codex CLI engineering pass:** unavailable because the sandbox reviewer rejected sending private repository/plan contents to an external service. Autoplan did not retry or work around that boundary.

### Engineering outside voices — consensus table

| Check | Independent engineering challenge | Independent test/feasibility audit | Consensus and plan action |
|---|---|---|---|
| Keep Direction A? | Yes | Yes | Retain the artifact-led visual direction |
| Is email-only completion a release blocker? | Yes, P0 | Yes, critical | Add server-bound completion and one-time recovery before public CTA release |
| Are current source claims too broad? | Yes | Yes | Limit copy to pasted source and verified YouTube-to-Guide behavior |
| Must fixtures use full real contracts? | Yes | Yes | Check in complete Guide/Quiz/result constants and Zod tests |
| Is browser regression coverage required? | Yes | Yes | Add scoped TypeScript, Node tests, and Playwright |
| Does public-route delivery need work? | Yes; monolithic bundle | Yes; simulations and Framer Motion are measurable cost | Lazy-load routes, remove unreferenced simulations/assets, enforce budgets |

Engineering consensus: **6/6 confirmed; 0 disagreements.** The unavailable Codex CLI pass is recorded as a coverage limitation, not silently represented as a successful cross-model review.

Cross-review result: **no direction-level tension.** Both available reviewers support Direction A and agree that secure completion is the minimum responsible expansion. Because they did not recommend changing the user’s chosen visual direction, Autoplan’s User Challenge gate was not triggered.

### Final engineering architecture

~~~text
ANONYMOUS BROWSER
  |
  +-- / ----------------------------------------------------------+
  |   SalesPage                                                   |
  |     +-- ArtifactProof                                         |
  |     |     +-- typed Guide fixture -- real Guide schema        |
  |     |     +-- typed Quiz/result fixture -- real Quiz schema   |
  |     +-- five buyer-question sections                          |
  |     +-- FAQ                                                   |
  |     +-- Signup dialog ------------------------------------+   |
  |                                                          |   |
  +-- lazy public/auth route chunks                           |   |
                                                             v   |
SERVER                                                    POST signup
  |                                                          |
  |  create/resume pending user + ensure free plan            |
  |  bind pendingSignupUserId to saved session                |
  |  CRM sync: bounded, best effort                           |
  |                                                          v
  +-- /complete-account <--- session proof OR expiring email token
          |
          +-- valid + unused -> set password -> clear proof
          |                    -> verify only emailed proof
          |                    -> regenerate/save auth session
          |                    -> /dashboard
          +-- missing/expired/used -> recover / start over / sign in
~~~

This pre-implementation architecture note applied to the sales-page/auth slice only: it introduced no new distributable artifact or auth table. The broader v1.1 release also adds the ordered Quiz and brand-appearance migrations documented in the implementation evidence and `replit.md`.

### Codepath and test coverage map

~~~text
CODE PATHS                                             USER FLOWS
[GAP] Artifact fixture                                [GAP] Landing comprehension
  +-- Guide passes generated V2 schema                  +-- Guide default visible
  +-- Quiz passes definition schema                     +-- Quiz click + arrow keys
  +-- result IDs map to gift/CTA                        +-- reduced motion

[GAP] Signup                                          [GAP] Signup -> completion [->E2E]
  +-- invalid fields -> inline errors                    +-- valid new account
  +-- submit once -> pending state                       +-- slow request / double click
  +-- new -> saved pending session                       +-- response lost after commit
  +-- same-session pending -> resume                     +-- completed duplicate -> sign in
  +-- other-session pending -> recovery email            +-- pending duplicate -> recover
  +-- CRM timeout -> non-fatal                           +-- network/5xx -> retain + retry

[GAP] Complete account                                [GAP] Completion recovery [->E2E]
  +-- session proof OR valid token                       +-- valid session
  +-- expired/used/foreign token                         +-- valid email token
  +-- password validation                               +-- expired/used token
  +-- awaited session save                               +-- session-save failure
  +-- typed JSON response                                +-- auth state flips before redirect

[GAP] Route shell                                     [GAP] Responsive/a11y [->E2E]
  +-- auth loading -> neutral shell                      +-- 375/768/1280/1440
  +-- anonymous -> lazy sales chunk                      +-- 200% zoom/no overflow
  +-- authenticated -> lazy app chunk                    +-- dialog focus/escape/return
  +-- public delivery routes remain reachable            +-- one H1/landmarks/contrast

BASELINE: 0/31 planned branches have durable page/funnel coverage today.
TARGET: pure schema/handoff branches under node:test; all cross-component journeys under Playwright.
No LLM prompt or generation code changes are in this plan, so no eval suite is required.
~~~

### Worktree and sequencing strategy

| Step | Modules touched | Depends on |
|---|---|---|
| A. Baseline + truth lock | repository record, shared contracts | — |
| B. Secure completion contract | server auth/storage/email, auth pages | A |
| C. Typed artifact proof | shared contracts, marketing component | A |
| D. Public route split | client routing/build config | A |
| E. Sales-page integration | marketing page, metadata, design system | B, C, D |
| F. Browser regression suite | test config, public/auth routes | B, C, D, E |
| G. Reference cleanup and release QA | marketing assets, package manifest | F |

Parallel lanes:

- Lane A: baseline/truth lock.
- Then launch Lane B (auth), Lane C (artifact), and Lane D (routing) in parallel worktrees.
- Merge B/C/D before Lane E; only Lane E owns the final `sales-page.tsx` rewrite.
- Lane F follows integration; Lane G follows a green suite.

Conflict flags: auth and route work can both touch `App.tsx` if boundaries are not respected; only Lane D owns `App.tsx`. Package scripts/dependencies are updated once in Lane F/G. No two lanes edit `sales-page.tsx` concurrently.

### Engineering phase result

Architecture, code quality, tests, and performance were all reviewed at full depth. Direction A is feasible and remains approved. The original frontend-only boundary is rejected; the secure completion contract is a release prerequisite. With the decisions above reflected in the remaining sections and tasks, Engineering completeness moves from **6/10 to 9/10**. The remaining point is implementation evidence from browser QA and a production-like signup smoke test.

## Phase 3.5 — Developer Experience Review

Skipped by Autoplan scope classification. This change does not introduce a public SDK, CLI, API consumed by external developers, installation flow, or developer-facing integration contract. Internal test scripts and route chunking are implementation tooling, not a separate DX product surface.

## Section 1 — Architecture Review

Finding: the page architecture currently duplicates explanation across SalesPage, ContentReactor, PublishingSystem, RecipientExperience, workflow, and use-case cards.

Decision:

- Keep SalesPage as the route and owner of signup/FAQ behavior.
- Introduce at most one focused ArtifactProof component.
- Reuse existing UI primitives and product vocabulary.
- Use static synthetic product data; do not call protected Guide or Quiz APIs from the public page.
- Remove the two marketing simulations from the route and then delete them if unreferenced.
- Add route-level lazy loading and an explicit auth-loading shell; keep public delivery routes behaviorally unchanged.
- Change only the signup/completion auth boundary required to bind pending identity to server proof, provide expiring recovery, and await session persistence. Do not change guide generation, quiz scoring, public customer delivery, billing, or brand storage.

Target architecture:

~~~mermaid
flowchart TB
  A["Public SalesPage route"] --> B["Hero copy + ArtifactProof"]
  A --> C["Buyer-question sections"]
  A --> D["Existing FAQ"]
  A --> E["Existing signup Dialog"]
  B --> F["Static synthetic Guide proof"]
  B --> G["Static synthetic Quiz proof"]
  E --> H["Hardened POST /api/auth/signup"]
  H --> I["Server-bound /complete-account flow"]
  J["GuideContentRenderer patterns"] -. "visual/content truth, no public API call" .-> F
  K["QuizRunner patterns"] -. "visual/content truth, no public API call" .-> G
~~~

Issues found: one P0 completion-identity flaw; five P1 architecture/test/performance gaps; one P2 response/branding gap. A contained backend auth change is required before the public CTA ships.

## Section 2 — Error & Rescue Map

The redesign should reduce the public page to one network mutation: existing signup. Every other demonstration state is local and deterministic.

Key decisions:

- Preserve Zod form validation and visible field messages.
- Preserve duplicate-account handling and route to Sign in.
- Remove localStorage and name/email URL persistence from account completion.
- Bind pending completion to the saved server session; allow an expiring single-use emailed recovery token when that session is unavailable.
- Await session creation and expose recoverable missing/expired/used states.
- Keep API/network errors visible in the dialog without losing entered values.
- Provide local font fallbacks and an artifact visual that remains understandable if optional media fails.
- Avoid a live generation demo, eliminating public AI latency, quota, content-safety, and abuse paths from this slice.

## Section 3 — Security & Threat Model

No new content API or data store is required. The existing public auth surface must be narrowed.

- Continue sending signup PII only in the POST body to the existing signup endpoint; never place name/email in the URL, browser logs, or analytics.
- Completion identity comes from `pendingSignupUserId` in the server session or an expiring, one-time emailed token; the request body never selects an account by email.
- A same-session pending signup may resume idempotently. Another session receives a generic recovery response to avoid exposing pending state.
- Do not mark email verified for a session-only completion; only an emailed proof can verify ownership.
- Do not place email input inside a fake interactive demo.
- Use synthetic or explicitly approved sample content; no customer names, leads, source transcripts, or private brand assets.
- Do not send source content, email, or form values in marketing analytics events.
- Keep external links on safe rel attributes and preserve existing form validation.
- Do not add a public URL/source processor without a separate abuse, rights, SSRF, cost, and privacy review.

Issues found: one verified P0 incomplete-account claim path in the existing funnel. The contained completion proof closes that path; live source processing remains out of scope because it would add multiple high-severity surfaces.

## Section 4 — Data Flow & Interaction Edge Cases

Primary data path:

~~~mermaid
flowchart LR
  A["Visitor lands"] --> B["Reads promise"]
  B --> C{"Views Guide or Quiz proof"}
  C --> D["Clicks Start free"]
  D --> E["Signup Dialog"]
  E -->|Valid| F["POST /api/auth/signup"]
  E -->|Invalid| G["Inline form errors"]
  F -->|New account| H["Save pending identity in server session"]
  H --> I["/complete-account without PII"]
  F -->|Same pending session| J["Resume completion"]
  F -->|Other pending session| L["Generic emailed recovery"]
  F -->|Complete account| M["Sign in"]
  F -->|Network/server error| K["Visible retryable error"]
~~~

Shadow paths and edge cases:

- JavaScript loads but optional Google Font fails → system font fallback.
- Proof media fails → semantic text and CSS artifact remain; no blank hero.
- Reduced motion → no transition dependency.
- Narrow viewport or 200% zoom → control wraps/stacks; no horizontal scroll.
- Keyboard-only user → skip link, proof tabs, accordion, dialog, validation, and close action remain operable.
- Duplicate complete account → no data loss; direct Sign in path.
- Pending account → same session resumes; another session can request a one-time recovery link.
- Missing, expired, foreign, or reused completion proof → no password write; clear recovery actions.
- Signup request is slow → button disabled and pending label visible.
- CRM timeout → signup completes; integration failure remains non-fatal and server-visible.
- Session save failure → no false success response.
- Content claim cannot be verified → omit rather than fill with placeholder proof.

Unresolved: current analytics transport and current funnel baseline are not established.

## Section 5 — Code Quality Review

Findings:

- Marketing explanation is spread across 2,261 lines before shared primitives.
- ContentReactor and PublishingSystem are single-use components.
- The page hardcodes repeated visual values and carries product-language drift.
- Existing product renderers are richer and more truthful than the marketing simulation.
- CompleteAccount treats a raw `Response` as decoded JSON and uses `any` across the handoff.
- The full app is statically imported into the anonymous bundle.

Plan:

- Collapse marketing-specific explanation into one focused component and clear section data.
- Keep sample content as typed constants.
- Parse and type signup/completion responses; use machine-readable response codes for complete, pending, expired, and retryable states.
- Prefer existing Button, Dialog, Accordion, form, and icon primitives.
- Avoid generalized abstractions that have only one consumer.
- Search references before deleting old components and generated assets.
- Update DESIGN.md so future redesigns do not reintroduce the same metaphor-heavy pattern.

## Section 6 — Test Review

Required behavior matrix:

| Area | Test |
|---|---|
| Promise | Five-second test: visitor states input, useful output, and business next step without learning internal terms |
| Artifact toggle | Guide and Quiz tabs update visible proof, ARIA state, and focus behavior |
| Signup validation | Required names and email errors remain visible |
| Signup success | Pending identity is saved server-side; redirect contains no name/email |
| Pending/duplicate account | Same-session resume, emailed recovery, and completed-account Sign in each work |
| Network error | Dialog retains values and presents retry |
| Completion proof | Valid session/token succeeds; missing, expired, foreign, and used proof cannot write a password |
| Session persistence | Save failure returns a visible error; success does not race auth state |
| CRM timeout | Signup remains successful and retry-safe |
| FAQ | Keyboard open/close behavior unchanged |
| Reduced motion | State changes immediately without hidden/delayed content |
| Responsive | 375, 768, 1280, and 1440 widths; no overflow; primary CTA visible |
| Accessibility | One H1, landmarks, labels, contrast, 44 px targets, focus visibility, 200% zoom |
| Performance | No oversized marketing component or uncompressed decorative image regresses initial load |
| Product truth | Every claim checked against current Guide/Quiz creation and public delivery behavior |

Verification commands after implementation:

- npm run build
- npm run check, with new-file errors separated from pre-existing repository errors
- npm run check:marketing
- npm run test:marketing
- npm run test:auth-handoff
- npm run test:e2e:marketing
- Existing targeted tests: npm run test:guide-content, npm run test:quiz, npm run test:branding
- Browser smoke test with the standalone Vite path documented for this repository

## Section 7 — Performance Review

The current page pays for 1,588 lines of interactive simulation plus large section trees, but the bigger delivery problem is a monolithic 327.03 kB gzip JavaScript entry that statically imports the authenticated application.

- Remove marketing-only simulations from the entry route.
- Lazy-load route components and show a neutral auth-loading shell.
- Do not add another image-generated hero as a required largest-contentful element.
- Prefer CSS and inline product proof; if a raster is retained, use explicit dimensions and compression.
- No autoplay video.
- No new dependency.
- Target ≤200 kB gzip initial public-route JavaScript, mobile-lab LCP ≤2.5 s, CLS <0.1, stable layout, and quick interaction readiness.
- Record before/after bundle output, LCP/CLS, and page screenshot dimensions during implementation review.

Issues found: one verified public-route bundling problem and one verified simulation/image cost. Exact post-split byte delta must be measured during build.

## Section 8 — Observability & Debuggability Review

The repository does not establish a trusted marketing-to-activation funnel for this page.

Event contract to define without selecting or inventing a vendor:

- sales_page_view
- artifact_output_selected with Guide or Quiz
- signup_opened with CTA placement
- signup_submitted
- signup_succeeded
- signup_duplicate
- signup_failed with non-PII error class
- first_source_submitted
- first_asset_published

Only the first six are inside the page journey; the final two belong to authenticated product activation. Implementation of a transport is deferred until the current analytics architecture and privacy posture are verified.

Qualitative validation:

- Five-second comprehension test.
- Three to five buyer interviews using the artifact-led prototype.
- Record confusion around source support, Guide vs Quiz, branding, and what happens after capture.

Gap: the redesign can ship without new analytics code, but it cannot be declared a conversion win without baseline and follow-through data.

## Section 9 — Deployment & Rollout Review

This was the pre-implementation rollout for the marketing/auth slice, which needed no dedicated auth migration. The broader v1.1 release now runs two ordered product-schema migrations; the visual page remains independently reversible from those data changes and the completion fix.

~~~mermaid
sequenceDiagram
  participant U as User
  participant P as Plan
  participant D as Design review
  participant E as Engineering
  participant Q as QA
  participant S as Staging
  participant R as Release
  U->>P: Confirm premises
  P->>D: Produce 2–3 clarity concepts
  D->>E: Approve artifact-led spec
  E->>Q: Build and targeted checks
  Q->>S: Responsive/accessibility smoke
  S->>U: Review real page
  U->>R: Approve release
~~~

Rollout:

- Preserve the current page in git history; do not delete simulations until the replacement builds and passes QA.
- Verify new signup, same-session resume, emailed recovery, completion, login, and session-save failure against a production-like staging environment.
- The auth recovery path uses server session state plus existing expiring token storage and requires no dedicated auth migration. The wider v1.1 production start still applies `0001_quiz_lead_magnets.sql` and `0002_brand_scoped_appearance.sql` before serving traffic.
- If traffic permits, compare against a pre-release baseline; do not invent statistical significance.
- Monitor registration failures and post-signup navigation immediately after release.

## Section 10 — Long-Term Trajectory Review

Reversibility: **4/5.** Marketing UI remains independently reversible. The auth completion fix must not be rolled back once acquisition traffic uses the hardened contract; backward compatibility lasts only through the release window.

Positive trajectory:

- Product proof becomes the design system’s center.
- New outputs can be added by showing the job and artifact, not another infrastructure diagram.
- Brand and Benefit Library retain strategic visibility without obscuring the core value.

Debt deliberately not solved:

- Whether VidMagnet should remain video-specific in name/position.
- Whether Guide and Quiz should become a connected personalized funnel.
- Unified analytics and attribution.
- Full legacy ConvertMag vocabulary cleanup.
- Verified customer evidence.

Six-month warning: do not replace one bespoke marketing simulation with another. If a concept needs more than one output toggle and a finished result to explain the product, return to the story before adding UI.

## Section 11 — Design & UX Review

Issues:

1. The page silhouette is a sequence of large staged bands rather than a quick story.
2. The hero asks visitors to decode an abstract system.
3. Content Reactor and Publishing System compete with each other and with the actual recipient proof.
4. Nested glass surfaces create false hierarchy.
5. Repeated process sections make the product feel longer than it is.
6. Dark cinematic treatment makes a useful creator tool feel technical and serious rather than quick and rewarding.
7. Product-real Guide and Quiz experiences are clearer than the sales-page simulations.
8. No verified customer proof or finished public example anchors trust.

Resolution:

- Artifact-led first viewport.
- Warm, open page rhythm.
- One small interactive choice.
- Buyer-question section sequence.
- System value shown as a short recipient path.
- Real product vocabulary.
- Accessible motion and mobile-first proof.
- No abstract image is required to understand the page.

## State Machine

~~~mermaid
stateDiagram-v2
  [*] --> HeroGuide
  HeroGuide --> HeroQuiz: Select Quiz
  HeroQuiz --> HeroGuide: Select Guide
  HeroGuide --> SignupOpen: Start free
  HeroQuiz --> SignupOpen: Start free
  SignupOpen --> FormInvalid: Invalid fields
  FormInvalid --> SignupOpen: Correct fields
  SignupOpen --> Submitting: Submit valid form
  Submitting --> ExistingAccount: Completed email
  ExistingAccount --> Login: Sign in
  Submitting --> PendingResume: Same pending session
  PendingResume --> CompleteAccount: Resume
  Submitting --> RecoverySent: Pending elsewhere
  RecoverySent --> CompleteAccount: Open one-time link
  Submitting --> RetryableError: Network or server failure
  RetryableError --> Submitting: Retry
  Submitting --> CompleteAccount: New account
  CompleteAccount --> InvalidProof: Missing, expired, foreign, or used proof
  InvalidProof --> RecoverySent: Request recovery
  CompleteAccount --> SessionSaving: Valid proof + password
  SessionSaving --> CompleteAccount: Save failure
  SessionSaving --> Dashboard: Saved
  Dashboard --> [*]
~~~

## Error Flow

~~~mermaid
flowchart TD
  A["Interaction or request"] --> B{"Failure type"}
  B -->|Validation| C["Inline field message; retain input"]
  B -->|Duplicate account| D["Explain account exists; offer Sign in"]
  B -->|Network/server| E["Visible retryable message; retain dialog and input"]
  B -->|Pending handoff missing| F["Start over or send one-time recovery link"]
  B -->|Completion proof invalid| J["Reject password write; explain expired/used state"]
  B -->|Session save failed| K["Return failure; do not show false workspace-ready state"]
  B -->|CRM timeout| L["Keep signup successful; record server-side integration failure"]
  B -->|Optional media/font| G["Use semantic/CSS or system-font fallback"]
  B -->|Unsupported claim| H["Remove claim before release"]
  B -->|Accessibility/layout regression| I["Block release and return to implementation"]
~~~

## Rollback Flow

~~~mermaid
flowchart TD
  A["Release sales-page reset"] --> B{"Smoke tests pass?"}
  B -->|Yes| C["Monitor signup and navigation"]
  B -->|No| D{"Signup path affected?"}
  D -->|Yes| E["Immediate revert of marketing release"]
  D -->|No| F["Disable/revert offending visual component"]
  C --> G{"Material regression detected?"}
  G -->|No| H["Continue measurement"]
  G -->|Yes| E
  E --> I["Restore prior static assets and page bundle"]
  I --> J["Marketing rollback leaves v1.1 schema migrations in place"]
~~~

## Pre-Implementation Error & Rescue Registry

This registry records the baseline that drove the work. The v1.1 implementation resolved the auth, CRM timeout, response typing, keyboard, reduced-motion, and responsive release blockers; current evidence is summarized under Implementation evidence.

| Method/path | Failure class | Rescued now? | Planned rescue | User impact |
|---|---|---:|---|---|
| signUpSchema / react-hook-form | Invalid name/email | Yes | Preserve inline messages | User corrects field |
| POST /api/auth/signup | Completed email | Partly | Machine-readable state and Sign in path | Clear alternate route |
| POST /api/auth/signup | Same pending session | No | Idempotently resume without creating another subscription | Return to completion |
| POST /api/auth/signup | Pending in another session | No | Generic emailed recovery with expiring one-time proof | Check-email state |
| POST /api/auth/signup | Network/server error | Yes, toast only | Persistent inline alert, retain values, safe retry | Temporary delay |
| HighLevel CRM | Timeout/failure | Failure swallowed but unbounded | Abort timeout; never fail signup; structured server log | No signup delay beyond budget |
| complete-account proof | Email chosen by caller | No | Session-bound pending ID or one-time email token; no email in body | Prevents account claim |
| complete-account proof | Missing/expired/foreign/used | No | Reject before password write; recovery actions | Clear recovery state |
| session save | Error/race | No; callback not awaited | Await save/regeneration before success | Retryable setup error |
| complete-account redirect | Raw Response read as JSON | Fallback masks issue | Parse typed JSON; keep stable route while auth flips | Deterministic destination |
| External Google font | Network/CSP failure | Implicit fallback | Preserve system font stack | Cosmetic only |
| Hero proof visual | Missing media/assets | Current simulation is code-based | New proof must remain legible without optional raster | No blank explainer |
| Guide/Quiz toggle | Local state/render error | N/A | Typed static data; no async dependency | One proof view unavailable |
| Reduced-motion preference | Motion discomfort | Mixed across current marketing UI | Immediate transition/no decorative loops | Accessibility issue |
| Narrow viewport/zoom | Overflow or hidden CTA | Previously QA’d, but redesign changes layout | Responsive matrix and scroll-width assertion | Blocks comprehension/action |
| Product capability copy | Stale/unsupported claim | No systematic rescue | Truth-table signoff before release | Trust/reputation risk |

## Pre-Implementation Failure Modes Registry

| Codepath | Failure mode | Rescued? | Test? | User sees? | Logged? |
|---|---|---:|---:|---|---:|
| Signup validation | Invalid fields | Yes | Manual/component | Inline | No |
| Signup API | Completed account | Partly | Playwright | Message + Sign in | No |
| Signup API | Same-session pending retry | No | Node + Playwright | Resume setup | Structured server event |
| Signup API | Other-session pending recovery | No | Node + Playwright | Generic check-email state | Structured server event |
| Signup API | Network/server failure | Toast only | Playwright | Persistent retry required | Server-dependent |
| Signup integration | CRM hangs | No timeout | Node/integration | Could delay indefinitely | Console only |
| Completion API | Caller supplies pending email | No | Critical regression test | Silent account claim | No |
| Completion API | Expired/used/foreign proof | No | Node + Playwright | Clear recovery state | Structured server event |
| Completion API | Session save fails | No false-failure guard | Integration | Retryable setup error | Server log |
| Artifact proof | Toggle fails keyboard semantics | Not yet | Planned | Inaccessible control | No |
| Artifact proof | Optional image fails | Not yet | Planned | Must still see text proof | Browser only |
| Marketing copy | Unsupported capability | Process rescue only | Planned truth audit | Misleading claim | No |
| Layout | 375 px or zoom overflow | Not yet for new design | Planned | Broken layout | No |
| Motion | Reduced-motion ignored | Not yet for new design | Planned | Discomfort/confusion | No |
| Post-signup | ConvertMag naming appears | No | Manual | Trust break | No |

These were the critical implementation gaps at planning time. The v1.1 release closes them with server-bound completion proof, recoverable pending signup, awaited session persistence, typed responses, and durable Node plus Playwright regression gates.

## NOT in Scope

- Guide generation, quiz scoring, public recipient delivery, billing, and brand-storage architecture — not needed for the explanation or the contained completion proof.
- A public live generator — requires separate product, cost, abuse, SSRF, copyright, and privacy work.
- CRM or email integration claims — implementation is not sufficiently verified for marketing.
- Revenue attribution — product/analytics scope beyond this frontend reset.
- Customer-result claims — no verified dataset was supplied.
- Repositioning the company exclusively around sports, video, agencies, or quiz-to-guide funnels — strategic premise needs evidence.
- Pricing architecture or billing changes — separate buyer/offer decision.
- Full authenticated-app redesign — only immediate naming continuity is accepted.
- Deployment — requires user approval after design and implementation review.
- Full email-identity policy, organization SSO, passkeys, and repository-wide auth modernization — the plan fixes only the exposed pending-account completion path and its recovery.
- Route-level performance work beyond public/auth chunk isolation — authenticated bundle optimization remains a separate initiative.

## What Already Exists

| Existing asset | Reuse decision |
|---|---|
| SalesPage signup mutation, Zod form, Dialog | Reuse validation and form primitives; replace URL/localStorage handoff with server proof |
| FAQ content and Radix accordion | Reuse with vocabulary edits |
| GuideContentRenderer rich block patterns | Reuse as product truth and visual/content reference |
| QuizRunner result, recommendation, gift, CTA patterns | Reuse as product truth and visual/content reference |
| Brand Studio and Benefit Library product foundation | Explain after output proof |
| Existing coral/mint/blue/paper palette | Keep, with fewer dark bands and less glass |
| ContentReactor | Remove from sales route; delete after reference check |
| PublishingSystem | Remove from sales route; delete after reference check |
| Generated magnetic images | Optional texture only; likely delete if unused |
| Login and complete-account routes | Keep behavior; replace ConvertMag copy with VidMagnet |
| Express session store | Reuse to bind immediate pending signup identity and await persistence |
| Existing reset-token + expiry fields | Reuse for hashed, single-use cross-session recovery; keep password reset behavior isolated |
| Existing Node/tsx tests | Reuse for pure schemas and handoff helpers |
| Vite + React.lazy | Reuse for public/auth route code splitting; no bundler replacement |

## Dream State Delta

After this plan ships, VidMagnet will have a truthful, clear, product-evidence-first sales page and a continuous VidMagnet signup journey. It will still lack verified acquisition/activation measurement, customer proof, a chosen long-term segment moat, connected Quiz-to-Guide personalization, CRM routing, and downstream revenue attribution.

## Deferred TODO Candidates

Autoplan auto-decision: record these in this plan now; do not mutate a repository TODOS.md before premise confirmation.

1. **Verified proof program** — P2, human M → CC S. Collect approved published examples, time-to-publish evidence, and customer outcomes. Depends on real users and consent.
2. **Marketing-to-activation instrumentation** — P1 for declaring a conversion win, human M → CC S. Verify the current analytics architecture and implement the event contract without PII. Depends on analytics/privacy decision.
3. **Full product vocabulary migration** — P2, human M → CC S. Remove remaining ConvertMag and conflicting Guide labels across authenticated surfaces. Immediate login/complete-account continuity is in scope.
4. **Public sample generator experiment** — P3, human XL → CC L. Validate demand and abuse controls before building a live source-to-preview experience.
5. **Segment-specific positioning tests** — P2, human M → CC S. Test expert/coach, sports/video, and agency narratives with qualified conversations or smoke pages before a durable reposition.

## Implementation Tasks

Synthesized across CEO, Design, and Engineering. Every P0/P1 task below blocks public-CTA release; P2 tasks land in the same branch. No implementation begins until the final Autoplan approval gate is passed.

- [x] **T0 (P1, human: ~30min / CC: ~10min)** — Safety — Capture the dirty-worktree baseline without changing it
  - Surfaced by: Engineering finding 8 — the current sales page is modified while its simulations, images, DESIGN.md, and this plan are untracked, so “restore from git history” is not currently true.
  - Files: project-scoped `.gstack` baseline artifacts only; no repository mutation.
  - Verify: record HEAD/branch/status, tracked binary diff, untracked manifest/archive, checksums, and restoration instructions; do not reset, stash, add, delete, or overwrite user work.

- [x] **T1 (P0, human: ~2h / CC: ~20min)** — Product truth — Lock supported sources and complete typed fixtures
  - Surfaced by: Engineering findings 2 and 5 — production rejects PDF/web/stream sources and the visual fixture did not specify the full strict Guide/Quiz contracts.
  - Files: `client/src/components/marketing/artifact-fixtures.ts`, `server/marketingFixture.test.ts`, `DESIGN.md`.
  - Verify: Guide passes `generatedGuideContentV2Schema`; Quiz passes `quizDefinitionSchema`; result asset IDs map; copy claims only pasted source and verified YouTube-to-Guide; `npm run test:marketing`.

- [x] **T2 (P0, human: ~8h / CC: ~90min)** — Funnel security — Bind account completion to server proof and make pending signup recoverable
  - Surfaced by: Engineering findings 1, 3, and 9 — completion currently accepts caller-selected email, falsely verifies it, can race session persistence, and strands pending retries.
  - Files: `server/authRoutes.ts`, `server/storage.ts`, `server/services/emailService.ts`, `server/types/express-session.d.ts`, `client/src/pages/complete-account.tsx`, `client/src/pages/login.tsx`, `server/authCompletion.test.ts`.
  - Verify: no email/name in completion URL or browser log; same-session resume; hashed expiring one-time recovery link; used/expired/foreign token rejection; no session-only email verification; free-plan idempotency; CRM timeout non-fatal; session regenerate/save awaited; parsed typed responses; VidMagnet browser/API/email copy; `npm run test:auth-handoff`.

- [x] **T3 (P1, human: ~4h / CC: ~45min)** — Product proof — Build the only stateful Guide/Quiz artifact surface
  - Surfaced by: Design Passes 1–6 and Engineering finding 5 — the page needs one literal transformation, not two large simulations or incomplete JSX sample data.
  - Files: `client/src/components/marketing/artifact-proof.tsx`, `client/src/components/marketing/artifact-fixtures.ts`.
  - Verify: Guide default; exact fixture and synthetic label; semantic tablist/tabpanel; arrow keys; stable desktop footprint; content-driven mobile height; reduced motion; readable CSS/text fallback; no fake input, publish claim, or required raster.

- [x] **T4 (P1, human: ~3h / CC: ~30min)** — Delivery performance — Split public/auth routes from the authenticated application
  - Surfaced by: Engineering finding 4 — anonymous visitors currently receive one 327.03 kB gzip bundle containing every route.
  - Files: `client/src/App.tsx` and, only if needed, one small route-loading primitive.
  - Verify: React lazy chunks; neutral auth-loading shell; stable `/complete-account` route during auth changes; public landing/delivery/guide/quiz routes remain reachable; initial sales-route JS ≤200 kB gzip; no authenticated page code in the initial public chunk.

- [x] **T5 (P1, human: ~6h / CC: ~60min)** — Sales page — Integrate Direction A as one five-section editorial reveal
  - Surfaced by: CEO direction, approved mockups, Design Passes 1–7, and Engineering findings 6–7 — current composition is repetitive and its shell/metadata contracts are inconsistent.
  - Files: `client/src/pages/sales-page.tsx`, `client/index.html`, `DESIGN.md`.
  - Verify: five locked headlines; hero 5/7 artifact split; sole ArtifactProof interaction; one dark surface; no feature grid/glass system diagram; all CTA placement IDs; persistent signup errors; pending dismissal guard; verified metadata; zoom allowed; unconditional Replit banner removed; truthful minimal noscript; page/component budgets.

- [x] **T6 (P1, human: ~5h / CC: ~60min)** — Regression coverage — Add scoped type and browser gates
  - Surfaced by: Engineering finding 6 — no current test executes the sales page, tabs, dialog, handoff, overflow, or reduced-motion branches.
  - Files: `tsconfig.marketing.json`, `playwright.config.ts`, `tests/sales-page.spec.ts`, `package.json`, `package-lock.json`, plus the Node test files named above.
  - Verify: `npm run check:marketing`; `npm run test:marketing`; `npm run test:auth-handoff`; `npm run test:e2e:marketing`; existing 6/6 Guide, 4/4 Quiz, and 8/8 Branding suites remain green. Use a harmless Stripe public key in browser-test startup.

- [ ] **T7 (PARTIAL, P1, human: ~3h / CC: ~35min)** — Release QA — Prove clarity, accessibility, performance, and safe cleanup
  - Surfaced by: Engineering findings 4, 6, 8 and all Design passes.
  - Files: affected marketing/auth files and QA screenshots/reports. The obsolete simulations, their PNGs, and Framer Motion were already removed after reference and build checks during T0–T6.
  - Verify: approved desktop/mobile comparison; five-second comprehension; production-like signup/recovery/completion smoke; browser console; 375/768/1024/1280/1440; 200% zoom; keyboard/screen-reader semantics; reduced motion; LCP ≤2.5 s; CLS <0.1; no horizontal overflow; `npm run build` passes; full `npm run check` failures are documented as pre-existing and touched-file errors are zero.

This sales-page plan did not originate a database, guide-generation, quiz-scoring, billing, or public-recipient API task. The broader user-approved VidMagnet branch also contains quiz, richer-guide, and brand-scoping work; those additions received separate migration, contract, security, performance, and coverage review before shipping. Secure one-time recovery was implemented with the existing user token fields rather than weakening the proof contract.

### Implementation evidence — 2026-08-14

- T0–T6 are complete. The protected dirty-worktree baseline is retained under the project-scoped `.gstack` record.
- `npm run test:release`: 64/64 Node contract, security, scoring, migration, branding, and content tests pass.
- `npm run test:e2e:marketing`: 29 passed and one intentional project-scope skip across desktop and mobile Chromium.
- `npm run build`, `npm run check:marketing`, and `git diff --check` pass. The sales-page chunk is 11.84 kB gzip and the initial application chunk is 97.12 kB gzip.
- Responsive browser QA covered 375, 640, 768, 1024, 1280, and 1440 px plus 200% reflow, keyboard/focus behavior, reduced motion, console output, and horizontal overflow.
- T7 remains partial only because no recorded LCP/CLS trace, human five-second comprehension session, or production-like non-mocked auth smoke was captured in this local release pass. These are follow-up evidence items, not known functional failures.

## Cross-Phase Themes

1. **Product truth is the organizing system.** CEO review chose a sharper wedge, Design made the finished artifact the visual center, and Engineering converts the same artifact into schema-validated fixtures and capability tests.
2. **Fun comes from compression and payoff.** The page becomes lighter by removing explanation, not by decorating it differently: one source, one visible transformation, one Guide/Quiz choice, one recipient path.
3. **The conversion path includes what happens after the CTA.** VidMagnet naming, secure pending identity, recoverability, session persistence, and dashboard arrival are part of the sales-page experience—not unrelated backend details.
4. **Evidence replaces theater.** No invented customer proof, unsupported source parity, fake email capture, “published” state, or abstract system simulation. Synthetic proof is labeled and validated against real contracts.
5. **Speed is part of clarity.** The approved visual simplification is paired with route isolation and measurable public-route budgets so a simpler page also arrives as a simpler experience.
6. **Reversibility is explicit.** The visual rewrite, route split, auth fix, tests, and cleanup land in separable stages. User work is snapshotted before edits; unreferenced simulations are deleted last.

## Completion Summary

| Review area | Result |
|---|---|
| Mode selected | SELECTIVE EXPANSION |
| System audit | Pre-implementation: 2,337 lines, including 1,588 lines of simulations. Shipped sales-page/design surface: 1,021 lines with no simulation components. |
| Step 0 | Artifact-led Alternative B confirmed; premises passed |
| Architecture | Direction A retained; contained auth boundary and public route split added |
| Errors | Signup/completion/recovery/session/CRM paths mapped; no silent proof failure accepted |
| Security | Pending-account claim path fixed; canonical session identity, one-time recovery, rate limits, and protected admin routes reviewed |
| Data/UX | Full signup and recovery states specified; analytics baseline remains deferred |
| Code quality | Single-use simulations and the PII handoff were removed; response contracts and shipped vocabulary were tightened. Repository-wide legacy TypeScript debt remains documented. |
| Tests | 64/64 Node tests and 29-pass/1-skip desktop/mobile browser release suite |
| Performance | Lazy route split lands below the ≤200 kB public-route budget; recorded LCP/CLS remains T7 follow-up evidence |
| Observability | Funnel contract defined; transport unresolved |
| Deployment | Ordered, checksummed, fail-closed migrations run before every production start; visual rollback remains independent |
| Future | Reversibility 4/5; hardened auth contract is forward-only after public use |
| Design | 7/10 → 9/10; five-section A-led direction and exact interaction/responsive contracts specified |
| NOT in scope | Written; nine categories |
| What already exists | Written; ten reuse decisions |
| Dream state delta | Written |
| Error/rescue registry | 11 paths; two gaps |
| Failure modes | Funnel, fixture, route, accessibility, migration, tenant, and release failures reviewed; no known P0/P1 blocker remains |
| Scope proposals | Seven accepted, six deferred, four skipped |
| Outside voices | Independent engineering + test audits ran; Codex CLI was blocked by the privacy boundary |
| Diagrams | Architecture, dream state, data flow, state machine, error, deployment, rollback |
| Stale diagram audit | No ASCII or Mermaid diagrams in planned source files; the shipped marketing surface has no simulation, marketing PNG, or Framer Motion references. |
| Unresolved decisions | No release decision remains; three T7 evidence tasks and lower-priority scale/maintainability work are tracked in TODOS.md |

## Decision Audit Trail

| Decision | Why | Status |
|---|---|---|
| Select Alternative B | Highest clarity and learning without public-generation risk | Confirmed by user |
| Use product-real artifacts | Customer-facing Guide and Quiz UI already communicate value better | Accepted |
| Remove both simulations from route | They duplicate the story and add 1,588 lines | Accepted |
| Keep system value downstream | Branding, reusable offers, and lead capture matter but should not lead | Accepted |
| Use “bring existing content” | More truthful across different builder capabilities | Accepted |
| Fix immediate ConvertMag copy | Directly affects the sales-page conversion path | Accepted expansion |
| Define but do not implement analytics transport | Measurement matters; architecture/privacy are unverified | Deferred implementation |
| Defer live sandbox | Product, cost, security, and abuse expansion | Deferred |
| Do not invent proof | Trust requirement | Accepted |
| Select Direction A-led synthesis | Clearest literal source-to-output reveal; borrows B rhythm and one restrained C snapline | Auto-decided in Design review |
| Consolidate to five sections | Both design voices found repeated Guide/Quiz and system teaching | Auto-decided in Design review |
| Use one Guide-default tablist | Prevent duplicate state, layout shift, and accessibility drift | Auto-decided in Design review |
| Label the fixture Example output | Synthetic content must not masquerade as customer proof | Auto-decided in Design review |
| Use mobile CTA-only nav | Keeps 375 px hierarchy obvious without an unnecessary hamburger | Auto-decided in Design review |
| Bind completion to server proof | Email-only completion can claim a pending account | Auto-decided in Engineering review; release blocker |
| Use session first, expiring emailed recovery second | Preserves immediate flow while supporting another browser safely | Auto-decided in Engineering review |
| Remove PII URL/localStorage handoff | Name/email currently enter history, logs, and caller-selected identity | Auto-decided in Engineering review |
| Limit source claims to verified behavior | PDF/web/stream contradict current routes | Auto-decided in Engineering review |
| Check in full schema-valid fixtures | Prevents visual examples from drifting beyond product contracts | Auto-decided in Engineering review |
| Lazy-load route boundaries | Anonymous bundle is 327.03 kB gzip and includes authenticated pages | Auto-decided in Engineering review |
| Add scoped Node + Playwright gates | No current frontend runner covers the new conversion path | Auto-decided in Engineering review |
| Snapshot dirty work before implementation | Current simulations/assets are not safely recoverable from HEAD | Auto-decided in Engineering review |
| Approve the final Autoplan as-is | User selected Option A at the final approval gate | Confirmed by user on 2026-08-14 |

## Review Readiness

- CEO review: complete.
- Mandatory premise confirmation: passed on 2026-08-14.
- Design review and concept comparison: complete; A-led synthesis approved.
- Engineering review: complete; visual direction conditionally cleared, secure completion included as a release prerequisite.
- Developer-experience review: not applicable to this marketing-page scope.
- Final Autoplan synthesis: approved as-is by the user on 2026-08-14.

## Unresolved Decision

None. All CEO, Design, and Engineering decisions are resolved, and implementation is complete on the release branch. Deployment plus the remaining T7 production evidence are separate actions.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope and strategy | 1 | CLEAR | Eight premises confirmed; artifact-led reset selected; value wedge and business chain locked |
| Codex Review | `/codex review` | Independent second opinion | 2 of 3 phase passes | PARTIAL | CEO and Design passes completed; Engineering pass was blocked by the repository-privacy boundary and not retried |
| Eng Review | `/plan-eng-review` | Architecture and tests | 1 | CLEAR | Nine verified findings incorporated; secure completion is P0 before public CTA release; 31 branches mapped |
| Design Review | `/plan-design-review` | UI and UX gaps | 1 | CLEAR | Seven dimensions reviewed; three real variants compared; Direction A-led synthesis approved |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | SKIPPED | No external developer-facing product surface in scope |

**CODEX:** CEO and Design outside voices reinforced product truth, artifact-first hierarchy, exact fixture content, and fewer repeated product explanations; the Engineering Codex pass was unavailable under the privacy policy.

**CROSS-MODEL:** Available engineering voices independently found the same pending-account completion blocker and supported the same visual direction. CEO and Design voices also converged on one literal source-to-output proof rather than another system simulation.

**VERDICT:** IMPLEMENTED — CEO + DESIGN + ENG CLEARED. Secure account completion and the release gates are complete; deployment and the remaining T7 production evidence have not been claimed.

NO UNRESOLVED DECISIONS
