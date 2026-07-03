'use strict';

/**
 * js/app.js — Life Dashboard
 * Zero external dependencies. All modules live in the App namespace.
 * Bootstrapped on DOMContentLoaded via App.init().
 */

const App = {
  Storage:   {},
  Theme:     {},
  Greeting:  {},
  Timer:     {},
  TodoList:  {},
  QuickLinks: {},

  /** Initialise all modules in dependency order. */
  init() {
    App.Theme.init();       // Must run first — applies stored theme before paint
    App.Greeting.init();    // Starts clock interval, restores user name
    App.Timer.init();       // Loads stored duration, wires controls
    App.TodoList.init();    // Loads tasks from storage, renders list
    App.QuickLinks.init();  // Loads links from storage, renders buttons
  },
};

// ── StorageService ────────────────────────────────────────────────────────────
App.Storage = {
  KEYS: {
    USER_NAME:      'tld_username',
    TIMER_MINS:     'tld_timer_minutes',
    TASKS:          'tld_tasks',
    LINKS:          'tld_links',
    THEME:          'tld_theme',
  },

  /**
   * Returns the parsed value for `key`, or `null` on missing / invalid JSON.
   * @param {string} key
   * @returns {any|null}
   */
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`[Storage] Failed to read key "${key}":`, err);
      return null;
    }
  },

  /**
   * Serialises `value` and writes it under `key`.
   * @param {string} key
   * @param {any} value
   * @returns {{ ok: boolean, error?: string }}
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return { ok: true };
    } catch (err) {
      console.warn(`[Storage] Failed to write key "${key}":`, err);
      return { ok: false, error: err.message };
    }
  },
};

// ── ThemeModule ───────────────────────────────────────────────────────────────
App.Theme = (() => {
  /** @type {'light'|'dark'} */
  let _current = 'light';

  /**
   * Applies `theme` to the DOM:
   *   - sets data-theme on <html>
   *   - updates #theme-toggle aria-checked and button text
   *   - persists to Storage
   * @param {'light'|'dark'} theme
   */
  function _apply(theme) {
    _current = theme;

    // Apply data-theme attribute to <html> so CSS selectors work.
    document.documentElement.dataset.theme = theme;

    // Update the toggle button's ARIA state and visible label.
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      const isDark = theme === 'dark';
      btn.setAttribute('aria-checked', String(isDark));
      btn.textContent = isDark ? '☀️ Light' : '🌙 Dark';
    }

    // Persist (cosmetic — no error handling needed per design).
    App.Storage.set(App.Storage.KEYS.THEME, theme);
  }

  return {
    /**
     * Reads stored theme (defaults to 'light') and applies it before paint.
     * Called first in App.init().
     */
    init() {
      const stored = App.Storage.get(App.Storage.KEYS.THEME);
      const theme = (stored === 'light' || stored === 'dark') ? stored : 'light';
      _apply(theme);
    },

    /**
     * Flips the active theme between 'light' and 'dark'.
     */
    toggle() {
      _apply(_current === 'light' ? 'dark' : 'light');
    },

    /**
     * Returns the currently active theme string.
     * @returns {'light'|'dark'}
     */
    getCurrent() {
      return _current;
    },

    // Expose _apply for direct use in tests (aligns with design interface).
    _apply,
  };
})();

