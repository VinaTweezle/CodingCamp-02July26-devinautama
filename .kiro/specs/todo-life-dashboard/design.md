# Design Document: To-do List Life Dashboard

## Overview

The To-do List Life Dashboard is a client-side single-page application (SPA) delivered as three static files: `index.html`, `css/style.css`, and `js/app.js`. There is no build step, no bundler, no server, and no external dependencies. All state is managed in memory during a session and persisted to `localStorage` so the user's data survives page reloads.

The app is organized into four visual modules:

- **Greeting/Clock** — displays a live clock, date, time-based greeting, and personalized user name.
- **Focus Timer** — a configurable Pomodoro-style countdown timer with start/stop/reset controls.
- **To-do List** — a task manager supporting add, edit, complete, delete, and drag-and-drop reorder.
- **Quick Links** — a panel of user-saved shortcut buttons that open URLs in new tabs.

A fifth cross-cutting concern — **Theme** — provides light/dark mode switching, persisted per session.

### Design Goals

- Zero external dependencies; every byte is authored code.
- Predictable, deterministic module boundaries that make the single JS file maintainable.
- All localStorage I/O is centralized in one storage layer so failure handling is consistent.
- Correctness properties are designed first so the testing strategy is tightly coupled to requirements.

---

## Architecture

The entire application lives in `js/app.js`. It is structured as a collection of module objects (plain JS objects with methods), each owning its own state and DOM interactions. A top-level `init()` function, called on `DOMContentLoaded`, bootstraps all modules in dependency order.

