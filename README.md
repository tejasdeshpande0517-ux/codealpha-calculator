# CalcPro - Modern Precision Calculator 🧮
**CodeAlpha Frontend Development Internship — Task 2**

CalcPro is a sleek, responsive, and precision-engineered calculator web application built strictly with vanilla **HTML5**, **CSS3**, and **JavaScript** (no frameworks, no external runtime dependencies, and absolutely no `eval()`).

---

## 🌟 Features & Highlights

### 1. UI & Visual Aesthetics
- **Ethereal Pastel Glassmorphism & Dark Themes**: Signature dreamy pastel light interface with ambient floating orbs, smooth frosted glass cards (`backdrop-filter: blur(28px)`), vibrant electric blue hero accents, and a sleek dark mode toggle.
- **Glassmorphism & Depth**: Multi-layered diffused shadows, delicate white frosted borders, and ambient background lighting.
- **Dual-Line Display**: Inset calculation screen showing the active mathematical formula on the top-right and bold numeric input/result below, with live preview calculation.
- **Responsive Layout**: Fluid experience tailored for desktop, tablet, and mobile screens with custom slide-out history drawer on compact devices.
- **Dynamic Font Scaling**: Automatically scales down font sizes for large digits to avoid clipping and overflow.

### 2. Mathematical Operations & Safe Engine
- **Basic Arithmetic**: Addition (`+`), Subtraction (`−`), Multiplication (`×`), and Division (`÷`).
- **Precision Floating Point**: Eliminates IEEE 754 precision artifacts (e.g., `0.1 + 0.2 = 0.3` instead of `0.30000000000000004`).
- **PEMDAS Operator Precedence**: Evaluated via a custom implementation of **Dijkstra's Shunting-Yard Algorithm** and **Reverse Polish Notation (RPN)**.
- **Percentages**: Context-aware percentage calculations.
- **Sign Toggle (`±`)**: Effortlessly switch positive and negative values.
- **Clear All (`AC`) & Character Delete (`DEL`)**: Intuitive single character backspace and state reset.
- **Advanced Utilities**: Square (`x²`), Square Root (`√x`), Reciprocal (`¹/x`), and Parentheses (`(` and `)`).
- **Robust Error Handling**: Safely catches division by zero (`Cannot divide by zero`), negative square roots, and malformed syntax without application crash.

### 3. Keyboard Support
- **Numbers**: `0` – `9`
- **Decimals**: `.`
- **Operators**: `+`, `-`, `*` or `x`, `/`
- **Calculate Result**: `Enter` or `=`
- **Backspace**: Delete last character
- **Clear All**: `Escape`
- **Parentheses & Percent**: `(`, `)`, `%`
- **Visual Feedback**: Keypad buttons light up with tactile animation when pressed via keyboard.

### 4. Calculation History & Persistence
- **Persistent Storage**: All calculation history and active theme selection are saved to `localStorage`.
- **Interactive Recall**: Click any history entry to immediately load its result back into the calculator.
- **Clear History**: Clear history with an animated confirmation state.
- **Empty State**: Visual empty state illustration when no history is present.

### 5. Audio Tactile Feedback
- Pure **Web Audio API** synthesized clicks and confirmation chords.
- 100% offline, zero audio file downloads, zero latency.
- Audio toggle button in header to mute/unmute at any time.

---

## 📁 File Structure

```
CodeAlpha_Calculator/
│
├── index.html         # Semantic HTML5 layout, pastel ambient orbs, SVG icons
├── style.css          # Pure Vanilla CSS3 design system, pastel glassmorphism, animations
├── script.js          # Shunting-Yard parser, history manager, audio engine, UI events
├── test_math.js       # Standalone mathematical parser & evaluation test suite
├── test_runner.html   # Visual in-browser unit test runner with real-time pass/fail report
├── server.ps1         # Lightweight PowerShell HTTP server for local serving
├── .gitignore         # Clean repository exclusions
└── README.md          # Comprehensive documentation and project details
```

---

## 🚀 How to Run Locally

You can run this project locally without any build tools:

### Option 1: Directly in Browser
Double-click `index.html` or drag it into any modern web browser (Chrome, Edge, Firefox, Safari).

### Option 2: Using a Local HTTP Server (Recommended)
Using Python:
```bash
python -m http.server 3000
```
Or using Node.js `npx serve`:
```bash
npx -y serve .
```
Then open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Verification & Test Scenarios

| Test Case | Expression | Expected Output | Status |
| :--- | :--- | :--- | :--- |
| Basic Addition | `15 + 27` | `42` | Passed |
| Operator Precedence | `5 + 3 × 4` | `17` | Passed |
| Decimal Precision | `0.1 + 0.2` | `0.3` | Passed |
| Parentheses | `(5 + 3) × 4` | `32` | Passed |
| Division by Zero | `10 ÷ 0` | `Cannot divide by zero` | Handled Gracefully |
| Percentage | `200 + 10%` | `220` | Passed |
| Sign Toggle | `42 ±` | `-42` | Passed |
| History Recall | Click past item | Recalls into active display | Passed |
| Theme Switch | Dark / Light toggle | Persists on reload | Passed |
