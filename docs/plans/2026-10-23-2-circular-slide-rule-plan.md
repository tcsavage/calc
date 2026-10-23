# Circular Slide Rule Implementation Plan

**Goal:** Build the circular slide rule instrument described in docs/plans/2026-10-23-1-circular-slide-rule-design.md, sharing the shape independent code with the linear slide rule through a slide rule kit.

**Architecture:** The same three hexagonal layers as v1. The domain (src/core/slide-rule) learns about rule kinds, circular geometry, ring limits and per ring graduation. A new shared kit (src/instruments/slide-rule-kit) holds the coordination, adapters and UI that do not depend on the rule's shape, configured per instrument. The circular instrument (src/instruments/circular-slide-rule) adds only its drawing, viewport, presets wiring and entry point.

**Tech Stack:** Unchanged from v1: TypeScript (strict), React 19, Vite 8, vite-plugin-pwa, react-router (hash router), zustand, zod, @use-gesture/react, Biome, Vitest, fast-check, React Testing Library, Playwright, pnpm.

---

## Core principles

- **Git is the user's responsibility, not the assistant's.** The Assistant can make changes directly to the master branches, but never commits unprompted.
- **TDD throughout but don't overdo it:** the assistant writes the failing test, runs it, watches it fail *for the right reason*, implements the minimum, runs it green, then requests review. DRY, YAGNI. But only tests most important paths, the assistant should try to cover every possible permutation. The assistant should avoid verifying calls using mocks, while preferring to just test actual results when possible.

## Conventions

Layers and folders:

| Layer | Folders | May import |
| --- | --- | --- |
| Domain | src/core | nothing outside src/core except zod |
| Coordination | src/instruments/slide-rule-kit/state, src/instruments/(instrument)/state | src/core, zustand |
| Adapters | src/instruments/slide-rule-kit/adapters and ui, src/instruments/(instrument)/ui, src/instruments/(instrument) entry files, src/app | anything below them |
| Shared adapters | src/shared, src/instruments/types.ts | src/core |

Boundary rules (src/architecture.test.ts): instruments may import the kit but not each other; the kit may not import any instrument; coordination folders (kit or instrument) may not import adapters or ui.

Clarifications of the design made by this plan:

1. v1 data already carries kind "linear" (the v1 schema requires it), so no migration and no version bump are needed. The schema becomes a union discriminated on kind; old sessions, saved rules and links parse unchanged. The design doc line about data without a kind is corrected accordingly.
2. The ring limit is a fixed minimum inner radius for the innermost disc ring, not 25 percent of the rule radius, because the rule radius grows with the number of outer rings and the percentage would trim the Log-log duplex preset. Numbers: disc edge radius 240, ring width 24 (the linear BAND_HEIGHT), minimum inner radius 72, so the disc holds at most 7 rings. Outer rings are limited only by the schema (16).
3. Per ring graduation: graduate() runs once when a scale is defined, so ScaleSpec keeps its cuts and generateTicks(spec, lengthFactor) re-graduates with the spacing limits divided by the factor, memoised per spec and factor. A factor of 1 gives exactly the v1 ticks.
4. Share payloads are read only on their own route: readSharePayload(route) ignores a payload on another instrument's route, so a circular link opened from the linear page is left for the circular instrument. A payload of the wrong kind on the right route is rejected with its own notice.
5. rotateView is an optional boolean on RuleState. The circular default is true; the linear rule ignores it.
6. At 12 o'clock a full turn scale's end (position 1) coincides with its start (position 0). Ticks at position 1 are drawn but their labels are dropped, so "1" is not printed over "10".
7. Drag angles are measured in the root SVG's coordinate system (screen aligned, outside the rotating group), and each frame's change is unwrapped into the range minus half a turn to half a turn. In rotate view the content under the finger follows the finger: a drag on the disc adds the swept angle to the disc offset; any other turning drag subtracts it from the cursor, which turns the whole rule under the fixed hairline. Outside rotate view a turning drag adds the swept angle to the cursor.

Added during implementation:

