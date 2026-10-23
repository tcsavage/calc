# Linear Slide Rule Simulator Implementation Plan

**Goal:** Build the v1 linear slide rule PWA described in docs/plans/2026-10-22-1-linear-slide-rule-design.md.

**Architecture:** A single Vite and React package in three hexagonal layers. The domain (src/core) is pure TypeScript scale maths, graduation, layout, rule model, edits and codecs. Coordination (src/instruments/linear-slide-rule/state) is a zustand store plus startup and autosave orchestration that talks to the outside world only through ports. Adapters are the React UI, the app shell and instrument registry, and the localStorage, location and share implementations of the ports.

**Tech Stack:** TypeScript (strict), React 19, Vite 8, vite-plugin-pwa, react-router (hash router), zustand, zod, @use-gesture/react, Biome, Vitest, fast-check, React Testing Library, Playwright, pnpm, GitHub Actions and GitHub Pages.

---

## Core principles

- **Git is the user's responsibility, not the assistant's.** The Assistant can make changes directly to the master branches, but never commits unprompted.
- **TDD throughout but don't overdo it:** the assistant writes the failing test, runs it, watches it fail *for the right reason*, implements the minimum, runs it green, then requests review. DRY, YAGNI. But only tests most important paths, the assistant should try to cover every possible permutation. The assistant should avoid verifying calls using mocks, while preferring to just test actual results when possible.

## Conventions

Layers and folders:

| Layer | Folders | May import |
| --- | --- | --- |
| Domain | src/core | nothing outside src/core, no React, no DOM APIs |
| Coordination | src/instruments/linear-slide-rule/state | src/core, zustand |
| Adapters | src/instruments/linear-slide-rule/adapters, src/instruments/linear-slide-rule/ui, src/app | anything below them |
| Adapters (shared) | src/shared (the Web Storage wrapper used by both the shell and instruments), src/instruments/types.ts (the instrument contract) | src/core |

Clarifications of the design made by this plan:

1. The design put the localStorage store in src/core/slide-rule/serialisation. localStorage is a DOM API, so the pure codec (validation, migration, encoding) stays in the domain and the storage wrapper becomes an adapter behind a port.
2. Layer boundaries are enforced by a Vitest architecture test that scans import statements, rather than Biome noRestrictedImports, because Biome matches import specifiers, not resolved paths.
3. The rule definition stores faces directly (faces.front and faces.back, each with upper, slide and lower lists). This is equivalent to the stator and slide split in the design; assembling a face is a property lookup, so no assembleFace function is needed.
4. The session (working copy and rule state) and the saved rules use two localStorage keys, calc.linear-slide-rule.session and calc.linear-slide-rule.saved, so that "Reset to default rule" in the error boundary clears the session without deleting saved rules.
5. Graduations are declared as cut points with a major step per interval. A spec authoring helper derives the finer tick steps from a minimum physical spacing, producing ordinary segment data. Specs remain declarative data; nothing is computed at zoom time.
6. "Reset" in the toolbar returns the slide offset and cursor position to zero; it does not change the rule.
7. The working copy is saved over an existing saved rule when "Save as" is given that rule's name.
8. Added during implementation: scales may declare labelValue, a label-only mapping (K prints 1 to 10 in each decade, as real K scales do) so labels do not collide.
9. Added during implementation: a share link opened while the app is already running (a hash change) is applied to the running store, and the payload is cleared in an effect rather than during boot, because React StrictMode runs the boot twice.
10. Added during implementation: zoom buttons (zoom in, zoom out, fit) under the rule for mouse users; the mouse wheel pans, and pinch or Ctrl with the wheel zooms.

Outside in: each milestone starts with an acceptance test at the outermost layer. It stays red while the tasks under it are built, from adapters inward to the domain. A task whose test needs a function from a later task in the same milestone says so; its test turns green when that task lands.

Every task has the same five steps:

1. Write the failing test.
2. Run it and confirm it fails for the right reason (missing module or wrong value, not a typo).
3. Implement the minimal code to make it pass.
4. Run the full suite (pnpm test) and make sure it passes, plus pnpm check (Biome and type check).
5. Ask the user for review of the changes.

Commands:

- pnpm test: Vitest, all unit and component tests.
- pnpm test path/to/file.test.ts: a single test file.
- pnpm check: Biome check and tsc --noEmit.
- pnpm e2e: Playwright.
- pnpm dev: local dev server.

Units: the scale length is 1000 SVG user units (constant SCALE_LENGTH). All persisted positions are normalised, where 1 is one scale length.

