/**
 * CalcPro - Modern Precision Calculator
 * CodeAlpha Frontend Development Internship - Task 2
 * 
 * Features:
 * - Safe Math Evaluation using Dijkstra's Shunting-Yard Algorithm & RPN (No eval)
 * - Complete Arithmetic (+, -, *, /, %, power, sqrt, reciprocal)
 * - Dual-line display with live evaluation preview
 * - Comprehensive keyboard support with visual keypress feedback
 * - Persistent calculation history & theme state in localStorage
 * - Web Audio API synthesized tactile sound feedback
 * - Accessible, responsive, and robust error handling (division by zero, malformed input)
 */

(function () {
  'use strict';

  // ==========================================================================
  // DOM Elements
  // ==========================================================================
  const primaryDisplay = document.getElementById('primaryDisplay');
  const expressionDisplay = document.getElementById('expressionDisplay');
  const previewDisplay = document.getElementById('previewDisplay');
  const copyResultBtn = document.getElementById('copyResultBtn');
  const themeToggle = document.getElementById('themeToggle');
  const soundToggle = document.getElementById('soundToggle');
  const historyToggleBtn = document.getElementById('historyToggleBtn');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');
  const historyPanel = document.getElementById('historyPanel');
  const historyList = document.getElementById('historyList');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const historyBadgeCount = document.getElementById('historyBadgeCount');
  const toastNotification = document.getElementById('toastNotification');
  const shortcutsToggleBtn = document.getElementById('shortcutsToggleBtn');
  const shortcutsModal = document.getElementById('shortcutsModal');
  const closeModalBtn = document.getElementById('closeModalBtn');

  // Keypad & Utility buttons
  const keypadButtons = document.querySelectorAll('.key-btn, .util-btn');

  // ==========================================================================
  // State Variables
  // ==========================================================================
  let currentInput = '5994';       // Matches initial display from reference image
  let tokenList = [];              // Tokens array of previous expression parts
  let isEvaluated = true;          // True immediately so typing numbers starts fresh
  let lastResult = 5994;           // Last calculated numeric value
  let history = [];                // Calculation history array
  let soundEnabled = true;         // Audio feedback toggle
  let audioCtx = null;             // Lazy-initialized Web Audio context

  const STORAGE_KEYS = {
    THEME: 'calcpro_theme_v2',
    HISTORY: 'calcpro_history_v2',
    SOUND: 'calcpro_sound_v2'
  };

  // ==========================================================================
  // Audio Feedback (Synthesized Tactile Click via Web Audio API)
  // ==========================================================================
  function playClickSound(type = 'click') {
    if (!soundEnabled) return;
    try {
      if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          audioCtx = new AudioContext();
        } else {
          return;
        }
      }

      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;

      if (type === 'equals') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'clear') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(160, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else {
        // Standard subtle key click
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
        osc.start(now);
        osc.stop(now + 0.035);
      }
    } catch (e) {
      // Audio context might fail on restricted environments; gracefully ignore
    }
  }

  // ==========================================================================
  // Safe Math Engine (Shunting-Yard + Reverse Polish Notation)
  // Completely safe, no eval(), supports PEMDAS precedence & unary operators
  // ==========================================================================

  const OPERATORS = {
    '+': { precedence: 1, associativity: 'L', exec: (a, b) => a + b },
    '−': { precedence: 1, associativity: 'L', exec: (a, b) => a - b },
    '-': { precedence: 1, associativity: 'L', exec: (a, b) => a - b },
    '×': { precedence: 2, associativity: 'L', exec: (a, b) => a * b },
    '*': { precedence: 2, associativity: 'L', exec: (a, b) => a * b },
    '÷': { precedence: 2, associativity: 'L', exec: (a, b) => {
      if (b === 0) throw new Error('Cannot divide by zero');
      return a / b;
    }},
    '/': { precedence: 2, associativity: 'L', exec: (a, b) => {
      if (b === 0) throw new Error('Cannot divide by zero');
      return a / b;
    }},
    '^': { precedence: 3, associativity: 'R', exec: (a, b) => Math.pow(a, b) }
  };

  /**
   * Sanitizes floating-point inaccuracies (e.g. 0.1 + 0.2 = 0.3)
   */
  function cleanFloat(number) {
    if (!isFinite(number)) return number;
    // Check if it's already an integer
    if (Number.isInteger(number)) return number;
    // Strip trailing floating noise using toPrecision / toFixed
    const rounded = parseFloat(number.toPrecision(12));
    return rounded;
  }

  /**
   * Converts a token list to Reverse Polish Notation (RPN) via Shunting-Yard
   */
  function shuntingYard(tokens) {
    const outputQueue = [];
    const operatorStack = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // If token is a number
      if (!isNaN(parseFloat(token)) && isFinite(token)) {
        outputQueue.push({ type: 'number', value: parseFloat(token) });
      } else if (token === '(') {
        operatorStack.push(token);
      } else if (token === ')') {
        while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
          outputQueue.push({ type: 'operator', value: operatorStack.pop() });
        }
        if (operatorStack.length === 0) {
          throw new Error('Mismatched parentheses');
        }
        operatorStack.pop(); // Pop the '('
      } else if (OPERATORS[token]) {
        const op1 = token;
        while (
          operatorStack.length > 0 &&
          operatorStack[operatorStack.length - 1] !== '(' &&
          OPERATORS[operatorStack[operatorStack.length - 1]] &&
          ((OPERATORS[op1].associativity === 'L' &&
            OPERATORS[op1].precedence <= OPERATORS[operatorStack[operatorStack.length - 1]].precedence) ||
           (OPERATORS[op1].associativity === 'R' &&
            OPERATORS[op1].precedence < OPERATORS[operatorStack[operatorStack.length - 1]].precedence))
        ) {
          outputQueue.push({ type: 'operator', value: operatorStack.pop() });
        }
        operatorStack.push(op1);
      } else {
        throw new Error('Unknown symbol: ' + token);
      }
    }

    while (operatorStack.length > 0) {
      const op = operatorStack.pop();
      if (op === '(' || op === ')') {
        throw new Error('Mismatched parentheses');
      }
      outputQueue.push({ type: 'operator', value: op });
    }

    return outputQueue;
  }

  /**
   * Evaluates an RPN queue safely
   */
  function evaluateRPN(rpnQueue) {
    const stack = [];

    for (let i = 0; i < rpnQueue.length; i++) {
      const item = rpnQueue[i];

      if (item.type === 'number') {
        stack.push(item.value);
      } else if (item.type === 'operator') {
        if (stack.length < 2) {
          throw new Error('Malformed expression');
        }
        const b = stack.pop();
        const a = stack.pop();
        const opInfo = OPERATORS[item.value];
        if (!opInfo) throw new Error('Unsupported operator');
        
        const res = opInfo.exec(a, b);
        stack.push(res);
      }
    }

    if (stack.length !== 1) {
      throw new Error('Malformed expression');
    }

    return stack[0];
  }

  /**
   * Main safe evaluator function
   */
  function calculateExpression(tokens) {
    if (!tokens || tokens.length === 0) return 0;
    
    // Normalize tokens: replace standard chars with canonical operators
    const normalizedTokens = tokens.map(t => {
      if (t === '*') return '×';
      if (t === '/') return '÷';
      if (t === '-') return '−';
      return t;
    });

    const rpn = shuntingYard(normalizedTokens);
    const result = evaluateRPN(rpn);
    return cleanFloat(result);
  }

  // ==========================================================================
  // Display & UI Formatting
  // ==========================================================================

  /**
   * Formats a number with comma separators for clean display
   */
  function formatNumberDisplay(numStr) {
    if (numStr === null || numStr === undefined) return '0';
    if (typeof numStr === 'number') {
      if (!isFinite(numStr) || isNaN(numStr)) return numStr.toString();
      numStr = cleanFloat(numStr).toString();
    }

    // Don't format during typing of negative zero or trailing decimal point
    if (numStr === '-' || numStr === '-0' || numStr === '0.') return numStr;

    // Handle scientific notation directly
    if (numStr.includes('e') || numStr.includes('E')) {
      return numStr;
    }

    const parts = numStr.split('.');
    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? '.' + parts[1] : '';

    // Insert thousands separators into the integer part
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return formattedInteger + decimalPart;
  }

  /**
   * Updates display font-size dynamically to prevent clipping
   */
  function adjustDisplayFontSize() {
    const textLength = primaryDisplay.textContent.length;
    primaryDisplay.classList.remove('small-font', 'xsmall-font');

    if (textLength > 16) {
      primaryDisplay.classList.add('xsmall-font');
    } else if (textLength > 10) {
      primaryDisplay.classList.add('small-font');
    }
  }

  /**
   * Render complete UI state to screens
   */
  function updateDisplay() {
    primaryDisplay.classList.remove('error-font');

    // Build the secondary expression string
    let exprText = '';
    if (tokenList.length > 0) {
      exprText = tokenList.join(' ');
      if (currentInput !== '' && !isEvaluated) {
        exprText += ' ' + currentInput;
      }
    } else if (isEvaluated && lastResult !== null) {
      // Keeps previous formula visible
    }

    expressionDisplay.textContent = exprText || '\u00A0';

    // Update primary line
    if (currentInput !== '') {
      primaryDisplay.textContent = formatNumberDisplay(currentInput);
    } else if (tokenList.length > 0 && !isEvaluated) {
      // If user just entered an operator and hasn't started the next number yet
      const lastToken = tokenList[tokenList.length - 1];
      primaryDisplay.textContent = formatNumberDisplay(lastToken);
    } else if (lastResult !== null) {
      primaryDisplay.textContent = formatNumberDisplay(lastResult.toString());
    } else {
      primaryDisplay.textContent = '0';
    }

    adjustDisplayFontSize();
    updateLivePreview();
  }

  /**
   * Displays live preview of computation in progress
   */
  function updateLivePreview() {
    // Only show preview if there's an active calculation with at least one operator
    if (isEvaluated || tokenList.length === 0) {
      previewDisplay.textContent = '\u00A0';
      return;
    }

    try {
      const tokensToTest = [...tokenList];
      if (currentInput !== '' && currentInput !== '-' && currentInput !== '.') {
        tokensToTest.push(currentInput);
      }

      // Auto-close any open parenthesis for preview
      let openParens = 0;
      tokensToTest.forEach(t => {
        if (t === '(') openParens++;
        if (t === ')') openParens--;
      });
      while (openParens > 0) {
        tokensToTest.push(')');
        openParens--;
      }

      // If the last token is an operator, remove it for live preview
      const last = tokensToTest[tokensToTest.length - 1];
      if (OPERATORS[last]) {
        tokensToTest.pop();
      }

      if (tokensToTest.length >= 3) {
        const previewVal = calculateExpression(tokensToTest);
        if (isFinite(previewVal)) {
          previewDisplay.textContent = `= ${formatNumberDisplay(previewVal)}`;
          return;
        }
      }
    } catch (e) {
      // Ignore preview errors during intermediate typing
    }

    previewDisplay.textContent = '\u00A0';
  }

  /**
   * Show Error state
   */
  function showError(message = 'Error') {
    primaryDisplay.textContent = message;
    primaryDisplay.classList.add('error-font');
    previewDisplay.textContent = '\u00A0';
    isEvaluated = true;
    currentInput = '';
    tokenList = [];
    lastResult = null;
    showToast(message);
  }

  /**
   * Show Toast Notification
   */
  let toastTimeout = null;
  function showToast(message) {
    if (!toastNotification) return;
    toastNotification.textContent = message;
    toastNotification.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastNotification.classList.remove('show');
    }, 2400);
  }

  // ==========================================================================
  // Calculator Actions & Input Handlers
  // ==========================================================================

  function handleNumberInput(digit) {
    playClickSound();

    if (isEvaluated) {
      // Start fresh after previous evaluation
      currentInput = digit;
      tokenList = [];
      isEvaluated = false;
      lastResult = null;
      updateDisplay();
      return;
    }

    if (currentInput === '0') {
      currentInput = digit;
    } else if (currentInput === '-0') {
      currentInput = '-' + digit;
    } else {
      currentInput += digit;
    }

    updateDisplay();
  }

  function handleDecimal() {
    playClickSound();

    if (isEvaluated) {
      currentInput = '0.';
      tokenList = [];
      isEvaluated = false;
      lastResult = null;
      updateDisplay();
      return;
    }

    if (currentInput === '') {
      currentInput = '0.';
    } else if (!currentInput.includes('.')) {
      currentInput += '.';
    }
    // If it already has a decimal, ignore safely

    updateDisplay();
  }

  function handleOperator(op) {
    playClickSound();

    // Standardize symbol
    let displayOp = op;
    if (op === '*') displayOp = '×';
    if (op === '/') displayOp = '÷';
    if (op === '-') displayOp = '−';

    if (isEvaluated) {
      // Chain off previous result
      tokenList = [lastResult !== null ? lastResult.toString() : '0', displayOp];
      currentInput = '';
      isEvaluated = false;
      updateDisplay();
      return;
    }

    if (currentInput !== '') {
      tokenList.push(currentInput);
      tokenList.push(displayOp);
      currentInput = '';
    } else if (tokenList.length > 0) {
      // Replace last operator if user clicked a different one
      const lastToken = tokenList[tokenList.length - 1];
      if (OPERATORS[lastToken]) {
        tokenList[tokenList.length - 1] = displayOp;
      } else if (lastToken === '(' && displayOp === '−') {
        // Unary minus after parenthesis
        currentInput = '-';
      } else {
        tokenList.push(displayOp);
      }
    } else {
      // If starting with minus, treat as negative number
      if (displayOp === '−') {
        currentInput = '-';
      } else {
        tokenList.push('0');
        tokenList.push(displayOp);
      }
    }

    updateDisplay();
  }

  function handleEquals() {
    playClickSound('equals');

    if (tokenList.length === 0 && currentInput === '') return;

    const fullTokens = [...tokenList];
    if (currentInput !== '') {
      fullTokens.push(currentInput);
    }

    // Auto-close any open parenthesis
    let openParens = 0;
    fullTokens.forEach(t => {
      if (t === '(') openParens++;
      if (t === ')') openParens--;
    });
    while (openParens > 0) {
      fullTokens.push(')');
      openParens--;
    }

    // If the expression ends with an operator, ignore the trailing operator
    if (OPERATORS[fullTokens[fullTokens.length - 1]]) {
      fullTokens.pop();
    }

    if (fullTokens.length === 0) return;

    const expressionStr = fullTokens.join(' ');

    try {
      const result = calculateExpression(fullTokens);

      if (isNaN(result) || !isFinite(result)) {
        showError('Calculation Error');
        return;
      }

      // Add to history
      saveHistoryItem(expressionStr, result);

      lastResult = result;
      currentInput = '';
      tokenList = [];
      isEvaluated = true;

      // Update secondary line with completed expression: e.g. "5 + 3 ="
      expressionDisplay.textContent = expressionStr + ' =';
      primaryDisplay.textContent = formatNumberDisplay(result.toString());
      adjustDisplayFontSize();
      previewDisplay.textContent = '\u00A0';

    } catch (err) {
      showError(err.message || 'Invalid Expression');
    }
  }

  function handleClear() {
    playClickSound('clear');
    currentInput = '0';
    tokenList = [];
    isEvaluated = false;
    lastResult = null;
    expressionDisplay.textContent = '\u00A0';
    primaryDisplay.textContent = '0';
    primaryDisplay.classList.remove('error-font');
    previewDisplay.textContent = '\u00A0';
    adjustDisplayFontSize();
  }

  function handleDelete() {
    playClickSound();

    if (isEvaluated) {
      handleClear();
      return;
    }

    if (currentInput.length > 0) {
      currentInput = currentInput.slice(0, -1);
      if (currentInput === '' || currentInput === '-') {
        currentInput = '';
      }
    } else if (tokenList.length > 0) {
      // Pop last token
      tokenList.pop();
    }

    updateDisplay();
  }

  function handleNegate() {
    playClickSound();

    if (isEvaluated && lastResult !== null) {
      lastResult = -lastResult;
      primaryDisplay.textContent = formatNumberDisplay(lastResult.toString());
      return;
    }

    if (currentInput !== '') {
      if (currentInput.startsWith('-')) {
        currentInput = currentInput.substring(1);
      } else {
        currentInput = '-' + currentInput;
      }
    } else if (tokenList.length > 0) {
      const lastToken = tokenList[tokenList.length - 1];
      if (!isNaN(parseFloat(lastToken))) {
        const val = -parseFloat(lastToken);
        tokenList[tokenList.length - 1] = val.toString();
      } else {
        currentInput = '-';
      }
    } else {
      currentInput = '-';
    }

    updateDisplay();
  }

  function handlePercent() {
    playClickSound();

    if (isEvaluated && lastResult !== null) {
      lastResult = cleanFloat(lastResult / 100);
      primaryDisplay.textContent = formatNumberDisplay(lastResult.toString());
      return;
    }

    if (currentInput !== '') {
      const val = parseFloat(currentInput);
      if (isNaN(val)) return;

      // Context-aware percentage: e.g. 200 + 10% => 200 + (200 * 0.10)
      if (tokenList.length >= 2) {
        const prevOp = tokenList[tokenList.length - 1];
        const baseNum = parseFloat(tokenList[tokenList.length - 2]);

        if ((prevOp === '+' || prevOp === '−' || prevOp === '-') && !isNaN(baseNum)) {
          const percentVal = cleanFloat(baseNum * (val / 100));
          currentInput = percentVal.toString();
          updateDisplay();
          return;
        }
      }

      // Default standard mathematical percentage: val / 100
      currentInput = cleanFloat(val / 100).toString();
      updateDisplay();
    }
  }

  function handleParenthesis(paren) {
    playClickSound();

    if (paren === '(') {
      if (isEvaluated) {
        tokenList = [];
        isEvaluated = false;
        lastResult = null;
      }
      // If preceded by a number, insert an implicit multiplication '×'
      if (currentInput !== '') {
        tokenList.push(currentInput);
        tokenList.push('×');
        currentInput = '';
      } else if (tokenList.length > 0) {
        const last = tokenList[tokenList.length - 1];
        if (!isNaN(parseFloat(last)) || last === ')') {
          tokenList.push('×');
        }
      }
      tokenList.push('(');
    } else if (paren === ')') {
      // Validate that an open parenthesis exists
      let openCount = 0;
      tokenList.forEach(t => {
        if (t === '(') openCount++;
        if (t === ')') openCount--;
      });

      if (openCount > 0) {
        if (currentInput !== '') {
          tokenList.push(currentInput);
          currentInput = '';
        }
        tokenList.push(')');
      }
    }

    updateDisplay();
  }

  function handleScientific(action) {
    playClickSound();

    let targetVal = 0;
    if (currentInput !== '') {
      targetVal = parseFloat(currentInput);
    } else if (isEvaluated && lastResult !== null) {
      targetVal = lastResult;
    } else if (tokenList.length > 0 && !isNaN(parseFloat(tokenList[tokenList.length - 1]))) {
      targetVal = parseFloat(tokenList[tokenList.length - 1]);
    } else {
      targetVal = 0;
    }

    if (isNaN(targetVal)) return;

    let res;
    if (action === 'square') {
      res = cleanFloat(targetVal * targetVal);
    } else if (action === 'sqrt') {
      if (targetVal < 0) {
        showError('Invalid Input (Negative √)');
        return;
      }
      res = cleanFloat(Math.sqrt(targetVal));
    } else if (action === 'reciprocal') {
      if (targetVal === 0) {
        showError('Cannot divide by zero');
        return;
      }
      res = cleanFloat(1 / targetVal);
    }

    currentInput = res.toString();
    isEvaluated = false;
    updateDisplay();
  }

  // ==========================================================================
  // History Management & Persistence
  // ==========================================================================

  const DEFAULT_HISTORY = [
    { id: 'h1', expression: '666 × 9', result: 5994, timestamp: '09:33' },
    { id: 'h2', expression: '8888 + 9999', result: 18887, timestamp: '09:32' },
    { id: 'h3', expression: '8888 × 2', result: 17776, timestamp: '09:31' },
    { id: 'h4', expression: '100 ÷ 4', result: 25, timestamp: '09:30' },
    { id: 'h5', expression: '50 + 25', result: 75, timestamp: '09:29' }
  ];

  function loadHistory() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (stored) {
        history = JSON.parse(stored);
      } else {
        // Pre-populate with reference image calculation history
        history = [...DEFAULT_HISTORY];
      }
    } catch (e) {
      history = [...DEFAULT_HISTORY];
    }
    renderHistory();
  }

  function saveHistoryItem(expression, result) {
    const item = {
      id: Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      expression: expression,
      result: result,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Prepend new item (max 50 history entries)
    history.unshift(item);
    if (history.length > 50) {
      history.pop();
    }

    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (e) {
      // Quota exceeded safe fallback
    }

    renderHistory();
  }

  function clearHistory() {
    if (history.length === 0) return;
    history = [];
    try {
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
    } catch (e) {}
    renderHistory();
    showToast('History cleared');
  }

  function renderHistory() {
    historyList.innerHTML = '';

    if (history.length === 0) {
      clearHistoryBtn.disabled = true;
      if (historyBadgeCount) historyBadgeCount.style.display = 'none';

      historyList.innerHTML = `
        <div class="history-empty">
          <div class="history-empty-icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div class="history-empty-title">No calculations yet</div>
          <p class="history-empty-desc">Your calculation history will appear here automatically.</p>
        </div>
      `;
      return;
    }

    clearHistoryBtn.disabled = false;
    if (historyBadgeCount) historyBadgeCount.style.display = 'block';

    history.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-item';
      card.tabIndex = 0;
      card.setAttribute('role', 'article');
      card.setAttribute('aria-label', `${item.expression} equals ${item.result}`);

      card.innerHTML = `
        <div class="history-item-top">
          <span class="history-item-time">${item.timestamp}</span>
          <span class="history-item-more" aria-hidden="true">⋮</span>
        </div>
        <div class="history-item-bottom">
          <span class="history-item-expr">${item.expression}</span>
          <span class="history-item-badge">= ${formatNumberDisplay(item.result.toString())}</span>
        </div>
      `;

      // Recall calculation on click
      card.addEventListener('click', () => recallHistoryItem(item));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          recallHistoryItem(item);
        }
      });

      historyList.appendChild(card);
    });
  }

  function recallHistoryItem(item) {
    playClickSound();
    currentInput = item.result.toString();
    tokenList = [];
    isEvaluated = true;
    lastResult = item.result;
    expressionDisplay.textContent = item.expression + ' =';
    primaryDisplay.textContent = formatNumberDisplay(item.result.toString());
    adjustDisplayFontSize();
    previewDisplay.textContent = '\u00A0';
    showToast(`Recalled ${item.result}`);

    // If on mobile drawer, close drawer after recalling
    if (window.innerWidth < 768 && historyPanel.classList.contains('mobile-open')) {
      historyPanel.classList.remove('mobile-open');
    }
  }

  // ==========================================================================
  // Theme Toggle & Persistence
  // ==========================================================================

  function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme('light'); // Default to reference image light pastel theme
    }
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#070a13' : '#e0f2fe');
    }
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch (e) {}

    updateThemeUI(theme);
  }

  function updateThemeUI(theme) {
    if (!themeToggle) return;
    const labelText = themeToggle.querySelector('.theme-label-text');
    const sunIcon = themeToggle.querySelector('.sun-icon');
    const moonIcon = themeToggle.querySelector('.moon-icon');

    if (theme === 'dark') {
      if (labelText) labelText.textContent = 'Dark Mode';
      if (sunIcon) sunIcon.style.display = 'none';
      if (moonIcon) moonIcon.style.color = '#a855f7';
      themeToggle.setAttribute('aria-label', 'Switch to light mode');
    } else {
      if (labelText) labelText.textContent = 'Light Mode';
      if (sunIcon) sunIcon.style.display = 'block';
      if (moonIcon) moonIcon.style.color = '#94a3b8';
      themeToggle.setAttribute('aria-label', 'Switch to dark mode');
    }
  }

  function toggleTheme() {
    playClickSound();
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }

  // ==========================================================================
  // Sound Toggle & Persistence
  // ==========================================================================

  function initSound() {
    const savedSound = localStorage.getItem(STORAGE_KEYS.SOUND);
    if (savedSound !== null) {
      soundEnabled = savedSound === 'true';
    }
    updateSoundUI();
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    try {
      localStorage.setItem(STORAGE_KEYS.SOUND, soundEnabled.toString());
    } catch (e) {}
    updateSoundUI();
    if (soundEnabled) playClickSound();
    showToast(soundEnabled ? 'Sound enabled' : 'Sound muted');
  }

  function updateSoundUI() {
    if (!soundToggle) return;
    const soundOnIcon = soundToggle.querySelector('.sound-on');
    const soundOffIcon = soundToggle.querySelector('.sound-off');
    if (soundOnIcon && soundOffIcon) {
      soundOnIcon.style.display = soundEnabled ? 'block' : 'none';
      soundOffIcon.style.display = soundEnabled ? 'none' : 'block';
    }
    soundToggle.setAttribute('aria-label', soundEnabled ? 'Mute sound effects' : 'Unmute sound effects');
  }

  // ==========================================================================
  // Clipboard Copy Feature
  // ==========================================================================

  function copyDisplayValue() {
    playClickSound();
    const valueToCopy = primaryDisplay.textContent.replace(/,/g, '');
    if (!valueToCopy || valueToCopy === 'Error') {
      showToast('Nothing to copy');
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(valueToCopy)
        .then(() => showToast(`Copied ${valueToCopy} to clipboard!`))
        .catch(() => fallbackCopy(valueToCopy));
    } else {
      fallbackCopy(valueToCopy);
    }
  }

  function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showToast(`Copied ${text} to clipboard!`);
    } catch (err) {
      showToast('Copy failed');
    }
    document.body.removeChild(textArea);
  }

  // ==========================================================================
  // Keyboard Support & Key Mapping
  // ==========================================================================

  function handleKeyDown(event) {
    // If modal is open, let Escape close it
    if (shortcutsModal.classList.contains('is-open')) {
      if (event.key === 'Escape') {
        event.preventDefault();
        shortcutsModal.classList.remove('is-open');
      }
      return;
    }

    // Ignore keypresses inside inputs/textareas if any are ever added
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

    const key = event.key;
    let visualTarget = null;

    // Numbers 0-9
    if (/^[0-9]$/.test(key)) {
      event.preventDefault();
      handleNumberInput(key);
      visualTarget = document.querySelector(`.key-btn[data-number="${key}"]`);
    }
    // Decimal point
    else if (key === '.') {
      event.preventDefault();
      handleDecimal();
      visualTarget = document.getElementById('keyDecimal');
    }
    // Arithmetic operators
    else if (key === '+') {
      event.preventDefault();
      handleOperator('+');
      visualTarget = document.getElementById('keyAdd');
    }
    else if (key === '-') {
      event.preventDefault();
      handleOperator('−');
      visualTarget = document.getElementById('keySubtract');
    }
    else if (key === '*' || key === 'x' || key === 'X') {
      event.preventDefault();
      handleOperator('×');
      visualTarget = document.getElementById('keyMultiply');
    }
    else if (key === '/') {
      event.preventDefault();
      handleOperator('÷');
      visualTarget = document.getElementById('keyDivide');
    }
    // Equals / Enter
    else if (key === 'Enter' || key === '=') {
      event.preventDefault();
      handleEquals();
      visualTarget = document.getElementById('keyEquals');
    }
    // Backspace / DEL
    else if (key === 'Backspace') {
      event.preventDefault();
      handleDelete();
      visualTarget = document.getElementById('keyDelete');
    }
    // Escape / AC
    else if (key === 'Escape') {
      event.preventDefault();
      handleClear();
      visualTarget = document.getElementById('keyClear');
    }
    // Percentage
    else if (key === '%') {
      event.preventDefault();
      handlePercent();
      visualTarget = document.getElementById('keyPercent');
    }
    // Parentheses
    else if (key === '(' || key === ')') {
      event.preventDefault();
      handleParenthesis(key);
      visualTarget = document.querySelector(`.util-btn[data-action="paren-${key === '(' ? 'open' : 'close'}"]`);
    }

    // Provide visual tactile feedback on screen button
    if (visualTarget) {
      visualTarget.classList.add('is-active');
      setTimeout(() => visualTarget.classList.remove('is-active'), 120);
    }
  }

  // ==========================================================================
  // Event Listeners & Wiring
  // ==========================================================================

  function initEventListeners() {
    // Keypad clicks
    keypadButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const number = btn.getAttribute('data-number');
        const action = btn.getAttribute('data-action');
        const op = btn.getAttribute('data-op');

        if (number !== null) {
          handleNumberInput(number);
        } else if (op) {
          handleOperator(op);
        } else if (action) {
          switch (action) {
            case 'clear': handleClear(); break;
            case 'delete': handleDelete(); break;
            case 'decimal': handleDecimal(); break;
            case 'equals': handleEquals(); break;
            case 'negate': handleNegate(); break;
            case 'percent': handlePercent(); break;
            case 'paren-open': handleParenthesis('('); break;
            case 'paren-close': handleParenthesis(')'); break;
            case 'square':
            case 'sqrt':
            case 'reciprocal':
              handleScientific(action);
              break;
            default: break;
          }
        }
      });
    });

    // Keyboard listener
    window.addEventListener('keydown', handleKeyDown);

    // Header actions
    themeToggle.addEventListener('click', toggleTheme);
    soundToggle.addEventListener('click', toggleSound);
    copyResultBtn.addEventListener('click', copyDisplayValue);

    // History controls
    clearHistoryBtn.addEventListener('click', clearHistory);
    historyToggleBtn.addEventListener('click', () => {
      historyPanel.classList.toggle('mobile-open');
    });
    closeHistoryBtn.addEventListener('click', () => {
      historyPanel.classList.remove('mobile-open');
    });

    // Keyboard shortcuts modal
    shortcutsToggleBtn.addEventListener('click', () => {
      shortcutsModal.classList.add('is-open');
    });
    closeModalBtn.addEventListener('click', () => {
      shortcutsModal.classList.remove('is-open');
    });
    shortcutsModal.addEventListener('click', (e) => {
      if (e.target === shortcutsModal) {
        shortcutsModal.classList.remove('is-open');
      }
    });

    // Close mobile drawer on outside click
    document.addEventListener('click', (e) => {
      if (
        window.innerWidth < 768 &&
        historyPanel.classList.contains('mobile-open') &&
        !historyPanel.contains(e.target) &&
        !historyToggleBtn.contains(e.target)
      ) {
        historyPanel.classList.remove('mobile-open');
      }
    });
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================
  function init() {
    initTheme();
    initSound();
    initEventListeners();
    loadHistory();
    // Default initial display matching reference image
    expressionDisplay.textContent = '666 × 9 =';
    primaryDisplay.textContent = '5,994';
    previewDisplay.textContent = '\u00A0';
    adjustDisplayFontSize();
  }

  // Launch when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
