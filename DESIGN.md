# Design System — VidMagnet

## Product Context

- **What this is:** VidMagnet turns existing content into branded lead-generation assets: implementation guides, interactive quizzes, capture pages, reusable free gifts, and calls to action.
- **Who it's for:** Creators, coaches, consultants, agencies, and content-led businesses that need to turn audience attention into owned leads.
- **Space/industry:** Creator marketing, lead-generation software, quiz funnels, and AI-assisted content repurposing.
- **Project type:** Product-led SaaS application with a marketing site and white-label public experiences.
- **Memorable idea:** One trusted source becomes a Guide or Interactive Quiz a lead can actually use.

## Aesthetic Direction

- **Direction:** Product-evidence first.
- **Decoration level:** Restrained. Type, product-real artifacts, open editorial rhythm, fine rules, and one purposeful dark surface create depth without decorative clutter.
- **Mood:** Clear, warm, useful, and quietly inventive. VidMagnet should feel fun because a valuable result appears quickly—not because the interface adds more glass, panels, or system metaphors.
- **Reference sites:** [ScoreApp](https://www.scoreapp.com/) and [Typeform](https://www.typeform.com/quizzes) for product clarity and visible customization. VidMagnet differentiates by making the finished asset, not only the form.

## Typography

- **Display/Hero:** DM Sans, 700 — direct and modern enough for software while retaining warmth.
- **Editorial accent:** Instrument Serif, 400 italic — used sparingly for the transformational noun or phrase in a headline.
- **Body:** DM Sans, 400–500 — highly readable in marketing copy and long-form lead magnets.
- **UI/Labels:** DM Sans, 600.
- **Data/Tables:** IBM Plex Mono, 500 — clear tabular figures and an authored, workshop-like feel.
- **Code:** JetBrains Mono.
- **Loading:** Google Fonts with `display=swap`; use system fallbacks only during loading.
- **Scale:** 14, 16, 18, 22, 28, 38, 56, and 72px. Marketing headlines use 1.05–1.12 line height; body copy uses 1.55–1.7.

## Color

- **Approach:** Balanced. Warm neutrals make customer brand colors and product previews feel vivid.
- **Ink:** `#101419` — primary text, dark sections, and high-authority surfaces.
- **Warm paper:** `#F4EFE6` — primary marketing canvas.
- **Canvas:** `#FBF8F2` — quiet alternate surface.
- **Signal coral:** `#FF6B3D` — primary CTA, active states, and moments of emphasis.
- **Magnet mint:** `#79D9C7` — secondary emphasis and successful transformation states.
- **Utility blue:** `#3157F6` — links, focus states, and product UI data.
- **Semantic:** success `#158A63`, warning `#B96A12`, error `#C33D3D`, info `#3157F6`.
- **Dark mode:** Use ink surfaces with warm-white text and reduce accent saturation by 10–15%; do not simply invert light mode.
- **Customer brands:** Public magnets inherit the active brand's logo, palette, typography, page surfaces, shape language, and voice. The VidMagnet marketing palette must never leak into white-label output.

## Spacing

- **Base unit:** 4px.
- **Density:** Comfortable in the application; spacious on marketing and public lead-magnet pages.
- **Scale:** 2xs 2px, xs 4px, sm 8px, md 16px, lg 24px, xl 32px, 2xl 48px, 3xl 64px, 4xl 96px, 5xl 128px.

## Layout

- **Approach:** Hybrid. The application stays grid-disciplined; marketing uses selective editorial asymmetry.
- **Grid:** 4 columns mobile, 8 tablet, 12 desktop.
- **Max content width:** 1200px for marketing; 960px for long-form recipient content.
- **Border radius:** small 8px, medium 14px, large 24px, pill only for badges and compact controls.
- **Composition rule:** Lead with the finished output or interaction. Avoid repeating centered icon-card grids.
- **Marketing-page rule:** The hero uses a 5/7 copy-to-artifact split. Keep the source-to-output proof in the first viewport, limit the story to five buyer-question sections, and move Brand Studio and Benefit Library downstream.
- **Evidence rule:** Prefer real product patterns and truthful capability wording over simulated dashboards, abstract reactors, or invented customer proof.

## Motion

- **Approach:** Intentional.
- **Easing:** enter ease-out, exit ease-in, movement ease-in-out.
- **Duration:** micro 80ms, short 180ms, medium 320ms, long 560ms.
- **Use:** Reveal workflow connections, output transformation, progress, and interactive feedback. Respect `prefers-reduced-motion` and never delay core actions.

## Output Quality Rules

- A lead magnet must transform source content into an implementation asset, not summarize it.
- Every generated guide should include an outcome promise, quick-start actions, structured instruction, implementation steps, a checklist or worksheet, progress measures, troubleshooting, and a relevant next step.
- Claims and examples must remain grounded in the supplied source; unknown facts are labeled instead of invented.
- Brand voice and audience context should shape the writing before generation, not be added as a cosmetic afterthought.

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-08-14 | Adopted the editorial product-lab direction | It makes the finished deliverable the proof and separates VidMagnet from generic AI SaaS styling. |
| 2026-08-14 | Made customer-brand tokens first-class | Each brand needs an isolated identity across guides, quizzes, capture pages, and delivery pages. |
| 2026-08-14 | Defined implementation assets as the output standard | The recipient should leave with a usable plan, not a light review of the source content. |
| 2026-08-14 | Reset marketing to product-evidence first | A literal source-to-useful-output reveal explains VidMagnet faster than a large simulated publishing system. |