---

## Milestone 0: Project setup

### Task 0.1: Scaffold (adapter)

Files: package.json, tsconfig.json, vite.config.ts, biome.json, index.html, src/main.tsx, src/app/App.tsx, src/test/setup.ts, .gitignore.

Steps:

1. Create package.json with scripts dev, build (tsc --noEmit and vite build), preview, test (vitest run), check (biome check . and tsc --noEmit), e2e (playwright test).
2. Install runtime dependencies: react, react-dom, react-router, zustand, zod, @use-gesture/react.
3. Install dev dependencies: typescript, vite, @vitejs/plugin-react, vite-plugin-pwa, @biomejs/biome, vitest, jsdom, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom, @testing-library/dom, fast-check, @playwright/test, @types/react, @types/react-dom, @types/node.
4. tsconfig: strict, noUncheckedIndexedAccess, module ESNext, moduleResolution bundler, jsx react-jsx, types vitest/globals and vite/client.
5. vite.config.ts: react plugin, base from the BASE_PATH environment variable (default "/"), Vitest config with environment jsdom, setupFiles src/test/setup.ts, include src/**/*.test.ts(x).
6. Write a smoke test src/app/App.test.tsx asserting App renders the heading "Calc". Run it red, write App, run it green.
7. Run pnpm check and fix any formatting.
8. Ask user for review.

### Task 0.2: Architecture boundary test (domain)

Files: src/architecture.test.ts.

Test: walk src recursively, parse import specifiers with a regular expression, resolve relative specifiers to paths, and assert:

- files under src/core import only relative paths that resolve inside src/core, and never react, react-dom, zustand or anything else from node_modules except zod;
- files under src/instruments/linear-slide-rule/state never import from adapters or ui;
- files under src/instruments never import from src/app;
- no instrument folder imports from another instrument folder.

To see it fail for the right reason, temporarily add an import of react to a file in src/core, confirm the failure message names the file, then remove it.

### Task 0.3: CI and Pages workflow (adapter)

Files: .github/workflows/ci.yml.

Jobs: install with pnpm, pnpm check, pnpm test, install Playwright browsers, pnpm e2e, build with BASE_PATH=/calc/, and on main upload the dist folder with actions/upload-pages-artifact and deploy with actions/deploy-pages. No test; verify by reading the file and running the same commands locally.

---

## Milestone 1: A static Rietz rule with a readout

Acceptance (adapter): src/instruments/linear-slide-rule/ui/SlideRulePage.test.tsx renders SlideRulePage with a fresh store and asserts that the readout row for D shows "1.000", the row for C shows "1.000", the row for CI shows "10.00" (C at 1 is CI at 10), and that the SVG contains a scale named "K".

### Task 1.1: ScaleBand component (adapter)

Files: ui/ScaleBand.tsx, ui/ScaleBand.test.tsx.

Props: name, formula, ticks (array of position, level, optional label and label size), band (y, height, anchor top or bottom), ink colour. Renders one path per tick level (path data "M x y1 V y2" repeated), text for labels, the scale name in the left margin and the formula in the right margin.

Test with literal ticks: three ticks at levels 0, 1 and 2 produce three paths; a tick at position 0.5 produces an x of 500 plus the left margin; labels render as text; anchor bottom draws ticks upwards from the band bottom.

### Task 1.2: RuleSvg component (adapter)

Files: ui/RuleSvg.tsx, ui/RuleSvg.test.tsx.

Props: layout (from task 1.5), skin palette, slide offset, cursor position, viewBox, and optional drag and keyboard handlers. Draws upper stator, lower stator, the slide group translated by slideOffset times SCALE_LENGTH, and the cursor group translated by cursor times SCALE_LENGTH. Each ScaleBand is memoised. The slide and cursor are role slider elements with aria labels "Slide" and "Cursor".

Test: the slide group transform is translate(301.03 0) for slide offset 0.30103; the cursor has role slider with aria-valuenow equal to the cursor position.

### Task 1.3: Readout component (adapter)

Files: ui/Readout.tsx, ui/Readout.test.tsx.

Props: entries (scale name, section, text). Renders a table with one row per entry, scale name in a row header. Test with literal entries.

### Task 1.4: Store skeleton (coordination)

Files: state/store.ts, state/store.test.ts.

