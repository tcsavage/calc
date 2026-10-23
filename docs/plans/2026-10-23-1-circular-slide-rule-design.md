# Circular Slide Rule: Design

Date: 2026-10-23
Status: Approved

## Goal

Add a circular slide rule as a second instrument alongside the linear slide rule. It simulates a concentric disc rule (a fixed ring of scales around a rotating disc, with a radial cursor), reuses the existing scale library, and shares as much of the linear instrument's non geometric code as possible through a shared slide rule kit.

## Decisions

| Topic | Decision |
| --- | --- |
| Physical model | Concentric discs: fixed outer rings, a rotating inner disc and one radial cursor (Concise or Faber-Castell style). Two armed divider style rules are out of scope. |
| App structure | A separate "Circular slide rule" instrument with its own route, presets, saved rules and share links. Shape independent code moves out of the linear instrument into a shared slide rule kit that both instruments import. |
| Scale length | Every scale is one ring covering exactly one turn. Position 0 to 1 maps to 0 to 360 degrees, clockwise from 12 o'clock. Spiral (multi turn) scales may come later as a separate rule type. |
| Duplex | Supported with the existing front and back face model. Flip keeps the disc rotation and the cursor, so C against D gives the same computation on both faces. |
| Sections | Two per face: outer rings (fixed) and disc rings (rotating). The scales read against each other meet at the disc edge. No inner hub scales. |
| Orientation | A "Rotate view" toggle, on by default and saved with the session, turns the whole drawing so the cursor hairline always points straight up. Zoom, pan and the loupe work as on the linear rule. |
| Dragging in rotate view | Dragging the cursor turns the whole rule under the fixed hairline. Dragging the disc turns the disc relative to the outer rings. |
| Ring size limit | The innermost disc ring may not reach inside a fixed minimum radius (72, with the disc edge at 240), so the disc holds at most 7 rings. A percentage of the rule radius was rejected because the rule radius grows with the outer rings. The editor refuses further disc scales and loading trims excess rings. |
| Tick density | Graduation spacing limits are applied in each ring's own length, so short inner rings get coarser subdivisions instead of crowded ticks. |
| Presets | Basic (simplex), Scientific duplex and Log-log duplex, each with its own colour skin. |

### Preset layouts

Rings are listed from the disc edge outward for outer rings, and from the disc edge inward for disc rings.

Basic, simplex:
- Front outer rings: D, A, K
- Front disc rings: C, CI, B
- Back: empty

Scientific duplex:
- Front outer rings: D, A, K, L
- Front disc rings: C, CI, B
- Back outer rings: D, S, T
- Back disc rings: C, ST

Log-log duplex:
- Front outer rings: D, A, K
- Front disc rings: C, CI, B
- Back outer rings: D, LL1, LL2, LL3
- Back disc rings: C, LL01, LL02, LL03

Basic is the default preset, with the disc at zero and the cursor at the index.

## Approach

Chosen: a shared slide rule kit plus a circular specific renderer. The store, persistence, startup, sharing, notices, rule picker, readout table and editor drawer move out of src/instruments/linear-slide-rule into a kit configured per instrument. Core gains a circular layout and ring geometry. The circular instrument adds only its own drawing, viewport and presets. The linear instrument keeps its behaviour, and its existing tests act as the safety net for the move.

Rejected:
- One renderer for both shapes behind a geometry adapter. Least duplication, but the two viewports differ substantially (panning a long strip versus turning a disc) and the abstraction would leak.
- Copying the linear instrument and adapting it. Fastest to start, but leaves two copies of store, editor and persistence to maintain, which the v1 design ruled out.

## Architecture

Layers stay as in v1: domain in src/core (pure TypeScript, zod only), coordination in each instrument's state folder, adapters and UI outside. The architecture test is extended.

- src/core/slide-rule: gains rule kind, circular sections, circular layout and ring geometry. Scale specs are unchanged.
- src/instruments/slide-rule-kit: new. Shape independent coordination, adapters and UI shared by slide rule instruments. It may import src/core and src/shared, never an instrument.
- src/instruments/linear-slide-rule: keeps its drawing, viewport, presets wiring and entry point, and imports the kit.
- src/instruments/circular-slide-rule: new. Drawing, viewport, presets wiring and entry point. Imports the kit.

Boundary rules: instruments may import the kit but not each other. The kit may not import any instrument. Core rules are unchanged.

## Components

### Core (src/core/slide-rule)