```
┌─────────────────────────────────────────────────────────┐
│                        index.html                       │
│  ┌──────────────┐  ┌────────────┐  ┌────────────────┐  │
│  │  #greeting   │  │  #timer    │  │  #todo         │  │
│  └──────────────┘  └────────────┘  └────────────────┘  │
│  ┌──────────────┐  ┌────────────────────────────────┐  │
│  │ #quick-links │  │  #theme-toggle                 │  │
│  └──────────────┘  └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
           │  DOMContentLoaded
           ▼
┌─────────────────────────────────────────────────────────┐
│                       js/app.js                         │
│                                                         │
│  ┌──────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │ GreetingMod  │  │ TimerModule │  │  TodoModule   │  │
│  └──────────────┘  └─────────────┘  └───────────────┘  │
│  ┌──────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │ LinksModule  │  │ ThemeModule │  │ StorageService│  │
│  └──────────────┘  └─────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Module Interaction Pattern

Modules do not communicate directly with each other. Each module reads its own slice of `localStorage` on init and writes to it on every mutation. The `StorageService` is a thin wrapper around `localStorage` that serializes/deserializes JSON and absorbs write errors, returning a structured result so callers can surface inline errors.

### Initialization Order

1. `ThemeModule.init()` — applies stored theme before paint to avoid flash.
2. `GreetingModule.init()` — starts the 1-second clock tick, restores user name.
3. `TimerModule.init()` — restores saved duration, renders initial display.
4. `TodoModule.init()` — loads tasks from storage, renders list.
5. `LinksModule.init()` — loads links from storage, renders buttons.

---

## Components and Interfaces

### StorageService

Central I/O layer. All other modules use this; direct `localStorage` calls elsewhere are forbidden.

```js
StorageService = {
  // Returns parsed value or null on missing/invalid JSON.
  get(key: string): any | null,

  // Returns { ok: true } or { ok: false, error: string }.
  set(key: string, value: any): { ok: boolean, error?: string },

  KEYS: {
    USER_NAME:    'dashboard_userName',
    TIMER_DURATION: 'dashboard_timerDuration',
    TASKS:        'dashboard_tasks',
    LINKS:        'dashboard_links',
    THEME:        'dashboard_theme',
  }
}
```

### ThemeModule

```js
ThemeModule = {
  // Reads stored theme (defaults 'light'), applies data-theme attribute to <html>.
  init(): void,
  // Toggles between 'light' and 'dark', persists.
  toggle(): void,
  // Returns current active theme string.
  getCurrent(): 'light' | 'dark',
  // Applies theme string to DOM; called by init() and toggle().
  _apply(theme: string): void,
}
```

DOM interaction: sets `document.documentElement.dataset.theme = theme`. The CSS file uses `[data-theme="dark"]` selectors to override variables.

### GreetingModule

```js
GreetingModule = {
  init(): void,           // restores name, starts clock interval
  _tick(): void,          // called every 1000ms; updates time/date/greeting DOM
  _formatTime(date: Date): string,   // → "HH:MM:SS"
  _formatDate(date: Date): string,   // → "DayName, MonthName D, YYYY"
  _getGreeting(hour: number): string, // → "Good Morning" | "Good Afternoon" | "Good Evening" | "Good Night"
  _buildGreetingText(greeting: string, name: string|null): string, // → "Good Morning, Alex!" or "Good Morning!"
  saveName(name: string): void,       // validates, persists, updates display
  _showNameWarning(msg: string): void,
}
```

### TimerModule

```js
TimerModule = {
  init(): void,
  start(): void,
  stop(): void,
  reset(): void,
  saveDuration(minutes: number): void, // validates 1-120, persists, updates display if not running
  _tick(): void,                        // called each second by setInterval
  _formatDisplay(seconds: number): string, // → "MM:SS"
  _updateControls(): void,              // enables/disables Start/Stop/Input based on state
  _onComplete(): void,                  // plays sound, shows alert, re-enables controls

  // internal state
  _remaining: number,   // seconds left
  _running: boolean,
  _intervalId: number | null,
  _duration: number,    // seconds (= minutes * 60)
}
```

### TodoModule

```js
TodoModule = {
  init(): void,
  addTask(text: string): void,
  deleteTask(id: string): void,
  toggleComplete(id: string): void,
  beginEdit(id: string): void,
  confirmEdit(id: string, newText: string): void,
  cancelEdit(id: string): void,
  reorder(fromIndex: number, toIndex: number): void,
  _persist(): void,     // serializes tasks array → StorageService.set
  _render(): void,      // rebuilds task list DOM from tasks array
  _renderTask(task: Task): HTMLElement,
  _updateCount(): void, // updates incomplete-count display
  _validateText(text: string): { valid: boolean, error?: string },
  _tasks: Task[],       // in-memory source of truth
}
```

### LinksModule

```js
LinksModule = {
  init(): void,
  addLink(label: string, url: string): void,
  deleteLink(id: string): void,
  _persist(): void,
  _render(): void,
  _renderLink(link: Link): HTMLElement,
  _validateInputs(label: string, url: string): { valid: boolean, error?: string },
  _links: Link[],
}
```

---

## Data Models

All data is persisted as JSON strings in `localStorage`. The in-memory representations are plain JS objects.

### Task

```js
{
  id:       string,   // crypto.randomUUID() or Date.now().toString() fallback
  text:     string,   // 1–500 characters, not whitespace-only
  complete: boolean,  // false = incomplete, true = complete
  order:    number,   // integer index used to reconstruct sort order on load
}
```

`localStorage` key: `dashboard_tasks`  
Stored as: `JSON.stringify(Task[])`

### Link

```js
{
  id:    string,  // crypto.randomUUID() or Date.now().toString() fallback
  label: string,  // 1–50 characters
  url:   string,  // http:// or https:// scheme, non-empty host, ≤2048 chars
}
```

`localStorage` key: `dashboard_links`  
Stored as: `JSON.stringify(Link[])`

### User Preferences (individual keys)

| Key                       | Type     | Default | Constraint          |
|---------------------------|----------|---------|---------------------|
| `dashboard_userName`      | `string` | `""`    | ≤ 50 chars          |
| `dashboard_timerDuration` | `number` | `25`    | integer, 1–120      |
| `dashboard_theme`         | `string` | `light` | `"light"` or `"dark"` |

### Validation Rules (shared logic)

```js
// Task text
function validateTaskText(text) {
  if (!text || text.trim().length === 0) return { valid: false, error: 'Task cannot be empty.' };
  if (text.length > 500) return { valid: false, error: 'Task must be 500 characters or fewer.' };
  return { valid: true };
}

// User name
function validateUserName(name) {
  if (!name || name.trim().length === 0) return { valid: false, error: 'Name cannot be empty.' };
  if (name.length > 50) return { valid: false, error: 'Name must be 50 characters or fewer.' };
  return { valid: true };
}