createSlideRuleStore(initial) uses zustand createStore (vanilla) with rule, state (face, slideOffset, cursor), savedRules, notices, loupePinned, editorOpen. Test: a store created with defaultSession() has the Rietz rule, face front, slide offset 0 and cursor 0. Red until tasks 1.6 to 1.9.

### Task 1.5: Face layout (domain)

Files: src/core/slide-rule/geometry/layout.ts and test.

computeFaceLayout(face) returns upper, slide and lower sections, each with y, height and bands (placement, y, height, anchor). Band height 24 units; an empty stator is 12 units high; an empty slide is one band high. Anchors: all upper stator bands anchor bottom; all lower stator bands anchor top; slide bands in the upper half of the slide anchor top and the rest anchor bottom. Also exports SCALE_LENGTH 1000, MARGIN 60 and LinearGeometry.toX(position) equal to MARGIN plus position times SCALE_LENGTH.

Tests: Rietz front gives two upper bands anchored bottom, three slide bands (first two top for an odd count of three? use index less than count divided by 2 rounded down for top, so B top, CI and C bottom), two lower bands anchored top; total height is the sum of section heights; empty back stators are 12 high.

### Task 1.6: Scale spec types and the graduation helper (domain)

Files: src/core/slide-rule/scales/types.ts, graduation.ts, graduation.test.ts.

Types: ScaleSpec with id, name, formula, description, ink (black or red), domain (min and max value), toPosition, fromPosition, segments (from, to, steps from coarsest to finest, labelSteps), optional marks (value and label), and optional displayValue (used by folded scales).

Helper graduate(toPosition, cuts, options): for each cut (from, to, major), choose the finest step from the nice ladder (1, 2, 5 times powers of ten, dividing major) whose absolute normalised spacing at both interval ends is at least options.minTick (default 0.0022). The step levels form a chain in which each step divides the previous one (for example 1, 0.5, 0.1, 0.05, 0.01), built by repeatedly choosing the largest of previous/2, previous/5 and previous/10 that is still a whole multiple of the finest step. Divisibility is checked on integers after scaling, not with floating point tolerance. Large labels at major if the major spacing is at least 0.02; small labels at the next level whose spacing is at least options.minSmallLabel (default 0.02).

Tests: for C between 1 and 2 with major 1 the steps are 1, 0.5, 0.1, 0.05 and 0.01; between 4 and 10 they end at 0.05 or 0.1 depending on spacing; each step divides the previous one; decreasing scales (CI) get the same steps as C.

### Task 1.7: Tick generator (domain)

Files: src/core/slide-rule/scales/ticks.ts and test.

generateTicks(spec) iterates each segment by its finest step using integer indices (value equals index times step, rounded to 12 significant digits), assigns the level of the coarsest step that divides the value, attaches a large label (displayValue formatted with up to 4 significant digits) or a small label (the single digit of value divided by the small label step, modulo 10), skips non finite positions and positions outside 0 to 1 by more than 1e-9 (with a console warning in development builds), merges duplicates at segment boundaries keeping the coarser level, adds marks, and sorts by position. Results are memoised per spec id.

Tests: C has major ticks exactly at 1 to 10; all ticks are finite, inside 0 to 1, strictly increasing; a spec whose toPosition returns NaN for some values yields ticks without those values instead of throwing.

### Task 1.8: Scale library (domain)

Files: src/core/slide-rule/scales/library.ts, library.test.ts.

Transforms (lg is log10, ln is natural log):

| Scale | Domain | toPosition | Ink |
| --- | --- | --- | --- |
| C, D | 1 to 10 | lg x | black |
| CI, DI | 1 to 10 | 1 minus lg x | red |
| CF, DF | pi to 10 pi | lg(x / pi), display x over 10 when x is 10 or more | black |
| CIF | 1/pi to 10/pi | 1 minus lg(pi x), display 10x when x is below 1 | red |
| A, B | 1 to 100 | lg x / 2 | black |
| K | 1 to 1000 | lg x / 3 | black |
| R1 | 1 to sqrt 10 | 2 lg x | black |
| R2 | sqrt 10 to 10 | 2 lg x minus 1 | black |
| P | 0 to sqrt 0.99 | 1 plus lg(1 minus x squared) / 2 | black |
| S | 5.739 to 90 degrees | 1 plus lg sin x | black |
| T | 5.711 to 45 degrees | 1 plus lg tan x | black |
| ST | 0.5730 to 5.730 degrees | 2 plus lg(x pi / 180) | black |
| L | 0 to 1 | x | black |
| LL1 | e to the 0.01 to e to the 0.1 | 2 plus lg ln x | black |
| LL2 | e to the 0.1 to e | 1 plus lg ln x | black |
| LL3 | e to e to the 10 | lg ln x | black |
| LL01 | e to the minus 0.1 to e to the minus 0.01 | 2 plus lg(minus ln x) | black |
| LL02 | e to the minus 1 to e to the minus 0.1 | 1 plus lg(minus ln x) | black |
| LL03 | e to the minus 10 to e to the minus 1 | lg(minus ln x) | black |

