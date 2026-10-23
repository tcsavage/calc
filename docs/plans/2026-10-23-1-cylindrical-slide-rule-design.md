# Cylindrical Slide Rule: Design

Date: 2026-10-23
Status: Proposed. Decided without user review, under the session goal "cylindrical slide rules designed and implemented". Every decision below is open to change.

## Goal

Add cylindrical slide rules as a third instrument. A cylindrical rule winds a very long scale into a helix round a cylinder, giving many times the precision of a straight rule of the same size. Users pick from presets of different lengths and edit their scales as on the other rules.

## Decisions

| Topic | Decision |
| --- | --- |
| Model | A straight rule's face (upper stator, slide, lower stator) wound onto a helix of N turns. The slide runs along its own helical track beside the stator scales, and the cursor is a short hairline across the face at one point of the helix. |
| Honesty about the model | This is a simplification. On an Otis King the C and D helices sit on separate cylinders and are read through two pointers set apart along the axis; a Fuller has a single helix and two pointer arms. This model reads like an Otis King whose two pointers have no gap between them. Two pointer mechanics may come later as separate rule types. |
| Orientation | The cylinder's axis is vertical. Each turn reads left to right across the front like a line of text, continues round the back and comes back on the left one turn lower. |
| View | The cylinder always turns so the cursor faces you, and the view follows the cursor up and down the helix. No rotate view toggle. Vertical drags and the mouse wheel pan to see other turns; Fit recentres on the cursor. |
| Geometry | One turn is one standard scale length (circumference 1000 drawing units, radius about 159). The helix pitch is the face height, so turns sit directly above one another. The tick length factor is the number of turns. |
| Projection | Points are drawn where they appear on the cylinder: x is the radius times the sine of the angle from the cursor, so ticks crowd together towards the edges; labels are squeezed by the cosine of the same angle. Only the front half is drawn. |
| Faces | One face. The back face stays in the data, always empty, so storage and sharing stay uniform. Flip is hidden and the editor shows no face tabs. |
| Turns | Stored on each rule as a whole number from 2 to 40, and carried in share links. Presets set it; there is no turns editor. |
| Positions | As on a straight rule: the slide offset is clamped to plus or minus one scale length and the cursor to just beyond the ends. Scales beyond the hairline read "out of range". |
| Keyboard | Arrow keys move the slide or cursor by the same arc length as on the straight rule, so the step is the straight rule's step divided by the number of turns. Shift is ten times finer. |
| Readout | 4 plus the whole part of log10(turns) significant figures, so 10 turns and more read to 5 figures. |
| Interaction | A horizontal drag on the slide strip moves the slide along the helix with the finger. A horizontal drag anywhere else turns the whole rule under the fixed hairline. The angle comes from asin(x / radius), so the surface stays under the finger. Pinch and the zoom buttons zoom about the cursor. Loupe as on the other rules, including the 4 to 1 fine drag in the pinned loupe. |
| Scale names | Printed in the margin to the left of the cylinder, beside each visible turn. |
| Presets | Short helix (5 turns): slide C, lower stator D. Scientific helix (10 turns): upper K and A, slide B, CI and C, lower D and L. Long helix (25 turns): slide C, lower D. Each has its own skin. |
| App structure | A separate "Cylindrical slide rule" instrument on the shared slide rule kit, route #/cylindrical-slide-rule, with its own storage keys and share links. |

## Architecture

The same layers as the linear and circular rules.

- Core (src/core/slide-rule): the "cylindrical" rule kind with the linear sections plus turns; schema; helix geometry (projection, helix coordinates, visible range, drag angle); readout digits; presets.
- Kit (src/instruments/slide-rule-kit): small options so a rule can hide Flip and limit the editor to one face.
- Instrument (src/instruments/cylindrical-slide-rule): the helix drawing, viewport, page, config and registry entry.

## Components

- Helix geometry: RADIUS = 1000 / (2 pi). For a scale position p on a band with slide offset o, the helix coordinate is s = (p + o) times turns. Relative to the cursor's helix coordinate c, the angle is (s minus c) wrapped into minus half to half a turn; the point is visible when that angle is within a quarter turn; x = RADIUS times sin(angle); y = s times pitch plus the band's offset within the face. The vertical position uses the unwrapped s, so neighbouring turns sit one pitch apart.
- Visible range: ticks are generated once per scale and length; each frame picks the ticks whose helix coordinate lies within the turns on screen by binary search on the sorted positions, then culls by angle.
- HelixRuleSvg: the cylinder body with shading towards the edges; for each band, one tick path per tick size and the visible labels; the slide strip drawn as a curved band where the slide currently is (data-part slide, so grabbing it moves the slide); scale names in the left margin; the cursor glass and hairline at the front.
- HelixViewport: zoom, pan and fit about the cursor; drags as above, starting from the pointer down position; floating and pinned loupe centred on the hairline.
- Page: the kit toolbar without Flip; readout; editor without face tabs.

## Data flow and error handling

As for the other slide rules, through the kit: share link, then stored session, then the Short helix preset. Unknown scales are dropped with a notice; a link of another kind is refused with its own notice; positions are clamped on load; turns outside 2 to 40 make the rule invalid.

## Testing

- Core: projection (the cursor's own point is at x 0; a quarter turn ahead is at the right edge; a whole turn ahead has the same x and is one pitch lower; points more than a quarter turn away are hidden); visible range; drag angle clamping; codec round trip of cylindrical rules including turns; readout digits; presets fit and use known scales; tick counts per scale at the longest preset stay below a cap.
- Kit: hidden Flip and single face editor.
- Component: the page opens on Short helix with the readout at the index; arrow keys move by the scaled step; the editor shows no face tabs.
- End to end on desktop Chromium and emulated iPhone: opens; multiplication by keys within 1 percent; a horizontal drag turns the rule; the long preset shows 5 figure readings; a shared link restores the rule; a cylindrical link opened from the linear page; the setting survives a reload; the 4 to 1 fine drag in the pinned loupe.

## Out of scope

- Two pointer mechanics (Otis King with separate cylinders, Fuller with pointer arms).
- A turns editor.
- Rotating the cylinder independently of the cursor.
