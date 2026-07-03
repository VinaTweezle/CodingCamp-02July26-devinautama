# Requirements Document

## Introduction

The **To-do List Life Dashboard** is a client-side, single-page web application built with plain HTML, CSS, and Vanilla JavaScript. It provides a personal productivity hub accessible in any modern browser, requiring no server, no backend, and no installation. All data persists through the Browser Local Storage API. The dashboard combines four core productivity modules — a real-time greeting clock, a Pomodoro-style Focus Timer, a full-featured To-do List, and a Quick Links panel — with support for light/dark mode and customizable user preferences.

---

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Local_Storage**: The browser's `localStorage` API used to persist all user data client-side.
- **Greeting_Module**: The section of the Dashboard that displays the current time, date, and a time-based greeting.
- **Focus_Timer**: The Pomodoro-style countdown timer module.
- **Todo_List**: The module for managing tasks (add, edit, complete, delete, reorder).
- **Quick_Links**: The module that stores and renders shortcut buttons to user-defined URLs.
- **Task**: A single to-do item containing text, a completion state, and a creation order index.
- **Link**: A user-defined shortcut containing a display label and a URL.
- **Theme**: The visual color scheme of the Dashboard, either `light` or `dark`.
- **User_Name**: An optional custom name entered by the user for personalized greeting display.
- **Pomodoro_Duration**: The configurable countdown interval for the Focus Timer, defaulting to 25 minutes.

---

## Requirements

### Requirement 1: Greeting Module — Time and Date Display

**User Story:** As a user, I want to see the current time and date when I open the Dashboard, so that I can quickly orient myself without switching applications.

#### Acceptance Criteria

1. THE Greeting_Module SHALL display the current local time in 24-hour HH:MM:SS format, and the displayed value SHALL change each second.
2. THE Greeting_Module SHALL display the current local date in the fixed format `"DayName, MonthName D, YYYY"` (e.g., "Wednesday, July 2, 2025").
3. IF the current local hour is between 5 and 11 (inclusive), THEN THE Greeting_Module SHALL display the greeting "Good Morning".
4. IF the current local hour is between 12 and 17 (inclusive), THEN THE Greeting_Module SHALL display the greeting "Good Afternoon".
5. IF the current local hour is between 18 and 21 (inclusive), THEN THE Greeting_Module SHALL display the greeting "Good Evening".
6. IF the current local hour is between 22 and 23 (inclusive) or between 0 and 4 (inclusive), THEN THE Greeting_Module SHALL display the greeting "Good Night".

---

### Requirement 2: Custom User Name for Greeting

**User Story:** As a user, I want to set a custom name, so that the greeting feels personalized to me.

#### Acceptance Criteria

1. THE Greeting_Module SHALL provide an input field for the user to enter a User_Name.
2. WHEN the user submits a non-empty, non-whitespace-only User_Name of at most 50 characters, THE Greeting_Module SHALL display the greeting as "[Greeting], [User_Name]!" (e.g., "Good Morning, Alex!").
3. WHEN no User_Name has been set, THE Greeting_Module SHALL display the greeting without a name suffix (e.g., "Good Morning!").
4. WHEN the user submits a valid User_Name, THE Dashboard SHALL persist the value to Local_Storage so it is restored on subsequent page loads.
5. IF the Local_Storage entry for User_Name is missing or empty, THEN THE Greeting_Module SHALL render the greeting without a name suffix.
6. IF Local_Storage is unavailable when the user submits a User_Name, THEN THE Greeting_Module SHALL still display the name for the current session and show an inline warning that the name could not be saved.

---

### Requirement 3: Focus Timer — Countdown and Controls

**User Story:** As a user, I want a Pomodoro-style countdown timer, so that I can work in focused intervals and take structured breaks.

#### Acceptance Criteria

1. THE Focus_Timer SHALL display a countdown in MM:SS format.
2. WHEN the Focus_Timer is loaded or reset, THE Focus_Timer SHALL initialise the countdown to the current Pomodoro_Duration.
3. WHEN the user activates the Start control, THE Focus_Timer SHALL begin counting down by one second per real second.
4. WHEN the user activates the Stop control, THE Focus_Timer SHALL pause the countdown at its current value.
5. WHEN the user activates the Reset control, THE Focus_Timer SHALL stop any active countdown and restore the display to the full Pomodoro_Duration.
6. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically, play an audible signal, and display a browser alert dialog notifying the user; after the alert is dismissed, THE Focus_Timer SHALL enable the Start control and the Reset control.
7. WHILE the Focus_Timer is actively counting down, THE Focus_Timer SHALL disable the Start control to prevent duplicate timers.
8. WHILE the Focus_Timer is paused, stopped, or has completed (reached 00:00), THE Focus_Timer SHALL disable the Stop control.

