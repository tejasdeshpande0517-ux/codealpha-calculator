// JScript compatible test suite for CalcPro Math Parser
var OPERATORS = {
  '+': { precedence: 1, associativity: 'L', exec: function(a, b) { return a + b; } },
  '−': { precedence: 1, associativity: 'L', exec: function(a, b) { return a - b; } },
  '-': { precedence: 1, associativity: 'L', exec: function(a, b) { return a - b; } },
  '×': { precedence: 2, associativity: 'L', exec: function(a, b) { return a * b; } },
  '*': { precedence: 2, associativity: 'L', exec: function(a, b) { return a * b; } },
  '÷': { precedence: 2, associativity: 'L', exec: function(a, b) {
    if (b === 0) throw new Error('Cannot divide by zero');
    return a / b;
  }},
  '/': { precedence: 2, associativity: 'L', exec: function(a, b) {
    if (b === 0) throw new Error('Cannot divide by zero');
    return a / b;
  }},
  '^': { precedence: 3, associativity: 'R', exec: function(a, b) { return Math.pow(a, b); } }
};

function cleanFloat(number) {
  if (!isFinite(number)) return number;
  if (Math.floor(number) === number) return number;
  return parseFloat(number.toPrecision(12));
}

function shuntingYard(tokens) {
  var outputQueue = [];
  var operatorStack = [];

  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];
    if (!isNaN(parseFloat(token)) && isFinite(token)) {
      outputQueue.push({ type: 'number', value: parseFloat(token) });
    } else if (token === '(') {
      operatorStack.push(token);
    } else if (token === ')') {
      while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
        outputQueue.push({ type: 'operator', value: operatorStack.pop() });
      }
      if (operatorStack.length === 0) throw new Error('Mismatched parentheses');
      operatorStack.pop();
    } else if (OPERATORS[token]) {
      var op1 = token;
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
    var op = operatorStack.pop();
    if (op === '(' || op === ')') throw new Error('Mismatched parentheses');
    outputQueue.push({ type: 'operator', value: op });
  }

  return outputQueue;
}

function evaluateRPN(rpnQueue) {
  var stack = [];
  for (var i = 0; i < rpnQueue.length; i++) {
    var item = rpnQueue[i];
    if (item.type === 'number') {
      stack.push(item.value);
    } else if (item.type === 'operator') {
      if (stack.length < 2) throw new Error('Malformed expression');
      var b = stack.pop();
      var a = stack.pop();
      var opInfo = OPERATORS[item.value];
      if (!opInfo) throw new Error('Unsupported operator');
      stack.push(opInfo.exec(a, b));
    }
  }
  if (stack.length !== 1) throw new Error('Malformed expression');
  return stack[0];
}

function calculateExpression(tokens) {
  if (!tokens || tokens.length === 0) return 0;
  var normalizedTokens = [];
  for (var i = 0; i < tokens.length; i++) {
    var t = tokens[i];
    if (t === '*') t = '×';
    if (t === '/') t = '÷';
    if (t === '-') t = '−';
    normalizedTokens.push(t);
  }
  var rpn = shuntingYard(normalizedTokens);
  var result = evaluateRPN(rpn);
  return cleanFloat(result);
}

// Test assertions
var tests = [
  { name: 'Addition: 15 + 27', tokens: ['15', '+', '27'], expected: 42 },
  { name: 'Multiplication: 7 * 8', tokens: ['7', '×', '8'], expected: 56 },
  { name: 'Operator Precedence: 5 + 3 * 4', tokens: ['5', '+', '3', '×', '4'], expected: 17 },
  { name: 'Parentheses Precedence: (5 + 3) * 4', tokens: ['(', '5', '+', '3', ')', '×', '4'], expected: 32 },
  { name: 'Decimal Precision: 0.1 + 0.2', tokens: ['0.1', '+', '0.2'], expected: 0.3 },
  { name: 'Division: 100 / 4', tokens: ['100', '÷', '4'], expected: 25 },
  { name: 'Negative numbers: -5 + 12', tokens: ['-5', '+', '12'], expected: 7 },
  { name: 'Exponents: 2 ^ 3', tokens: ['2', '^', '3'], expected: 8 }
];

var passedCount = 0;
for (var j = 0; j < tests.length; j++) {
  var t = tests[j];
  var res = calculateExpression(t.tokens);
  if (res === t.expected) {
    WScript.Echo('[PASS] ' + t.name + ' -> ' + res);
    passedCount++;
  } else {
    WScript.Echo('[FAIL] ' + t.name + ' -> Got ' + res + ', expected ' + t.expected);
  }
}

// Test division by zero
try {
  calculateExpression(['10', '÷', '0']);
  WScript.Echo('[FAIL] Division by zero did not throw');
} catch (e) {
  if (e.message === 'Cannot divide by zero') {
    WScript.Echo('[PASS] Division by zero throws: ' + e.message);
    passedCount++;
  } else {
    WScript.Echo('[FAIL] Division by zero unexpected message: ' + e.message);
  }
}

WScript.Echo('====================================');
WScript.Echo('Total Tests Passed: ' + passedCount + ' / ' + (tests.length + 1));
