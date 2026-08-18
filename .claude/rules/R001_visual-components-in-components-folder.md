# R001 — Visual components live in the components folder

**Rule:** Every visual/UI component must be created inside the `components/` folder at the project root. Do not define new visual components inline in `room.js`, `room.html`, or anywhere else.

## Scope

A "visual component" is any self-contained piece of UI that renders DOM: a tile, a panel, a button group, a modal, a list row, a badge, a toolbar, etc.

## What this means in practice

- One component per file, named for what it is: `components/MemberRow.js`, `components/VideoTile.js`, `components/DevPanel.js`.
- A component file exports a function that builds and returns a DOM element (or mounts into a given container) and owns its own markup, styling, and event wiring.
- `room.js` orchestrates state and composes components; it must not hand-build component DOM anymore.
- Shared styles a component needs should ship with the component (inline styles or a co-located approach), not be scattered into `room.html`.

## Applies to

- New UI work in this project (the `stream-for-all` extension).
- Refactors: when touching existing inline UI (e.g. the member/approval rows or tiles currently built in `room.js`), extract them into `components/` as part of the change.

## Exceptions

- Top-level page skeleton in `room.html` (the empty containers components mount into) may stay in the HTML.
- Non-visual logic (crypto, WebRTC wiring, storage) stays where it is.