// ── GreetingModule ────────────────────────────────────────────────────────────
App.Greeting = (() => {
  /** @type {string} */
  let _name = '';
  /** @type {number|null} */
  let _intervalId = null;

  const _DAY_NAMES = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
  ];
  const _MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  /**
   * Returns zero-padded "HH:MM:SS" in 24-hour format.
   * @param {Date} date
   * @returns {string}
   */
  function _formatTime(date) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  /**
   * Returns "DayName, MonthName D, YYYY" (e.g. "Wednesday, July 2, 2025").
   * @param {Date} date
   * @returns {string}
   */
  function _formatDate(date) {
    const dayName   = _DAY_NAMES[date.getDay()];
    const monthName = _MONTH_NAMES[date.getMonth()];
    const day       = date.getDate();
    const year      = date.getFullYear();
    return `${dayName}, ${monthName} ${day}, ${year}`;
  }

  /**
   * Maps an hour (0–23) to a greeting string.
   * @param {number} hour
   * @returns {'Good Morning'|'Good Afternoon'|'Good Evening'|'Good Night'}
   */
  function _getGreeting(hour) {
    if (hour >= 5  && hour <= 11) return 'Good Morning';
    if (hour >= 12 && hour <= 17) return 'Good Afternoon';
    if (hour >= 18 && hour <= 21) return 'Good Evening';
    return 'Good Night'; // 0–4, 22–23
  }

  /**
   * Builds the full greeting text with or without a name.
   * @param {string} greeting
   * @param {string|null} name
   * @returns {string}
   */
  function _buildGreetingText(greeting, name) {
    if (name && name.trim().length > 0) {
      return `${greeting}, ${name}!`;
    }
    return `${greeting}!`;
  }

  /**
   * Updates the in-memory name (shared by saveName and the public setName).
   * @param {string} name
   */
  function _setName(name) {
    _name = name;
  }

  /**
   * Called every second — updates clock and greeting displays.
   */
  function _tick() {
    const now  = new Date();
    const clockEl    = document.getElementById('clock-display');
    const greetingEl = document.getElementById('greeting-display');
    const dateEl     = document.getElementById('date-display');

    if (clockEl)    clockEl.textContent    = _formatTime(now);
    if (dateEl)     dateEl.textContent     = _formatDate(now);
    if (greetingEl) greetingEl.textContent = _buildGreetingText(_getGreeting(now.getHours()), _name);
  }

  /**
   * Validates, persists, and applies a new user name.
   * - Empty / whitespace-only → inline error "Please enter a name."
   * - Length > 50             → inline error "Name must be 50 characters or fewer."
   * - Valid + Storage ok      → persist, update in-memory name, refresh display
   * - Valid + Storage fail    → keep name for session, show inline warning
   * @param {string} name
   */
  function saveName(name) {
    const errorEl = document.getElementById('name-error');

    // Validate
    if (!name || name.trim().length === 0) {
      if (errorEl) errorEl.textContent = 'Please enter a name.';
      return;
    }
    if (name.length > 50) {
      if (errorEl) errorEl.textContent = 'Name must be 50 characters or fewer.';
      return;
    }

    const trimmed = name.trim();
    const result = App.Storage.set(App.Storage.KEYS.USER_NAME, trimmed);

    if (result.ok) {
      _setName(trimmed);
      if (errorEl) errorEl.textContent = '';
      _tick();
    } else {
      // Keep name in memory for the session even though persistence failed.
      _setName(trimmed);
      if (errorEl) errorEl.textContent = 'Your name could not be saved.';
    }
  }

  /**
   * Wires #name-save click and #name-input input events.
   * Called from init() after the interval is started.
   */
  function _bindEvents() {
    const saveBtn  = document.getElementById('name-save');
    const inputEl  = document.getElementById('name-input');
    const errorEl  = document.getElementById('name-error');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const value = inputEl ? inputEl.value : '';
        saveName(value);
      });
    }

    if (inputEl) {
      inputEl.addEventListener('input', () => {
        if (errorEl) errorEl.textContent = '';
      });
    }
  }

  return {
    /**
     * Restores saved name, renders date once, starts 1-second tick interval,
     * and wires name-input events.
     */
    init() {
      const saved = App.Storage.get(App.Storage.KEYS.USER_NAME);
      _name = (typeof saved === 'string') ? saved : '';

      // Render date immediately (doesn't change during the session).
      const dateEl = document.getElementById('date-display');
      if (dateEl) dateEl.textContent = _formatDate(new Date());

      // Start the interval and fire once immediately.
      _intervalId = setInterval(_tick, 1000);
      _tick();

      // Wire button / input events.
      _bindEvents();
    },

    // Expose helpers for testing (aligns with design interface).
    _formatTime,
    _formatDate,
    _getGreeting,
    _buildGreetingText,
    _tick,

    /** Returns the currently stored name (used by task 3.2). */
    getName() { return _name; },

    /** Updates the in-memory name (called by saveName in task 3.2). */
    setName(name) { _setName(name); },

    /** Validates, persists, and applies a new user name. */
    saveName,
  };
})();

