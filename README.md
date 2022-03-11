# eslint-plugin-capture

Eslint plugin to force specifying closure variables explicitely
(aka captured variables, hence the plugin name)

## Installation

`yarn add -D eslint-plugin-capture`

### Usage

Examples of **correct** code for this rule

```js
const x = 5;
const y = 7;
// eslint-capture (x)
function bar() {
  return x;
}

// eslint-capture (x,y)
function foo() {
  const z = 9;
  return x + y + z;
}

// eslint-capture
function baz() {
  const z = 9;
  return z;
}
```

Examples of **incorrect** code for this rule

```js
const x = 5;
const y = 7;

// eslint-capture (x)
function foo() {
  const z = 9;
  return x + y + z; // Error: y was not specified in capture list
}

// eslint-capture
function bar() {
  return x; // Error: x was not specified in capture list
}
```
