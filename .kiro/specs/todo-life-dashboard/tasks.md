# Implementation Plan: To-do List Life Dashboard

## Overview

Build a zero-dependency, zero-backend SPA using a single `index.html`, `css/style.css`, and `js/app.js`. All state is persisted via `localStorage`. The implementation is broken into modules: `App.Storage`, `App.Theme`, `App.Greeting`, `App.Timer`, `App.TodoList`, and `App.QuickLinks`. Tasks are ordered so each step integrates cleanly into the previous one with no orphaned code.

---

## Tasks

- [x] 1. Scaffold project structure and App.Storage module
  - [x] 1.1 Create `index.html`, `css/style.css`, and `js/app.js` at the correct paths
    - `index.html` at project root with a `<link>` to `css/style.css` in `<head>` and `<script src="js/app.js">` before `</body>`
    - No inline `<style>` or `<script>` blocks in `index.html`
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  - [x] 1.2 Implement `App.Storage` utility in `js/app.js`
    - Expose `App.Storage.get(key)` and `App.Storage.set(key, value)` wrappers around `localStorage`
    - `set` must catch quota/access errors and return `{ ok: false, error }` so callers can show inline warnings
    - `get` returns parsed JSON or `null` on missing/parse failure, logging a `console.warn` on parse errors
    - _Requirements: 2.6, 8.3, 10.3, 10.4_

- [x] 2. Implement App.Theme module
  - [x] 2.1 Add theme toggle control to `index.html` and implement `App.Theme` in `js/app.js`
    - Toggle button must visually reflect the active theme at all times
    - On activation: apply theme class to `<body>` within 100 ms, no page reload
    - Persist selected theme via `App.Storage.set`; on page load read stored theme and apply before any content renders
    - Fall back to `light` if no stored value (ignore OS preference)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  - [x] 2.2 Add `light`/`dark` CSS custom-property blocks to `css/style.css`
    - Define colour tokens for both themes; all module styles reference these tokens
    - _Requirements: 11.1, 11.2_

- [x] 3. Implement App.Greeting module
  - [x] 3.1 Add greeting section markup to `index.html` and implement `App.Greeting` in `js/app.js`
    - Display time in `HH:MM:SS` (24-hour), updated every second via `setInterval`
    - Display date in `"DayName, MonthName D, YYYY"` format
    - Derive greeting from local hour: 5–11 → "Good Morning", 12–17 → "Good Afternoon", 18–21 → "Good Evening", 22–23/0–4 → "Good Night"
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [x] 3.2 Implement User_Name input and persistence in `App.Greeting`
    - Input field + submit control; validate: non-empty, non-whitespace, ≤ 50 chars
    - On valid submit: display "[Greeting], [User_Name]!"; persist via `App.Storage.set`
    - On missing/empty storage entry: display greeting without name suffix
    - If `App.Storage.set` returns `{ ok: false }`: keep name in session, show inline warning
    - On page load: restore name from `App.Storage.get`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 4. Checkpoint — verify greeting and theme
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement App.Timer module
  - [x] 5.1 Add timer section markup to `index.html` and implement `App.Timer` in `js/app.js`
    - Display countdown in `MM:SS`; initialise to stored or default (25 min) Pomodoro_Duration
    - Start: begin countdown, disable Start button; Stop: pause, disable Stop button; Reset: stop and restore full duration
    - On reaching `00:00`: stop automatically, play audible signal (`AudioContext` beep or `Audio` API), show `alert()`, then re-enable Start and Reset
    - Disable Stop when not running; disable Start when running
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_
  - [x] 5.2 Implement Pomodoro_Duration configuration in `App.Timer`
    - Numeric input: integers 1–120 only; save control persists via `App.Storage.set`
    - On valid save when timer not running: update display within 500 ms
    - Disable duration input while timer is running
    - On invalid input (non-integer or out-of-range): reject and show inline validation message identifying the violated constraint
    - On load: read from `App.Storage`; if out-of-range or invalid fall back to 25
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 6. Implement App.TodoList module — add, display, and persist
  - [x] 6.1 Add todo section markup to `index.html` and implement add/render logic in `App.TodoList`
    - Text input + submit control; validate: non-empty, non-whitespace, ≤ 500 chars; clear input on success
    - On invalid input: show inline validation message; clear message on next input modification
    - Render each task with: text, completion toggle, edit control, delete control
    - Display incomplete task count; show "0 incomplete tasks" when count is zero
    - On load: read from `App.Storage`; on missing/invalid JSON/non-array: init empty list, log `console.warn`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.2, 8.3_
  - [x] 6.2 Implement complete and edit task logic in `App.TodoList`
    - Toggle completion: flip state, apply strikethrough style while complete
    - Edit: replace text with inline input pre-filled with current text; disable toggle and delete controls during edit
    - Confirm edit (Enter or save control): if non-empty/non-whitespace → update text and restore read-only; if empty/whitespace → discard and restore original
    - Escape while editing: discard and restore original
    - Delete: permanently remove task from list
    - After every mutation: persist full task array (text, completion state, order index) via `App.Storage.set` synchronously
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 8.1_