// Pomodoro duration
function validateDuration(value) {
  const n = parseInt(value, 10);
  if (isNaN(n) || n < 1 || n > 120) return { valid: false, error: 'Duration must be an integer between 1 and 120.' };
  return { valid: true };
}

// URL
function validateLinkUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return { valid: false, error: 'URL must use http or https.' };
    if (!u.hostname) return { valid: false, error: 'URL must have a valid host.' };
  } catch {
    return { valid: false, error: 'URL is not valid.' };
  }
  if (url.length > 2048) return { valid: false, error: 'URL must be 2048 characters or fewer.' };
  return { valid: true };
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The following properties are derived from the prework analysis of all acceptance criteria. Properties suitable for property-based testing (PBT) are universal statements over generated inputs. Properties derived from structural or infrastructure criteria are tested as examples or smoke tests and noted accordingly.

---

### Property 1: Time formatting always produces a valid HH:MM:SS string

*For any* `Date` object, `_formatTime(date)` SHALL return a string matching the regular expression `/^\d{2}:\d{2}:\d{2}$/` where hours are in `[00, 23]`, minutes in `[00, 59]`, and seconds in `[00, 59]`.

**Validates: Requirements 1.1**

---

### Property 2: Date formatting always produces a valid human-readable date string

*For any* `Date` object, `_formatDate(date)` SHALL return a string matching `"DayName, MonthName D, YYYY"` — specifically matching `/^[A-Za-z]+, [A-Za-z]+ \d{1,2}, \d{4}$/` with a valid day name, month name, day-of-month, and four-digit year.

**Validates: Requirements 1.2**

---

### Property 3: Greeting classification is exhaustive and correct for all 24 hours

*For any* integer hour `h` in `[0, 23]`, `_getGreeting(h)` SHALL return exactly one of: `"Good Morning"` when `h` is in `[5, 11]`, `"Good Afternoon"` when `h` is in `[12, 17]`, `"Good Evening"` when `h` is in `[18, 21]`, or `"Good Night"` when `h` is in `{22, 23, 0, 1, 2, 3, 4}`. No hour shall produce any other string or cause an error.

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

---

### Property 4: Greeting text format is consistent for all valid name/hour combinations

*For any* hour `h` in `[0, 23]` and valid name `n` (non-empty, non-whitespace-only, ≤ 50 chars), `_buildGreetingText(_getGreeting(h), n)` SHALL return `"[greeting], [n]!"`. When name is `null`, empty, or whitespace-only, it SHALL return `"[greeting]!"` — never including the name.

**Validates: Requirements 2.2, 2.3**

---

### Property 5: User name storage round-trip

*For any* valid user name string `n` (non-empty, non-whitespace-only, ≤ 50 chars), after `saveName(n)`, reading `StorageService.get(KEYS.USER_NAME)` SHALL return the same string `n`.

**Validates: Requirements 2.4**

---

### Property 6: Timer display formatting is valid for all possible remaining-second values

*For any* integer `s` in `[0, 7200]` (0 to 120 minutes in seconds), `_formatDisplay(s)` SHALL return a string matching `/^\d{2}:\d{2}$/` where minutes are in `[00, 120]` and seconds are in `[00, 59]`.

**Validates: Requirements 3.1**

---

### Property 7: Timer reset always restores the full configured duration

*For any* valid duration `d` in `[1, 120]` minutes and any elapsed time `e` in `[0, d*60]` seconds, after calling `reset()`, the timer's remaining value SHALL equal `d * 60` and `_running` SHALL be `false`.

**Validates: Requirements 3.2, 3.5**

---

### Property 8: Timer control state invariant — running state

*For any* timer state where `_running === true`, the Start control SHALL be disabled (`disabled === true`) and the duration input SHALL be disabled. *For any* timer state where `_running === false`, the Stop control SHALL be disabled.

**Validates: Requirements 3.7, 3.8, 4.5**

---

### Property 9: Duration validation accepts exactly the valid range

*For any* value `x`, `validateDuration(x)` SHALL return `{ valid: true }` if and only if `x` is an integer and `1 ≤ x ≤ 120`. For all other values (non-integers, floats, strings, values outside [1,120], `NaN`, `null`), it SHALL return `{ valid: false }` with a non-empty error message.