Marks: pi on C, D, A and B. Each scale has cuts with major steps chosen so labels do not collide.

Tests:

- a table of known pairs within 1e-9: C at 2 is lg 2; CI at 2 is 1 minus lg 2; A at 4 equals C at 2; K at 8 equals C at 2; S at 30 equals C at 5 (1 plus lg 0.5); LL3 at e cubed equals C at 3; CF at pi is 0; CIF at 10/pi is 0; R2 at 5 equals 2 lg 5 minus 1; P at 0.6 equals D at 8;
- a fast-check property that fromPosition(toPosition(v)) equals v (relative tolerance 1e-9) for v inside each domain;
- every scale's ticks are finite, inside 0 to 1, strictly increasing, and there are at least 20 ticks;
- the library contains exactly the 23 design scales.

### Task 1.9: Presets and rule model (domain)

Files: src/core/slide-rule/rule/types.ts, presets.ts, presets.test.ts, state.ts, state.test.ts.

Types: Palette (body, slide, ink, redInk, hairline, glass, text), Skin (light and dark palettes), ScalePlacement (scale id, optional ink), FaceDefinition (upper, slide, lower), RuleDefinition (id, name, kind "linear", optional basedOn, skin, faces front and back), Face ("front" or "back"), RuleState (face, slideOffset, cursor).

Presets: mannheim, rietz, darmstadt and loglog-duplex with the layouts in the design, each with its own skin.

State functions: clampSlide (minus 1 to 1), clampCursor (minus 0.05 to 1.05), defaultRuleState.

Tests: every preset uses only library scale ids; the three simplex presets have empty back stators; the duplex has non empty back stators; clamping holds at the limits.

### Task 1.10: Readout computation (domain)

Files: src/core/slide-rule/readout.ts and test.

computeReadout(face definition, state) returns, for each placement top to bottom, the scale name, the section, and text: position is cursor for stators and cursor minus slideOffset for the slide; if the position is outside 0 to 1 (tolerance 1e-9) the text is "out of range", otherwise displayValue(fromPosition(position)) formatted with toPrecision(4).

Tests: with slide 0 and cursor 0, D reads 1.000 and CI reads 10.00; with slide lg 2 and cursor lg 6, D reads 6.000 and C reads 3.000 (multiplication); with slide lg 2 and cursor 0, C reads out of range.

Close the milestone: run the acceptance test green, then ask the user for review.

---

## Milestone 2: Interaction

Acceptance (adapter, Playwright): e2e/interaction.spec.ts loads the app, drags the slide right by a measured amount, focuses the cursor and moves it with the keyboard, and asserts the readout of D is approximately C times the D value under the slide index (within 1 percent). Also asserts Flip shows the back face of the default Rietz rule (S, ST and T rows) and that the slide offset is unchanged (aria-valuenow of the slide).

### Task 2.1: Viewport with pan, zoom and drag (adapter)

Files: ui/RuleViewport.tsx, ui/useElementSize.ts.

Uses useGesture on the SVG. Drag start reads data-part of the event target: "slide", "cursor" or anything else (pan). For slide and cursor drags, the client pixel delta is converted to user units with svg.getScreenCTM().a and divided by SCALE_LENGTH, then sent to the store. Pan moves the viewBox. Pinch and wheel zoom around the pointer, zoom between 1 and 24. touch-action none on the SVG. The fit viewBox covers the rule width plus padding at the container aspect ratio. Tested by Playwright only (jsdom has no layout).

### Task 2.2: Keyboard adjustment (adapter)

Files: ui/RuleSvg.tsx, ui/RuleSvg.test.tsx.

Arrow left and right on a focused slider move by 0.002; with Shift by 0.0002. Test with user-event: pressing ArrowRight on the cursor increases aria-valuenow by 0.002; with Shift by 0.0002.

### Task 2.3: Toolbar (adapter)

Files: ui/Toolbar.tsx, ui/Toolbar.test.tsx.