- [x] 7. Implement App.TodoList — drag-and-drop reordering
  - [x] 7.1 Implement drag-and-drop reorder logic in `App.TodoList`
    - Use native HTML5 Drag and Drop API (`draggable`, `dragstart`, `dragover`, `drop`, `dragend`)
    - Show visible insertion line at current drop target during drag; remove it on drop or cancel
    - On valid drop: update visual order immediately and persist new order via `App.Storage.set`
    - On drop outside valid list area: cancel operation and restore original order
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 8. Checkpoint — verify todo list features end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement App.QuickLinks module
  - [x] 9.1 Add quick links section markup to `index.html` and implement `App.QuickLinks` in `js/app.js`
    - Label input (≤ 50 chars) + URL input (≤ 2048 chars) + submit control
    - Validate: non-empty label within length; URL must have `http://` or `https://` scheme and non-empty host
    - On valid submit: add link, persist via `App.Storage.set`, render as clickable button opening in new tab
    - On invalid input: show inline validation message identifying the specific invalid field
    - Each link button has a delete control; on delete remove from display and persist updated list
    - On load: read from `App.Storage`; on missing/invalid/entries-missing-label-or-url: init empty list, log `console.warn`
    - If `App.Storage.set` returns `{ ok: false }`: show inline error that change could not be saved
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 10.1, 10.2, 10.3, 10.4_
  

- [x] 10. Polish CSS and cross-module wiring
  - [x] 10.1 Complete `css/style.css` with layout, typography, and component styles for all modules
    - Apply theme tokens from task 2.2 throughout all component styles
    - Strikethrough style for completed tasks; insertion-line style for drag-and-drop indicator
    - All interactive controls visually reflect their disabled state
    - _Requirements: 6.2, 7.4, 11.1, 11.2_
  - [x] 10.2 Wire all modules together in `js/app.js` init sequence
    - On `DOMContentLoaded`: call `App.Theme.init()`, `App.Greeting.init()`, `App.Timer.init()`, `App.TodoList.init()`, `App.QuickLinks.init()` in order
    - Confirm no module relies on another module's internal state (only `App.Storage` is shared)
    - _Requirements: 12.3, 12.5, 13.3, 13.4_

- [x] 11. Final checkpoint — full regression pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- `App.Storage` is the only shared dependency; all other modules are self-contained.
- No build step, no bundler, no external assets — the app must load fully offline.
- All `localStorage` writes must be synchronous and complete before the triggering operation is considered done (requirement 8.1).
- The audible signal on timer completion should use the Web Audio API to avoid needing an external audio file.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["3.1", "5.1"] },
    { "id": 3, "tasks": ["3.2", "5.2", "6.1"] },
    { "id": 4, "tasks": ["6.2", "7.1"] },
    { "id": 5, "tasks": ["6.3", "9.1"] },
    { "id": 6, "tasks": ["9.2", "10.1"] },
    { "id": 7, "tasks": ["10.2"] }
  ]
}
```