8. The zoom buttons on the circular rule zoom towards the hairline at the disc edge rather than the centre of the view, because the centre of a circular rule is the hub, where there is nothing to read.
9. Focused rule parts (slide, disc, cursor) never show the browser's focus outline, only the focus stroke: browsers outlined the bounding box of the turned disc after a touch drag, which drew stray diagonal lines across the view.
10. The rule kinds (Milestone 2, domain) were built before the kit's generic store, so the kit was written once against the final types; the kit's circular behaviour tests were written after that code and passed on first run.
11. An extra end to end test checks the 4 to 1 fine drag inside the pinned loupe, as on the linear rule.

Every task has the same five steps:

1. Write the failing test.
2. Run it and confirm it fails for the right reason.
3. Implement the minimal code to make it pass.
4. Run pnpm test and pnpm check and make sure both pass.
5. Ask the user for review of the changes.

Milestone 1 is a pure refactor: its acceptance test is the existing suite (156 unit and component tests, 17 end to end tests) passing with only import changes.

---

## Milestone 1: Extract the slide rule kit (refactor)

Acceptance: pnpm test, pnpm check and pnpm e2e pass, unchanged except for import paths and the architecture test.

### Task 1.1: Architecture rules for the kit (architecture test)

Files: src/architecture.test.ts.

Change instrumentOf to ignore slide-rule-kit as an import target for the "instruments do not import each other" rule, and add "the kit imports no instrument". Extend the coordination rule to cover src/instruments/slide-rule-kit/state. To see the new rule fail, temporarily import an instrument from a kit file.

### Task 1.2: Kit adapters (adapter)

Files: src/instruments/slide-rule-kit/adapters/location.ts, sessionPort.ts, share.ts and tests (moved from linear-slide-rule/adapters).

- location: readSharePayload(route, location) returns the payload only when the hash path equals route; clearSharePayload(route, ...) and buildShareUrl(route, payload, ...) take the route. New test: a payload on #/circular-slide-rule is not read for /linear-slide-rule.
- sessionPort: storageSessionPort(store, keys) with keys session and saved.
- share: shareUrl(url, title, nav).

### Task 1.3: Kit coordination (coordination)

Files: src/instruments/slide-rule-kit/state/config.ts, store.ts, startup.ts, persistence.ts, ports.ts, memoryPort.ts and tests (moved).

SlideRuleConfig holds: kind, presets, defaultPresetId, and in later milestones fitRule. The store, defaultSession, isPresetId and resolveStartup take the config instead of importing linear presets. Tests run against a linear test config built from the existing presets.

### Task 1.4: Kit UI (adapter)

Files: src/instruments/slide-rule-kit/ui: Notices, Readout, RulePicker, ScaleEditorDrawer, SlideRuleToolbar, skinStyle, viewMath, useElementSize, loupe (floatingPosition and LOUPE sizes), keys (keyDelta, KEY_STEP, FINE_KEY_STEP), useSlideRuleInstrument.

- RulePicker takes presets; Readout and ScaleEditorDrawer take section names (a record from section to label) and the section order.
- viewMath is generalised from the linear rule's width and height to a content box (x, y, width, height): fitView(content), viewBoxFor(view, container, content), zoomAt(..., content). Existing viewMath tests move and are rewritten against a content box of the linear rule's size; expected numbers are unchanged.
- SlideRuleToolbar renders the existing toolbar buttons and accepts extra children (used by the circular rotate view toggle).
- useSlideRuleInstrument(instrumentConfig) holds the boot, share link, autosave and share code from LinearSlideRule.tsx, with route, storage keys and share title from the config, and returns the store and onShare.

### Task 1.5: Linear wiring (adapter)

Files: src/instruments/linear-slide-rule/config.ts, LinearSlideRule.tsx, index.ts, ui/SlideRulePage.tsx, ui/RuleSvg.tsx, ui/RuleViewport.tsx.

LINEAR_CONFIG (kind linear, presets, default rietz, route /linear-slide-rule, keys calc.linear-slide-rule.session and .saved, section names Upper stator, Slide and Lower stator). Run the full suite and the end to end tests.