**Validates: Requirements 4.1, 4.6**

---

### Property 10: Duration storage round-trip

*For any* valid duration `d` in `[1, 120]`, after `saveDuration(d)`, reading `StorageService.get(KEYS.TIMER_DURATION)` SHALL return `d`. When timer is not running, the displayed countdown SHALL equal `_formatDisplay(d * 60)`.

**Validates: Requirements 4.2, 4.3**

---

### Property 11: Invalid stored duration falls back to 25

*For any* stored value `v` that is not an integer in `[1, 120]` (including `null`, `""`, `"abc"`, `0`, `121`, `3.7`), loading the duration via `TimerModule.init()` SHALL use `25` as the effective duration.

**Validates: Requirements 4.4**

---

### Property 12: Valid task addition is always reflected in the list

*For any* task list of length `n` and any valid task text `t` (non-empty, non-whitespace-only, ≤ 500 chars), after `addTask(t)`, the task list SHALL have length `n + 1` and the last element SHALL have `text === t` and `complete === false`. The input field SHALL be cleared.

**Validates: Requirements 5.2**

---

### Property 13: Invalid task text is always rejected without modifying the list

*For any* task list of length `n` and any invalid task text `t` (empty string, whitespace-only string, or string with length > 500), after attempting `addTask(t)`, the task list SHALL still have length `n` (unchanged) and a non-empty validation error message SHALL be present in the DOM.

**Validates: Requirements 5.3**

---

### Property 14: Task rendering always includes all required controls

*For any* `Task` object with any combination of `text`, `complete`, and `id` values, `_renderTask(task)` SHALL produce a DOM element that contains: the task text, a completion toggle control, an edit control, and a delete control. No task should render without all four elements.

**Validates: Requirements 5.4**

---

### Property 15: Incomplete task count always matches the actual data

*For any* array of tasks with any combination of `complete` states, the count displayed in the DOM by `_updateCount()` SHALL equal `tasks.filter(t => !t.complete).length`. When that count is 0, the display SHALL read `"0 incomplete tasks"`.

**Validates: Requirements 5.5**

---

### Property 16: Completion toggle is its own inverse

*For any* task with any completion state `s`, toggling once via `toggleComplete(id)` SHALL produce the opposite state `!s`. Toggling twice SHALL restore the original state `s` (round-trip idempotence).

**Validates: Requirements 6.1**

---

### Property 17: Completed tasks are always rendered with strikethrough

*For any* task where `complete === true`, the rendered task element's text node SHALL have `text-decoration: line-through` (or the class that applies it). *For any* task where `complete === false`, the strikethrough style SHALL not be applied.

**Validates: Requirements 6.2**

---

### Property 18: Valid edit always updates task text

*For any* task and any valid new text `t` (non-empty, non-whitespace-only, ≤ 500 chars), after `confirmEdit(id, t)`, the task with that `id` SHALL have `text === t` and the DOM SHALL display the updated text in read-only mode.

**Validates: Requirements 6.4**

---

### Property 19: Invalid edit text always discards without modification

*For any* task with original text `orig` and any invalid edit text `t` (empty or whitespace-only), after `confirmEdit(id, t)`, the task with that `id` SHALL still have `text === orig` — unchanged.

**Validates: Requirements 6.5**

---

### Property 20: Task deletion always removes exactly one task

*For any* task list of length `n` containing a task with `id = x`, after `deleteTask(x)`, the list SHALL have length `n - 1` and SHALL contain no task with `id === x`.

**Validates: Requirements 6.7**

---

### Property 21: Reorder moves dragged item to the correct position

*For any* task list of length `n ≥ 2`, any valid source index `from` in `[0, n-1]`, and any valid destination index `to` in `[0, n-1]` where `from ≠ to`, after `reorder(from, to)`, the item originally at index `from` SHALL be at index `to` in the reordered list, and all other items SHALL remain in their relative order.

**Validates: Requirements 7.2**

---

### Property 22: Task persistence round-trip