// ── TimerModule ───────────────────────────────────────────────────────────────
App.Timer = (() => {
  /** @type {'idle'|'running'|'paused'|'complete'} */
  let _state = 'idle';
  /** @type {number} seconds remaining in the countdown */
  let _remaining = 0;
  /** @type {number} total configured duration in seconds */
  let _duration = 25 * 60;
  /** @type {number|null} setInterval handle */
  let _intervalId = null;

  // ── DOM references (resolved lazily in init) ──────────────────────────────
  let _display, _btnStart, _btnStop, _btnReset, _inputDuration, _errorEl;

  /**
   * Formats a total-seconds value to "MM:SS" (zero-padded).
   * e.g. _formatDisplay(90) → "01:30"
   * @param {number} seconds
   * @returns {string}
   */
  function _formatDisplay(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Updates the #timer-display element with the current _remaining value.
   */
  function _updateDisplay() {
    if (_display) {
      _display.textContent = _formatDisplay(_remaining);
    }
  }

  /**
   * Enables / disables controls based on the current _state.
   * - Start  → disabled when RUNNING
   * - Stop   → disabled when NOT RUNNING
   * - Duration input → disabled when RUNNING
   */
  function _syncControls() {
    const isRunning = _state === 'running';
    const isComplete = _state === 'complete';

    if (_btnStart)     _btnStart.disabled     = isRunning;
    if (_btnStop)      _btnStop.disabled      = !isRunning;
    if (_inputDuration) _inputDuration.disabled = isRunning;

    // After completion: start + reset are enabled (not running → start enabled);
    // stop stays disabled.  _syncControls() handles this automatically because
    // _state === 'complete' is not 'running'.
    void isComplete; // intentional — no extra action needed
  }

  /**
   * Plays a short 440 Hz beep via the Web Audio API.
   * Errors are caught silently so the timer still works in restricted contexts.
   */
  function _playSignal() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (_err) {
      // Audio unavailable — fail silently.
    }
  }

  /**
   * Called when the countdown reaches 00:00.
   * Clears the interval, sets state to COMPLETE, plays the signal, then alerts.
   */
  function _onComplete() {
    clearInterval(_intervalId);
    _intervalId = null;
    _state = 'complete';
    _remaining = 0;
    if (_display) _display.textContent = '00:00';
    _playSignal();
    window.alert('Focus session complete! Time for a break.');
    _syncControls();
  }

  /**
   * Decrements _remaining by one second. Calls _onComplete when it hits 0.
   */
  function _tick() {
    _remaining -= 1;
    if (_remaining <= 0) {
      _onComplete();
    } else {
      _updateDisplay();
    }
  }

  /**
   * Wires click events for timer controls.
   * Called from init().
   */
  function _bindEvents() {
    if (_btnStart)  _btnStart.addEventListener('click',  () => App.Timer.start());
    if (_btnStop)   _btnStop.addEventListener('click',   () => App.Timer.stop());
    if (_btnReset)  _btnReset.addEventListener('click',  () => App.Timer.reset());
  }

  /**
   * Wires the duration save button and input clear-on-type events.
   * Called from init().
   */
  function _bindDurationEvents() {
    const saveBtn = document.getElementById('timer-duration-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const inputEl = document.getElementById('timer-duration');
        App.Timer.saveDuration(inputEl ? inputEl.value : '');
      });
    }

    const durationInput = document.getElementById('timer-duration');
    if (durationInput) {
      durationInput.addEventListener('input', () => {
        if (_errorEl) _errorEl.textContent = '';
      });
    }
  }

  return {
    /**
     * Reads stored duration from Storage, validates it, initialises state,
     * updates the display, and wires up button events.
     */
    init() {
      // Resolve DOM references.
      _display       = document.getElementById('timer-display');
      _btnStart      = document.getElementById('timer-start');
      _btnStop       = document.getElementById('timer-stop');
      _btnReset      = document.getElementById('timer-reset');
      _inputDuration = document.getElementById('timer-duration');
      _errorEl       = document.getElementById('timer-error');

      // Load and validate stored duration (must be integer 1-120; default 25).
      const stored = App.Storage.get(App.Storage.KEYS.TIMER_MINS);
      const parsed = parseInt(stored, 10);
      const minutes = (!isNaN(parsed) && parsed >= 1 && parsed <= 120) ? parsed : 25;

      _duration  = minutes * 60;
      _remaining = _duration;
      _state     = 'idle';

      _updateDisplay();
      _syncControls();
      _bindEvents();
      _bindDurationEvents();
    },

    /**
     * Starts the countdown. Only acts when not already running.
     * State: IDLE/PAUSED/COMPLETE → RUNNING
     */
    start() {
      if (_state === 'running') return;
      _state = 'running';
      _intervalId = setInterval(_tick, 1000);
      _syncControls();
    },

    /**
     * Pauses the countdown. Only acts when running.
     * State: RUNNING → PAUSED
     */
    stop() {
      if (_state !== 'running') return;
      clearInterval(_intervalId);
      _intervalId = null;
      _state = 'paused';
      _syncControls();
    },

    /**
     * Resets the timer to its full configured duration from any state.
     * State: any → IDLE
     */
    reset() {
      clearInterval(_intervalId);
      _intervalId = null;
      _state = 'idle';
      _remaining = _duration;
      _updateDisplay();
      _syncControls();
    },

    /**
     * Validates and saves a new Pomodoro duration.
     * - Validates: must be an integer in [1, 120].
     * - If valid and timer is NOT running: persists, updates _duration/_remaining, refreshes display.
     * - If valid but running: no-op (input is disabled while running).
     * - Shows inline error in #timer-error on invalid input.
     * @param {any} minutes — raw value from the duration input
     */
    saveDuration(minutes) {
      const parsed = parseInt(minutes, 10);

      // Check for non-integer / NaN first.
      if (isNaN(parsed)) {
        if (_errorEl) _errorEl.textContent = 'Please enter a whole number.';
        return;
      }

      // Check range.
      if (parsed < 1 || parsed > 120) {
        if (_errorEl) _errorEl.textContent = 'Duration must be between 1 and 120 minutes.';
        return;
      }

      // Valid — only apply when not running.
      if (_state !== 'running') {
        App.Storage.set(App.Storage.KEYS.TIMER_MINS, parsed);
        _duration = parsed * 60;

        // Reset remaining only if idle or complete (not paused mid-session).
        if (_state === 'idle' || _state === 'complete') {
          _remaining = _duration;
        }

        _updateDisplay();
        if (_errorEl) _errorEl.textContent = '';
      }
      // If running: silently do nothing (input is disabled per task 5.1).
    },

    // ── Expose internals for testing ─────────────────────────────────────────
    _formatDisplay,
    _syncControls,
    _playSignal,
    _onComplete,
    get _state()     { return _state; },
    get _remaining() { return _remaining; },
    get _duration()  { return _duration; },
  };
})();