Buttons: Flip (shows "Front" or "Back"), Readout toggle, Loupe pin, Edit, Share, Reset, and the rule picker select. Test: clicking Flip changes the readout rows to the back face; Reset returns slide and cursor to 0.

### Task 2.4: Store actions (coordination)

Files: state/store.ts, state/store.test.ts.

Actions: moveSlideBy, moveCursorBy, setSlideOffset, setCursor, flip, resetPosition. Tests: moves clamp at the limits; flip keeps slideOffset and cursor.

Close the milestone: Playwright acceptance green, ask the user for review.

---

## Milestone 3: Loupe

Acceptance (adapter, Playwright): during a mouse drag on the cursor, an element with role img and name "Loupe" is visible; after release it disappears; after pressing "Pin loupe" it stays visible.

### Task 3.1: Loupe component (adapter)

Files: ui/Loupe.tsx, ui/loupeView.ts, ui/loupeView.test.ts.

loupeViewBox(main viewBox, main pixel width, loupe pixel size, hairline x, focus y, magnification 4) returns a viewBox whose width is the main viewBox width times loupe width over main pixel width over 4, centred on the hairline. Floating mode sits 140 pixels above the pointer, with pointer-events none. Pinned mode is docked at the top, full width, 140 pixels high, and interactive: the same drag handling applies, and because its CTM is 4 times larger, drags move at 4 to 1.

Test: the pure loupeViewBox function (a viewBox of width 1200 at 600 pixels with a 200 pixel loupe gives width 100, centred on the hairline).

### Task 3.2: Loupe flags (coordination)

store actions toggleLoupePinned. Test: toggling flips the flag. The dragging flag is local React state in SlideRulePage.

---

## Milestone 4: Presets, skins and theme

Acceptance (adapter): SlideRulePage test selects "Log Log Duplex" in the rule picker and asserts the readout shows LL02, LL03 and DF rows; flips and asserts LL01 appears.

### Task 4.1: Rule picker (adapter)

Options grouped as Presets and Saved; when the working copy is modified, an extra selected option shows its name.

### Task 4.2: Skin and theme CSS (adapter)

Files: src/app/theme.css, ui/skinStyle.ts and test.

skinStyle(skin) returns CSS custom properties for light and dark palettes. Theme setting (system, light or dark) sets data-theme on the html element; CSS picks the palette. Test: skinStyle maps palette fields to variables.

### Task 4.3: selectRule action (coordination)

selectRule(definition) replaces the working copy and keeps the rule state. Test.

---

## Milestone 5: Scale editor

Acceptance (adapter): SlideRulePage test opens Edit, adds K to the front upper stator of Mannheim, removes CI from the slide, moves D up (no change at top) and toggles ink on C; asserts the readout rows reflect the edits, the rule picker shows "Mannheim (modified)", and the original Mannheim preset is unchanged.

### Task 5.1: ScaleEditorDrawer (adapter)

Face tabs, three sections each listing placements with Move up, Move down, Remove and Ink buttons (accessible names include the scale name), an "Add scale" select per section listing "name: formula", and a Save as form.

### Task 5.2: editRule action (coordination)

Applies a domain edit and forks: if the working copy is a preset or saved rule (its id is in presets or saved rules), the result gets a new id "custom-" plus a random suffix, basedOn the original id, and name "<name> (modified)". Further edits keep that id.

### Task 5.3: Rule edits (domain)

Files: src/core/slide-rule/rule/edits.ts and test.

addScale, removeScale, moveScale (up or down, no-op at the ends), toggleInk (between the scale default and the other ink). Each returns a new definition; inputs are never mutated. Tests for each, plus that a removed or moved index outside the list is a no-op.

---

## Milestone 6: Persistence

Acceptance (adapter): SlideRulePage test with a jsdom localStorage: move the slide, advance timers by 600 ms, unmount, mount again from storage, and the slide offset is restored. A second test saves a rule as "Mine", remounts, and finds "Mine" in the picker under Saved.

### Task 6.1: localStorage adapter (adapter)

Files: adapters/localStorageStore.ts and test.

createKeyValueStore(storage or undefined) returns get(key), set(key, value), remove(key) and available. Every call is wrapped in try and catch; failures set available to false. Tests: round trip with jsdom localStorage; a Storage object whose methods throw yields available false and get returns null without throwing.

### Task 6.2: Ports and autosave (coordination)

Files: state/ports.ts, state/persistence.ts and test.