---

### Requirement 4: Configurable Pomodoro Duration

**User Story:** As a user, I want to change the Pomodoro timer duration, so that I can adapt the Focus Timer to my preferred work interval length.

#### Acceptance Criteria

1. THE Focus_Timer SHALL provide a numeric input that accepts only integer values and allows the user to set the Pomodoro_Duration to any integer between 1 and 120 minutes (inclusive).
2. WHEN the user saves a new valid Pomodoro_Duration AND the Focus_Timer is not actively counting down, THE Focus_Timer SHALL update the displayed countdown to reflect the new duration within 500 milliseconds.
3. WHEN the user saves a new Pomodoro_Duration, THE Dashboard SHALL persist the value to Local_Storage so it is restored on subsequent page loads.
4. IF the stored Pomodoro_Duration is outside the range 1–120 minutes or is not a valid integer, THEN THE Focus_Timer SHALL fall back to the default value of 25 minutes.
5. WHILE the Focus_Timer is actively counting down, THE Focus_Timer SHALL prevent changes to the Pomodoro_Duration input.
6. IF the user attempts to save a Pomodoro_Duration that is not an integer or is outside the range 1–120 minutes, THEN THE Focus_Timer SHALL reject the input and display an inline validation message identifying the constraint that was violated.

---

### Requirement 5: To-do List — Add and Display Tasks

**User Story:** As a user, I want to add tasks to a list and see them displayed, so that I can track what needs to be done.

#### Acceptance Criteria

1. THE Todo_List SHALL provide a text input and a submit control for adding new tasks.
2. WHEN the user submits a non-empty, non-whitespace-only task text of at most 500 characters, THE Todo_List SHALL append a new Task to the list with completion state set to incomplete, and the input field SHALL be cleared.
3. IF the user attempts to submit an empty, whitespace-only, or over-500-character task text, THEN THE Todo_List SHALL reject the input, display an inline validation message, and clear the validation message when the user next modifies the input field.
4. THE Todo_List SHALL render each Task with its text, a completion toggle control, an edit control, and a delete control.
5. THE Todo_List SHALL display the total count of incomplete tasks; WHEN there are zero incomplete tasks, the count SHALL display "0 incomplete tasks".

---

### Requirement 6: To-do List — Edit and Complete Tasks

**User Story:** As a user, I want to edit task text and mark tasks as done, so that I can keep my list accurate and track progress.

#### Acceptance Criteria

1. WHEN the user activates the completion toggle for a Task, THE Todo_List SHALL toggle the Task's completion state between complete and incomplete.
2. WHILE a Task's completion state is complete, THE Todo_List SHALL render the Task text with a strikethrough visual style.
3. WHEN the user activates the edit control for a Task, THE Todo_List SHALL replace the Task text with an editable inline input pre-filled with the current text, and SHALL disable the completion toggle and delete controls for that Task while the edit input is active.
4. WHEN the user confirms an edit by pressing Enter or activating an explicit save control, and the input text is non-empty and non-whitespace-only, THE Todo_List SHALL update the Task text and restore the read-only display.
5. IF the user confirms an edit by pressing Enter or activating the save control with empty or whitespace-only text, THEN THE Todo_List SHALL discard the edit and restore the original Task text.
6. WHEN the user presses Escape while the edit input is active, THE Todo_List SHALL discard any changes and restore the original Task text in read-only display.
7. WHEN the user activates the delete control for a Task, THE Todo_List SHALL permanently remove the Task from the list.

---

### Requirement 7: To-do List — Drag-and-Drop Reordering

**User Story:** As a user, I want to drag and drop tasks to reorder them, so that I can prioritise my list manually.

#### Acceptance Criteria

1. THE Todo_List SHALL support drag-and-drop reordering of Tasks.
2. WHEN the user drags a Task and drops it at a new position within the list, THE Todo_List SHALL update the visual display to reflect the new order immediately.
3. WHEN a Task is successfully dropped at a new position, THE Todo_List SHALL persist the updated order to Local_Storage so the new order is preserved across page reloads.
4. WHEN a drag operation is in progress, THE Todo_List SHALL render a visible insertion line at the current drop target position, and the insertion line SHALL disappear when the drag ends (on drop or on cancel).
5. IF the user drops a Task outside the valid list area, THEN THE Todo_List SHALL cancel the drag operation and restore the original task order without any change.

---

### Requirement 8: To-do List — Local Storage Persistence

**User Story:** As a user, I want my tasks to be saved automatically, so that they are still there when I return to the Dashboard.

#### Acceptance Criteria