---

## Milestone 2: Rule kinds in the domain

Acceptance (domain): a codec test decodes a circular session envelope (kind circular, faces with outer and disc) and returns a circular rule whose state is wrapped into 0 to 1, while a linear envelope still decodes and clamps as before.

### Task 2.1: Kit coordination handles kinds (coordination)

Files: kit state/store.ts, startup.ts and tests.

- moveSlideBy, moveCursorBy and setPosition use the domain's moveBy and normaliseState for the config's kind (wrap for circular, clamp for linear).
- resetPosition keeps face and rotateView.
- toggleRotateView flips state.rotateView.
- resolveStartup and openSharedLink reject a decoded session whose rule kind differs from the config's kind with MESSAGES.wrongKind ("This link is for a different kind of slide rule."), and saved rules of another kind are ignored.

### Task 2.2: Rule types and schema (domain)

Files: src/core/slide-rule/rule/types.ts, codec/schema.ts, codec/codec.ts and tests.

- SECTIONS_BY_KIND (linear: upper, slide, lower; circular: outer, disc), RuleKind, SectionOf, FaceDefinition of a kind, LinearRule, CircularRule, RuleDefinition as their union, MOVING_SECTION (slide, disc), sectionsOf(kind) and placementsOf(rule, face, section).
- Schema: rule union discriminated on kind; state gains optional rotateView.
- dropUnknownScales walks sectionsOf(rule.kind); decodeSession normalises state for the rule's kind.

### Task 2.3: State rules per kind (domain)

Files: rule/state.ts and test.

wrapTurn(x) into 0 to 1; normaliseState(kind, state); moveBy(kind, state, part, delta); defaultRuleState(kind) (circular adds rotateView true). Property test: wrapped values always lie in 0 to 1 and differ from the input by a whole number.

### Task 2.4: Edits and readout per kind (domain)

Files: rule/edits.ts, readout.ts and tests.

Edits are generic over the rule type and use placementsOf. computeReadout(rule, state) walks sectionsOf(rule.kind); the moving section uses cursor minus slideOffset; circular positions wrap instead of reading "out of range". Tests: circular C reads 3 with disc 0.30103 and cursor 0.77815 while D reads 6; a circular disc reading past 12 o'clock wraps.

### Task 2.5: Ticks per ring length (domain)

Files: scales/types.ts, scales/library.ts, scales/ticks.ts and tests.

ScaleSpec keeps cuts. generateTicks(spec, lengthFactor = 1) graduates the cuts with minTick, minLargeLabel and minSmallLabel divided by the factor. Tests: factor 1 equals the current result; property test over scales and factors 0.4 to 3: adjacent tick gaps times the factor are at least the minimum tick spacing (allowing for merged coincident ticks); a factor of 2 gives at least as many ticks as 1.

---

## Milestone 3: Circular domain

Acceptance (domain): computeCircularLayout for every circular preset face returns non overlapping rings, outer rings outside the disc edge, disc rings inside it, every ring at or above the minimum radius.

### Task 3.1: Circular geometry and layout (domain)

Files: src/core/slide-rule/geometry/circular.ts and test.

Constants DISC_RADIUS 240, RING_WIDTH 24, MIN_RING_RADIUS 72, HUB_RADIUS 28, RIM 14, MAX_DISC_RINGS 7. angleOf(position) in degrees clockwise from 12 o'clock, positionOf(angle) wrapped, polar(radius, degrees) to x and y with the centre at the origin, lengthFactor(radius). computeCircularLayout(face) returns discRadius, radius (outer edge of the rule), and rings with section, index, inner, outer and baseline (the edge facing the disc edge). Property tests for the acceptance criteria and the angle round trip.

### Task 3.2: Ring limit (domain)

Files: geometry/circular.ts and test.

canAddRing(face, section) and fitCircularRule(rule) returning the rule with excess innermost disc rings removed plus the removed scale IDs.

### Task 3.3: Circular presets (domain)