Ports: SessionPort (loadSession, saveSession, clearSession, loadSaved, saveSaved, available). startAutosave(store, port, delay 500) subscribes to rule and state changes and saves the encoded session after the delay; saved rules save immediately. Test with fake timers and an in memory port object, checking the stored value, not calls.

### Task 6.3: Startup resolution (coordination)

Files: state/startup.ts and test.

resolveStartup({ sharePayload, session, saved, storageAvailable }) returns rule, state, savedRules and notices, in the order share payload, session, default Rietz. Tests: valid share wins; invalid share adds the notice "This shared link could not be opened" and falls back to the session; newer version share adds "This link was made with a newer version of the app, reload to update"; unknown scales add a notice listing them; storage unavailable adds "Settings will not be saved in this browser".

### Task 6.4: saveAs, renameSaved, deleteSaved (coordination)

Save as with a new name appends; with an existing name replaces that rule; the working copy takes the saved id and name. Tests.

### Task 6.5: Session codec (domain)

Files: src/core/slide-rule/codec/schema.ts, migrate.ts, codec.ts and tests.

Zod schemas for RuleDefinition, RuleState and the envelope (v, rule, state) and saved list (v, rules). migrate(raw, current, migrations) returns ok or newer-version; dropUnknownScales(rule, aliases) returns the rule and the dropped ids. decodeSession(raw) runs migrate, then schema, then drop unknown, then clamps state. CURRENT_VERSION is 1 with an empty migration table and an empty alias table.

Tests: round trip for every preset; invalid input gives invalid; v 2 gives newer-version; a fake v0 fixture with a fake migration table is migrated; an unknown scale is dropped and reported; an alias maps to the new id.

---

## Milestone 7: Sharing

Acceptance (adapter, Playwright): open a share URL built by encodeSharePayload for the duplex preset with slide lg 2, cursor lg 6, face back, and assert the rule picker, the face and the D readout (6.000) are restored, and the URL no longer contains s=.

### Task 7.1: Location and share adapters (adapter)

Files: adapters/location.ts, adapters/share.ts and tests.

readSharePayload reads s from the query part of the hash; clearSharePayload replaces the hash with the path only using history.replaceState; buildShareUrl(payload) uses origin, pathname and #/linear-slide-rule?s=. shareUrl(url) uses navigator.share when available, otherwise navigator.clipboard.writeText, and returns "shared" or "copied". Tests in jsdom.

### Task 7.2: Share payload encoding (domain)

Files: src/core/slide-rule/codec/base64url.ts and test.

encodeSharePayload(session) is base64url of UTF-8 JSON; decodeSharePayload(string) reverses it and runs decodeSession; malformed base64 or JSON gives invalid. Tests: round trip including a rule name with non ASCII characters; length under 1024 for every preset; garbage gives invalid.

---

## Milestone 8: App shell

Acceptance (adapter): App test renders the home route, sees the "Linear slide rule" card, clicks it and sees the rule; renders the error boundary with an instrument that throws and sees "Something went wrong" and the "Reset to default rule" button.

### Task 8.1: Instrument registry and routes (adapter)

Files: src/app/registry.ts, src/app/App.tsx, src/app/Home.tsx, src/instruments/linear-slide-rule/index.ts.

InstrumentEntry: id, name, description, icon, load (lazy component) and resetStorage. Hash router with "/" for Home and "/:instrumentId" for the instrument. Unknown ids show "Not found".

### Task 8.2: Settings and theme (adapter)

Files: src/app/settings.ts and test.

Settings (theme, readoutVisible) stored under calc.settings via the key value store; instruments receive settings and an update function as props. Test: toggling persists.

### Task 8.3: Error boundary and notices (adapter)

InstrumentErrorBoundary with the reset button calling resetStorage and reloading. Notices component lists store notices with dismiss buttons.

### Task 8.4: PWA (adapter)

vite-plugin-pwa with registerType prompt, a manifest (name Calc, icons generated as simple SVG and PNG), and an update notice using useRegisterSW. Verified by the Playwright offline test.

---

## Milestone 9: End to end and deployment

### Task 9.1: Playwright smoke tests (adapter)

Files: playwright.config.ts, e2e/*.spec.ts.

Projects: Chromium desktop and an iPhone WebKit device. Web server: pnpm build and pnpm preview. Tests: loads with D 1.000; interaction product; share URL restore; loupe visibility and pinning; offline reload after the service worker is ready (context.setOffline(true) then reload, the rule still renders).

### Task 9.2: Final review

Run pnpm check, pnpm test, pnpm e2e and pnpm build. Ask the user for review.