*For any* array of tasks (after any add, edit, toggle, delete, or reorder operation), calling `_persist()` followed by a simulated `init()` (which calls `StorageService.get(KEYS.TASKS)` and parses the result) SHALL produce an array equal to the original array in all fields (`id`, `text`, `complete`, `order`) for every task.

**Validates: Requirements 8.1, 8.2**

---

### Property 23: Corrupt or missing task storage always yields an empty list

*For any* value stored at `KEYS.TASKS` that is `null`, not valid JSON, or not a valid array of `Task` objects (e.g., missing required fields), `TodoModule.init()` SHALL produce an empty task list `[]` and log a console warning.

**Validates: Requirements 8.3**

---

### Property 24: Valid link addition always appears in list and storage

*For any* valid `(label, url)` pair — where label is non-empty and ≤ 50 chars, and URL uses `http://` or `https://` with a non-empty host and is ≤ 2048 chars — after `addLink(label, url)`, the links array SHALL contain an entry with matching label and url, and `StorageService.get(KEYS.LINKS)` SHALL reflect the updated array.

**Validates: Requirements 9.2, 10.1**

---

### Property 25: Invalid link inputs are always rejected with a specific error

*For any* `(label, url)` pair where label is empty, exceeds 50 chars, OR where the URL does not have an `http`/`https` scheme, has an empty host, or exceeds 2048 chars, `_validateInputs(label, url)` SHALL return `{ valid: false }` with a non-empty, specific error message identifying which field is invalid.

**Validates: Requirements 9.4**

---

### Property 26: Link deletion always removes exactly one link

*For any* links array of length `n` containing a link with `id = x`, after `deleteLink(x)`, the array SHALL have length `n - 1` and no link with `id === x` SHALL remain.

**Validates: Requirements 9.6, 10.1**

---

### Property 27: Link persistence round-trip

*For any* array of links, calling `_persist()` followed by `StorageService.get(KEYS.LINKS)` parsed as JSON SHALL yield an array equal to the original in all fields (`id`, `label`, `url`).

**Validates: Requirements 10.2**

---

### Property 28: Corrupt or missing link storage always yields an empty list

*For any* value stored at `KEYS.LINKS` that is `null`, not valid JSON, or contains entries missing `label` or `url` fields, `LinksModule.init()` SHALL produce an empty links array `[]` and log a console warning.

**Validates: Requirements 10.3**

---

### Property 29: Theme persistence round-trip

*For any* theme value `t` in `{ 'light', 'dark' }`, after `ThemeModule._apply(t)` and `StorageService.set(KEYS.THEME, t)`, reading `StorageService.get(KEYS.THEME)` SHALL return `t`, and `document.documentElement.dataset.theme` SHALL equal `t`.

**Validates: Requirements 11.3, 11.4**

---

### Property 30: Missing stored theme defaults to 'light'

*For any* state where `StorageService.get(KEYS.THEME)` returns `null` or an unrecognized string, `ThemeModule.init()` SHALL apply `'light'` as the theme — never `'dark'` or any other value.

**Validates: Requirements 11.5**

---

## Error Handling

### localStorage Failures

All `localStorage` reads and writes go through `StorageService`. On `set()`:
- If `localStorage.setItem` throws (e.g., `QuotaExceededError`, `SecurityError`), `StorageService.set()` catches the error and returns `{ ok: false, error: <message> }`.
- The calling module checks the return value and, if `ok === false`, surfaces an inline error message in the relevant module's UI. No error is silently swallowed.

On `get()`:
- If `localStorage.getItem` throws or returns `null`, `StorageService.get()` returns `null`.
- Callers treat `null` as "no saved data" and fall back to defaults.
- If the stored value fails `JSON.parse`, `StorageService.get()` logs a `console.warn` and returns `null`.

**Specific module behaviors on storage failure:**

| Module | Write failure behavior |
|---|---|
| GreetingModule (user name) | Displays name for session; shows inline warning: *"Your name could not be saved."* |
| TimerModule (duration) | Shows inline error; does not update stored value. |
| TodoModule | Shows inline error above task list: *"Tasks could not be saved."* |
| LinksModule | Shows inline error above link panel: *"Links could not be saved."* |
| ThemeModule | Applies theme to DOM for session; no user-visible error (theme is cosmetic). |

### Input Validation Errors