Files: rule/circularPresets.ts and test.

CIRCULAR_PRESETS: circular-basic, circular-scientific, circular-loglog with the layouts from the design and their own skins; DEFAULT_CIRCULAR_PRESET_ID circular-basic. Test: every preset uses known scales, has kind circular and fits the ring limit.

---

## Milestone 4: Circular instrument

Acceptance (adapter): src/instruments/circular-slide-rule/ui/CircularSlideRulePage.test.tsx renders the page with a fresh store and asserts the readout shows D 1.000 and C 1.000, the rule group is named "Basic circular slide rule, front face", the Disc and Cursor sliders exist, and the Rotate view button is pressed.

### Task 4.1: Ring drawing (adapter)

Files: circular-slide-rule/ui/RingScale.tsx and test.

Draws one ring from generateTicks(spec, lengthFactor(baseline)): radial ticks grouped into one path per size, labels rotated to be upright relative to the ring (reading outward), labels at position 1 dropped, scale name left of 12 o'clock. Test: a C ring has a path per tick size and a label "2" rotated by angleOf(log10 2); no label is drawn at position 1.

### Task 4.2: CircularRuleSvg (adapter)

Files: ui/CircularRuleSvg.tsx and test.

Fixed outer annulus with outer rings, disc group rotated by slideOffset turns, hub, cursor arm rotated by the cursor angle, and the whole drawing rotated by minus the cursor angle when rotateView is on. Disc and Cursor are keyboard sliders using the kit's keyDelta. Tests: transforms for given state; arrow keys call back with plus and minus KEY_STEP; rotate view rotates the outer group.

### Task 4.3: Drag angle maths (adapter)

Files: ui/turning.ts and test.

angleAt(point) in turns, sweep(previous, next) unwrapped into minus half to half, and turnDelta(part, sweep, rotateView) giving which value to change and by how much (clarification 7). Tests include crossing 12 o'clock in both directions.

### Task 4.4: CircularViewport (adapter)

Files: ui/CircularViewport.tsx.

Zoom, pan and fit through the kit's viewMath with a square content box; pinch and wheel as on the linear rule; turning drags with use-gesture (pointer converted with the root SVG's inverse screen matrix); pans only when zoomed in; floating and pinned loupe centred on the hairline at the disc edge. Covered by the page test and the end to end tests.

### Task 4.5: Page, config and registry (adapter)

Files: circular-slide-rule/config.ts, CircularSlideRule.tsx, ui/CircularSlideRulePage.tsx, index.ts, src/app/registry.ts, public/circular-slide-rule.svg, vite.config.ts (include the icon).

CIRCULAR_CONFIG: kind circular, presets, default circular-basic, route /circular-slide-rule, keys calc.circular-slide-rule.session and .saved, section names Outer rings and Disc, fitRule fitCircularRule, canAdd canAddRing. The page adds a Rotate view toggle to the kit toolbar. Turns the acceptance test green.

### Task 4.6: Ring limit in startup and the editor (coordination)

Files: kit state/startup.ts and test.

A config fitRule is applied to shared, session and saved rules on load, with MESSAGES.trimmed ("Some scales did not fit on the disc and were removed: ...") naming the removed scales. The editor disables "Add scale to disc" with the note "The disc is full." when canAdd is false.

---

## Milestone 5: End to end and review

### Task 5.1: Playwright tests (adapter)

Files: e2e/circular.spec.ts, e2e/helpers.ts.

Tests on Chromium desktop and iPhone WebKit: opens on Basic with D 1.000; turning the disc by an arc drag and the cursor by keys multiplies (within 1 percent); rotate view keeps the hairline at the top centre after the cursor turns; flip keeps the computation; a shared link restores the rule; a circular link opened from the linear page opens on the circular rule; the setting survives a reload. Helper dragArc(page, centre, radius, fromDegrees, toDegrees).

### Task 5.2: Final review

Run pnpm check, pnpm test, pnpm e2e and pnpm build, check the rule visually on desktop and phone sizes in both themes, update the design doc's clarified line, and ask the user for review.