// ── TodoModule ────────────────────────────────────────────────────────────────
App.TodoList = (() => {
  /**
   * @typedef {{ id: string, text: string, complete: boolean, order: number }} Task
   * @type {Task[]}
   */
  let _tasks = [];

  // ── Drag-and-drop state ─────────────────────────────────────────────────────
  /** @type {string|null} id of the task currently being dragged */
  let _dragId = null;
  /** @type {boolean} tracks whether the drop landed on a valid target */
  let _dropSucceeded = false;

  // ── Validation ──────────────────────────────────────────────────────────────

  /**
   * Validates task text.
   * @param {string} text
   * @returns {{ valid: true } | { valid: false, error: string }}
   */
  function _validateText(text) {
    if (!text || text.trim().length === 0) {
      return { valid: false, error: 'Task cannot be empty.' };
    }
    if (text.length > 500) {
      return { valid: false, error: 'Task must be 500 characters or fewer.' };
    }
    return { valid: true };
  }

  // ── Persistence ─────────────────────────────────────────────────────────────

  /**
   * Serialises _tasks to localStorage. Shows inline error on failure.
   */
  function _persist() {
    const result = App.Storage.set(App.Storage.KEYS.TASKS, _tasks);
    if (!result.ok) {
      const errorEl = document.getElementById('todo-error');
      if (errorEl) errorEl.textContent = 'Tasks could not be saved.';
    }
  }

  /**
   * Reads tasks from localStorage. Falls back to empty array on any invalid data.
   * Validates each entry has all required Task fields.
   */
  function _loadFromStorage() {
    const stored = App.Storage.get(App.Storage.KEYS.TASKS);

    if (!Array.isArray(stored)) {
      if (stored !== null) {
        console.warn('tld: invalid storage for key tld_tasks');
      }
      _tasks = [];
      return;
    }

    // Validate every entry is a well-formed Task object.
    const isValid = stored.every(
      (item) =>
        item !== null &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.text === 'string' &&
        typeof item.complete === 'boolean' &&
        typeof item.order === 'number'
    );

    if (!isValid) {
      console.warn('tld: invalid storage for key tld_tasks');
      _tasks = [];
      return;
    }

    _tasks = stored;
  }

  // ── Rendering ───────────────────────────────────────────────────────────────

  /**
   * Updates the incomplete-task count display.
   */
  function _updateCount() {
    const countEl = document.getElementById('todo-count');
    if (!countEl) return;
    const count = _tasks.filter((t) => !t.complete).length;
    countEl.textContent =
      count === 0 ? '0 incomplete tasks' : `${count} incomplete task(s)`;
  }

  /**
   * Creates a <li> element for a single task.
   * Checkbox, edit button, and delete button are rendered as placeholders
   * — wiring happens in task 6.2.
   * @param {Task} task
   * @returns {HTMLLIElement}
   */
  function _renderTask(task) {
    const li = document.createElement('li');
    li.dataset.id = task.id;
    if (task.complete) li.classList.add('completed');

    // Enable drag-and-drop reordering
    li.draggable = true;

    li.addEventListener('dragstart', (e) => {
      _dragId = task.id;
      _dropSucceeded = false;
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
      }
    });

    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
      li.classList.add('drag-over');
    });

    li.addEventListener('dragleave', () => {
      li.classList.remove('drag-over');
    });

    li.addEventListener('drop', (e) => {
      e.preventDefault();
      li.classList.remove('drag-over');

      if (!_dragId) return;
      const dropTargetId = li.dataset.id;
      if (_dragId === dropTargetId) return;

      const sorted = _tasks.slice().sort((a, b) => a.order - b.order);
      const fromIndex = sorted.findIndex((t) => t.id === _dragId);
      const toIndex   = sorted.findIndex((t) => t.id === dropTargetId);

      if (fromIndex !== -1 && toIndex !== -1) {
        reorder(fromIndex, toIndex);
        _dropSucceeded = true;
      }
    });

    li.addEventListener('dragend', () => {
      document.querySelectorAll('#todo-list .drag-over').forEach((el) => {
        el.classList.remove('drag-over');
      });

      if (!_dropSucceeded) {
        _render();
      }

      _dragId = null;
      _dropSucceeded = false;
    });

    // Completion toggle checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.complete;
    checkbox.setAttribute('aria-label', 'Toggle task completion');
    checkbox.addEventListener('change', () => toggleComplete(task.id));
    li.appendChild(checkbox);

    // Task text span
    const textSpan = document.createElement('span');
    textSpan.className = 'task-text';
    textSpan.textContent = task.text;
    li.appendChild(textSpan);

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'task-edit';
    editBtn.textContent = 'Edit';
    editBtn.setAttribute('aria-label', 'Edit task');
    editBtn.addEventListener('click', () => beginEdit(task.id));
    li.appendChild(editBtn);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'task-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.setAttribute('aria-label', 'Delete task');
    deleteBtn.addEventListener('click', () => deleteTask(task.id));
    li.appendChild(deleteBtn);

    return li;
  }

  /**
   * Clears #todo-list and re-renders all tasks sorted by order ascending.
   */
  function _render() {
    const listEl = document.getElementById('todo-list');
    if (!listEl) return;

    // Clear existing children
    listEl.innerHTML = '';

    // Sort by order ascending and render each task
    const sorted = _tasks.slice().sort((a, b) => a.order - b.order);
    sorted.forEach((task) => {
      listEl.appendChild(_renderTask(task));
    });

    _updateCount();
  }

  // ── Event Binding ───────────────────────────────────────────────────────────

  /**
   * Wires the Add button and clears inline error on input change.
   */
  function _bindEvents() {
    const addBtn  = document.getElementById('todo-add');
    const inputEl = document.getElementById('todo-input');
    const errorEl = document.getElementById('todo-error');

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const value = inputEl ? inputEl.value : '';
        addTask(value);
      });
    }

    if (inputEl) {
      inputEl.addEventListener('input', () => {
        if (errorEl) errorEl.textContent = '';
      });
    }
  }

  // ── Task Manipulation Methods ──────────────────────────────────────────────

  /**
   * Toggles the completion state of a task.
   * @param {string} id
   */
  function toggleComplete(id) {
    const task = _tasks.find((t) => t.id === id);
    if (task) {
      task.complete = !task.complete;
      _persist();
      _render();
    }
  }

  /**
   * Removes a task from the list and reassigns order fields.
   * @param {string} id
   */
  function deleteTask(id) {
    _tasks = _tasks.filter((t) => t.id !== id);
    // Reassign order fields to 0, 1, 2, ...
    _tasks.forEach((task, index) => {
      task.order = index;
    });
    _persist();
    _render();
  }

  /**
   * Enters edit mode for a task.
   * @param {string} id
   */
  function beginEdit(id) {
    const task = _tasks.find((t) => t.id === id);
    if (!task) return;

    const li = document.querySelector(`li[data-id="${id}"]`);
    if (!li) return;

    const textSpan = li.querySelector('.task-text');
    const checkbox = li.querySelector('input[type="checkbox"]');
    const editBtn = li.querySelector('.task-edit');
    const deleteBtn = li.querySelector('.task-delete');

    // Replace text span with input
    const input = document.createElement('input');
    input.type = 'text';
    input.value = task.text;
    input.className = 'task-edit-input';
    textSpan.replaceWith(input);

    // Disable checkbox and delete button
    if (checkbox) checkbox.disabled = true;
    if (deleteBtn) deleteBtn.disabled = true;

    // Replace edit button with save button
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'task-save';
    saveBtn.textContent = 'Save';
    saveBtn.setAttribute('aria-label', 'Save task');
    editBtn.replaceWith(saveBtn);

    // Focus the input
    input.focus();

    // Wire events
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        confirmEdit(id, input.value);
      } else if (e.key === 'Escape') {
        cancelEdit(id);
      }
    });

    saveBtn.addEventListener('click', () => {
      confirmEdit(id, input.value);
    });
  }

  /**
   * Confirms the edit and updates the task text if valid.
   * @param {string} id
   * @param {string} newText
   */
  function confirmEdit(id, newText) {
    const task = _tasks.find((t) => t.id === id);
    if (!task) {
      _render();
      return;
    }

    if (newText.trim().length > 0) {
      task.text = newText.trim();
      _persist();
    }
    _render();
  }

  /**
   * Cancels the edit and restores the original text.
   * @param {string} id
   */
  function cancelEdit(id) {
    _render();
  }

  /**
   * Reorders the task list by moving the item at `fromIndex` to `toIndex`.
   * Both indices refer to the _tasks array sorted by `order` ascending.
   * Reassigns `order` fields to match the new positions, then persists and
   * re-renders.
   * @param {number} fromIndex
   * @param {number} toIndex
   */
  function reorder(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;

    const sorted = _tasks.slice().sort((a, b) => a.order - b.order);

    // Clamp indices to valid range
    const clampedFrom = Math.max(0, Math.min(fromIndex, sorted.length - 1));
    const clampedTo   = Math.max(0, Math.min(toIndex,   sorted.length - 1));

    // Remove the item from its source position and insert at destination
    const [moved] = sorted.splice(clampedFrom, 1);
    sorted.splice(clampedTo, 0, moved);

    // Reassign order fields to 0, 1, 2, ...
    sorted.forEach((task, index) => {
      task.order = index;
    });

    _persist();
    _render();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Validates text, creates a new Task, persists, and re-renders.
   * Clears the input field on success; shows inline error on failure.
   * @param {string} text
   */
  function addTask(text) {
    const errorEl = document.getElementById('todo-error');
    const inputEl = document.getElementById('todo-input');

    const validation = _validateText(text);
    if (!validation.valid) {
      if (errorEl) errorEl.textContent = validation.error;
      return;
    }

    /** @type {Task} */
    const task = {
      id:       (typeof crypto !== 'undefined' && crypto.randomUUID)
                  ? crypto.randomUUID()
                  : Date.now().toString(),
      text:     text.trim(),
      complete: false,
      order:    _tasks.length,
    };

    _tasks.push(task);
    _persist();
    _render();

    // Clear the input field
    if (inputEl) inputEl.value = '';
  }

  return {
    /**
     * Loads tasks from storage, renders the list, and wires events.
     * Called from App.init().
     */
    init() {
      _loadFromStorage();
      _render();
      _bindEvents();
    },

    addTask,
    toggleComplete,
    deleteTask,
    beginEdit,
    confirmEdit,
    cancelEdit,
    reorder,

    // Expose internals for testing (aligns with design interface)
    _validateText,
    _persist,
    _loadFromStorage,
    _render,
    _renderTask,
    _updateCount,
    get _tasks() { return _tasks; },
  };
})();