- RuleDefinition gains a kind field, either "linear" or "circular". Face sections depend on kind: linear faces have upper, slide and lower; circular faces have outer and disc. Section lists and labels are derived from kind.
- Codec: the zod schema discriminates on kind. v1 data already carries kind "linear", so old share links, sessions and saved rules parse unchanged with no migration or version bump.
- Circular layout: computeCircularLayout(face) returns the rule radius, the disc edge radius and one ring per placement with its inner and outer radius. Outer rings stack outward from the disc edge and disc rings stack inward. The ring band height matches the linear BAND_HEIGHT so text sizes are consistent.
- Ring geometry: maps a position to an angle (position times 360 degrees, clockwise from 12 o'clock) and back, and a polar point to x and y.
- Tick generation: generateTicks gains a length factor (ring circumference divided by the linear scale length). The minimum tick, small label and large label spacings are divided by it, so each ring gets as much detail as its length allows. Memoisation keys on scale and factor.
- Circular state: the same RuleState shape. slideOffset is the disc rotation in turns and cursor is the cursor angle in turns, both wrapped into the range 0 to 1 by clampState for circular rules. A rotateView boolean is added to the circular session state.
- Readout: reuses computeReadout. For circular rules positions wrap instead of showing "out of range".
- Ring limit: a function that reports whether a face fits within the minimum disc radius, and one that trims a face from the innermost disc ring until it fits, returning the dropped scales.
- Presets: a circular preset list next to the linear one, each preset with a skin.

### Shared kit (src/instruments/slide-rule-kit)

Moved from the linear instrument and parameterised by an instrument config (instrument ID, route, storage keys, presets, default preset, rule kind, section labels and a face limit check):

- State: store, ports, persistence, startup and the memory port for tests.
- Adapters: session storage port, location (share payload in the URL), share (Web Share then clipboard).
- UI: notices, rule picker, readout table, scale editor drawer (sections and labels from the config, add disabled with a note when the limit check fails), skin style.

### Circular instrument (src/instruments/circular-slide-rule)

- CircularRuleSvg: fixed outer annulus, rotating disc group (a filled circle with its rings) and a hub. Ticks are radial lines, one path per tick size per ring, pointing towards the disc edge. Labels are upright relative to the ring, reading outward from the centre. Scale names sit just to the left of the 12 o'clock index on each ring. The cursor is a translucent radial arm from the hub to beyond the outer rings with a red hairline. In rotate view the whole drawing is rotated by minus the cursor angle. Disc and cursor are keyboard sliders as on the linear rule (arrow keys move 1/500 of a turn, Shift with an arrow 1/5000).
- CircularViewport: zoom (pinch and buttons about a point), pan, fit, floating and pinned loupe centred on the hairline, and drag handling:
  - Drag on the disc: turns the disc by the angle swept around the rule centre.
  - Drag on the cursor: turns the cursor (in rotate view, the whole rule under the fixed hairline).
  - Drag elsewhere: pans when zoomed in, otherwise turns the cursor.
  - Angles are measured around the rule centre in drawing coordinates, so turning works when the centre is off screen.
  - Inside the pinned loupe, drags move at a 4 to 1 ratio.
- Page: the shared toolbar (rule picker, Flip, Reset, Readout, Pin loupe, Edit, Share) plus a "Rotate view" toggle. Reset sets the disc to zero and the cursor to the index.
- Registry entry: "Circular slide rule" card on the home page, route #/circular-slide-rule, its own resetStorage.

## Data flow

As in v1, through the kit:

- Startup loads, in order: a share payload in the URL, the last session in localStorage, then the Basic preset with the disc at zero and the cursor at the index. The share payload is removed from the URL after loading.
- Changes autosave after half a second. Saved rules are saved immediately, under separate keys per instrument.
- Share links are #/circular-slide-rule?s=payload and always contain the full rule definition plus disc rotation, cursor, visible face and rotate view.
- A share payload whose kind does not match the route's instrument is rejected with a notice and startup falls through to the next source.

## Error handling

As in v1:

- Invalid or newer version share payloads and broken sessions fall back to the next source with a notice.
- Unknown scales are dropped with a notice.
- Rule state is wrapped (circular) or clamped (linear) on load.
- The error boundary offers "Reset to default rule".
- Unavailable storage leaves the rule working with a notice.

New:

- A circular face that exceeds the ring limit is trimmed from the innermost disc ring on load, with a notice naming the dropped scales.
- A share payload of the wrong kind gets its own notice.

## Testing

### Unit tests (Vitest, src/core)

- Ring geometry: position to angle and back (property test), polar to x and y.
- Circular layout: radii for arbitrary faces (property test: rings do not overlap, outer rings outside the disc edge, disc rings inside).
- Ticks with a length factor: minimum spacing holds in ring length on short rings (property test).
- Readout wrapping for circular rules.
- Codec: kind discrimination, v1 data without kind loads as linear, wrong kind rejected.
- Ring limit check and trimming.
- Circular state wrapping.

### Shared kit

- Existing store, startup and persistence tests move with the code and run against both instrument configs.
- All existing linear tests still pass with only import changes.

### Component tests (Vitest with React Testing Library)

- Disc and cursor keyboard sliders turn by the right steps and wrap past 12 o'clock.
- Drag angle maths, including wrapping.
- Rotate view transform keeps the hairline at the top.
- Editor disables adding when the ring limit is reached.

### End to end (Playwright, Chromium desktop and emulated iPhone WebKit)

- Opens on the Basic preset.
- Turning the disc by drag and by keys multiplies 2 by 3 to give 6.
- Rotate view keeps the hairline at the top while the cursor turns.
- Flip keeps the computation.
- A share link restores the rule and setting.
- The setting survives a reload.

### Architecture test

- Instruments may import the kit but not each other. The kit may not import instruments.

## Out of scope

- Spiral or multi turn scales.
- Two armed divider style circular rules.
- Inner hub scales.
- Cylindrical rules and non slide rule instruments.