1. WHEN any Task is added, edited, completed, deleted, or reordered, THE Todo_List SHALL synchronously persist all Task fields (text, completion state, and order index) to Local_Storage before the triggering operation is considered complete.
2. WHEN the Dashboard loads, THE Todo_List SHALL read the task list from Local_Storage and render all previously saved Tasks.
3. IF the Local_Storage entry for the task list is missing, fails JSON parsing, or is not a valid array of Task objects, THEN THE Todo_List SHALL initialise with an empty task list and log a warning to the browser console.

---

### Requirement 9: Quick Links — Add and Display Shortcuts

**User Story:** As a user, I want to save shortcut buttons to my favourite websites, so that I can open them quickly from the Dashboard.

#### Acceptance Criteria

1. THE Quick_Links module SHALL provide an input field for a display label (at most 50 characters), an input field for a URL (at most 2048 characters), and a submit control for adding a new Link.
2. WHEN the user submits a non-empty label and a URL whose scheme is `http://` or `https://` and whose host is non-empty, THE Quick_Links module SHALL add the Link, persist it to Local_Storage, and render it as a clickable button.
3. WHEN the user activates a Link button, THE Dashboard SHALL open the corresponding URL in a new browser tab.
4. IF the user submits a missing or over-length label, or a URL that does not have an `http://` or `https://` scheme and a non-empty host, THEN THE Quick_Links module SHALL reject the input and display an inline validation message identifying the specific invalid field.
5. THE Quick_Links module SHALL provide a delete control for each Link to allow the user to remove it.
6. WHEN a Link is deleted, THE Quick_Links module SHALL remove the Link button from the display.

---

### Requirement 10: Quick Links — Local Storage Persistence

**User Story:** As a user, I want my saved links to persist across sessions, so that I do not have to re-add them every time I open the Dashboard.

#### Acceptance Criteria

1. WHEN any Link is added or deleted, THE Quick_Links module SHALL synchronise the full link list to Local_Storage.
2. WHEN the Dashboard loads, THE Quick_Links module SHALL read the link list from Local_Storage and render all previously saved Links.
3. IF the Local_Storage entry for the link list is missing, fails JSON parsing, or contains entries that are missing a label or URL, THEN THE Quick_Links module SHALL initialise with an empty link list and log a warning to the browser console.
4. IF a Local_Storage write operation fails (e.g., quota exceeded or access denied) when adding or deleting a Link, THEN THE Quick_Links module SHALL display an inline error message informing the user that the change could not be saved.

---

### Requirement 11: Light and Dark Mode

**User Story:** As a user, I want to switch between light and dark themes, so that I can use the Dashboard comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a toggle control to switch between the `light` and `dark` Theme, and the toggle control SHALL visually reflect the currently active Theme at all times.
2. WHEN the user activates the theme toggle, THE Dashboard SHALL apply the selected Theme to the entire page within 100 milliseconds, without a page reload.
3. WHEN the user selects a Theme, THE Dashboard SHALL persist the selected Theme value to Local_Storage.
4. WHEN the Dashboard loads, THE Dashboard SHALL read the stored Theme value from Local_Storage and apply it before displaying any visible content.
5. IF no Theme value is stored in Local_Storage, THEN THE Dashboard SHALL apply the `light` Theme as the default, regardless of any browser or OS preferred color scheme.

---

### Requirement 12: File and Folder Structure

**User Story:** As a developer, I want a clean, organised file structure, so that the codebase is easy to maintain and extend.

#### Acceptance Criteria

1. THE Dashboard SHALL be delivered as a single `index.html` file at the project root.
2. THE Dashboard SHALL contain exactly one CSS file located at `css/style.css`; no additional `.css` files SHALL exist anywhere in the project.
3. THE Dashboard SHALL contain exactly one JavaScript file located at `js/app.js`; no additional `.js` files SHALL exist anywhere in the project.
4. THE Dashboard SHALL link the CSS file via a `<link>` tag in the `<head>` whose `href` resolves to `css/style.css`, and the JavaScript file via a `<script>` tag before the closing `</body>` tag whose `src` resolves to `js/app.js`.
5. THE `index.html` file SHALL contain no inline `<style>` blocks and no inline `<script>` blocks.

---

### Requirement 13: Browser Compatibility and Performance

**User Story:** As a user, I want the Dashboard to load quickly and work in any modern browser, so that I have a smooth experience regardless of my browser choice.

#### Acceptance Criteria

1. THE Dashboard SHALL be compatible with the most recent major stable release of Chrome, Firefox, Edge, and Safari at the time of deployment.
2. THE Dashboard SHALL load and have all interactive controls fully responsive within 3 seconds on a connection of at least 10 Mbps, with no external asset downloads required.
3. THE Dashboard SHALL use no third-party JavaScript libraries or frameworks; all functionality SHALL be implemented in Vanilla JavaScript.
4. THE Dashboard SHALL use no backend server; all data operations SHALL be performed entirely client-side via Local_Storage.