// ── QuickLinksModule ──────────────────────────────────────────────────────────
App.QuickLinks = (() => {
  /**
   * @typedef {{ id: string, label: string, url: string }} Link
   * @type {Link[]}
   */
  let _links = [];

  // ── Validation ──────────────────────────────────────────────────────────────

  /**
   * Validates label and URL inputs.
   * @param {string} label
   * @param {string} url
   * @returns {{ valid: true } | { valid: false, error: string }}
   */
  function _validateInputs(label, url) {
    // Label checks first
    if (!label || label.trim().length === 0) {
      return { valid: false, error: 'Please enter a label.' };
    }
    if (label.length > 50) {
      return { valid: false, error: 'Label must be 50 characters or fewer.' };
    }

    // URL length check before parsing (parsing a 10k string is wasteful)
    if (url.length > 2048) {
      return { valid: false, error: 'URL is too long (max 2048 characters).' };
    }

    // URL scheme + host check
    try {
      const u = new URL(url);
      if ((u.protocol !== 'http:' && u.protocol !== 'https:') || u.hostname === '') {
        return { valid: false, error: 'Please enter a valid http or https URL.' };
      }
    } catch (_e) {
      return { valid: false, error: 'Please enter a valid http or https URL.' };
    }

    return { valid: true };
  }

  // ── Persistence ─────────────────────────────────────────────────────────────

  /**
   * Serialises _links to localStorage. Shows inline error on failure.
   */
  function _persist() {
    const result = App.Storage.set(App.Storage.KEYS.LINKS, _links);
    if (!result.ok) {
      const errorEl = document.getElementById('link-error');
      if (errorEl) errorEl.textContent = 'Links could not be saved.';
    }
  }

  /**
   * Reads links from localStorage. Falls back to empty array on any invalid data.
   * Validates each entry has all required Link fields.
   * Requirement 10.3: logs console.warn on invalid storage.
   */
  function _loadFromStorage() {
    const stored = App.Storage.get(App.Storage.KEYS.LINKS);

    if (!Array.isArray(stored)) {
      if (stored !== null) {
        console.warn('tld: invalid storage for key tld_links');
      }
      _links = [];
      return;
    }

    // Validate every entry is a well-formed Link object.
    const isValid = stored.every(
      (item) =>
        item !== null &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.label === 'string' &&
        typeof item.url === 'string'
    );

    if (!isValid) {
      console.warn('tld: invalid storage for key tld_links');
      _links = [];
      return;
    }

    _links = stored;
  }

  // ── Rendering ───────────────────────────────────────────────────────────────

  /**
   * Creates a div element for a single link.
   * @param {Link} link
   * @returns {HTMLDivElement}
   */
  function _renderLink(link) {
    const div = document.createElement('div');
    div.className = 'link-item';
    div.dataset.id = link.id;

    const anchor = document.createElement('a');
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = link.label;
    div.appendChild(anchor);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'link-delete';
    deleteBtn.textContent = '×';
    deleteBtn.setAttribute('aria-label', `Delete link ${link.label}`);
    deleteBtn.addEventListener('click', () => deleteLink(link.id));
    div.appendChild(deleteBtn);

    return div;
  }

  /**
   * Clears #links-container and re-renders all links.
   */
  function _render() {
    const container = document.getElementById('links-container');
    if (!container) return;

    container.innerHTML = '';
    _links.forEach((link) => {
      container.appendChild(_renderLink(link));
    });
  }

  // ── Event Binding ───────────────────────────────────────────────────────────

  /**
   * Wires the Add button click and clears inline error on input change.
   */
  function _bindEvents() {
    const addBtn   = document.getElementById('link-add');
    const labelEl  = document.getElementById('link-label-input');
    const urlEl    = document.getElementById('link-url-input');
    const errorEl  = document.getElementById('link-error');

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const labelValue = labelEl ? labelEl.value : '';
        const urlValue   = urlEl   ? urlEl.value   : '';
        addLink(labelValue, urlValue);
      });
    }

    if (labelEl) {
      labelEl.addEventListener('input', () => {
        if (errorEl) errorEl.textContent = '';
      });
    }

    if (urlEl) {
      urlEl.addEventListener('input', () => {
        if (errorEl) errorEl.textContent = '';
      });
    }
  }

  // ── Public Methods ───────────────────────────────────────────────────────────

  /**
   * Validates inputs, creates a new Link, persists, renders, and clears inputs.
   * Shows inline error on validation failure.
   * @param {string} label
   * @param {string} url
   */
  function addLink(label, url) {
    const errorEl = document.getElementById('link-error');

    const validation = _validateInputs(label, url);
    if (!validation.valid) {
      if (errorEl) errorEl.textContent = validation.error;
      return;
    }

    /** @type {Link} */
    const link = {
      id:    (typeof crypto !== 'undefined' && crypto.randomUUID)
               ? crypto.randomUUID()
               : Date.now().toString(),
      label: label.trim(),
      url,
    };

    _links.push(link);
    _persist();
    _render();

    // Clear input fields
    const labelEl = document.getElementById('link-label-input');
    const urlEl   = document.getElementById('link-url-input');
    if (labelEl) labelEl.value = '';
    if (urlEl)   urlEl.value   = '';
  }

  /**
   * Removes the link with the given id, persists, and re-renders.
   * @param {string} id
   */
  function deleteLink(id) {
    _links = _links.filter((link) => link.id !== id);
    _persist();
    _render();
  }

  return {
    /**
     * Loads links from storage, renders the list, and wires events.
     * Called from App.init().
     */
    init() {
      _loadFromStorage();
      _render();
      _bindEvents();
    },

    addLink,
    deleteLink,

    // Expose internals for testing (aligns with design interface)
    _validateInputs,
    _persist,
    _loadFromStorage,
    _render,
    _renderLink,
    get _links() { return _links; },
  };
})();

// ── Bootstrap ─────────────────────────────────────────────────────────────────
// All module definitions above are complete. Register DOMContentLoaded last so
// App.Theme, App.Greeting, App.Timer, App.TodoList, and App.QuickLinks are all
// fully defined before App.init() is called (req 12.3, 13.3, 13.4).
document.addEventListener('DOMContentLoaded', () => {
  // Wire up the theme toggle button click event.
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => App.Theme.toggle());
  }

  App.init();
});