Validation errors are surfaced as inline messages adjacent to the relevant input element. They are cleared when the user modifies the input field. Errors are never shown as browser `alert()` dialogs (the only `alert()` in the app is the Focus Timer completion signal, as required).

### Drag-and-Drop Cancellation

If the `drop` event fires outside a valid task-list target (detected by checking `event.target` ancestry), the drag is cancelled: `reorder()` is not called, the in-memory `_tasks` array is not modified, and the insertion line element is hidden.

### Audio Playback Failure

The Focus Timer completion signal uses the Web Audio API (`AudioContext` + `OscillatorNode`) rather than an `<audio>` element to avoid asset dependencies. If `AudioContext` is unavailable or blocked by the browser, the failure is caught silently — the timer still stops and shows the alert dialog.

---

## Testing Strategy

### Overview

The testing approach uses two complementary layers:

1. **Property-based tests** — validate universal properties (listed in the Correctness Properties section) across hundreds of randomly generated inputs. These catch edge cases and boundary conditions that example-based tests miss.
2. **Example-based unit tests** — validate specific scenarios, UI state transitions, and infrastructure behaviors (localStorage failures, timer events) that are not suited to property testing.

### Property-Based Testing Library

**[fast-check](https://github.com/dubzzz/fast-check)** (JavaScript/TypeScript) is used for all property-based tests. It runs in Node.js without a browser and integrates with any test runner. Each property test is configured to run a minimum of **100 iterations**.

### Test Runner

**[Vitest](https://vitest.dev/)** is the test runner. It supports ES modules natively (no build config needed for vanilla JS modules), has a JSDOM environment for DOM tests, and runs fast.

### Test File Organization

All tests live in a single `tests/` directory at the project root (outside `js/`, `css/`, `index.html` — no test files pollute the deliverable):

```
tests/
  greeting.test.js     — GreetingModule (Properties 1–5)
  timer.test.js        — TimerModule (Properties 6–11)
  todo.test.js         — TodoModule (Properties 12–23)
  links.test.js        — LinksModule (Properties 24–28)
  theme.test.js        — ThemeModule (Properties 29–30)
  storage.test.js      — StorageService (unit tests)
  integration.test.js  — localStorage failure paths, full init cycle
```

### Property Test Configuration

Each property test is tagged with a comment referencing its design property:

```js
// Feature: todo-life-dashboard, Property 3: Greeting classification is exhaustive and correct for all 24 hours
test.prop([fc.integer({ min: 0, max: 23 })])((hour) => {
  const result = getGreeting(hour);
  if (hour >= 5  && hour <= 11) return result === 'Good Morning';
  if (hour >= 12 && hour <= 17) return result === 'Good Afternoon';
  if (hour >= 18 && hour <= 21) return result === 'Good Evening';
  return result === 'Good Night'; // [22,23,0,1,2,3,4]
}, { numRuns: 100 });
```

### Unit / Example Tests

Unit tests cover:
- Timer start/stop/complete state transitions (fake timers via `vi.useFakeTimers()`).
- Edit mode: activate, press Enter, press Escape, confirm with whitespace.
- Drag-and-drop: valid drop, out-of-bounds drop, insertion line appearance.
- localStorage write failure: mock `localStorage.setItem` to throw, verify inline error messages for each module.
- Theme toggle applies within 100ms (verified by measuring `performance.now()` delta in JSDOM).
- File structure smoke test: verify `index.html` contains `<link href="css/style.css">` and `<script src="js/app.js">`.

### Coverage Goals

- All 30 correctness properties have a corresponding property-based test.
- All acceptance criteria classified as EXAMPLE or INTEGRATION have at least one example-based test.
- All EDGE_CASE criteria are covered by the property generators (generators produce boundary values naturally; no separate edge-case tests needed).
- SMOKE criteria (file structure, browser compatibility) are verified manually and by a single structural test.

### Accessibility Note

Full WCAG 2.1 AA compliance requires manual testing with assistive technologies (screen readers, keyboard-only navigation). Automated tests verify that interactive controls have `aria-label` attributes and that the theme toggle button has a `role="switch"` and `aria-checked` attribute that reflects the current theme — but complete accessibility validation is beyond automated testing scope.
