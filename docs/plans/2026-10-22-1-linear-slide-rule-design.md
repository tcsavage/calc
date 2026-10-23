# Linear Slide Rule Simulator: Design

Date: 2026-10-22
Status: Approved

## Goal

A TypeScript website, installable as a PWA, that simulates a linear slide rule. Users can pick from preset rules or compose their own from a library of scales. The architecture anticipates other slide rule geometries (circular, cylindrical) and other mechanical calculators (Curta, Addiator, abacus, Napier's bones and so on) being added later.

## Decisions

| Topic | Decision |
| --- | --- |
| Platform | PWA built with React and Vite. A Capacitor wrapper for app store builds may be explored later. |
| Fidelity | Generic engine with presets that approximate real models. |
| Scale selection | Start from a preset, then add, remove, reorder and recolour scales. |
| Reading aids | Optional readout of every visible scale's value under the cursor hairline. No tutorials in v1. |
| Future instruments | Scale maths is independent of geometry (linear now, arc later). Non slide rule calculators get only a top level instrument registry and shell; nothing else is shared. |
| Duplex | Supported in v1. Flip turns the rule about its long axis; slide offset and cursor position are shared between faces. |
| Back of slide | Modelled physically: body has front and back stators, slide has front and back scales. A simplex rule has empty back stators. |
| UI framework | React (current stable major). Exact library versions are left to the implementation plan. |
| Rendering | SVG. Scale artwork drawn once as a few paths per scale; dragging changes only transforms. |
| Small screens | Pinch zoom and pan, plus a loupe. |
| Loupe | Appears automatically while dragging, positioned above the finger, centred on the hairline, 4x magnification. A pin toggle docks it at the top of the screen. |
| Fine adjustment | Arrow keys on keyboard (Shift for finer steps). On touch, dragging inside the loupe moves at a 4 to 1 ratio. May be revisited. |
| Snapping | None. |
| Slide travel | Slide can be pulled out up to its full length in either direction. No inertia. |
| Visual style | Flat and clean, off white body, black and red ink, dark mode, with a small colour skin per preset. Skeuomorphic skins may come later. |
| Scale editor | Side drawer (bottom sheet on mobile) per face with upper stator, slide and lower stator sections. |
| Persistence | localStorage for the working copy, last session and saved custom rules. |
| Sharing | URL containing the full rule definition plus slide offset, cursor position and visible face. |
| Hosting | GitHub Pages via GitHub Actions. |
| Tooling | pnpm, Vite, TypeScript strict, Biome, Vitest, fast-check, React Testing Library, Playwright, zod, zustand, @use-gesture/react, react-router (hash router), vite-plugin-pwa. |

### v1 scale library

C, D, CI, DI, CF, DF, CIF, A, B, K, R1, R2, P, S, T, ST, L, LL1, LL2, LL3, LL01, LL02, LL03.

P is the Pythagorean scale: reading x on P gives the square root of 1 minus x squared on D.

### v1 preset layouts

All layouts are approximations of real models, not exact replicas. Each face is listed as upper stator, then slide, then lower stator, top to bottom. "Empty" means no scales.

Mannheim (simplex, after a classic Faber-Castell Mannheim):

- Front: upper stator A; slide B, CI, C; lower stator D.
- Back: upper stator empty; slide S, L, T; lower stator empty.

Rietz (simplex, after a Faber-Castell 111/54):

- Front: upper stator K, A; slide B, CI, C; lower stator D, L.
- Back: upper stator empty; slide S, ST, T; lower stator empty.

Darmstadt (simplex, after a Faber-Castell 1/98):

- Front: upper stator L, K, A; slide B, CI, C; lower stator D, P, S, T.
- Back: upper stator empty; slide LL1, LL2, LL3; lower stator empty.

Log Log Duplex (duplex, after a K and E 4081-3):

- Front: upper stator LL02, LL03, DF; slide CF, CIF, CI, C; lower stator D, LL3, LL2.
- Back: upper stator LL01, L, K, A; slide B, T, ST, S; lower stator D, DI, LL1.

## Approach

Declarative scale specs. Each scale is data plus a transform from a value to a normalised position between 0 and 1, its inverse, and a graduation spec. A generic tick generator turns the spec into abstract ticks, and a geometry adapter maps those to drawing coordinates. The renderer, readout and loupe all use the same transform and inverse, so they cannot disagree.

Rejected alternatives:

- Hand coded drawing per scale. Faster to start, but duplicates tick logic across around 20 scales, needs separate readout maths, and does not transfer to circular rules.
- Automatic graduation from the transform alone, chosen by density and zoom. Hard to match real rule conventions. Could be added later as an optional enhanced detail mode on top of declarative specs.

## Architecture

A single package. The source is split into three layers. Dependencies only go one way, from the top of this list down.

1. src/app is the shell. It holds the instrument registry, routing (hash router, since GitHub Pages has no fallback for single page apps), a home screen with an instrument picker, global settings (theme, readout on or off) and layout.
2. src/instruments/<instrument-id> holds one folder per instrument containing its React UI. v1 has linear-slide-rule only. Each instrument exports a registry entry: ID, name, short description, icon and a lazily loaded root component. The shell knows nothing else about instruments.
3. src/core is pure TypeScript with no React and no DOM. Its subfolder src/core/slide-rule contains:
   - scales: scale spec types, the v1 scale library, the tick generator.
   - geometry: the linear adapter now, an arc adapter later.
   - rule: the rule definition model, presets, face assembly, rule state.
   - serialisation: versioned schemas, URL codec, localStorage store.

Biome noRestrictedImports enforces the boundaries. src/core may not import React or anything from src/app or src/instruments. Instruments may not import from each other. A future circular-slide-rule instrument would reuse src/core/slide-rule with the arc adapter. If Capacitor is added later, src/core moves into its own package unchanged.

Cross cutting rules:

- All positions (slide offset, cursor position) are stored in normalised rule length units, never pixels. This makes share links and saved state independent of screen size and zoom.
- Every persisted or URL encoded format carries a schema version from day one.

## Components

### Core (src/core/slide-rule)

- ScaleSpec: ID, name, formula label (for example "x squared"), description, default ink (black or red), value domain, toPosition(value) returning a normalised position between 0 and 1, its inverse fromPosition(position), and a list of graduation segments. Each segment covers a value range and lists tick intervals by level (major, mid, minor, sub minor) and a labelling rule (interval and number format). Inverted, folded and log log scales differ only in their transform. For example, CI is 1 minus log10(x), and CF is log10(x divided by pi).
- generateTicks(spec): returns ticks, each with a position, a level and an optional label. Memoised per scale.
- LinearGeometry: maps a normalised position to an x coordinate given the rule length. Tick direction is derived from placement: ticks point towards the nearest edge between slide and stator. A future ArcGeometry implements the same small interface.
- RuleDefinition: schema version, ID, name, kind ("linear"), skin (body, slide, ink, red ink and cursor colours), body stators (front upper, front lower, back upper, back lower lists of scale placements) and slide scales (front and back lists). A scale placement is a scale ID plus an optional ink override.
- assembleFace(rule, face): returns the upper, slide and lower scale lists for the front or back face.
- RuleState: visible face, slide offset and cursor position, both normalised. Slide offset is clamped to the range from minus 1 to 1. Cursor position is clamped to slightly beyond the range from 0 to 1.
- Presets: Mannheim, Rietz, Darmstadt and Log Log Duplex, as listed under v1 preset layouts.

### UI (src/instruments/linear-slide-rule)

- SlideRulePage: contains toolbar, viewport, readout, loupe and editor drawer.
- RuleViewport: pinch zoom, wheel zoom and pan using @use-gesture/react.
- RuleSvg: draws stators, a slide group (moved with translateX) and the cursor. Each ScaleBand is memoised on its placement and the skin, so dragging only changes transforms.
- ScaleBand: draws one scale: one path per tick level, labels, scale name on the left and formula label on the right.
- Cursor: translucent glass with a red hairline, draggable.
- Loupe: re-renders RuleSvg with a viewBox at 4x magnification around the hairline. Appears automatically while dragging; can be pinned to dock at the top. Dragging inside the loupe adjusts at a 4 to 1 ratio.
- Readout: lists the value under the hairline for every visible scale, using fromPosition and allowing for the slide offset on slide scales. Values shown to 4 significant figures, or "out of range".
- Toolbar: rule picker, flip, readout toggle, loupe pin, edit, share, reset.
- ScaleEditorDrawer: each face listed as upper stator, slide and lower stator sections. Each scale row has move up, move down, remove and an ink toggle. An add scale picker lists the library with a short description of each scale. Edits apply live.
- State: a zustand store per instrument holding the rule definition, rule state and UI flags.

## Data flow

Startup. The page loads the rule and state from, in order: a share payload in the URL, the last session in localStorage, then the Rietz preset with the slide centred and the cursor at 1 on the D scale. Once loaded, the share payload is removed from the URL so a refresh does not undo later changes.

Dragging. A pointer move on the slide or cursor gives a change in pixels. That is divided by the rule length in pixels times the zoom, and also divided by 4 if the drag started inside the loupe, to give a change in normalised units. The store clamps the result and updates the slide offset or cursor position. Only the translateX transforms on the slide group and cursor group, and the loupe viewBox, change. ScaleBand artwork is not re-rendered.

Readout. On every state change, a position is computed for each visible placement: the cursor position for stator scales, and the cursor position minus the slide offset for slide scales. fromPosition gives the value. Positions outside the scale's drawn range show "out of range". This is about 20 cheap function calls per frame.

Flipping. Flip toggles the face. Slide offset and cursor position are unchanged; assembleFace selects the other set of scales.

Editing. Editor changes update a working copy of the rule definition. Changing a preset turns the working copy into a custom rule named "<preset name> (modified)". Presets themselves are never changed.

Saving. The working copy and rule state are written automatically to localStorage under the key calc.linear-slide-rule, about 500 ms after the last change. "Save as" adds the working copy to a list of saved custom rules, which appear in the rule picker next to the presets. Saved rules can be renamed and deleted.

Sharing. Share builds a URL of the form #/linear-slide-rule?s=<payload>. The payload is base64url encoded JSON containing the schema version, the full rule definition and the rule state. It always embeds the full definition, never a preset ID, so a shared link keeps working if a preset changes later. URLs stay well under 1 KB. Share uses the Web Share API where available, otherwise copies the link to the clipboard.

## Error handling

- Validation: every payload from outside the app (URL shares and anything read from localStorage) is parsed with a zod schema before use. Code inside the app trusts its own types.
- Corrupt or invalid share links: show a dismissible notice ("This shared link could not be opened") and fall back to the next startup source. Never crash and never overwrite the saved session with invalid data.
- Older schema versions: run through a chain of migration functions (for example from v1 to v2, then v2 to v3) before validation. The chain is empty in v1, but the mechanism exists.
- Newer schema versions: reject with "This link was made with a newer version of the app, reload to update", then fall back as above.
- Unknown scale IDs: drop the placement, load the rest of the rule, and show a notice listing the dropped scales. Renamed scales get an alias table in the scale library.
- localStorage unavailable (private mode, full quota or throws): all access goes through a wrapper that catches errors. The app keeps working in memory and shows a one time notice that settings will not be saved.
- Numerical edge cases: generateTicks skips any tick whose position is not finite or falls outside its segment range, with a console warning in development builds. The readout shows "out of range" rather than extrapolated or NaN values. Clamping keeps slide offset and cursor position within limits.
- Render failures: an error boundary wraps each instrument, showing "Something went wrong" with a "Reset to default rule" button that clears only that instrument's localStorage key. The shell and other instruments are unaffected.
- PWA updates: vite-plugin-pwa runs in prompt mode. When a new version has been downloaded, a "New version available, reload" notice appears rather than reloading silently.

## Testing

### Unit tests (Vitest, src/core)

- Scale correctness: for every scale, a table of known value and position pairs checked to within 1e-9. Examples: C at 2 is log10(2); CI at 2 is 1 minus log10(2); A at 4 aligns with C at 2; K at 8 aligns with C at 2; S at 30 degrees aligns with C at 5 (on the 0.1 to 1 decade); LL3 at e cubed aligns with C at 3.
- Round trips: for every scale, fromPosition(toPosition(v)) equals v across its domain, as a fast-check property test.
- Tick generation: for every scale, ticks are ordered, finite, within 0 to 1 and have no duplicate positions. Spot checks confirm major ticks fall at expected values (C has major ticks at 1 to 10). Snapshot tests cover tick counts per level.
- Arithmetic integration: simulate the rule. Setting C index 1 over D at 2, moving the cursor to C at 3 and reading D gives 6. Similar tests cover division, squares using A and B, and log log powers.
- Face assembly: simplex and duplex presets produce the expected front and back faces, and a simplex back face has empty stators.
- Serialisation: encode and decode round trips for every preset. Corrupt payloads, newer schema versions and unknown scale IDs each produce the documented fallback. The migration chain is exercised with a fake v0 fixture.

### Component tests (Vitest with React Testing Library)

- The readout shows correct values for a given state.
- Editor actions (add, remove, reorder, ink) update the working copy and fork a preset into "(modified)".
- Flip keeps slide offset and cursor position.

### End to end (Playwright, Chromium desktop and emulated mobile WebKit)

1. The app loads, the default rule renders, and the readout shows D at 1.
2. Drag the slide and cursor; the readout shows the expected product.
3. Open a share URL and confirm the rule and state are restored exactly.
4. The loupe appears while dragging, and pinning keeps it visible.
5. Works offline after the first load.

### Continuous integration

A GitHub Actions workflow on each push runs Biome check, type check, Vitest and Playwright, then deploys to GitHub Pages from main.

## Out of scope for v1

- Visual regression tests on rendered SVG (revisit once the look settles).
- Tutorials and guided exercises.
- Snapping to graduations.
- Skeuomorphic skins.
- Capacitor or native app store builds.
- JSON file export and import.
- Additional cursor hairlines (for example for circle areas or kW and HP conversion).
- Circular, cylindrical and non slide rule instruments (the architecture accommodates them).
