# Cylindrical Slide Rule Implementation Plan

**Goal:** Build the cylindrical slide rule instrument described in docs/plans/2026-10-23-1-cylindrical-slide-rule-design.md.

**Architecture:** The same hexagonal layers as the linear and circular rules. The domain gains the cylindrical rule kind, helix geometry, readout digits and presets; the slide rule kit gains options to hide Flip and limit the editor to one face; the cylindrical instrument adds its drawing, viewport, page and entry point.

**Tech Stack:** Unchanged: TypeScript, React 19, Vite, zustand, zod, @use-gesture/react, Biome, Vitest, fast-check, React Testing Library, Playwright.

---

## Core principles

- **Git is the user's responsibility, not the assistant's.** The Assistant can make changes directly to the master branches, but never commits unprompted.
- **TDD throughout but don't overdo it:** the assistant writes the failing test, runs it, watches it fail *for the right reason*, implements the minimum, runs it green, then requests review. DRY, YAGNI. But only tests most important paths, the assistant should try to cover every possible permutation. The assistant should avoid verifying calls using mocks, while preferring to just test actual results when possible.

## Conventions

Layers, boundaries and the five steps per task are as in docs/plans/2026-10-23-2-circular-slide-rule-plan.md. The design was decided without user review under the session goal, so the review step of each task is collected into the final report.

Risk first: the projection is not an SVG transform, so visible ticks are recomputed on every drag frame. Tick counts were measured before planning: at 25 turns every scale has under 10000 ticks, generated once; each frame touches only the turns on screen. Task 3.4 times real drag frames on an emulated phone and cuts the longest preset if a frame is slow.

Added during implementation:

1. Frame time (task 3.4): with the CPU slowed four times on an emulated iPhone, a cursor step redraws within one frame on all three presets (each step took two frames, 33 milliseconds, including the wait for the second frame). The 25 turn preset stays.
2. Near the cylinder's edges, where the surface faces away (depth below 0.3), only the longest ticks are drawn; the finer ones crowded into a black smear.
3. Scale names are printed only beside turns whose left edge carries scales, so the first turn, which starts mid cylinder, does not print names on top of the next turn's.
4. The view shows two turns at zoom 1 rather than three, so the cylinder is not a thin column on wide screens.
5. Vertical drags pan by screen pixels rather than by drawing position, because the view also scrolls as the cursor moves along the helix.

---

## Milestone 1: Domain

Acceptance (domain): a cylindrical session envelope (kind cylindrical, linear sections, turns 10) round trips through the codec, and computeReadout gives 5 figure readings for it.

### Task 1.1: Rule kind and schema (domain)

Files: rule/types.ts, codec/schema.ts, codec tests.

SECTIONS_BY_KIND gains cylindrical (upper, slide, lower); MOVING_SECTION cylindrical is slide; CylindricalRule is RuleOf cylindrical plus turns; RuleDefinition includes it. The schema union gains kind cylindrical with linear faces and turns an integer from 2 to 40. normaliseState clamps cylindrical like linear (already true for every kind but circular).

### Task 1.2: Readout digits (domain)

Files: scales/format.ts, readout.ts and tests.

formatReadout(value, digits = 4); readoutDigits(rule) is 4 plus floor(log10(turns)) for cylindrical rules and 4 otherwise. Existing readout tests unchanged.

### Task 1.3: Helix geometry (domain)

Files: geometry/helix.ts and test.

HELIX_RADIUS, helixCoordinate(position, offset, turns), project(s, cursor) returning visible, angle and x, rowY(s, pitch, bandY), visibleTurns range helpers, turnAngle(x) clamped asin. Tests from the design's testing section.

### Task 1.4: Presets (domain)

Files: rule/cylindricalPresets.ts and test.

Short helix (5), Scientific helix (10), Long helix (25). Test: kind, known scales, empty back face, turns in range; tick count per scale at 25 turns below 12000.

---

## Milestone 2: Kit options

### Task 2.1: Hide Flip and face tabs (adapter)

Files: kit ui/SlideRuleToolbar.tsx, ui/ScaleEditorDrawer.tsx, kit store keyboard unchanged.

SlideRuleToolbar takes flippable (default true). EditorOptions gains faces (default both); with one face the tabs are not rendered. Covered by the cylindrical page test.

---

## Milestone 3: Cylindrical instrument

Acceptance (adapter): CylindricalSlideRulePage.test.tsx renders the page and asserts the group "Short helix cylindrical slide rule", readout D 1.000 and C 1.000, no Flip button, arrow keys on the Cursor move it by KEY_STEP divided by 5, and the editor has no face tabs.

### Task 3.1: HelixRuleSvg (adapter)

Files: cylindrical-slide-rule/ui/HelixRuleSvg.tsx, HelixBand.tsx.

Draws the body, bands, slide strip, names and cursor from the helix geometry for the turns on screen. Sliders Slide and Cursor with the scaled keyboard step.

### Task 3.2: HelixViewport (adapter)

Files: ui/HelixViewport.tsx.

View centred on the cursor plus a vertical pan; zoom about the cursor; drags turn by the change in asin(x / radius) in the SVG's own coordinates from the pointer down position; vertical movement pans; loupes as on the other rules.

### Task 3.3: Page, config and registry (adapter)

Files: config.ts, CylindricalSlideRule.tsx, ui/CylindricalSlideRulePage.tsx, index.ts, src/app/registry.ts, public/cylindrical-slide-rule.svg, vite.config.ts, src/app/App.test.tsx.

### Task 3.4: Frame time check (adapter)

Script under .tom: open Long helix on an emulated phone, drag, and measure the time per frame. Cut the longest preset if frames are slow.

---

## Milestone 4: End to end and review

### Task 4.1: Playwright tests (adapter)

Files: e2e/cylindrical.spec.ts. Tests as listed in the design.

### Task 4.2: Final review

pnpm check, pnpm test, pnpm e2e, pnpm build, screenshots on phone and desktop in both themes, record any deviations here, report.
